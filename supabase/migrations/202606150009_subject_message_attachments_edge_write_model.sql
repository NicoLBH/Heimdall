-- Finalize subject message attachment storage security model:
-- - Reads remain available to authorized authenticated users via storage SELECT policy.
-- - Writes are server-mediated via edge functions/service role.
--   (service role bypasses RLS; authenticated client direct writes are disabled.)

drop policy if exists storage_subject_message_attachments_insert on storage.objects;
drop policy if exists storage_subject_message_attachments_update on storage.objects;
drop policy if exists storage_subject_message_attachments_delete on storage.objects;
