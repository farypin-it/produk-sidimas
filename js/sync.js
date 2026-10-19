/* --- FUNGSI SINKRONISASI KE CLOUD --- */
function parseQueuePayload(payload) {
    if (typeof payload !== 'string') return payload || {};
    try { return JSON.parse(payload); } catch (e) { return {}; }
}

async function getProtectedIds(records, actionNames, keyName = 'id') {
    const protectedIds = new Set(records.filter(row => row.sync_status === 'pending').map(row => String(row.id)));
    const queue = await localDB.antrianSync.where('status').equals('pending').toArray();
    for (const item of queue) {
        if (!actionNames.includes(item.action)) continue;
        const payload = parseQueuePayload(item.payload);
        if (payload[keyName] !== undefined) protectedIds.add(String(payload[keyName]));
    }
    return protectedIds;
}

async function mergePulledRows(tableName, rows, protectedIds = new Set()) {
    if (!Array.isArray(rows)) return;
    const localRows = ['suratMasuk', 'suratKeluar'].includes(tableName)
        ? await localDB[tableName].toArray()
        : [];
    const localRowsById = new Map(localRows.map(row => [String(row.id), row]));
    for (const row of rows) {
        if (row && row.id !== undefined && row.id !== null && row.id !== '' && !protectedIds.has(String(row.id))) {
            const localRow = localRowsById.get(String(row.id));
            const localFileUrl = localRow && typeof localRow.fileUrl === 'string' && localRow.fileUrl.startsWith('data:')
                ? localRow.fileUrl
                : null;
            await localDB[tableName].put(localFileUrl ? { ...row, fileUrl: localFileUrl } : row);
        }
    }
}

async function applySyncResponse(res, pendingMasuk = [], pendingKeluar = [], pendingQueue = []) {
    if (!res || res.success !== true) throw new Error(res && res.message || 'Respons sinkronisasi tidak valid.');

    const queueResults = Array.isArray(res.queueResults) ? res.queueResults : [];
    const queueResultById = new Map(queueResults.map(item => [String(item.id), item]));
    for (const item of pendingQueue) {
        const result = queueResultById.get(String(item.id));
        if (result && result.success === true) await localDB.antrianSync.delete(item.id);
    }

    const masukResults = new Map((res.masukResults || []).map(item => [String(item.id), item]));
    for (const record of pendingMasuk) {
        const result = masukResults.get(String(record.id));
        if (result && result.success === true) {
            await localDB.suratMasuk.update(record.id, { sync_status: 'synced', fileInfoRaw: null });
        }
    }

    const keluarResults = new Map((res.keluarResults || []).map(item => [String(item.id), item]));
    for (const record of pendingKeluar) {
        const result = keluarResults.get(String(record.id));
        if (result && result.success === true) {
            await localDB.suratKeluar.update(record.id, { sync_status: 'synced', fileInfoRaw: null });
        }
    }

    const masukLocal = await localDB.suratMasuk.toArray();
    const keluarLocal = await localDB.suratKeluar.toArray();
    const masukProtected = new Set(masukLocal.filter(row => row.sync_status === 'pending').map(row => String(row.id)));
    const keluarProtected = new Set(keluarLocal.filter(row => row.sync_status === 'pending').map(row => String(row.id)));
    await mergePulledRows('suratMasuk', res.pulledMasuk, masukProtected);
    await mergePulledRows('suratKeluar', res.pulledKeluar, keluarProtected);

    const kodeProtected = await getProtectedIds([], ['saveKodeCustom', 'deleteKodeCustom']);
    const pegawaiProtected = await getProtectedIds([], ['savePegawai', 'deletePegawai']);
    const siswaProtected = await getProtectedIds([], ['saveSiswa', 'deleteSiswa']);
    const eksternalProtected = await getProtectedIds([], ['insertSuratEksternal']);
    const localExternalRows = await localDB.suratEksternal.toArray();
    const localExternalFiles = new Map(localExternalRows
        .filter(row => row.fileInfoRaw && row.fileInfoRaw.data)
        .map(row => [String(row.id), row.fileInfoRaw]));
    const externalRowsWithLocalFiles = (res.pulledEksternal || []).map(row => ({
        ...row,
        ...(localExternalFiles.has(String(row.id)) ? { fileInfoRaw: localExternalFiles.get(String(row.id)) } : {})
    }));
    await mergePulledRows('kodeCustom', res.pulledKodeCustom, kodeProtected);
    await mergePulledRows('pegawai', res.pulledPegawai, pegawaiProtected);
    await mergePulledRows('siswa', res.pulledSiswa, siswaProtected);
    await mergePulledRows('suratEksternal', externalRowsWithLocalFiles, eksternalProtected);
    if (typeof refreshInboxBadge === 'function') refreshInboxBadge(externalRowsWithLocalFiles);
    if ($('#page-inbox').is(':visible') && typeof loadInboxTable === 'function') await loadInboxTable();

    if (res.pulledSettings) {
        localStorage.setItem('sidimas_settings', JSON.stringify(res.pulledSettings));
        await localDB.appSettings.put({ id: 'config', data: res.pulledSettings });
        if (typeof renderAppAttributes === 'function') renderAppAttributes(res.pulledSettings);
    }

    return {
        pendingQueue: pendingQueue.length - pendingQueue.filter(item => {
            const result = queueResultById.get(String(item.id));
            return result && result.success === true;
        }).length,
        pendingMasuk: pendingMasuk.filter(item => !(masukResults.get(String(item.id)) || {}).success).length,
        pendingKeluar: pendingKeluar.filter(item => !(keluarResults.get(String(item.id)) || {}).success).length
    };
}

