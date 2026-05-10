# Online Storage Setup untuk Photobook

Aplikasi ini siap disimpan online lewat Supabase saat deploy ke GitHub Pages.

## 1. Buat project Supabase

Buat project baru di Supabase, lalu ambil:
- Project URL
- anon public key

Masukkan ke file:

```js
assets/js/cloud-config.js
```

Ubah:

```js
enabled: true,
supabaseUrl: 'https://PROJECT_ID.supabase.co',
supabaseAnonKey: 'ANON_KEY_KAMU'
```

## 2. Jalankan SQL ini di Supabase SQL Editor

```sql
create table if not exists public.photobook_documents (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.photobook_documents enable row level security;

create policy "Allow public read photobook documents"
on public.photobook_documents
for select
using (true);

create policy "Allow public write photobook documents"
on public.photobook_documents
for insert
with check (true);

create policy "Allow public update photobook documents"
on public.photobook_documents
for update
using (true)
with check (true);
```

## 3. Buat Storage bucket

Buat bucket bernama:

```txt
photobook-uploads
```

Set bucket menjadi public.

Tambahkan policy storage berikut di SQL Editor:

```sql
create policy "Allow public upload photobook files"
on storage.objects
for insert
with check (bucket_id = 'photobook-uploads');

create policy "Allow public read photobook files"
on storage.objects
for select
using (bucket_id = 'photobook-uploads');
```

## Catatan keamanan

Konfigurasi ini cocok untuk album pribadi sederhana, tetapi siapa pun yang tahu URL app bisa menulis data. Kalau nanti butuh login/password online yang lebih kuat, langkah berikutnya adalah menambahkan Supabase Auth atau backend kecil.
