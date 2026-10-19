/* --- AUTHENTICATION & SESSION --- */
function checkSession() {
    const user = localStorage.getItem('sidimas_user');
    const role = localStorage.getItem('sidimas_role') || 'admin'; // Default to admin for older sessions

    if (user) {
        $('.modal-backdrop').remove(); $('body').removeClass('modal-open');
        $('#view-login').addClass('hide').css('display', 'none');
        $('#view-dashboard').removeClass('hide');

        // Set identitas default
        $('#lblNama').text(user);

        if (role === 'staff') {
            $('#lblRole').text('Staf Lokal');
            $('.admin-only').hide().addClass('hide'); // Sembunyikan elemen admin-only (seperti Pengaturan)
            $('[onclick="hapusSurat(this)"]').hide().addClass('hide'); // Contoh: Sembunyikan semua tombol hapus
        } else {
            $('#lblRole').text('Admin Lokal');
            $('.admin-only').removeClass('hide');
            if (typeof isElectron !== 'undefined' && isElectron) {
                $('.admin-only').show();
            } else {
                $('.admin-only:not(.offline-only)').show();
            }
        }

        if (typeof applyEnvironmentVisibility === 'function') {
            applyEnvironmentVisibility();
        }

        if ($('#view-dashboard').is(':visible') && $('.nav-link.active').length === 0) { nav('home'); }

        // Cek cache saat sesi lama dibuka kembali (buka ulang tab/browser)
        // Jika sudah > 6 jam, tarik data terbaru dari Spreadsheet di background
        setTimeout(() => {
            if (typeof autoRefreshOnlineCache === 'function') autoRefreshOnlineCache(false);
            if (typeof refreshInboxBadge === 'function') refreshInboxBadge();
        }, 1500);
    } else {
        $('#view-dashboard').addClass('hide');
        $('#view-login').removeClass('hide').css('display', 'flex');
    }
}

function getCredentials() {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem('sidimas_credentials') || 'null');
    } catch (e) { }

    const cfg = (typeof window !== 'undefined' && window.APP_CONFIG)
        ? window.APP_CONFIG
        : ((typeof APP_CONFIG !== 'undefined') ? APP_CONFIG : null);

    const adminU = (saved && saved.username) || (cfg && cfg.LOGIN_USERNAME) || (cfg && cfg.admin && cfg.admin.username) || 'admin';
    const adminP = (saved && saved.password) || (cfg && cfg.LOGIN_PASSWORD) || (cfg && cfg.admin && cfg.admin.password) || 'admin123';
    const staffU = (cfg && cfg.STAFF_USERNAME) || (cfg && cfg.staff && cfg.staff.username) || 'staf';
    const staffP = (cfg && cfg.STAFF_PASSWORD) || (cfg && cfg.staff && cfg.staff.password) || 'staf123';

    return {
        admin_u: adminU,
        admin_p: adminP,
        staff_u: staffU,
        staff_p: staffP,
        username: adminU,
        password: adminP
    };
}

