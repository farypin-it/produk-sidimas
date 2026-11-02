// ============================================================
// DATA REFERENSI (Pegawai & Siswa) - SiDiMAS
// ============================================================

let dtPegawai, dtSiswa;
let pegawaiRows = [];
let siswaRows = [];

function loadDataReferensi() {
    loadPegawai();
    loadSiswa();
    if (typeof loadKodeCustomTable === 'function') {
        loadKodeCustomTable();
    }
}

// -----------------------------------------
// PEGAWAI CRUD (Cache-First + Background Sync)
// -----------------------------------------
function renderPegawaiTable(data) {
    pegawaiRows = data || [];
    if ($.fn.DataTable.isDataTable('#tPegawai')) {
        $('#tPegawai').DataTable().clear().rows.add(pegawaiRows).draw();
    } else {
        $('#tPegawai').DataTable({
            data: pegawaiRows,
            columns: [
                { data: null, render: (d, t, r, meta) => meta.row + 1 },
                { data: 'nama' },
                { data: 'nip' },
                { data: 'pangkatGol' },
                { data: 'jabatan' },
                { data: 'status' },
                {
                    data: 'id', render: function (data) {
                        return '<button class="btn btn-sm btn-info text-white" onclick="editPegawai(' + data + ')" title="Edit"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger text-white" onclick="hapusPegawai(' + data + ')" title="Hapus"><i class="fas fa-trash"></i></button>';
                    }
                }
            ],
            language: (typeof DT_LANG_ID !== 'undefined') ? DT_LANG_ID : {}
        });
    }
}

async function loadPegawai() {
    try {
        // TAHAP 1: Segera baca dari database lokal (Dexie / SQLite) - Tampil Seketika 0ms
        let localData = [];
        try {
            if (localDB && localDB.pegawai) {
                localData = (await localDB.pegawai.toArray()) || [];
            }
        } catch (eLocal) {
            console.warn('[SiDiMAS] Gagal membaca pegawai dari cache lokal:', eLocal);
        }

        if (localData && localData.length > 0) {
            renderPegawaiTable(localData);
        }

        // TAHAP 2: Jika online, tarik data terbaru dari Google Apps Script di background
        if (isAppOnline()) {
            apiCall('getPegawai').then(async response => {
                if (response && response.success === true && Array.isArray(response.data)) {
                    const freshData = response.data;
                    if (localDB && localDB.pegawai) {
                        try {
                            await localDB.pegawai.clear();
                            await localDB.pegawai.bulkPut(freshData);
                        } catch (ePut) {
                            console.warn('[SiDiMAS] Gagal perbarui cache pegawai:', ePut);
                        }
                    }
                    renderPegawaiTable(freshData);
                }
            }).catch(err => {
                console.warn('[SiDiMAS] Gagal fetch pegawai di background:', err);
                if (!localData || localData.length === 0) {
                    renderPegawaiTable([]);
                }
            });
        } else if (!localData || localData.length === 0) {
            renderPegawaiTable([]);
        }
    } catch (e) {
        console.error("Gagal load pegawai", e);
    }
}

function updatePangkatDropdown(selectedGol = '') {
    const status = document.getElementById('pgw_status').value;
    const pangkatSelect = document.getElementById('pgw_pangkat');
    pangkatSelect.innerHTML = '<option value="">- Pilih Pangkat/Golongan -</option>';
    
    if (status === 'PNS') {
        const pnsGol = [
            "Juru Muda, I/a", "Juru Muda Tingkat I, I/b", "Juru, I/c", "Juru Tingkat I, I/d",
            "Pengatur Muda, II/a", "Pengatur Muda Tingkat I, II/b", "Pengatur, II/c", "Pengatur Tingkat I, II/d",
            "Penata Muda, III/a", "Penata Muda Tingkat I, III/b", "Penata, III/c", "Penata Tingkat I, III/d",
            "Pembina, IV/a", "Pembina Tingkat I, IV/b", "Pembina Utama Muda, IV/c", "Pembina Utama Madya, IV/d", "Pembina Utama, IV/e"
        ];
        pnsGol.forEach(g => {
            pangkatSelect.innerHTML += `<option value="${g}">${g}</option>`;
        });
    } else if (status === 'PPPK' || status === 'PPPK Paruh Waktu') {
        const roman = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII"];
        roman.forEach(g => {
            pangkatSelect.innerHTML += `<option value="Golongan ${g}">Golongan ${g}</option>`;
        });
    } else if (status === 'Tenaga Honor') {
        pangkatSelect.innerHTML += `<option value="-">-</option>`;
    }
    
    if (selectedGol) {
        let optionExists = Array.from(pangkatSelect.options).some(opt => opt.value === selectedGol);
        if(!optionExists && selectedGol !== '') {
            pangkatSelect.innerHTML += `<option value="${selectedGol}">${selectedGol}</option>`;
        }
        pangkatSelect.value = selectedGol;
    }
}

