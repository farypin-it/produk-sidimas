/**
 * ============================================================
 * SiDiMAS HYBRID — MODUL SOP PERSURATAN & DASAR HUKUM
 * Versi: 3.26.10
 * Fitur:
 * 1. Manajemen SOP Persuratan Resmi (Upload PDF Maks 500 KB)
 * 2. Unduh Draft SOP Word (.docx) untuk disesuaikan sekolah
 * 3. Pratinjau & Unduh Dokumen SOP Resmi (Dapat diakses dari Login & Pengaturan)
 * 4. CRUD Tabel Regulasi & Dasar Hukum Resmi SiDiMAS
 * 5. Bekerja 100% Offline (SQLite/Electron) & Online (Spreadsheet Cloud)
 * ============================================================
 */

const DEFAULT_SOP_WORD_PATH = './Draft_SOP_Persuratan_Sekolah.doc';
const DEFAULT_SOP_WORD_FILENAME = 'Draft_SOP_Persuratan_Sekolah.doc';


const DEFAULT_DASAR_HUKUM_SIDIMAS = [
    {
        id: 1,
        jenis: "Undang-Undang",
        nomor: "UU No. 20 Tahun 2003",
        tentang: "Sistem Pendidikan Nasional",
        keterkaitan: "Pasal 45: Kewajiban satuan pendidikan menyediakan dan mengelola sarana administrasi persuratan dan ketatausahaan yang tertib, akuntabel, dan transparan."
    },
    {
        id: 2,
        jenis: "Undang-Undang",
        nomor: "UU No. 43 Tahun 2009",
        tentang: "Kearsipan",
        keterkaitan: "Penyelenggaraan kearsipan instansi/sekolah, penciptaan arsip surat masuk dan surat keluar yang autentik, utuh, terpercaya, dan mudah diakses kembali."
    },
    {
        id: 3,
        jenis: "Undang-Undang",
        nomor: "UU No. 14 Tahun 2008",
        tentang: "Keterbukaan Informasi Publik (KIP)",
        keterkaitan: "Hak masyarakat dan warga sekolah memperoleh transparansi informasi publik serta ketertiban dokumentasi persuratan resmi kedinasan."
    },
    {
        id: 4,
        jenis: "Undang-Undang",
        nomor: "UU No. 25 Tahun 2009",
        tentang: "Pelayanan Publik",
        keterkaitan: "Standar kecepatan dan kepastian pelayanan persuratan sekolah (surat keterangan siswa, surat tugas, rekomendasi), transparansi disposisi pimpinan."
    },
    {
        id: 5,
        jenis: "Undang-Undang",
        nomor: "UU No. 11/2008 jo. UU No. 1/2024",
        tentang: "Informasi dan Transaksi Elektronik (ITE)",
        keterkaitan: "Keabsahan pencatatan dokumen naskah dinas elektronik, barcode verifikasi, dan legalitas dokumen arsip surat digital."
    },
    {
        id: 6,
        jenis: "Undang-Undang",
        nomor: "UU No. 30 Tahun 2014",
        tentang: "Administrasi Pemerintahan",
        keterkaitan: "Pedoman tata kelola surat-menyurat kedinasan, batas kewenangan penandatanganan surat, dan instruksi lembar disposisi pimpinan."
    },
    {
        id: 7,
        jenis: "Peraturan Pemerintah",
        nomor: "PP No. 28 Tahun 2012",
        tentang: "Pelaksanaan UU No. 43 Tahun 2009 tentang Kearsipan",
        keterkaitan: "Pengelolaan arsip dinamis, tata naskah dinas, penomoran kode klasifikasi arsip, dan jadwal retensi arsip di lembaga pendidikan."
    },
    {
        id: 8,
        jenis: "Peraturan ANRI",
        nomor: "Peraturan ANRI No. 6 Tahun 2021",
        tentang: "Pedoman Pengelolaan Arsip Dinamis",
        keterkaitan: "Format standar buku agenda surat masuk, lembar kendali surat keluar, digitalisasi berkas fisik, dan pencatatan riwayat penanganan surat."
    },
    {
        id: 9,
        jenis: "PermenPAN-RB",
        nomor: "PermenPAN-RB No. 35 Tahun 2012",
        tentang: "Pedoman Penyusunan Standar Operasional Prosedur (SOP)",
        keterkaitan: "Pedoman baku matriks identitas dokumen SOP administrasi pemerintahan, alur prosedur persuratan, dan pembagian tugas pelaksana tata usaha."
    },
    {
        id: 10,
        jenis: "Permendikbud",
        nomor: "Permendikbud No. 60 Tahun 2026",
        tentang: "Tata Naskah Dinas di Lingkungan Kemendikdasmen",
        keterkaitan: "Bentuk baku naskah dinas sekolah (surat dinas umum, nota dinas, surat tugas, SK, surat pengantar), kop surat dinas resmi, dan format stempel sekolah."
    },
    {
        id: 11,
        jenis: "Permendagri",
        nomor: "Permendagri No. 1 Tahun 2023",
        tentang: "Tata Naskah Dinas di Lingkungan Pemerintah Daerah",
        keterkaitan: "Pedoman tata naskah dinas, bentuk dan format naskah dinas, kop surat, stempel jabatan/instansi, dan penandatanganan naskah dinas di lingkungan pemerintah daerah serta satuan pendidikan negeri."
    },
    {
        id: 12,
        jenis: "Permendagri",
        nomor: "Permendagri No. 83 Tahun 2022",
        tentang: "Kode Klasifikasi Arsip di Lingkungan Pemerintah Daerah",
        keterkaitan: "Pedoman penomoran kode klasifikasi arsip urusan pendidikan (seperti 400.3.8, 421.1, dll.) pada penomoran agenda surat keluar dinas."
    },
    {
        id: 13,
        jenis: "Permendikbudristek",
        nomor: "Permendikbudristek No. 47 Tahun 2023",
        tentang: "Standar Pengelolaan pada PAUD, Dikdas, dan Dikmen",
        keterkaitan: "Pengelolaan administrasi persuratan dan ketatausahaan sekolah berbasis teknologi informasi dan komunikasi melalui sistem digitalisasi SiDiMAS."
    },
    {
        id: 14,
        jenis: "Keputusan Kepala Sekolah",
        nomor: "SK No. [NOMOR SK KEPALA SEKOLAH]",
        tentang: "Tata Kelola Persuratan & Penerapan Aplikasi Digital SiDiMAS",
        keterkaitan: "Pemberlakuan resmi aplikasi hybrid SiDiMAS, pembagian tugas staf pencatat surat, alur kendali naskah surat, dan verifikasi disposisi kepala sekolah."
    }
];

let pendingSopPdfData = null;
let pendingSopPdfMeta = null;
let activeSopBlobUrl = null;
let activeSopBlobData = null;
let onlineCloudSopInfo = null;
let onlineCloudSopLoaded = false;
let onlineCloudSopError = '';