function openSyncModal() {
    let savedUrl = localStorage.getItem('sidimas_api_url') || (typeof API_URL !== 'undefined' ? API_URL : "") || "";
    if (!savedUrl || savedUrl.trim() === "") {
        try {
            const s = JSON.parse(localStorage.getItem('sidimas_settings') || "{}");
            if (s.link_exec) savedUrl = s.link_exec;
        } catch (e) { }
    }
    if (!savedUrl || savedUrl.trim() === "") {
        savedUrl = (typeof getFallbackGasUrl === 'function') ? getFallbackGasUrl() : "https://script.google.com/macros/s/AKfycbx-QE31idTvmhqH9FkDY2eqqA1Mpkwpo2nsAdS5yvTrmuXjmrNhTwz9Rc6v0eeFxkA/exec";
    }
    $('#syncLinkExec').val(savedUrl);
    new bootstrap.Modal('#modalSync').show();
}

function processSyncModal() {
    const url = $('#syncLinkExec').val().trim();
    if (!url) {
        Swal.fire('Info', 'Harap isi Link Web App URL (GAS) terlebih dahulu.', 'info');
        return;
    }

    localStorage.setItem('sidimas_api_url', url);
    API_URL = url;

    const modal = bootstrap.Modal.getInstance('#modalSync');
    if (modal) modal.hide();

    syncToCloud();
}

async function verifyBatchAfterLostResponse(payload, originalError) {
    const verification = await apiCall('verifySyncBatch', {
        masuk: payload.suratMasuk.map(record => record.id),
        keluar: payload.suratKeluar.map(record => record.id)
    });
    if (!verification || verification.success !== true) {
        throw new Error(`${originalError || 'Balasan sinkronisasi tidak diterima.'}; verifikasi server gagal: ${verification && (verification.message || verification.error) || 'respons tidak valid'}`);
    }
    return {
        success: true,
        masukResults: verification.masukResults || [],
        keluarResults: verification.keluarResults || [],
        queueResults: [],
        pulledMasuk: [],
        pulledKeluar: [],
        pulledSettings: null,
        pulledKodeCustom: [],
        pulledPegawai: [],
        pulledSiswa: [],
        pulledEksternal: [],
        verifiedAfterLostResponse: true
    };
}

