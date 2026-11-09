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
    const userRole = (localStorage.getItem('sidimas_role') || 'admin').toLowerCase();
    if (userRole === 'kepsek' && (p === 'buat' || p === 'referensi' || p === 'setting')) {
        p = 'home';
    }

    // Jika staf/admin akses kendali, arahkan ke page buat tab kendali
    if (p === 'kendali' && userRole !== 'kepsek') {
        p = 'buat';
        setTimeout(() => {
            const triggerEl = document.querySelector('#tab-kendali-btn');
            if (triggerEl) {
                bootstrap.Tab.getOrCreateInstance(triggerEl).show();
            }
            if (typeof loadKendaliSuratTable === 'function') loadKendaliSuratTable('staf');
        }, 80);
    }

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
    if (p === 'home') {
        loadInitData();
        setTimeout(() => { loadDashboardStats(); }, 20);
    }
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

    if (p === 'kendali') {
        if (typeof loadKendaliSuratTable === 'function') loadKendaliSuratTable('kepsek');
    }

    if (p === 'profil-kepsek') {
        if (typeof loadProfilKepsekPage === 'function') loadProfilKepsekPage();
    }

    if (p === 'referensi') {
        if (typeof loadDataReferensi === 'function') loadDataReferensi();
        if (typeof loadKodeCustomTable === 'function') loadKodeCustomTable();
    }

    // FIX: Reset tab Bootstrap di halaman Pengaturan agar tidak perlu klik 2x
    if (p === 'setting') {
        loadUserInfoPage();
        if (typeof loadKodeCustomTable === 'function') loadKodeCustomTable();
        if (typeof loadSOPHukumTab === 'function') loadSOPHukumTab();
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
            <td><span class="badge bg-info px-3 py-2 text-dark">Staff</span></td>
            <td class="text-muted small">Akun staf (terbatas). Dikonfigurasi oleh penyedia.</td>
            <td class="online-only" style="display:none;">-</td>
        </tr>
        `;
    }

    if (cred.kepsek_u) {
        h += `
        <tr>
            <td class="text-center">3</td>
            <td><span class="badge bg-dark fs-6 px-3 py-2 font-monospace">${cred.kepsek_u}</span></td>
            <td>
                <div class="input-group input-group-sm" style="width: 200px;">
                    <input type="password" class="form-control font-monospace" value="${cred.kepsek_p}" readonly style="background-color: var(--bs-secondary); color: white; border: none; font-size: 1rem;">
                    <button class="btn btn-secondary border-0" type="button" onclick="togglePassword(this)"><i class="fas fa-eye"></i></button>
                </div>
            </td>
            <td><span class="badge bg-warning px-3 py-2 text-dark">Kepsek</span></td>
            <td class="text-muted small">Akun Kepala Sekolah (Verifikasi Kendali Surat & Disposisi Surat Masuk). Read-only offline.</td>
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

const DAFTAR_JENIS_SURAT_KELUAR = [
    'Surat Dinas Umum',
    'Surat Keterangan Siswa',
    'Surat Perjalanan Dinas (SPD/SPPD)',
    'Surat Tugas (ST)',
    'Surat Keterangan',
    'Surat Keputusan (SK)',
    'Nota Dinas',
    'Surat Pengantar',
    'Surat Undangan',
    'Surat Izin',
    'Surat Pernyataan Melaksanakan Tugas (SPMT)',
    'Lampiran Surat',
    'Lainnya'
];

function normalizeJenisSurat(rawVal, perihal, noSurat) {
    let s = String(rawVal || '').trim();
    if (!s || s === '-' || s === 'null' || s === 'undefined') {
        s = '';
    }

    // 1. Bersihkan prefix nomor urut template dan ekstensi docx (misal: "1. Surat Dinas Umum.docx" -> "Surat Dinas Umum")
    s = s.replace(/^\d+[\.\-\)]\s*/, '').replace(/\.docx$/i, '').trim();

    // 2. Jika persis sama dengan salah satu daftar standar template
    for (const std of DAFTAR_JENIS_SURAT_KELUAR) {
        if (s.toLowerCase() === std.toLowerCase()) return std;
    }

    const sLower = s.toLowerCase();
    // 3. Pencocokan langsung dari teks nama
    if (sLower.includes('siswa')) return 'Surat Keterangan Siswa';
    if (sLower.includes('tugas') || sLower.includes('spt') || sLower === 'st') return 'Surat Tugas (ST)';
    if (sLower.includes('perjalanan') || sLower.includes('spd') || sLower.includes('sppd')) return 'Surat Perjalanan Dinas (SPD/SPPD)';
    if (sLower.includes('keputusan') || sLower === 'sk' || sLower.includes('(sk)')) return 'Surat Keputusan (SK)';
    if (sLower.includes('nota dinas') || sLower === 'nota') return 'Nota Dinas';
    if (sLower.includes('pengantar')) return 'Surat Pengantar';
    if (sLower.includes('undangan')) return 'Surat Undangan';
    if (sLower.includes('izin')) return 'Surat Izin';
    if (sLower.includes('melaksanakan tugas') || sLower.includes('spmt') || sLower.includes('skmt')) return 'Surat Pernyataan Melaksanakan Tugas (SPMT)';
    if (sLower.includes('lampiran')) return 'Lampiran Surat';
    if (sLower.includes('keterangan') || sLower.includes('suket')) return 'Surat Keterangan';
    if (sLower.includes('dinas') || sLower.includes('umum')) return 'Surat Dinas Umum';

    // 4. Jika nilai berupa kode angka klasifikasi (misal: "400.3.8", "421.1", "421.2", "421.1/123/...")
    // Cari konteks dari perihal dan noSurat jika tersedia
    const combined = `${s} ${perihal || ''} ${noSurat || ''}`.toLowerCase();
    if (combined.includes('siswa')) return 'Surat Keterangan Siswa';
    if (combined.includes('tugas') || combined.includes('spt') || /\bst\b/i.test(combined)) return 'Surat Tugas (ST)';
    if (combined.includes('jalan') || combined.includes('spd') || combined.includes('sppd')) return 'Surat Perjalanan Dinas (SPD/SPPD)';
    if (combined.includes('keputusan') || /\bsk\b/i.test(combined)) return 'Surat Keputusan (SK)';
    if (combined.includes('nota')) return 'Nota Dinas';
    if (combined.includes('pengantar')) return 'Surat Pengantar';
    if (combined.includes('undangan')) return 'Surat Undangan';
    if (combined.includes('izin')) return 'Surat Izin';
    if (combined.includes('spmt') || combined.includes('melaksanakan tugas')) return 'Surat Pernyataan Melaksanakan Tugas (SPMT)';
    if (combined.includes('lampiran')) return 'Lampiran Surat';
    if (combined.includes('keterangan') || combined.includes('ket')) return 'Surat Keterangan';

    // Jika nilai adalah angka / kode klasifikasi murni (berawalan angka seperti 421.1)
    if (/^\d+(\.\d+)*/.test(s)) {
        return 'Surat Dinas Umum';
    }

    return s || 'Surat Dinas Umum';
}

function refreshAllTables() { loadDashboardStats(); }

function parseSuratMonth(dateVal) {
    if (!dateVal) return null;
    if (dateVal instanceof Date && !isNaN(dateVal)) return dateVal.getMonth();
    const s = String(dateVal).trim();
    // Format YYYY-MM-DD atau YYYY/MM/DD
    let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) {
        const mon = parseInt(m[2], 10) - 1;
        if (mon >= 0 && mon <= 11) return mon;
    }
    // Format DD-MM-YYYY atau DD/MM/YYYY
    m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (m) {
        const mon = parseInt(m[2], 10) - 1;
        if (mon >= 0 && mon <= 11) return mon;
    }
    const d = new Date(s);
    if (!isNaN(d)) return d.getMonth();
    return null;
}

async function loadDashboardStats() {
    try {
        // TAHAP 1: SEGERA HITUNG & TAMPILKAN DARI LOCAL DATABASE (0 MILIDETIK)
        // Menjamin chart langsung muncul secepat kilat baik saat pertama buka, reload, maupun offline!
        let localData = null;
        try {
            const masuk = (await localDB.suratMasuk.toArray()) || [];
            const keluar = (await localDB.suratKeluar.toArray()) || [];

            localData = {
                totalMasuk: masuk.length,
                totalKeluar: keluar.length,
                bulanMasuk: Array(12).fill(0),
                bulanKeluar: Array(12).fill(0),
                jenisKeluar: {}
            };

            masuk.forEach(m => {
                const mon = parseSuratMonth(m.tglSurat || m.tglTerima);
                if (mon !== null) localData.bulanMasuk[mon]++;
            });

            keluar.forEach(k => {
                const mon = parseSuratMonth(k.tglSurat);
                if (mon !== null) localData.bulanKeluar[mon]++;
                const rawJenis = k.klasifikasi || k.jenisSurat || '';
                const cleanJenis = normalizeJenisSurat(rawJenis, k.perihal, k.noSurat);
                localData.jenisKeluar[cleanJenis] = (localData.jenisKeluar[cleanJenis] || 0) + 1;
            });

            $('#statMasuk').text(localData.totalMasuk);
            $('#statKeluar').text(localData.totalKeluar);
            renderCharts(localData);
        } catch (localErr) {
            console.warn('[SiDiMAS] Error hitung dashboard lokal:', localErr);
        }

        // TAHAP 2: HANYA JIKA MODE ONLINE BROWSER (BUKAN DESKTOP OFFLINE)
        // Tarik data terbaru dari Google Apps Script di background tanpa memblokir tampilan
        const isOnline = (typeof isAppOnline === 'function') ? isAppOnline() : false;
        if (isOnline && API_URL && navigator.onLine) {
            apiCall('getDashboardData').then(d => {
                if (d && typeof d.totalMasuk !== 'undefined') {
                    if (d.jenisKeluar) {
                        const cleanJenisOnline = {};
                        for (const [rawK, count] of Object.entries(d.jenisKeluar)) {
                            const cleanK = normalizeJenisSurat(rawK);
                            cleanJenisOnline[cleanK] = (cleanJenisOnline[cleanK] || 0) + (Number(count) || 0);
                        }
                        d.jenisKeluar = cleanJenisOnline;
                    }
                    $('#statMasuk').text(d.totalMasuk);
                    $('#statKeluar').text(d.totalKeluar);
                    renderCharts(d);
                }
            }).catch(cloudErr => {
                console.warn('[SiDiMAS] Background refresh online dashboard dilewati:', cloudErr.message);
            });
        }
    } catch (e) {
        console.error("Gagal memuat statistik:", e);
    }
}

let chartBln = null;
let chartJns = null;

