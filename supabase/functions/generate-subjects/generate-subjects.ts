import { createClient } from 'npm:@supabase/supabase-js@2'

type Subject = {
  subject_type: 'explicit_problem' | 'validation_point' | 'missing_or_inconsistency'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  rationale: string
  source_excerpt: string
  source_page: number | null
  confidence_score: number | null
}

function isValidSubject(value: any): value is Subject {
  const validTypes = ['explicit_problem', 'validation_point', 'missing_or_inconsistency']
  const validPriorities = ['low', 'medium', 'high', 'critical']

  return (
    value &&
    validTypes.includes(value.subject_type) &&
    typeof value.title === 'string' &&
    value.title.trim().length > 0 &&
    typeof value.description === 'string' &&
    value.description.trim().length > 0 &&
    validPriorities.includes(value.priority) &&
    typeof value.rationale === 'string' &&
    typeof value.source_excerpt === 'string' &&
    (typeof value.source_page === 'number' || value.source_page === null) &&
    (typeof value.confidence_score === 'number' || value.confidence_score === null)
  )
}

Deno.serve(async (req: Request) => {
  let runId: string | null = null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    runId = body?.run_id ?? null

    if (!runId) {
      return new Response(JSON.stringify({ error: 'Missing run_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: run, error: runError } = await supabase
      .from('analysis_runs')
      .select('id, project_id, document_id, raw_text')
      .eq('id', runId)
      .single()

    if (runError || !run) {
      throw new Error('Run not found')
    }

    if (!run.raw_text || !String(run.raw_text).trim()) {
      throw new Error('Run raw_text is empty')
    }

    await supabase
      .from('analysis_runs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        finished_at: null,
        error_message: null,
      })
      .eq('id', runId)

    const text = String(run.raw_text).slice(0, 120000)

    // Tous les champs textuels retournés par le modèle doivent être en français.

    const schema = {
      name: 'subject_extraction',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          subjects: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                subject_type: {
                  type: 'string',
                  enum: ['explicit_problem', 'validation_point', 'missing_or_inconsistency'],
                },
                title: { type: 'string' },
                description: { type: 'string' },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                },
                rationale: { type: 'string' },
                source_excerpt: { type: 'string' },
                source_page: {
                  anyOf: [{ type: 'integer' }, { type: 'null' }],
                },
                confidence_score: {
                  anyOf: [{ type: 'number' }, { type: 'null' }],
                },
              },
              required: [
                'subject_type',
                'title',
                'description',
                'priority',
                'rationale',
                'source_excerpt',
                'source_page',
                'confidence_score',
              ],
            },
          },
        },
        required: ['subjects'],
      },
      strict: true,
    }

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4',
        response_format: {
          type: 'json_schema',
          json_schema: schema,
        },
        messages: [
          {
            role: 'system',
            content:
              'Tu extrais des sujets structurés à partir d’un document de projet. Tu dois répondre uniquement avec un JSON valide conforme au schéma. Tous les champs textuels doivent être rédigés en français, y compris title, description, rationale et source_excerpt. Préfère un petit nombre de sujets utiles, non redondants, fidèles au document. N’invente rien.',
          },
          {
            role: 'user',
            content:
              `Extrait des sujets à partir du texte suivant.\n\n` +
              `Règles :\n` +
              `- Rédige impérativement tous les champs textuels en français.\n` +
              `- Utilise uniquement ces types : explicit_problem, validation_point, missing_or_inconsistency.\n` +
              `- Chaque sujet doit être spécifique, utile et justifié.\n` +
              `- Évite les doublons.\n` +
              `- title doit être court, précis et en français.\n` +
              `- description doit être claire, concrète et en français.\n` +
              `- rationale doit être en français.\n` +
              `- source_excerpt doit être en français si le document est en français ; sinon, tu peux reprendre fidèlement l’extrait source même s’il n’est pas en français.\n` +
              `- source_page peut être null si inconnue.\n` +
              `- confidence_score doit être compris entre 0 et 1.\n\n` +
              `Texte du document :\n${text}`,
          },
        ],
      }),
    })

    if (!openaiResp.ok) {
      const errText = await openaiResp.text()
      throw new Error(`OpenAI API error: ${errText}`)
    }

    const openaiJson = await openaiResp.json()
    const content = openaiJson?.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('OpenAI returned empty content')
    }

    const parsed = JSON.parse(content)
    const subjects = Array.isArray(parsed?.subjects) ? parsed.subjects : []

    const validSubjects = subjects.filter(isValidSubject)

    if (!validSubjects.length) {
      throw new Error('No valid subjects returned by model')
    }

    const rows = validSubjects.map((s: Subject) => ({
      project_id: run.project_id,
      document_id: run.document_id,
      analysis_run_id: run.id,
      subject_type: s.subject_type,
      title: s.title.trim(),
      description: s.description.trim(),
      priority: s.priority,
      status: 'open',
      confidence_score: s.confidence_score,
      rationale: s.rationale.trim(),
      source_excerpt: s.source_excerpt.trim(),
      source_page: s.source_page,
    }))

    const { error: insertError } = await supabase
      .from('subjects')
      .insert(rows)

    if (insertError) {
      throw insertError
    }

    const { error: runUpdateError } = await supabase
      .from('analysis_runs')
      .update({
        status: 'succeeded',
        finished_at: new Date().toISOString(),
        llm_output_raw: openaiJson,
        structured_output_json: {
          stage: 'subject_generation',
          subject_count: rows.length,
          subjects_preview: rows.slice(0, 5).map((r) => ({
            subject_type: r.subject_type,
            title: r.title,
            priority: r.priority,
          })),
        },
      })
      .eq('id', runId)

    if (runUpdateError) {
      throw runUpdateError
    }

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        subject_count: rows.length,
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
