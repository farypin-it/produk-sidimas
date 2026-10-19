/* --- KODE KLASIFIKASI CUSTOM --- */
async function loadKodeKlasifikasi() {
    const sumber = $('input[name="sumberKode"]:checked').val() || 'permendagri';
    let o = '<option value="">-- Pilih Kode (Ketik untuk mencari...) --</option>';

    if (sumber === 'permendagri') {
        const list = (typeof KODE_KLASIFIKASI_LOKAL !== 'undefined' ? KODE_KLASIFIKASI_LOKAL : (typeof window !== 'undefined' ? window.KODE_KLASIFIKASI_LOKAL : null)) || [];
        if (list && list.length > 0) {
            list.forEach(k => o += `<option value="${k.c}">${k.l}</option>`);
        } else {
            o = '<option value="">-- Gagal Memuat Kode Permendagri --</option>';
        }
    } else {
        try {
            const customCodes = (typeof localDB !== 'undefined' && localDB.kodeCustom) ? await localDB.kodeCustom.toArray() : [];
            if (customCodes && customCodes.length > 0) {
                customCodes.forEach(k => o += `<option value="${k.kode}">${k.kode} - ${k.uraian}</option>`);
            } else {
                o = '<option value="">-- Belum Ada Kode Klasifikasi Daerah --</option>';
            }
        } catch (e) {
            console.error('Gagal meload kode custom:', e);
            o = '<option value="">-- Gagal Memuat Kode Daerah --</option>';
        }
    }

    const $sel = $('#selKodeArsip');
    const $inJenisK = $('#inJenisK'); // Tambahkan inJenisK (Form Surat Keluar)
    const valLama = $sel.val();
    const valLamaJenisK = $inJenisK.val();

    // Hancurkan instance Select2 lama jika sudah ada agar data adapter baru ter-generate dengan benar
    if ($sel.data('select2') || $sel.hasClass('select2-hidden-accessible')) {
        try {
            $sel.select2('destroy');
        } catch (e) {
            console.warn('Select2 destroy error:', e);
        }
    }
    
    if ($inJenisK.data('select2') || $inJenisK.hasClass('select2-hidden-accessible')) {
        try { $inJenisK.select2('destroy'); } catch (e) {}
    }
    
    // Perbarui isi select
    $sel.empty().append(o);
    $inJenisK.empty().append(o);

    // Inisialisasi ulang Select2 dengan opsi terbaru
    try {
        $sel.select2({
            theme: 'bootstrap-5',
            width: 'resolve',
            placeholder: '-- Pilih Kode (Ketik untuk mencari...) --',
            allowClear: true
        });

        // Pastikan perubahan nilai langsung memperbarui nomor surat
        $sel.off('select2:select.update change.update').on('select2:select.update change.update', function () {
            if (typeof updatePreview === 'function') updatePreview();
            if (typeof updateLiveSuratPreview === 'function') updateLiveSuratPreview();
        });

        if (valLama && $sel.find(`option[value="${valLama}"]`).length > 0) {
            $sel.val(valLama).trigger('change');
        } else {
            $sel.trigger('change');
        }

        // Untuk inJenisK, kita hancurkan jika ada, lalu akan di-reinit saat modal terbuka
        if ($inJenisK.hasClass('select2-hidden-accessible')) {
            $inJenisK.select2('destroy');
        }
        
        if (valLamaJenisK && $inJenisK.find(`option[value="${valLamaJenisK}"]`).length > 0) {
            $inJenisK.val(valLamaJenisK);
        }
    } catch (e) {
        console.warn('Select2 init error:', e);
    }
}

// Inisialisasi Select2 inJenisK HANYA ketika modal benar-benar terbuka (menghindari bug 0px & focus trap Bootstrap)
$(document).on('shown.bs.modal', '#modalSurat', function () {
    try {
        $('#inJenisK').select2({
            theme: 'bootstrap-5',
            dropdownParent: $('#modalSurat'),
            placeholder: '-- Pilih Klasifikasi --',
            allowClear: true
        }).off('select2:select').on('select2:select', function(e) {
            // Jika user memilih klasifikasi, dan Nomor Surat masih kosong, otomatis isikan kode-nya
            let val = $(this).val();
            let currentNo = $('#inNoSuratK').val();
            if (val && !currentNo) {
                $('#inNoSuratK').val(val + "/.../...");
            }
        });
    } catch(e) {}
});


