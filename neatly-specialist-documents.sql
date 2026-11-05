begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('neatly-specialist-documents', 'neatly-specialist-documents', false, 5242880,
  array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists neatly_document_upload on storage.objects;
drop policy if exists neatly_document_upload_boundary on storage.objects;
drop policy if exists neatly_document_private_read on storage.objects;
drop policy if exists neatly_document_private_update on storage.objects;
drop policy if exists neatly_document_private_delete on storage.objects;

create policy neatly_document_upload on storage.objects for insert to authenticated
with check (bucket_id = 'neatly-specialist-documents');

create policy neatly_document_upload_boundary on storage.objects as restrictive
for insert to anon, authenticated
with check (
  bucket_id <> 'neatly-specialist-documents' or (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] in ('police-record', 'passport-photo', 'id', 'trn', 'proof-of-address')
  )
);

create policy neatly_document_private_read on storage.objects as restrictive
for select to anon, authenticated using (bucket_id <> 'neatly-specialist-documents');

create policy neatly_document_private_update on storage.objects as restrictive
for update to anon, authenticated using (bucket_id <> 'neatly-specialist-documents')
with check (bucket_id <> 'neatly-specialist-documents');

create policy neatly_document_private_delete on storage.objects as restrictive
for delete to anon, authenticated using (bucket_id <> 'neatly-specialist-documents');

commit;
