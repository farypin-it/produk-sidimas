// Kamus Bahasa Indonesia Lokal untuk DataTables (100% Offline, Cepat, Tanpa CDN)
const DT_LANG_ID = {
    sEmptyTable: "Tidak ada data yang tersedia pada tabel ini",
    sProcessing: "Sedang memproses...",
    sLengthMenu: "Tampilkan _MENU_ entri",
    sZeroRecords: "Tidak ditemukan data yang sesuai",
    sInfo: "Menampilkan _START_ sampai _END_ dari _TOTAL_ entri",
    sInfoEmpty: "Menampilkan 0 sampai 0 dari 0 entri",
    sInfoFiltered: "(disaring dari _MAX_ entri keseluruhan)",
    sSearch: "Cari:",
    oPaginate: {
        sFirst: "Pertama",
        sPrevious: "Sebelumnya",
        sNext: "Selanjutnya",
        sLast: "Terakhir"
    }
};
window.DT_LANG_ID = DT_LANG_ID;

// Helper: Bersihkan nilai teks dari kemungkinan format array JSON ["..."]
function cleanSuratField(val, def = '') {
    if (!val) return def;
    if (Array.isArray(val)) {
        const found = val.find(v => typeof v === 'string' && v.trim() !== '');
        return found !== undefined ? found.trim() : def;
    }
    if (typeof val === 'string') {
        let s = val.trim();
        if (s.startsWith('["') && s.endsWith('"]')) {
            try {
                const arr = JSON.parse(s);
                if (Array.isArray(arr)) {
                    const found = arr.find(v => typeof v === 'string' && v.trim() !== '');
                    return found !== undefined ? found.trim() : def;
                }
            } catch (e) { }
        }
        return s || def;
    }
    return String(val) || def;
}

/* --- NAVIGATION & TABLES --- */
function nav(p, el) {
    $('.modal-backdrop').remove(); $('body').removeClass('modal-open'); $('body').css('overflow', 'auto'); Swal.close();
    $('.page-view').addClass('hide'); $('#page-' + p).removeClass('hide');

    /* Bagian yang diubah: Reset active class untuk desktop dan mobile */
    $('.sidebar .nav-link, .nav-item-mobile').removeClass('active');
    if (el) {
        $(el).addClass('active');
    } else {
        $(`.sidebar .nav-link[onclick="nav('${p}', this)"]`).addClass('active');
        $(`.nav-item-mobile[onclick="nav('${p}', this)"]`).addClass('active');
    }

    // Sisa fungsinya tetap sama...
    if (p === 'home') { loadInitData(); loadDashboardStats(); }
    if (p === 'agenda') {
        refreshTable('masuk');
        refreshTable('keluar');
        const triggerEl = document.querySelector('#masuk-tab');
        if (triggerEl) {
            const tab = bootstrap.Tab.getOrCreateInstance(triggerEl);
            tab.show();
        }
    }
    if (p === 'buat') {
        if (typeof loadInitData === 'function') loadInitData();
        loadAutoNumber();
        if (typeof gantiFormSurat === 'function') gantiFormSurat();

        // Pastikan Select2 diinisialisasi SETELAH #page-buat sudah visible (tidak hide)
        // Gunakan setTimeout agar browser sempat repaint dulu
        setTimeout(function () {
            try {
                // Hancurkan dulu jika sudah ada (mencegah width 0px dari init saat hide)
                if ($('#selKodeArsip').hasClass('select2-hidden-accessible')) {
                    $('#selKodeArsip').select2('destroy');
                }
            } catch (e) { }

            // Muat opsi jika belum ada
            if (typeof loadKodeKlasifikasi === 'function' && $('#selKodeArsip').children('option').length <= 1) {
                loadKodeKlasifikasi();
            } else {
                // Init Select2 dengan width 'resolve' agar hitung ulang dari elemen yang sudah visible
                try {
                    $('#selKodeArsip').select2({
                        theme: 'bootstrap-5',
                        width: 'resolve',
                        placeholder: '-- Pilih Kode (Ketik untuk mencari...) --',
                        allowClear: true
                    });
                } catch (e) { console.warn('Select2 init err:', e); }
            }

            if (typeof updatePreview === 'function') updatePreview();
            if (typeof updateLiveSuratPreview === 'function') updateLiveSuratPreview();
        }, 50);
    }
    if (p === 'inbox') { loadInboxTable(); }

    // FIX: Reset tab Bootstrap di halaman Pengaturan agar tidak perlu klik 2x
    if (p === 'setting') {
        loadUserInfoPage();
        if (typeof loadKodeCustomTable === 'function') loadKodeCustomTable();
        // Aktifkan ulang tab pertama (Pengaturan Sistem) secara paksa
        const triggerEl = document.querySelector('#sistem-tab');
        if (triggerEl) {
            const tab = bootstrap.Tab.getOrCreateInstance(triggerEl);
            tab.show();
        }
        if (typeof updateLiveKopPreview === 'function') updateLiveKopPreview();
    }
}

/* --- HALAMAN INFO AKUN (READ-ONLY) --- */
function loadUserInfoPage() {
    const cred = getCredentials();
    let h = `
        <tr>
            <td class="text-center">1</td>
            <td><span class="badge bg-dark fs-6 px-3 py-2 font-monospace">${cred.admin_u}</span></td>
            <td>
                <div class="input-group input-group-sm" style="width: 200px;">
                    <input type="password" class="form-control font-monospace" value="${cred.admin_p}" readonly style="background-color: var(--bs-secondary); color: white; border: none; font-size: 1rem;">
                    <button class="btn btn-secondary border-0" type="button" onclick="togglePassword(this)"><i class="fas fa-eye"></i></button>
                </div>
            </td>
            <td><span class="badge bg-danger px-3 py-2">Admin</span></td>
            <td class="text-muted small">Akun utama (Admin). Dikonfigurasi oleh penyedia.</td>
            <td class="online-only" style="display:none;">-</td>
        </tr>
    `;

    if (cred.staff_u) {
        h += `
        <tr>
            <td class="text-center">2</td>
            <td><span class="badge bg-dark fs-6 px-3 py-2 font-monospace">${cred.staff_u}</span></td>
            <td>
                <div class="input-group input-group-sm" style="width: 200px;">
                    <input type="password" class="form-control font-monospace" value="${cred.staff_p}" readonly style="background-color: var(--bs-secondary); color: white; border: none; font-size: 1rem;">
                    <button class="btn btn-secondary border-0" type="button" onclick="togglePassword(this)"><i class="fas fa-eye"></i></button>
                </div>
            </td>
            <td><span class="badge bg-info px-3 py-2 text-dark">User</span></td>
            <td class="text-muted small">Akun staf (terbatas). Dikonfigurasi oleh penyedia.</td>
            <td class="online-only" style="display:none;">-</td>
        </tr>
        `;
    }

    $('#tbody-users').html(h);
}

function togglePassword(btn) {
    const input = $(btn).prev('input');
    const icon = $(btn).find('i');
    if (input.attr('type') === 'password') {
        input.attr('type', 'text');
        icon.removeClass('fa-eye').addClass('fa-eye-slash');
    } else {
        input.attr('type', 'password');
        icon.removeClass('fa-eye-slash').addClass('fa-eye');
    }
}

function refreshAllTables() { loadDashboardStats(); }

async function loadDashboardStats() {
    try {
        let isOnlineData = false;
        let d = null;

        if (API_URL && navigator.onLine) {
            try {
                d = await apiCall('getDashboardData');
                if (d && typeof d.totalMasuk !== 'undefined') {
                    isOnlineData = true;
                }
            } catch (err) {
                console.warn('Gagal memuat statistik online, fallback ke lokal', err);
            }
        }

        if (!isOnlineData || !d) {
            const masuk = await localDB.suratMasuk.toArray();
            const keluar = await localDB.suratKeluar.toArray();

            d = {
                totalMasuk: masuk.length,
                totalKeluar: keluar.length,
                bulanMasuk: Array(12).fill(0),
                bulanKeluar: Array(12).fill(0),
                jenisKeluar: {}
            };

            masuk.forEach(m => {
                if (m.tglSurat) {
                    const date = new Date(m.tglSurat);
                    if (!isNaN(date)) {
                        d.bulanMasuk[date.getMonth()]++;
                    }
                }
            });

            keluar.forEach(k => {
                if (k.tglSurat) {
                    const date = new Date(k.tglSurat);
                    if (!isNaN(date)) {
                        d.bulanKeluar[date.getMonth()]++;
                    }
                }
                if (k.klasifikasi) {
                    d.jenisKeluar[k.klasifikasi] = (d.jenisKeluar[k.klasifikasi] || 0) + 1;
                }
            });
        }

        $('#statMasuk').text(d.totalMasuk);
        $('#statKeluar').text(d.totalKeluar);
        renderCharts(d);
    } catch (e) {
        console.error("Gagal memuat statistik:", e);
    }
}

let chartBln = null;
let chartJns = null;

