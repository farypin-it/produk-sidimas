// ==========================================
// AUTOCOMPLETE PEGAWAI & SISWA
// (Fix Mobile: focus trigger + touch events)
// ==========================================
(function() {
    let debounceTimer;
    const referenceCache = { pegawai: null, siswa: null };
    const referenceCacheTime = { pegawai: 0, siswa: 0 };
    const REFERENCE_CACHE_TTL = 2 * 60 * 1000;

    async function getReferenceData(type) {
        if (typeof isAppOnline === 'function' && isAppOnline()) {
            const now = Date.now();
            if (referenceCache[type] && now - referenceCacheTime[type] < REFERENCE_CACHE_TTL) {
                return referenceCache[type];
            }
            const response = await apiCall(type === 'pegawai' ? 'getPegawai' : 'getSiswa');
            if (!response || response.success !== true) {
                throw new Error(response && response.message || 'Gagal mengambil referensi dari Spreadsheet.');
            }
            referenceCache[type] = response.data || [];
            referenceCacheTime[type] = now;
            return referenceCache[type];
        }
        if (typeof isElectron !== 'undefined' && isElectron) {
            return type === 'pegawai' ? localDB.pegawai.toArray() : localDB.siswa.toArray();
        }
        return [];
    }

    window.invalidateAutocompleteReferenceCache = function(type) {
        if (type) {
            referenceCache[type] = null;
            referenceCacheTime[type] = 0;
            return;
        }
        Object.keys(referenceCache).forEach(key => {
            referenceCache[key] = null;
            referenceCacheTime[key] = 0;
        });
    };
    
    function closeAllLists(except) {
        $('.autocomplete-items').each(function() {
            if (except && (this === except || $.contains(this, except) || $.contains(except, this))) return;
            $(this).remove();
        });
    }
    
    // Tutup dropdown saat klik/tap di luar — pakai mousedown/touchstart agar lebih responsif di HP
    document.addEventListener('mousedown', function(e) {
        if (!$(e.target).closest('.autocomplete-items').length && !$(e.target).is('input')) {
            closeAllLists();
        }
    });
    document.addEventListener('touchstart', function(e) {
        if (!$(e.target).closest('.autocomplete-items').length && !$(e.target).is('input')) {
            closeAllLists();
        }
    }, { passive: true });

    async function fetchPegawai(keyword) {
        try {
            const data = await getReferenceData('pegawai');
            if (!keyword) return data.slice(0, 5);
            keyword = keyword.toLowerCase();
            return data.filter(p => p.nama && p.nama.toLowerCase().includes(keyword)).slice(0, 5);
        } catch (e) {
            console.error('Fetch Pegawai error:', e);
            return [];
        }
    }
    
    async function fetchSiswa(keyword) {
        try {
            const data = await getReferenceData('siswa');
            if (!keyword) return data.slice(0, 5);
            keyword = keyword.toLowerCase();
            return data.filter(s => s.nama && s.nama.toLowerCase().includes(keyword)).slice(0, 5);
        } catch (e) {
            console.error('Fetch Siswa error:', e);
            return [];
        }
    }

    function showAutocompleteList(inp, items, type) {
        closeAllLists();
        if (!items || items.length === 0) return;
        
        let a = document.createElement('DIV');
        a.setAttribute('id', inp.id + 'autocomplete-list');
        a.setAttribute('class', 'autocomplete-items');
        a.style.position = 'absolute';
        a.style.border = '1px solid #d4d4d4';
        a.style.borderTop = 'none';
        a.style.zIndex = 99999;
        a.style.top = '100%';
        a.style.left = 0;
        a.style.right = 0;
        a.style.backgroundColor = '#fff';
        a.style.maxHeight = '220px';
        a.style.overflowY = 'auto';
        a.style.boxShadow = '0px 6px 12px rgba(0,0,0,0.15)';
        a.style.borderRadius = '0 0 8px 8px';
        
        // Pastikan parent punya position:relative
        const parent = inp.parentNode;
        if (window.getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
        parent.appendChild(a);

        items.forEach(item => {
            let b = document.createElement('DIV');
            b.style.padding = '12px 10px';
            b.style.cursor = 'pointer';
            b.style.borderBottom = '1px solid #eee';
            b.style.webkitTapHighlightColor = 'rgba(0,0,0,0.1)';
            b.innerHTML = '<strong>' + item.nama + '</strong>';
            if (type === 'pegawai') {
                b.innerHTML += '<br><small class="text-muted">' + (item.nip || 'NIP: -') + ' | ' + (item.jabatan || 'Jabatan: -') + '</small>';
            } else {
                b.innerHTML += '<br><small class="text-muted">' + (item.nisn || 'NISN: -') + ' | Kls: ' + (item.kelas || '-') + '</small>';
            }
            
            function applySelection(e) {
                e.preventDefault();
                e.stopPropagation();
                inp.value = item.nama;
                
                if (type === 'pegawai') {
                    if (inp.name === 'tujuanNama') {
                        let box = $(inp).closest('.form-box');
                        box.find('input[name="tujuanNip"]').val(item.nip || '');
                        box.find('input[name="tujuanPangkat"]').val(item.pangkatGol || '');
                        box.find('input[name="tujuanJabatan"]').val(item.jabatan || '');
                    } else if (inp.name === 'kolSptNama[]') {
                        let tr = $(inp).closest('tr');
                        tr.find('input[name="kolSptNip[]"]').val(item.nip || '');
                        tr.find('input[name="kolSptPangkat[]"]').val(item.pangkatGol || '');
                        tr.find('input[name="kolSptJabatan[]"]').val(item.jabatan || '');
                    } else if (inp.name === 'kolSuketNama[]') {
                        let tr = $(inp).closest('tr');
                        tr.find('input[name="kolSuketNip[]"]').val(item.nip || '');
                        tr.find('input[name="kolSuketPangkat[]"]').val(item.pangkatGol || '');
                        tr.find('input[name="kolSuketJabatan[]"]').val(item.jabatan || '');
                    } else if (inp.name === 'kepsekNama') {
                        let box = $(inp).closest('#pimpinan-pane');
                        box.find('input[name="kepsekNip"]').val(item.nip || '');
                        box.find('select[name="kepsekPangkat"]').val(item.pangkatGol || '');
                    } else if (inp.name === 'anNama') {
                        let box = $(inp).closest('#boxAtasNama');
                        box.find('input[name="anNip"]').val(item.nip || '');
                        box.find('input[name="anPangkat"]').val(item.pangkatGol || '');
                    }
                } else if (type === 'siswa') {
                    if (inp.name === 'siswaNama') {
                        let box = $(inp).closest('.form-box');
                        box.find('input[name="siswaNis"]').val((item.nisn ? item.nisn : item.nipd) || '');
                        let ttl = (item.tmptLahir || '') + (item.tmptLahir && item.tglLahir ? ', ' : '') + (item.tglLahir || '');
                        box.find('input[name="siswaTtl"]').val(ttl);
                        box.find('select[name="siswaJk"]').val(item.jk === 'P' || item.jk === 'Perempuan' ? 'Perempuan' : 'Laki-laki');
                        box.find('input[name="siswaKelas"]').val(item.kelas || '');
                        box.find('input[name="siswaOrtu"]').val(item.namaAyah || item.namaIbu || '');
                    } else if (inp.name === 'kolSisNama[]') {
                        let tr = $(inp).closest('tr');
                        tr.find('input[name="kolSisNis[]"]').val((item.nisn ? item.nisn : item.nipd) || '');
                        let ttl = (item.tmptLahir || '') + (item.tmptLahir && item.tglLahir ? ', ' : '') + (item.tglLahir || '');
                        tr.find('input[name="kolSisTtl[]"]').val(ttl);
                        tr.find('select[name="kolSisJk[]"]').val(item.jk === 'P' || item.jk === 'Perempuan' ? 'Perempuan' : 'Laki-laki');
                        tr.find('input[name="kolSisKelas[]"]').val(item.kelas || '');
                        tr.find('input[name="kolSisOrtu[]"]').val(item.namaAyah || item.namaIbu || '');
                    }
                }
                
                closeAllLists();
                if (typeof updatePreview === 'function') updatePreview();
            }
            
            // Gunakan touchend untuk HP (lebih responsif) dan mousedown untuk laptop
            b.addEventListener('touchend', applySelection, { passive: false });
            b.addEventListener('mousedown', applySelection);
            a.appendChild(b);
        });
    }

    // ─── Daftar field selector ───────────────────────────────────────────
    const PEGAWAI_FIELDS = 'input[name="tujuanNama"], input[name="kolSptNama[]"], input[name="kolSuketNama[]"], input[name="kepsekNama"], input[name="anNama"]';
    const SISWA_FIELDS   = 'input[name="siswaNama"], input[name="kolSisNama[]"]';

    // ─── INPUT event (Keyboard typing) ──────────────────────────────────
    $(document).on('input', PEGAWAI_FIELDS, function() {
        clearTimeout(debounceTimer);
        const inp = this, val = this.value;
        debounceTimer = setTimeout(async () => {
            const items = await fetchPegawai(val);
            showAutocompleteList(inp, items, 'pegawai');
        }, 300);
    });

    $(document).on('input', SISWA_FIELDS, function() {
        clearTimeout(debounceTimer);
        const inp = this, val = this.value;
        debounceTimer = setTimeout(async () => {
            const items = await fetchSiswa(val);
            showAutocompleteList(inp, items, 'siswa');
        }, 300);
    });

    // ─── FOCUS event (Tap di HP — tampilkan daftar langsung tanpa ketik) ─
    $(document).on('focus', PEGAWAI_FIELDS, function() {
        clearTimeout(debounceTimer);
        const inp = this, val = this.value;
        debounceTimer = setTimeout(async () => {
            const items = await fetchPegawai(val);
            showAutocompleteList(inp, items, 'pegawai');
        }, 200);
    });

    $(document).on('focus', SISWA_FIELDS, function() {
        clearTimeout(debounceTimer);
        const inp = this, val = this.value;
        debounceTimer = setTimeout(async () => {
            const items = await fetchSiswa(val);
            showAutocompleteList(inp, items, 'siswa');
        }, 200);
    });

    // ─── CSS hover & active (touch-friendly) ────────────────────────────
    let style = document.createElement('style');
    style.innerHTML = `
        .autocomplete-items div:hover,
        .autocomplete-items div:active {
            background-color: #e8f0fe;
        }
    `;
    document.head.appendChild(style);

})();