function renderCharts(data) {
    if (!data) return;
    const canvasBln = document.getElementById('chartBulanan');
    const canvasJns = document.getElementById('chartJenis');
    if (!canvasBln || !canvasJns) return;

    if (typeof Chart === 'undefined') {
        console.warn('[SiDiMAS] Library Chart belum siap.');
        return;
    }

    try {
        const oldBln = Chart.getChart(canvasBln);
        if (oldBln) oldBln.destroy();
    } catch (e) {}
    if (chartBln) { try { chartBln.destroy(); } catch (e) {} chartBln = null; }

    try {
        const oldJns = Chart.getChart(canvasJns);
        if (oldJns) oldJns.destroy();
    } catch (e) {}
    if (chartJns) { try { chartJns.destroy(); } catch (e) {} chartJns = null; }

    chartBln = new Chart(canvasBln, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
            datasets: [
                { label: 'Surat Masuk', data: data.bulanMasuk || Array(12).fill(0), backgroundColor: '#0d6efd', borderRadius: 4 },
                { label: 'Surat Keluar', data: data.bulanKeluar || Array(12).fill(0), backgroundColor: '#198754', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    title: { display: true, text: 'Jumlah Surat' }
                }
            }
        }
    });

    const jenisLabels = [];
    const jenisVals = [];
    const pieColors = [
        '#0d6efd', '#198754', '#ffc107', '#0dcaf0', '#6f42c1',
        '#d63384', '#fd7e14', '#20c997', '#495057', '#059669',
        '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'
    ];
    if (data.jenisKeluar) {
        const sortedEntries = Object.entries(data.jenisKeluar).sort((a, b) => b[1] - a[1]);
        for (const [key, value] of sortedEntries) {
            jenisLabels.push(key);
            jenisVals.push(value);
        }
    }

    chartJns = new Chart(canvasJns, {
        type: 'pie',
        data: {
            labels: jenisLabels.length > 0 ? jenisLabels : ['Belum Ada Data'],
            datasets: [{
                data: jenisVals.length > 0 ? jenisVals : [0],
                backgroundColor: jenisLabels.length > 0 ? pieColors.slice(0, jenisLabels.length) : ['#e2e8f0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        font: { size: 10 }
                    }
                }
            }
        }
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
                    const cleanJenis = normalizeJenisSurat(r[2], cleanP, r[3]);
                    d.push([r[0], r[1], cleanJenis, r[3], cleanP, cleanT, r[6], r[7], r[8], r[9], r[10], r[11] || 'synced']);
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
                    const cleanJenis = normalizeJenisSurat(r.klasifikasi || r.jenisSurat, cleanP, r.noSurat);
                    d.push([r.id, r.tglSurat, cleanJenis, r.noSurat, cleanP, cleanT, r.uraian, r.keterangan, r.fileUrl, r.waktuInput, r.pembuat, r.sync_status]);
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
            { 
                title: "Jenis Surat", 
                render: (d, t, row) => {
                    const cleanJ = normalizeJenisSurat(d, row ? row[4] : '', row ? row[3] : '');
                    return `<span class="badge bg-light text-dark border"><i class="fas fa-file-alt me-1 text-success"></i>${escapeInboxValue(cleanJ)}</span>`;
                }
            },
            { title: "No Surat" },
            { title: "Perihal" },
            { title: "Tujuan" },
            { title: "Uraian", visible: false },
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
                const api = this.api();
                setTimeout(() => { api.columns.adjust(); }, 10);
                setTimeout(() => { api.columns.adjust(); }, 150);
            }
        });
    };

    // TAHAP 1: Segera tampilkan dari cache database lokal (0 milidetik - Tampil Instan)
    tableDB.toArray().then(cachedRows => {
        const hasCached = Array.isArray(cachedRows) && cachedRows.length > 0;
        if (hasCached) {
            renderDataTable(cachedRows);
        } else if (!isOnline) {
            renderDataTable([]);
        } else {
            $(tid).html('<tbody><tr><td colspan="12" class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2 text-muted">Memuat data dari Google Spreadsheet...</div></td></tr></tbody>');
        }

        // TAHAP 2: Jika mode online, tarik data terbaru dari Google Spreadsheet di latar belakang
        if (isOnline) {
            apiCall('ambilData', { jenis: j }).then(res => {
                if (Array.isArray(res)) {
                    renderDataTable(res);
                } else if (!hasCached) {
                    $(tid).html('<tbody><tr><td colspan="12" class="text-center text-danger p-4">Respons Spreadsheet tidak valid.</td></tr></tbody>');
                }
            }).catch(err => {
                console.warn('[SiDiMAS] Background refresh surat ' + j + ' dilewati:', err);
                if (!hasCached) {
                    $(tid).html('<tbody><tr><td colspan="12" class="text-center text-danger p-4">Gagal memuat data dari Spreadsheet. Periksa koneksi lalu muat ulang.</td></tr></tbody>');
                }
            });
        }
    }).catch(errLocal => {
        console.warn('[SiDiMAS] Gagal membaca cache surat lokal:', errLocal);
        if (isOnline) {
            $(tid).html('<tbody><tr><td colspan="12" class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2 text-muted">Memuat data dari Google Spreadsheet...</div></td></tr></tbody>');
            apiCall('ambilData', { jenis: j }).then(res => {
                if (Array.isArray(res)) renderDataTable(res);
            });
        }
    });
}

function renderAksi(index, jenis) {
    const row = getDataByIndex(jenis, index);
    const currentUser = localStorage.getItem('sidimas_user');
    const currentRole = (localStorage.getItem('sidimas_role') || 'admin').toLowerCase();
    const isKepsek = (currentRole === 'kepsek');
    const isAdmin = (currentRole === 'admin');
    const creator = row[row.length - 2];

    // Khusus Role Kepala Sekolah: Read-Only (Hanya tombol Lihat & Unduh Berkas)
    if (isKepsek) {
        return `<div class="btn-group" role="group">
            <button class="btn btn-sm btn-info text-white" onclick="viewSurat('${jenis}', ${index})" title="Lihat & Unduh Berkas"><i class="fas fa-eye"></i></button>
        </div>`;
    }

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
    if (currentPreviewType === 'GAMBAR') {
        const imgSrc = currentBlobUrl || currentPreviewUrl;
        if (imgSrc) {
            printImage(imgSrc);
            return;
        }
    }
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
        klasifikasi: normalizeJenisSurat(templateName || dataObj.pilihJenisSurat || dataObj.jenisSurat || 'Surat Dinas Umum', perihal, dataObj.nomorFull),
        noSurat: dataObj.nomorFull || $('#previewNomor').text() || '-',
        perihal: String(perihal),
        tujuan: (dataObj.modeSuket === 'standar') ? 'Umum / Yang Berkepentingan' : (dataObj.tujuanNama || dataObj.tujuanJabatan || dataObj.tujuanTempat || dataObj.namaPihakKedua || 'Kepada Yth.'),
        uraian: dataObj.isiUmum || dataObj.suketIsi || dataObj.acaraDetail || 'Otomatis digenerate dari form Buat Surat',
        keterangan: dataObj.kodeKlasifikasi ? `Kode: ${dataObj.kodeKlasifikasi}` : (dataObj.pilihJenisSurat || 'Hasil generate DOCX')
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
    if (!Array.isArray(rows)) return 0;
    const role = (localStorage.getItem('sidimas_role') || 'admin').toLowerCase();
    let waitingCount = 0;

    if (role === 'kepsek') {
        // Untuk Kepala Sekolah: hitung surat yang berstatus menunggu disposisi kepsek
        waitingCount = rows.filter(row => {
            const status = String(row.status || '').trim().toLowerCase();
            return status.includes('kepsek') || status.includes('perlu disposisi') || status === 'menunggu disposisi';
        }).length;
    } else {
        // Untuk Admin / Staf: hitung surat masuk baru atau belum diverifikasi
        waitingCount = rows.filter(row => {
            const status = String(row.status || 'Menunggu Verifikasi').trim().toLowerCase();
            return !status || ['menunggu verifikasi', 'baru', 'pending', 'belum dibaca'].includes(status);
        }).length;
    }

    document.querySelectorAll('#badgeInboxSidebar, #badgeInboxMobile').forEach(badge => {
        badge.textContent = waitingCount > 99 ? '99+' : String(waitingCount);
        badge.style.display = waitingCount ? 'inline-block' : 'none';
        badge.className = 'badge bg-danger rounded-circle text-white ms-2';
    });
    return waitingCount;
}

async function fetchExternalInboxRows() {
    let rows = [];
    if (typeof isAppOnline === 'function' && isAppOnline()) {
        try {
            const response = await apiCall('getSuratEksternal');
            if (response && response.success === true && Array.isArray(response.data)) {
                rows = response.data;
            }
        } catch (e) {
            console.warn('[SiDiMAS] Gagal mengambil Surat Masuk dari Spreadsheet:', e);
        }
    }

    if (isElectron) {
        try {
            const localRows = await localDB.suratEksternal.toArray();
            const localMap = new Map(localRows.map(r => [String(r.id), r]));
            if (rows.length > 0) {
                // Merge data spreadsheet dengan file lokal yang sudah tersimpan di SQLite
                return rows.map(r => {
                    const local = localMap.get(String(r.id));
                    return {
                        ...r,
                        fileInfoRaw: (local && local.fileInfoRaw && local.fileInfoRaw.data) ? local.fileInfoRaw : (r.fileInfoRaw || null)
                    };
                });
            } else {
                return localRows;
            }
        } catch (dbErr) {
            console.warn('[SiDiMAS] Gagal membaca SQLite suratEksternal:', dbErr);
        }
    }
    return rows;
}

async function refreshInboxBadge(rows) {
    try {
        if (Array.isArray(rows) && rows.length > 0) {
            externalInboxRows = rows;
            updateInboxBadge(externalInboxRows);
            return externalInboxRows;
        }

        // TAHAP 1: Segera baca dari database lokal (0 milidetik)
        try {
            if (typeof localDB !== 'undefined' && localDB.suratEksternal) {
                const cachedRows = await localDB.suratEksternal.toArray();
                if (Array.isArray(cachedRows) && cachedRows.length > 0) {
                    externalInboxRows = cachedRows;
                    updateInboxBadge(cachedRows);
                }
            }
        } catch (eCached) {}

        // TAHAP 2: Jika online, ambil data terbaru di background
        externalInboxRows = await fetchExternalInboxRows();
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

        const role = (localStorage.getItem('sidimas_role') || 'admin').toLowerCase();
        const isKepsek = (role === 'kepsek');
        const isAdmin = (role === 'admin');

        body.innerHTML = orderedRows.map((row, index) => {
            const status = row.status || 'Menunggu Verifikasi';
            const normalizedStatus = String(status).toLowerCase();
            const timestamp = row.waktuInput ? new Date(row.waktuInput).toLocaleString('id-ID') : '-';

            // Menentukan badge status
            let badgeHtml = '';
            if (normalizedStatus.includes('kepsek') || normalizedStatus.includes('perlu disposisi')) {
                badgeHtml = `<span class="badge bg-danger text-white"><i class="fas fa-exclamation-circle me-1"></i>${isKepsek ? 'Perlu Disposisi' : 'Menunggu Kepsek'}</span>`;
            } else if (normalizedStatus.includes('didisposisi')) {
                badgeHtml = `<span class="badge bg-success text-white"><i class="fas fa-check-circle me-1"></i>Sudah Didisposisi</span>`;
            } else if (normalizedStatus === 'diterima') {
                badgeHtml = `<span class="badge bg-success text-white"><i class="fas fa-check me-1"></i>Diterima</span>`;
            } else if (normalizedStatus === 'ditolak') {
                badgeHtml = `<span class="badge bg-danger text-white"><i class="fas fa-times me-1"></i>Ditolak</span>`;
            } else {
                badgeHtml = `<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Menunggu Verifikasi</span>`;
            }

            if (row.isDiagendakan) {
                badgeHtml += `<br><span class="badge bg-info text-dark mt-1"><i class="fas fa-calendar-check me-1"></i>Masuk Agenda</span>`;
            }

            // Tombol Aksi Kolom
            let aksiBtns = `<div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-outline-primary btn-detail-inbox" data-inbox-id="${escapeInboxValue(row.id)}" title="Detail Surat"><i class="fas fa-eye"></i></button>`;

            if (isKepsek) {
                if (!row.disposisi) {
                    aksiBtns += `<button type="button" class="btn btn-danger text-white btn-disposisi-inbox fw-bold" data-inbox-id="${escapeInboxValue(row.id)}" title="Buka Hierarki & Isi Lembar Disposisi"><i class="fas fa-file-signature me-1"></i>Disposisi <span class="badge bg-white text-danger ms-1">!</span></button>`;
                } else {
                    aksiBtns += `<button type="button" class="btn btn-outline-danger btn-disposisi-inbox fw-bold" data-inbox-id="${escapeInboxValue(row.id)}" title="Lihat Riwayat & Disposisi"><i class="fas fa-file-signature me-1"></i>Disposisi</button>`;
                    aksiBtns += `<button type="button" class="btn btn-outline-secondary btn-cetak-disposisi-inbox" data-inbox-id="${escapeInboxValue(row.id)}" title="Cetak Lembar Disposisi"><i class="fas fa-print"></i></button>`;
                }
            } else {
                if (!row.disposisi) {
                    aksiBtns += `<button type="button" class="btn btn-warning text-dark btn-disposisi-inbox fw-bold" data-inbox-id="${escapeInboxValue(row.id)}" title="Buka Riwayat & Hierarki Disposisi"><i class="fas fa-file-signature me-1"></i>Disposisi</button>`;
                } else {
                    aksiBtns += `<button type="button" class="btn btn-success text-white btn-disposisi-inbox fw-bold" data-inbox-id="${escapeInboxValue(row.id)}" title="Lihat Riwayat Hierarki & Hasil Disposisi"><i class="fas fa-check-circle me-1"></i>Disposisi</button>`;
                    aksiBtns += `<button type="button" class="btn btn-outline-secondary btn-cetak-disposisi-inbox" data-inbox-id="${escapeInboxValue(row.id)}" title="Cetak Lembar Disposisi"><i class="fas fa-print"></i></button>`;
                    if (!row.isDiagendakan) {
                        aksiBtns += `<button type="button" class="btn btn-primary btn-agendakan-inbox fw-bold" data-inbox-id="${escapeInboxValue(row.id)}" title="1-Klik Catat ke Agenda Surat Masuk"><i class="fas fa-calendar-plus me-1"></i>Agendakan</button>`;
                    }
                }
            }
            aksiBtns += `</div>`;

            return `<tr>
                <td class="text-center align-middle">${index + 1}</td>
                <td class="align-middle">${escapeInboxValue(timestamp)}</td>
                <td class="align-middle">${escapeInboxValue(row.namaPengirim)}<br><small class="text-muted">${escapeInboxValue(row.lembagaPengirim)}</small></td>
                <td class="align-middle">${escapeInboxValue(row.noSurat)}<br><small class="text-muted">${escapeInboxValue(row.tglSurat)}</small></td>
                <td class="align-middle">${escapeInboxValue(row.halSurat)}</td>
                <td class="text-center align-middle">${badgeHtml}</td>
                <td class="text-center align-middle">${aksiBtns}</td>
            </tr>`;
        }).join('');

        body.querySelectorAll('.btn-detail-inbox').forEach(button => {
            button.addEventListener('click', () => showDetailSuratEksternal(button.dataset.inboxId));
        });
        body.querySelectorAll('.btn-disposisi-inbox').forEach(button => {
            button.addEventListener('click', () => bukaModalDisposisi(button.dataset.inboxId));
        });
        body.querySelectorAll('.btn-teruskan-inbox').forEach(button => {
            button.addEventListener('click', () => teruskanKeKepsek(button.dataset.inboxId));
        });
        body.querySelectorAll('.btn-cetak-disposisi-inbox').forEach(button => {
            button.addEventListener('click', () => cetakLembarDisposisi(button.dataset.inboxId));
        });
        body.querySelectorAll('.btn-agendakan-inbox').forEach(button => {
            button.addEventListener('click', () => agendakanSuratEksternal(button.dataset.inboxId));
        });
    } catch (error) {
        body.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-4">${escapeInboxValue(error.message || error)}</td></tr>`;
        console.error('[SiDiMAS] Gagal memuat inbox eksternal:', error);
    }
}

