-- Allow authenticated collaborators to resolve avatar files for assigned users.
-- Required for signed URL generation on private `avatars` bucket.

drop policy if exists storage_avatars_authenticated_select_all on storage.objects;
create policy storage_avatars_authenticated_select_all
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');
