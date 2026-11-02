/**
 * ============================================================
 * SiDiMAS HYBRID — Kendali Surat & Profil Kepala Sekolah
 * Fitur: Paraf Digital Surat Keluar & Pengelolaan Profil Kepsek
 * Versi: 3.26.10
 * Penulis: Pariyanto
 * ============================================================
 */

let kendaliSuratRows = [];
let currentKendaliFilterStaf = 'all';
let currentKendaliFilterKepsek = 'all';
let currentTinjauRecord = null;
let tinjauPreviewBlobUrl = null;
let activeEditingKendaliId = null; // Menyimpan ID naskah kendali yang sedang dalam proses revisi

// --- 1. PERSISTENSI & LOAD DATA KENDALI SURAT ---

async function getKendaliSuratFromStorage() {
    let dbItems = [];
    let dbSuccess = false;
    try {
        if (typeof localDB !== 'undefined' && localDB.kendaliSurat) {
            const data = await localDB.kendaliSurat.toArray();
            if (Array.isArray(data)) {
                dbItems = data;
                dbSuccess = true;
            }
        }
    } catch (e) {
        console.warn('[Kendali Surat] Gagal baca localDB:', e);
    }

    let cacheItems = [];
    try {
        const cached = JSON.parse(localStorage.getItem('sidimas_kendali_surat') || '[]');
        if (Array.isArray(cached)) {
            cacheItems = cached;
        }
    } catch (e) {
        cacheItems = [];
    }

    // Gabungkan data dari cache localStorage dan localDB menggunakan Map ID
    // Hanya naskah yang BELUM diagendakan (status !== 'diagendakan') yang dimasukkan ke kendali
    const itemMap = new Map();

    cacheItems.forEach(item => {
        if (item && item.id && item.status !== 'diagendakan') {
            itemMap.set(String(item.id), item);
        }
    });

    if (dbSuccess) {
        dbItems.forEach(item => {
            if (item && item.id) {
                if (item.status === 'diagendakan') {
                    // Bersihkan dari localDB jika ada sisa record diagendakan
                    try { localDB.kendaliSurat.delete(item.id).catch(() => {}); } catch (e) {}
                    itemMap.delete(String(item.id));
                } else {
                    const existing = itemMap.get(String(item.id));
                    if (existing) {
                        itemMap.set(String(item.id), {
                            ...existing,
                            ...item,
                            dataObj: (item.dataObj && Object.keys(item.dataObj).length > 0) ? item.dataObj : (existing.dataObj || {})
                        });
                    } else {
                        itemMap.set(String(item.id), item);
                    }
                }
            }
        });
    }

    kendaliSuratRows = Array.from(itemMap.values());
    kendaliSuratRows.sort((a, b) => new Date(b.waktuInput || 0) - new Date(a.waktuInput || 0));

    // Sinkronkan kembali ke localStorage secara aman
    try {
        localStorage.setItem('sidimas_kendali_surat', JSON.stringify(kendaliSuratRows));
    } catch (e) {
        try {
            const safeRows = kendaliSuratRows.map(r => {
                const copy = { ...r };
                if (copy.fileUrl && copy.fileUrl.length > 50000) delete copy.fileUrl;
                return copy;
            });
            localStorage.setItem('sidimas_kendali_surat', JSON.stringify(safeRows));
        } catch (e2) {}
    }

    return kendaliSuratRows;
}

async function simpanKendaliRecord(record) {
    if (!record || !record.id) return;

    // Jika statusnya diagendakan, hapus dari kendali karena resmi masuk ke agenda keluar
    if (record.status === 'diagendakan') {
        kendaliSuratRows = kendaliSuratRows.filter(r => String(r.id) !== String(record.id));
        try {
            if (typeof localDB !== 'undefined' && localDB.kendaliSurat) {
                await localDB.kendaliSurat.delete(record.id);
            }
        } catch (e) {}
        try {
            localStorage.setItem('sidimas_kendali_surat', JSON.stringify(kendaliSuratRows));
        } catch (e) {}
        updateKendaliBadge();
        return;
    }

    // Update atau tambahkan di memory rows
    const idx = kendaliSuratRows.findIndex(r => String(r.id) === String(record.id));
    if (idx >= 0) {
        kendaliSuratRows[idx] = { ...kendaliSuratRows[idx], ...record };
    } else {
        kendaliSuratRows.unshift(record);
    }

    // Pastikan tidak ada record diagendakan di tabel kendali
    kendaliSuratRows = kendaliSuratRows.filter(r => r.status !== 'diagendakan');

    // Simpan ke localDB (IndexedDB / SQLite)
    try {
        if (typeof localDB !== 'undefined' && localDB.kendaliSurat) {
            await localDB.kendaliSurat.put(record);
        }
    } catch (e) {
        console.warn('[Kendali Surat] Gagal simpan ke localDB:', e);
    }

    // Simpan ke localStorage dengan penanganan kuota
    try {
        localStorage.setItem('sidimas_kendali_surat', JSON.stringify(kendaliSuratRows));
    } catch (e) {
        console.warn('[Kendali Surat] Quota localStorage terlampaui, simpan versi ringan:', e);
        try {
            const safeRows = kendaliSuratRows.map(r => {
                const copy = { ...r };
                if (copy.fileUrl && copy.fileUrl.length > 50000) delete copy.fileUrl;
                return copy;
            });
            localStorage.setItem('sidimas_kendali_surat', JSON.stringify(safeRows));
        } catch (e2) {}
    }

    updateKendaliBadge();
}

// --- 2. PENYIMPANAN OTOMATIS SAAT NASKAH SELESAI DIGENERATE ---