function showDetailSuratEksternal(id) {
    const record = externalInboxRows.find(row => String(row.id) === String(id));
    if (!record) return Swal.fire('Tidak Ditemukan', 'Data surat tidak ada di daftar saat ini. Muat ulang inbox.', 'warning');
    if (externalPreviewBlobUrl) {
        URL.revokeObjectURL(externalPreviewBlobUrl);
        externalPreviewBlobUrl = null;
    }
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

    // Tampilkan box disposisi jika sudah diisi
    if (record.disposisi) {
        const d = record.disposisi;
        $('#vExtDisposisiSifat').text(d.sifat || 'Biasa');
        let dispHtml = `<div><strong>Diteruskan Kepada:</strong> ${Array.isArray(d.penerima) ? d.penerima.join(', ') : (d.penerima || '-')}</div>`;
        if (Array.isArray(d.instruksi) && d.instruksi.length) {
            dispHtml += `<div><strong>Instruksi:</strong> ${d.instruksi.join(', ')}</div>`;
        }
        if (d.catatan) {
            dispHtml += `<div><strong>Catatan Khusus:</strong> <em>"${escapeInboxValue(d.catatan)}"</em></div>`;
        }
        dispHtml += `<div class="mt-1 text-muted small"><i class="fas fa-calendar-alt me-1"></i>${d.tglDisposisi || '-'} | Oleh: <strong>${escapeInboxValue(d.namaKepsek || 'Kepala Sekolah')}</strong></div>`;
        $('#vExtDisposisiContent').html(dispHtml);
        $('#vExtDisposisiBox').show();
        $('#btnCetakDisposisiModal').show().off('click').on('click', () => {
            bootstrap.Modal.getInstance(document.getElementById('modalDetailEksternal'))?.hide();
            cetakLembarDisposisi(record.id);
        });
    } else {
        $('#vExtDisposisiBox').hide();
        $('#btnCetakDisposisiModal').hide();
    }

    const fileUrl = (record.fileUrl && record.fileUrl !== '-') ? record.fileUrl : (record.fileInfoRaw && record.fileInfoRaw.data
        ? `data:${record.fileInfoRaw.mimeType || 'application/octet-stream'};base64,${record.fileInfoRaw.data}`
        : '');
    const fileContainer = document.getElementById('vExtFileContainer');
    fileContainer.replaceChildren();
    fileContainer.classList.add('d-flex', 'align-items-center', 'justify-content-center');
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
                    fileInfo = {
                        name: response.name || 'lampiran',
                        mimeType: response.mimeType || 'application/octet-stream',
                        data: response.data
                    };
                    try {
                        record.fileInfoRaw = fileInfo;
                        await localDB.suratEksternal.put(record);
                    } catch (e) { }
                }
                if (!fileInfo || !fileInfo.data) {
                    throw new Error('Isi lampiran tidak tersimpan di perangkat dan koneksi internet tidak tersedia.');
                }

                const blob = dataUriToBlob(`data:${fileInfo.mimeType || 'application/octet-stream'};base64,${fileInfo.data}`);
                if (!blob) throw new Error('Format lampiran tidak dapat dibaca.');
                if (externalPreviewBlobUrl) URL.revokeObjectURL(externalPreviewBlobUrl);
                externalPreviewBlobUrl = URL.createObjectURL(blob);
                const mimeType = fileInfo.mimeType || blob.type;
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-eye me-2"></i>Pratinjau Lampiran';
                const preview = document.createElement('div');
                preview.className = 'w-100 h-100 d-flex flex-column';
                preview.style.minHeight = '320px';
                preview.style.height = '70vh';

                const toolbar = document.createElement('div');
                toolbar.className = 'd-flex justify-content-between align-items-center bg-dark p-1 gap-2';
                const zoomControls = document.createElement('div');
                zoomControls.className = 'd-flex align-items-center gap-1';
                const zoomOut = document.createElement('button');
                zoomOut.type = 'button';
                zoomOut.className = 'btn btn-sm btn-outline-light';
                zoomOut.title = 'Perkecil lampiran';
                zoomOut.setAttribute('aria-label', 'Perkecil lampiran');
                zoomOut.innerHTML = '<i class="fas fa-search-minus"></i>';
                const zoomLabel = document.createElement('span');
                zoomLabel.className = 'text-white small px-1';
                const zoomIn = document.createElement('button');
                zoomIn.type = 'button';
                zoomIn.className = 'btn btn-sm btn-outline-light';
                zoomIn.title = 'Perbesar lampiran';
                zoomIn.setAttribute('aria-label', 'Perbesar lampiran');
                zoomIn.innerHTML = '<i class="fas fa-search-plus"></i>';
                const resetZoom = document.createElement('button');
                resetZoom.type = 'button';
                resetZoom.className = 'btn btn-sm btn-outline-light';
                resetZoom.textContent = '100%';
                resetZoom.title = 'Kembalikan ukuran normal';
                const closeButton = document.createElement('button');
                closeButton.type = 'button';
                closeButton.className = 'btn btn-sm btn-outline-light';
                closeButton.innerHTML = '<i class="fas fa-times me-1"></i>Tutup Pratinjau';
                zoomControls.append(zoomOut, zoomLabel, zoomIn, resetZoom);
                toolbar.append(zoomControls, closeButton);

                const viewer = document.createElement('div');
                viewer.className = 'flex-grow-1 w-100 bg-dark';
                viewer.style.minHeight = '0';
                viewer.style.overflow = 'auto';

                let zoom = 1;
                let zoomContent;
                const updateZoom = () => {
                    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
                    if (mimeType.startsWith('image/')) {
                        zoomContent.style.width = `${zoom * 100}%`;
                    } else {
                        zoomContent.style.width = '100%';
                        zoomContent.style.height = '100%';
                        zoomContent.style.transform = `scale(${zoom})`;
                    }
                };
                const changeZoom = (amount) => {
                    zoom = Math.min(3, Math.max(0.5, Math.round((zoom + amount) * 100) / 100));
                    updateZoom();
                };
                zoomOut.addEventListener('click', () => changeZoom(-0.2));
                zoomIn.addEventListener('click', () => changeZoom(0.2));
                resetZoom.addEventListener('click', () => {
                    zoom = 1;
                    updateZoom();
                });
                closeButton.addEventListener('click', () => {
                    if (externalPreviewBlobUrl) URL.revokeObjectURL(externalPreviewBlobUrl);
                    externalPreviewBlobUrl = null;
                    preview.remove();
                    button.hidden = false;
                    button.disabled = false;
                    fileContainer.classList.add('d-flex', 'align-items-center', 'justify-content-center');
                });
                preview.appendChild(toolbar);

                if (mimeType.startsWith('image/')) {
                    const image = document.createElement('img');
                    image.src = externalPreviewBlobUrl;
                    image.alt = `Lampiran surat ${record.noSurat || ''}`;
                    image.className = 'd-block mx-auto';
                    image.style.width = '100%';
                    image.style.height = 'auto';
                    image.style.objectFit = 'contain';
                    zoomContent = image;
                    viewer.appendChild(image);
                } else {
                    const frame = document.createElement('iframe');
                    frame.src = externalPreviewBlobUrl;
                    frame.title = `Lampiran surat ${record.noSurat || ''}`;
                    frame.className = 'bg-white border-0';
                    frame.style.flex = '0 0 auto';
                    frame.style.transformOrigin = 'top left';
                    zoomContent = frame;
                    viewer.appendChild(frame);
                }
                updateZoom();
                preview.appendChild(viewer);

                fileContainer.classList.remove('d-flex', 'align-items-center', 'justify-content-center');
                button.hidden = true;
                fileContainer.appendChild(preview);
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

    const currentRole = (localStorage.getItem('sidimas_role') || 'admin').toLowerCase();
    const isAdmin = (currentRole === 'admin');

    $('#btnTerimaEksternal, #btnTolakEksternal').toggle(isAdmin);
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

/* ================= ALUR DISPOSISI KEPALA SEKOLAH ================= */

function formatWaktuIndo(isoString) {
    if (!isoString) return '-';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }) + ', ' + d.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        }) + ' WIB';
    } catch (e) {
        return isoString;
    }
}

