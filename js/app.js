/* --- INIT DATA & DASHBOARD --- */
function applyEnvironmentVisibility() {
    const isDesktop = (typeof isElectron !== 'undefined' && isElectron);
    const role = localStorage.getItem('sidimas_role') || 'admin';

    if (isDesktop) {
        $('html, body').addClass('is-electron').removeClass('is-web-online');
        $('.online-only').hide().addClass('hide');
        if (role === 'staff') {
            $('.admin-only').hide().addClass('hide');
            $('.offline-only:not(.admin-only)').removeClass('hide').show();
        } else {
            $('.offline-only').removeClass('hide').show();
        }
    } else {
        $('html, body').addClass('is-web-online').removeClass('is-electron');
        $('.offline-only, #btnSyncMain').hide().addClass('hide');
        $('.online-only').removeClass('hide').show();
    }
}
window.applyEnvironmentVisibility = applyEnvironmentVisibility;

$(document).ready(function () {
    // JALANKAN CEK URL PERTAMA KALI
    if (!initTenantRouting()) return; // Stop loading jika link salah

    // Muat pengaturan dari cache lalu sinkronkan dari database lokal SQLite
    renderSettingsFromCache();
    loadSettingsFromDB();
    applyEnvironmentVisibility();
    checkSession();

    const dateNow = new Date();
    const offset = dateNow.getTimezoneOffset() * 60000;
    const today = (new Date(dateNow - offset)).toISOString().slice(0, 10);

    $('#filterM_Start, #filterM_End, #filterK_Start, #filterK_End, #inpTglSurat, #inpTglSaja').val(today);
    // Select2 untuk #selKodeArsip TIDAK di-init di sini karena #page-buat masih hide (display:none)
    // Inisialisasi dilakukan di nav('buat') setelah halaman terlihat
    $('#inpNoUrut').on('change blur', function () { formatNomorUrut(this); updatePreview(); });
    $(window).scroll(function () { if ($(this).scrollTop() > 100) $('#btnScrollTop').fadeIn(); else $('#btnScrollTop').fadeOut(); });

    updateTanggalSaja();

    $('#fileMasuk, #fileKeluar').on('change', function () {
        const file = this.files[0];
        if (file) {
            if (!file.type.match(/image.*/)) {
                if (file.size > 500 * 1024) {
                    this.value = '';
                    Swal.fire({ icon: 'warning', title: 'File Terlalu Besar', text: 'Maksimal ukuran file dokumen adalah 500KB.', target: '#modalSurat' });
                }
            }
        }
    });

    loadInitData();
});