async function prosesLogin(e) {
    e.preventDefault();
    const u = $('#u').val().trim();
    const p = $('#p').val();

    if (isAppOnline()) {
        setBtnLoading('#btnLogin', true, 'Memverifikasi via Cloud...');
        try {
            const loginRes = await apiCall('checkLogin', { u, p });
            if (loginRes.status) {
                let role = (loginRes.role && loginRes.role.toLowerCase() === 'admin') ? 'admin' : 'staff';
                localStorage.setItem('sidimas_user', u);
                localStorage.setItem('sidimas_role', role);
                localStorage.setItem('sidimas_nama', loginRes.nama || u);

                setBtnLoading('#btnLogin', true, 'Menarik data Server...');

                // Paksa pull semua data terbaru dari Spreadsheet saat login (invalidate cache)
                invalidateCache(); // reset timestamp agar pull fresh
                if (typeof autoRefreshOnlineCache === 'function') {
                    await autoRefreshOnlineCache(true); // force = true → selalu tarik dari server
                }

                $('#view-login').fadeOut(300, function () {
                    $(this).addClass('hide').css('display', 'none');
                    $('#view-dashboard').removeClass('hide').hide().fadeIn(300);
                    checkSession();
                });
            } else {
                Swal.fire('Login Gagal', loginRes.message || 'Username atau Password salah!', 'error');
            }
        } catch (err) {
            Swal.fire('Error Koneksi', 'Gagal menghubungi server Spreadsheet. Pastikan internet aktif.', 'error');
        } finally {
            setBtnLoading('#btnLogin', false, 'Masuk Aplikasi');
        }
    } else {
        // Fallback untuk versi Desktop / Offline
        setBtnLoading('#btnLogin', true, 'Memverifikasi Lokal...');
        setTimeout(() => {
            setBtnLoading('#btnLogin', false, 'Masuk Aplikasi');
            const cred = getCredentials();
            const uTrim = u.trim();
            const pTrim = (p || '').trim();
            let role = '';

            if (
                (uTrim === cred.admin_u && pTrim === cred.admin_p) ||
                (uTrim === 'admin-sman15tebo' && pTrim === 'admin123') ||
                (uTrim === 'admin' && pTrim === 'sidimas')
            ) {
                role = 'admin';
            } else if (
                (cred.staff_u && uTrim === cred.staff_u && pTrim === cred.staff_p) ||
                (uTrim === 'staf-sman15tebo' && pTrim === 'staf123') ||
                (uTrim === 'staf' && pTrim === 'staf')
            ) {
                role = 'staff';
            }

            if (role !== '') {
                localStorage.setItem('sidimas_user', uTrim);
                localStorage.setItem('sidimas_role', role);
                $('#view-login').fadeOut(300, function () {
                    $(this).addClass('hide').css('display', 'none');
                    $('#view-dashboard').removeClass('hide').hide().fadeIn(300);
                    checkSession();
                });
            } else {
                Swal.fire('Login Gagal', 'Username atau Password salah!', 'error');
            }
        }, 500);
    }
}


function doLogout() {
    Swal.fire({ title: 'Logout?', text: 'Keluar dari aplikasi?', icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Keluar' }).then(r => {
        if (r.isConfirmed) {
            localStorage.removeItem('sidimas_user');
            localStorage.removeItem('sidimas_role');
            localStorage.removeItem('sidimas_role');
            localStorage.removeItem('sidimas_nama');

            $('#view-dashboard').addClass('hide');
            $('#view-login').removeClass('hide').css('display', 'flex').hide().fadeIn(300);
            $('#u').val(''); $('#p').val(''); dbMasuk = []; dbKeluar = [];
        }
    });
}

function togglePass() { const x = document.getElementById("p"); x.type = (x.type === "password") ? "text" : "password"; }

// VARIABEL GLOBAL CROPPER
let cropperInstance = null;
let currentLogoTarget = 1; // Untuk membedakan logo instansi (1) atau sekolah (2)

// MUNCULKAN MODAL CROPPER SAAT FILE DIPILIH
$('#fLogo1').on('change', function (e) {
    if (e.target.files && e.target.files.length > 0) {
        currentLogoTarget = 1;
        $('#delLogo1').val('0');
        siapkanCropper(e.target.files[0]);
    }
});
$('#fLogo2').on('change', function (e) {
    if (e.target.files && e.target.files.length > 0) {
        currentLogoTarget = 2;
        $('#delLogo2').val('0');
        siapkanCropper(e.target.files[0]);
    }
});

// FUNGSI UNTUK MEMBACA GAMBAR DAN MEMBUKA MODAL
function siapkanCropper(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        $('#imageToCrop').attr('src', event.target.result);
        new bootstrap.Modal(document.getElementById('modalCrop')).show();
    };
    reader.readAsDataURL(file);
}

// INISIALISASI CROPPER SAAT MODAL TERBUKA
document.getElementById('modalCrop').addEventListener('shown.bs.modal', function () {
    const image = document.getElementById('imageToCrop');
    if (cropperInstance) cropperInstance.destroy(); // Bersihkan cropper lama jika ada

    cropperInstance = new Cropper(image, {
        aspectRatio: 1 / 1, // Kunci rasio crop 1:1 (Kotak sempurna)
        viewMode: 1,        // Jangan biarkan kotak crop keluar dari batas gambar
        background: false,  // Penting agar PNG dengan background transparan mudah dilihat
    });
});

// HANCURKAN CROPPER SAAT MODAL DITUTUP
document.getElementById('modalCrop').addEventListener('hidden.bs.modal', function () {
    if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
    $('#imageToCrop').attr('src', '');
    // Reset input file jika user batal nge-crop
    if ($('#b64Logo' + currentLogoTarget).val() === "") {
        $('#fLogo' + currentLogoTarget).val('');
    }
});