async function teruskanKeKepsek(id, fromModal = false) {
    const record = externalInboxRows.find(row => String(row.id) === String(id));
    if (!record) return;

    if (!fromModal) {
        const res = await Swal.fire({
            title: 'Teruskan ke Kepala Sekolah?',
            text: `Surat "${record.halSurat || record.noSurat}" akan diajukan ke akun Kepala Sekolah untuk diisi lembar disposisi.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ffc107',
            confirmButtonText: '<i class="fas fa-paper-plane me-1"></i> Ya, Teruskan!',
            cancelButtonText: 'Batal'
        });
        if (!res.isConfirmed) return;
    }

    const waktuSekarang = new Date().toISOString();
    const namaUser = localStorage.getItem('sidimas_user') || 'Admin Tata Usaha';
    record.waktuDiteruskan = waktuSekarang;
    record.penerus = namaUser;
    record.status = 'Menunggu Disposisi Kepsek';

    try {
        if (typeof isAppOnline === 'function' && isAppOnline()) {
            await apiCall('updateStatusEksternal', {
                id: record.id,
                status: 'Menunggu Disposisi Kepsek',
                waktuDiteruskan: waktuSekarang,
                penerus: namaUser
            });
        }
        if (isElectron) {
            await localDB.suratEksternal.put(record);
            await localDB.antrianSync.put({
                action: 'updateStatusEksternal',
                payload: {
                    id: record.id,
                    status: 'Menunggu Disposisi Kepsek',
                    waktuDiteruskan: waktuSekarang,
                    penerus: namaUser
                },
                status: 'pending'
            });
        }

        updateInboxBadge(externalInboxRows);
        await loadInboxTable();

        Swal.fire({
            title: 'Berhasil Diteruskan!',
            text: 'Surat telah diteruskan ke akun Kepala Sekolah untuk ditelaah dan didisposisi.',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false
        });

        if (fromModal) {
            bukaModalDisposisi(record.id);
        }
    } catch (err) {
        Swal.fire('Gagal Meneruskan', err.message || String(err), 'error');
    }
}

/* ================= FLOATING DOCUMENT VIEWER (MELAYANG DI ATAS MODAL DISPOSISI) ================= */

let floatingBlobUrl = null;

async function bukaFloatingDocViewer(record) {
    if (!record) return;

    const overlay = document.getElementById('floatingDocViewerOverlay');
    const frame = document.getElementById('floatingDocFrame');
    const imgContainer = document.getElementById('floatingDocImgContainer');
    const img = document.getElementById('floatingDocImg');
    const loading = document.getElementById('floatingDocLoading');
    const titleEl = document.getElementById('floatingDocTitle');
    const badgeEl = document.getElementById('floatingDocBadge');
    const btnExternal = document.getElementById('btnFloatingDocExternal');
    const btnTutup = document.getElementById('btnTutupFloatingDoc');

    if (!overlay) return;

    // Pastikan overlay berada di layer paling atas body agar berada di depan modal apapun
    if (overlay.parentNode !== document.body) {
        document.body.appendChild(overlay);
    }
    overlay.style.setProperty('z-index', '9999999', 'important');
    overlay.style.display = 'flex';
    loading.style.display = 'block';
    frame.style.display = 'none';
    imgContainer.style.display = 'none';
    frame.src = 'about:blank';
    img.src = '';

    const namaSurat = record.noSurat || record.halSurat || 'Surat Masuk';
    titleEl.textContent = `Lampiran: ${namaSurat}`;

    $(btnTutup).off('click').on('click', tutupFloatingDocViewer);
    $(overlay).off('click').on('click', function (e) {
        if (e.target === this) tutupFloatingDocViewer();
    });

    try {
        let fileInfo = record.fileInfoRaw;

        // 1. Prioritas Desktop Offline: Cek file di SQLite lokal terlebih dahulu
        if (isElectron && (!fileInfo || !fileInfo.data)) {
            try {
                const localRows = await localDB.suratEksternal.toArray();
                const localRec = localRows.find(r => String(r.id) === String(record.id));
                if (localRec && localRec.fileInfoRaw && localRec.fileInfoRaw.data) {
                    fileInfo = localRec.fileInfoRaw;
                    record.fileInfoRaw = fileInfo;
                }
            } catch (e) {
                console.warn('[SiDiMAS] Gagal membaca berkas dari SQLite lokal:', e);
            }
        }

        // 2. Jika di SQLite belum ada dan terhubung internet, unduh otomatis lalu simpan permanen ke SQLite
        if ((!fileInfo || !fileInfo.data) && typeof isAppOnline === 'function' && isAppOnline()) {
            try {
                const response = await apiCall('getSuratEksternalFile', { id: record.id });
                if (response && response.success === true && response.data) {
                    fileInfo = {
                        name: response.name || 'lampiran',
                        mimeType: response.mimeType || 'application/octet-stream',
                        data: response.data
                    };
                    record.fileInfoRaw = fileInfo;
                    if (isElectron) {
                        await localDB.suratEksternal.put(record);
                    }
                }
            } catch (errApi) {
                console.warn('[SiDiMAS] Gagal unduh lampiran dari server:', errApi);
            }
        }

        let blob = null;
        let mimeType = 'application/pdf';

        if (fileInfo && fileInfo.data) {
            // Membuka berkas dari SQLite lokal (100% Offline)
            mimeType = fileInfo.mimeType || 'application/pdf';
            blob = dataUriToBlob(`data:${mimeType};base64,${fileInfo.data}`);
        } else if (!isElectron && record.fileUrl && record.fileUrl !== '-' && record.fileUrl.startsWith('http')) {
            // Mode Online Web Browser biasa: buka via link Drive
            frame.src = record.fileUrl;
            frame.style.display = 'block';
            loading.style.display = 'none';
            btnExternal.href = record.fileUrl;
            badgeEl.className = 'badge bg-primary';
            badgeEl.innerHTML = '<i class="fas fa-external-link-alt me-1"></i>LINK DOKUMEN';
            return;
        }

        if (!blob) {
            tutupFloatingDocViewer();
            const msg = isElectron
                ? 'Desktop sedang offline dan berkas surat ini belum sempat diunduh ke SQLite lokal. Sambungkan internet sekali lalu klik tombol ini untuk menyimpannya ke perangkat.'
                : 'Surat ini belum memiliki berkas lampiran yang tersimpan.';
            return Swal.fire('Lampiran Belum Tersedia', msg, 'warning');
        }

        if (floatingBlobUrl) URL.revokeObjectURL(floatingBlobUrl);
        floatingBlobUrl = URL.createObjectURL(blob);
        btnExternal.href = floatingBlobUrl;

        loading.style.display = 'none';

        if (mimeType.startsWith('image/')) {
            badgeEl.className = 'badge bg-success';
            badgeEl.innerHTML = '<i class="fas fa-image me-1"></i>GAMBAR LAMPIRAN';
            img.src = floatingBlobUrl;
            imgContainer.style.display = 'block';
        } else {
            badgeEl.className = 'badge bg-danger';
            badgeEl.innerHTML = '<i class="fas fa-file-pdf me-1"></i>DOKUMEN PDF';
            frame.src = floatingBlobUrl;
            frame.style.display = 'block';
        }
    } catch (err) {
        console.error('[SiDiMAS] Error bukaFloatingDocViewer:', err);
        loading.style.display = 'none';
        Swal.fire('Gagal Membuka Lampiran', err.message || String(err), 'error');
        tutupFloatingDocViewer();
    }
}

function tutupFloatingDocViewer() {
    const overlay = document.getElementById('floatingDocViewerOverlay');
    if (overlay) overlay.style.display = 'none';
    const frame = document.getElementById('floatingDocFrame');
    if (frame) frame.src = 'about:blank';
    const img = document.getElementById('floatingDocImg');
    if (img) img.src = '';
    if (floatingBlobUrl) {
        URL.revokeObjectURL(floatingBlobUrl);
        floatingBlobUrl = null;
    }
}

function bukaModalDisposisi(id) {
    const record = externalInboxRows.find(row => String(row.id) === String(id));
    if (!record) return Swal.fire('Error', 'Data surat tidak ditemukan.', 'error');

    // 1. Ringkasan Info Surat
    $('#dispSuratId').val(record.id);
    $('#dispInfoPengirim').text(record.lembagaPengirim ? `${record.namaPengirim} (${record.lembagaPengirim})` : (record.namaPengirim || '-'));
    $('#dispInfoNoSurat').text(record.noSurat || '-');
    $('#dispInfoTglSurat').text(record.tglSurat || '-');
    $('#dispInfoHalSurat').text(record.halSurat || '-');

    const role = (localStorage.getItem('sidimas_role') || 'admin').toLowerCase();
    const isKepsek = (role === 'kepsek');
    const isAdmin = (role === 'admin');

    const sudahDiteruskan = Boolean(record.waktuDiteruskan || (record.status && record.status !== 'Menunggu Verifikasi'));
    const d = record.disposisi;
    const sudahDidisposisi = Boolean(d);
    const sudahDiagendakan = Boolean(record.isDiagendakan);

    // Badge status di header timeline
    let statusHeaderBadge = '';
    if (sudahDiagendakan) {
        statusHeaderBadge = '<span class="badge bg-success" style="font-size:0.75rem;"><i class="fas fa-check-double me-1"></i>Selesai & Diagendakan</span>';
    } else if (sudahDidisposisi) {
        statusHeaderBadge = '<span class="badge bg-info text-dark" style="font-size:0.75rem;"><i class="fas fa-check-circle me-1"></i>Sudah Didisposisi</span>';
    } else if (sudahDiteruskan) {
        statusHeaderBadge = '<span class="badge bg-danger text-white" style="font-size:0.75rem;"><i class="fas fa-paper-plane me-1"></i>Menunggu Respon Kepsek</span>';
    } else {
        statusHeaderBadge = '<span class="badge bg-warning text-dark" style="font-size:0.75rem;"><i class="fas fa-inbox me-1"></i>Surat Masuk Baru</span>';
    }
    $('#dispBadgeStatusAlur').replaceWith(`<span class="badge" id="dispBadgeStatusAlur" style="font-size:0.75rem;">${statusHeaderBadge}</span>`);

    // ================= TAHAP 1: Surat Masuk & Registrasi =================
    const waktuMasuk = formatWaktuIndo(record.waktuInput || record.tglSurat);
    $('#timelineStep1').html(`
        <div style="font-size: 0.78rem; line-height: 1.4;">
            <div><span class="text-muted">Waktu Terima:</span> <strong class="text-dark">${waktuMasuk}</strong></div>
            <div><span class="text-muted">Pengirim:</span> ${escapeInboxValue(record.namaPengirim || '-')} ${record.lembagaPengirim ? '(' + escapeInboxValue(record.lembagaPengirim) + ')' : ''}</div>
            <div class="text-success mt-1"><i class="fas fa-check me-1"></i>Surat resmi diterima & terdaftar di sistem SiDiMAS.</div>
        </div>
    `);

    // ================= TAHAP 2: Pengajuan Disposisi ke Kepala Sekolah =================
    if (sudahDiteruskan) {
        $('#timelineDot2').attr('class', 'position-absolute translate-middle rounded-circle bg-success');
        $('#timelineTitle2').attr('class', 'fw-bold text-success').html('<i class="fas fa-paper-plane me-1"></i>2. Pengajuan Disposisi ke Kepala Sekolah <span class="badge bg-success-subtle text-success py-0 px-1 ms-1" style="font-size:0.68rem;">Selesai Diajukan</span>');
        const waktuTerus = formatWaktuIndo(record.waktuDiteruskan || record.waktuInput);
        const pengaju = escapeInboxValue(record.penerus || 'Staf Tata Usaha / Admin');
        $('#timelineStep2').html(`
            <div style="font-size: 0.78rem; line-height: 1.4;">
                <div><span class="text-muted">Waktu Diajukan:</span> <strong class="text-dark">${waktuTerus}</strong></div>
                <div><span class="text-muted">Diajukan Oleh:</span> <strong class="text-dark">${pengaju}</strong></div>
                <div class="text-danger fw-bold mt-1"><i class="fas fa-clock me-1"></i>Status: Menunggu Respon & Arahan Kepala Sekolah</div>
            </div>
        `);
        $('#timelineAction2').hide();
    } else {
        $('#timelineDot2').attr('class', 'position-absolute translate-middle rounded-circle bg-warning');
        $('#timelineTitle2').attr('class', 'fw-bold text-dark').html('<i class="fas fa-paper-plane me-1"></i>2. Pengajuan Disposisi ke Kepala Sekolah <span class="badge bg-warning text-dark py-0 px-1 ms-1" style="font-size:0.68rem;">Belum Diteruskan</span>');
        $('#timelineStep2').html(`
            <div style="font-size: 0.78rem; line-height: 1.4;" class="text-muted">
                Surat masuk ini belum diteruskan ke akun Kepala Sekolah.
            </div>
        `);
        if (isAdmin) {
            $('#timelineAction2').show();
            $('#btnTeruskanKepsekModalInner').off('click').on('click', async () => {
                await teruskanKeKepsek(record.id, true);
            });
        } else {
            $('#timelineAction2').hide();
        }
    }

    // ================= TAHAP 3: Arahan & Lembar Disposisi Kepala Sekolah =================
    if (sudahDidisposisi) {
        $('#timelineDot3').attr('class', 'position-absolute translate-middle rounded-circle bg-success');
        $('#timelineTitle3').attr('class', 'fw-bold text-success').html('<i class="fas fa-file-signature me-1"></i>3. Arahan & Lembar Disposisi Kepala Sekolah <span class="badge bg-success py-0 px-1 ms-1 text-white" style="font-size:0.68rem;">Didisposisi</span>');
        const waktuDisp = formatWaktuIndo(d.waktuDisposisi || d.tglDisposisi);
        const namaK = escapeInboxValue(d.namaKepsek || 'Kepala Sekolah');
        const sifatBadgeClass = d.sifat === 'Sangat Segera' ? 'bg-danger' : d.sifat === 'Segera' ? 'bg-warning text-dark' : 'bg-success';

        $('#timelineStep3').html(`
            <div style="font-size: 0.78rem; line-height: 1.4;">
                <div><span class="text-muted">Waktu Disposisi:</span> <strong class="text-dark">${waktuDisp}</strong> | <span class="text-muted">Oleh:</span> <strong>${namaK}</strong></div>
                <div class="mt-1"><span class="text-muted">Sifat Surat:</span> <span class="badge ${sifatBadgeClass} py-0 px-1" style="font-size:0.72rem;">${escapeInboxValue(d.sifat || 'Biasa')}</span></div>
            </div>
        `);

        // Rincian Lembar Disposisi (font kecil, rapi, compact)
        const penerimaStr = Array.isArray(d.penerima) && d.penerima.length ? d.penerima.map(p => escapeInboxValue(p)).join(', ') : '-';
        const instruksiStr = Array.isArray(d.instruksi) && d.instruksi.length ? d.instruksi.map(i => escapeInboxValue(i)).join(' • ') : '-';
        const catatanStr = d.catatan ? escapeInboxValue(d.catatan) : '<em class="text-muted">Tidak ada catatan tambahan.</em>';

        $('#timelineDetailDisposisi').html(`
            <div class="p-2 rounded bg-light border" style="font-size: 0.76rem; line-height: 1.4;">
                <div class="mb-1">
                    <span class="text-muted fw-bold">Diteruskan Kepada:</span><br>
                    <span class="text-dark fw-bold">${penerimaStr}</span>
                </div>
                <div class="mb-1">
                    <span class="text-muted fw-bold">Petunjuk / Instruksi Disposisi:</span><br>
                    <span class="text-primary fw-bold">${instruksiStr}</span>
                </div>
                <div>
                    <span class="text-muted fw-bold">Catatan Arahan Kepala Sekolah:</span>
                    <div class="p-1 mt-1 bg-white rounded border text-dark fst-italic">${catatanStr}</div>
                </div>
            </div>
        `).show();

        $('#timelineAction3').show();
        $('#btnCetakDisposisiModalInner').off('click').on('click', () => {
            cetakLembarDisposisi(record.id);
        });

        if (isKepsek) {
            $('#btnToggleFormDisposisi').show().off('click').on('click', () => {
                $('#boxFormDisposisi').slideToggle();
            });
        } else {
            $('#btnToggleFormDisposisi').hide();
        }
    } else {
        const dotColor = isKepsek ? 'bg-danger' : 'bg-warning';
        $('#timelineDot3').attr('class', `position-absolute translate-middle rounded-circle ${dotColor}`);
        $('#timelineTitle3').attr('class', 'fw-bold text-dark').html('<i class="fas fa-file-signature me-1"></i>3. Arahan & Lembar Disposisi Kepala Sekolah <span class="badge bg-danger text-white py-0 px-1 ms-1" style="font-size:0.68rem;">Menunggu Kepsek</span>');
        $('#timelineStep3').html(`
            <div style="font-size: 0.78rem;" class="text-danger fw-semibold">
                <i class="fas fa-hourglass-half me-1"></i>Menunggu arahan dan lembar disposisi dari Kepala Sekolah.
            </div>
        `);
        $('#timelineDetailDisposisi').hide().empty();
        $('#timelineAction3').hide();
    }

    // ================= TAHAP 4: Tindak Lanjut & Agenda Surat Masuk =================
    if (sudahDiagendakan) {
        $('#timelineDot4').attr('class', 'position-absolute translate-middle rounded-circle bg-success');
        $('#timelineTitle4').attr('class', 'fw-bold text-success').html('<i class="fas fa-clipboard-check me-1"></i>4. Tindak Lanjut & Pencatatan Buku Agenda <span class="badge bg-success text-white py-0 px-1 ms-1" style="font-size:0.68rem;">Diagendakan</span>');
        const waktuAgenda = formatWaktuIndo(record.waktuDiagendakan || record.waktuInput);
        $('#timelineStep4').html(`
            <div style="font-size: 0.78rem; line-height: 1.4;">
                <div><span class="text-muted">Waktu Pencatatan:</span> <strong class="text-dark">${waktuAgenda}</strong></div>
                <div class="text-success mt-1"><i class="fas fa-check-double me-1"></i>Surat telah tercatat di Buku Agenda Surat Masuk SiDiMAS.</div>
            </div>
        `);
        $('#timelineAction4').hide();
    } else {
        $('#timelineDot4').attr('class', 'position-absolute translate-middle rounded-circle bg-secondary');
        $('#timelineTitle4').attr('class', 'fw-bold text-muted').html('<i class="fas fa-clipboard-check me-1"></i>4. Tindak Lanjut & Pencatatan Buku Agenda <span class="badge bg-secondary text-white py-0 px-1 ms-1" style="font-size:0.68rem;">Belum Diagendakan</span>');
        $('#timelineStep4').html(`
            <div style="font-size: 0.78rem;" class="text-muted">
                Belum dicatat ke Buku Agenda Surat Masuk.
            </div>
        `);
        if (isAdmin && sudahDidisposisi) {
            $('#timelineAction4').show();
            $('#btnAgendakanModalInner').off('click').on('click', async () => {
                await agendakanSuratEksternal(record.id);
                bukaModalDisposisi(record.id);
            });
        } else {
            $('#timelineAction4').hide();
        }
    }

    // ================= FORM LEMBAR DISPOSISI =================
    // Pastikan seluruh elemen form disposisi aktif dan dapat diketik
    $('#boxFormDisposisi').find('input, textarea, select').prop('disabled', false).prop('readonly', false);
    $('#dispPenerimaLainnya').prop('disabled', false).prop('readonly', false);
    $('#dispCatatan').prop('disabled', false).prop('readonly', false);
    $('#dispTglDisposisi').prop('disabled', false).prop('readonly', false);
    $('.disp-penerima, .disp-instruksi, input[name="dispSifat"]').prop('disabled', false);

    const today = new Date().toISOString().split('T')[0];
    $('#dispTglDisposisi').val(d && d.tglDisposisi ? d.tglDisposisi : today);

    // Otomatis nama Kepala Sekolah dari pengaturan sekolah (readonly, tidak perlu isi manual)
    const sSettings = JSON.parse(localStorage.getItem('sidimas_settings') || '{}');
    const namaKepsekAuto = sSettings.kepsek_nama || $('#inKepsekNama').val() || $('#txtNamaKepsek').text() || localStorage.getItem('sidimas_nama_kepsek') || 'Kepala Sekolah';
    $('#dispNamaKepsek').val(d && d.namaKepsek ? d.namaKepsek : namaKepsekAuto).prop('readonly', true);

    $('input[name="dispSifat"][value="Segera"]').prop('checked', true);
    $('.disp-penerima').prop('checked', false);
    $('#dispPenerimaLainnya').val('');
    $('.disp-instruksi').prop('checked', false);
    $('#dispCatatan').val('');

    if (d) {
        if (d.sifat) $(`input[name="dispSifat"][value="${d.sifat}"]`).prop('checked', true);
        if (Array.isArray(d.penerima)) {
            d.penerima.forEach(p => {
                const cb = $(`.disp-penerima[value="${p}"]`);
                if (cb.length) cb.prop('checked', true);
                else {
                    const cur = $('#dispPenerimaLainnya').val();
                    $('#dispPenerimaLainnya').val(cur ? `${cur}, ${p}` : p);
                }
            });
        }
        if (Array.isArray(d.instruksi)) {
            d.instruksi.forEach(i => {
                $(`.disp-instruksi[value="${i}"]`).prop('checked', true);
            });
        }
        if (d.catatan) $('#dispCatatan').val(d.catatan);
    }

    if (isKepsek) {
        if (sudahDidisposisi) {
            $('#boxFormDisposisi').hide();
        } else {
            $('#boxFormDisposisi').show();
        }
    } else {
        $('#boxFormDisposisi').hide();
    }

    $('#btnPreviewSuratDariDisposisi').off('click').on('click', () => {
        bukaFloatingDocViewer(record);
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLembarDisposisi')).show();
}

async function submitLembarDisposisi(e) {
    e.preventDefault();
    const id = $('#dispSuratId').val();
    const record = externalInboxRows.find(row => String(row.id) === String(id));
    if (!record) return;

    const sifat = $('input[name="dispSifat"]:checked').val() || 'Biasa';
    const penerima = [];
    $('.disp-penerima:checked').each(function () { penerima.push($(this).val()); });
    const penerimaLainnya = $('#dispPenerimaLainnya').val().trim();
    if (penerimaLainnya) penerima.push(penerimaLainnya);

    const instruksi = [];
    $('.disp-instruksi:checked').each(function () { instruksi.push($(this).val()); });

    const catatan = $('#dispCatatan').val().trim();
    const tglDisposisi = $('#dispTglDisposisi').val();
    const namaKepsek = $('#dispNamaKepsek').val().trim();

    if (penerima.length === 0 && instruksi.length === 0 && !catatan) {
        return Swal.fire('Form Belum Lengkap', 'Pilih minimal satu penerima disposisi atau isi petunjuk instruksi.', 'warning');
    }

    const disposisiData = {
        sifat,
        penerima,
        instruksi,
        catatan,
        tglDisposisi,
        namaKepsek,
        waktuDisposisi: new Date().toISOString()
    };

    const status = 'Sudah Didisposisi';

    try {
        setBtnLoading('#btnSimpanDisposisi', true, 'Menyimpan Disposisi...');
        record.disposisi = disposisiData;
        record.status = status;

        const ringkasanKeterangan = `[DISPOSISI KEPSEK (${sifat})] Kepada: ${penerima.join(', ')} | Instruksi: ${instruksi.join(', ')} | Catatan: ${catatan || '-'}`;
        record.keteranganDisposisi = ringkasanKeterangan;

        if (typeof isAppOnline === 'function' && isAppOnline()) {
            await apiCall('updateStatusEksternal', {
                id: record.id,
                status: status,
                keterangan: ringkasanKeterangan,
                disposisi: JSON.stringify(disposisiData)
            });
        }

        if (isElectron) {
            await localDB.suratEksternal.put(record);
            await localDB.antrianSync.put({
                action: 'updateStatusEksternal',
                payload: {
                    id: record.id,
                    status: status,
                    keterangan: ringkasanKeterangan,
                    disposisi: JSON.stringify(disposisiData)
                },
                status: 'pending'
            });
        }

        bootstrap.Modal.getInstance(document.getElementById('modalLembarDisposisi'))?.hide();
        updateInboxBadge(externalInboxRows);
        await loadInboxTable();

        Swal.fire({
            title: 'Disposisi Berhasil Disimpan!',
            text: 'Status surat kini telah diperbarui menjadi Sudah Didisposisi.',
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-print me-1"></i> Cetak Lembar Disposisi',
            cancelButtonText: 'Selesai'
        }).then(res => {
            if (res.isConfirmed) {
                cetakLembarDisposisi(record.id);
            }
        });
    } catch (err) {
        Swal.fire('Gagal Menyimpan Disposisi', err.message || String(err), 'error');
    } finally {
        setBtnLoading('#btnSimpanDisposisi', false, '<i class="fas fa-save me-1"></i> Simpan Disposisi');
    }
}

function cetakLembarDisposisi(id) {
    const record = externalInboxRows.find(row => String(row.id) === String(id));
    if (!record) return Swal.fire('Error', 'Surat tidak ditemukan.', 'error');
    if (!record.disposisi) return Swal.fire('Belum Didisposisi', 'Surat ini belum memiliki lembar disposisi dari Kepala Sekolah.', 'warning');

    const d = record.disposisi;
    const sifat = d.sifat || 'Biasa';
    const penerimaList = Array.isArray(d.penerima) ? d.penerima : [d.penerima || '-'];
    const instruksiList = Array.isArray(d.instruksi) ? d.instruksi : [d.instruksi || '-'];
    const catatan = d.catatan || '-';
    const tglDisposisi = d.tglDisposisi || new Date().toISOString().split('T')[0];
    const namaKepsek = d.namaKepsek || $('#txtNamaKepsek').text() || 'Kepala Sekolah';

    let tglIndo = tglDisposisi;
    try {
        const parts = tglDisposisi.split('-');
        if (parts.length === 3) {
            const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            tglIndo = `${parseInt(parts[2])} ${bulan[parseInt(parts[1]) - 1]} ${parts[0]}`;
        }
    } catch (e) { }

    const settings = JSON.parse(localStorage.getItem('sidimas_settings') || '{}');
    const namaInstansi = (settings.nama_instansi || $('#txtInstansi').text() || 'PEMERINTAH PROVINSI JAMBI').trim();
    const namaOpd = (settings.nama_opd || $('#txtOpd').text() || '').trim();
    const namaSekolah = (settings.nama_sekolah || $('#txtSekolah').text() || 'SMA NEGERI 15 TEBO').trim();
    const alamatSekolah = (settings.alamat_sekolah || $('#txtAlamat').text() || '').trim();
    const telpSekolah = (settings.telp_sekolah || '').trim();
    const emailSekolah = (settings.email_sekolah || $('#txtEmail').text() || '').trim();
    const webSekolah = (settings.website_sekolah || $('#txtWeb').text() || '').trim();
    const kotaSurat = (settings.kota_surat || $('#inKotaSurat').val() || 'Tebo').trim();

    const kepsekNama = settings.kepsek_nama || $('#inKepsekNama').val() || $('#txtNamaKepsek').text() || 'Kepala Sekolah';
    const kepsekNip = settings.kepsek_nip || $('#inKepsekNip').val() || '';
    const kepsekPangkat = settings.kepsek_pangkat || $('#inKepsekPangkat').val() || '';

    const logoKiriSrc = settings.logo_instansi || $('#logoKiri').attr('src') || '';
    const logoKananSrc = settings.logo_sekolah || $('#logoKanan').attr('src') || '';

    const kontakArr = [];
    if (telpSekolah) kontakArr.push('Telp: ' + telpSekolah);
    if (emailSekolah) kontakArr.push('Email: ' + emailSekolah);
    if (webSekolah) kontakArr.push('Website: ' + webSekolah);
    const kontakStr = kontakArr.join(' | ');

    const daftarJabatan = [
        'Wakasek Kurikulum', 'Wakasek Kesiswaan', 'Wakasek Sarana & Prasarana',
        'Wakasek Humas', 'Kepala Tata Usaha (Ka. TU)', 'Bendahara Sekolah',
        'Pembina OSIS', 'Guru / Wali Kelas'
    ];
    const daftarInstruksi = [
        'Tindak Lanjut / Proses Segera', 'Tanggapi / Buatkan Balasan Surat',
        'Koordinasikan / Rapatkan', 'Hadiri / Wakili',
        'Siapkan Bahan / Laporan', 'Untuk Diketahui / Arsipkan'
    ];

    let penerimaRowsHtml = '';
    daftarJabatan.forEach(jab => {
        const checked = penerimaList.some(p => p.toLowerCase().includes(jab.toLowerCase())) ? '&#9746;' : '&#9744;';
        penerimaRowsHtml += `<tr>
            <td style="width: 26px; text-align: center; font-size: 13px; vertical-align: top; padding: 4px 2px; border: none; white-space: normal !important;">${checked}</td>
            <td style="padding: 4px 6px; font-size: 11px; white-space: normal !important; line-height: 1.4; font-family: Arial, sans-serif; border: none; word-spacing: 2px; letter-spacing: 0.15px;">${escapeInboxValue(jab)}</td>
        </tr>`;
    });
    penerimaList.forEach(p => {
        if (!p || p === '-') return;
        if (!daftarJabatan.some(jab => p.toLowerCase().includes(jab.toLowerCase()))) {
            penerimaRowsHtml += `<tr>
                <td style="width: 26px; text-align: center; font-size: 13px; vertical-align: top; padding: 4px 2px; border: none; white-space: normal !important;">&#9746;</td>
                <td style="padding: 4px 6px; font-weight: bold; font-size: 11px; white-space: normal !important; line-height: 1.4; font-family: Arial, sans-serif; border: none; word-spacing: 2px; letter-spacing: 0.15px;">${escapeInboxValue(p)}</td>
            </tr>`;
        }
    });

    let instruksiRowsHtml = '';
    daftarInstruksi.forEach(inst => {
        const checked = instruksiList.some(i => i.toLowerCase().includes(inst.toLowerCase())) ? '&#9746;' : '&#9744;';
        instruksiRowsHtml += `<tr>
            <td style="width: 26px; text-align: center; font-size: 13px; vertical-align: top; padding: 4px 2px; border: none; white-space: normal !important;">${checked}</td>
            <td style="padding: 4px 6px; font-size: 11px; white-space: normal !important; line-height: 1.4; font-family: Arial, sans-serif; border: none; word-spacing: 2px; letter-spacing: 0.15px;">${escapeInboxValue(inst)}</td>
        </tr>`;
    });
    instruksiList.forEach(i => {
        if (!i || i === '-') return;
        if (!daftarInstruksi.some(inst => i.toLowerCase().includes(inst.toLowerCase()))) {
            instruksiRowsHtml += `<tr>
                <td style="width: 26px; text-align: center; font-size: 13px; vertical-align: top; padding: 4px 2px; border: none; white-space: normal !important;">&#9746;</td>
                <td style="padding: 4px 6px; font-weight: bold; font-size: 11px; white-space: normal !important; line-height: 1.4; font-family: Arial, sans-serif; border: none; word-spacing: 2px; letter-spacing: 0.15px;">${escapeInboxValue(i)}</td>
            </tr>`;
        }
    });

    const isSangatSegera = sifat.toLowerCase().includes('sangat') ? '&#9746;' : '&#9744;';
    const isSegera = (!sifat.toLowerCase().includes('sangat') && sifat.toLowerCase().includes('segera')) ? '&#9746;' : '&#9744;';
    const isBiasa = sifat.toLowerCase().includes('biasa') ? '&#9746;' : '&#9744;';
    const isRahasia = sifat.toLowerCase().includes('rahasia') ? '&#9746;' : '&#9744;';

    const catatanClean = (catatan && catatan !== '-')
        ? escapeInboxValue(catatan).replace(/\r\n|\r|\n/g, '<br>').replace(/  /g, ' &nbsp;')
        : '<em>-</em>';

    const htmlContent = `
    <div class="disposisi-paper-content" style="font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 6px 10px; width: 100%; max-width: 720px; margin: 0 auto; line-height: 1.4; box-sizing: border-box; white-space: normal !important; word-spacing: 2px; letter-spacing: 0.15px;">
        <!-- KOP SURAT STANDAR SESUAI ATURAN (ARIAL: INSTANSI 13px, OPD 13px jika ada, SEKOLAH 16px, ALAMAT 8px) -->
        <div style="display: flex; align-items: center; border-bottom: 2.5px double #000; padding-bottom: 5px; margin-bottom: 8px;">
            ${logoKiriSrc ? `<div style="width: 65px; text-align: center; margin-right: 12px; flex-shrink: 0;"><img src="${logoKiriSrc}" style="max-height: 65px; max-width: 65px;"></div>` : ''}
            <div style="flex-grow: 1; text-align: center;">
                <div style="font-size: 13px; font-weight: bold; text-transform: uppercase; font-family: Arial, sans-serif; word-spacing: 2px;">${escapeInboxValue(namaInstansi)}</div>
                ${namaOpd ? `<div style="font-size: 13px; font-weight: bold; text-transform: uppercase; font-family: Arial, sans-serif; word-spacing: 2px;">${escapeInboxValue(namaOpd)}</div>` : ''}
                <div style="font-size: 16px; font-weight: bold; text-transform: uppercase; font-family: Arial, sans-serif; letter-spacing: 0.5px; word-spacing: 2px;">${escapeInboxValue(namaSekolah)}</div>
                ${alamatSekolah ? `<div style="font-size: 8px; font-style: italic; font-family: Arial, sans-serif; margin-top: 2px; word-spacing: 1.5px;">${escapeInboxValue(alamatSekolah)}</div>` : ''}
                ${kontakStr ? `<div style="font-size: 8px; font-style: italic; font-family: Arial, sans-serif; word-spacing: 1.5px;">${escapeInboxValue(kontakStr)}</div>` : ''}
            </div>
            ${logoKananSrc ? `<div style="width: 65px; text-align: center; margin-left: 12px; flex-shrink: 0;"><img src="${logoKananSrc}" style="max-height: 65px; max-width: 65px;"></div>` : ''}
        </div>

        <div style="text-align: center; margin-bottom: 8px;">
            <div style="font-size: 14px; font-weight: bold; text-decoration: underline; letter-spacing: 1px; word-spacing: 2.5px; font-family: Arial, sans-serif;">LEMBAR DISPOSISI</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; font-family: Arial, sans-serif; white-space: normal !important;" border="1">
            <tr>
                <td style="width: 50%; padding: 5px 6px; vertical-align: top; line-height: 1.4; white-space: normal !important; word-spacing: 2px;">
                    <strong style="word-spacing: 2px;">Surat Dari :</strong><br>${escapeInboxValue(record.lembagaPengirim || record.namaPengirim || '-')}<br>
                    <small class="text-muted" style="word-spacing: 1.5px;">(${escapeInboxValue(record.namaPengirim || '')})</small>
                </td>
                <td style="width: 50%; padding: 5px 6px; vertical-align: top; line-height: 1.4; white-space: normal !important; word-spacing: 2px;">
                    <strong style="word-spacing: 2px;">Diterima Tanggal :</strong> ${record.waktuInput ? new Date(record.waktuInput).toLocaleDateString('id-ID') : '-'}<br>
                    <strong style="word-spacing: 2px;">No. Agenda :</strong> ${escapeInboxValue(record.noSurat || '-')}<br>
                    <strong style="word-spacing: 2px;">Sifat :</strong><br>
                    <div style="margin-top: 4px; line-height: 1.5; font-size: 11px; word-spacing: 2px;">
                        <span style="display: inline-block; min-width: 130px;">${isSangatSegera}&nbsp;&nbsp;Sangat Segera</span>
                        <span style="display: inline-block;">${isSegera}&nbsp;&nbsp;Segera</span><br>
                        <span style="display: inline-block; min-width: 130px;">${isBiasa}&nbsp;&nbsp;Biasa</span>
                        <span style="display: inline-block;">${isRahasia}&nbsp;&nbsp;Rahasia</span>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="padding: 5px 6px; vertical-align: top; line-height: 1.4; white-space: normal !important; word-spacing: 2px;">
                    <strong style="word-spacing: 2px;">Nomor Surat :</strong> ${escapeInboxValue(record.noSurat || '-')}<br>
                    <strong style="word-spacing: 2px;">Tanggal Surat :</strong> ${escapeInboxValue(record.tglSurat || '-')}
                </td>
                <td style="padding: 5px 6px; vertical-align: top; line-height: 1.4; white-space: normal !important; word-spacing: 2px;">
                    <strong style="word-spacing: 2px;">Perihal :</strong><br>
                    <span style="font-weight: bold; word-spacing: 2px;">${escapeInboxValue(record.halSurat || '-')}</span>
                </td>
            </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; font-family: Arial, sans-serif; white-space: normal !important;" border="1">
            <thead>
                <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
                    <th style="width: 50%; padding: 5px 6px; white-space: normal !important; word-spacing: 2px; letter-spacing: 0.2px;">DITERUSKAN KEPADA SDR.</th>
                    <th style="width: 50%; padding: 5px 6px; white-space: normal !important; word-spacing: 2px; letter-spacing: 0.2px;">PETUNJUK / DISPOSISI</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 4px 6px; vertical-align: top; white-space: normal !important;">
                        <table style="width: 100%; border-collapse: collapse; border: none; font-size: 11px; line-height: 1.4; white-space: normal !important;">
                            ${penerimaRowsHtml}
                        </table>
                    </td>
                    <td style="padding: 4px 6px; vertical-align: top; white-space: normal !important;">
                        <table style="width: 100%; border-collapse: collapse; border: none; font-size: 11px; line-height: 1.4; white-space: normal !important;">
                            ${instruksiRowsHtml}
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; font-family: Arial, sans-serif; white-space: normal !important;" border="1">
            <tr>
                <td style="padding: 6px 8px; vertical-align: top; min-height: 55px; white-space: normal !important;">
                    <strong style="word-spacing: 2px; letter-spacing: 0.2px;">CATATAN / ARAHAN KEPALA SEKOLAH :</strong>
                    <div style="padding: 6px 4px 10px 4px; font-style: ${catatan !== '-' ? 'normal' : 'italic'}; line-height: 1.5; white-space: normal !important; word-break: break-word !important; font-size: 11.5px; word-spacing: 2.5px; letter-spacing: 0.2px;">
                        ${catatanClean}
                    </div>
                </td>
            </tr>
        </table>

        <!-- TANDA TANGAN KEPALA SEKOLAH (OTOMATIS DARI PENGATURAN) -->
        <table style="width: 100%; border: none; font-size: 11.5px; margin-top: 10px; font-family: Arial, sans-serif; white-space: normal !important;">
            <tr>
                <td style="width: 55%; border: none;"></td>
                <td style="width: 45%; text-align: center; line-height: 1.4; border: none; white-space: normal !important; word-spacing: 2px;">
                    <div>${escapeInboxValue(kotaSurat)}, ${tglIndo}</div>
                    <div style="font-weight: bold; margin-bottom: 40px; word-spacing: 2px;">Kepala Sekolah,</div>
                    <div style="font-weight: bold; text-decoration: underline; word-spacing: 2px;">${escapeInboxValue(kepsekNama)}</div>
                    ${kepsekPangkat ? `<div style="word-spacing: 2px;">${escapeInboxValue(kepsekPangkat)}</div>` : ''}
                    ${kepsekNip ? `<div style="word-spacing: 2px;">NIP. ${escapeInboxValue(kepsekNip)}</div>` : ''}
                </td>
            </tr>
        </table>
    </div>`;

    openFilePreviewModal({
        title: `Lembar Disposisi - ${record.noSurat || 'Surat'}`,
        typeBadge: 'DISPOSISI',
        orientation: 'portrait',
        htmlContent: htmlContent,
        filename: `Lembar_Disposisi_${(record.noSurat || 'surat').replace(/[^a-zA-Z0-9_\-]/g, '_')}`,
        downloadFn: () => {
            const element = document.createElement('div');
            element.innerHTML = htmlContent;
            element.style.width = '720px';
            element.style.margin = '0 auto';
            element.style.background = '#ffffff';
            element.style.boxSizing = 'border-box';

            const opt = {
                margin: [8, 10, 8, 10],
                filename: `Lembar_Disposisi_${(record.noSurat || 'surat').replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            if (typeof html2pdf !== 'undefined') {
                html2pdf().set(opt).from(element).save();
            } else {
                window.print();
            }
        },
        printFn: () => {
            printHtmlElement(htmlContent, 'portrait');
        }
    });
}

async function agendakanSuratEksternal(id) {
    const record = externalInboxRows.find(row => String(row.id) === String(id));
    if (!record) return;

    const confirm = await Swal.fire({
        title: 'Agendakan ke Surat Masuk?',
        text: `Surat nomor "${record.noSurat || '-'}" dari "${record.namaPengirim || '-'}" akan dicatat ke Agenda Surat Masuk.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Ya, Agendakan!',
        cancelButtonText: 'Batal'
    });
    if (!confirm.isConfirmed) return;

    Swal.fire({
        title: 'Mencatat ke Agenda...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const isOnline = (typeof isAppOnline === 'function') && isAppOnline();
        const currentUser = localStorage.getItem('sidimas_user') || 'admin';
        const currentRole = localStorage.getItem('sidimas_role') || 'admin';
        const ts = new Date().toISOString();
        const idBaru = (isOnline ? 'ONLINE_' : 'LOCAL_') + Date.now();
        const tglHariIni = new Date().toISOString().split('T')[0];

        let fUrl = (record.fileUrl && record.fileUrl !== '-') ? record.fileUrl : '-';
        let fDataSimpan = record.fileInfoRaw || null;
        if (!fDataSimpan && fUrl && fUrl.startsWith('data:')) {
            const mimeMatch = fUrl.match(/data:(.*?);base64,/);
            fDataSimpan = {
                name: `Lampiran_${(record.noSurat || 'surat').replace(/[^a-zA-Z0-9_\-]/g, '_')}`,
                mimeType: mimeMatch ? mimeMatch[1] : 'application/pdf',
                data: fUrl.replace(/^data:.*?;base64,/, '')
            };
        }

        let catatanDisposisi = '';
        if (record.disposisi) {
            const d = record.disposisi;
            const penerimaStr = Array.isArray(d.penerima) ? d.penerima.join(', ') : (d.penerima || '-');
            const instStr = Array.isArray(d.instruksi) ? d.instruksi.join(', ') : (d.instruksi || '-');
            catatanDisposisi = `[Disposisi Kepsek (${d.sifat || 'Biasa'})] Kepada: ${penerimaStr} | Instruksi: ${instStr}${d.catatan ? ' | Ket: ' + d.catatan : ''}`;
        } else {
            catatanDisposisi = record.keterangan || 'Surat Masuk Eksternal';
        }

        const recordAgenda = {
            id: idBaru,
            waktuInput: ts,
            pembuat: currentUser,
            sync_status: isOnline ? 'synced' : 'pending',
            fileUrl: fUrl,
            fileInfoRaw: isOnline ? null : fDataSimpan,
            tglTerima: record.waktuInput ? record.waktuInput.split('T')[0] : tglHariIni,
            pengirim: record.lembagaPengirim ? `${record.namaPengirim} (${record.lembagaPengirim})` : (record.namaPengirim || '-'),
            tglSurat: record.tglSurat || tglHariIni,
            noSurat: record.noSurat || '-',
            perihal: record.halSurat || '-',
            ditujukan: record.tujuanSurat || 'Kepala Sekolah',
            uraian: record.keterangan || (record.halSurat || '-'),
            keterangan: catatanDisposisi
        };

        if (isOnline) {
            const dataSimpanPayload = {
                jenisForm: 'masuk',
                mode: 'add',
                idSurat: idBaru,
                currentUser: currentUser,
                currentRole: currentRole,
                fileLama: fUrl || '-',
                tglTerima: recordAgenda.tglTerima,
                pengirim: recordAgenda.pengirim,
                tglSurat: recordAgenda.tglSurat,
                noSurat: recordAgenda.noSurat,
                perihal: recordAgenda.perihal,
                ditujukan: recordAgenda.ditujukan,
                uraian: recordAgenda.uraian,
                keterangan: recordAgenda.keterangan
            };
            const res = await apiCall('simpanData', { data: dataSimpanPayload, fileInfo: fDataSimpan });
            if (!res || !res.success) {
                throw new Error(res && res.message || 'Gagal menyimpan ke Google Spreadsheet.');
            }
        }

        if (isElectron) {
            await localDB.suratMasuk.put(recordAgenda);
            if (!isOnline) {
                await localDB.antrianSync.put({
                    action: 'simpanData',
                    payload: {
                        data: {
                            jenisForm: 'masuk',
                            mode: 'add',
                            idSurat: idBaru,
                            currentUser: currentUser,
                            currentRole: currentRole,
                            fileLama: fUrl || '-',
                            tglTerima: recordAgenda.tglTerima,
                            pengirim: recordAgenda.pengirim,
                            tglSurat: recordAgenda.tglSurat,
                            noSurat: recordAgenda.noSurat,
                            perihal: recordAgenda.perihal,
                            ditujukan: recordAgenda.ditujukan,
                            uraian: recordAgenda.uraian,
                            keterangan: recordAgenda.keterangan
                        },
                        fileInfo: fDataSimpan
                    },
                    status: 'pending'
                });
            }
        }

        record.isDiagendakan = true;
        record.waktuDiagendakan = new Date().toISOString();
        if (isElectron) {
            await localDB.suratEksternal.put(record);
        }

        Swal.close();
        await loadInboxTable();
        if (typeof refreshTable === 'function') refreshTable('masuk');

        Swal.fire({
            title: 'Berhasil Diagendakan!',
            text: 'Surat telah tercatat di Arsip Surat Masuk.',
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-folder-open me-1"></i> Buka Agenda Surat',
            cancelButtonText: 'Tetap di Sini'
        }).then(res => {
            if (res.isConfirmed) {
                nav('agenda');
            }
        });
    } catch (err) {
        Swal.close();
        Swal.fire('Gagal Mengagendakan', err.message || String(err), 'error');
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

function printHtmlElement(htmlContent, orientation = 'landscape') {
    const isPortrait = orientation === 'portrait';
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
                @page { size: ${isPortrait ? 'A4 portrait' : 'landscape'}; margin: ${isPortrait ? '8mm 12mm 8mm 12mm' : '10mm 12mm 10mm 22mm'}; }
                body {
                    font-family: Arial, sans-serif;
                    background: #ffffff !important;
                    color: #000000 !important;
                    margin: 0;
                    padding: ${isPortrait ? '0' : '10px 15px 15px 25px'};
                    box-sizing: border-box;
                }
                table { width: 100%; border-collapse: collapse; }
                table[border="1"], table[border="1"] th, table[border="1"] td { border: 1px solid #333 !important; }
                table[style*="border: none"], table[style*="border: none"] td, table[style*="border:none"], table[style*="border:none"] td { border: none !important; }
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
    const inlineTarget = opts.inlineTarget ? document.querySelector(opts.inlineTarget) : null;
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
        const isPortrait = opts.orientation === 'portrait' || (opts.typeBadge && opts.typeBadge.toUpperCase() === 'DISPOSISI') || currentPreviewType === 'DISPOSISI';
        const opt = {
            margin: isPortrait ? [8, 10, 8, 10] : [10, 22, 10, 12], // Disposisi A4 portrait vs Agenda legal landscape
            filename: filename + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: isPortrait ? 'a4' : 'legal', orientation: isPortrait ? 'portrait' : 'landscape' }
        };
        const div = document.createElement('div');
        div.innerHTML = htmlContent;
        div.style.width = '100%';
        div.style.boxSizing = 'border-box';
        div.style.background = '#ffffff';
        if (!isPortrait) {
            div.style.minWidth = '1150px';
            div.style.paddingLeft = '15px'; // Padding ekstra agar isi tabel lebih ke kanan
        } else {
            div.style.maxWidth = '720px';
            div.style.margin = '0 auto';
        }

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
    $('#btnPrintPreview').removeClass('d-none').off('click').on('click', printPreviewFile);
    const isLampiranDoc = Boolean((opts && opts.isLampiran) || (opts && opts.archiveData && opts.archiveData.isLampiran) || (filename && /lampiran/i.test(filename)) || (title && /lampiran/i.test(title)));
    if (isLampiranDoc) {
        currentPreviewArchiveData = null;
    }

    $('#btnArchiveGenerated')
        .toggleClass('d-none', !currentPreviewArchiveData || isLampiranDoc)
        .removeClass('btn-outline-success btn-success')
        .addClass('btn-primary')
        .html('<i class="fas fa-paper-plane me-1"></i> Ajukan Tinjau ke Kepsek')
        .off('click').on('click', async function () {
            if (!currentPreviewArchiveData || this.disabled) return;
            const button = $(this);
            const originalHtml = button.html();
            button.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Mengajukan...');
            try {
                let rec = null;
                if (typeof currentPreviewArchiveData.getKendaliRecord === 'function') {
                    rec = currentPreviewArchiveData.getKendaliRecord();
                }
                if (!rec && typeof simpanKeKendaliSurat === 'function') {
                    rec = await simpanKeKendaliSurat(currentPreviewArchiveData, 'menunggu');
                } else if (rec) {
                    rec.status = 'menunggu';
                    rec.waktuPengajuan = new Date().toISOString();
                    if (typeof simpanKendaliRecord === 'function') await simpanKendaliRecord(rec);
                }

                bootstrap.Modal.getInstance(document.getElementById('mdlPdfPreview'))?.hide();

                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Diajukan!',
                    text: 'Naskah surat masuk ke daftar kendali dan menunggu tinjauan/paraf dari Kepala Sekolah.',
                    timer: 2300,
                    showConfirmButton: false
                });

                // Arahkan ke tab Kendali Surat
                nav('buat');
                setTimeout(() => {
                    const tabBtn = document.querySelector('#tab-kendali-btn');
                    if (tabBtn) bootstrap.Tab.getOrCreateInstance(tabBtn).show();
                    if (typeof loadKendaliSuratTable === 'function') loadKendaliSuratTable('staf');
                }, 100);
            } catch (error) {
                button.prop('disabled', false).html(originalHtml);
                Swal.fire('Gagal Mengajukan', `Terjadi kesalahan: ${error.message}`, 'error');
            }
        });

    // Set iframe src + tombol Buka PDF — PERSIS CARA SIBUKINSTAL
    if (typeBadge === 'DOCX') {
        if (inlineTarget) {
            inlineTarget.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div><p>Memuat Dokumen Word...</p></div>';
        } else {
            $('#pdfPreviewFrame').addClass('d-none');
            $('#docxPreviewContainer').removeClass('d-none').html('<div class="text-center mt-5"><div class="spinner-border text-primary"></div><p>Memuat Dokumen Word...</p></div>');
        }

        const renderDocx = async () => {
            try {
                let blob = currentPreviewBlob;
                if (!blob && dataUrl.startsWith('data:')) blob = dataUriToBlob(dataUrl);
                else if (!blob) {
                    const res = await fetch(dataUrl);
                    blob = await res.blob();
                }
                const container = inlineTarget || document.getElementById('docxPreviewContainer');
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
        if (inlineTarget) {
            inlineTarget.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div><p>Memuat lembar kerja...</p></div>';
        } else {
            $('#pdfPreviewFrame').addClass('d-none');
            $('#docxPreviewContainer').removeClass('d-none').html('<div class="text-center mt-5"><div class="spinner-border text-primary"></div><p>Memuat lembar kerja...</p></div>');
        }
        const renderExcel = async () => {
            try {
                let blob = currentPreviewBlob;
                if (!blob && dataUrl.startsWith('data:')) blob = dataUriToBlob(dataUrl);
                else if (!blob) blob = await (await fetch(dataUrl)).blob();
                await renderExcelPreview(blob, inlineTarget || document.getElementById('docxPreviewContainer'));
            } catch (error) {
                (inlineTarget || document.getElementById('docxPreviewContainer')).innerHTML = `<div class="alert alert-danger m-4">Gagal memuat lembar kerja: ${error.message}</div>`;
            }
        };
        renderExcel();
    } else if (typeBadge === 'GAMBAR' && !inlineTarget) {
        $('#docxPreviewContainer').addClass('d-none');
        const safeImgTitle = String(title).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const imgHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeImgTitle}</title><style>body{margin:0;padding:20px;background:#525659;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;box-sizing:border-box;}img{max-width:100%;height:auto;object-fit:contain;background:#fff;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,0.45);}</style></head><body><img src="${blobUrl}" alt="${safeImgTitle}"></body></html>`;
        const htmlBlob = new Blob([imgHtml], { type: 'text/html' });
        const frameUrl = URL.createObjectURL(htmlBlob);
        $('#pdfPreviewFrame').removeClass('d-none').attr('src', frameUrl);
    } else {
        if (!inlineTarget) {
            let frameSrc = blobUrl;
            if (/drive\.google\.com/i.test(frameSrc)) {
                const dm = frameSrc.match(/\/d\/([a-zA-Z0-9_-]+)/) || frameSrc.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (dm && dm[1]) frameSrc = `https://drive.google.com/file/d/${dm[1]}/preview`;
            }
            $('#docxPreviewContainer').addClass('d-none');
            $('#pdfPreviewFrame').removeClass('d-none').attr('src', frameSrc);
        }
    }

    $('#btnOpenPdf').attr('href', blobUrl);
    $('#btnOpenPdf').attr('download', currentPreviewFilename);

    if (inlineTarget) {
        const safeTitle = String(title).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        inlineTarget.innerHTML = '';
        inlineTarget.classList.remove('d-none');
        inlineTarget.style.display = 'block';
        inlineTarget.style.height = '62vh';

        if (typeBadge === 'DOCX' || typeBadge.toUpperCase() === 'EXCEL') return;

        if (typeBadge === 'GAMBAR') {
            inlineTarget.innerHTML = `
                <div class="d-flex align-items-center justify-content-center h-100 bg-white rounded border" style="min-height: 220px; overflow: auto;">
                    <img src="${blobUrl}" alt="${safeTitle}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 3px 12px rgba(0,0,0,0.12);">
                </div>
            `;
        } else {
            inlineTarget.innerHTML = `
                <div class="position-relative h-100 bg-white rounded border" style="min-height: 220px; overflow: hidden;">
                    <iframe src="${blobUrl}" title="${safeTitle}" style="width: 100%; height: 100%; min-height: 220px; border: none; background: white;"></iframe>
                </div>
            `;
        }
        return;
    }

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
    const recordId = row[0];
    const noSurat = (isMasuk ? row[4] : row[3]) || (isMasuk ? 'Surat Masuk' : 'Surat Keluar');
    const perihal = (isMasuk ? row[5] : row[4]) || '';
    let fileUrl = isMasuk ? row[9] : row[8];
    let fileName = `Berkas_${jenis}_${String(noSurat).replace(/[^a-zA-Z0-9_\-]/g, '_')}`;
    let detectedMime = '';

    if (isElectron) {
        // MODE DESKTOP OFFLINE: Buka file yang tersimpan lokal di laptop (SQLite)
        const tableDB = isMasuk ? localDB.suratMasuk : localDB.suratKeluar;
        const localRecord = (await tableDB.toArray()).find(record => String(record.id) === String(recordId));
        if (localRecord) {
            if (localRecord.fileInfoRaw && localRecord.fileInfoRaw.name) {
                fileName = localRecord.fileInfoRaw.name;
            }
            if (typeof localRecord.fileUrl === 'string' && localRecord.fileUrl.startsWith('data:')) {
                fileUrl = localRecord.fileUrl;
            } else if (localRecord.fileInfoRaw && localRecord.fileInfoRaw.data) {
                detectedMime = localRecord.fileInfoRaw.mimeType || 'application/pdf';
                fileUrl = `data:${detectedMime};base64,${localRecord.fileInfoRaw.data}`;
            }
        }

        // Jika data berasal dari sinkronisasi lama dan file belum tersimpan lokal di SQLite
        if (fileUrl && /^https?:/i.test(fileUrl)) {
            if (!navigator.onLine || !API_URL) {
                Swal.fire('Lampiran Belum Tersimpan Lokal', 'Desktop sedang offline dan file surat ini belum memiliki salinan di laptop (SQLite). Sambungkan internet dan buka file sekali untuk menyimpannya ke perangkat.', 'warning');
                return;
            }
            Swal.fire({ title: 'Menyimpan Berkas ke Laptop...', text: 'Mengambil berkas untuk disimpan lokal...', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
            try {
                const response = await apiCall('getArsipSuratFile', { jenis, id: recordId });
                if (!response || response.success !== true || !response.data) {
                    throw new Error(response && response.message || 'Server tidak mengirim isi lampiran.');
                }
                detectedMime = response.mimeType || 'application/pdf';
                if (response.name) fileName = response.name;
                fileUrl = `data:${detectedMime};base64,${response.data}`;
                const fileInfoRaw = { name: fileName, mimeType: detectedMime, data: response.data };
                await tableDB.update(recordId, { fileUrl, fileInfoRaw });
                row[isMasuk ? 9 : 8] = fileUrl;
                Swal.close();
            } catch (error) {
                Swal.close();
                Swal.fire('Gagal Menyimpan Lampiran Lokal', error.message || String(error), 'error');
                return;
            }
        }
    } else {
        // MODE WEB ONLINE: Buka file dari Spreadsheet / Google Drive
        if (!fileUrl || !fileUrl.startsWith('data:')) {
            try {
                const tableDB = isMasuk ? localDB.suratMasuk : localDB.suratKeluar;
                const localRecord = (await tableDB.toArray()).find(record => String(record.id) === String(recordId));
                if (localRecord) {
                    if (localRecord.fileInfoRaw && localRecord.fileInfoRaw.name) {
                        fileName = localRecord.fileInfoRaw.name;
                    }
                    if (typeof localRecord.fileUrl === 'string' && localRecord.fileUrl.startsWith('data:')) {
                        fileUrl = localRecord.fileUrl;
                    } else if (localRecord.fileInfoRaw && localRecord.fileInfoRaw.data) {
                        detectedMime = localRecord.fileInfoRaw.mimeType || 'application/pdf';
                        fileUrl = `data:${detectedMime};base64,${localRecord.fileInfoRaw.data}`;
                    }
                }
            } catch (e) {}
        }

        if (fileUrl && /^https?:/i.test(fileUrl)) {
            Swal.fire({ title: 'Memuat Dokumen dari Spreadsheet...', text: 'Mohon tunggu sebentar...', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
            try {
                const response = await apiCall('getArsipSuratFile', { jenis, id: recordId });
                Swal.close();
                if (response && response.success === true && response.data) {
                    detectedMime = response.mimeType || 'application/pdf';
                    if (response.name) fileName = response.name;
                    fileUrl = `data:${detectedMime};base64,${response.data}`;
                    row[isMasuk ? 9 : 8] = fileUrl;
                } else {
                    const driveMatch = String(fileUrl).match(/\/d\/([a-zA-Z0-9_-]+)/) || String(fileUrl).match(/[?&]id=([a-zA-Z0-9_-]+)/);
                    if (driveMatch && driveMatch[1]) {
                        fileUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
                    }
                }
            } catch (err) {
                Swal.close();
                const driveMatch = String(fileUrl).match(/\/d\/([a-zA-Z0-9_-]+)/) || String(fileUrl).match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (driveMatch && driveMatch[1]) {
                    fileUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
                } else {
                    Swal.fire('Gagal Memuat Dokumen', err.message || String(err), 'error');
                    return;
                }
            }
        }
    }

    if (!fileUrl || fileUrl === '-' || fileUrl.length < 5) {
        Swal.fire('Informasi', 'Surat ini tidak memiliki lampiran berkas/file.', 'info');
        return;
    }

    let title = `${noSurat}` + (perihal ? ` - ${perihal}` : '');
    let typeBadge = 'PDF';
    const mimeMatch = String(fileUrl).match(/^data:(.*?);base64,/i);
    const effectiveMime = (detectedMime || (mimeMatch ? mimeMatch[1] : '')).toLowerCase();
    const lowerName = String(fileName).toLowerCase();
    const lowerUrl = String(fileUrl).toLowerCase();

    if (effectiveMime.includes('pdf') || /\.pdf($|\?)/i.test(lowerUrl) || lowerName.endsWith('.pdf')) {
        typeBadge = 'PDF';
    } else if (effectiveMime.startsWith('image/') || /\.(jpe?g|png|gif|webp)($|\?)/i.test(lowerUrl) || /\.(jpe?g|png|gif|webp)$/i.test(lowerName)) {
        typeBadge = 'GAMBAR';
    } else if (effectiveMime.includes('word') || effectiveMime.includes('officedocument.wordprocessingml') || /\.docx?($|\?)/i.test(lowerUrl) || /\.docx?$/i.test(lowerName)) {
        typeBadge = 'DOCX';
    } else if (effectiveMime.includes('sheet') || effectiveMime.includes('excel') || /\.xlsx?($|\?)/i.test(lowerUrl) || /\.xlsx?$/i.test(lowerName)) {
        typeBadge = 'EXCEL';
    }

    // Langsung buka modal iframe dokumen (#mdlPdfPreview), bukan modal form agenda
    openFilePreviewModal({
        title: title,
        typeBadge: typeBadge,
        dataUrl: fileUrl,
        filename: fileName
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


function ensureOpsiJenisSuratKeluar(selectedVal) {
    const $inJenisK = $('#inJenisK');
    if (!$inJenisK.length) return;

    if ($inJenisK.data('select2') || $inJenisK.hasClass('select2-hidden-accessible')) {
        try { $inJenisK.select2('destroy'); } catch (e) { }
    }

    const currentVal = selectedVal !== undefined ? selectedVal : ($inJenisK.val() || '');
    const firstOptionVal = String($inJenisK.find('option:first').val() || '');

    // Jika dropdown kosong, atau berisi kode klasifikasi arsip (berawalan angka seperti 421.1)
    if ($inJenisK.children().length < 5 || /^\d+(\.\d+)?/.test(firstOptionVal)) {
        let html = '';
        DAFTAR_JENIS_SURAT_KELUAR.forEach(j => {
            html += `<option value="${j}">${j}</option>`;
        });
        $inJenisK.html(html);
    }

    if (currentVal) {
        let matched = false;
        $inJenisK.find('option').each(function () {
            if ($(this).val().toLowerCase() === String(currentVal).toLowerCase() || $(this).text().toLowerCase() === String(currentVal).toLowerCase()) {
                $inJenisK.val($(this).val());
                matched = true;
                return false;
            }
        });
        if (!matched && String(currentVal).trim() && !/^\d+(\.\d+)?/.test(String(currentVal))) {
            $inJenisK.append(new Option(currentVal, currentVal, true, true));
        }
    }
}

function modalInput(j, mode) {
    $('#fSurat')[0].reset(); $('#fSurat').removeClass('was-validated'); $('#mJenis').val(j); $('#mMode').val(mode); $('#divMasuk,#divKeluar').addClass('hide'); $('#btnSimpan').show(); setBtnLoading('#btnSimpan', false, 'SIMPAN DATA');
    if (j === 'keluar') {
        ensureOpsiJenisSuratKeluar();
    }
    try { $('#inJenisK').trigger('change'); } catch (e) { }
    $('#btnViewAttachedMasuk, #btnViewAttachedKeluar').addClass('hide').html('');
    $('#suratInlinePreviewContainer').addClass('d-none').hide().empty();
    $('#modalSurat').find('input,textarea,select').prop('disabled', false); $('#divMasuk').find('input,textarea,select').prop('disabled', true); $('#divKeluar').find('input,textarea,select').prop('disabled', true);
    if (mode === 'view') {
        $('#judulModal').text('Detail Data Agenda');
        $('#btnSimpan').hide();
        $('#wrapUploadMasuk, #wrapUploadKeluar').addClass('hide');
        $('#modalSurat .modal-body').find('input,textarea,select').prop('disabled', true);
    } else {
        $('#judulModal').text(mode === 'add' ? 'Input Baru' : 'Edit Data Agenda');
        $('#wrapUploadMasuk, #wrapUploadKeluar').removeClass('hide');
    }
    if (j === 'masuk') { $('#divMasuk').removeClass('hide'); if (mode !== 'view') { $('#divMasuk').find('input,textarea,select').prop('disabled', false); $('.req-in').prop('required', true); } } else { $('#divKeluar').removeClass('hide'); if (mode !== 'view') { $('#divKeluar').find('input,textarea,select').prop('disabled', false); $('.req-out').prop('required', true); } }
    new bootstrap.Modal('#modalSurat').show();
}
function getDataByIndex(jenis, index) { return (jenis === 'masuk') ? dbMasuk[index] : dbKeluar[index]; }
function viewSurat(jenis, index) { const row = getDataByIndex(jenis, index); modalInput(jenis, 'view'); fillForm(jenis, row); }
function editSurat(jenis, index) { const row = getDataByIndex(jenis, index); modalInput(jenis, 'edit'); $('#mId').val(row[0]); fillForm(jenis, row); }

function fillForm(jenis, row) {
    $('#suratInlinePreviewContainer').addClass('d-none').hide().empty();
    const isEditMode = ($('#mMode').val() === 'edit');
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
        if (isEditMode && fUrl && fUrl.length > 5 && fUrl !== '-') {
            $('#btnViewAttachedMasuk').html('<div class="small text-success mt-1"><i class="fas fa-check-circle me-1"></i>Berkas sudah terlampir (Biarkan kosong jika tidak ingin mengganti berkas)</div>').removeClass('hide');
        } else {
            $('#btnViewAttachedMasuk').addClass('hide').html('');
        }
    } else {
        $('#inTglSuratK').val(row[1]);
        const jenisVal = String(row[2] || '').trim();
        ensureOpsiJenisSuratKeluar(jenisVal);
        try { $('#inJenisK').trigger('change'); } catch (e) { }
        $('#inNoSuratK').val(row[3]);
        $('#inPerihalK').val(row[4]);
        $('#inTujuanK').val(row[5]);
        $('#inUraianK').val(row[6]);
        $('#inKetK').val(row[7]);
        $('#mFileLama').val(row[8]);

        const fUrl = row[8];
        if (isEditMode && fUrl && fUrl.length > 5 && fUrl !== '-') {
            $('#btnViewAttachedKeluar').html('<div class="small text-success mt-1"><i class="fas fa-check-circle me-1"></i>Berkas sudah terlampir (Biarkan kosong jika tidak ingin mengganti berkas)</div>').removeClass('hide');
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
    let typeBadge = 'PDF';
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
            const cleanJenisVal = normalizeJenisSurat(dataObj.jenisSurat, dataObj.perihal, dataObj.noSurat);
            record.tglSurat = dataObj.tglSurat; record.klasifikasi = cleanJenisVal;
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
            const cleanJenisVal = normalizeJenisSurat(dataObj.jenisSurat, dataObj.perihal, dataObj.noSurat);
            dataSimpanPayload.tglSuratKeluar = dataObj.tglSurat;
            dataSimpanPayload.kodeKlasifikasi = cleanJenisVal;
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
    // Penyejajar Otomatis Header & Body DataTables saat tab Agenda diklik/dibuka
    $(document).on('shown.bs.tab', '#keluar-tab', function () {
        setTimeout(() => {
            if ($.fn.DataTable.isDataTable('#tKeluar')) {
                $('#tKeluar').DataTable().columns.adjust().draw(false);
            }
        }, 50);
        setTimeout(() => {
            if ($.fn.DataTable.isDataTable('#tKeluar')) {
                $('#tKeluar').DataTable().columns.adjust();
            }
        }, 200);
    });

    $(document).on('shown.bs.tab', '#masuk-tab', function () {
        setTimeout(() => {
            if ($.fn.DataTable.isDataTable('#tMasuk')) {
                $('#tMasuk').DataTable().columns.adjust().draw(false);
            }
        }, 50);
        setTimeout(() => {
            if ($.fn.DataTable.isDataTable('#tMasuk')) {
                $('#tMasuk').DataTable().columns.adjust();
            }
        }, 200);
    });

    $(document).on('shown.bs.tab', 'button[data-bs-toggle="pill"], button[data-bs-toggle="tab"]', function () {
        setTimeout(() => {
            $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
        }, 80);
    });

    // Inisialisasi event modal preview dikelola langsung di openFilePreviewModal (SibukInstal style)
    // Reset iframe saat modal ditutup
    document.getElementById('mdlPdfPreview') && document.getElementById('mdlPdfPreview').addEventListener('hidden.bs.modal', function () {
        $('#pdfPreviewFrame').attr('src', '');
        if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
        $('#docxPreviewContainer').empty();
        $('#btnArchiveGenerated').addClass('d-none').prop('disabled', false)
            .removeClass('btn-outline-success btn-success').addClass('btn-primary')
            .html('<i class="fas fa-paper-plane me-1"></i> Ajukan Tinjau ke Kepsek');
        currentPreviewBlob = null;
        currentPreviewArchiveData = null;
        currentPreviewType = '';
        currentPreviewFilename = 'dokumen';
        currentPreviewUrl = '';
    });
});