function renderCharts(data) {
    if (chartBln) chartBln.destroy();
    if (chartJns) chartJns.destroy();

    chartBln = new Chart(document.getElementById('chartBulanan'), {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
            datasets: [
                { label: 'Surat Masuk', data: data.bulanMasuk, backgroundColor: '#0d6efd' },
                { label: 'Surat Keluar', data: data.bulanKeluar, backgroundColor: '#198754' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Jumlah Surat' } } } }
    });

    const jenisLabels = [];
    const jenisVals = [];
    if (data.jenisKeluar) {
        for (const [key, value] of Object.entries(data.jenisKeluar)) {
            jenisLabels.push(key); jenisVals.push(value);
        }
    }

    chartJns = new Chart(document.getElementById('chartJenis'), {
        type: 'pie',
        data: { labels: jenisLabels, datasets: [{ data: jenisVals }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function refreshTable(j) {
    const tid = (j === 'masuk') ? '#tMasuk' : '#tKeluar';
    if ($.fn.DataTable.isDataTable(tid)) { $(tid).DataTable().destroy(); }

    const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : false;
    const tableDB = (j === 'masuk') ? localDB.suratMasuk : localDB.suratKeluar;

    const renderDataTable = (rowsData) => {
        let d = [];
        // Format agar cocok dengan array 2D lama untuk DataTables
        rowsData.forEach(r => {
            if (Array.isArray(r)) {
                // Berasal dari Google Spreadsheet (ambilData)
                if (j === 'masuk') {
                    d.push([r[0], r[1], cleanSuratField(r[2]), r[3], r[4], cleanSuratField(r[5]), cleanSuratField(r[6]), r[7], r[8], r[9], r[10], r[11], r[12] || 'synced']);
                } else {
                    const cleanP = cleanSuratField(r[4]);
                    const cleanT = cleanSuratField(r[5]);
                    d.push([r[0], r[1], r[2], r[3], cleanP, cleanT, r[6], r[7], r[8], r[9], r[10], r[11] || 'synced']);
                }
            } else {
                // Berasal dari localDB (SQLite / Dexie)
                if (j === 'masuk') {
                    d.push([r.id, r.tglTerima, cleanSuratField(r.pengirim), r.tglSurat, r.noSurat, cleanSuratField(r.perihal), cleanSuratField(r.ditujukan), r.uraian, r.keterangan, r.fileUrl, r.waktuInput, r.pembuat, r.sync_status]);
                } else {
                    const cleanP = cleanSuratField(r.perihal);
                    const cleanT = cleanSuratField(r.tujuan);
                    if (typeof r.perihal === 'string' && r.perihal.startsWith('["')) {
                        tableDB.update(r.id, { perihal: cleanP, tujuan: cleanT }).catch(() => { });
                    }
                    d.push([r.id, r.tglSurat, r.klasifikasi, r.noSurat, cleanP, cleanT, r.uraian, r.keterangan, r.fileUrl, r.waktuInput, r.pembuat, r.sync_status]);
                }
            }
        });

        if (j === 'masuk') { dbMasuk = d || []; } else { dbKeluar = d || []; }
        const r = (j === 'masuk') ? dbMasuk : dbKeluar;
        const cm = [
            { title: "ID", visible: false },
            { title: "Tgl Terima", visible: false },
            { title: "Pengirim" },
            { title: "Tgl Surat" },
            { title: "No Surat" },
            { title: "Perihal" },
            { title: "Tujuan", visible: false },
            { title: "Uraian" },
            { title: "Ket", visible: false },
            { title: "File", render: (d, t, row, meta) => btnFile(d, meta.row, 'masuk') },
            { title: "Aksi", render: (d, t, row, meta) => renderAksi(meta.row, 'masuk') }];
        const ck = [
            { title: "ID", visible: false },
            { title: "Tgl Surat" },
            { title: "Klasifikasi", visible: false },
            { title: "No Surat" },
            { title: "Perihal" },
            { title: "Tujuan" },
            { title: "Uraian" },
            { title: "Ket", visible: false },
            { title: "File", render: (d, t, row, meta) => btnFile(d, meta.row, 'keluar') },
            { title: "Aksi", render: (d, t, row, meta) => renderAksi(meta.row, 'keluar') }];

        if ($.fn.DataTable.isDataTable(tid)) { $(tid).DataTable().destroy(); }
        $(tid).empty();
        $(tid).DataTable({
            data: r,
            columns: (j === 'masuk') ? cm : ck,
            scrollX: true,
            autoWidth: false,
            destroy: true,
            language: DT_LANG_ID,
            order: [[0, 'desc']],
            drawCallback: function () {
                // Pastikan kolom sejajar setelah render (fix untuk tab Bootstrap)
                setTimeout(() => { this.api().columns.adjust(); }, 10);
            }
        });
    };

    if (isOnline) {
        $(tid).html('<tbody><tr><td colspan="12" class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2 text-muted">Memuat data dari Google Spreadsheet...</div></td></tr></tbody>');
        apiCall('ambilData', { jenis: j }).then(res => {
            if (Array.isArray(res)) {
                renderDataTable(res);
            } else {
                $(tid).html('<tbody><tr><td colspan="12" class="text-center text-danger p-4">Respons Spreadsheet tidak valid.</td></tr></tbody>');
            }
        }).catch(err => {
            console.error('[SiDiMAS] Gagal mengambil data surat dari Spreadsheet:', err);
            $(tid).html('<tbody><tr><td colspan="12" class="text-center text-danger p-4">Gagal memuat data dari Spreadsheet. Periksa koneksi lalu muat ulang.</td></tr></tbody>');
        });
    } else {
        $(tid).html('<tbody><tr><td colspan="12" class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2 text-muted">Memuat data dari database lokal...</div></td></tr></tbody>');
        tableDB.toArray().then(rows => renderDataTable(rows));
    }
}

function renderAksi(index, jenis) {
    const row = getDataByIndex(jenis, index);
    const currentUser = localStorage.getItem('sidimas_user');
    const currentRole = localStorage.getItem('sidimas_role') || 'admin';
    const isAdmin = (currentRole === 'admin' || currentRole === 'Admin');
    const creator = row[row.length - 2];

    // Jika bukan Admin dan surat ini dibuat oleh orang lain
    const isLocked = !isAdmin && creator && creator !== currentUser;

    if (isLocked) {
        return `<div class="btn-group" role="group">
            <button class="btn btn-sm btn-info text-white" onclick="viewSurat('${jenis}', ${index})" title="Lihat"><i class="fas fa-eye"></i></button>
            <span class="btn btn-sm btn-secondary disabled" title="Terkunci"><i class="fas fa-lock"></i></span>
        </div>`;
    } else {
        let btnHtml = `<div class="btn-group" role="group">
            <button class="btn btn-sm btn-info text-white" onclick="viewSurat('${jenis}', ${index})" title="Lihat"><i class="fas fa-eye"></i></button>
            <button class="btn btn-sm btn-warning" onclick="editSurat('${jenis}', ${index})" title="Edit"><i class="fas fa-edit"></i></button>`;

        // Hapus hanya untuk admin
        if (isAdmin) {
            btnHtml += `<button class="btn btn-sm btn-danger" onclick="delSurat('${jenis}', ${index})" title="Hapus"><i class="fas fa-trash"></i></button>`;
        }

        btnHtml += `</div>`;
        return btnHtml;
    }
}

/* ================= PREVIEW ENGINE (GOOGLE DRIVE LIGHT STYLE) ================= */
let currentPreviewZoom = 1.0;
let currentPreviewRotate = 0;
let currentPreviewDownloadFn = null;
let currentPreviewPrintFn = null;
let currentBlobUrl = null;
let previewModalEventsInitialized = false;
let currentPreviewBlob = null;
let currentPreviewType = '';
let currentPreviewFilename = 'dokumen';
let currentPreviewArchiveData = null;
let currentPreviewUrl = '';

function initPreviewModalEvents() {
    if (previewModalEventsInitialized) return;
    previewModalEventsInitialized = true;

    $('#btnPreviewZoomIn').on('click', function () {
        currentPreviewZoom = Math.min(+(currentPreviewZoom + 0.15).toFixed(2), 3.0);
        applyPreviewTransform();
    });

    $('#btnPreviewZoomOut').on('click', function () {
        currentPreviewZoom = Math.max(+(currentPreviewZoom - 0.15).toFixed(2), 0.3);
        applyPreviewTransform();
    });

    $('#btnPreviewZoomReset').on('click', function () {
        currentPreviewZoom = 1.0;
        currentPreviewRotate = 0;
        applyPreviewTransform();
    });

    $('#btnPreviewRotate').on('click', function () {
        currentPreviewRotate = (currentPreviewRotate + 90) % 360;
        applyPreviewTransform();
    });

    $('#btnPreviewDownload').on('click', function () {
        if (typeof currentPreviewDownloadFn === 'function') {
            currentPreviewDownloadFn();
        } else {
            Swal.fire('Info', 'Fungsi unduh tidak tersedia untuk dokumen ini.', 'info');
        }
    });

    $('#btnPreviewPrint').on('click', function () {
        if (typeof currentPreviewPrintFn === 'function') {
            currentPreviewPrintFn();
        } else {
            window.print();
        }
    });

    // Zoom halus dengan Ctrl + Wheel Mouse pada area viewport
    const viewport = document.getElementById('previewViewport');
    if (viewport) {
        viewport.addEventListener('wheel', function (e) {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    currentPreviewZoom = Math.min(+(currentPreviewZoom + 0.1).toFixed(2), 3.0);
                } else {
                    currentPreviewZoom = Math.max(+(currentPreviewZoom - 0.1).toFixed(2), 0.3);
                }
                applyPreviewTransform();
            }
        }, { passive: false });
    }

    // Pembersihan memori & reset state saat modal ditutup
    const modalEl = document.getElementById('modalPreviewFile');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', function () {
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
                currentBlobUrl = null;
            }
            const wrapper = document.getElementById('previewDocumentWrapper');
            if (wrapper) { wrapper.innerHTML = ''; wrapper.style.width = ''; }
            // Reset background body & viewport ke default gelap
            const mb = document.getElementById('previewModalBody');
            const vp = document.getElementById('previewViewport');
            if (mb) mb.style.background = '#525659';
            if (vp) { vp.style.padding = ''; }
            currentPreviewZoom = 1.0;
            currentPreviewRotate = 0;
            currentPreviewDownloadFn = null;
            currentPreviewPrintFn = null;
            applyPreviewTransform();
        });
    }
}


function applyPreviewTransform() {
    const wrapper = document.getElementById('previewDocumentWrapper');
    const zoomVal = document.getElementById('previewZoomVal');
    if (wrapper) {
        wrapper.style.transform = `scale(${currentPreviewZoom}) rotate(${currentPreviewRotate}deg)`;
    }
    if (zoomVal) {
        zoomVal.textContent = Math.round(currentPreviewZoom * 100) + '%';
    }
}

function dataUriToBlob(dataUri) {
    try {
        const arr = dataUri.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error('dataUriToBlob error:', e);
        return null;
    }
}

function downloadBase64File(dataUri, customFilename) {
    try {
        const arr = dataUri.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        let ext = mime.split('/').pop() || 'bin';
        const mimeMap = {
            'vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
            'vnd.ms-excel': 'xls',
            'msword': 'doc',
            'pdf': 'pdf',
            'jpeg': 'jpg',
            'png': 'png',
        };
        if (mimeMap[ext]) ext = mimeMap[ext];
        const bstr = atob(arr[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
        const blob = new Blob([u8arr], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const base = customFilename ? customFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_') : 'file_surat';
        a.download = base.endsWith('.' + ext) ? base : (base + '.' + ext);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        Swal.fire('Error', 'Gagal mengunduh file: ' + e.message, 'error');
    }
}

function downloadPreviewFile() {
    if (currentPreviewBlob) {
        if (typeof saveAs === 'function') {
            saveAs(currentPreviewBlob, currentPreviewFilename);
            return;
        }
        const url = URL.createObjectURL(currentPreviewBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = currentPreviewFilename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
    }
    const dataUrl = currentPreviewUrl || $('#pdfPreviewFrame').attr('src') || '';
    if (dataUrl.startsWith('data:')) {
        downloadBase64File(dataUrl, currentPreviewFilename);
        return;
    }
    if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = currentPreviewFilename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}

function printPreviewFile() {
    if (currentPreviewType === 'DOCX' || currentPreviewType === 'EXCEL') {
        const preview = document.getElementById('docxPreviewContainer');
        if (!preview || !preview.children.length) {
            return Swal.fire('Info', 'Pratinjau dokumen belum siap dicetak.', 'info');
        }
        const printFrame = document.createElement('iframe');
        printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        document.body.appendChild(printFrame);
        const printDocument = printFrame.contentDocument;
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => link.outerHTML).join('');
        const inlineStyles = Array.from(document.querySelectorAll('#docxPreviewContainer style'))
            .map(style => style.outerHTML).join('');
        printFrame.onload = () => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            printFrame.contentWindow.addEventListener('afterprint', () => printFrame.remove(), { once: true });
            setTimeout(() => printFrame.remove(), 30000);
        };
        printDocument.open();
        printDocument.write(`<!doctype html><html><head><meta charset="utf-8"><base href="${document.baseURI}">${styles}${inlineStyles}<style>@page{margin:12mm}body{margin:0;background:#fff!important}.docx-wrapper{padding:0!important;background:#fff!important}.docx{box-shadow:none!important;margin:0 auto!important}</style></head><body>${preview.innerHTML}</body></html>`);
        printDocument.close();
        return;
    }

    const frame = document.getElementById('pdfPreviewFrame');
    try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
    } catch (error) {
        if (currentBlobUrl) window.open(currentBlobUrl, '_blank', 'noopener');
        else Swal.fire('Gagal Cetak', 'Browser tidak mengizinkan pencetakan dari pratinjau ini.', 'error');
    }
}

async function renderExcelPreview(blob, container) {
    if (typeof XLSX === 'undefined') throw new Error('Library pembaca Excel belum dimuat.');
    const workbook = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
    container.innerHTML = '';
    const selector = document.createElement('select');
    selector.className = 'form-select form-select-sm mb-3';
    workbook.SheetNames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = name;
        selector.appendChild(option);
    });
    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-responsive bg-white';
    const renderSheet = () => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[Number(selector.value)]], { header: 1, defval: '' });
        const table = document.createElement('table');
        table.className = 'table table-sm table-bordered table-striped mb-0';
        const body = document.createElement('tbody');
        rows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value == null ? '' : String(value);
                tr.appendChild(cell);
            });
            body.appendChild(tr);
        });
        table.appendChild(body);
        tableWrap.replaceChildren(table);
    };
    selector.addEventListener('change', renderSheet);
    container.append(selector, tableWrap);
    renderSheet();
}

