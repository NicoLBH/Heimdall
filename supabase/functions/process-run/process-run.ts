import { createClient } from 'npm:@supabase/supabase-js@2'

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req: Request) => {
  let runId: string | null = null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const body = await req.json()
    runId = body?.run_id ?? null

    if (!runId) {
      return new Response(
        JSON.stringify({ error: 'Missing run_id' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const { data: run, error: runError } = await supabase
      .from('analysis_runs')
      .select('id, project_id, document_id, status')
      .eq('id', runId)
      .single()

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: 'Run not found', details: runError }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const { error: updateRunningError } = await supabase
      .from('analysis_runs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        finished_at: null,
        error_message: null,
        raw_text: null,
        normalized_text_json: null,
        llm_output_raw: null,
        structured_output_json: null,
      })
      .eq('id', runId)

    if (updateRunningError) {
      throw updateRunningError
    }

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, filename, original_filename, storage_bucket, storage_path, mime_type')
      .eq('id', run.document_id)
      .single()

    if (documentError || !document) {
      throw new Error('Document not found for this run')
    }

    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(document.storage_bucket)
      .download(document.storage_path)

    if (downloadError || !fileData) {
      throw new Error(`Storage download failed: ${downloadError?.message ?? 'unknown error'}`)
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const fileSizeBytes = arrayBuffer.byteLength

    // Vérification simple de signature PDF
    const bytes = new Uint8Array(arrayBuffer)
    const pdfHeader = new TextDecoder().decode(bytes.slice(0, 5))
    const looksLikePdf = pdfHeader === '%PDF-'

    if (!looksLikePdf) {
      throw new Error('Downloaded file does not look like a valid PDF')
    }

    // Calcul SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const sha256 = toHex(hashBuffer)

    // Mise à jour document
    const { error: documentUpdateError } = await supabase
      .from('documents')
      .update({
        file_size_bytes: fileSizeBytes,
        sha256_hash: sha256,
        upload_status: 'uploaded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', document.id)

    if (documentUpdateError) {
      throw documentUpdateError
    }

    const technicalRawText = [
      'INGESTION CHECK OK',
      `document_id=${document.id}`,
      `filename=${document.filename}`,
      `original_filename=${document.original_filename}`,
      `mime_type=${document.mime_type}`,
      `storage_bucket=${document.storage_bucket}`,
      `storage_path=${document.storage_path}`,
      `file_size_bytes_downloaded=${fileSizeBytes}`,
      `sha256=${sha256}`,
      `pdf_header=${pdfHeader}`,
    ].join('\n')

    const { error: successUpdateError } = await supabase
      .from('analysis_runs')
      .update({
        status: 'succeeded',
        finished_at: new Date().toISOString(),
        raw_text: technicalRawText,
        normalized_text_json: {
          stage: 'ingestion_check',
          document_id: document.id,
          filename: document.filename,
          original_filename: document.original_filename,
          mime_type: document.mime_type,
          storage_bucket: document.storage_bucket,
          storage_path: document.storage_path,
          file_size_bytes_downloaded: fileSizeBytes,
          sha256,
          looks_like_pdf: looksLikePdf,
        },
        structured_output_json: {
          result: 'ok',
          stage: 'ingestion_check',
          next_step: 'pdf_text_extraction',
        },
      })
      .eq('id', runId)

    if (successUpdateError) {
      throw successUpdateError
    }

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        stage: 'ingestion_check',
        file_size_bytes_downloaded: fileSizeBytes,
        sha256,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    if (runId) {
      await supabase
        .from('analysis_runs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq('id', runId)
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