function renderAppAttributes(s) {
    if (!s) return;
    try {
        localStorage.setItem('sidimas_settings', JSON.stringify(s));
    } catch (e) {
        console.warn('[SiDiMAS] localStorage quota limit reached:', e.message);
    }

    if (s.app_color) document.documentElement.style.setProperty('--main-color', s.app_color);
    if (s.app_color2) document.documentElement.style.setProperty('--main-color2', s.app_color2);
    if (s.app_color3) document.documentElement.style.setProperty('--main-color3', s.app_color3);

    // Untuk Logo 1 (Instansi)
    if (s.logo_instansi && s.logo_instansi.length > 50) {
        $('#logLogo1, #logoKiri').attr('src', s.logo_instansi).removeClass('hide').show();
        // Tampilkan juga di menu Pengaturan
        $('#previewLogo1').attr('src', s.logo_instansi).removeClass('hide').show();
        $('#btnHapusLogo1').removeClass('hide').show();
        $('#delLogo1').val('0');
    } else {
        $('#logLogo1, #logoKiri').hide();
        // Sembunyikan dari menu Pengaturan jika tidak ada
        $('#previewLogo1').addClass('hide').hide();
        $('#btnHapusLogo1').addClass('hide').hide();
    }

    // Untuk Logo 2 (Sekolah)
    if (s.logo_sekolah && s.logo_sekolah.length > 50) {
        $('#logLogo2, #logoKanan').attr('src', s.logo_sekolah).removeClass('hide').show();
        // Tampilkan juga di menu Pengaturan
        $('#previewLogo2').attr('src', s.logo_sekolah).removeClass('hide').show();
        $('#btnHapusLogo2').removeClass('hide').show();
        $('#delLogo2').val('0');
    } else {
        $('#logLogo2, #logoKanan').hide();
        // Sembunyikan dari menu Pengaturan jika tidak ada
        $('#previewLogo2').addClass('hide').hide();
        $('#btnHapusLogo2').addClass('hide').hide();
    }

    // Menampilkan Instansi
    $('#logInstansi').text(s.nama_instansi || '');

    // Menampilkan OPD secara dinamis
    if (s.nama_opd && s.nama_opd.trim() !== '') {
        $('#logOpd').text(s.nama_opd).removeClass('hide');
    } else {
        $('#logOpd').addClass('hide');
    }

    // Menampilkan Nama Sekolah
    $('#logSekolah').text(s.nama_sekolah || 'LOADING...');
    $('#txtInstansi').text(s.nama_instansi); $('#txtOpd').text(s.nama_opd); $('#txtSekolah').text(s.nama_sekolah);
    $('#txtAlamat').text(s.alamat_sekolah); $('#txtEmail').text(s.email_sekolah); $('#txtWeb').text(s.website_sekolah);

    $('#inInstansi').val(s.nama_instansi || ''); $('#inOpd').val(s.nama_opd || ''); $('#inSekolah').val(s.nama_sekolah || '');
    $('#inAlamat').val(s.alamat_sekolah || ''); $('#inEmail').val(s.email_sekolah || ''); $('#inWeb').val(s.website_sekolah || '');
    $('#inTelp').val(s.telp_sekolah || ''); $('#inWaAdmin').val(s.wa_admin || '');
    $('#inWarna').val(s.app_color || '#0d6efd'); $('#inWarna2').val(s.app_color2 || '#004085'); $('#inWarna3').val(s.app_color3 || '#001b3a');
    $('#inKepsekNama').val(s.kepsek_nama || ''); $('#inKepsekNip').val(s.kepsek_nip || '');
    $('#inKepsekPangkat').val(s.kepsek_pangkat || ''); $('#inKotaSurat').val(s.kota_surat || ''); $('#inKodeLembaga').val(s.kode_lembaga || '');

    const defaultGasUrl = (typeof getFallbackGasUrl === 'function') ? getFallbackGasUrl() : "https://script.google.com/macros/s/AKfycbx-QE31idTvmhqH9FkDY2eqqA1Mpkwpo2nsAdS5yvTrmuXjmrNhTwz9Rc6v0eeFxkA/exec";
    if (!s.link_exec || s.link_exec.trim() === "") {
        s.link_exec = defaultGasUrl;
    }
    const finalGasUrl = (s.link_exec && s.link_exec.trim() !== "") ? s.link_exec.trim() : defaultGasUrl;
    s.link_exec = finalGasUrl;
    API_URL = finalGasUrl;
    try { localStorage.setItem('sidimas_api_url', finalGasUrl); } catch (e) { }
    $('#inLinkExec, #inApiUrl, #syncLinkExec').val(finalGasUrl);


    if (!$('input[name="ttdNama"]').val()) $('input[name="ttdNama"]').val(s.kepsek_nama);
    if (!$('input[name="ttdNip"]').val()) $('input[name="ttdNip"]').val(s.kepsek_nip);
    if (!$('input[name="ttdPangkat"]').val()) $('input[name="ttdPangkat"]').val(s.kepsek_pangkat);
    $('#inpKodeSekolah').val(s.kode_lembaga || '');

    // Sinkronisasi ke Live Pratinjau Kop Surat
    updateLiveKopPreview();
}

/**
 * FUNGSI LIVE PRATINJAU KOP SURAT
 * Memperbarui tampilan kop surat secara real-time saat pengguna mengetik data
 * sekolah/instansi atau mengunggah/mengubah logo dan tema warna.
 */