async function syncToCloud() {
    const btn = $('#btnSyncMain');
    const originalHTML = btn.html();
    btn.html('<span class="spinner-border spinner-border-sm me-2"></span> Menyinkronkan...').prop('disabled', true);
    
    let syncProgress = 0;
    Swal.fire({ 
        title: 'Sinkronisasi Cloud', 
        html: `Sedang menghubungi server...<br>
               <div class="progress mt-3" style="height: 20px;">
                   <div id="syncProgressBar" class="progress-bar progress-bar-striped progress-bar-animated bg-primary" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
               </div>`, 
        allowOutsideClick: false, 
        showConfirmButton: false 
    });

    const progressInterval = setInterval(() => {
        if (syncProgress < 90) {
            syncProgress += Math.floor(Math.random() * 10) + 2;
            if (syncProgress > 90) syncProgress = 90;
            const pb = document.getElementById('syncProgressBar');
            if(pb) {
                pb.style.width = syncProgress + '%';
                pb.innerText = syncProgress + '%';
                pb.setAttribute('aria-valuenow', syncProgress);
            }
        }
    }, 600);

    try {
        const pendingMasuk = await localDB.suratMasuk.where('sync_status').equals('pending').toArray();
        const pendingKeluar = await localDB.suratKeluar.where('sync_status').equals('pending').toArray();
        const hapusAntrian = await localDB.antrianSync.where('status').equals('pending').toArray();

        const payload = {
            suratMasuk: pendingMasuk,
            suratKeluar: pendingKeluar,
            deleteQueue: hapusAntrian
        };

        const submittedCount = pendingMasuk.length + pendingKeluar.length + hapusAntrian.length;

        let res;
        let responseError = '';
        try {
            res = await apiCall('syncBatch', payload);
            if (res && (res.error || res.success !== true)) {
                responseError = res.message || res.error || 'Server tidak memberikan konfirmasi sinkronisasi.';
            }
        } catch (error) {
            responseError = error.message || String(error);
        }
        if (responseError) {
            console.warn('[SiDiMAS Sync] Memeriksa ID surat setelah balasan gagal:', responseError);
            res = await verifyBatchAfterLostResponse(payload, responseError);
        }
        clearInterval(progressInterval);
        
        if (res && res.success === true) {
            const outcome = await applySyncResponse(res, pendingMasuk, pendingKeluar, hapusAntrian);
            const pb = document.getElementById('syncProgressBar');
            if(pb) {
                pb.style.width = '100%';
                pb.innerText = '100%';
                pb.setAttribute('aria-valuenow', 100);
            }
            
            if (typeof loadKodeCustomTable === 'function') loadKodeCustomTable();
            if (typeof loadPegawai === 'function') loadPegawai();
            if (typeof loadSiswa === 'function') loadSiswa();

            const pendingCount = outcome.pendingQueue + outcome.pendingMasuk + outcome.pendingKeluar;
            const sentMasuk = pendingMasuk.length;
            const sentKeluar = pendingKeluar.length;
            const sentQueue = hapusAntrian.length;
            const sentSummary = `Surat masuk: ${sentMasuk - outcome.pendingMasuk}/${sentMasuk} berhasil<br>Surat keluar: ${sentKeluar - outcome.pendingKeluar}/${sentKeluar} berhasil<br>Aksi antrean: ${sentQueue - outcome.pendingQueue}/${sentQueue} berhasil`;
            
            const pulledMasukCount = Array.isArray(res.pulledMasuk) ? res.pulledMasuk.length : 0;
            const pulledKeluarCount = Array.isArray(res.pulledKeluar) ? res.pulledKeluar.length : 0;
            const pulledSummary = `Surat Masuk: ${pulledMasukCount} data, Surat Keluar: ${pulledKeluarCount} data`;

            if (res.pullWarning) {
                Swal.fire('Data Terkirim, Refresh Tertunda', `${sentSummary}<br><br>Data terbaru belum seluruhnya dimuat: ${res.pullWarning}`, 'warning');
            } else if (pendingCount) {
                Swal.fire('Sinkronisasi Sebagian', `${sentSummary}<br><br>${pendingCount} item belum terkonfirmasi dan tetap pending di perangkat.`, 'warning');
            } else {
                const title = res.verifiedAfterLostResponse ? 'Berhasil Diverifikasi' : 'Sinkronisasi Sukses';
                const detailMsg = submittedCount > 0 
                    ? `${sentSummary}<br><br><b>Data Online Terunduh:</b><br>${pulledSummary}<br><br>${res.verifiedAfterLostResponse ? 'Surat yang sudah tercatat di Spreadsheet berhasil diverifikasi.' : 'Data lokal dan Spreadsheet telah disinkronkan dua arah.'}`
                    : `<b>Data Online Terunduh:</b><br>${pulledSummary}<br><br>Data terbaru dari Spreadsheet berhasil disinkronkan ke lokal.`;
                Swal.fire(title, detailMsg, 'success');
            }
            refreshAllTables();
            if ($('#page-masuk').is(':visible')) refreshTable('masuk');
            if ($('#page-keluar').is(':visible')) refreshTable('keluar');
        } else {
            Swal.fire('Gagal Sinkronisasi', res && (res.message || res.error) || 'Server tidak mengonfirmasi sinkronisasi.', 'error');
        }
    } catch (err) {
        clearInterval(progressInterval);
        console.error('[SiDiMAS Sync Error]', err);
        if (!API_URL) {
            Swal.fire('Info', 'Harap isi Link Web App URL (GAS) terlebih dahulu.', 'info');
        } else {
            Swal.fire('Balasan Sinkronisasi Gagal', `<b>Pesan Error:</b><br><code style="font-size:11px;word-break:break-all">${err.message || err}</code><br><br>Periksa koneksi dan URL GAS. Jika koneksi putus setelah server menerima data, sebagian perubahan mungkin sudah masuk ke Spreadsheet; data lokal tetap pending dan aman untuk dicoba sinkron kembali.`, 'error');
        }
    } finally {
        clearInterval(progressInterval);
        btn.html(originalHTML).prop('disabled', false);
    }
}