function getSopBlobUrl(data) {
    if (activeSopBlobUrl && activeSopBlobData === data) return activeSopBlobUrl;
    if (activeSopBlobUrl) URL.revokeObjectURL(activeSopBlobUrl);
    activeSopBlobUrl = URL.createObjectURL(base64ToBlob(data));
    activeSopBlobData = data;
    return activeSopBlobUrl;
}

function isOnlineWebSop() {
    return typeof window.sidimas === 'undefined' &&
        typeof isAppOnline === 'function' &&
        isAppOnline();
}

function base64ToBlob(base64, type = 'application/pdf') {
    const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: type });
}

window.getStoredSopInfo = function () {
    if (isOnlineWebSop()) {
        if (!onlineCloudSopLoaded) {
            return { url: '', data: '', localPath: '', meta: null, hasDoc: false, loading: true, error: onlineCloudSopError };
        }
        return { ...onlineCloudSopInfo, data: '', localPath: '' };
    }

    const isDesktop = typeof window.sidimas !== 'undefined';
    let url = isDesktop ? '' : (localStorage.getItem('sidimas_sop_pdf_url') || '');
    let data = localStorage.getItem('sidimas_sop_pdf_data') || '';
    let localPath = localStorage.getItem('sidimas_sop_pdf_local_path') || '';
    let meta = null;

    try {
        meta = JSON.parse(localStorage.getItem('sidimas_sop_pdf_meta') || 'null');
    } catch (_) { }

    // Fallback 1: Cek sidimas_settings (yang ditarik otomatis dari Sheet Pengaturan)
    if (!isDesktop && (!url || !meta)) {
        try {
            const rawSettings = localStorage.getItem('sidimas_settings');
            if (rawSettings) {
                const s = JSON.parse(rawSettings);
                if (s && (s.sop_pdf_url || s.sop_pdf_file_id)) {
                    if (!url) {
                        url = s.sop_pdf_preview_url || s.sop_pdf_url || (s.sop_pdf_file_id ? `https://drive.google.com/file/d/${s.sop_pdf_file_id}/preview` : '');
                        if (url) localStorage.setItem('sidimas_sop_pdf_url', url);
                    }
                    if (!meta) {
                        if (s.sop_pdf_meta) {
                            try { meta = JSON.parse(s.sop_pdf_meta); } catch (_) { }
                        }
                        if (!meta) {
                            meta = {
                                name: s.sop_pdf_name || s.sop_pdf_filename || 'SOP_Persuratan_Resmi.pdf',
                                sizeText: s.sop_pdf_size || 'PDF',
                                updatedAt: s.sop_pdf_updated || 'Tersimpan di Cloud',
                                origin: 'cloud_drive',
                                fileId: s.sop_pdf_file_id,
                                url: url
                            };
                        }
                        localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(meta));
                    }
                }
            }
        } catch (_) { }
    }

    // Normalisasi Google Drive URL agar selalu menggunakan /preview untuk kompatibilitas iframe modal
    if (url && url.includes('drive.google.com/file/d/')) {
        const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (m && m[1]) {
            url = `https://drive.google.com/file/d/${m[1]}/preview`;
        }
    }

    return {
        url,
        data,
        localPath,
        meta,
        hasDoc: Boolean(data || localPath || (!isDesktop && url))
    };
};

window.hasCustomSopPdf = function () {
    if (isOnlineWebSop()) {
        return onlineCloudSopLoaded && Boolean(onlineCloudSopInfo && onlineCloudSopInfo.hasDoc);
    }
    const info = (typeof getStoredSopInfo === 'function') ? getStoredSopInfo() : null;
    if (info && info.hasDoc) return true;
    return Boolean(localStorage.getItem('sidimas_sop_pdf_data') || (typeof window.sidimas === 'undefined' && localStorage.getItem('sidimas_sop_pdf_url')));
};

window.loadSOPHukumTab = async function () {
    try {
        // Render UI seketika dari cache/settings lokal (0ms tampilan instan)
        updateSopTabUI();
        renderDasarHukumTable();

        if (typeof window.sidimas !== 'undefined') {
            // Coba via IPC method getOfflineSopPdf jika main process sudah ter-update
            let gotFromIpc = false;
            if (typeof window.sidimas.getOfflineSopPdf === 'function') {
                try {
                    const offRes = await window.sidimas.getOfflineSopPdf();
                    if (offRes && offRes.hasCustom) {
                        gotFromIpc = true;
                        if (offRes.base64) localStorage.setItem('sidimas_sop_pdf_data', offRes.base64);
                        if (offRes.meta) localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(offRes.meta));
                        if (offRes.localPath) localStorage.setItem('sidimas_sop_pdf_local_path', offRes.localPath);
                    }
                } catch (e) {
                    console.warn('[SiDiMAS] getOfflineSopPdf IPC belum aktif di proses saat ini, beralih ke SQLite database:', e);
                }
            }

            // Fallback SQLite: baca langsung dari tabel appSettings
            if (!gotFromIpc && !localStorage.getItem('sidimas_sop_pdf_data')) {
                try {
                    const rowData = await window.sidimas.dbGet('appSettings', 'sop_pdf_data');
                    const rowMeta = await window.sidimas.dbGet('appSettings', 'sop_pdf_meta');
                    if (rowData) {
                        const b64 = typeof rowData === 'object' && rowData.data ? rowData.data : rowData;
                        if (b64 && typeof b64 === 'string') localStorage.setItem('sidimas_sop_pdf_data', b64);
                    }
                    if (rowMeta) {
                        const m = typeof rowMeta === 'object' && rowMeta.data ? rowMeta.data : rowMeta;
                        if (m) localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(m));
                    }
                } catch (dbErr) {
                    console.warn('[SiDiMAS] Gagal membaca appSettings SQLite:', dbErr);
                }
            }
        }

        // Jalankan sinkronisasi cerdas dua arah jika ada koneksi online
        const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : navigator.onLine;
        if (isOnline && typeof syncSopTwoWay === 'function') {
            const activeBadgeEl = document.getElementById('sopActiveBadge');
            const hasCustom = (typeof hasCustomSopPdf === 'function') ? hasCustomSopPdf() : false;
            if (activeBadgeEl && !hasCustom) {
                activeBadgeEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Menyinkronkan cloud...';
            }
            await syncSopTwoWay();
            updateSopTabUI();
        }
    } catch (err) {
        console.error('Gagal memuat tab SOP & Dasar Hukum:', err);
    }
};