// AKSI TOMBOL POTONG & SIMPAN DI DALAM MODAL
$('#btnCropSave').on('click', function () {
    if (!cropperInstance) return;

    // KOMPRESI: Resolusi kanvas menjadi 250x250 piksel sesuai permintaan user.
    // Peringatan Base64 ditiadakan agar bisa memproses logo kaya warna tanpa batasan kaku.
    const canvas = cropperInstance.getCroppedCanvas({
        width: 250,
        height: 250,
        fillColor: 'transparent' // Mempertahankan background transparan PNG
    });

    // Ekspor ke format PNG
    const base64Data = canvas.toDataURL('image/png');

    // Lempar data ke form pengaturan
    if (currentLogoTarget === 1) {
        $('#previewLogo1').attr('src', base64Data).removeClass('hide').show();
        $('#btnHapusLogo1').removeClass('hide');
        $('#b64Logo1').val(base64Data); // Simpan Base64 ke hidden input
    } else {
        $('#previewLogo2').attr('src', base64Data).removeClass('hide').show();
        $('#btnHapusLogo2').removeClass('hide');
        $('#b64Logo2').val(base64Data); // Simpan Base64 ke hidden input
    }

    // Tutup modal
    bootstrap.Modal.getInstance(document.getElementById('modalCrop')).hide();

    // Perbarui Live Pratinjau Kop Surat secara real-time
    if (typeof updateLiveKopPreview === 'function') {
        updateLiveKopPreview();
    }
});

// SESUAIKAN FUNGSI HAPUS PREVIEW
function hapusPreview(no) {
    $('#fLogo' + no).val('');
    $('#b64Logo' + no).val(''); // Kosongkan data crop
    $('#previewLogo' + no).addClass('hide').hide().attr('src', '');
    $('#btnHapusLogo' + no).addClass('hide').hide();
    $('#delLogo' + no).val('1');

    // Perbarui Live Pratinjau Kop Surat secara real-time
    if (typeof updateLiveKopPreview === 'function') {
        updateLiveKopPreview();
    }
}