let silentSyncPromise = null;

async function silentSync() {
    const cloudAvailable = !isElectron && typeof isAppOnline === 'function' && isAppOnline();
    if (!cloudAvailable) return null;
    if (silentSyncPromise) return silentSyncPromise;

    silentSyncPromise = (async () => {
        try {
            const pending = await collectPendingSyncData();
            const hasPending = pending.suratMasuk.length || pending.suratKeluar.length || pending.deleteQueue.length;
            if (!hasPending) return null;

            const res = await apiCall('syncBatch', pending);
            if (res && res.success === true) {
                const outcome = await applySyncResponse(res, pending.suratMasuk, pending.suratKeluar, pending.deleteQueue);
                if (typeof refreshAllTables === 'function') refreshAllTables();
                if ($('#page-masuk').is(':visible')) refreshTable('masuk');
                if ($('#page-keluar').is(':visible')) refreshTable('keluar');
                return outcome;
            }
            console.warn('[SiDiMAS Silent Sync] Server tidak mengonfirmasi sinkronisasi:', res && res.message);
        } catch (err) {
            console.error('[SiDiMAS Silent Sync Error]', err);
        }
        return null;
    })();

    try {
        return await silentSyncPromise;
    } finally {
        silentSyncPromise = null;
    }
}

window.addEventListener('online', () => {
    silentSync();
});

async function collectPendingSyncData() {
    return {
        suratMasuk: await localDB.suratMasuk.where('sync_status').equals('pending').toArray(),
        suratKeluar: await localDB.suratKeluar.where('sync_status').equals('pending').toArray(),
        deleteQueue: await localDB.antrianSync.where('status').equals('pending').toArray()
    };
}