async function saveGeneratedLetterToOutgoing(archiveData) {
    const { dataObj, blob, filename } = archiveData || {};
    if (typeof Blob === 'undefined' || !(blob instanceof Blob)) {
        throw new Error('File DOCX hasil generate tidak tersedia atau formatnya tidak valid.');
    }
    const fileInfo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            name: filename,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            data: String(reader.result).split(',')[1]
        });
        reader.onerror = () => reject(reader.error || new Error('Gagal membaca file hasil generate.'));
        reader.readAsDataURL(blob);
    });

    const id = `GEN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const currentUser = localStorage.getItem('sidimas_user') || 'Admin';
    const templateName = String(dataObj.pilihJenisSurat || '').replace(/^\d+\.\s*/, '').replace(/\.docx$/i, '').trim();
    const templateKey = templateName.toLowerCase();
    const useFormSubject = templateKey.includes('surat dinas umum') || templateKey.includes('surat undangan');
    const templateSubjects = {
        'surat perjalanan dinas (spd)': 'Surat Perjalanan Dinas',
        'surat tugas (st)': 'Surat Tugas',
        'surat pernyataan melaksanakan tugas (spmt)': 'Surat Pernyataan Melaksanakan Tugas'
    };
    const perihal = useFormSubject
        ? String(dataObj.perihal || '').trim() || templateName
        : templateSubjects[templateKey] || templateName || 'Surat';
    const fileUrl = `data:${fileInfo.mimeType};base64,${fileInfo.data}`;
    const record = {
        id,
        waktuInput: new Date().toISOString(),
        pembuat: currentUser,
        sync_status: 'pending',
        fileUrl,
        fileInfoRaw: fileInfo,
        tglSurat: dataObj.inpTglSaja || dataObj.tglSuratSaja || dataObj.tanggalSuratFull || new Date().toISOString().slice(0, 10),
        klasifikasi: dataObj.kodeKlasifikasi || $('#selKodeArsip').val() || dataObj.pilihJenisSurat || 'Surat Dinas/Umum',
        noSurat: dataObj.nomorFull || $('#previewNomor').text() || '-',
        perihal: String(perihal),
        tujuan: dataObj.tujuanNama || dataObj.tujuanJabatan || dataObj.tujuanTempat || dataObj.namaPihakKedua || 'Kepada Yth.',
        uraian: dataObj.isiUmum || dataObj.suketIsi || dataObj.acaraDetail || 'Otomatis digenerate dari form Buat Surat',
        keterangan: dataObj.pilihJenisSurat || dataObj.jenisSurat || 'Hasil generate DOCX'
    };

    if (typeof isAppOnline === 'function' && isAppOnline()) {
        const response = await apiCall('simpanData', {
            data: {
                jenisForm: 'keluar',
                mode: 'add',
                idSurat: id,
                currentUser,
                currentRole: localStorage.getItem('sidimas_role') || 'staff',
                tglSurat: record.tglSurat,
                jenisSurat: record.klasifikasi,
                noSurat: record.noSurat,
                perihal: record.perihal,
                tujuan: record.tujuan,
                uraian: record.uraian,
                keterangan: record.keterangan,
                fileLama: '-'
            },
            fileInfo
        });
        if (!response || response.success !== true) {
            throw new Error(response && response.message || 'Spreadsheet tidak mengonfirmasi penyimpanan surat.');
        }
        refreshTable('keluar');
        refreshAllTables();
        return { pending: false, id };
    }

    if (!isElectron) throw new Error('Untuk menyimpan tanpa koneksi, gunakan aplikasi desktop SiDiMAS.');

    await localDB.suratKeluar.put(record);
    const saved = (await localDB.suratKeluar.toArray()).find(item => String(item.id) === id);
    if (!saved) throw new Error('Surat belum dapat diverifikasi di database lokal.');
    const pending = saved.sync_status !== 'synced';
    refreshTable('keluar');
    refreshAllTables();
    return { pending, id };
}

let externalInboxRows = [];
let externalPreviewBlobUrl = null;

function escapeInboxValue(value) {
    const element = document.createElement('span');
    element.textContent = value == null ? '' : String(value);
    return element.innerHTML;
}

function updateInboxBadge(rows) {
    const waitingCount = rows.filter(row => {
        const status = String(row.status || 'Menunggu Verifikasi').trim().toLowerCase();
        return !status || ['menunggu verifikasi', 'baru', 'pending', 'belum dibaca'].includes(status);
    }).length;
    document.querySelectorAll('#badgeInboxSidebar, #badgeInboxMobile').forEach(badge => {
        badge.textContent = waitingCount > 99 ? '99+' : String(waitingCount);
        badge.style.display = waitingCount ? 'inline-block' : 'none';
    });
    return waitingCount;
}

async function fetchExternalInboxRows() {
    if (typeof isAppOnline === 'function' && isAppOnline()) {
        const response = await apiCall('getSuratEksternal');
        if (!response || response.success !== true) {
            throw new Error(response && response.message || 'Gagal mengambil Surat Masuk dari Spreadsheet.');
        }
        return response.data || [];
    }
    if (isElectron) return localDB.suratEksternal.toArray();
    return [];
}

async function refreshInboxBadge(rows) {
    try {
        externalInboxRows = Array.isArray(rows) ? rows : await fetchExternalInboxRows();
        updateInboxBadge(externalInboxRows);
        return externalInboxRows;
    } catch (error) {
        console.warn('[SiDiMAS] Gagal memperbarui badge Surat Masuk:', error);
        return externalInboxRows;
    }
}

async function loadInboxTable() {
    const body = document.getElementById('tbody-inbox-eksternal');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="7" class="text-center p-4"><span class="spinner-border spinner-border-sm me-2"></span>Memuat surat masuk...</td></tr>';
    try {
        externalInboxRows = await fetchExternalInboxRows();
        updateInboxBadge(externalInboxRows);
        const orderedRows = [...externalInboxRows].sort((a, b) => String(b.waktuInput || '').localeCompare(String(a.waktuInput || '')));
        if (!orderedRows.length) {
            body.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-4">Belum ada surat eksternal yang masuk.</td></tr>';
            return;
        }
        body.innerHTML = orderedRows.map((row, index) => {
            const status = row.status || 'Menunggu Verifikasi';
            const normalizedStatus = String(status).toLowerCase();
            const badgeClass = normalizedStatus === 'diterima' ? 'bg-success' : normalizedStatus === 'ditolak' ? 'bg-danger' : 'bg-warning text-dark';
            const timestamp = row.waktuInput ? new Date(row.waktuInput).toLocaleString('id-ID') : '-';
            return `<tr>
                <td class="text-center">${index + 1}</td>
                <td>${escapeInboxValue(timestamp)}</td>
                <td>${escapeInboxValue(row.namaPengirim)}<br><small class="text-muted">${escapeInboxValue(row.lembagaPengirim)}</small></td>
                <td>${escapeInboxValue(row.noSurat)}<br><small class="text-muted">${escapeInboxValue(row.tglSurat)}</small></td>
                <td>${escapeInboxValue(row.halSurat)}</td>
                <td class="text-center"><span class="badge ${badgeClass}">${escapeInboxValue(status)}</span></td>
                <td class="text-center"><button type="button" class="btn btn-sm btn-outline-primary btn-detail-inbox" data-inbox-id="${escapeInboxValue(row.id)}"><i class="fas fa-eye me-1"></i>Detail</button></td>
            </tr>`;
        }).join('');
        body.querySelectorAll('.btn-detail-inbox').forEach(button => {
            button.addEventListener('click', () => showDetailSuratEksternal(button.dataset.inboxId));
        });
    } catch (error) {
        body.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-4">${escapeInboxValue(error.message || error)}</td></tr>`;
        console.error('[SiDiMAS] Gagal memuat inbox eksternal:', error);
    }
}