function updateLiveKopPreview() {
    // 1. Instansi
    const rawInstansi = $('#inInstansi').val();
    const instansi = (rawInstansi !== undefined && rawInstansi !== null) ? rawInstansi.trim() : '';
    $('#liveKopInstansi').text(instansi || 'PEMERINTAH DAERAH / PROVINSI');

    // 2. OPD (hanya tampil jika diisi)
    const rawOpd = $('#inOpd').val();
    const opd = (rawOpd !== undefined && rawOpd !== null) ? rawOpd.trim() : '';
    if (opd) {
        $('#liveKopOpd').text(opd).show();
    } else {
        $('#liveKopOpd').hide().text('');
    }

    // 3. Nama Sekolah
    const rawSekolah = $('#inSekolah').val();
    const sekolah = (rawSekolah !== undefined && rawSekolah !== null) ? rawSekolah.trim() : '';
    $('#liveKopSekolah').text(sekolah || 'NAMA SEKOLAH / SATUAN PENDIDIKAN');

    // 4. Alamat Lengkap
    const rawAlamat = $('#inAlamat').val();
    const alamat = (rawAlamat !== undefined && rawAlamat !== null) ? rawAlamat.trim() : '';
    $('#liveKopAlamat').text(alamat || 'Alamat lengkap instansi / sekolah');

    // 5. Kontak (Email, Website, Telp)
    const email = ($('#inEmail').val() || '').trim();
    const web = ($('#inWeb').val() || '').trim();
    const telp = ($('#inTelp').val() || '').trim();
    const kontakArr = [];
    if (email) kontakArr.push(email);
    if (web) kontakArr.push(web);
    if (telp) kontakArr.push('Telp: ' + telp);

    if (kontakArr.length > 0) {
        $('#liveKopKontak').text(kontakArr.join(' | ')).show();
    } else {
        $('#liveKopKontak').text('Email / Website / Telepon').show();
    }

    // 6. Logo 1 (Instansi)
    const del1 = $('#delLogo1').val();
    const b64_1 = $('#b64Logo1').val();
    const src1 = $('#previewLogo1').attr('src');
    if (del1 !== '1' && (b64_1 || (src1 && src1.length > 50 && !$('#previewLogo1').hasClass('hide')))) {
        const activeSrc1 = b64_1 || src1;
        $('#liveKopLogo1').attr('src', activeSrc1).show();
        $('#liveKopLogo1Placeholder').hide();
    } else {
        $('#liveKopLogo1').hide().attr('src', '');
        $('#liveKopLogo1Placeholder').show();
    }

    // 7. Logo 2 (Sekolah)
    const del2 = $('#delLogo2').val();
    const b64_2 = $('#b64Logo2').val();
    const src2 = $('#previewLogo2').attr('src');
    if (del2 !== '1' && (b64_2 || (src2 && src2.length > 50 && !$('#previewLogo2').hasClass('hide')))) {
        const activeSrc2 = b64_2 || src2;
        $('#liveKopLogo2').attr('src', activeSrc2).show();
        $('#liveKopLogo2Placeholder').hide();
    } else {
        $('#liveKopLogo2').hide().attr('src', '');
        $('#liveKopLogo2Placeholder').show();
    }

    // 8. Warna Tema dinamis pada Nama Sekolah di Kop & Garis Kop
    const w1 = $('#inWarna').val() || '#0d6efd';
    const w2 = $('#inWarna2').val() || '#004085';
    $('#liveKopSekolah').css({
        'color': w1,
        'background': 'linear-gradient(90deg, ' + w1 + ' 0%, ' + w2 + ' 100%)',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent'
    });
    $('#liveKopHeaderRow').css('border-bottom', '3px double ' + w1);
}

// BINDING EVENT LISTENER REAL-TIME LIVE UNTUK FORM PENGATURAN SISTEM
$(document).ready(function () {
    $(document).on('input change keyup', '#inInstansi, #inOpd, #inSekolah, #inAlamat, #inEmail, #inWeb, #inTelp, #inWarna, #inWarna2, #inWarna3', function () {
        updateLiveKopPreview();
    });

    $(document).on('shown.bs.tab', '#sistem-tab', function () {
        updateLiveKopPreview();
    });

    // Muat daftar user saat tab Manajemen Akun dibuka (online: dari Spreadsheet)
    $(document).on('shown.bs.tab', '#akun-tab', function () {
        if (typeof loadUsers === 'function') loadUsers();
    });
});

function renderSettingsFromCache() {
    const cached = localStorage.getItem('sidimas_settings');
    if (cached) {
        try { renderAppAttributes(JSON.parse(cached)); } catch (e) { }
    } else {
        renderAppAttributes({
            nama_instansi: "PEMERINTAH KABUPATEN / KOTA",
            nama_sekolah: "SISTEM DIGITAL MANAJEMEN ARSIP SURAT",
            alamat_sekolah: "Alamat Instansi / Sekolah",
            app_color: "#0d6efd",
            app_color2: "#004085",
            app_color3: "#001b3a"
        });
    }
}

async function loadSettingsFromDB() {
    try {
        let s = null;
        if (localDB && localDB.appSettings) {
            const rows = await localDB.appSettings.toArray();
            if (rows && rows.length > 0) {
                const found = rows.find(r => r.id === 'config');
                if (found && found.data) {
                    s = typeof found.data === 'string' ? JSON.parse(found.data) : found.data;
                }
            }
        }

        // CEK APAKAH MODE ONLINE — pakai URL params langsung, tidak bergantung API_URL yg mungkin belum ready
        const urlP = new URLSearchParams(window.location.search);
        const tid = (urlP.get('id') || '').toLowerCase();
        const isOnlineMode = !isElectron && window.location.protocol.startsWith('http') && navigator.onLine;
        const targetUrl = (typeof DAFTAR_BACKEND !== 'undefined' && tid) ? DAFTAR_BACKEND[tid] : null;

        // JIKA TIDAK DITEMUKAN PENGATURAN DI LOKAL DAN SEDANG ONLINE, TARIK DARI SPREADSHEET
        if ((!s || Object.keys(s).length === 0) && isOnlineMode && targetUrl) {
            console.log('[SiDiMAS] Mengambil pengaturan pertama kali dari Server...', targetUrl);
            // Pastikan API_URL sudah diset sebelum apiCall
            if (!API_URL) { API_URL = targetUrl; }
            const res = await apiCall('getSettings');
            if (res.success && res.data) {
                s = res.data;
                await localDB.appSettings.put({ id: 'config', data: s });
            }
        }

        if (s && typeof s === 'object' && Object.keys(s).length > 0) {
            renderAppAttributes(s);
            return s;
        }
    } catch (err) {
        console.warn('[SiDiMAS] Error load settings dari DB:', err);
    }
    return null;
}