/**
 * Sinkronisasi Cerdas Dua Arah Dokumen SOP:
 * 1. Jika di offline ada berkas SOP tapi di Google Drive belum ada -> otomatis UPLOAD ke folder induk Google Drive.
 * 2. Jika di online Google Drive sudah ada -> simpan metadata & tautan Google Drive langsung ke peramban.
 *    (Pada Electron, otomatis unduh berkas fisik PDF base64 ke database SQLite).
 */
window.syncSopTwoWay = async function () {
    const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : navigator.onLine;
    const hasGas = Boolean(typeof API_URL !== 'undefined' && API_URL && (isOnline || (typeof window.sidimas !== 'undefined' && navigator.onLine)));
    if (!hasGas) return null;

    if (typeof window.sidimas === 'undefined') {
        onlineCloudSopInfo = null;
        onlineCloudSopLoaded = false;
        onlineCloudSopError = '';
        if (typeof updateSopTabUI === 'function') updateSopTabUI();
    }

    try {
        console.log('[SiDiMAS Sync SOP] Memeriksa sinkronisasi dua arah dokumen SOP...');

        // 1. Ambil data lokal
        const info = (typeof getStoredSopInfo === 'function') ? getStoredSopInfo() : {};
        let offlineData = typeof window.sidimas !== 'undefined'
            ? info.data || localStorage.getItem('sidimas_sop_pdf_data') || ''
            : '';

        // Jika di Electron dan belum ada di cache, baca dari SQLite
        if (!offlineData && typeof window.sidimas !== 'undefined') {
            try {
                const rowData = await window.sidimas.dbGet('appSettings', 'sop_pdf_data');
                const rowMeta = await window.sidimas.dbGet('appSettings', 'sop_pdf_meta');
                if (rowData) {
                    offlineData = typeof rowData === 'object' && rowData.data ? rowData.data : rowData;
                    if (offlineData) localStorage.setItem('sidimas_sop_pdf_data', offlineData);
                }
                if (rowMeta && rowMeta.data) localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(rowMeta.data));
            } catch (_) { }
        }

        // Seluruh browser web membaca PDF dari GAS agar tidak bergantung pada izin link publik Drive.
        const needBase64 = true;
        let onlineRes = null;
        try {
            onlineRes = await apiCall('getSopPdf', { includeBase64: needBase64 });
        } catch (e) {
            console.warn('[SiDiMAS Sync SOP] Gagal memanggil getSopPdf ke server:', e);
            if (typeof window.sidimas === 'undefined') {
                onlineCloudSopError = e.message || String(e);
                if (typeof updateSopTabUI === 'function') updateSopTabUI();
            }
            return null;
        }

        if (!onlineRes || onlineRes.success !== true) {
            const message = onlineRes && onlineRes.message || 'Respons tidak valid.';
            console.warn('[SiDiMAS Sync SOP] Server belum mengonfirmasi status SOP:', message);
            if (typeof window.sidimas === 'undefined') {
                onlineCloudSopInfo = null;
                onlineCloudSopLoaded = false;
                onlineCloudSopError = message;
            }
            const badge = document.getElementById('sopActiveBadge');
            if (badge) {
                badge.textContent = 'SOP Cloud belum dapat diakses';
                badge.className = 'badge rounded-pill bg-warning text-dark py-1 px-2.5';
                badge.title = message;
            }
            if (typeof updateSopTabUI === 'function') updateSopTabUI();
            return null;
        }

        const hasOnline = Boolean(onlineRes.hasCustom && (onlineRes.url || onlineRes.fileId));
        if (hasOnline && !onlineRes.base64) {
            const message = 'Server menemukan file SOP, tetapi tidak mengirim isi PDF. Deploy ulang kode GAS terbaru.';
            if (typeof window.sidimas === 'undefined') {
                onlineCloudSopInfo = null;
                onlineCloudSopLoaded = false;
                onlineCloudSopError = message;
                if (typeof updateSopTabUI === 'function') updateSopTabUI();
                return { success: false, message };
            }
            throw new Error(message);
        }

        // ==============================================================
        // SINKRONISASI STATUS CLOUD GOOGLE DRIVE
        // ==============================================================
        if (!hasOnline) {
            // Jika dokumen tidak ditemukan di Drive (belum ada atau sengaja dihapus oleh user),
            // hapus metadata SOP kustom dari cache lokal agar konsisten di semua perangkat (HP, Laptop).
            // TIDAK BOLEH auto-upload diam-diam di background agar tidak membanjiri Drive dengan file ganda.
            console.log('[SiDiMAS Sync SOP] Tidak ada dokumen SOP kustom di Google Drive.');
            if (typeof window.sidimas === 'undefined') {
                onlineCloudSopInfo = { url: '', data: '', localPath: '', meta: null, hasDoc: false };
                onlineCloudSopLoaded = true;
                onlineCloudSopError = '';
            }
            if (activeSopBlobUrl) URL.revokeObjectURL(activeSopBlobUrl);
            activeSopBlobUrl = null;
            activeSopBlobData = null;
            localStorage.removeItem('sidimas_sop_pdf_url');
            localStorage.removeItem('sidimas_sop_pdf_meta');
            if (typeof window.sidimas === 'undefined' && typeof localDB !== 'undefined' && localDB.appSettings) {
                localStorage.removeItem('sidimas_sop_pdf_data');
                await localDB.appSettings.delete('sop_pdf_data');
                await localDB.appSettings.delete('sop_pdf_meta');
                await localDB.appSettings.delete('sop_pdf_url');
            }
            try {
                const curSettings = JSON.parse(localStorage.getItem('sidimas_settings') || '{}');
                delete curSettings.sop_pdf_url;
                delete curSettings.sop_pdf_preview_url;
                delete curSettings.sop_pdf_download_url;
                delete curSettings.sop_pdf_file_id;
                delete curSettings.sop_pdf_name;
                delete curSettings.sop_pdf_filename;
                delete curSettings.sop_pdf_size;
                delete curSettings.sop_pdf_updated;
                delete curSettings.sop_pdf_meta;
                localStorage.setItem('sidimas_settings', JSON.stringify(curSettings));
            } catch (_) { }

            updateSopTabUI();
            return { action: 'cloud_empty' };
        } else {
            // Dokumen SOP ditemukan di Google Drive -> Simpan tautan & metadatanya ke browser HP / Laptop

            let targetUrl = onlineRes.previewUrl || onlineRes.url || '';
            if (targetUrl.includes('drive.google.com/file/d/')) {
                const m = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (m && m[1]) targetUrl = `https://drive.google.com/file/d/${m[1]}/preview`;
            }

            const metaData = onlineRes.meta || {
                name: 'SOP_Persuratan_Resmi.pdf',
                sizeText: 'PDF',
                updatedAt: new Date().toLocaleDateString('id-ID'),
                origin: 'cloud_drive',
                fileId: onlineRes.fileId,
                url: targetUrl
            };

            if (typeof window.sidimas === 'undefined') {
                onlineCloudSopInfo = { url: targetUrl, data: onlineRes.base64, localPath: '', meta: metaData, hasDoc: true };
                onlineCloudSopLoaded = true;
                onlineCloudSopError = '';
                localStorage.removeItem('sidimas_sop_pdf_url');
                localStorage.removeItem('sidimas_sop_pdf_meta');
                localStorage.removeItem('sidimas_sop_pdf_data');
                if (typeof localDB !== 'undefined' && localDB.appSettings) {
                    await localDB.appSettings.delete('sop_pdf_url');
                    await localDB.appSettings.delete('sop_pdf_meta');
                    await localDB.appSettings.delete('sop_pdf_data');
                }
            } else {
                localStorage.removeItem('sidimas_sop_pdf_url');
                localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(metaData));
            }

            // Simpan ke Electron SQLite & berkas harddisk lokal jika ada base64
            if (typeof window.sidimas !== 'undefined' && onlineRes.base64) {
                const base64Data = onlineRes.base64;
                try {
                    if (typeof window.sidimas.saveOfflineSopPdf === 'function') {
                        const offSave = await window.sidimas.saveOfflineSopPdf({
                            fileDataUrl: base64Data,
                            filename: metaData.name,
                            origin: 'online_drive',
                            sync_status: 'synced'
                        });
                        if (!offSave?.success) throw new Error(offSave?.message || 'SOP gagal disimpan ke penyimpanan lokal.');
                        if (offSave.filePath) {
                            localStorage.setItem('sidimas_sop_pdf_local_path', offSave.filePath);
                        }
                    } else {
                        throw new Error('Handler penyimpanan file SOP offline tidak tersedia.');
                    }
                } catch (saveError) {
                    throw new Error(`Gagal menyimpan salinan SOP di laptop: ${saveError.message || saveError}`);
                }
                localStorage.setItem('sidimas_sop_pdf_data', base64Data);
            }

            if (typeof updateSopTabUI === 'function') updateSopTabUI();
            console.log('✅ [SiDiMAS Sync SOP] Metadata dokumen SOP sinkron dengan Google Drive!');
            return { success: true, action: 'synced_from_cloud', meta: metaData };
        }
    } catch (syncErr) {
        console.warn('[SiDiMAS Sync SOP] Peringatan sinkronisasi dokumen SOP:', syncErr);
        if (typeof window.sidimas === 'undefined') {
            onlineCloudSopInfo = null;
            onlineCloudSopLoaded = false;
            onlineCloudSopError = syncErr.message || String(syncErr);
            if (typeof updateSopTabUI === 'function') updateSopTabUI();
        }
        return { success: false, message: syncErr.message || String(syncErr) };
    }
    return null;
};