function tambahPegawai() {
    document.getElementById('formPegawai').reset();
    document.getElementById('pgw_id').value = '';
    updatePangkatDropdown();
    $('#mdlPegawai').modal('show');
}

async function editPegawai(id) {
    try {
        const arr = isAppOnline() ? pegawaiRows : await localDB.pegawai.toArray();
        const p = arr.find(x => String(x.id) === String(id));
        if (p) {
            document.getElementById('pgw_id').value = p.id;
            document.getElementById('pgw_nama').value = p.nama || '';
            document.getElementById('pgw_nip').value = String(p.nip || '').replace(/^'/, '');
            document.getElementById('pgw_jabatan').value = p.jabatan || '';
            
            // Set status lalu trigger dropdown pangkat
            const statusSelect = document.getElementById('pgw_status');
            let statusExists = Array.from(statusSelect.options).some(opt => opt.value === (p.status || ''));
            if (!statusExists && p.status) {
                statusSelect.innerHTML += `<option value="${p.status}">${p.status}</option>`;
            }
            statusSelect.value = p.status || '';
            updatePangkatDropdown(p.pangkatGol || '');
            
            $('#mdlPegawai').modal('show');
        }
    } catch (e) { console.error(e); }
}

async function simpanPegawai(e) {
    e.preventDefault();
    const id = document.getElementById('pgw_id').value;
    const obj = {
        id: id ? (parseInt(id) || id) : Date.now(), // gunakan timestamp sebagai ID unik jika baru
        nama: (document.getElementById('pgw_nama').value || '').trim(),
        nip: (document.getElementById('pgw_nip').value || '').trim(),
        pangkatGol: (document.getElementById('pgw_pangkat').value || '').trim(),
        jabatan: (document.getElementById('pgw_jabatan').value || '').trim(),
        status: (document.getElementById('pgw_status').value || '').trim()
    };

    if (!obj.nama) return Swal.fire('Peringatan', 'Nama pegawai harus diisi!', 'warning');

    try {
        const online = isAppOnline();
        Swal.fire({
            title: 'Menyimpan...',
            text: online ? 'Sedang mengirim data ke Spreadsheet...' : 'Sedang menyimpan data ke database lokal...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const cleanNip = obj.nip.replace(/['\s]/g, '');
        if (cleanNip !== '' && cleanNip !== '-') {
            let allPegawai = (pegawaiRows && pegawaiRows.length > 0) ? pegawaiRows : [];
            if (allPegawai.length === 0) {
                if (online) {
                    const res = await apiCall('getPegawai');
                    allPegawai = (res && res.data) || [];
                } else {
                    allPegawai = await localDB.pegawai.toArray();
                }
            }
            const duplicate = allPegawai.find(p => 
                String(p.nip || '').replace(/['\s]/g, '') === cleanNip &&
                String(p.id) !== String(id || '')
            );
            if (duplicate) {
                Swal.fire('Gagal', `NIP "${obj.nip}" sudah terdaftar pada pegawai lain (${duplicate.nama || ''})!`, 'error');
                return;
            }
        }

        if (online) {
            const response = await apiCall('savePegawai', obj);
            if (!response || response.success !== true) throw new Error(response && response.message || 'Spreadsheet tidak mengonfirmasi penyimpanan pegawai.');
            if (window.invalidateAutocompleteReferenceCache) window.invalidateAutocompleteReferenceCache('pegawai');
            $('#mdlPegawai').modal('hide');
            await loadPegawai();
            Swal.fire('Berhasil', 'Data pegawai berhasil disimpan ke Spreadsheet.', 'success');
            return;
        }

        await localDB.pegawai.put(obj);
        const queueId = await localDB.antrianSync.put({ action: 'savePegawai', payload: obj, status: 'pending' });
        void queueId;
        Swal.fire('Tersimpan Lokal', 'Data pegawai tersimpan di SQLite dan akan dikirim saat desktop tersambung.', 'warning');
        $('#mdlPegawai').modal('hide');
        loadPegawai();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function hapusPegawai(id) {
    if (!confirm('Yakin ingin menghapus pegawai ini?')) return;
    try {
        if (isAppOnline()) {
            // MODE ONLINE: Hapus langsung dari Spreadsheet
            const res = await apiCall('deletePegawai', { id: id });
            if (!res || !res.success) {
                Swal.fire('Gagal', res.message || 'Gagal menghapus dari Spreadsheet.', 'error');
                return;
            }
        } else {
            // MODE OFFLINE: tandai untuk dihapus saat sync
            await localDB.pegawai.delete(id);
            await localDB.antrianSync.put({ action: 'deletePegawai', payload: { id: id }, status: 'pending' });
        }
        loadPegawai();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}


// -----------------------------------------
// SISWA CRUD (Cache-First + Background Sync)
// -----------------------------------------
function renderSiswaTable(data) {
    siswaRows = data || [];
    if ($.fn.DataTable.isDataTable('#tSiswa')) {
        $('#tSiswa').DataTable().clear().rows.add(siswaRows).draw();
    } else {
        $('#tSiswa').DataTable({
            data: siswaRows,
            columns: [
                { data: null, render: (d, t, r, meta) => meta.row + 1 },
                { data: 'nama' },
                { data: 'jk' },
                {
                    data: null, render: function (data, type, row) {
                        let val = [];
                        if (row.nipd) val.push(row.nipd);
                        if (row.nisn) val.push(row.nisn);
                        return val.join(' / ');
                    }
                },
                { data: 'tmptLahir' },
                { data: 'tglLahir' },
                {
                    data: null, render: function (data, type, row) {
                        let ayah = row.namaAyah ? 'Ayah: ' + row.namaAyah : '';
                        let ibu = row.namaIbu ? 'Ibu: ' + row.namaIbu : '';
                        return ayah + (ayah && ibu ? '<br>' : '') + ibu;
                    }
                },
                { data: 'kelas' },
                {
                    data: 'id', render: function (data) {
                        return '<button class="btn btn-sm btn-info text-white" onclick="editSiswa(' + data + ')" title="Edit"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger text-white" onclick="hapusSiswa(' + data + ')" title="Hapus"><i class="fas fa-trash"></i></button>';
                    }
                }
            ],
            language: (typeof DT_LANG_ID !== 'undefined') ? DT_LANG_ID : {}
        });
    }
}

async function loadSiswa() {
    try {
        // TAHAP 1: Segera baca dari database lokal (Dexie / SQLite) - Tampil Seketika 0ms
        let localData = [];
        try {
            if (localDB && localDB.siswa) {
                localData = (await localDB.siswa.toArray()) || [];
            }
        } catch (eLocal) {
            console.warn('[SiDiMAS] Gagal membaca siswa dari cache lokal:', eLocal);
        }

        if (localData && localData.length > 0) {
            renderSiswaTable(localData);
        }

        // TAHAP 2: Jika online, tarik data terbaru dari Google Apps Script di background
        if (isAppOnline()) {
            apiCall('getSiswa').then(async response => {
                if (response && response.success === true && Array.isArray(response.data)) {
                    const freshData = response.data;
                    if (localDB && localDB.siswa) {
                        try {
                            await localDB.siswa.clear();
                            await localDB.siswa.bulkPut(freshData);
                        } catch (ePut) {
                            console.warn('[SiDiMAS] Gagal perbarui cache siswa:', ePut);
                        }
                    }
                    renderSiswaTable(freshData);
                }
            }).catch(err => {
                console.warn('[SiDiMAS] Gagal fetch siswa di background:', err);
                if (!localData || localData.length === 0) {
                    renderSiswaTable([]);
                }
            });
        } else if (!localData || localData.length === 0) {
            renderSiswaTable([]);
        }
    } catch (e) {
        console.error("Gagal load siswa", e);
    }
}

function tambahSiswa() {
    document.getElementById('formSiswa').reset();
    document.getElementById('sis_id').value = '';
    $('#mdlSiswa').modal('show');
}

async function editSiswa(id) {
    try {
        const arr = isAppOnline() ? siswaRows : await localDB.siswa.toArray();
        const p = arr.find(x => String(x.id) === String(id));
        if (p) {
            document.getElementById('sis_id').value = p.id;
            document.getElementById('sis_nama').value = p.nama || '';
            document.getElementById('sis_nipd').value = String(p.nipd || '').replace(/^'/, '');
            document.getElementById('sis_nisn').value = String(p.nisn || '').replace(/^'/, '');
            document.getElementById('sis_tmptLahir').value = p.tmptLahir || '';
            document.getElementById('sis_tglLahir').value = p.tglLahir || '';
            document.getElementById('sis_jk').value = p.jk || 'L';
            document.getElementById('sis_kelas').value = p.kelas || '';
            document.getElementById('sis_ayah').value = p.namaAyah || '';
            document.getElementById('sis_ibu').value = p.namaIbu || '';
            $('#mdlSiswa').modal('show');
        }
    } catch (e) { console.error(e); }
}

async function simpanSiswa(e) {
    e.preventDefault();
    const id = document.getElementById('sis_id').value;
    const obj = {
        id: id ? (parseInt(id) || id) : Date.now(),
        nama: (document.getElementById('sis_nama').value || '').trim(),
        nipd: (document.getElementById('sis_nipd').value || '').trim(),
        nisn: (document.getElementById('sis_nisn').value || '').trim(),
        tmptLahir: (document.getElementById('sis_tmptLahir').value || '').trim(),
        tglLahir: (document.getElementById('sis_tglLahir').value || '').trim(),
        jk: document.getElementById('sis_jk').value,
        kelas: (document.getElementById('sis_kelas').value || '').trim(),
        namaAyah: (document.getElementById('sis_ayah').value || '').trim(),
        namaIbu: (document.getElementById('sis_ibu').value || '').trim()
    };

    if (!obj.nama) return Swal.fire('Peringatan', 'Nama siswa harus diisi!', 'warning');

    try {
        const online = isAppOnline();
        Swal.fire({
            title: 'Menyimpan...',
            text: online ? 'Sedang mengirim data ke Spreadsheet...' : 'Sedang menyimpan data ke database lokal...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        let allSiswa = (siswaRows && siswaRows.length > 0) ? siswaRows : [];
        if (allSiswa.length === 0) {
            if (online) {
                const res = await apiCall('getSiswa');
                allSiswa = (res && res.data) || [];
            } else {
                allSiswa = await localDB.siswa.toArray();
            }
        }

        const cleanNisn = obj.nisn.replace(/['\s]/g, '');
        if (cleanNisn !== '' && cleanNisn !== '-') {
            const duplicate = allSiswa.find(p => 
                String(p.nisn || '').replace(/['\s]/g, '') === cleanNisn &&
                String(p.id) !== String(id || '')
            );
            if (duplicate) {
                Swal.fire('Gagal', `NISN "${obj.nisn}" sudah terdaftar pada siswa lain (${duplicate.nama || ''})!`, 'error');
                return;
            }
        }

        const cleanNipd = obj.nipd.replace(/['\s]/g, '');
        if (cleanNipd !== '' && cleanNipd !== '-') {
            const duplicateNipd = allSiswa.find(p => 
                String(p.nipd || '').replace(/['\s]/g, '') === cleanNipd &&
                String(p.id) !== String(id || '')
            );
            if (duplicateNipd) {
                Swal.fire('Gagal', `NIS/NIPD "${obj.nipd}" sudah terdaftar pada siswa lain (${duplicateNipd.nama || ''})!`, 'error');
                return;
            }
        }

        if (online) {
            const response = await apiCall('saveSiswa', obj);
            if (!response || response.success !== true) throw new Error(response && response.message || 'Spreadsheet tidak mengonfirmasi penyimpanan siswa.');
            if (window.invalidateAutocompleteReferenceCache) window.invalidateAutocompleteReferenceCache('siswa');
            $('#mdlSiswa').modal('hide');
            await loadSiswa();
            Swal.fire('Berhasil', 'Data siswa berhasil disimpan ke Spreadsheet.', 'success');
            return;
        }

        await localDB.siswa.put(obj);
        const queueId = await localDB.antrianSync.put({ action: 'saveSiswa', payload: obj, status: 'pending' });
        void queueId;
        Swal.fire('Tersimpan Lokal', 'Data siswa tersimpan di SQLite dan akan dikirim saat desktop tersambung.', 'warning');
        $('#mdlSiswa').modal('hide');
        loadSiswa();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function hapusSiswa(id) {
    if (!confirm('Yakin ingin menghapus siswa ini?')) return;
    try {
        if (isAppOnline()) {
            // MODE ONLINE: Hapus langsung dari Spreadsheet
            const res = await apiCall('deleteSiswa', { id: id });
            if (!res || !res.success) {
                Swal.fire('Gagal', res.message || 'Gagal menghapus dari Spreadsheet.', 'error');
                return;
            }
        } else {
            // MODE OFFLINE: tandai untuk dihapus saat sync
            await localDB.siswa.delete(id);
            await localDB.antrianSync.put({ action: 'deleteSiswa', payload: { id: id }, status: 'pending' });
        }
        loadSiswa();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}


// -----------------------------------------
// IMPORT EXCEL DAPODIK
// -----------------------------------------
function modalImportPegawai() {
    document.getElementById('fileDapodik').value = '';
    document.getElementById('importType').value = 'pegawai';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('mdlImportDapodik')).show();
}

function modalImportSiswa() {
    document.getElementById('fileDapodik').value = '';
    document.getElementById('importType').value = 'siswa';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('mdlImportDapodik')).show();
}

function prosesImportDapodik() {
    const fileInput = document.getElementById('fileDapodik');
    const type = document.getElementById('importType').value;
    
    if (!fileInput.files.length) {
        return Swal.fire('Peringatan', 'Silakan pilih file Excel terlebih dahulu', 'warning');
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    Swal.fire({ title: 'Memproses...', text: 'Membaca file Excel...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
            
            if (type === 'pegawai') {
                await importDataPegawai(jsonArray);
            } else {
                await importDataSiswa(jsonArray);
            }
        } catch(err) {
            Swal.fire('Error', 'Gagal membaca file Excel. Pastikan format valid.', 'error');
            console.error(err);
        }
    };
    reader.readAsArrayBuffer(file);
}

function findHeaderRowIndex(rows) {
    for (let i = 0; i < Math.min(20, rows.length); i++) {
        const row = rows[i];
        if (!row) continue;
        const stringRow = row.map(v => String(v).trim().toLowerCase());
        if (stringRow.some(value => value === 'nama' || value.includes('nama peserta didik') || value.includes('nama lengkap'))) {
            return i;
        }
    }
    return -1;
}

function cleanString(str) {
    if (str === null || str === undefined) return '';
    return String(str).trim();
}

function parsePangkat(val) {
    if (!val) return '';
    let str = val.toString().trim().toUpperCase();
    
    // Pemetaan PNS
    const pnsMap = {
        'I/A': 'Juru Muda (I/a)',
        'I/B': 'Juru Muda Tingkat I (I/b)',
        'I/C': 'Juru (I/c)',
        'I/D': 'Juru Tingkat I (I/d)',
        'II/A': 'Pengatur Muda (II/a)',
        'II/B': 'Pengatur Muda Tingkat I (II/b)',
        'II/C': 'Pengatur (II/c)',
        'II/D': 'Pengatur Tingkat I (II/d)',
        'III/A': 'Penata Muda (III/a)',
        'III/B': 'Penata Muda Tingkat I (III/b)',
        'III/C': 'Penata (III/c)',
        'III/D': 'Penata Tingkat I (III/d)',
        'IV/A': 'Pembina (IV/a)',
        'IV/B': 'Pembina Tingkat I (IV/b)',
        'IV/C': 'Pembina Utama Muda (IV/c)',
        'IV/D': 'Pembina Utama Madya (IV/d)',
        'IV/E': 'Pembina Utama (IV/e)'
    };
    
    if (pnsMap[str]) return pnsMap[str];
    
    // Pemetaan PPPK (format romawi)
    const pppkMap = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'];
    if (pppkMap.includes(str)) {
        return 'Golongan ' + str;
    }
    
    // Kembalikan aslinya jika tidak cocok dengan peta
    return val.toString().trim();
}

async function importDataPegawai(rows) {
    const headerIdx = findHeaderRowIndex(rows);
    if (headerIdx === -1) {
        return Swal.fire('Gagal', 'Tidak menemukan header "Nama" di file Excel ini.', 'error');
    }
    
    const headers = rows[headerIdx].map(v => cleanString(v).toLowerCase());
    
    const idxNama = headers.findIndex(h => h === 'nama' || h.includes('nama lengkap'));
    const idxNip = headers.findIndex(h => h === 'nip' || h === 'nip / nii');
    const idxPangkat = headers.findIndex(h => h.includes('pangkat') || h.includes('golongan'));
    const idxJabatan = headers.findIndex(h => h.includes('jabatan') || h === 'jenis ptk');
    const idxStatus = headers.findIndex(h => h.includes('status pegawai') || h.includes('status kepegawaian'));
    
    if (idxNama === -1) return Swal.fire('Gagal', 'Kolom Nama tidak ditemukan.', 'error');
    
    const online = isAppOnline();
    if (!online && !isElectron) {
        return Swal.fire('Tidak Ada Koneksi', 'Impor online memerlukan koneksi ke Spreadsheet. Gunakan aplikasi desktop SiDiMAS untuk impor offline.', 'warning');
    }
    let existingPgw;
    if (online) {
        const response = await apiCall('getPegawai');
        if (!response || response.success !== true) throw new Error(response && response.message || 'Gagal membaca data pegawai dari Spreadsheet.');
        existingPgw = response.data || [];
    } else {
        existingPgw = await localDB.pegawai.toArray();
    }
    const onlineEntries = [];

    let countBaru = 0;
    let countTimpa = 0;
    let countGagal = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[idxNama]) {
            countGagal++;
            continue;
        }
        if (cleanString(row[idxNama]).toLowerCase() === 'nama') {
            countGagal++;
            continue;
        }
        
        let nip = idxNip !== -1 ? cleanString(row[idxNip]) : '';
        if (nip.startsWith("'")) nip = nip.substring(1);
        
        if (!nip || nip === '' || nip === '-') {
            countGagal++;
            continue; // Lewati jika tidak ada NIP sesuai permintaan user
        }
        
        let rawPangkat = idxPangkat !== -1 ? cleanString(row[idxPangkat]) : '';
        
        let obj = {
            nama: cleanString(row[idxNama]),
            nip: nip,
            pangkatGol: parsePangkat(rawPangkat),
            jabatan: idxJabatan !== -1 ? cleanString(row[idxJabatan]) : '',
            status: idxStatus !== -1 ? cleanString(row[idxStatus]) : ''
        };
        
        try {
            let existingMatch = existingPgw.find(p => p.nip === nip);
            if (existingMatch) {
                obj.id = existingMatch.id;
                if (online) onlineEntries.push({ record: obj, overwritten: true });
                else {
                    await localDB.pegawai.update(obj.id, obj);
                    await localDB.antrianSync.put({ action: 'savePegawai', payload: obj, status: 'pending' });
                }
                countTimpa++;
            } else {
                obj.id = Date.now() + i;
                if (online) onlineEntries.push({ record: obj, overwritten: false });
                else {
                    await localDB.pegawai.put(obj);
                    await localDB.antrianSync.put({ action: 'savePegawai', payload: obj, status: 'pending' });
                }
                existingPgw.push(obj);
                countBaru++;
            }
        } catch(e) {
            console.error("Gagal insert baris", row, e);
            countGagal++;
        }
    }
    
    if (countBaru === 0 && countTimpa === 0) {
        return Swal.fire('Info', 'Tidak ada data valid untuk diimport. (Pastikan format kolom NIP dan Nama terisi)', 'info');
    }
    
    if (online) {
        try {
            const result = await sendImportBatchOnline('savePegawaiBatch', onlineEntries);
            if (window.invalidateAutocompleteReferenceCache) window.invalidateAutocompleteReferenceCache('pegawai');
            countBaru = result.added;
            countTimpa = result.updated;
            countGagal += result.failed;
        } catch (error) {
            return Swal.fire('Gagal Import ke Spreadsheet', error.message, 'error');
        }
    }
    Swal.fire('Hasil Import', `<b>Rincian Import Pegawai:</b><br>Berhasil ditambah: ${countBaru}<br>Berhasil ditimpa: ${countTimpa}<br>Gagal / Dilewati: ${countGagal}`, countGagal ? 'warning' : 'success');
    bootstrap.Modal.getInstance(document.getElementById('mdlImportDapodik')).hide();
    await loadPegawai();
}

async function importDataSiswa(rows) {
    const headerIdx = findHeaderRowIndex(rows);
    if (headerIdx === -1) {
        return Swal.fire('Gagal', 'Tidak menemukan header "Nama" di file Excel ini.', 'error');
    }
    
    const headers = rows[headerIdx].map(v => cleanString(v).toLowerCase());
    
    const idxNama = headers.findIndex(h => h === 'nama' || h.includes('nama peserta didik') || h.includes('nama lengkap'));
    const idxNipd = headers.findIndex(h => h === 'nipd' || h === 'nis' || h === 'no induk');
    const idxNisn = headers.indexOf('nisn');
    const idxTmptLahir = headers.findIndex(h => h.includes('tempat lahir'));
    const idxTglLahir = headers.findIndex(h => h.includes('tanggal lahir'));
    const idxJk = headers.findIndex(h => h === 'jk' || h === 'jenis kelamin' || h === 'l/p');
    const idxAyah = headers.findIndex(h => h === 'nama ayah' || h === 'data ayah');
    const idxIbu = headers.findIndex(h => h === 'nama ibu kandung' || h === 'nama ibu' || h === 'data ibu');
    const idxKelas = headers.findIndex(h => h === 'rombel saat ini' || h === 'kelas');
    
    if (idxNama === -1) return Swal.fire('Gagal', 'Kolom Nama tidak ditemukan.', 'error');
    
    const online = isAppOnline();
    if (!online && !isElectron) {
        return Swal.fire('Tidak Ada Koneksi', 'Impor online memerlukan koneksi ke Spreadsheet. Gunakan aplikasi desktop SiDiMAS untuk impor offline.', 'warning');
    }
    let existingSis;
    if (online) {
        const response = await apiCall('getSiswa');
        if (!response || response.success !== true) throw new Error(response && response.message || 'Gagal membaca data siswa dari Spreadsheet.');
        existingSis = response.data || [];
    } else {
        existingSis = await localDB.siswa.toArray();
    }
    const onlineEntries = [];

    let countBaru = 0;
    let countTimpa = 0;
    let countGagal = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[idxNama]) {
            countGagal++;
            continue;
        }
        if (cleanString(row[idxNama]).toLowerCase() === 'nama') {
            countGagal++;
            continue;
        }
        
        let nisnVal = idxNisn !== -1 ? cleanString(row[idxNisn]) : '';
        if (nisnVal.startsWith("'")) nisnVal = nisnVal.substring(1);

        if (!nisnVal || nisnVal === '' || nisnVal === '-') {
            countGagal++;
            continue; // Lewati jika tidak ada NISN sesuai permintaan user
        }
        
        let obj = {
            nama: cleanString(row[idxNama]),
            nipd: idxNipd !== -1 ? cleanString(row[idxNipd]) : '',
            nisn: nisnVal,
            tmptLahir: idxTmptLahir !== -1 ? cleanString(row[idxTmptLahir]) : '',
            tglLahir: idxTglLahir !== -1 ? cleanString(row[idxTglLahir]) : '',
            jk: idxJk !== -1 ? cleanString(row[idxJk]) : '',
            kelas: idxKelas !== -1 ? cleanString(row[idxKelas]) : '',
            namaAyah: idxAyah !== -1 ? cleanString(row[idxAyah]) : '',
            namaIbu: idxIbu !== -1 ? cleanString(row[idxIbu]) : ''
        };
        
        try {
            let existingMatch = existingSis.find(s => s.nisn === nisnVal);
            if (existingMatch) {
                obj.id = existingMatch.id;
                if (online) onlineEntries.push({ record: obj, overwritten: true });
                else {
                    await localDB.siswa.update(obj.id, obj);
                    await localDB.antrianSync.put({ action: 'saveSiswa', payload: obj, status: 'pending' });
                }
                countTimpa++;
            } else {
                obj.id = Date.now() + i;
                if (online) onlineEntries.push({ record: obj, overwritten: false });
                else {
                    await localDB.siswa.put(obj);
                    await localDB.antrianSync.put({ action: 'saveSiswa', payload: obj, status: 'pending' });
                }
                existingSis.push(obj);
                countBaru++;
            }
        } catch(e) {
            console.error("Gagal insert baris", row, e);
            countGagal++;
        }
    }
    
    if (countBaru === 0 && countTimpa === 0) {
        return Swal.fire('Info', 'Tidak ada data valid untuk diimport. (Pastikan format kolom NISN dan Nama terisi)', 'info');
    }
    
    if (online) {
        try {
            const result = await sendImportBatchOnline('saveSiswaBatch', onlineEntries);
            if (window.invalidateAutocompleteReferenceCache) window.invalidateAutocompleteReferenceCache('siswa');
            countBaru = result.added;
            countTimpa = result.updated;
            countGagal += result.failed;
        } catch (error) {
            return Swal.fire('Gagal Import ke Spreadsheet', error.message, 'error');
        }
    }
    Swal.fire('Hasil Import', `<b>Rincian Import Siswa:</b><br>Berhasil ditambah: ${countBaru}<br>Berhasil ditimpa: ${countTimpa}<br>Gagal / Dilewati: ${countGagal}`, countGagal ? 'warning' : 'success');
    bootstrap.Modal.getInstance(document.getElementById('mdlImportDapodik')).hide();
    await loadSiswa();
}

async function sendImportBatchOnline(action, entries) {
    const totals = { added: 0, updated: 0, failed: 0 };
    for (let offset = 0; offset < entries.length; offset += 40) {
        const batch = entries.slice(offset, offset + 40);
        const response = await apiCall(action, batch.map(entry => entry.record));
        if (!response || response.success !== true || !Array.isArray(response.results)) {
            throw new Error(response && response.message || 'Spreadsheet tidak mengonfirmasi hasil impor.');
        }
        response.results.forEach((result, index) => {
            if (result && result.success) {
                if (batch[index].overwritten) totals.updated++;
                else totals.added++;
            } else {
                totals.failed++;
                console.error('[SiDiMAS Import]', result && result.message || 'Baris gagal disimpan.', result);
            }
        });
    }
    return totals;
}

$(document).ready(function () {
    $(document).on('shown.bs.tab', '#pegawai-tab', function () {
        if (!pegawaiRows || pegawaiRows.length === 0) {
            loadPegawai();
        }
        if ($.fn.DataTable.isDataTable('#tPegawai')) {
            setTimeout(() => {
                const dt = $('#tPegawai').DataTable();
                dt.columns.adjust();
                if (dt.responsive) dt.responsive.recalc();
            }, 50);
        }
    });

    $(document).on('shown.bs.tab', '#siswa-tab', function () {
        if (!siswaRows || siswaRows.length === 0) {
            loadSiswa();
        }
        if ($.fn.DataTable.isDataTable('#tSiswa')) {
            setTimeout(() => {
                const dt = $('#tSiswa').DataTable();
                dt.columns.adjust();
                if (dt.responsive) dt.responsive.recalc();
            }, 50);
        }
    });

    $(document).on('shown.bs.tab', '#kode-tab', function () {
        if (typeof loadKodeCustomTable === 'function') {
            loadKodeCustomTable();
        }
    });
});

