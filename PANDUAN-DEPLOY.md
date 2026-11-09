# Panduan deploy website Duta GenRe HSU

Website ini tetap menggunakan halaman HTML yang sudah ada. Panel admin dan konten baru memakai Google Sheets/Google Apps Script, sedangkan Vercel menjadi hosting sekaligus proxy API. Sheet dan kredensial Apps Script **tidak** dibuka langsung dari browser.

## 1. Siapkan Google Sheet

1. Buat sebuah Google Sheet baru, misalnya `CMS Duta GenRe HSU`.
2. Jangan aktifkan akses publik untuk spreadsheet. Bagikan hanya kepada pengelola yang memang memerlukan akses langsung.
3. Dari spreadsheet tersebut, buka **Ekstensi → Apps Script**.
4. Hapus kode contoh di editor, lalu salin seluruh isi [`apps-script/Code.gs`](./apps-script/Code.gs) ke file `Code.gs`.
5. Simpan project dengan nama yang mudah dikenali, misalnya `CMS Duta GenRe HSU`.

## 2. Inisialisasi CMS dan akun admin

1. Di editor Apps Script, pilih fungsi `initializeCms`, lalu klik **Run/Jalankan**.
2. Setujui permintaan akses Google Sheet dan Google Drive (Drive digunakan hanya untuk kompatibilitas file lama yang pernah diunggah sebelum migrasi). Fungsi ini membuat tab `Users`, `Settings`, `Content`, `Media`, dan `Pages`, menyimpan ID Sheet di Script Properties, serta membuat rahasia sesi.
3. Setelah berhasil, pilih fungsi `setupAdminAccount`, lalu klik **Run/Jalankan**.
4. Masukkan username (3–40 karakter; huruf, angka, titik, `_`, atau `-`) dan password yang kuat (minimal 12 karakter). Password disimpan sebagai hash bersalt di tab `Users`, bukan sebagai teks biasa.
5. Tab `Settings` berisi nilai awal website. Jangan mengganti judul kolom atau menghapus tab yang dibuat.

> Jalankan kedua fungsi tersebut dari project Apps Script yang dibuka melalui Sheet CMS. Bila perlu mengganti atau mengaktifkan kembali akun, jalankan `setupAdminAccount()` lagi dengan username yang diinginkan.

## 3. Siapkan Cloudinary

1. Buat akun di Cloudinary dan buka **Dashboard**.
2. Catat **Cloud name**, **API Key**, dan **API Secret**. API Secret bersifat rahasia—jangan masukkan ke HTML, JavaScript browser, Apps Script, Google Sheet, atau Git.
3. Unggahan gambar dan dokumen dari panel admin dikirim langsung ke Cloudinary menggunakan tanda tangan singkat dari server Vercel. Apps Script hanya menyimpan URL, nama, dan ID aset pada tab `Media`.
4. Aset masuk ke folder `dutagenre-hsu`. File mengikuti akses publik sesuai URL Cloudinary; jangan unggah materi rahasia.

## 4. Deploy Apps Script sebagai Web App

1. Klik **Deploy → New deployment**.
2. Pada jenis deployment, pilih **Web app**.
3. Atur **Execute as** menjadi akun Google pemilik/pengelola.
4. Atur **Who has access** menjadi **Anyone** agar Vercel dapat meneruskan permintaan publik. Penulisan data memerlukan sesi admin bertanda tangan.
5. Klik **Deploy**, selesaikan otorisasi jika diminta, lalu salin URL Web App yang berakhiran `/exec`.
6. Jangan menaruh URL tersebut di file JavaScript atau di Google Sheet publik. Simpan hanya sebagai environment variable Vercel.

Setiap perubahan kode Apps Script setelah deploy memerlukan **Deploy → Manage deployments → Edit → New version → Deploy** agar versi Web App ikut diperbarui.

## 5. Deploy ke Vercel

1. Push folder proyek ini ke repository Git yang akan dihubungkan dengan Vercel.
2. Di Vercel, buat project baru dari repository tersebut. Gunakan folder root repository sebagai **Root Directory**.
3. Tidak perlu build command atau framework preset khusus untuk halaman statis ini.
4. Di **Project → Settings → Environment Variables**, tambahkan:

   | Key | Value |
   | --- | --- |
   | `APPS_SCRIPT_URL` | URL Web App Apps Script yang berakhiran `/exec` |
   | `CLOUDINARY_CLOUD_NAME` | Cloud name dari Dashboard Cloudinary |
   | `CLOUDINARY_API_KEY` | API Key Cloudinary |
   | `CLOUDINARY_API_SECRET` | API Secret Cloudinary (**secret**, jangan tampilkan di browser) |

5. Terapkan variable ke environment yang diperlukan (Production, dan Preview jika dipakai), lalu redeploy.
6. Setelah deployment selesai, kunjungi website dan pastikan halaman Beranda terbuka. Buka `/admin.html` untuk masuk ke panel admin.