function updateSopTabUI() {
    const info = (typeof getStoredSopInfo === 'function') ? getStoredSopInfo() : {
        url: localStorage.getItem('sidimas_sop_pdf_url') || '',
        data: localStorage.getItem('sidimas_sop_pdf_data') || '',
        localPath: localStorage.getItem('sidimas_sop_pdf_local_path') || '',
        meta: null,
        hasDoc: false
    };

    const customSopData = info.data;
    const customSopUrl = info.url;
    const customLocalPath = info.localPath;
    let customSopMeta = info.meta;

    const activeMetaEl = document.getElementById('sopActiveMetaInfo');
    const activeBadgeEl = document.getElementById('sopActiveBadge');
    const btnLihatEl = document.getElementById('btnLihatSop');
    const btnHapusEl = document.getElementById('btnHapusSop');
    const btnUnduhTemplateWord = document.getElementById('btnUnduhTemplateWord');

    if (info.loading) {
        if (activeMetaEl) {
            activeMetaEl.classList.add('d-none');
            activeMetaEl.innerHTML = '';
        }
        if (activeBadgeEl) {
            activeBadgeEl.textContent = info.error ? 'SOP Cloud belum dapat diakses' : 'Memuat SOP dari cloud...';
            activeBadgeEl.className = info.error
                ? 'badge rounded-pill bg-warning text-dark py-1 px-2.5'
                : 'badge rounded-pill bg-info text-white py-1 px-2.5';
            activeBadgeEl.title = info.error || '';
        }
        if (btnLihatEl) btnLihatEl.classList.add('d-none');
        if (btnHapusEl) btnHapusEl.classList.add('d-none');
        if (btnUnduhTemplateWord) btnUnduhTemplateWord.classList.remove('d-none');
        return;
    }

    const hasUploadedDoc = Boolean(customSopData || customSopUrl || customLocalPath);

    if (hasUploadedDoc) {
        // Fallback metadata jika belum ter-parse
        if (!customSopMeta) {
            customSopMeta = {
                name: 'SOP_Persuratan_Resmi.pdf',
                sizeText: 'PDF',
                updatedAt: 'Tersimpan',
                origin: customSopData ? 'offline_local' : 'cloud_drive'
            };
        }

        // Mode: Berkas PDF SOP Resmi Aktif
        const fileName = customSopMeta.name || 'SOP_Persuratan_Resmi.pdf';
        const locText = (customSopMeta.origin === 'offline_local' || (typeof isElectron !== 'undefined' && isElectron && customSopData))
            ? 'Tersimpan Offline Lokal'
            : 'Tersimpan di Cloud Drive';

        if (activeMetaEl) {
            activeMetaEl.classList.remove('d-none');
            activeMetaEl.innerHTML = `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 me-1"><i class="fas fa-check-circle me-1"></i>SOP Aktif</span> <b>${fileName}</b> <span class="text-muted">(${customSopMeta.sizeText || 'PDF'} • ${customSopMeta.updatedAt || 'Tersimpan'} • ${locText})</span>`;
        }
        if (activeBadgeEl) {
            activeBadgeEl.textContent = 'Dokumen SOP Resmi (PDF)';
            activeBadgeEl.className = 'badge rounded-pill bg-success text-white py-1 px-2.5';
        }

        // Tampilkan tombol Lihat dan tombol X Hapus HANYA JIKA ADA FILE YANG DIUNGGAH
        if (btnLihatEl) {
            btnLihatEl.classList.remove('d-none');
            btnLihatEl.className = 'btn btn-outline-danger btn-sm fw-semibold shadow-xs';
            btnLihatEl.innerHTML = '<i class="fas fa-eye me-1"></i>Lihat';
            btnLihatEl.title = 'Lihat pratinjau dokumen SOP resmi';
        }
        if (btnHapusEl) btnHapusEl.classList.remove('d-none');
    } else {
        // Mode: Belum ada file SOP PDF yang diunggah
        if (activeMetaEl) {
            activeMetaEl.classList.add('d-none');
            activeMetaEl.innerHTML = '';
        }
        if (activeBadgeEl) {
            activeBadgeEl.textContent = 'Belum Ada SOP PDF';
            activeBadgeEl.className = 'badge rounded-pill bg-secondary bg-opacity-10 text-secondary border py-1 px-2.5';
        }

        // Sembunyikan total tombol Lihat & Hapus jika belum ada dokumen yang diunggah
        if (btnLihatEl) btnLihatEl.classList.add('d-none');
        if (btnHapusEl) btnHapusEl.classList.add('d-none');
    }

    if (btnUnduhTemplateWord) {
        btnUnduhTemplateWord.classList.remove('d-none');
    }
}