function showDetailSuratEksternal(id) {
    const record = externalInboxRows.find(row => String(row.id) === String(id));
    if (!record) return Swal.fire('Tidak Ditemukan', 'Data surat tidak ada di daftar saat ini. Muat ulang inbox.', 'warning');
    $('#vExtNama').text(record.namaPengirim || '-');
    $('#vExtEmail').text(record.emailPengirim || '-');
    $('#vExtNoHp').text(record.noHpPengirim || '-');
    $('#vExtLembaga').text(record.lembagaPengirim || '-');
    $('#vExtNoSurat').text(record.noSurat || '-');
    $('#vExtTglSurat').text(record.tglSurat || '-');
    $('#vExtHalSurat').text(record.halSurat || '-');
    $('#vExtTujuan').text(record.tujuanSurat || '-');
    $('#vExtSifat').text(record.sifatSurat || '-');
    $('#vExtKeterangan').text(record.keterangan || '-');

    const fileUrl = (record.fileUrl && record.fileUrl !== '-') ? record.fileUrl : (record.fileInfoRaw && record.fileInfoRaw.data
        ? `data:${record.fileInfoRaw.mimeType || 'application/octet-stream'};base64,${record.fileInfoRaw.data}`
        : '');
    const fileContainer = document.getElementById('vExtFileContainer');
    fileContainer.replaceChildren();
    if (fileUrl) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-primary';
        button.innerHTML = '<i class="fas fa-eye me-2"></i>Pratinjau Lampiran';
        button.addEventListener('click', async () => {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memuat lampiran...';
            try {
                let fileInfo = record.fileInfoRaw;
                if ((!fileInfo || !fileInfo.data) && typeof isAppOnline === 'function' && isAppOnline()) {
                    const response = await apiCall('getSuratEksternalFile', { id: record.id });
                    if (!response || response.success !== true || !response.data) {
                        throw new Error(response && response.message || 'Server tidak mengirim isi lampiran.');
                    }
                    fileInfo = response;
                }
                if (!fileInfo || !fileInfo.data) {
                    throw new Error('Isi lampiran tidak tersimpan di perangkat dan koneksi internet tidak tersedia.');
                }

                const blob = dataUriToBlob(`data:${fileInfo.mimeType || 'application/octet-stream'};base64,${fileInfo.data}`);
                if (!blob) throw new Error('Format lampiran tidak dapat dibaca.');
                if (externalPreviewBlobUrl) URL.revokeObjectURL(externalPreviewBlobUrl);
                externalPreviewBlobUrl = URL.createObjectURL(blob);
                const mimeType = fileInfo.mimeType || blob.type;
                const typeBadge = mimeType === 'application/pdf' ? 'PDF' : mimeType.startsWith('image/') ? 'GAMBAR' : 'BERKAS';
                bootstrap.Modal.getInstance(document.getElementById('modalDetailEksternal'))?.hide();
                openFilePreviewModal({
                    title: `Lampiran Surat ${record.noSurat || ''}`,
                    typeBadge,
                    dataUrl: externalPreviewBlobUrl,
                    blob,
                    filename: fileInfo.name || 'lampiran'
                });
            } catch (error) {
                Swal.fire('Gagal Membuka Lampiran', error.message || String(error), 'error');
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-eye me-2"></i>Pratinjau Lampiran';
            }
        });
        fileContainer.appendChild(button);
    } else {
        fileContainer.textContent = 'Lampiran tidak tersedia.';
    }

    const canUpdate = (localStorage.getItem('sidimas_role') || 'admin').toLowerCase() === 'admin';
    $('#btnTerimaEksternal, #btnTolakEksternal').toggle(canUpdate);
    $('#btnTerimaEksternal').off('click').on('click', () => updateStatusSuratEksternal(record, 'Diterima'));
    $('#btnTolakEksternal').off('click').on('click', () => updateStatusSuratEksternal(record, 'Ditolak'));
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetailEksternal')).show();
}

async function updateStatusSuratEksternal(record, status) {
    try {
        if (typeof isAppOnline === 'function' && isAppOnline()) {
            const response = await apiCall('updateStatusEksternal', { id: record.id, status });
            if (!response || response.success !== true) throw new Error(response && response.message || 'Spreadsheet tidak mengonfirmasi perubahan status.');
        } else if (isElectron) {
            await localDB.suratEksternal.update(record.id, { status });
            await localDB.antrianSync.put({ action: 'updateStatusEksternal', payload: { id: record.id, status }, status: 'pending' });
        } else {
            throw new Error('Koneksi internet diperlukan untuk mengubah status surat.');
        }
        record.status = status;
        updateInboxBadge(externalInboxRows);
        bootstrap.Modal.getInstance(document.getElementById('modalDetailEksternal'))?.hide();
        await loadInboxTable();
        Swal.fire('Status Diperbarui', `Surat ditandai ${status.toLowerCase()}.`, 'success');
    } catch (error) {
        Swal.fire('Gagal Memperbarui Status', error.message || String(error), 'error');
    }
}