async function simpanKeKendaliSurat(archiveData, statusAwal = 'draft') {
    const { dataObj, blob, filename, existingId } = archiveData || {};
    if (!blob) throw new Error('File hasil generate tidak tersedia.');

    const fileInfo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            name: filename,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            data: String(reader.result).split(',')[1]
        });
        reader.onerror = () => reject(reader.error || new Error('Gagal membaca file naskah.'));
        reader.readAsDataURL(blob);
    });

    const targetId = existingId || (typeof activeEditingKendaliId !== 'undefined' ? activeEditingKendaliId : null);
    const currentUser = localStorage.getItem('sidimas_user') || 'Admin';
    const currentRole = localStorage.getItem('sidimas_role') || 'staff';
    const templateName = String((dataObj && (dataObj.pilihJenisSurat || dataObj.templateId)) || '').replace(/^\d+\.\s*/, '').replace(/\.docx$/i, '').trim() || 'Surat Keluar';
    const perihal = (dataObj && dataObj.perihal) ? String(dataObj.perihal).trim() : templateName;
    const noSurat = (dataObj && dataObj.nomorFull) ? dataObj.nomorFull : ($('#previewNomor').text() || '-');
    const tglSurat = (dataObj && (dataObj.inpTglSaja || dataObj.inpTglSurat || dataObj.tanggalSuratFull)) || new Date().toISOString().slice(0, 10);
    const tujuan = (dataObj && (dataObj.tujuanNama || dataObj.tujuanJabatan || dataObj.tujuanTempat || dataObj.namaPihakKedua)) || 'Kepada Yth.';

    let record = null;
    if (targetId) {
        record = kendaliSuratRows.find(r => String(r.id) === String(targetId));
    }

    if (record) {
        // Mode Update Record (Revisi Naskah)
        record.tglSurat = tglSurat;
        record.waktuUpdate = new Date().toISOString();
        record.jenisSurat = templateName;
        record.noSurat = noSurat.trim();
        record.perihal = perihal.trim();
        record.tujuan = tujuan.trim();
        record.pembuat = currentUser;
        record.rolePembuat = currentRole;
        record.status = statusAwal; // biasanya 'draft'
        record.fileUrl = `data:${fileInfo.mimeType};base64,${fileInfo.data}`;
        record.fileInfoRaw = fileInfo;
        record.dataObj = dataObj || {};
        record.isRevisiEdited = true;
        record.revisiKe = (record.revisiKe || 0) + 1;
        record.sync_status = 'pending';
    } else {
        // Mode Record Baru
        const id = `KND_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        record = {
            id,
            tglSurat,
            waktuInput: new Date().toISOString(),
            jenisSurat: templateName,
            noSurat: noSurat.trim(),
            perihal: perihal.trim(),
            tujuan: tujuan.trim(),
            pembuat: currentUser,
            rolePembuat: currentRole,
            status: statusAwal, // 'draft' | 'menunggu' | 'revisi' | 'disetujui' | 'diagendakan'
            catatanKepsek: '',
            waktuTinjau: null,
            namaKepsek: '',
            fileUrl: `data:${fileInfo.mimeType};base64,${fileInfo.data}`,
            fileInfoRaw: fileInfo,
            dataObj: dataObj || {},
            sync_status: 'pending'
        };
    }

    await simpanKendaliRecord(record);

    // Jika sedang dalam mode revisi, sembunyikan banner revisi dan reset state aktif
    if (typeof batalModeRevisiSurat === 'function') {
        batalModeRevisiSurat(false);
    }

    return record;
}

// --- 3. BADGE MERAH NOTIFIKASI KENDALI SURAT ---

async function updateKendaliBadge() {
    const rows = await getKendaliSuratFromStorage();
    const role = (localStorage.getItem('sidimas_role') || 'admin').toLowerCase();

    // Untuk Kepala Sekolah: HANYA tampilkan jika role saat ini adalah kepsek
    const $badgeKepsekSidebar = $('#badgeKendaliSidebar');
    const $badgeKepsekMobile = $('#badgeKendaliMobile');

    if (role === 'kepsek') {
        const countKepsek = rows.filter(r => r.status === 'menunggu').length;
        if (countKepsek > 0) {
            $badgeKepsekSidebar.text(countKepsek).show().css('display', 'inline-block');
            $badgeKepsekMobile.text(countKepsek).show().css('display', 'inline-block');
        } else {
            $badgeKepsekSidebar.hide().css('display', 'none');
            $badgeKepsekMobile.hide().css('display', 'none');
        }
    } else {
        $badgeKepsekSidebar.hide().css('display', 'none');
        $badgeKepsekMobile.hide().css('display', 'none');
    }

    // Untuk Staf/Admin: jika ada surat yang 'revisi', munculkan badge merah di menu Buat Surat dan tab Kendali Surat
    const countRevisi = rows.filter(r => r.status === 'revisi').length;
    const $badgeBuatSurat = $('#badgeBuatSuratSidebar, #badgeBuatSuratMobile');
    const $badgeKendaliStafTab = $('#badgeKendaliStafTab, #badgeKendaliStaf, #badgeKendaliStafMobile');

    if (role !== 'kepsek' && countRevisi > 0) {
        $badgeBuatSurat.text(countRevisi).show().css('display', 'inline-block');
        $badgeKendaliStafTab.text(countRevisi).show().css('display', 'inline-block');
    } else {
        $badgeBuatSurat.hide().css('display', 'none');
        $badgeKendaliStafTab.hide().css('display', 'none');
    }
}

// --- 4. RENDER TABEL KENDALI SURAT (UNTUK STAF / ADMIN) ---

async function loadKendaliSuratTable(targetRole) {
    const rows = await getKendaliSuratFromStorage();
    const role = targetRole || (localStorage.getItem('sidimas_role') || 'admin').toLowerCase();

    if (role === 'kepsek') {
        renderTabelKendaliKepsek(rows);
    } else {
        renderTabelKendaliStaf(rows);
    }
    updateKendaliBadge();
}

function renderTabelKendaliStaf(rows) {
    const $tbody = $('#tbodyKendaliStaf');
    if (!$tbody.length) return;

    // Pastikan hanya naskah yang belum diagendakan yang tampil
    const activeRows = (rows || []).filter(r => r.status !== 'diagendakan');

    // Update Counter Filter
    const totalAll = activeRows.length;
    const totalDraft = activeRows.filter(r => r.status === 'draft').length;
    const totalMenunggu = activeRows.filter(r => r.status === 'menunggu').length;
    const totalRevisi = activeRows.filter(r => r.status === 'revisi').length;
    const totalDisetujui = activeRows.filter(r => r.status === 'disetujui').length;

    $('#cntStafAll').text(totalAll);
    $('#cntStafDraft').text(totalDraft);
    $('#cntStafMenunggu').text(totalMenunggu);
    $('#cntStafRevisi').text(totalRevisi);
    $('#cntStafDisetujui').text(totalDisetujui);
    if ($('#cntStafDiagendakan').length) $('#cntStafDiagendakan').text(0);

    // Filter Data
    let filtered = activeRows;
    if (currentKendaliFilterStaf !== 'all') {
        filtered = activeRows.filter(r => r.status === currentKendaliFilterStaf);
    }

    // Urutkan waktu terbaru di atas
    filtered.sort((a, b) => new Date(b.waktuInput || 0) - new Date(a.waktuInput || 0));

    if (filtered.length === 0) {
        $tbody.html(`
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="fas fa-folder-open fa-3x mb-2 text-secondary opacity-50"></i>
                    <div>Belum ada naskah surat pada kategori ini.</div>
                </td>
            </tr>
        `);
        return;
    }

    let html = '';
    filtered.forEach((r, idx) => {
        let statusBadge = '';
        if (r.status === 'draft') {
            statusBadge = '<span class="badge bg-secondary px-2 py-1"><i class="fas fa-pencil-alt me-1"></i>Draft (Belum Diajukan)</span>';
        } else if (r.status === 'menunggu') {
            statusBadge = '<span class="badge bg-warning text-dark px-2 py-1"><i class="fas fa-clock me-1"></i>Menunggu Tinjauan</span>';
        } else if (r.status === 'revisi') {
            statusBadge = '<span class="badge bg-danger px-2 py-1"><i class="fas fa-exclamation-triangle me-1"></i>Perlu Revisi</span>';
        } else if (r.status === 'disetujui') {
            statusBadge = '<span class="badge bg-success px-2 py-1"><i class="fas fa-check-circle me-1"></i>Disetujui (Paraf Digital)</span>';
        }

        let actionBtns = '';
        // 1. Tombol Pratinjau Dokumen
        actionBtns += `<button class="btn btn-sm btn-outline-primary me-1 mb-1" title="Pratinjau Dokumen" onclick="pratinjauDokumenKendali('${r.id}')"><i class="fas fa-eye"></i></button>`;

        // 2. Tombol Unduh File DOCX
        actionBtns += `<button class="btn btn-sm btn-outline-secondary me-1 mb-1" title="Unduh DOCX" onclick="unduhDokumenKendali('${r.id}')"><i class="fas fa-download"></i></button>`;

        // 3. Tombol Dinamis Sesuai Status
        if (r.status === 'draft') {
            actionBtns += `<button class="btn btn-sm btn-outline-warning text-dark me-1 mb-1" title="Lanjutkan Edit Draft" onclick="editNaskahSuratRevisi('${r.id}')"><i class="fas fa-edit"></i></button>`;
            actionBtns += `<button class="btn btn-sm btn-primary me-1 mb-1" title="Ajukan ke Kepala Sekolah" onclick="ajukanTinjauSurat('${r.id}')"><i class="fas fa-paper-plane me-1"></i>Ajukan</button>`;
            actionBtns += `<button class="btn btn-sm btn-outline-danger mb-1" title="Hapus Draft" onclick="hapusKendaliSurat('${r.id}')"><i class="fas fa-trash"></i></button>`;
        } else if (r.status === 'revisi') {
            actionBtns += `<button class="btn btn-sm btn-warning text-dark fw-bold me-1 mb-1 shadow-sm" title="Edit Naskah Surat yang Perlu Direvisi" onclick="editNaskahSuratRevisi('${r.id}')"><i class="fas fa-edit me-1"></i>Edit Naskah</button>`;
            actionBtns += `<button class="btn btn-sm btn-danger me-1 mb-1" title="Lihat Catatan Revisi Kepala Sekolah" onclick="lihatCatatanRevisi('${r.id}')"><i class="fas fa-comment-dots me-1"></i>Catatan</button>`;
            actionBtns += `<button class="btn btn-sm btn-outline-primary mb-1" title="Ajukan Ulang Setelah Diedit" onclick="ajukanTinjauSurat('${r.id}', true)"><i class="fas fa-paper-plane me-1"></i>Ajukan Ulang</button>`;
        } else if (r.status === 'disetujui') {
            actionBtns += `<button class="btn btn-sm btn-success mb-1" title="Masukkan ke Agenda Surat Keluar" onclick="agendakanSuratDisetujui('${r.id}')"><i class="fas fa-folder-plus me-1"></i>Agendakan</button>`;
        }

        html += `
            <tr>
                <td class="text-center fw-bold text-muted">${idx + 1}</td>
                <td class="small">${escapeInboxValue(r.tglSurat || '-')}</td>
                <td>
                    <div class="fw-bold text-dark">${escapeInboxValue(r.noSurat || '-')}</div>
                    <small class="text-muted"><i class="fas fa-file-alt me-1"></i>${escapeInboxValue(r.jenisSurat || '-')}</small>
                </td>
                <td>
                    <div class="fw-bold">${escapeInboxValue(r.perihal || '-')}</div>
                    <small class="text-muted"><i class="fas fa-user me-1"></i>Tujuan: ${escapeInboxValue(r.tujuan || '-')}</small>
                </td>
                <td><small class="badge bg-light text-dark border">${escapeInboxValue(r.pembuat || '-')}</small></td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center">${actionBtns}</td>
            </tr>
        `;
    });

    $tbody.html(html);
}

function filterKendaliStaf(status, btn) {
    currentKendaliFilterStaf = status;
    $('.filter-kendali-btn').removeClass('active btn-primary btn-secondary btn-warning btn-danger btn-success btn-info')
        .addClass('btn-outline-secondary');
    $(btn).removeClass('btn-outline-secondary btn-outline-primary btn-outline-warning btn-outline-danger btn-outline-success btn-outline-info')
        .addClass('active btn-primary');
    getKendaliSuratFromStorage().then(rows => renderTabelKendaliStaf(rows));
}

// --- 5. RENDER TABEL KENDALI SURAT (UNTUK KEPALA SEKOLAH) ---

function renderTabelKendaliKepsek(rows) {
    const $tbody = $('#tbodyKendaliKepsek');
    if (!$tbody.length) return;

    // Pastikan hanya naskah yang belum diagendakan dan bukan draft
    const activeRows = (rows || []).filter(r => r.status !== 'diagendakan' && r.status !== 'draft');

    // Hitung Stat Kepsek
    const totalMenunggu = activeRows.filter(r => r.status === 'menunggu').length;
    const totalRevisi = activeRows.filter(r => r.status === 'revisi').length;
    const totalDisetujui = activeRows.filter(r => r.status === 'disetujui').length;
    const totalSemua = activeRows.length;

    $('#statKepsekMenunggu').text(totalMenunggu);
    $('#statKepsekRevisi').text(totalRevisi);
    $('#statKepsekDisetujui').text(totalDisetujui);
    $('#statKepsekTotal').text(totalSemua);

    $('#cntKepsekAll').text(totalSemua);
    $('#cntKepsekMenunggu').text(totalMenunggu);
    $('#cntKepsekRevisi').text(totalRevisi);
    $('#cntKepsekDisetujui').text(totalDisetujui);

    // Filter untuk Kepsek
    let filtered = activeRows;
    if (currentKendaliFilterKepsek !== 'all') {
        filtered = activeRows.filter(r => r.status === currentKendaliFilterKepsek);
    }

    filtered.sort((a, b) => new Date(b.waktuInput || 0) - new Date(a.waktuInput || 0));

    if (filtered.length === 0) {
        $tbody.html(`
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="fas fa-check-circle fa-3x mb-2 text-success opacity-50"></i>
                    <div>Tidak ada pengajuan surat yang perlu ditinjau saat ini.</div>
                </td>
            </tr>
        `);
        return;
    }

    let html = '';
    filtered.forEach((r, idx) => {
        let statusBadge = '';
        if (r.status === 'menunggu') {
            statusBadge = '<span class="badge bg-warning text-dark px-2 py-1"><i class="fas fa-clock me-1"></i>Menunggu Tinjauan</span>';
        } else if (r.status === 'revisi') {
            statusBadge = '<span class="badge bg-danger px-2 py-1"><i class="fas fa-exclamation-triangle me-1"></i>Perlu Revisi</span>';
        } else if (r.status === 'disetujui') {
            statusBadge = '<span class="badge bg-success px-2 py-1"><i class="fas fa-check-circle me-1"></i>Disetujui (Paraf Digital)</span>';
        }

        let actionBtns = '';
        if (r.status === 'menunggu') {
            actionBtns = `<button class="btn btn-sm btn-primary fw-bold" onclick="bukaModalTinjauKepsek('${r.id}')"><i class="fas fa-file-signature me-1"></i>Tinjau & Beri Paraf</button>`;
        } else {
            actionBtns = `<button class="btn btn-sm btn-outline-primary me-1" title="Lihat Dokumen" onclick="pratinjauDokumenKendali('${r.id}')"><i class="fas fa-eye me-1"></i>Lihat</button>`;
            if (r.catatanKepsek) {
                actionBtns += `<button class="btn btn-sm btn-outline-secondary" title="Lihat Catatan" onclick="lihatCatatanRevisi('${r.id}')"><i class="fas fa-comment-alt"></i></button>`;
            }
        }

        html += `
            <tr>
                <td class="text-center fw-bold text-muted">${idx + 1}</td>
                <td class="small">${escapeInboxValue(r.tglSurat || '-')}</td>
                <td>
                    <div class="fw-bold text-dark">${escapeInboxValue(r.noSurat || '-')}</div>
                    <small class="text-muted"><i class="fas fa-file-alt me-1"></i>${escapeInboxValue(r.jenisSurat || '-')}</small>
                </td>
                <td>
                    <div class="fw-bold">${escapeInboxValue(r.perihal || '-')}</div>
                    <small class="text-muted"><i class="fas fa-user me-1"></i>Tujuan: ${escapeInboxValue(r.tujuan || '-')}</small>
                </td>
                <td><span class="badge bg-light text-dark border">${escapeInboxValue(r.pembuat || '-')}</span></td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center">${actionBtns}</td>
            </tr>
        `;
    });

    $tbody.html(html);
}

function filterKendaliKepsek(status, btn) {
    currentKendaliFilterKepsek = status;
    $('.filter-kendali-kepsek-btn').removeClass('active btn-primary btn-secondary btn-warning btn-danger btn-success')
        .addClass('btn-outline-secondary');
    $(btn).removeClass('btn-outline-secondary')
        .addClass('active btn-primary');
    getKendaliSuratFromStorage().then(rows => renderTabelKendaliKepsek(rows));
}

// --- 6. AKSI: AJUKAN TINJAU (STAF / ADMIN) ---

async function ajukanTinjauSurat(id, isRevisi = false) {
    const rows = await getKendaliSuratFromStorage();
    const record = rows.find(r => String(r.id) === String(id));
    if (!record) return;

    const confirm = await Swal.fire({
        title: isRevisi ? 'Ajukan Ulang ke Kepsek?' : 'Ajukan Tinjau Surat Keluar?',
        text: `Naskah "${record.perihal || record.noSurat}" akan dikirimkan ke akun Kepala Sekolah untuk ditinjau / paraf digital.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        confirmButtonText: '<i class="fas fa-paper-plane me-1"></i> Ya, Ajukan Sekarang!',
        cancelButtonText: 'Batal'
    });
    if (!confirm.isConfirmed) return;

    record.status = 'menunggu';
    record.waktuPengajuan = new Date().toISOString();
    await simpanKendaliRecord(record);

    Swal.fire({
        icon: 'success',
        title: 'Berhasil Diajukan!',
        text: 'Naskah surat telah masuk ke menu Kendali Surat Kepala Sekolah dan menunggu tinjauan/paraf digital.',
        timer: 2300,
        showConfirmButton: false
    });

    loadKendaliSuratTable('staf');
}