window.handleSopFileSelected = function (e) {
    const file = e.target.files && e.target.files[0];
    const btnSave = document.getElementById('btnSaveSopPdf');
    const hintEl = document.getElementById('sopUploadHint');
    if (!file) {
        pendingSopPdfData = null;
        pendingSopPdfMeta = null;
        if (btnSave) btnSave.disabled = true;
        return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        Swal.fire({
            icon: 'warning',
            title: 'Format File Tidak Sesuai',
            text: 'Harap pilih berkas dokumen dengan format PDF (.pdf).'
        });
        e.target.value = '';
        if (btnSave) btnSave.disabled = true;
        return;
    }

    const sizeKB = (file.size / 1024).toFixed(1);
    if (file.size > 500 * 1024) {
        Swal.fire({
            icon: 'error',
            title: 'Ukuran File Terlalu Besar',
            text: `Ukuran file (${sizeKB} KB) melebihi batas maksimal 500 KB. Harap gunakan berkas PDF berukuran maksimal 500 KB.`
        });
        e.target.value = '';
        if (btnSave) btnSave.disabled = true;
        return;
    }

    const reader = new FileReader();
    reader.onload = function (evt) {
        pendingSopPdfData = evt.target.result;
        pendingSopPdfMeta = {
            name: file.name,
            sizeBytes: file.size,
            sizeText: sizeKB + ' KB',
            updatedAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            origin: (typeof window.sidimas !== 'undefined') ? 'offline_local' : 'cloud_drive'
        };
        if (btnSave) btnSave.disabled = false;
        if (hintEl) {
            hintEl.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i>File siap: ${file.name} (${sizeKB} KB). Klik tombol "Simpan File SOP" di bawah.</span>`;
        }
    };
    reader.readAsDataURL(file);
};

window.saveSopPdfFile = async function () {
    if (!pendingSopPdfData || !pendingSopPdfMeta) {
        Swal.fire({ icon: 'info', title: 'Pilih File', text: 'Silakan pilih berkas PDF SOP terlebih dahulu (maksimal 500 KB).' });
        return;
    }

    Swal.fire({
        title: 'Menyimpan Dokumen SOP...',
        text: 'Sedang memproses dan menyimpan berkas SOP ke sistem...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        let savedOffline = false;
        const onlineWeb = isOnlineWebSop();

        // 1. Jika di Electron, coba IPC saveOfflineSopPdf
        if (typeof window.sidimas !== 'undefined' && typeof window.sidimas.saveOfflineSopPdf === 'function') {
            try {
                const offRes = await window.sidimas.saveOfflineSopPdf({
                    fileDataUrl: pendingSopPdfData,
                    filename: pendingSopPdfMeta.name
                });
                if (offRes && offRes.success) {
                    savedOffline = true;
                    if (offRes.filePath) localStorage.setItem('sidimas_sop_pdf_local_path', offRes.filePath);
                    if (offRes.meta) pendingSopPdfMeta = offRes.meta;
                }
            } catch (ipcErr) {
                console.warn('[SiDiMAS] saveOfflineSopPdf IPC belum aktif di proses saat ini, beralih ke dbPut SQLite:', ipcErr);
            }
        }

        // 2. Fallback SQLite: gunakan window.sidimas.dbPut ('appSettings') yang SUDAH PASTI aktif di IPC
        if (typeof window.sidimas !== 'undefined' && !savedOffline) {
            try {
                await window.sidimas.dbPut('appSettings', { id: 'sop_pdf_data', data: pendingSopPdfData });
                await window.sidimas.dbPut('appSettings', { id: 'sop_pdf_meta', data: pendingSopPdfMeta });
                savedOffline = true;
            } catch (dbErr) {
                console.warn('[SiDiMAS] dbPut appSettings error:', dbErr);
            }
        }

        // 3. Jika sedang online dan di web browser, upload ke Google Drive
        if (onlineWeb) {
            try {
                const onlRes = await apiCall('uploadSopPdf', {
                    fileDataUrl: pendingSopPdfData,
                    filename: pendingSopPdfMeta.name
                });
                if (onlRes && onlRes.success && (onlRes.url || onlRes.previewUrl)) {
                    let previewUrl = onlRes.previewUrl || onlRes.url;
                    if (previewUrl.includes('drive.google.com/file/d/')) {
                        const m = previewUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                        if (m && m[1]) previewUrl = `https://drive.google.com/file/d/${m[1]}/preview`;
                    }
                    if (onlRes.meta) {
                        pendingSopPdfMeta = onlRes.meta;
                    }
                    onlineCloudSopInfo = {
                        url: previewUrl,
                        data: pendingSopPdfData,
                        localPath: '',
                        meta: pendingSopPdfMeta,
                        hasDoc: true
                    };
                    onlineCloudSopLoaded = true;
                    onlineCloudSopError = '';
                } else {
                    const msg = (onlRes && onlRes.message) ? onlRes.message : 'Server cloud tidak merespons berkas yang diunggah.';
                    throw new Error(msg);
                }
            } catch (cloudErr) {
                console.error('[SiDiMAS] Gagal unggah ke Google Drive:', cloudErr);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Menyimpan ke Cloud Drive',
                    text: 'Gagal mengunggah berkas ke Google Drive: ' + (cloudErr.message || String(cloudErr)) + '. Pastikan Google Apps Script (kode.gs) sudah di-Deploy versi baru.'
                });
                return;
            }
        }

        // Web online selalu membaca dokumen dari Drive, bukan salinan di perangkat.
        if (onlineWeb) {
            localStorage.removeItem('sidimas_sop_pdf_data');
            localStorage.removeItem('sidimas_sop_pdf_url');
            localStorage.removeItem('sidimas_sop_pdf_meta');
            if (typeof localDB !== 'undefined' && localDB.appSettings) {
                await localDB.appSettings.delete('sop_pdf_data');
                await localDB.appSettings.delete('sop_pdf_url');
                await localDB.appSettings.delete('sop_pdf_meta');
            }
        } else {
            try {
                localStorage.setItem('sidimas_sop_pdf_data', pendingSopPdfData);
            } catch (eQuota) {
                console.warn('[SiDiMAS] localStorage quota penuh untuk base64 data, mengandalkan IndexedDB/Cloud:', eQuota);
            }
            localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(pendingSopPdfMeta));
        }

        // Salinan lokal hanya digunakan mode offline; browser online berbagi dokumen dari Drive.
        if (!onlineWeb && typeof localDB !== 'undefined' && localDB.appSettings) {
            try {
                await localDB.appSettings.put({ id: 'sop_pdf_data', data: pendingSopPdfData });
                await localDB.appSettings.put({ id: 'sop_pdf_meta', data: pendingSopPdfMeta });
                const curUrl = localStorage.getItem('sidimas_sop_pdf_url');
                if (curUrl) {
                    await localDB.appSettings.put({ id: 'sop_pdf_url', data: curUrl });
                }
            } catch (_) { }
        }

        Swal.fire({
            icon: 'success',
            title: 'Berhasil Disimpan & Sinkron ke Cloud',
            text: 'Dokumen SOP resmi berhasil disimpan ke Google Drive dan langsung aktif di HP serta semua perangkat!',
            timer: 2500,
            showConfirmButton: false
        });
        finishSaveSop();
    } catch (saveError) {
        console.error('[SiDiMAS] Error saat menyimpan SOP:', saveError);
        if (isOnlineWebSop()) {
            Swal.fire('Gagal Menyimpan ke Cloud', saveError.message || String(saveError), 'error');
            return;
        }
        // Fallback darurat: pastikan metadata tetap tersimpan
        try {
            try { localStorage.setItem('sidimas_sop_pdf_data', pendingSopPdfData); } catch (_) { }
            localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(pendingSopPdfMeta));
            Swal.fire({
                icon: 'success',
                title: 'Berhasil Disimpan',
                text: 'Dokumen SOP persuratan berhasil disimpan lokal ke peramban!',
                timer: 2000,
                showConfirmButton: false
            });
            finishSaveSop();
        } catch (e) {
            Swal.fire('Gagal Menyimpan', saveError.message || String(saveError), 'error');
        }
    }
};