function showModalKirimSurat() {
    const modalElement = document.getElementById('modalKirimSurat');
    if (!modalElement) {
        Swal.fire('Form Tidak Tersedia', 'Form pengiriman surat tidak ditemukan.', 'error');
        return;
    }
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

async function submitSuratEksternal(event) {
    event.preventDefault();
    const online = typeof isAppOnline === 'function' && isAppOnline();
    if (!online && !isElectron) {
        Swal.fire('Tidak Ada Koneksi', 'Pengiriman surat dari browser memerlukan koneksi internet.', 'warning');
        return;
    }

    const file = document.getElementById('extFile').files[0];
    if (!file) {
        Swal.fire('File Wajib Dipilih', 'Pilih file surat yang akan dikirim.', 'warning');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        Swal.fire('File Terlalu Besar', 'Ukuran file maksimal 10 MB.', 'warning');
        return;
    }

    const button = $('#btnSubmitEksternal');
    const originalHtml = button.html();
    button.prop('disabled', true);
    $('#spinSubmitEksternal').removeClass('hide');

    try {
        const fileInfoRaw = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
                name: file.name,
                mimeType: file.type || 'application/octet-stream',
                data: String(reader.result).split(',')[1]
            });
            reader.onerror = () => reject(reader.error || new Error('Gagal membaca file surat.'));
            reader.readAsDataURL(file);
        });

        const id = `EXT_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const record = {
            id,
            namaPengirim: $('#extNama').val().trim(),
            emailPengirim: $('#extEmail').val().trim(),
            noHpPengirim: $('#extNoHp').val().trim(),
            lembagaPengirim: $('#extLembaga').val().trim(),
            noSurat: $('#extNoSurat').val().trim(),
            sifatSurat: $('#extSifatSurat').val(),
            halSurat: $('#extHalSurat').val().trim(),
            tujuanSurat: $('#extTujuanSurat').val().trim(),
            tglSurat: $('#extTglSurat').val(),
            keterangan: $('#extKeterangan').val().trim(),
            fileInfoRaw,
            status: 'Menunggu Verifikasi',
            waktuInput: new Date().toISOString(),
            sync_status: online ? 'synced' : 'pending'
        };

        if (online) {
            const response = await apiCall('insertSuratEksternal', record);
            if (!response || response.success !== true) {
                throw new Error(response && (response.message || response.error) || 'Server tidak mengonfirmasi penerimaan surat.');
            }
            await refreshInboxBadge();
            Swal.fire('Surat Terkirim', 'Surat berhasil dikirim dan diterima server.', 'success');
        } else {
            await localDB.suratEksternal.put(record);
            await localDB.antrianSync.put({ action: 'insertSuratEksternal', payload: record, status: 'pending' });
            externalInboxRows.unshift(record);
            updateInboxBadge(externalInboxRows);
            Swal.fire('Tersimpan di Perangkat', 'Surat tersimpan di SQLite dan akan dikirim saat koneksi tersedia.', 'success');
        }

        document.getElementById('fKirimSurat').reset();
        bootstrap.Modal.getInstance(document.getElementById('modalKirimSurat'))?.hide();
    } catch (error) {
        Swal.fire('Gagal Mengirim Surat', error.message || String(error), 'error');
    } finally {
        button.prop('disabled', false).html(originalHtml);
    }
}

function printHtmlElement(htmlContent) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Cetak Dokumen - SiDiMAS</title>
            <style>
                @page { size: landscape; margin: 10mm 12mm 10mm 22mm; }
                body {
                    font-family: Arial, sans-serif;
                    background: #ffffff !important;
                    color: #000000 !important;
                    margin: 0;
                    padding: 10px 15px 15px 25px;
                    box-sizing: border-box;
                }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #333 !important; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 2000);
    }, 400);
}

function printImage(imgSrc) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Cetak Gambar - SiDiMAS</title>
            <style>
                @page { size: auto; margin: 10mm; }
                body {
                    margin: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: #ffffff;
                }
                img {
                    max-width: 100%;
                    max-height: 98vh;
                    object-fit: contain;
                }
            </style>
        </head>
        <body>
            <img src="${imgSrc}" onload="window.focus(); window.print();" />
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 3000);
}

function printPdf(blobUrlOrData) {
    const iframe = document.getElementById('previewPdfIframe');
    if (iframe && iframe.contentWindow) {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            return;
        } catch (e) {
            console.log('Iframe print fallback:', e);
        }
    }
    const printWin = window.open(blobUrlOrData, '_blank');
    if (printWin) {
        printWin.focus();
        setTimeout(() => { printWin.print(); }, 600);
    }
}

/**
 * openFilePreviewModal - PERSIS COPY CARA SIBUKINSTAL
 * Cara kerja: convert ke blobUrl → set iframe.src → set tombol href/download → show modal
 */
function openFilePreviewModal(opts) {
    opts = opts || {};
    const title = opts.title || 'Pratinjau File';
    const dataUrl = opts.dataUrl || '';
    const htmlContent = opts.htmlContent || '';
    const filename = opts.filename || 'dokumen';
    const typeBadge = opts.typeBadge || '';
    currentPreviewType = typeBadge.toUpperCase();
    currentPreviewFilename = filename;
    currentPreviewArchiveData = opts.archiveData || null;
    currentPreviewBlob = opts.blob || null;
    currentPreviewUrl = dataUrl;

    if (!/\.[a-z0-9]{2,5}$/i.test(currentPreviewFilename)) {
        const extension = { PDF: 'pdf', DOCX: 'docx', EXCEL: 'xlsx', GAMBAR: 'jpg' }[currentPreviewType];
        if (extension) currentPreviewFilename += `.${extension}`;
    }

    // Bersihkan blob URL sebelumnya
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }

    // Update judul modal
    const titleEl = document.getElementById('mdlPdfPreviewTitle');
    if (titleEl) titleEl.textContent = title;

    // ── KASUS KHUSUS: HTML Laporan (Agenda, Cetak, dsb) ──
    if (htmlContent) {
        currentPreviewType = 'PDF';
        currentPreviewArchiveData = null;
        $('#btnArchiveGenerated').addClass('d-none');
        $('#btnPrintPreview').removeClass('d-none');
        $('#btnPrintPreview').off('click').on('click', printPreviewFile);
        $('#pdfPreviewFrame').attr('src', 'about:blank').removeClass('d-none');
        $('#docxPreviewContainer').addClass('d-none');
        Swal.fire({
            title: 'Menyiapkan Laporan...',
            text: 'Mohon tunggu...',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        // Konversi HTML ke PDF via html2pdf lalu tampilkan di iframe
        const opt = {
            margin: [10, 22, 10, 12], // Top: 10mm, Left: 22mm, Bottom: 10mm, Right: 12mm (geser ke kanan agar tidak terpotong)
            filename: filename + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'legal', orientation: 'landscape' }
        };
        const div = document.createElement('div');
        div.innerHTML = htmlContent;
        div.style.width = '100%';
        div.style.minWidth = '1150px';
        div.style.paddingLeft = '15px'; // Padding ekstra agar isi tabel lebih ke kanan
        div.style.boxSizing = 'border-box';
        div.style.background = '#fff';

        if (typeof html2pdf !== 'undefined') {
            html2pdf().set(opt).from(div).toPdf().get('pdf').then(function (pdf) {
                Swal.close();
                const blobUrl = pdf.output('bloburl');
                currentBlobUrl = blobUrl;
                $('#pdfPreviewFrame').attr('src', blobUrl);
                $('#btnOpenPdf').attr('href', blobUrl);
                $('#btnDownloadPdf').off('click').on('click', function () { pdf.save(opt.filename); });
                $('#mdlPdfPreview').modal('show');
            }).catch(e => {
                Swal.close();
                Swal.fire('Error', 'Gagal memproses laporan: ' + e, 'error');
            });
        } else {
            Swal.close();
            if (typeof opts.printFn === 'function') opts.printFn();
        }
        return;
    }

    // ── KASUS UMUM: File (PDF, Gambar, Word, dll) ──
    // Konversi data URL → blob URL agar bisa di-set ke iframe src
    let blobUrl = '';

    if (dataUrl.startsWith('data:')) {
        // Base64 data URL → Blob → Object URL
        try {
            const blob = dataUriToBlob(dataUrl);
            blobUrl = URL.createObjectURL(blob);
            currentBlobUrl = blobUrl;
            currentPreviewBlob = blob;
        } catch (e) {
            console.warn('Gagal konversi data URL:', e);
            blobUrl = dataUrl;
        }
    } else if (dataUrl.startsWith('blob:') || dataUrl.startsWith('file:') || dataUrl.startsWith('http')) {
        blobUrl = dataUrl;
        currentBlobUrl = blobUrl;
    } else {
        Swal.fire('Info', 'Format file tidak dikenali.', 'info');
        return;
    }

    $('#btnDownloadPdf').off('click').on('click', downloadPreviewFile);
    $('#btnPrintPreview').off('click').on('click', printPreviewFile);
    $('#btnArchiveGenerated').toggleClass('d-none', !currentPreviewArchiveData).off('click').on('click', async function () {
        if (!currentPreviewArchiveData || this.disabled) return;
        const button = $(this);
        const originalHtml = button.html();
        button.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...');
        try {
            const result = await saveGeneratedLetterToOutgoing(currentPreviewArchiveData);
            button.removeClass('btn-success').addClass('btn-outline-success')
                .html('<i class="fas fa-check me-1"></i> Tersimpan di Surat Keluar');
            Swal.fire({
                icon: result.pending ? 'warning' : 'success',
                title: result.pending ? 'Tersimpan Lokal' : 'Masuk Surat Keluar',
                text: result.pending ? 'Surat tersimpan di perangkat dan akan disinkronkan saat koneksi tersedia.' : 'Surat berhasil disimpan dan disinkronkan ke Surat Keluar.',
                timer: 2200,
                showConfirmButton: false
            });
        } catch (error) {
            button.prop('disabled', false).html(originalHtml);
            Swal.fire('Gagal Menyimpan', `Surat belum masuk ke arsip lokal: ${error.message}`, 'error');
        }
    });

    // Set iframe src + tombol Buka PDF — PERSIS CARA SIBUKINSTAL
    if (typeBadge === 'DOCX') {
        $('#pdfPreviewFrame').addClass('d-none');
        $('#docxPreviewContainer').removeClass('d-none').html('<div class="text-center mt-5"><div class="spinner-border text-primary"></div><p>Memuat Dokumen Word...</p></div>');

        const renderDocx = async () => {
            try {
                let blob = currentPreviewBlob;
                if (!blob && dataUrl.startsWith('data:')) blob = dataUriToBlob(dataUrl);
                else if (!blob) {
                    const res = await fetch(dataUrl);
                    blob = await res.blob();
                }
                const container = document.getElementById('docxPreviewContainer');
                if (typeof docx !== 'undefined' && docx.renderAsync) {
                    await docx.renderAsync(blob, container);
                } else {
                    container.innerHTML = '<div class="alert alert-danger m-4">Library docx-preview tidak dimuat dengan benar.</div>';
                }
            } catch (err) {
                document.getElementById('docxPreviewContainer').innerHTML = '<div class="alert alert-danger m-4">Gagal merender dokumen Word: ' + err.message + '</div>';
            }
        };
        renderDocx();
    } else if (typeBadge.toUpperCase() === 'EXCEL') {
        $('#pdfPreviewFrame').addClass('d-none');
        $('#docxPreviewContainer').removeClass('d-none').html('<div class="text-center mt-5"><div class="spinner-border text-primary"></div><p>Memuat lembar kerja...</p></div>');
        const renderExcel = async () => {
            try {
                let blob = currentPreviewBlob;
                if (!blob && dataUrl.startsWith('data:')) blob = dataUriToBlob(dataUrl);
                else if (!blob) blob = await (await fetch(dataUrl)).blob();
                await renderExcelPreview(blob, document.getElementById('docxPreviewContainer'));
            } catch (error) {
                document.getElementById('docxPreviewContainer').innerHTML = `<div class="alert alert-danger m-4">Gagal memuat lembar kerja: ${error.message}</div>`;
            }
        };
        renderExcel();
    } else {
        $('#docxPreviewContainer').addClass('d-none');
        $('#pdfPreviewFrame').removeClass('d-none').attr('src', blobUrl);
    }

    $('#btnOpenPdf').attr('href', blobUrl);
    $('#btnOpenPdf').attr('download', currentPreviewFilename);
    $('#mdlPdfPreview').modal('show');
}

function btnFile(d, rowIndex, jenis) {
    if (!d || d === '-' || d.length < 5) return '<span class="text-muted small">-</span>';
    return `<button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 shadow-sm px-2 py-1" onclick="viewFileSurat('${jenis}', ${rowIndex})" title="Lihat Berkas (Preview)">
        <i class="fas fa-eye text-primary"></i> <span style="font-size: 11px;">Lihat</span>
    </button>`;
}

async function viewFileSurat(jenis, index) {
    const row = getDataByIndex(jenis, index);
    if (!row) return;
    const isMasuk = (jenis === 'masuk');
    const noSurat = isMasuk ? (row[4] || 'Surat Masuk') : (row[3] || 'Surat Keluar');
    const perihal = isMasuk ? (row[5] || '') : (row[4] || '');
    let fileUrl = isMasuk ? row[9] : row[8];
    const recordId = row[0];

    if (isElectron) {
        const tableDB = isMasuk ? localDB.suratMasuk : localDB.suratKeluar;
        const localRecord = (await tableDB.toArray()).find(record => String(record.id) === String(recordId));
        if (localRecord && typeof localRecord.fileUrl === 'string' && localRecord.fileUrl.startsWith('data:')) {
            fileUrl = localRecord.fileUrl;
        } else if (localRecord && localRecord.fileInfoRaw && localRecord.fileInfoRaw.data) {
            fileUrl = `data:${localRecord.fileInfoRaw.mimeType || 'application/octet-stream'};base64,${localRecord.fileInfoRaw.data}`;
        } else if (fileUrl && /^https?:/i.test(fileUrl)) {
            if (!navigator.onLine || !API_URL) {
                Swal.fire('Lampiran Belum Tersimpan Lokal', 'Desktop sedang offline dan file surat ini belum memiliki salinan di SQLite. Sambungkan internet dan buka file sekali untuk menyimpannya ke perangkat.', 'warning');
                return;
            }
            Swal.fire({ title: 'Menyimpan Lampiran ke Perangkat...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                const response = await apiCall('getArsipSuratFile', { jenis, id: recordId });
                if (!response || response.success !== true || !response.data) {
                    throw new Error(response && response.message || 'Server tidak mengirim isi lampiran.');
                }
                fileUrl = `data:${response.mimeType || 'application/octet-stream'};base64,${response.data}`;
                await tableDB.update(recordId, { fileUrl });
                Swal.close();
            } catch (error) {
                Swal.close();
                Swal.fire('Gagal Menyimpan Lampiran Lokal', error.message || String(error), 'error');
                return;
            }
        }
    }

    if (!fileUrl || fileUrl === '-' || fileUrl.length < 5) {
        Swal.fire('Informasi', 'Surat ini tidak memiliki lampiran berkas/file.', 'info');
        return;
    }

    let title = `${noSurat}` + (perihal ? ` - ${perihal}` : '');
    let typeBadge = 'BERKAS';
    if (fileUrl.startsWith('data:application/pdf') || /\.pdf($|\?)/i.test(fileUrl)) {
        typeBadge = 'PDF';
    } else if (fileUrl.startsWith('data:image/') || /\.(jpe?g|png|gif|webp)($|\?)/i.test(fileUrl)) {
        typeBadge = 'GAMBAR';
    } else if (fileUrl.includes('word') || /\.docx?($|\?)/i.test(fileUrl)) {
        typeBadge = 'DOCX';
    } else if (fileUrl.includes('sheet') || /\.xlsx?($|\?)/i.test(fileUrl)) {
        typeBadge = 'EXCEL';
    }

    openFilePreviewModal({
        title: title,
        typeBadge: typeBadge,
        dataUrl: fileUrl,
        filename: `Berkas_${jenis}_${noSurat.replace(/[^a-zA-Z0-9_\-]/g, '_')}`
    });
}

/* ================= EXPORT & CRUD ================= */

/**
 * Pembangun Kop Surat Resmi untuk Laporan Agenda (Surat Masuk / Keluar)
 * Menggunakan data Pengaturan Aplikasi aktif (logo_instansi, logo_sekolah, warna tema, alamat, kontak)
 */
function buildKopLaporanHtml(settings) {
    const s = settings || JSON.parse(localStorage.getItem('sidimas_settings') || '{}');
    const judulInstansi = (s.nama_instansi || 'PEMERINTAH DAERAH').toUpperCase();
    const judulOpd = (s.nama_opd || '').toUpperCase();
    const judulSekolah = (s.nama_sekolah || 'NAMA SEKOLAH').toUpperCase();
    const alamat = s.alamat_sekolah || '';
    const kontakArr = [];
    if (s.email_sekolah) kontakArr.push(s.email_sekolah);
    if (s.website_sekolah) kontakArr.push(s.website_sekolah);
    if (s.telp_sekolah) kontakArr.push('Telp: ' + s.telp_sekolah);
    const kontakStr = kontakArr.join(' | ');
    const temaColor = s.app_color || '#0d6efd';

    const logo1 = (s.logo_instansi && s.logo_instansi.length > 50) ? s.logo_instansi : '';
    const logo2 = (s.logo_sekolah && s.logo_sekolah.length > 50) ? s.logo_sekolah : '';

    return `
        <div style="border-bottom: 3px double ${temaColor}; padding-bottom: 12px; margin-bottom: 18px;">
            <table style="width: 100%; border: none !important; border-collapse: collapse;">
                <tr>
                    <td style="width: 85px; text-align: center; vertical-align: middle; padding: 0 10px 0 0; border: none !important;">
                        ${logo1 ? `<img src="${logo1}" style="max-height: 75px; max-width: 75px; object-fit: contain;">` : '<div style="width: 75px;"></div>'}
                    </td>
                    <td style="text-align: center; vertical-align: middle; padding: 0 10px; border: none !important; line-height: 1.25;">
                        <div style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #111;">${judulInstansi}</div>
                        ${judulOpd ? `<div style="font-size: 13.5px; font-weight: bold; text-transform: uppercase; color: #222; margin-top: 1px;">${judulOpd}</div>` : ''}
                        <div style="font-size: 17px; font-weight: 900; text-transform: uppercase; color: ${temaColor}; margin: 2px 0;">${judulSekolah}</div>
                        ${alamat ? `<div style="font-size: 11px; color: #333; font-style: italic;">${alamat}</div>` : ''}
                        ${kontakStr ? `<div style="font-size: 10.5px; color: #555; margin-top: 2px;">${kontakStr}</div>` : ''}
                    </td>
                    <td style="width: 85px; text-align: center; vertical-align: middle; padding: 0 0 0 10px; border: none !important;">
                        ${logo2 ? `<img src="${logo2}" style="max-height: 75px; max-width: 75px; object-fit: contain;">` : '<div style="width: 75px;"></div>'}
                    </td>
                </tr>
            </table>
        </div>
    `;
}

/**
 * Merender dokumen HTML Laporan Agenda dengan Kop Resmi dan Tabel Proporsional
 */
function renderLaporanHtml(j, rows, tglAwal, tglAkhir) {
    const settings = JSON.parse(localStorage.getItem('sidimas_settings') || '{}');
    const jenisTeks = (j === 'masuk') ? 'SURAT MASUK' : 'SURAT KELUAR';
    const headerBg = (j === 'masuk') ? (settings.app_color || '#0d6efd') : '#198754';

    let theadHtml = '';
    let tbodyHtml = '';

    if (j === 'masuk') {
        theadHtml = `<tr style="background:${headerBg}; color:white;">
            <th style="padding:7px 6px; border:1px solid #444; text-align:center; width:38px;">No</th>
            <th style="padding:7px 6px; border:1px solid #444; width:88px; text-align:center;">Tgl Terima</th>
            <th style="padding:7px 6px; border:1px solid #444; width:140px;">Pengirim</th>
            <th style="padding:7px 6px; border:1px solid #444; width:88px; text-align:center;">Tgl Surat</th>
            <th style="padding:7px 6px; border:1px solid #444; width:140px;">No Surat</th>
            <th style="padding:7px 6px; border:1px solid #444;">Perihal</th>
            <th style="padding:7px 6px; border:1px solid #444; width:120px;">Ditujukan</th>
            <th style="padding:7px 6px; border:1px solid #444; width:140px;">Uraian</th>
        </tr>`;
        rows.forEach((r, i) => {
            tbodyHtml += `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8faff'}">
                <td style="padding:6px; border:1px solid #ccc; text-align:center;">${i + 1}</td>
                <td style="padding:6px; border:1px solid #ccc; text-align:center;">${r.tglTerima || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc;">${r.pengirim || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc; text-align:center;">${r.tglSurat || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc;">${r.noSurat || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc;">${r.perihal || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc;">${r.ditujukan || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc;">${r.uraian || '-'}</td>
            </tr>`;
        });
    } else {
        theadHtml = `<tr style="background:${headerBg}; color:white;">
            <th style="padding:7px 6px; border:1px solid #444; text-align:center; width:38px;">No</th>
            <th style="padding:7px 6px; border:1px solid #444; width:95px; text-align:center;">Tgl Surat</th>
            <th style="padding:7px 6px; border:1px solid #444; width:85px; text-align:center;">Klasifikasi</th>
            <th style="padding:7px 6px; border:1px solid #444; width:160px;">No Surat</th>
            <th style="padding:7px 6px; border:1px solid #444;">Perihal</th>
            <th style="padding:7px 6px; border:1px solid #444; width:150px;">Tujuan</th>
            <th style="padding:7px 6px; border:1px solid #444; width:160px;">Uraian</th>
        </tr>`;
        rows.forEach((r, i) => {
            tbodyHtml += `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fff9'}">
                <td style="padding:6px; border:1px solid #ccc; text-align:center;">${i + 1}</td>
                <td style="padding:6px; border:1px solid #ccc; text-align:center;">${r.tglSurat || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc; text-align:center;">${r.klasifikasi || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc;">${r.noSurat || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc;">${r.perihal || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc;">${r.tujuan || '-'}</td>
                <td style="padding:6px; border:1px solid #ccc;">${r.uraian || '-'}</td>
            </tr>`;
        });
    }

    const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const kota = settings.kota_surat || 'Tempat';

    return `
        <div class="report-paper-container" style="font-family: Arial, sans-serif; padding: 15px 15px 15px 25px; background: #ffffff;">
            ${buildKopLaporanHtml(settings)}
            <div style="text-align: center; margin-bottom: 15px;">
                <h4 style="margin: 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #111;">BUKU AGENDA ${jenisTeks}</h4>
                <div style="font-size: 11.5px; color: #555; margin-top: 4px;">Periode: <b>${tglAwal}</b> s/d <b>${tglAkhir}</b> &nbsp;|&nbsp; Total: <b>${rows.length}</b> Surat</div>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px;">
                <thead>${theadHtml}</thead>
                <tbody>${tbodyHtml}</tbody>
            </table>
            <div style="margin-top: 30px; display: flex; justify-content: flex-end;">
                <table style="width: auto; min-width: 250px; border: none !important; border-collapse: collapse; text-align: center; font-size: 11.5px; line-height: 1.35;">
                    <tr><td style="border: none !important; padding: 2px;">${kota}, ${tglCetak}</td></tr>
                    <tr><td style="border: none !important; padding: 2px; font-weight: bold;">Kepala Sekolah,</td></tr>
                    <tr><td style="border: none !important; height: 55px;"></td></tr>
                    <tr><td style="border: none !important; padding: 2px; font-weight: bold; text-decoration: underline;">${settings.kepsek_nama || '( ................................... )'}</td></tr>
                    <tr><td style="border: none !important; padding: 2px; font-size: 10.5px; color: #555;">${settings.kepsek_pangkat || ''}</td></tr>
                    <tr><td style="border: none !important; padding: 2px;">${settings.kepsek_nip ? 'NIP. ' + settings.kepsek_nip : ''}</td></tr>
                </table>
            </div>
        </div>
    `;
}

function downloadPDF(j) {
    const s = (j === 'masuk') ? $('#filterM_Start').val() : $('#filterK_Start').val();
    const e = (j === 'masuk') ? $('#filterM_End').val() : $('#filterK_End').val();
    if (!s || !e) { Swal.fire('Info', 'Pilih tanggal terlebih dahulu', 'warning'); return; }

    const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : false;

    // Jika online: ambil data terbaru dari spreadsheet agar sinkron
    if (isOnline) {
        Swal.fire({
            title: 'Menyiapkan Laporan PDF...',
            text: 'Mengambil data dari Spreadsheet...',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        apiCall('ambilData', { jenis: j }).then(res => {
            Swal.close();
            if (Array.isArray(res) && res.length > 0) {
                let formatted = [];
                res.forEach(r => {
                    const tgl = (j === 'masuk') ? r[1] : r[1];
                    if (tgl && tgl >= s && tgl <= e) {
                        if (j === 'masuk') {
                            formatted.push({
                                id: r[0], tglTerima: r[1], pengirim: r[2], tglSurat: r[3],
                                noSurat: r[4], perihal: r[5], ditujukan: r[6], uraian: r[7]
                            });
                        } else {
                            formatted.push({
                                id: r[0], tglSurat: r[1], klasifikasi: r[2], noSurat: r[3],
                                perihal: r[4], tujuan: r[5], uraian: r[6]
                            });
                        }
                    }
                });

                if (formatted.length === 0) {
                    Swal.fire('Info', 'Tidak ada data pada rentang tanggal tersebut di Spreadsheet.', 'info');
                    return;
                }

                tampilkanModalLaporanPDF(j, formatted, s, e);
            } else {
                downloadPDFOffline(j, s, e);
            }
        }).catch(err => {
            Swal.close();
            console.warn('[SiDiMAS] Gagal ambil data online, beralih ke database lokal:', err);
            downloadPDFOffline(j, s, e);
        });
    } else {
        downloadPDFOffline(j, s, e);
    }
}

function downloadPDFOffline(j, tglAwal, tglAkhir) {
    const tableDB = (j === 'masuk') ? localDB.suratMasuk : localDB.suratKeluar;
    tableDB.toArray().then(rows => {
        const filtered = rows.filter(r => {
            const tgl = (j === 'masuk') ? r.tglTerima : r.tglSurat;
            return tgl && tgl >= tglAwal && tgl <= tglAkhir;
        });

        if (filtered.length === 0) {
            Swal.fire('Info', 'Tidak ada data pada rentang tanggal tersebut di Database lokal.', 'info');
            return;
        }

        tampilkanModalLaporanPDF(j, filtered, tglAwal, tglAkhir);
    });
}

function tampilkanModalLaporanPDF(j, rows, tglAwal, tglAkhir) {
    const jenisTeks = (j === 'masuk') ? 'SURAT MASUK' : 'SURAT KELUAR';
    const htmlContent = renderLaporanHtml(j, rows, tglAwal, tglAkhir);

    openFilePreviewModal({
        title: `Laporan Agenda ${jenisTeks} (${tglAwal} s/d ${tglAkhir})`,
        typeBadge: 'LAPORAN PDF',
        htmlContent: htmlContent,
        filename: `Laporan_Agenda_${jenisTeks.replace(' ', '_')}_${tglAwal}_${tglAkhir}.pdf`,
        downloadFn: () => {
            const element = document.createElement('div');
            element.innerHTML = htmlContent;
            const opt = {
                margin: [10, 22, 10, 12], // Top: 10mm, Left: 22mm, Bottom: 10mm, Right: 12mm
                filename: `Laporan_Agenda_${jenisTeks.replace(' ', '_')}_${tglAwal}_${tglAkhir}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
                jsPDF: { unit: 'mm', format: 'legal', orientation: 'landscape' }
            };
            if (typeof html2pdf !== 'undefined') {
                Swal.fire({
                    title: 'Mengunduh Laporan...',
                    text: 'Sedang mengekspor file PDF, mohon tunggu...',
                    timer: 1500,
                    showConfirmButton: false,
                    didOpen: () => Swal.showLoading()
                });
                html2pdf().set(opt).from(element).save();
            } else {
                Swal.fire('Error', 'Library html2pdf tidak tersedia.', 'error');
            }
        },
        printFn: () => {
            printHtmlElement(htmlContent);
        }
    });
}