// --- 7. MODAL & PROSES TINJAUAN KEPALA SEKOLAH (PARAF DIGITAL) ---

async function bukaModalTinjauKepsek(id) {
    const rows = await getKendaliSuratFromStorage();
    const record = rows.find(r => String(r.id) === String(id));
    if (!record) return Swal.fire('Error', 'Data naskah tidak ditemukan.', 'error');

    currentTinjauRecord = record;

    $('#tinjauSuratId').val(record.id);
    $('#tinjauNoSurat').text(record.noSurat || '-');
    $('#tinjauJenisSurat').text(record.jenisSurat || '-');
    $('#tinjauPerihal').text(record.perihal || '-');
    $('#tinjauTujuan').text(record.tujuan || '-');
    $('#tinjauPembuat').text(record.pembuat || '-');
    $('#tinjauTgl').text(record.tglSurat || '-');

    $('input[name="tinjauKeputusan"][value="disetujui"]').prop('checked', true);
    updateHighlightRadioTinjau();
    $('#catatanTinjauKepsek').val('');
    $('#boxCatatanWajibLabel').addClass('d-none');

    // Tampilkan Pratinjau DOCX
    const $docxContainer = document.getElementById('docxTinjauContainer');
    $docxContainer.innerHTML = '<div class="text-center py-5 text-white"><div class="spinner-border text-light"></div><p class="mt-2 text-light small">Memuat visual dokumen naskah surat...</p></div>';

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalTinjauSuratKepsek')).show();

    try {
        let blob = null;
        if (record.fileUrl && record.fileUrl.startsWith('data:')) {
            blob = dataUriToBlob(record.fileUrl);
        } else if (record.fileInfoRaw && record.fileInfoRaw.data) {
            blob = dataUriToBlob(`data:${record.fileInfoRaw.mimeType};base64,${record.fileInfoRaw.data}`);
        }

        if (blob && typeof docx !== 'undefined' && docx.renderAsync) {
            $docxContainer.innerHTML = '';
            await docx.renderAsync(blob, $docxContainer);
            setTimeout(() => {
                sesuaikanUkuranDocxTinjau('fit');
            }, 120);
        } else {
            $docxContainer.innerHTML = '<div class="alert alert-warning m-3">Pratinjau dokumen DOCX tidak dapat dirender secara visual. Gunakan tombol Unduh Dokumen di atas untuk memeriksa file asli.</div>';
        }
    } catch (e) {
        console.warn('Gagal render docx di modal tinjau:', e);
        $docxContainer.innerHTML = '<div class="alert alert-warning m-3">Gagal memuat visual dokumen Word: ' + e.message + '</div>';
    }
}

