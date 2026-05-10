# GitHub-only Online Storage

Aplikasi sudah disetel memakai GitHub sebagai penyimpanan online.

## Cara kerja

- Website tetap bisa deploy ke GitHub Pages.
- Saat admin upload/edit foto atau caption, aplikasi memakai GitHub Contents API.
- Data album/caption disimpan sebagai JSON di folder `data/`.
- Foto upload disimpan di folder `uploads/`.
- Setiap perubahan membuat commit baru ke repo.

## Kenapa token tidak dimasukkan ke file?

Kalau token ditulis langsung di file repo, token akan terlihat oleh semua orang yang membuka source website. Karena itu token dimasukkan dari tombol **GitHub Sync** di aplikasi dan hanya disimpan di browser admin.

## Membuat token GitHub

1. Buka GitHub.
2. Masuk ke **Settings** akun.
3. Buka **Developer settings**.
4. Pilih **Personal access tokens**.
5. Pilih **Fine-grained tokens**.
6. Klik **Generate new token**.
7. Repository access: pilih repo photobook kamu saja.
8. Permissions:
   - **Contents: Read and write**
   - **Metadata: Read-only**
9. Generate token dan copy.

## Mengaktifkan di aplikasi

1. Buka website hasil deploy GitHub Pages.
2. Klik tombol **GitHub Sync**.
3. Isi:
   - Owner: username GitHub kamu
   - Repository: nama repo
   - Branch: `main` atau branch Pages kamu
   - Fine-grained token: token yang dibuat tadi
4. Klik Simpan.

Setelah itu fitur upload foto, create album, edit foto, dan edit caption akan tersimpan online ke repo GitHub.

## Catatan penting

Token hanya ada di browser tempat kamu memasukkannya. Kalau buka dari perangkat lain, masukkan token lagi. Jangan pernah commit token ke repo.

## Mode terbuka untuk semua pengunjung

Kalau kamu memang ingin semua orang bisa upload dan edit tanpa login/setup, isi token langsung di:

```js
assets/js/cloud-config.js
```

Bagian ini:

```js
githubPublicToken: 'github_pat_...'
githubOwner: 'username-kamu'
githubRepo: 'nama-repo'
githubBranch: 'main'
```

Setelah itu semua pengunjung website bisa membuat album, upload foto, edit foto, dan edit caption. Semua perubahan akan masuk sebagai commit ke repo GitHub.

PERINGATAN: token yang ditaruh di `cloud-config.js` akan terlihat publik. Gunakan Fine-grained token yang hanya diberi akses ke satu repo ini saja, dengan permission minimal **Contents: Read and write**.