/* =============================================================
   SISTEM CACHE 6 JAM — DATA SELALU FRESH DI SEMUA BROWSER
   =============================================================
   Setiap browser (HP / Laptop) menyimpan timestamp pull terakhir.
   Jika sudah > 6 jam, data otomatis ditarik ulang dari Spreadsheet.
   invalidateCache() dipanggil setelah data berubah agar browser
   lain dapat data terbaru di sesi berikutnya.
   ============================================================= */

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 jam dalam milidetik

function invalidateCache() {
    localStorage.removeItem('sidimas_cache_ts');
}

function isCacheExpired() {
    const ts = localStorage.getItem('sidimas_cache_ts');
    if (!ts) return true; // belum pernah pull = selalu expired
    return (Date.now() - parseInt(ts, 10)) > CACHE_DURATION_MS;
}

function setCacheFresh() {
    localStorage.setItem('sidimas_cache_ts', String(Date.now()));
}

/**
 * Dipanggil otomatis setelah login dan saat halaman dibuka (online mode).
 * Menarik SEMUA data terbaru dari Spreadsheet jika cache expired / baru login.
 * @param {boolean} force - Paksa refresh meskipun cache masih fresh
 */
async function autoRefreshOnlineCache(force = false) {
    if (!isAppOnline()) return;

    const pending = await collectPendingSyncData();
    const hasPending = pending.suratMasuk.length || pending.suratKeluar.length || pending.deleteQueue.length;
    if (!force && !hasPending && !isCacheExpired()) {
        console.log('[SiDiMAS] Cache masih fresh (< 6 jam), skip pull.');
        return;
    }

    console.log('[SiDiMAS] Cache expired / login baru. Menarik semua data dari Spreadsheet...');
    try {
        const res = await apiCall('syncBatch', pending);

        if (res && res.success === true) {
            const outcome = await applySyncResponse(res, pending.suratMasuk, pending.suratKeluar, pending.deleteQueue);

            if (outcome.pendingQueue + outcome.pendingMasuk + outcome.pendingKeluar === 0) setCacheFresh();

            // Refresh semua tampilan yang sedang aktif
            if (typeof refreshAllTables === 'function') refreshAllTables();
            if ($('#page-masuk').is(':visible') && typeof refreshTable === 'function') refreshTable('masuk');
            if ($('#page-keluar').is(':visible') && typeof refreshTable === 'function') refreshTable('keluar');
            if (typeof loadPegawai === 'function') loadPegawai();
            if (typeof loadSiswa === 'function') loadSiswa();

            console.log('[SiDiMAS] Refresh selesai; antrean tertunda:', outcome.pendingQueue + outcome.pendingMasuk + outcome.pendingKeluar);
        }
    } catch (err) {
        console.warn('[SiDiMAS] Gagal refresh cache dari server:', err.message);
    }
}

/* --- FUNGSI ANIMASI KOTAK LOGIN DI HP --- */
function toggleMobileLogin(action) {
    if (action === 'show') {
        $('#boxLeft').hide();
        $('#boxRight').fadeIn(300);
    } else {
        $('#boxRight').hide();
        $('#boxLeft').fadeIn(300);
    }
}

/* --- MANAJEMEN USER (Online/Offline aware) --- */

/**
 * Buka modal tambah/edit user.
 * Mode online: username readonly (tidak boleh ubah), password bisa edit.
 * Mode offline/desktop: tidak bisa akses (tombol tidak ditampilkan).
 */
function modalUser(m, u, p, r, n) {
    const online = isAppOnline();
    $('#uMode').val(m);

    if (m === 'add') {
        $('#uName').val('').prop('readonly', false);
        $('#uPass').val('');
        $('#uFull').val('');
        $('#uRole').val('User');
        $('#uPass').prop('required', true);
    } else {
        // Edit: username selalu readonly
        $('#uOld').val(u);
        $('#uName').val(u).prop('readonly', true);
        $('#uPass').val(''); // kosongkan — isi baru jika ingin ganti password
        $('#uRole').val(r);
        $('#uFull').val(n);

        if (online) {
            // Mode Online: password bisa diedit (biarkan kosong = tidak ganti)
            $('#uPass').prop('required', false);
            $('#uPass').attr('placeholder', 'Kosongkan jika tidak ingin ganti password');
        } else {
            // Mode Offline: password tidak bisa diedit
            $('#uPass').val('******').prop('readonly', true);
        }
    }

    new bootstrap.Modal('#modalUser').show();
}