function loadInitData() {
    if (typeof loadKodeKlasifikasi === 'function') {
        if ($('#selKodeArsip').children('option').length <= 1) {
            loadKodeKlasifikasi();
        }
    }
    if ($('#pilihJenisSurat').children('option').length <= 1) {
        const staticTemplates = [
            { id: '1. Surat Dinas Umum.docx', name: '1. Surat Dinas Umum' },
            { id: '2. Surat Keputusan (SK).docx', name: '2. Surat Keputusan (SK)' },
            { id: '3. Surat Perjalanan Dinas (SPD).docx', name: '3. Surat Perjalanan Dinas (SPD)' },
            { id: '4. Surat Keterangan.docx', name: '4. Surat Keterangan' },
            { id: '5. Nota Dinas.docx', name: '5. Nota Dinas' },
            { id: '6. Surat Tugas (ST).docx', name: '6. Surat Tugas (ST)' },
            { id: '7. Surat Keterangan Siswa.docx', name: '7. Surat Keterangan Siswa' },
            { id: '8. Surat Pengantar.docx', name: '8. Surat Pengantar' },
            { id: '9. Surat Undangan.docx', name: '9. Surat Undangan' },
            { id: '10. Surat Izin.docx', name: '10. Surat Izin' },
            { id: '11. Surat Pernyataan Melaksanakan Tugas (SPMT).docx', name: '11. Surat SPMT' },
            { id: '12. Lampiran Surat.docx', name: '12. Lampiran Surat' }
        ];
        let o = '<option value="">-- Pilih Template --</option>';
        staticTemplates.forEach(t => o += `<option value="${t.id}">${t.name}</option>`);
        $('#pilihJenisSurat').html(o);
    }
    if (!$('#pilihJenisSurat').val() && $('#pilihJenisSurat option').length > 1) {
        $('#pilihJenisSurat').val($('#pilihJenisSurat option:eq(1)').val());
    }
    if (typeof gantiFormSurat === 'function') {
        gantiFormSurat();
    }
}

function setBtnLoading(btnId, isLoading, defaultText) {
    const btn = $(btnId);
    if (isLoading) {
        btn.prop('disabled', true);
        if (btn.find('.spinner-border').length > 0) { btn.find('.spinner-border').removeClass('hide'); if (defaultText) btn.find('span:not(.spinner-border)').text(defaultText); } else { btn.html('<span class="spinner-border spinner-border-sm"></span> Loading...'); }
    } else {
        btn.prop('disabled', false);
        if (btn.find('.spinner-border').length > 0) { btn.find('.spinner-border').addClass('hide'); btn.find('span:not(.spinner-border)').text(defaultText); } else { btn.text(defaultText); }
    }
}

/* --- FUNGSI LOADING DENGAN TIMER MUNDUR --- */
function showLoadingTimer(judul) {
    let timerInterval;
    Swal.fire({
        title: judul,
        html: 'Waktu tunggu: <b>5</b> detik...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
            const b = Swal.getHtmlContainer().querySelector('b');
            let timeLeft = 5;
            timerInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    if (b) b.textContent = timeLeft;
                } else {
                    Swal.getHtmlContainer().innerHTML = 'Sedang proses, mohon tunggu sebentar...';
                    clearInterval(timerInterval);
                }
            }, 1000);
        },
        willClose: () => {
            clearInterval(timerInterval);
        }
    });
}

function showLoadingTimer2(judul) {
    let timerInterval;
    Swal.fire({
        title: judul,
        html: 'Waktu tunggu: <b>10</b> detik...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
            const b = Swal.getHtmlContainer().querySelector('b');
            let timeLeft = 10;
            timerInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    if (b) b.textContent = timeLeft;
                } else {
                    Swal.getHtmlContainer().innerHTML = 'Sedang proses, mohon tunggu sebentar...';
                    clearInterval(timerInterval);
                }
            }, 1000);
        },
        willClose: () => {
            clearInterval(timerInterval);
        }
    });
}

function formatNomorUrut(input) { let val = input.value; if (val === "") return; input.value = String(val).padStart(3, '0'); }