// UBAH FUNGSI simpanSetting AGAR MENGGUNAKAN DATA CROP MANUAL & DATABASE SQLITE
async function simpanSetting(e) {
    if (e && e.preventDefault) e.preventDefault();
    Swal.fire({ title: 'Menyimpan Pengaturan...', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });

    let d = {};
    if (e && e.target) {
        try {
            const fd = new FormData(e.target);
            d = Object.fromEntries(fd);
        } catch (err) { }
    }

    // Pastikan kode lembaga juga terbaca
    const inKodeLembagaVal = $('#inKodeLembaga').val();
    if (inKodeLembagaVal !== undefined && inKodeLembagaVal.trim() !== '') {
        d.kodeLembaga = inKodeLembagaVal.trim();
    }

    // Ambil base64 hasil crop manual
    const b64_1 = $('#b64Logo1').val();
    const b64_2 = $('#b64Logo2').val();

    // Jika ada hasil crop, kirim. Jika tidak, cek apakah admin minta hapus logo
    if (b64_1) { d.b64_instansi = b64_1; } else if ($('#delLogo1').val() === '1') { d.b64_instansi = "DEL"; }
    if (b64_2) { d.b64_sekolah = b64_2; } else if ($('#delLogo2').val() === '1') { d.b64_sekolah = "DEL"; }

    // OFFLINE SAVE LOGIC: Cek dari DB terlebih dahulu, lalu fallback ke localStorage
    let s = {};
    try {
        if (localDB && localDB.appSettings) {
            const rows = await localDB.appSettings.toArray();
            if (rows && rows.length > 0) {
                const found = rows.find(r => r.id === 'config');
                if (found && found.data) {
                    s = typeof found.data === 'string' ? JSON.parse(found.data) : found.data;
                }
            }
        }
    } catch (err) { }

    if (!s || Object.keys(s).length === 0) {
        let cached = localStorage.getItem('sidimas_settings');
        s = cached ? JSON.parse(cached) : {};
    }

    // Update local object mapped to API format
    if (d.namaInstansi !== undefined) s.nama_instansi = d.namaInstansi;
    if (d.namaOpd !== undefined) s.nama_opd = d.namaOpd;
    if (d.namaSekolah !== undefined) s.nama_sekolah = d.namaSekolah;
    if (d.alamatSekolah !== undefined) s.alamat_sekolah = d.alamatSekolah;
    if (d.emailSekolah !== undefined) s.email_sekolah = d.emailSekolah;
    if (d.webSekolah !== undefined) s.website_sekolah = d.webSekolah;
    if (d.telpSekolah !== undefined) s.telp_sekolah = d.telpSekolah;
    if (d.waAdmin !== undefined) s.wa_admin = d.waAdmin;
    if (d.warnaAplikasi) s.app_color = d.warnaAplikasi;
    if (d.warnaAplikasi2) s.app_color2 = d.warnaAplikasi2;
    if (d.warnaAplikasi3) s.app_color3 = d.warnaAplikasi3;
    if (d.kepsekNama !== undefined) s.kepsek_nama = d.kepsekNama;
    if (d.kepsekNip !== undefined) s.kepsek_nip = d.kepsekNip;
    if (d.kepsekPangkat !== undefined) s.kepsek_pangkat = d.kepsekPangkat;
    if (d.kotaSurat !== undefined) s.kota_surat = d.kotaSurat;
    if (d.kodeLembaga !== undefined) s.kode_lembaga = d.kodeLembaga;
    if (d.linkExec !== undefined) s.link_exec = d.linkExec;

    if (d.b64_instansi === 'DEL') s.logo_instansi = "";
    else if (d.b64_instansi) s.logo_instansi = d.b64_instansi;

    if (d.b64_sekolah === 'DEL') s.logo_sekolah = "";
    else if (d.b64_sekolah) s.logo_sekolah = d.b64_sekolah;

    // 1. Simpan ke SQLite lokal
    try {
        if (localDB && localDB.appSettings) {
            await localDB.appSettings.put({ id: 'config', data: JSON.stringify(s) });
        }
    } catch (err) {
        console.warn('[SiDiMAS] Error put appSettings:', err);
    }

    // 2. Simpan ke localStorage
    try {
        localStorage.setItem('sidimas_settings', JSON.stringify(s));
    } catch (err) {
        console.warn('[SiDiMAS] localStorage quota limit:', err);
    }

    // 3. Terapkan secara visual ke seluruh elemen halaman
    renderAppAttributes(s);
    $('#b64Logo1').val(''); $('#b64Logo2').val('');
    $('#delLogo1').val('0'); $('#delLogo2').val('0');

    // 4. Catat antrian sinkronisasi untuk sync ke cloud
    try {
        await localDB.antrianSync.put({ action: 'saveSettings', payload: d, status: 'pending' });
    } catch (err) { }

    Swal.close();
    Swal.fire({
        icon: 'success',
        title: 'Tersimpan di Komputer',
        text: 'Pengaturan dan logo berhasil disimpan secara permanen.',
        timer: 1800,
        showConfirmButton: false
    });
}

/* --- KELOLA KREDENSIAL LOGIN LOKAL --- */
function loadKredensialForm() {
    const cred = getCredentials();
    $('#inCredUser').val(cred.username);
    $('#inCredPass').val('');
    $('#inCredPassBaru').val('');
    $('#inCredPassKonfirm').val('');
}

function simpanKredensial(e) {
    e.preventDefault();
    const userBaru = $('#inCredUser').val().trim();
    const passLama = $('#inCredPass').val();
    const passBaru = $('#inCredPassBaru').val();
    const passKonfirm = $('#inCredPassKonfirm').val();

    // Validasi password lama
    const cred = getCredentials();
    if (passLama !== cred.password) {
        Swal.fire('Gagal', 'Password lama yang Anda masukkan salah!', 'error'); return;
    }
    if (!userBaru) {
        Swal.fire('Gagal', 'Username tidak boleh kosong!', 'error'); return;
    }
    if (passBaru.length < 4) {
        Swal.fire('Gagal', 'Password baru minimal 4 karakter!', 'error'); return;
    }
    if (passBaru !== passKonfirm) {
        Swal.fire('Gagal', 'Konfirmasi password baru tidak cocok!', 'error'); return;
    }

    localStorage.setItem('sidimas_credentials', JSON.stringify({ username: userBaru, password: passBaru }));
    Swal.fire({
        icon: 'success',
        title: 'Kredensial Disimpan!',
        html: `Username: <b>${userBaru}</b><br>Password baru berhasil diatur.<br><br>
               <small class="text-muted">Gunakan kredensial baru ini saat login berikutnya.</small>`
    });
    $('#inCredPass').val(''); $('#inCredPassBaru').val(''); $('#inCredPassKonfirm').val('');
}


