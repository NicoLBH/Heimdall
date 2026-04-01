create policy "storage_documents_select_open"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'documents');

create policy "storage_documents_insert_open"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'documents');

create policy "storage_documents_update_open"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'documents')
with check (bucket_id = 'documents');

create policy "storage_documents_delete_open"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'documents');