async function loadKodeCustomTable() {
    let tbody = '';
    try {
        const customCodes = await localDB.kodeCustom.toArray();
        if (customCodes && customCodes.length > 0) {
            customCodes.forEach((k, index) => {
                tbody += `<tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="fw-bold">${k.kode}</td>
                    <td>${k.uraian}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editKodeCustom('${k.id}', '${k.kode}', '${k.uraian}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="hapusKodeCustom('${k.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            });
        } else {
            tbody = '<tr><td colspan="4" class="text-center text-muted">Belum ada data kode klasifikasi daerah.</td></tr>';
        }
    } catch (e) {
        tbody = '<tr><td colspan="4" class="text-center text-danger">Gagal memuat data kode klasifikasi daerah.</td></tr>';
    }
    $('#tbody-kodecustom').html(tbody);
}

function editKodeCustom(id, kode, uraian) {
    $('#kc_id').val(id);
    $('#kc_kode').val(kode);
    $('#kc_uraian').val(uraian);
    $('#kc_kode').focus();
}

async function readLocalSettings() {
    try {
        const rows = await localDB.appSettings.toArray();
        const found = rows.find(row => row.id === 'config');
        if (found && found.data) return typeof found.data === 'string' ? JSON.parse(found.data) : found.data;
    } catch (e) { }
    try { return JSON.parse(localStorage.getItem('sidimas_settings') || '{}'); }
    catch (e) { return {}; }
}

async function saveSettingPatchLocally(settings, payload) {
    await localDB.appSettings.put({ id: 'config', data: JSON.stringify(settings) });
    localStorage.setItem('sidimas_settings', JSON.stringify(settings));
    const queueId = await localDB.antrianSync.put({ action: 'saveSettings', payload, status: 'pending' });
    let savedOnline = false;
    if (isAppOnline()) {
        try {
            const response = await apiCall('saveSettings', payload);
            savedOnline = Boolean(response && response.success);
            if (savedOnline && queueId !== undefined) await localDB.antrianSync.delete(queueId);
        } catch (error) {
            console.warn('[SiDiMAS] Pengaturan tersimpan lokal dan menunggu sync:', error);
        }
    }
    return savedOnline;
}

async function simpanKodeLembaga() {
    const kode = ($('#inKodeLembaga').val() || '').trim();
    if (!kode) return Swal.fire('Perhatian', 'Ketik Kode Lembaga terlebih dahulu.', 'warning');
    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const settings = await readLocalSettings();
        settings.kode_lembaga = kode;
        const savedOnline = await saveSettingPatchLocally(settings, { kodeLembaga: kode });
        renderAppAttributes(settings);
        Swal.close();
        Swal.fire({
            icon: savedOnline ? 'success' : 'warning',
            title: savedOnline ? 'Kode Lembaga Disimpan' : 'Tersimpan Lokal',
            text: savedOnline ? 'Kode berhasil disimpan lokal dan ke Spreadsheet.' : `Kode "${kode}" aman di lokal dan akan dicoba sync otomatis.`,
            timer: 1800,
            showConfirmButton: false
        });
    } catch (error) {
        Swal.fire('Error', 'Gagal menyimpan pengaturan lokal: ' + error.message, 'error');
    }
}

async function simpanPimpinan() {
    const nama = ($('#inKepsekNama').val() || '').trim();
    const nip = ($('#inKepsekNip').val() || '').trim();
    const pangkat = ($('#inKepsekPangkat').val() || '').trim();
    if (!nama) return Swal.fire('Perhatian', 'Nama Kepala Sekolah wajib diisi.', 'warning');

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const settings = await readLocalSettings();
        settings.kepsek_nama = nama;
        settings.kepsek_nip = nip;
        settings.kepsek_pangkat = pangkat;
        const payload = { kepsekNama: nama, kepsekNip: nip, kepsekPangkat: pangkat };
        const savedOnline = await saveSettingPatchLocally(settings, payload);
        renderAppAttributes(settings);
        Swal.close();
        Swal.fire({
            icon: savedOnline ? 'success' : 'warning',
            title: savedOnline ? 'Disimpan' : 'Tersimpan Lokal',
            text: savedOnline ? 'Data pimpinan tersimpan lokal dan ke Spreadsheet.' : 'Data pimpinan aman di lokal dan akan dicoba sync otomatis.',
            timer: 1800,
            showConfirmButton: false
        });
    } catch (error) {
        Swal.fire('Error', 'Gagal menyimpan pengaturan lokal: ' + error.message, 'error');
    }
}

async function simpanKodeCustom(e) {
    e.preventDefault();
    let id = $('#kc_id').val();
    if (!id) id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'kc_' + Date.now() + Math.random().toString(36).substring(2);
    const payload = { id, kode: ($('#kc_kode').val() || '').trim(), uraian: ($('#kc_uraian').val() || '').trim() };
    if (!payload.kode || !payload.uraian) return Swal.fire('Perhatian', 'Kode dan uraian klasifikasi tidak boleh kosong.', 'warning');

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        await localDB.kodeCustom.put(payload);
        const queueId = await localDB.antrianSync.put({ action: 'saveKodeCustom', payload, status: 'pending' });
        let savedOnline = false;
        if (isAppOnline()) {
            try {
                const response = await apiCall('saveKodeCustom', payload);
                savedOnline = Boolean(response && response.success);
                if (savedOnline && queueId !== undefined) await localDB.antrianSync.delete(queueId);
            } catch (error) {
                console.warn('[SiDiMAS] Kode custom menunggu sync:', error);
            }
        }
        $('#kc_id, #kc_kode, #kc_uraian').val('');
        await loadKodeCustomTable();
        Swal.fire({ icon: savedOnline ? 'success' : 'warning', title: savedOnline ? 'Tersimpan' : 'Tersimpan Lokal', text: savedOnline ? 'Kode klasifikasi tersimpan di Spreadsheet.' : 'Kode klasifikasi aman di lokal dan akan dicoba sync otomatis.', timer: 1500, showConfirmButton: false });
        if (!$('#page-buat').hasClass('hide')) loadKodeKlasifikasi();
    } catch (error) {
        Swal.fire('Error', 'Gagal menyimpan kode: ' + error.message, 'error');
    }
}

async function hapusKodeCustom(id) {
    Swal.fire({ title: 'Hapus Kode?', text: 'Kode ini akan dihapus dari sistem.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus!' }).then(async result => {
        if (!result.isConfirmed) return;
        Swal.showLoading();
        try {
            const queueId = await localDB.antrianSync.put({ action: 'deleteKodeCustom', payload: { id }, status: 'pending' });
            await localDB.kodeCustom.delete(id);
            let deletedOnline = false;
            if (isAppOnline()) {
                try {
                    const response = await apiCall('deleteKodeCustom', { id });
                    deletedOnline = Boolean(response && response.success);
                    if (deletedOnline && queueId !== undefined) await localDB.antrianSync.delete(queueId);
                } catch (error) {
                    console.warn('[SiDiMAS] Penghapusan kode menunggu sync:', error);
                }
            }
            await loadKodeCustomTable();
            Swal.fire({ icon: deletedOnline ? 'success' : 'warning', title: deletedOnline ? 'Terhapus' : 'Dihapus Lokal', text: deletedOnline ? 'Kode dihapus lokal dan dari Spreadsheet.' : 'Penghapusan tersimpan lokal dan akan dicoba sync otomatis.', timer: 1500, showConfirmButton: false });
            if (!$('#page-buat').hasClass('hide')) loadKodeKlasifikasi();
        } catch (error) {
            Swal.fire('Error', 'Gagal menghapus kode: ' + error.message, 'error');
        }
    });
}