function downloadExcel(j) {
    const s = (j === 'masuk') ? $('#filterM_Start').val() : $('#filterK_Start').val();
    const e = (j === 'masuk') ? $('#filterM_End').val() : $('#filterK_End').val();
    if (!s || !e) { Swal.fire('Info', 'Pilih tanggal terlebih dahulu', 'warning'); return; }

    const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : false;

    if (isOnline) {
        Swal.fire({
            title: 'Memproses Excel...',
            text: 'Menyiapkan data dari Spreadsheet...',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        apiCall('generateLaporanExcel', { jenis: j, tglAwal: s, tglAkhir: e }).then(r => {
            Swal.close();
            if (r && r.success && r.url) {
                window.open(r.url, '_blank');
            } else {
                exportExcelOnlineClient(j, s, e);
            }
        }).catch(() => {
            Swal.close();
            exportExcelOnlineClient(j, s, e);
        });
    } else {
        downloadExcelOffline(j, s, e);
    }
}

function exportExcelOnlineClient(j, s, e) {
    Swal.fire({
        title: 'Mengekspor CSV/Excel...',
        text: 'Mengambil data dari Spreadsheet...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    apiCall('ambilData', { jenis: j }).then(res => {
        Swal.close();
        if (Array.isArray(res) && res.length > 0) {
            generateAndDownloadCSV(j, res, s, e);
        } else {
            downloadExcelOffline(j, s, e);
        }
    }).catch(err => {
        Swal.close();
        console.warn('[SiDiMAS] Gagal ambil data online untuk CSV, beralih ke database lokal:', err);
        downloadExcelOffline(j, s, e);
    });
}

function downloadExcelOffline(j, tglAwal, tglAkhir) {
    const tableDB = (j === 'masuk') ? localDB.suratMasuk : localDB.suratKeluar;
    tableDB.toArray().then(rows => {
        generateAndDownloadCSV(j, rows, tglAwal, tglAkhir);
    });
}

function generateAndDownloadCSV(j, rows, tglAwal, tglAkhir) {
    const filtered = rows.filter(r => {
        const tgl = Array.isArray(r) ? r[1] : ((j === 'masuk') ? r.tglTerima : r.tglSurat);
        return tgl && tgl >= tglAwal && tgl <= tglAkhir;
    });

    if (filtered.length === 0) {
        Swal.fire('Info', 'Tidak ada data pada rentang tanggal tersebut.', 'info');
        return;
    }

    const settings = JSON.parse(localStorage.getItem('sidimas_settings') || '{}');
    const judulSekolah = settings.nama_sekolah || 'SiDiMAS';
    const jenisTeks = j === 'masuk' ? 'Surat Masuk' : 'Surat Keluar';

    let csvRows = [];
    csvRows.push([`Laporan ${jenisTeks} - ${judulSekolah}`]);
    csvRows.push([`Periode: ${tglAwal} s/d ${tglAkhir}`]);
    csvRows.push([`Total Data: ${filtered.length}`]);
    csvRows.push([]);

    if (j === 'masuk') {
        csvRows.push(['No', 'Tgl Terima', 'Pengirim', 'Tgl Surat', 'No Surat', 'Perihal', 'Ditujukan', 'Uraian', 'Keterangan']);
        filtered.forEach((r, i) => {
            if (Array.isArray(r)) {
                csvRows.push([i + 1, r[1] || '', r[2] || '', r[3] || '', r[4] || '', r[5] || '', r[6] || '', r[7] || '', r[8] || '']);
            } else {
                csvRows.push([i + 1, r.tglTerima || '', r.pengirim || '', r.tglSurat || '', r.noSurat || '', r.perihal || '', r.ditujukan || '', r.uraian || '', r.keterangan || '']);
            }
        });
    } else {
        csvRows.push(['No', 'Tgl Surat', 'Klasifikasi', 'No Surat', 'Perihal', 'Tujuan', 'Uraian', 'Keterangan']);
        filtered.forEach((r, i) => {
            if (Array.isArray(r)) {
                csvRows.push([i + 1, r[1] || '', r[2] || '', r[3] || '', r[4] || '', r[5] || '', r[6] || '', r[7] || '']);
            } else {
                csvRows.push([i + 1, r.tglSurat || '', r.klasifikasi || '', r.noSurat || '', r.perihal || '', r.tujuan || '', r.uraian || '', r.keterangan || '']);
            }
        });
    }

    const csvContent = csvRows.map(row =>
        row.map(cell => {
            const str = String(cell).replace(/"/g, '""');
            return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
        }).join(',')
    ).join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_${jenisTeks.replace(' ', '_')}_${tglAwal}_${tglAkhir}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Swal.fire('Berhasil', 'File CSV/Excel telah diunduh. Buka dengan Microsoft Excel untuk melihat data.', 'success');
}

function modalInput(j, mode) {
    $('#fSurat')[0].reset(); $('#fSurat').removeClass('was-validated'); $('#mJenis').val(j); $('#mMode').val(mode); $('#divMasuk,#divKeluar').addClass('hide'); $('#btnSimpan').show(); setBtnLoading('#btnSimpan', false, 'SIMPAN DATA');
    try { $('#inJenisK').trigger('change'); } catch (e) { }
    $('#btnViewAttachedMasuk, #btnViewAttachedKeluar').addClass('hide').html('');
    $('input,textarea,select').prop('disabled', false); $('#divMasuk').find('input,textarea,select').prop('disabled', true); $('#divKeluar').find('input,textarea,select').prop('disabled', true);
    if (mode === 'view') { $('#judulModal').text('Detail Data'); $('#btnSimpan').hide(); $('.modal-body').find('input,textarea,select').prop('disabled', true); } else { $('#judulModal').text(mode === 'add' ? 'Input Baru' : 'Edit Data'); }
    if (j === 'masuk') { $('#divMasuk').removeClass('hide'); if (mode !== 'view') { $('#divMasuk').find('input,textarea,select').prop('disabled', false); $('.req-in').prop('required', true); } } else { $('#divKeluar').removeClass('hide'); if (mode !== 'view') { $('#divKeluar').find('input,textarea,select').prop('disabled', false); $('.req-out').prop('required', true); } }
    new bootstrap.Modal('#modalSurat').show();
}
function getDataByIndex(jenis, index) { return (jenis === 'masuk') ? dbMasuk[index] : dbKeluar[index]; }
function viewSurat(jenis, index) { const row = getDataByIndex(jenis, index); modalInput(jenis, 'view'); fillForm(jenis, row); }
function editSurat(jenis, index) { const row = getDataByIndex(jenis, index); modalInput(jenis, 'edit'); $('#mId').val(row[0]); fillForm(jenis, row); }

function fillForm(jenis, row) {
    if (jenis === 'masuk') {
        $('#inTglTerima').val(row[1]);
        $('#inPengirim').val(row[2]);
        $('#inTglSuratM').val(row[3]);
        $('#inNoSuratM').val(row[4]);
        $('#inPerihalM').val(row[5]);
        $('#inTujuanM').val(row[6]);
        $('#inUraianM').val(row[7]);
        $('#inKetM').val(row[8]);
        $('#mFileLama').val(row[9]);

        const fUrl = row[9];
        if (fUrl && fUrl.length > 5 && fUrl !== '-') {
            $('#btnViewAttachedMasuk').html(`
                <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 shadow-sm mt-1" onclick="previewFromModalSurat('masuk')">
                    <i class="fas fa-eye"></i> <span>Lihat Berkas Terlampir (Preview)</span>
                </button>
            `).removeClass('hide');
        } else {
            $('#btnViewAttachedMasuk').addClass('hide').html('');
        }
    } else {
        $('#inTglSuratK').val(row[1]);
        $('#inJenisK').val(row[2]).trigger('change');
        $('#inNoSuratK').val(row[3]);
        $('#inPerihalK').val(row[4]);
        $('#inTujuanK').val(row[5]);
        $('#inUraianK').val(row[6]);
        $('#inKetK').val(row[7]);
        $('#mFileLama').val(row[8]);

        const fUrl = row[8];
        if (fUrl && fUrl.length > 5 && fUrl !== '-') {
            $('#btnViewAttachedKeluar').html(`
                <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 shadow-sm mt-1" onclick="previewFromModalSurat('keluar')">
                    <i class="fas fa-eye"></i> <span>Lihat Berkas Terlampir (Preview)</span>
                </button>
            `).removeClass('hide');
        } else {
            $('#btnViewAttachedKeluar').addClass('hide').html('');
        }
    }
}

function previewFromModalSurat(jenis) {
    const fUrl = $('#mFileLama').val();
    if (!fUrl || fUrl === '-' || fUrl.length < 5) {
        Swal.fire('Info', 'Tidak ada berkas yang terlampir.', 'info');
        return;
    }
    const noSurat = (jenis === 'masuk') ? ($('#inNoSuratM').val() || 'Surat Masuk') : ($('#inNoSuratK').val() || 'Surat Keluar');
    const perihal = (jenis === 'masuk') ? $('#inPerihalM').val() : $('#inPerihalK').val();

    let title = `${noSurat}` + (perihal ? ` - ${perihal}` : '');
    let typeBadge = 'BERKAS';
    if (fUrl.startsWith('data:application/pdf') || /\.pdf($|\?)/i.test(fUrl)) typeBadge = 'PDF';
    else if (fUrl.startsWith('data:image/') || /\.(jpe?g|png|gif|webp)($|\?)/i.test(fUrl)) typeBadge = 'GAMBAR';
    else if (fUrl.includes('word') || /\.docx?($|\?)/i.test(fUrl)) typeBadge = 'DOCX';
    else if (fUrl.includes('sheet') || /\.xlsx?($|\?)/i.test(fUrl)) typeBadge = 'EXCEL';

    openFilePreviewModal({
        title: title,
        typeBadge: typeBadge,
        dataUrl: fUrl,
        filename: `Berkas_${jenis}_${noSurat.replace(/[^a-zA-Z0-9_\-]/g, '_')}`
    });
}
function delSurat(jenis, index) {
    const row = getDataByIndex(jenis, index);
    const id = row[0];
    const u = localStorage.getItem('sidimas_user');
    const r = localStorage.getItem('sidimas_role');

    Swal.fire({
        title: 'Hapus Surat?',
        text: "Data surat ini akan dihapus.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus'
    }).then(async (res) => {
        if (res.isConfirmed) {
            Swal.showLoading();

            const tableDB = (jenis === 'masuk') ? localDB.suratMasuk : localDB.suratKeluar;
            const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : false;

            if (isOnline) {
                try {
                    const apiRes = await apiCall('deleteSurat', { id: id, jenis: jenis, user: u, role: r });
                    if (!apiRes || !apiRes.success) {
                        Swal.fire('Gagal Hapus', apiRes ? apiRes.message : 'Gagal menghubungi server.', 'error');
                        return;
                    }
                    Swal.fire('Terhapus', 'Data surat berhasil dihapus dari Spreadsheet.', 'success');
                } catch (err) {
                    Swal.fire('Error Koneksi', 'Gagal menghapus di Spreadsheet. Pastikan internet lancar.', 'error');
                    return;
                }
            } else {
                if (!isElectron) {
                    Swal.fire('Tidak Ada Koneksi', 'Penghapusan online memerlukan koneksi ke Spreadsheet. Gunakan desktop untuk bekerja offline.', 'warning');
                    return;
                }
                // Mode offline: Hapus di lokal dan antri sync
                await tableDB.delete(id);
                localDB.antrianSync.put({ action: 'deleteSurat', payload: { id: id, jenis: jenis, user: u, role: r }, status: 'pending' });
                Swal.fire('Terhapus Lokal', 'Data surat dihapus (akan disinkronkan saat online).', 'success');
            }

            refreshTable(jenis);
            refreshAllTables();
        }
    });
}


function submitSurat(e) {
    e.preventDefault();
    if (!document.getElementById('fSurat').checkValidity()) {
        e.stopPropagation(); document.getElementById('fSurat').classList.add('was-validated'); return;
    }

    const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : false;
    if (!isOnline && !isElectron) {
        Swal.fire('Tidak Ada Koneksi', 'Penyimpanan online memerlukan koneksi ke Spreadsheet. Gunakan desktop SiDiMAS untuk bekerja offline.', 'warning');
        return;
    }
    setBtnLoading('#btnSimpan', true, isOnline ? 'Menyimpan ke Spreadsheet...' : 'Menyimpan ke Database Lokal...');

    const j = $('#mJenis').val();
    processFile(j === 'masuk' ? 'fileMasuk' : 'fileKeluar').then(async f => {
        if (document.getElementById(j === 'masuk' ? 'fileMasuk' : 'fileKeluar').files.length > 0 && f === null) {
            setBtnLoading('#btnSimpan', false, 'SIMPAN DATA'); return;
        }
        const fd = new FormData(e.target);
        const dataObj = {};
        for (let [key, value] of fd.entries()) {
            if (dataObj[key] !== undefined) {
                if (!Array.isArray(dataObj[key])) dataObj[key] = [dataObj[key]];
                dataObj[key].push(value);
            } else {
                dataObj[key] = value;
            }
        }
        dataObj.currentUser = localStorage.getItem('sidimas_user');
        dataObj.currentRole = localStorage.getItem('sidimas_role');

        const ts = new Date().toISOString();
        const idBaru = ($('#mMode').val() === 'edit' && dataObj.idSurat) ? dataObj.idSurat : ((isOnline ? 'ONLINE_' : 'LOCAL_') + new Date().getTime());

        let fUrl = dataObj.fileLama || "-";
        let fDataSimpan = null;
        if (f && f.data) {
            fUrl = "data:" + f.mimeType + ";base64," + f.data;
            fDataSimpan = f;
        }

        const record = {
            id: idBaru,
            waktuInput: ts,
            pembuat: dataObj.currentUser,
            sync_status: isOnline ? 'synced' : 'pending',
            fileUrl: fUrl,
            fileInfoRaw: isOnline ? null : fDataSimpan
        };

        const tableDB = (j === 'masuk') ? localDB.suratMasuk : localDB.suratKeluar;

        if (j === 'masuk') {
            record.tglTerima = dataObj.tglTerima; record.pengirim = dataObj.pengirim;
            record.tglSurat = dataObj.tglSurat; record.noSurat = dataObj.noSurat;
            record.perihal = dataObj.perihal; record.ditujukan = dataObj.ditujukan;
            record.uraian = dataObj.uraian; record.keterangan = dataObj.keterangan;
        } else {
            record.tglSurat = dataObj.tglSurat; record.klasifikasi = dataObj.jenisSurat;
            record.noSurat = dataObj.noSurat; record.perihal = dataObj.perihal;
            record.tujuan = dataObj.tujuan; record.uraian = dataObj.uraian; record.keterangan = dataObj.keterangan;
        }

        let dataSimpanPayload = {
            jenisForm: j,
            mode: ($('#mMode').val() === 'edit' && dataObj.idSurat) ? 'edit' : 'add',
            idSurat: idBaru,
            currentUser: dataObj.currentUser,
            currentRole: dataObj.currentRole,
            fileLama: dataObj.fileLama || "-"
        };
        if (j === 'masuk') {
            dataSimpanPayload.tglTerima = dataObj.tglTerima;
            dataSimpanPayload.pengirim = dataObj.pengirim;
            dataSimpanPayload.tglSurat = dataObj.tglSurat;
            dataSimpanPayload.noSurat = dataObj.noSurat;
            dataSimpanPayload.perihal = dataObj.perihal;
            dataSimpanPayload.ditujukan = dataObj.ditujukan;
            dataSimpanPayload.uraian = dataObj.uraian;
            dataSimpanPayload.keterangan = dataObj.keterangan;
        } else {
            dataSimpanPayload.tglSuratKeluar = dataObj.tglSurat;
            dataSimpanPayload.kodeKlasifikasi = dataObj.jenisSurat;
            dataSimpanPayload.noSuratKeluar = dataObj.noSurat;
            dataSimpanPayload.perihalKeluar = dataObj.perihal;
            dataSimpanPayload.tujuan = dataObj.tujuan;
            dataSimpanPayload.uraianKeluar = dataObj.uraian;
            dataSimpanPayload.keteranganKeluar = dataObj.keterangan;
        }

        let onlineSaveError = '';
        if (isOnline) {
            try {
                const res = await apiCall('simpanData', { data: dataSimpanPayload, fileInfo: fDataSimpan });
                if (res && res.success) {
                    setBtnLoading('#btnSimpan', false, 'SIMPAN DATA');
                    Swal.fire('Berhasil Disimpan', 'Data berhasil disimpan ke Google Spreadsheet.', 'success');
                    bootstrap.Modal.getInstance('#modalSurat').hide();
                    refreshTable(j); refreshAllTables();
                    return;
                } else {
                    onlineSaveError = res && res.message || 'Respons server tidak mengonfirmasi penyimpanan.';
                }
            } catch (err) {
                onlineSaveError = err.message || String(err);
                console.error('[SiDiMAS] Simpan langsung ke Spreadsheet gagal:', err);
            }
        }

        if (isOnline && onlineSaveError) {
            setBtnLoading('#btnSimpan', false, 'SIMPAN DATA');
            Swal.fire('Gagal Menyimpan ke Spreadsheet', onlineSaveError, 'error');
            return;
        }

        // Desktop offline: persist the record and queue it for later cloud sync.
        record.sync_status = 'pending';
        record.fileInfoRaw = fDataSimpan;
        tableDB.put(record).then(() => {
            localDB.antrianSync.put({ action: 'simpanData', payload: { data: dataSimpanPayload, fileInfo: fDataSimpan }, status: 'pending' });
            setBtnLoading('#btnSimpan', false, 'SIMPAN DATA');
            Swal.fire(onlineSaveError ? 'Tersimpan Lokal' : 'Tersimpan di Database Lokal', onlineSaveError
                ? 'Koneksi cloud gagal. Data tetap tersimpan lokal dan akan dicoba lagi otomatis.'
                : 'Mode Offline: Data tersimpan lokal dan akan diunggah saat koneksi tersedia.', onlineSaveError ? 'warning' : 'success');
            bootstrap.Modal.getInstance('#modalSurat').hide();
            refreshTable(j); refreshAllTables();
        }).catch(err => {
            setBtnLoading('#btnSimpan', false, 'SIMPAN DATA');
            Swal.fire('Error Database Lokal', err.toString(), 'error');
        });
    });
}

$(function () {
    // Inisialisasi event modal preview dikelola langsung di openFilePreviewModal (SibukInstal style)
    // Reset iframe saat modal ditutup
    document.getElementById('mdlPdfPreview') && document.getElementById('mdlPdfPreview').addEventListener('hidden.bs.modal', function () {
        $('#pdfPreviewFrame').attr('src', '');
        if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
        $('#docxPreviewContainer').empty();
        $('#btnArchiveGenerated').addClass('d-none').prop('disabled', false)
            .removeClass('btn-outline-success').addClass('btn-success')
            .html('<i class="fas fa-folder-plus me-1"></i> Masukkan ke Surat Keluar');
        currentPreviewBlob = null;
        currentPreviewArchiveData = null;
        currentPreviewType = '';
        currentPreviewFilename = 'dokumen';
        currentPreviewUrl = '';
    });
});