function submitUser(e) {
    e.preventDefault();
    showLoadingTimer('Menyimpan User...');
    apiCall('saveUser', Object.fromEntries(new FormData(e.target))).then(r => {
        if (r.success) {
            Swal.fire('Berhasil', 'Data pengguna berhasil disimpan.', 'success');
            bootstrap.Modal.getInstance('#modalUser').hide();
            loadUsers();
        } else {
            Swal.fire('Gagal', r.message, 'error');
        }
    });
}

/**
 * Tampilkan daftar user.
 * Online: tarik dari Spreadsheet (real-time), tampilkan tombol Edit/Hapus.
 * Offline/Desktop: tampilkan pesan bahwa manajemen user hanya tersedia online.
 */
function loadUsers() {
    const online = isAppOnline();
    const $tbody = $('#tbody-users');

    if (!online) {
        if (typeof loadUserInfoPage === 'function') loadUserInfoPage();
        return;
    }

    $tbody.html('<tr><td colspan="6" class="text-center"><span class="spinner-border spinner-border-sm"></span> Memuat...</td></tr>');

    apiCall('getUsersList')
        .then(r => {
            if (!r || r.length === 0) {
                $tbody.html('<tr><td colspan="6" class="text-center text-muted">Belum ada data pengguna.</td></tr>');
                return;
            }
            let h = '';
            r.forEach((u, idx) => {
                h += `<tr>
                    <td>${idx + 1}</td>
                    <td>${u[0]}</td>
                    <td><span class="badge bg-secondary">••••••</span></td>
                    <td>${u[2] || '-'}</td>
                    <td>${u[3] || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1" onclick="modalUser('edit','${u[0]}','','${u[2]}','${u[3]}')" title="Edit Password">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="delUser('${u[0]}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            });
            $tbody.html(h);
        })
        .catch(err => {
            $tbody.html('<tr><td colspan="6" class="text-center text-danger">Gagal memuat data pengguna dari server.</td></tr>');
            console.error('[SiDiMAS] loadUsers error:', err);
        });
}


function delUser(u) { if (confirm('Hapus User ini?')) apiCall('deleteUser', { u: u }).then(loadUsers); }
function modalPrivasi() { new bootstrap.Modal(document.getElementById('modalPrivasi')).show(); }

function modalHelpdesk() {
    let email = $('#txtEmail').text() || "info@sekolah.sch.id";
    let web = $('#txtWeb').text() || "www.sekolah.sch.id";
    let telp = $('#inTelp').val() || "-";
    let wa = $('#inWaAdmin').val() || "";

    let waText = wa ? `<a href="https://wa.me/${wa.replace(/[^0-9]/g, '')}" target="_blank">${wa}</a>` : "Silakan hubungi Admin Sekolah";

    Swal.fire({
        title: 'Helpdesk Sekolah',
        html: `
            <div class="text-start mt-3" style="font-size: 0.95rem;">
                <p><i class="fas fa-phone-alt text-secondary me-2"></i> <strong>No Telp:</strong><br> <a href="tel:${telp}">${telp}</a></p>
                <p><i class="fab fa-whatsapp text-success me-2"></i> <strong>WhatsApp Admin:</strong><br> ${waText}</p>
                <p><i class="fas fa-envelope text-primary me-2"></i> <strong>Email:</strong><br> <a href="mailto:${email}">${email}</a></p>
                <p><i class="fas fa-globe text-info me-2"></i> <strong>Website:</strong><br> <a href="http://${web}" target="_blank">${web}</a></p>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Tutup',
        confirmButtonColor: 'var(--main-color)'
    });
}