function finishSaveSop() {
    const inputEl = document.getElementById('inputSopPdf');
    if (inputEl) inputEl.value = '';
    const btnSave = document.getElementById('btnSaveSopPdf');
    if (btnSave) btnSave.disabled = true;
    const hintEl = document.getElementById('sopUploadHint');
    if (hintEl) hintEl.innerHTML = '<i class="fas fa-info-circle me-1"></i>Format wajib: <b>.pdf</b> | Ukuran maksimal: <b>500 KB</b>.';
    pendingSopPdfData = null;
    pendingSopPdfMeta = null;
    updateSopTabUI();
}

window.hapusSopPdf = function () {
    Swal.fire({
        title: 'Hapus Dokumen SOP?',
        text: 'Dokumen SOP kustom yang diunggah akan dihapus dan sistem akan kembali menggunakan template standar.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus Dokumen',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Menghapus Berkas...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            if (typeof window.sidimas !== 'undefined') {
                try {
                    if (typeof window.sidimas.deleteOfflineSopPdf === 'function') {
                        await window.sidimas.deleteOfflineSopPdf();
                    }
                } catch (_) { }
                try {
                    await window.sidimas.dbDelete('appSettings', 'sop_pdf_data');
                    await window.sidimas.dbDelete('appSettings', 'sop_pdf_meta');
                    await window.sidimas.dbDelete('appSettings', 'sop_pdf_local_path');
                } catch (_) { }
            } else if (isOnlineWebSop()) {
                try {
                    const response = await apiCall('deleteSopPdf');
                    if (!response || response.success !== true) {
                        throw new Error(response && response.message || 'Server gagal menghapus dokumen SOP.');
                    }
                    onlineCloudSopInfo = { url: '', data: '', localPath: '', meta: null, hasDoc: false };
                    onlineCloudSopLoaded = true;
                    onlineCloudSopError = '';
                } catch (error) {
                    Swal.fire('Gagal Menghapus SOP', error.message || String(error), 'error');
                    return;
                }
            }

            localStorage.removeItem('sidimas_sop_pdf_data');
            localStorage.removeItem('sidimas_sop_pdf_meta');
            localStorage.removeItem('sidimas_sop_pdf_url');
            localStorage.removeItem('sidimas_sop_pdf_local_path');

            // Hapus juga dari sidimas_settings
            try {
                const curSettings = JSON.parse(localStorage.getItem('sidimas_settings') || '{}');
                delete curSettings.sop_pdf_url;
                delete curSettings.sop_pdf_preview_url;
                delete curSettings.sop_pdf_download_url;
                delete curSettings.sop_pdf_file_id;
                delete curSettings.sop_pdf_name;
                delete curSettings.sop_pdf_filename;
                delete curSettings.sop_pdf_size;
                delete curSettings.sop_pdf_updated;
                delete curSettings.sop_pdf_meta;
                localStorage.setItem('sidimas_settings', JSON.stringify(curSettings));
            } catch (_) { }

            if (typeof localDB !== 'undefined' && localDB.appSettings) {
                try {
                    await localDB.appSettings.delete('sop_pdf_data');
                    await localDB.appSettings.delete('sop_pdf_meta');
                    await localDB.appSettings.delete('sop_pdf_url');
                } catch (_) { }
            }

            if (activeSopBlobUrl) {
                URL.revokeObjectURL(activeSopBlobUrl);
                activeSopBlobUrl = null;
                activeSopBlobData = null;
            }

            Swal.fire({
                icon: 'success',
                title: 'Dokumen Dihapus',
                text: 'Dokumen SOP kustom telah dihapus dari sistem.',
                timer: 1500,
                showConfirmButton: false
            });
            updateSopTabUI();
        }
    });
};

window.getActiveSopUrl = function () {
    const info = (typeof getStoredSopInfo === 'function') ? getStoredSopInfo() : {};

    if (isOnlineWebSop()) {
        if (!onlineCloudSopLoaded || !onlineCloudSopInfo) return null;
        if (onlineCloudSopInfo.data) {
            try {
                return getSopBlobUrl(onlineCloudSopInfo.data);
            } catch (error) {
                console.warn('[SiDiMAS] Gagal membuat pratinjau PDF SOP dari cloud:', error);
            }
        }
        return onlineCloudSopInfo.url || null;
    }

    // 1. Cek data base64 lokal jika tersedia
    const customData = info.data || localStorage.getItem('sidimas_sop_pdf_data');
    if (customData && customData.length > 50) {
        try {
            return getSopBlobUrl(customData);
        } catch (e) {
            console.warn('Gagal membuat Blob URL dari custom SOP:', e);
            return customData;
        }
    }

    // 2. Cek Path File Lokal di Harddisk (Electron Desktop)
    const localPath = info.localPath || localStorage.getItem('sidimas_sop_pdf_local_path');
    if (localPath && typeof window.sidimas !== 'undefined') {
        const normalized = localPath.replace(/\\/g, '/');
        return normalized.startsWith('file://') ? normalized : `file:///${normalized}`;
    }

    // 3. Cek URL Google Drive jika berada di web online
    const customUrl = info.url || localStorage.getItem('sidimas_sop_pdf_url');
    if (customUrl) {
        if (customUrl.includes('drive.google.com/file/d/')) {
            const m = customUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (m && m[1]) {
                return `https://drive.google.com/file/d/${m[1]}/preview`;
            }
        }
        return customUrl;
    }

    // 4. Jika belum ada dokumen yang diunggah, kembalikan null (tidak ada SOP cadangan)
    return null;
};