Fungsi serverless Vercel ada di [`api/admin.js`](./api/admin.js) dan [`api/cloudinary.js`](./api/cloudinary.js). Endpoint `/api/admin` meneruskan permintaan ke Apps Script; endpoint `/api/cloudinary` memeriksa sesi admin dan menandatangani permintaan Cloudinary. URL Apps Script serta API Secret tidak ditanam di kode publik.

## 6. Menggunakan panel admin

- **Tampilan website**: ubah nama organisasi, slogan, judul beranda, pengumuman, profil, warna utama, URL logo/gambar, tautan pendaftaran, WhatsApp, Instagram, dan footer.
- **Navigasi admin**: panel pengelola berada di sisi kanan desktop. Bagian **Halaman website** menyediakan akses langsung ke Beranda, Tentang, Kegiatan, Anggota, Sosial Media, Pendaftaran, Berita, Agenda, Unduhan, dan FAQ. Dashboard juga menyediakan pintasan ke halaman-halaman tersebut.
- **Editor halaman**: setiap halaman dapat memiliki susunan komponen banner, teks, gambar, galeri, kartu tautan, dan ajakan bertindak. Ubah judul, isi, gambar, tautan, tampilan, visibilitas, dan urutannya; simpan setiap halaman secara terpisah. Aktifkan **Gunakan layout khusus** untuk mengganti isi statis halaman dengan susunan yang Anda buat.
- **Menu titik tiga**: atur nama, urutan, dan visibilitas link di navigasi global dari bagian bawah Editor halaman.
- **Berita & agenda**: tambah atau ubah berita, agenda, galeri kegiatan, anggota, FAQ, serta dokumen. Galeri dan daftar anggota yang dikelola admin menggantikan galeri/daftar statis lama setelah ada entri yang dipublikasikan. Matikan centang **Tampilkan di website publik** untuk menyimpan sebagai draft.
- **Media & dokumen**: unggah gambar atau dokumen ke Cloudinary; ukuran maksimal 3 MB. Jenis yang didukung: JPG, PNG, WEBP, GIF, PDF, Word, Excel, dan PowerPoint. Gunakan pilihan Cloudinary pada komponen halaman atau tombol **Gunakan** untuk memasukkan gambar ke konten.
- **Keamanan akun**: ubah password setelah masuk. Password baru minimal 12 karakter.
- **Website publik**: Beranda menampilkan pengumuman dan konten terbaru. Menu **Berita**, **Agenda**, **Unduhan**, dan **FAQ** mengambil konten yang berstatus publik dari Sheet. Halaman konten menyediakan pencarian.

File yang diunggah tersimpan pada akun Cloudinary organisasi. URL aset digunakan untuk menampilkan gambar atau mengunduh dokumen. **Jangan unggah dokumen pribadi, data pendaftar, atau berkas rahasia.** Sebelum publikasi, pastikan organisasi mengizinkan file tersebut dibagikan secara publik.

## 7. Jika ada masalah

- **Admin menampilkan “Backend belum dikonfigurasi”**: periksa `APPS_SCRIPT_URL` di Vercel, pastikan nilainya URL deployment `/exec`, lalu deploy ulang.
- **Unggah gambar menampilkan “Konfigurasi Cloudinary belum lengkap”**: atur ketiga variable `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan `CLOUDINARY_API_SECRET` di Vercel, lalu redeploy.
- **“Spreadsheet belum disiapkan” atau tab tidak ditemukan**: jalankan kembali `initializeCms()` dari Apps Script yang terikat ke Sheet yang benar. Fungsi ini juga menambahkan kolom baru yang dibutuhkan pada tab `Media`.
- **Gagal mengambil respons Apps Script**: pastikan Web App sudah dideploy ulang sebagai versi terbaru dan aksesnya `Anyone`; periksa juga otorisasi spreadsheet akun pemilik.
- **Unggahan ditolak**: gunakan salah satu format yang didukung dan file maksimal 3 MB. Periksa status akun Cloudinary dan konfigurasi tiga environment variable.
- **Konten tidak muncul di publik**: pastikan status **Tampilkan di website publik** aktif, lalu muat ulang halaman.
- **Lupa password**: jalankan `setupAdminAccount()` dari Apps Script dan buat password baru.

## Catatan pemeliharaan

- URL dan password Apps Script tidak dimasukkan ke repository.
- Konten dan pengaturan website berada di tab `Settings`/`Content`; akun admin berada di `Users`; indeks media Cloudinary berada di `Media`; susunan layout berada di `Pages`.
- API Secret Cloudinary hanya disimpan di Vercel sebagai environment variable.
- `24-main/` adalah salinan direktori yang sudah ada di dalam workspace. Untuk deployment ini, pilih root proyek yang berisi `index.html`, `api/`, dan `apps-script/`.