async function submitTinjauanKepsek(e) {
    if (e) e.preventDefault();
    if (!currentTinjauRecord) return;

    const keputusan = $('input[name="tinjauKeputusan"]:checked').val() || 'disetujui';
    const catatan = ($('#catatanTinjauKepsek').val() || '').trim();

    if (keputusan === 'revisi' && !catatan) {
        return Swal.fire('Catatan Wajib Diisi', 'Jika memilih Perlu Revisi, mohon tuliskan catatan/bagian yang harus diperbaiki oleh staf.', 'warning');
    }

    const sSettings = JSON.parse(localStorage.getItem('sidimas_settings') || '{}');
    const namaKepsek = sSettings.kepsek_nama || $('#inKepsekNama').val() || $('#txtNamaKepsek').text() || localStorage.getItem('sidimas_nama') || 'Kepala Sekolah';

    currentTinjauRecord.status = keputusan;
    currentTinjauRecord.catatanKepsek = catatan;
    currentTinjauRecord.waktuTinjau = new Date().toISOString();
    currentTinjauRecord.namaKepsek = namaKepsek;

    await simpanKendaliRecord(currentTinjauRecord);

    bootstrap.Modal.getInstance(document.getElementById('modalTinjauSuratKepsek'))?.hide();

    if (keputusan === 'disetujui') {
        Swal.fire({
            icon: 'success',
            title: 'Surat Disetujui (Diparaf)',
            text: 'Naskah surat telah disetujui untuk dicetak, ditandatangani, dan dimasukkan ke Agenda Surat Keluar oleh staf.',
            timer: 2300,
            showConfirmButton: false
        });
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Catatan Revisi Terkirim',
            text: 'Catatan perbaikan telah disimpan dan dikirimkan kembali ke staf pembuat surat.',
            timer: 2300,
            showConfirmButton: false
        });
    }

    loadKendaliSuratTable('kepsek');
}

// --- 8. LIHAT CATATAN REVISI (STAF / KEPSEK) ---

async function lihatCatatanRevisi(id) {
    const rows = await getKendaliSuratFromStorage();
    const record = rows.find(r => String(r.id) === String(id));
    if (!record) return;

    $('#revCatatanNoSurat').text(record.noSurat || '-');
    $('#revCatatanPerihal').text(record.perihal || '-');
    $('#revCatatanWaktu').text(record.waktuTinjau ? new Date(record.waktuTinjau).toLocaleString('id-ID') : '-');
    $('#revCatatanKepsekNama').text(record.namaKepsek || 'Kepala Sekolah');
    $('#revCatatanIsi').text(record.catatanKepsek || 'Tidak ada catatan tertulis.');

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCatatanRevisi')).show();
}

// --- 9. AGENDAKAN SURAT YANG SUDAH DISETUJUI KE AGENDA SURAT KELUAR ---