window.downloadTemplateWord = function () {
    const a = document.createElement('a');
    a.href = DEFAULT_SOP_WORD_PATH;
    a.download = DEFAULT_SOP_WORD_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
};


window.previewSopPdf = async function () {
    const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : navigator.onLine;

    // Pastikan data terbaru terbaca jika belum ada di cache Electron
    if (!localStorage.getItem('sidimas_sop_pdf_data') && typeof window.sidimas !== 'undefined') {
        try {
            const rowData = await window.sidimas.dbGet('appSettings', 'sop_pdf_data');
            const rowMeta = await window.sidimas.dbGet('appSettings', 'sop_pdf_meta');
            if (rowData) {
                const b64 = typeof rowData === 'object' && rowData.data ? rowData.data : rowData;
                if (b64 && typeof b64 === 'string') localStorage.setItem('sidimas_sop_pdf_data', b64);
            }
            if (rowMeta) {
                const m = typeof rowMeta === 'object' && rowMeta.data ? rowMeta.data : rowMeta;
                if (m) localStorage.setItem('sidimas_sop_pdf_meta', JSON.stringify(m));
            }
        } catch (_) { }
    }

    // Browser online selalu mengambil alamat SOP terbaru dari sumber cloud.
    if (isOnlineWebSop() && typeof syncSopTwoWay === 'function') {
        await syncSopTwoWay();
    }

    let pdfUrl = getActiveSopUrl();
    if (!pdfUrl && isOnline && typeof window.sidimas !== 'undefined' && typeof syncSopTwoWay === 'function') {
        try {
            await syncSopTwoWay();
            pdfUrl = getActiveSopUrl();
        } catch (_) { }
    }

    if (!pdfUrl) {
        if (isOnlineWebSop() && onlineCloudSopError) {
            Swal.fire('SOP Cloud Tidak Dapat Diakses', onlineCloudSopError, 'error');
            return;
        }
        Swal.fire({
            icon: 'info',
            title: 'Belum Ada Dokumen SOP',
            text: 'Dokumen SOP persuratan belum diunggah oleh pihak sekolah. Silakan unggah berkas SOP (format PDF) di menu Pengaturan.'
        });
        return;
    }

    const modalEl = document.getElementById('modalPreviewSOP');
    const iframe = document.getElementById('iframeSOPViewer');
    const btnBukaTab = document.getElementById('btnBukaTabSop');
    const loaderEl = document.getElementById('sopIframeLoader');

    if (btnBukaTab) {
        btnBukaTab.href = pdfUrl;
    }
    if (loaderEl) {
        loaderEl.style.display = 'block';
    }

    if (modalEl && iframe) {
        if (iframe.src !== pdfUrl) {
            iframe.src = pdfUrl;
        } else if (loaderEl) {
            loaderEl.style.display = 'none';
        }
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    } else if (typeof openFilePreviewModal === 'function') {
        openFilePreviewModal({
            title: 'Standar Operasional Prosedur (SOP) Persuratan Sekolah',
            typeBadge: 'PDF',
            dataUrl: pdfUrl,
            filename: 'SOP_Persuratan_SiDiMAS'
        });
    } else {
        window.open(pdfUrl, '_blank');
    }
};

window.downloadSopPdf = function () {
    const pdfUrl = getActiveSopUrl();
    if (!pdfUrl) {
        Swal.fire({
            icon: 'info',
            title: 'Belum Ada Dokumen SOP',
            text: 'Dokumen SOP persuratan belum diunggah oleh pihak sekolah. Silakan unggah berkas SOP (format PDF) di menu Pengaturan.'
        });
        return;
    }

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = 'SOP_Persuratan_SiDiMAS.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
};


// ============================================================
// CRUD TABEL DASAR HUKUM SIDIMAS
// ============================================================

window.getDasarHukumList = function () {
    try {
        const stored = localStorage.getItem('dasar_hukum_sidimas');
        if (stored) {
            let parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Pastikan jika ada regulasi standar baru yang belum ada di list (seperti Permendagri No. 1 Tahun 2023), kita auto-merge
                const existingNumbers = new Set(parsed.map(x => (x.nomor || '').toLowerCase().trim()));
                let updated = false;
                DEFAULT_DASAR_HUKUM_SIDIMAS.forEach(def => {
                    if (!existingNumbers.has((def.nomor || '').toLowerCase().trim())) {
                        parsed.push(def);
                        updated = true;
                    }
                });
                if (updated) {
                    localStorage.setItem('dasar_hukum_sidimas', JSON.stringify(parsed));
                }
                return parsed;
            }
        }
    } catch (e) { }
    return DEFAULT_DASAR_HUKUM_SIDIMAS;
};

window.renderDasarHukumTable = function () {
    const tbody = document.getElementById('tbodyDasarHukum');
    if (!tbody) return;

    const list = getDasarHukumList();
    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Belum ada data dasar hukum. Klik tombol <b>Reset Standar</b> untuk memuat 14 regulasi resmi persuratan.</td></tr>`;
        return;
    }

    const badgeColorMap = {
        'Undang-Undang': 'bg-primary text-primary border-primary',
        'Peraturan Pemerintah': 'bg-success text-success border-success',
        'Peraturan ANRI': 'bg-warning text-dark border-warning',
        'PermenPAN-RB': 'bg-purple text-dark border-secondary',
        'Permendikbud': 'bg-info text-info border-info',
        'Permendikbudristek': 'bg-info text-info border-info',
        'Permendagri': 'bg-secondary text-secondary border-secondary',
        'Keputusan Kepala Sekolah': 'bg-danger text-danger border-danger'
    };

    let html = '';
    list.forEach((item, idx) => {
        const badgeStyle = badgeColorMap[item.jenis] || 'bg-secondary text-secondary border-secondary';
        html += `
            <tr>
                <td class="text-center fw-bold text-muted py-2.5 px-3" style="width: 45px;">${idx + 1}</td>
                <td class="py-2.5 px-3" style="width: 170px;">
                    <span class="badge rounded-pill bg-opacity-10 border py-1 px-2.5 ${badgeStyle}" style="font-size: 0.72rem;">${item.jenis}</span>
                </td>
                <td class="py-2.5 px-3 fw-bold text-dark font-monospace" style="font-size: 0.8rem; width: 200px;">${item.nomor}</td>
                <td class="py-2.5 px-3 fw-semibold text-secondary" style="width: 250px;">${item.tentang}</td>
                <td class="py-2.5 px-3 text-muted" style="font-size: 0.8rem;">${item.keterkaitan}</td>
                <td class="text-center py-2.5 px-3" style="width: 90px;">
                    <div class="d-flex align-items-center justify-content-center gap-1">
                        <button type="button" onclick="openModalTambahDasarHukum(${idx})" class="btn btn-sm btn-outline-primary border-0 p-1" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" onclick="hapusDasarHukum(${idx})" class="btn btn-sm btn-outline-danger border-0 p-1" title="Hapus">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
};