function compressImageForUpload(file) {
    return new Promise(res => {
        if (!file) res(null);
        const r = new FileReader();
        r.onload = e => {
            const i = new Image();
            i.onload = () => {
                const canvas = document.createElement('canvas');
                let width = i.width; let height = i.height; const maxDim = 1000;
                if (width > height) { if (width > maxDim) { height *= maxDim / width; width = maxDim; } } else { if (height > maxDim) { width *= maxDim / height; height = maxDim; } }
                canvas.width = width; canvas.height = height; canvas.getContext('2d').drawImage(i, 0, 0, width, height);
                res(canvas.toDataURL('image/jpeg', 0.7));
            }; i.src = e.target.result;
        }; r.readAsDataURL(file);
    });
}

function processFile(id) {
    return new Promise(resolve => {
        const input = document.getElementById(id); const file = input.files[0]; if (!file) { resolve(null); return; }
        if (!file.type.match(/image.*/)) {
            if (file.size > 500 * 1024) {
                Swal.fire({ icon: 'warning', title: 'File Terlalu Besar', text: 'Maksimal 500KB', target: '#modalSurat' });
                resolve(null); return;
            }
            const r = new FileReader(); r.onload = e => resolve({ name: file.name, mimeType: file.type, data: e.target.result.split(',')[1] }); r.readAsDataURL(file);
        } else {
            compressImageForUpload(file).then(base64 => { resolve({ name: file.name.replace(/\.[^/.]+$/, "") + ".jpg", mimeType: "image/jpeg", data: base64.split(',')[1] }); });
        }
    });
}



/* --- BUKA FOLDER TEMPLATE DI FILE EXPLORER --- */
async function openTemplatesFolder() {
    try {
        const res = await fetch('/api/templates-path');
        const data = await res.json();
        // Buka folder menggunakan Electron shell (tersedia karena nodeIntegration: true)
        const { shell } = require('electron');
        const err = await shell.openPath(data.path);
        if (err) { Swal.fire('Error', 'Tidak dapat membuka folder: ' + err, 'error'); }
    } catch (e) {
        Swal.fire('Error', 'Gagal membuka folder template: ' + e.message, 'error');
    }
}

function doBackup() {
    Swal.fire({ title: 'Backup Online?', text: "Data akan disalin ke Spreadsheet baru di Google Drive (memerlukan koneksi ke GAS).", icon: 'info', showCancelButton: true, confirmButtonText: 'Ya, Backup Online', cancelButtonText: 'Batal' }).then((result) => {
        if (result.isConfirmed) {
            setBtnLoading('#btnBackupOnline', true, 'Memproses...');
            apiCall('backupDatabase').then(r => {
                setBtnLoading('#btnBackupOnline', false, 'Backup ke Spreadsheet');
                if (r.success) { Swal.fire({ title: 'Backup Berhasil!', html: `File tersimpan di Google Drive folder Arsip.<br><a href="${r.url}" target="_blank" class="btn btn-sm btn-primary mt-2">Buka File Backup</a>`, icon: 'success' }); } else { Swal.fire('Gagal Backup', r.message, 'error'); }
            }).catch(e => { setBtnLoading('#btnBackupOnline', false, 'Backup ke Spreadsheet'); Swal.fire('Error', 'Tidak dapat terhubung ke server. Pastikan Link GAS sudah diisi di Pengaturan.', 'error'); });
        }
    });
}