async function agendakanSuratDisetujui(id) {
    const rows = await getKendaliSuratFromStorage();
    const record = rows.find(r => String(r.id) === String(id));
    if (!record) return;

    const confirm = await Swal.fire({
        title: 'Masukkan ke Agenda Surat Keluar?',
        text: `Surat "${record.noSurat}" yang telah disetujui Kepala Sekolah akan dicatat resmi ke Agenda Surat Keluar.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        confirmButtonText: '<i class="fas fa-folder-plus me-1"></i> Ya, Agendakan Sekarang!',
        cancelButtonText: 'Batal'
    });
    if (!confirm.isConfirmed) return;

    Swal.fire({ title: 'Mencatat ke Agenda Surat Keluar...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        let blob = null;
        if (record.fileUrl && record.fileUrl.startsWith('data:')) {
            blob = dataUriToBlob(record.fileUrl);
        } else if (record.fileInfoRaw && record.fileInfoRaw.data) {
            blob = dataUriToBlob(`data:${record.fileInfoRaw.mimeType};base64,${record.fileInfoRaw.data}`);
        }

        const archiveData = {
            dataObj: record.dataObj || {
                pilihJenisSurat: record.jenisSurat,
                perihal: record.perihal,
                nomorFull: record.noSurat,
                inpTglSaja: record.tglSurat,
                tujuanNama: record.tujuan
            },
            blob: blob,
            filename: record.fileInfoRaw ? record.fileInfoRaw.name : `Surat_${record.id}.docx`
        };

        if (typeof saveGeneratedLetterToOutgoing === 'function') {
            await saveGeneratedLetterToOutgoing(archiveData);
        }

        // Hapus dari localDB.kendaliSurat dan kendaliSuratRows karena naskah sudah resmi masuk ke Agenda Surat Keluar
        try {
            if (typeof localDB !== 'undefined' && localDB.kendaliSurat) {
                await localDB.kendaliSurat.delete(record.id);
            }
        } catch (e) {
            console.warn('[Kendali Surat] Gagal hapus dari localDB:', e);
        }

        kendaliSuratRows = kendaliSuratRows.filter(r => String(r.id) !== String(record.id));
        try {
            localStorage.setItem('sidimas_kendali_surat', JSON.stringify(kendaliSuratRows));
        } catch (e) { }

        Swal.close();
        Swal.fire({
            icon: 'success',
            title: 'Berhasil Masuk Agenda!',
            text: 'Surat telah resmi dicatat ke Agenda Surat Keluar dan telah dipindahkan dari daftar Kendali Surat.',
            confirmButtonText: 'Bagus'
        });

        loadKendaliSuratTable('staf');
        updateKendaliBadge();
    } catch (err) {
        Swal.close();
        Swal.fire('Gagal Mengagendakan', err.message || String(err), 'error');
    }
}

// --- 10. HAPUS & UNDUH DOKUMEN KENDALI SURAT ---

async function hapusKendaliSurat(id) {
    const confirm = await Swal.fire({
        title: 'Hapus Naskah Draft?',
        text: 'Naskah surat ini akan dihapus dari daftar kendali.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });
    if (!confirm.isConfirmed) return;

    try {
        if (typeof localDB !== 'undefined' && localDB.kendaliSurat) {
            await localDB.kendaliSurat.delete(id);
        }
    } catch (e) { }

    kendaliSuratRows = kendaliSuratRows.filter(r => String(r.id) !== String(id));
    localStorage.setItem('sidimas_kendali_surat', JSON.stringify(kendaliSuratRows));

    Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Naskah draft berhasil dihapus.', timer: 1500, showConfirmButton: false });
    loadKendaliSuratTable('staf');
}

async function unduhDokumenKendali(id) {
    const rows = await getKendaliSuratFromStorage();
    const record = rows.find(r => String(r.id) === String(id));
    if (!record) return;

    let blob = null;
    if (record.fileUrl && record.fileUrl.startsWith('data:')) {
        blob = dataUriToBlob(record.fileUrl);
    } else if (record.fileInfoRaw && record.fileInfoRaw.data) {
        blob = dataUriToBlob(`data:${record.fileInfoRaw.mimeType};base64,${record.fileInfoRaw.data}`);
    }

    if (!blob) return Swal.fire('Error', 'File naskah tidak tersedia.', 'error');

    const fileName = (record.fileInfoRaw && record.fileInfoRaw.name) ? record.fileInfoRaw.name : `Surat_${(record.noSurat || 'naskah').replace(/[^a-zA-Z0-9_\-]/g, '_')}.docx`;
    if (typeof saveAs !== 'undefined') {
        saveAs(blob, fileName);
    } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
    }
}

async function pratinjauDokumenKendali(id) {
    const rows = await getKendaliSuratFromStorage();
    const record = rows.find(r => String(r.id) === String(id));
    if (!record) return;

    let blob = null;
    let blobUrl = '';
    if (record.fileUrl && record.fileUrl.startsWith('data:')) {
        blob = dataUriToBlob(record.fileUrl);
        blobUrl = URL.createObjectURL(blob);
    } else if (record.fileInfoRaw && record.fileInfoRaw.data) {
        blob = dataUriToBlob(`data:${record.fileInfoRaw.mimeType};base64,${record.fileInfoRaw.data}`);
        blobUrl = URL.createObjectURL(blob);
    }

    if (!blob) return Swal.fire('Error', 'File tidak ditemukan.', 'error');

    const fileName = (record.fileInfoRaw && record.fileInfoRaw.name) ? record.fileInfoRaw.name : `Surat_${(record.noSurat || 'naskah').replace(/[^a-zA-Z0-9_\-]/g, '_')}.docx`;

    if (typeof openFilePreviewModal === 'function') {
        openFilePreviewModal({
            title: `Pratinjau Dokumen: ${record.noSurat || record.perihal}`,
            dataUrl: blobUrl,
            blob: blob,
            filename: fileName,
            typeBadge: 'DOCX'
        });
    }
}

// --- 11. HALAMAN PROFIL SAYA & UBAH PASSWORD (KHUSUS KEPALA SEKOLAH) ---

async function loadProfilKepsekPage() {
    const s = JSON.parse(localStorage.getItem('sidimas_settings') || '{}');
    const u = localStorage.getItem('sidimas_user') || 'kepsek-sman15tebo';

    const nama = s.kepsek_nama || $('#inKepsekNama').val() || $('#txtNamaKepsek').text() || localStorage.getItem('sidimas_nama') || 'Kepala Sekolah';
    const nip = s.kepsek_nip || $('#inKepsekNip').val() || '-';
    const pangkat = s.kepsek_pangkat || $('#inKepsekPangkat').val() || '-';
    const sekolah = s.nama_sekolah || $('#txtSekolah').text() || 'SMA NEGERI 15 TEBO';
    const instansi = s.nama_instansi || $('#txtInstansi').text() || 'PEMERINTAH PROVINSI JAMBI';

    $('#profKepsekNama').text(nama);
    $('#profKepsekNip').text(nip);
    $('#profKepsekPangkat').text(pangkat);
    $('#profKepsekSekolah').text(sekolah);
    $('#profKepsekInstansi').text(instansi);
    $('#profKepsekUsername').text(u);
}

async function simpanPasswordKepsek(e) {
    if (e) e.preventDefault();

    const pBaru = ($('#inpKepsekPassBaru').val() || '').trim();
    const pUlangi = ($('#inpKepsekPassUlangi').val() || '').trim();

    if (!pBaru) {
        return Swal.fire('Perhatian', 'Password baru tidak boleh kosong.', 'warning');
    }
    if (pBaru.length < 5) {
        return Swal.fire('Password Terlalu Pendek', 'Password baru minimal terdiri dari 5 karakter.', 'warning');
    }
    if (pBaru !== pUlangi) {
        return Swal.fire('Password Tidak Cocok', 'Kolom Password Baru dan Ulangi Password Baru harus bernilai sama persis.', 'warning');
    }

    const $btn = $('#btnSimpanPassKepsek');
    const oriHtml = $btn.html();
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan Password...');

    try {
        // 1. Simpan ke localStorage.sidimas_credentials
        let cred = {};
        try { cred = JSON.parse(localStorage.getItem('sidimas_credentials') || '{}'); } catch (_) { }
        cred.kepsek_password = pBaru;
        localStorage.setItem('sidimas_credentials', JSON.stringify(cred));

        // 2. Jika di Desktop Electron: Perbarui config-offline.js via IPC
        if (typeof window.sidimas !== 'undefined' && typeof window.sidimas.updateOfflinePassword === 'function') {
            await window.sidimas.updateOfflinePassword('kepsek', pBaru);
        }

        // 3. Jika Online: update ke Spreadsheet Users jika tersedia API
        if (typeof isAppOnline === 'function' && isAppOnline()) {
            try {
                const u = localStorage.getItem('sidimas_user') || 'kepsek-sman15tebo';
                await apiCall('ubahPassword', { u, p: pBaru, role: 'kepsek' });
            } catch (onlineErr) {
                console.warn('[Kendali Surat] Gagal sync ubah password online:', onlineErr);
            }
        }

        // 4. Reset Input Form
        $('#inpKepsekPassBaru').val('');
        $('#inpKepsekPassUlangi').val('');

        Swal.fire({
            icon: 'success',
            title: 'Password Berhasil Diubah!',
            text: 'Password baru Kepala Sekolah berhasil disimpan. Gunakan password ini untuk login berikutnya.',
            confirmButtonColor: '#0d6efd'
        });
    } catch (err) {
        Swal.fire('Gagal Mengubah Password', err.message || String(err), 'error');
    } finally {
        $btn.prop('disabled', false).html(oriHtml);
    }
}

function togglePassField(inputId, iconId) {
    const $input = $('#' + inputId);
    const $icon = $('#' + iconId);
    if ($input.attr('type') === 'password') {
        $input.attr('type', 'text');
        $icon.removeClass('fa-eye').addClass('fa-eye-slash');
    } else {
        $input.attr('type', 'password');
        $icon.removeClass('fa-eye-slash').addClass('fa-eye');
    }
}

let currentDocxTinjauZoom = 'fit';

function sesuaikanUkuranDocxTinjau(val) {
    const $container = $('#docxTinjauContainer');
    const $wrapper = $('#wrapperTinjauScroll');
    if (!$container.length || !$wrapper.length) return;

    const sections = $container.find('section.docx');
    if (!sections.length) return;

    let scale = 1;
    const wrapperWidth = Math.max(280, $wrapper.width() - 40);

    if (val === 'fit') {
        currentDocxTinjauZoom = 'fit';
        const secWidth = sections.first().outerWidth() || 794;
        scale = Math.min(1, wrapperWidth / secWidth);
        $('#lblZoomTinjau').text(`${Math.round(scale * 100)}% (Pas)`);
    } else {
        let num = 75;
        if (typeof currentDocxTinjauZoom === 'number') {
            num = currentDocxTinjauZoom;
        } else {
            const secWidth = sections.first().outerWidth() || 794;
            num = Math.round(Math.min(1, wrapperWidth / secWidth) * 100);
        }

        if (typeof val === 'number') {
            num = Math.max(40, Math.min(160, num + val));
        } else {
            num = parseInt(val, 10) || 100;
        }

        currentDocxTinjauZoom = num;
        scale = num / 100;
        $('#lblZoomTinjau').text(`${num}%`);
    }

    sections.each(function () {
        const sec = $(this);
        let origH = sec.data('orig-height');
        if (!origH) {
            origH = sec.outerHeight();
            sec.data('orig-height', origH);
        }

        sec.css({
            'transform': `scale(${scale})`,
            'transform-origin': 'top center',
            'margin-bottom': `${Math.max(10, (origH * (scale - 1)) + 20)}px`
        });
    });
}

function updateHighlightRadioTinjau() {
    const val = $('input[name="tinjauKeputusan"]:checked').val() || 'disetujui';
    $('.radio-tinjau-box').removeClass('active-setuju active-revisi border-success border-danger');
    if (val === 'disetujui') {
        $('label[for="keputusanSetuju"]').addClass('active-setuju border-success');
        $('#boxCatatanWajibLabel').addClass('d-none');
        $('#catatanTinjauKepsek').attr('placeholder', 'Catatan arahan persetujuan (opsional)...');
    } else if (val === 'revisi') {
        $('label[for="keputusanRevisi"]').addClass('active-revisi border-danger');
        $('#boxCatatanWajibLabel').removeClass('d-none');
        $('#catatanTinjauKepsek').attr('placeholder', 'Wajib ketikkan bagian/kalimat yang harus diperbaiki oleh staf...').focus();
    }
}

// --- 11. FITUR REVISI NASKAH: POPULATE FORM GENERATOR DENGAN DATA LAMA ---

function cariOptionTemplate(valOrText) {
    if (!valOrText) return '';
    const clean = String(valOrText).toLowerCase()
        .replace(/^\d+\.\s*/, '')
        .replace(/\.docx$/i, '')
        .trim();

    let matchedVal = '';
    // 1. Cek exact value
    $('#pilihJenisSurat option').each(function () {
        if ($(this).val() === valOrText) {
            matchedVal = $(this).val();
            return false;
        }
    });
    if (matchedVal) return matchedVal;

    // 2. Cek text atau value yang dibersihkan (tanpa nomor depan dan ekstensi .docx)
    $('#pilihJenisSurat option').each(function () {
        const optVal = $(this).val();
        if (!optVal) return;
        const optClean = optVal.toLowerCase().replace(/^\d+\.\s*/, '').replace(/\.docx$/i, '').trim();
        const optTxtClean = $(this).text().toLowerCase().replace(/^\d+\.\s*/, '').replace(/\.docx$/i, '').trim();

        if (optClean === clean || optTxtClean === clean) {
            matchedVal = optVal;
            return false;
        }
    });
    if (matchedVal) return matchedVal;

    // 3. Cek partial match (includes)
    $('#pilihJenisSurat option').each(function () {
        const optVal = $(this).val();
        if (!optVal) return;
        const optClean = optVal.toLowerCase().replace(/^\d+\.\s*/, '').replace(/\.docx$/i, '').trim();
        const optTxtClean = $(this).text().toLowerCase().replace(/^\d+\.\s*/, '').replace(/\.docx$/i, '').trim();

        if (clean.includes(optClean) || optClean.includes(clean) || clean.includes(optTxtClean) || optTxtClean.includes(clean)) {
            matchedVal = optVal;
            return false;
        }
    });
    return matchedVal;
}

async function editNaskahSuratRevisi(id) {
    if (!id) return;
    const rows = await getKendaliSuratFromStorage();
    const record = rows.find(r => String(r.id) === String(id));
    if (!record) {
        return Swal.fire('Data Tidak Ditemukan', 'Naskah surat yang akan diedit tidak ditemukan di penyimpanan.', 'error');
    }

    activeEditingKendaliId = record.id;

    // 1. Pindah Tampilan ke Tab "Buat Naskah Surat"
    if (typeof nav === 'function') {
        nav('buat');
    }
    const tabNaskahBtn = document.getElementById('tab-naskah-btn');
    if (tabNaskahBtn) {
        bootstrap.Tab.getOrCreateInstance(tabNaskahBtn).show();
    }

    // 2. Tampilkan Banner Indikator Mode Revisi di Atas Form
    $('#bannerRevNoSurat').text('No. Surat: ' + (record.noSurat || '-'));
    $('#bannerRevPerihal').text(record.perihal || '-');
    $('#bannerRevKepsekNama').text(record.namaKepsek || 'Kepala Sekolah');
    $('#bannerRevCatatan').text(record.catatanKepsek || 'Tidak ada catatan tertulis khusus dari Kepala Sekolah.');
    $('#bannerModeRevisiSurat').removeClass('d-none').show();

    // 3. Ubah Teks Tombol Generate Menjadi Indikator Revisi
    $('#btnGen span:first').html('<i class="fas fa-save me-1"></i> SIMPAN & PERBARUI NASKAH REVISI');
    $('#btnGen').removeClass('btn-success').addClass('btn-warning text-dark');

    // 4. Pilih Jenis Template Surat Sesuai Data Naskah
    const dataObj = record.dataObj || {};
    let targetTemplate = cariOptionTemplate(dataObj.templateId) ||
                         cariOptionTemplate(dataObj.pilihJenisSurat) ||
                         cariOptionTemplate(record.jenisSurat);

    if (targetTemplate) {
        $('#pilihJenisSurat').val(targetTemplate);
    }
    if (typeof gantiFormSurat === 'function') {
        gantiFormSurat();
    }

    const $activeBox = $('.form-box:not(.d-none)');

    // 5. Format Nomor Surat & Bulan
    const fmt = dataObj.formatNomor || 'format1';
    $(`input[name="formatNomor"][value="${fmt}"]`).prop('checked', true);

    if (dataObj.switchBulan !== undefined) {
        const useBulan = (dataObj.switchBulan === 'on' || dataObj.switchBulan === true || dataObj.switchBulan === 'true');
        $('#switchBulan').prop('checked', useBulan);
        if ($('#lblStatusBulan').length) {
            $('#lblStatusBulan').text(useBulan ? 'ON' : 'OFF').attr('class', useBulan ? 'text-success' : 'text-secondary');
        }
    }

    // 6. Kode Klasifikasi / Arsip
    const kodeArsip = dataObj.kodeKlasifikasi || dataObj.selKodeArsip || '';
    if (kodeArsip) {
        if ($(`#selKodeArsip option[value="${kodeArsip}"]`).length === 0) {
            const newOpt = new Option(kodeArsip, kodeArsip, true, true);
            $('#selKodeArsip').append(newOpt);
        }
        $('#selKodeArsip').val(kodeArsip).trigger('change');
    }

    // 7. Nomor Urut
    let noUrut = dataObj.inpNoUrut;
    if (!noUrut && record.noSurat) {
        const parts = record.noSurat.split('/');
        for (let p of parts) {
            p = p.trim();
            if (/^\d{2,5}$/.test(p)) {
                noUrut = p;
                break;
            }
        }
    }
    if (noUrut) {
        $('#inpNoUrut').val(noUrut);
    }

    // 8. Tanggal Surat
    const tglVal = dataObj.inpTglSurat || dataObj.inpTglSaja || record.tglSurat;
    if (tglVal) {
        $('#inpTglSurat').val(tglVal);
        $('#inpTglSaja').val(tglVal);
        if (typeof updateTanggalSurat === 'function') updateTanggalSurat();
        if (typeof updateTanggalSaja === 'function') updateTanggalSaja();
    }

    // 9. Mode Khusus Radio (SPT / Suket / Siswa)
    if (dataObj.modeSpt) {
        $(`input[name="modeSpt"][value="${dataObj.modeSpt}"]`).prop('checked', true);
        if (typeof toggleModeSpt === 'function') toggleModeSpt();
    }
    if (dataObj.modeSuket) {
        $(`input[name="modeSuket"][value="${dataObj.modeSuket}"]`).prop('checked', true);
        if (typeof toggleModeSuket === 'function') toggleModeSuket();
    }
    if (dataObj.modeSis) {
        $(`input[name="modeSis"][value="${dataObj.modeSis}"]`).prop('checked', true);
        if (typeof toggleModeSis === 'function') toggleModeSis();
    }

    // 10. Status Khusus Atas Nama (a.n.)
    if (dataObj.useAtasNama === 'on' || dataObj.useAtasNama === true || dataObj.useAtasNama === 'true') {
        $('#switchAtasNama').prop('checked', true);
    } else {
        $('#switchAtasNama').prop('checked', false);
    }
    if (typeof toggleAtasNama === 'function') {
        toggleAtasNama();
    }

    // 11. Isi Otomatis Semua Field Form dari dataObj
    Object.keys(dataObj).forEach(key => {
        const val = dataObj[key];
        if (val === undefined || val === null || typeof val === 'object') return;

        // Prioritas cari di form-box yang sedang aktif
        let $el = $activeBox.find(`[name="${key}"]`);
        if (!$el.length) {
            $el = $(`#formGen [name="${key}"]`);
        }

        if ($el.length) {
            const type = $el.attr('type');
            if (type === 'radio') {
                $el.filter(`[value="${val}"]`).prop('checked', true).trigger('change');
            } else if (type === 'checkbox') {
                $el.prop('checked', val === 'on' || val === true || val === 'true').trigger('change');
            } else {
                $el.val(val);
            }
            return;
        }

        // Fallback pencarian dengan ID
        const $byKey = $(`#${key}`);
        if ($byKey.length && !$byKey.is(':radio') && !$byKey.is(':checkbox')) {
            $byKey.val(val);
        }
    });

    // 12. Fallback Jika Field Identitas di Active Box Masih Kosong
    if (record.tujuan) {
        const $elTujuan = $activeBox.find('[name="tujuanNama"], [name="siswaNama"]');
        if ($elTujuan.length && !$elTujuan.val()) {
            $elTujuan.val(record.tujuan);
        }
    }
    if (record.perihal) {
        const $elPerihal = $activeBox.find('[name="perihal"]');
        if ($elPerihal.length && !$elPerihal.val()) {
            $elPerihal.val(record.perihal);
        }
    }

    // 13. Pulihkan Tabel Kolektif Siswa
    let sisList = [];
    if (dataObj.kolektifSisRows) {
        try {
            sisList = typeof dataObj.kolektifSisRows === 'string' ? JSON.parse(dataObj.kolektifSisRows) : dataObj.kolektifSisRows;
        } catch (e) { }
    } else if (Array.isArray(dataObj['kolSisNama[]'])) {
        const namas = dataObj['kolSisNama[]'];
        const niss = dataObj['kolSisNis[]'] || [];
        const ttls = dataObj['kolSisTtl[]'] || [];
        const jks = dataObj['kolSisJk[]'] || [];
        const kelass = dataObj['kolSisKelas[]'] || [];
        const ortus = dataObj['kolSisOrtu[]'] || [];
        const kets = dataObj['kolSisKet[]'] || [];
        namas.forEach((nm, idx) => {
            sisList.push({
                nama: nm,
                nis: niss[idx] || '',
                ttl: ttls[idx] || '',
                jk: jks[idx] || 'Laki-laki',
                kelas: kelass[idx] || '',
                ortu: ortus[idx] || '',
                ket: kets[idx] || ''
            });
        });
    }

    if (Array.isArray(sisList) && sisList.length > 0) {
        let tbodyHtml = '';
        sisList.forEach(s => {
            const isLk = (s.jk || '').toLowerCase().includes('laki') || s.jk === 'Laki-laki';
            tbodyHtml += `
                <tr>
                    <td><input type="text" class="form-control form-control-sm" name="kolSisNama[]" value="${String(s.nama || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSisNis[]" value="${String(s.nis || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSisTtl[]" value="${String(s.ttl || '').replace(/"/g, '&quot;')}"></td>
                    <td><select class="form-select form-select-sm" name="kolSisJk[]">
                        <option value="Laki-laki"${isLk ? ' selected' : ''}>Laki-laki</option>
                        <option value="Perempuan"${!isLk ? ' selected' : ''}>Perempuan</option>
                    </select></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSisKelas[]" value="${String(s.kelas || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSisOrtu[]" value="${String(s.ortu || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSisKet[]" value="${String(s.ket || '').replace(/"/g, '&quot;')}"></td>
                    <td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
                </tr>
            `;
        });
        if (tbodyHtml) {
            $('#tblSisKolektif tbody').html(tbodyHtml);
        }
    }

    // 14. Pulihkan Tabel Kolektif SPT Pegawai
    let sptList = [];
    if (dataObj.kolektifSptRows) {
        try {
            sptList = typeof dataObj.kolektifSptRows === 'string' ? JSON.parse(dataObj.kolektifSptRows) : dataObj.kolektifSptRows;
        } catch (e) { }
    } else if (Array.isArray(dataObj['kolSptNama[]'])) {
        const namas = dataObj['kolSptNama[]'];
        const nips = dataObj['kolSptNip[]'] || [];
        const pangkats = dataObj['kolSptPangkat[]'] || [];
        const jabatans = dataObj['kolSptJabatan[]'] || [];
        const kets = dataObj['kolSptKet[]'] || [];
        namas.forEach((nm, idx) => {
            sptList.push({
                nama: nm,
                nip: nips[idx] || '',
                pangkat: pangkats[idx] || '',
                jabatan: jabatans[idx] || '',
                ket: kets[idx] || ''
            });
        });
    }

    if (Array.isArray(sptList) && sptList.length > 0) {
        let tbodyHtml = '';
        sptList.forEach(p => {
            tbodyHtml += `
                <tr>
                    <td><input type="text" class="form-control form-control-sm" name="kolSptNama[]" value="${String(p.nama || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSptNip[]" value="${String(p.nip || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSptPangkat[]" value="${String(p.pangkat || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSptJabatan[]" value="${String(p.jabatan || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSptKet[]" value="${String(p.ket || '').replace(/"/g, '&quot;')}"></td>
                    <td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
                </tr>
            `;
        });
        if (tbodyHtml) {
            $('#tblSptKolektif tbody').html(tbodyHtml);
        }
    }

    // 15. Pulihkan Tabel Kolektif Suket Pegawai
    let suketList = [];
    if (dataObj.kolektifSuketRows) {
        try {
            suketList = typeof dataObj.kolektifSuketRows === 'string' ? JSON.parse(dataObj.kolektifSuketRows) : dataObj.kolektifSuketRows;
        } catch (e) { }
    } else if (Array.isArray(dataObj['kolSuketNama[]'])) {
        const namas = dataObj['kolSuketNama[]'];
        const nips = dataObj['kolSuketNip[]'] || [];
        const pangkats = dataObj['kolSuketPangkat[]'] || [];
        const jabatans = dataObj['kolSuketJabatan[]'] || [];
        const kets = dataObj['kolSuketKet[]'] || [];
        namas.forEach((nm, idx) => {
            suketList.push({
                nama: nm,
                nip: nips[idx] || '',
                pangkat: pangkats[idx] || '',
                jabatan: jabatans[idx] || '',
                ket: kets[idx] || ''
            });
        });
    }

    if (Array.isArray(suketList) && suketList.length > 0) {
        let tbodyHtml = '';
        suketList.forEach(p => {
            tbodyHtml += `
                <tr>
                    <td><input type="text" class="form-control form-control-sm" name="kolSuketNama[]" value="${String(p.nama || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSuketNip[]" value="${String(p.nip || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSuketPangkat[]" value="${String(p.pangkat || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSuketJabatan[]" value="${String(p.jabatan || '').replace(/"/g, '&quot;')}"></td>
                    <td><input type="text" class="form-control form-control-sm" name="kolSuketKet[]" value="${String(p.ket || '').replace(/"/g, '&quot;')}"></td>
                    <td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
                </tr>
            `;
        });
        if (tbodyHtml) {
            $('#tblSuketKolektif tbody').html(tbodyHtml);
        }
    }

    // 16. Tabel Dinamis Lampiran (jika ada)
    if (dataObj.dataTabelLampiran) {
        try {
            const tableData = JSON.parse(dataObj.dataTabelLampiran);
            if (Array.isArray(tableData) && tableData.length > 0) {
                const headers = tableData[0];
                const rows = tableData.slice(1);

                let theadHtml = '<tr>';
                headers.forEach(h => {
                    theadHtml += `<th><input type="text" class="form-control form-control-sm fw-bold" value="${String(h || '').replace(/"/g, '&quot;')}"></th>`;
                });
                theadHtml += '</tr>';
                $('#tblDynamicLampiran thead').html(theadHtml);

                let tbodyHtml = '';
                rows.forEach((row, ri) => {
                    tbodyHtml += '<tr>';
                    row.forEach((cell, ci) => {
                        const centerClass = ci === 0 ? ' text-center' : '';
                        tbodyHtml += `<td><input type="text" class="form-control form-control-sm${centerClass}" value="${String(cell || '').replace(/"/g, '&quot;')}"></td>`;
                    });
                    tbodyHtml += '</tr>';
                });
                if (tbodyHtml) $('#tblDynamicLampiran tbody').html(tbodyHtml);
            }
        } catch (e) {
            console.warn('[Kendali Surat] Gagal parse dataTabelLampiran:', e);
        }
    }

    // 17. Pengaturan Kop & Orientasi
    if (dataObj.tanpaKop === 'ya' || dataObj.tanpaKop === true || dataObj.tanpaKop === 'on') {
        $('#inTanpaKop').prop('checked', true);
    } else {
        $('#inTanpaKop').prop('checked', false);
    }
    if (dataObj.orientasiHalaman) {
        $('[name="orientasiHalaman"]').val(dataObj.orientasiHalaman);
    }

    // 18. Perbarui Pratinjau Nomor & Live Preview
    if (typeof updatePreview === 'function') {
        updatePreview();
    }
    if (record.noSurat) {
        $('#previewNomor').text(record.noSurat);
        $('#nomorFull').val(record.noSurat);
    }
    if (typeof updateLiveSuratPreview === 'function') {
        updateLiveSuratPreview();
    }

    // 19. Smooth scroll ke bagian atas form generator
    const $targetScroll = $('#tab-naskah-content');
    if ($targetScroll.length) {
        $('html, body').animate({
            scrollTop: $targetScroll.offset().top - 40
        }, 350);
    }

    // 20. Notifikasi Toast
    Swal.fire({
        icon: 'info',
        title: 'Mode Revisi Aktif',
        html: `Data naskah <b>${escapeInboxValue(record.noSurat || '-')}</b> berhasil dimuat.<br><small class="text-danger">Silakan sesuaikan isi surat sesuai arahan Kepala Sekolah di banner atas.</small>`,
        timer: 3500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
}

function batalModeRevisiSurat(clearForm = true) {
    activeEditingKendaliId = null;
    $('#bannerModeRevisiSurat').addClass('d-none').hide();
    $('#btnGen span:first').html('GENERATE DOKUMEN');
    $('#btnGen').removeClass('btn-warning text-dark').addClass('btn-success');

    if (clearForm) {
        if (typeof resetGenerator === 'function') {
            resetGenerator();
        }
        Swal.fire({
            icon: 'info',
            title: 'Mode Revisi Dibatalkan',
            text: 'Formulir telah direset untuk membuat surat baru.',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }
}

// Inisialisasi saat window dimuat
$(document).ready(function () {
    setTimeout(() => {
        updateKendaliBadge();
    }, 1200);

    // Event listener saat radio tinjauan berubah
    $(document).on('change', 'input[name="tinjauKeputusan"]', function () {
        updateHighlightRadioTinjau();
    });

    // Sesuaikan dokumen saat window di-resize
    $(window).on('resize', function () {
        if ($('#modalTinjauSuratKepsek').hasClass('show') && currentDocxTinjauZoom === 'fit') {
            sesuaikanUkuranDocxTinjau('fit');
        }
    });

    // Sesuaikan dokumen otomatis saat modal tinjau selesai terbuka
    const modalEl = document.getElementById('modalTinjauSuratKepsek');
    if (modalEl) {
        modalEl.addEventListener('shown.bs.modal', function () {
            setTimeout(() => {
                sesuaikanUkuranDocxTinjau('fit');
            }, 80);
        });
    }
});