window.openModalTambahDasarHukum = function (editIndex = -1) {
    const modalEl = document.getElementById('modalFormDasarHukum');
    if (!modalEl) return;
    const title = document.getElementById('modalDasarHukumTitle');
    const inputIdx = document.getElementById('editDasarHukumIndex');
    const inputJenis = document.getElementById('inputJenisRegulasi');
    const inputNomor = document.getElementById('inputNomorTahun');
    const inputTentang = document.getElementById('inputTentang');
    const inputKeterkaitan = document.getElementById('inputKeterkaitan');

    if (editIndex >= 0) {
        const list = getDasarHukumList();
        const item = list[editIndex];
        if (item) {
            title.innerHTML = '<i class="fas fa-edit me-2"></i>Edit Regulasi Dasar Hukum';
            inputIdx.value = editIndex;
            inputJenis.value = item.jenis || 'Undang-Undang';
            inputNomor.value = item.nomor || '';
            inputTentang.value = item.tentang || '';
            inputKeterkaitan.value = item.keterkaitan || '';
        }
    } else {
        title.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Tambah Regulasi Dasar Hukum';
        inputIdx.value = -1;
        inputJenis.value = 'Undang-Undang';
        inputNomor.value = '';
        inputTentang.value = '';
        inputKeterkaitan.value = '';
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
};

window.simpanDasarHukum = async function (e) {
    e.preventDefault();
    const inputIdx = parseInt(document.getElementById('editDasarHukumIndex').value, 10);
    const inputJenis = document.getElementById('inputJenisRegulasi').value.trim();
    const inputNomor = document.getElementById('inputNomorTahun').value.trim();
    const inputTentang = document.getElementById('inputTentang').value.trim();
    const inputKeterkaitan = document.getElementById('inputKeterkaitan').value.trim();

    if (!inputNomor || !inputTentang) {
        Swal.fire('Perhatian', 'Nomor & Tahun serta Judul Regulasi wajib diisi.', 'warning');
        return;
    }

    const list = getDasarHukumList();
    const newItem = {
        id: inputIdx >= 0 && list[inputIdx] ? list[inputIdx].id : Date.now(),
        jenis: inputJenis,
        nomor: inputNomor,
        tentang: inputTentang,
        keterkaitan: inputKeterkaitan || '-'
    };

    if (inputIdx >= 0 && inputIdx < list.length) {
        list[inputIdx] = newItem;
    } else {
        list.push(newItem);
    }

    localStorage.setItem('dasar_hukum_sidimas', JSON.stringify(list));
    if (typeof window.sidimas !== 'undefined') {
        try {
            await window.sidimas.dbPut('appSettings', { id: 'dasar_hukum_sidimas', data: list });
        } catch (_) { }
    }
    if (typeof localDB !== 'undefined' && localDB.appSettings) {
        try {
            await localDB.appSettings.put({ id: 'dasar_hukum_sidimas', data: list });
        } catch (_) { }
    }

    const modalEl = document.getElementById('modalFormDasarHukum');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();

    renderDasarHukumTable();
    Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan',
        text: 'Regulasi dasar hukum persuratan berhasil disimpan.',
        timer: 1500,
        showConfirmButton: false
    });
};

window.hapusDasarHukum = function (index) {
    const list = getDasarHukumList();
    const item = list[index];
    if (!item) return;

    Swal.fire({
        title: 'Hapus Regulasi Ini?',
        text: `Hapus dasar hukum: ${item.nomor} tentang ${item.tentang}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            list.splice(index, 1);
            localStorage.setItem('dasar_hukum_sidimas', JSON.stringify(list));
            if (typeof window.sidimas !== 'undefined') {
                try {
                    await window.sidimas.dbPut('appSettings', { id: 'dasar_hukum_sidimas', data: list });
                } catch (_) { }
            }
            if (typeof localDB !== 'undefined' && localDB.appSettings) {
                try {
                    await localDB.appSettings.put({ id: 'dasar_hukum_sidimas', data: list });
                } catch (_) { }
            }
            renderDasarHukumTable();
            Swal.fire({
                icon: 'success',
                title: 'Terhapus',
                text: 'Regulasi dasar hukum telah dihapus.',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
};

window.resetDasarHukumDefault = function () {
    Swal.fire({
        title: 'Reset ke Standar Regulasi?',
        text: 'Daftar dasar hukum akan dikembalikan ke 14 regulasi resmi tata kelola persuratan & kearsipan sekolah.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Reset Standar',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            localStorage.setItem('dasar_hukum_sidimas', JSON.stringify(DEFAULT_DASAR_HUKUM_SIDIMAS));
            if (typeof window.sidimas !== 'undefined') {
                try {
                    await window.sidimas.dbPut('appSettings', { id: 'dasar_hukum_sidimas', data: DEFAULT_DASAR_HUKUM_SIDIMAS });
                } catch (_) { }
            }
            if (typeof localDB !== 'undefined' && localDB.appSettings) {
                try {
                    await localDB.appSettings.put({ id: 'dasar_hukum_sidimas', data: DEFAULT_DASAR_HUKUM_SIDIMAS });
                } catch (_) { }
            }
            renderDasarHukumTable();
            Swal.fire({
                icon: 'success',
                title: 'Berhasil Direset',
                text: '14 regulasi dasar hukum persuratan standar berhasil dimuat kembali.',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
};

window.updateSopTabUI = updateSopTabUI;

// Inisialisasi otomatis jika tab dibuka atau halaman dimuat
document.addEventListener('DOMContentLoaded', function () {
    const sopTabBtn = document.getElementById('sop-hukum-tab');
    if (sopTabBtn) {
        sopTabBtn.addEventListener('shown.bs.tab', function () {
            loadSOPHukumTab();
        });
    }

    // Inisialisasi metadata SOP dan sinkronisasi otomatis dari cloud saat online
    setTimeout(async () => {
        try {
            updateSopTabUI();
            const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : navigator.onLine;
            if (isOnline && typeof syncSopTwoWay === 'function') {
                await syncSopTwoWay();
            }
        } catch (_) { }
    }, 1200);
});