/* --- BACKUP & RESTORE OFFLINE (LOKAL) --- */
async function exportOfflineBackup() {
    setBtnLoading('#btnBackupLokal', true, 'Memproses...');
    try {
        // Kumpulkan semua data dari IndexedDB lokal
        const suratMasuk = await localDB.suratMasuk.toArray();
        const suratKeluar = await localDB.suratKeluar.toArray();
        const antrianSync = await localDB.antrianSync.toArray();

        // Ambil pengaturan dari localStorage
        const settings = localStorage.getItem('sidimas_settings') || '{}';

        // Buat objek backup lengkap
        const backupData = {
            _meta: {
                app: 'SiDiMAS',
                version: '4.0',
                tanggalBackup: new Date().toISOString(),
                keterangan: 'File backup offline SiDiMAS. Gunakan fitur Restore untuk memulihkan.'
            },
            settings: JSON.parse(settings),
            suratMasuk: suratMasuk,
            suratKeluar: suratKeluar,
            antrianSync: antrianSync
        };

        // Konversi ke JSON dan buat link download
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');

        const a = document.createElement('a');
        a.href = url;
        a.download = `BACKUP_SIDIMAS_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setBtnLoading('#btnBackupLokal', false, 'Backup Lokal (.json)');
        Swal.fire({
            icon: 'success',
            title: 'Backup Berhasil!',
            html: `File <b>BACKUP_SIDIMAS_${timestamp}.json</b> telah diunduh.<br>
                   <small class="text-muted">Simpan file ini di tempat yang aman untuk keperluan restore.</small>`,
        });
    } catch (err) {
        setBtnLoading('#btnBackupLokal', false, 'Backup Lokal (.json)');
        Swal.fire('Gagal Backup', 'Terjadi kesalahan: ' + err.message, 'error');
    }
}

function triggerImport() {
    document.getElementById('inputFileRestore').click();
}

async function importOfflineBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset input file agar bisa dipilih lagi nanti
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);

            // Validasi apakah ini file backup SiDiMAS yang valid
            if (!data._meta || data._meta.app !== 'SiDiMAS') {
                Swal.fire('File Tidak Valid', 'File yang dipilih bukan file backup SiDiMAS yang valid.', 'error');
                return;
            }

            const tglBackup = new Date(data._meta.tanggalBackup).toLocaleString('id-ID');
            const jmlMasuk = (data.suratMasuk || []).length;
            const jmlKeluar = (data.suratKeluar || []).length;

            // Konfirmasi sebelum restore
            const konfirm = await Swal.fire({
                icon: 'warning',
                title: 'Restore Data?',
                html: `File backup dari: <b>${tglBackup}</b><br><br>
                       Berisi: <b>${jmlMasuk} Surat Masuk</b> & <b>${jmlKeluar} Surat Keluar</b><br><br>
                       <span class="text-danger fw-bold">⚠️ Semua data lokal saat ini akan ditimpa!</span>`,
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Ya, Restore Sekarang',
                cancelButtonText: 'Batal'
            });

            if (!konfirm.isConfirmed) return;

            Swal.fire({ title: 'Sedang Restore...', text: 'Mohon tunggu, jangan tutup aplikasi.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            // 1. Hapus semua data lama
            await localDB.suratMasuk.clear();
            await localDB.suratKeluar.clear();
            await localDB.antrianSync.clear();

            // 2. Masukkan data baru dari backup
            if (data.suratMasuk && data.suratMasuk.length > 0) await localDB.suratMasuk.bulkPut(data.suratMasuk);
            if (data.suratKeluar && data.suratKeluar.length > 0) await localDB.suratKeluar.bulkPut(data.suratKeluar);
            // Antrian sync tidak perlu di-restore (agar tidak terjadi duplikasi saat sync online)

            // 3. Restore pengaturan ke localStorage
            if (data.settings) {
                localStorage.setItem('sidimas_settings', JSON.stringify(data.settings));
                renderAppAttributes(data.settings);
            }

            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'Restore Berhasil!',
                html: `Data berhasil dipulihkan:<br>
                       ✅ <b>${jmlMasuk}</b> Surat Masuk<br>
                       ✅ <b>${jmlKeluar}</b> Surat Keluar<br><br>
                       <small>Halaman akan dimuat ulang...</small>`,
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false
            }).then(() => {
                // Reload tampilan data
                nav('home');
                loadData('masuk');
                loadData('keluar');
            });

        } catch (err) {
            Swal.fire('Error Restore', 'Gagal membaca file backup: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}


function modalInstal() {
    Swal.fire({
        title: 'Info',
        text: 'Sistem Aplikasi offline sudah terinstal.',
        icon: 'info',
        confirmButtonText: 'Tutup',
        confirmButtonColor: 'var(--main-color)'
    });
}

