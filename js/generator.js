
function buildDocxFromDataObj(zip, dataObj, templateName, sKop) {
    const doc = new window.docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: function (part) {
            if (!part.module) { return ""; }
            if (part.module === "rawxml") { return ""; }
            return "";
        }
    });

    const tags = { ...dataObj };

    tags['NAMA_INSTANSI'] = (sKop.nama_instansi || "").toUpperCase();
    tags['NAMA_OPD'] = (sKop.nama_opd || "").toUpperCase();
    tags['NAMA_SEKOLAH'] = (sKop.nama_sekolah || "").toUpperCase();
    tags['ALAMAT_SEKOLAH'] = sKop.alamat_sekolah || "";
    tags['EMAIL_SEKOLAH'] = sKop.email_sekolah || "";
    tags['WEBSITE_SEKOLAH'] = sKop.website_sekolah || "";
    tags['KOTA_SURAT'] = sKop.kota_surat || "";
    tags['KODE_LEMBAGA'] = sKop.kode_lembaga || "";

    tags['NOMOR_SURAT'] = dataObj.nomorFull || (document.getElementById('previewNomor') ? document.getElementById('previewNomor').innerText : '');
    tags['SIFAT'] = dataObj.sifatSurat || '';
    tags['LAMPIRAN'] = dataObj.lampiranSurat || '';
    tags['PERIHAL'] = dataObj.perihal || '';
    tags['TANGGAL_SURAT'] = dataObj.tanggalSuratFull || '';
    tags['TANGGAL_SAJA'] = dataObj.tanggalSaja || '';
    tags['TEMPAT_TITIMANGSA'] = sKop.kota_surat || 'Tempat';

    tags['TUJUAN_NAMA'] = dataObj.tujuanNama || '';
    tags['TUJUAN_BIDANG'] = dataObj.tujuanBidang || dataObj.tujuanJabatan || '';
    tags['TUJUAN_TEMPAT'] = dataObj.tujuanTempat || dataObj.tujuanAlamat || '';

    tags['ISI_UMUM'] = dataObj.isiUmum || dataObj.isiSurat || '';
    tags['ISI_PENUTUP'] = dataObj.isiPenutup || '';
    tags['SK_MENIMBANG'] = dataObj.skMenimbang || '';
    tags['SK_MENGINGAT'] = dataObj.skMengingat || '';
    tags['SK_MENETAPKAN'] = dataObj.skMenetapkan || '';

    const isAn = dataObj.useAtasNama === 'on';
    tags['TTD_NAMA'] = isAn ? (dataObj.anNama || '') : (dataObj.ttdNama || sKop.kepsek_nama || '');
    tags['TTD_NIP'] = isAn ? (dataObj.anNip || '') : (dataObj.ttdNip || sKop.kepsek_nip || '');
    tags['TTD_PANGKAT'] = isAn ? (dataObj.anPangkat || '') : (dataObj.ttdPangkat || sKop.kepsek_pangkat || '');
    tags['TTD_DINAMIS'] = '###TTD_DINAMIS###';
    tags['TTD_DINAMIS_TANGGAL'] = '###TTD_DINAMIS_TANGGAL###';
    tags['QR_TTE'] = '';

    tags['TEMBUSAN'] = dataObj.tembusanSurat || '';

    tags['HARI_ACARA'] = dataObj.hariAcara || '';
    tags['TANGGAL_ACARA'] = dataObj.tglAcaraIndo || '';
    if (typeof formatHariRentangIndo === 'function' && dataObj.undanganTglMulai) {
        tags['HARI_ACARA_RENTANG'] = formatHariRentangIndo(dataObj.undanganTglMulai, dataObj.undanganTglSelesai);
        tags['TANGGAL_ACARA_RENTANG'] = formatRentangTglIndo(dataObj.undanganTglMulai, dataObj.undanganTglSelesai);
    }
    tags['WAKTU_ACARA'] = dataObj.waktuAcara || '';
    tags['TEMPAT_ACARA'] = dataObj.tempatAcara || '';
    tags['ACARA_DETAIL'] = dataObj.acaraDetail || '';
    tags['TUJUAN_JABATAN'] = dataObj.tujuanJabatan || dataObj.tujuanBidang || '';

    tags['JUDUL_TABEL'] = dataObj.judulTabel || '';
    tags['TABLE_LAMPIRAN'] = dataObj.dataTabelLampiran ? '###TABEL_LAMPIRAN###' : '';
    tags['TABLE_PENGANTAR'] = dataObj.pengantarIsi ? '###TABEL_PENGANTAR###' : '';

    tags['SPPD_ANGKUTAN'] = dataObj.sppdAngkutan || '';
    tags['SPPD_TUJUAN'] = dataObj.sppdTujuan || '';
    if (typeof formatTglIndo === 'function' && dataObj.sppdTglMulai) {
        tags['SPPD_TGL_MULAI'] = formatTglIndo(dataObj.sppdTglMulai);
        tags['SPPD_TGL_SELESAI'] = formatTglIndo(dataObj.sppdTglSelesai);
        tags['SPPD_TGL_RENTANG'] = formatRentangTglIndo(dataObj.sppdTglMulai, dataObj.sppdTglSelesai);
        tags['SPPD_HARI_RENTANG'] = formatHariRentangIndo(dataObj.sppdTglMulai, dataObj.sppdTglSelesai);
        tags['SPPD_HARI_MULAI'] = formatHariIndo(dataObj.sppdTglMulai);
        tags['SPPD_HARI_SELESAI'] = formatHariIndo(dataObj.sppdTglSelesai);
    }
    tags['SPPD_LAMA'] = dataObj.sppdLama || '';

    tags['SUKET_ISI'] = dataObj.suketIsi || '';
    tags['SISWA_NAMA'] = dataObj.siswaNama || '';
    tags['SISWA_NIS'] = dataObj.siswaNis || '';
    tags['SISWA_TTL'] = dataObj.siswaTtl || '';
    tags['SISWA_JK'] = dataObj.siswaJk || '';
    tags['SISWA_KELAS'] = dataObj.siswaKelas || '';
    tags['SISWA_ORTU'] = dataObj.siswaOrtu || '';
    tags['SISWA_KET'] = dataObj.siswaKet || '';

    if (typeof formatHariIndo === 'function' && dataObj.sptMulai) {
        tags['SPT_HARI'] = formatHariIndo(dataObj.sptMulai);
        tags['SPT_TANGGAL'] = formatTglIndo(dataObj.sptMulai);
        tags['SPT_TGL_RENTANG'] = formatRentangTglIndo(dataObj.sptMulai, dataObj.sptSelesai);
        tags['SPT_HARI_RENTANG'] = formatHariRentangIndo(dataObj.sptMulai, dataObj.sptSelesai);
        tags['SPT_HARI_SELESAI'] = formatHariIndo(dataObj.sptSelesai);
        tags['SPT_TANGGAL_SELESAI'] = formatTglIndo(dataObj.sptSelesai);
    }
    tags['SPT_TEMPAT'] = dataObj.sptTempat || '';
    tags['SPT_WAKTU'] = dataObj.sptWaktu || '';

    tags['IZIN_ALASAN'] = dataObj.izinAlasan || '';
    if (typeof formatTglIndo === 'function' && dataObj.izinTglMulai) {
        tags['IZIN_TGL_MULAI'] = formatTglIndo(dataObj.izinTglMulai);
        tags['IZIN_TGL_SELESAI'] = formatTglIndo(dataObj.izinTglSelesai);
        tags['IZIN_TGL_RENTANG'] = formatRentangTglIndo(dataObj.izinTglMulai, dataObj.izinTglSelesai);
        tags['IZIN_HARI_RENTANG'] = formatHariRentangIndo(dataObj.izinTglMulai, dataObj.izinTglSelesai);
        tags['IZIN_HARI_MULAI'] = formatHariIndo(dataObj.izinTglMulai);
    }

    tags['SPMT_JABATAN_BARU'] = dataObj.spmtJabatanBaru || '';
    if (typeof formatTglIndo === 'function' && dataObj.spmtTglMulai) {
        tags['SPMT_TGL_MULAI'] = formatTglIndo(dataObj.spmtTglMulai);
        tags['SPMT_TGL_SELESAI'] = formatTglIndo(dataObj.spmtTglSelesai);
        tags['SPMT_TGL_RENTANG'] = formatRentangTglIndo(dataObj.spmtTglMulai, dataObj.spmtTglSelesai);
        tags['SPMT_HARI_RENTANG'] = formatHariRentangIndo(dataObj.spmtTglMulai, dataObj.spmtTglSelesai);
        tags['SPMT_HARI_MULAI'] = formatHariIndo(dataObj.spmtTglMulai);
    }

    tags['TUJUAN_NIP'] = dataObj.tujuanNip || '';
    tags['TUJUAN_PANGKAT'] = dataObj.tujuanPangkat || '';
    tags['TUJUAN_BIDANG'] = dataObj.tujuanBidang || dataObj.tujuanJabatan || '';
    tags['TUJUAN_ALAMAT'] = dataObj.tujuanAlamat || '';
    tags['DASAR_HUKUM'] = dataObj.dasarHukum || '';
    tags['NAMA_SEKOLAH'] = tags['NAMA_SEKOLAH'] || (sKop.nama_sekolah || '').toUpperCase();

    tags['isSendirian'] = true;
    tags['isKolektif'] = false;
    tags['isLampiran'] = false;
    tags['tabelKolektif'] = '';

    let xmlKolektif = '';

    function buildXmlTabelKolektif(headers, rows, widths) {
        let xml = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/><w:jc w:val="center"/><w:tblBorders>';
        xml += '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
        xml += '<w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
        xml += '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
        xml += '<w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
        xml += '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
        xml += '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
        xml += '</w:tblBorders></w:tblPr><w:tblGrid>';
        for (let i = 0; i < headers.length; i++) xml += '<w:gridCol/>';
        xml += '</w:tblGrid>';

        const parseCell = (val) => {
            let parts = String(val).split('<br/>');
            return parts.map(p => `<w:t>${p}</w:t>`).join('<w:br/>');
        };

        xml += '<w:tr><w:trPr><w:trHeight w:val="400"/><w:jc w:val="center"/></w:trPr>';
        headers.forEach((h, i) => {
            let w = widths && widths[i] ? widths[i] : 1000;
            xml += `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="pct"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr>${parseCell(h)}</w:r></w:p></w:tc>`;
        });
        xml += '</w:tr>';

        rows.forEach((row, idx) => {
            xml += '<w:tr><w:trPr><w:trHeight w:val="400"/></w:trPr>';
            row.forEach((cell, cidx) => {
                let jc = cidx === 0 ? 'center' : 'left';
                let w = widths && widths[cidx] ? widths[cidx] : 1000;
                xml += `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="pct"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="${jc}"/></w:pPr><w:r>${parseCell(cell)}</w:r></w:p></w:tc>`;
            });
            xml += '</w:tr>';
        });
        xml += '</w:tbl>';
        return xml;
    }

    function readKolektifFromTable(tableId, colNames) {
        let result = {};
        colNames.forEach(col => result[col] = []);
        if (typeof $ !== "undefined") {
            $(`#${tableId} tbody tr`).each(function () {
                let cells = $(this).find('input, select');
                colNames.forEach((col, i) => {
                    result[col].push($(cells[i]).val() || '');
                });
            });
        }
        return result;
    }

    if (templateName === '6. Surat Tugas (ST).docx') {
        let modeSpt = dataObj.modeSpt || 'sendirian';
        tags['isSendirian'] = modeSpt === 'sendirian';
        tags['isKolektif'] = modeSpt === 'kolektif';
        tags['isLampiran'] = modeSpt === 'lampiran';
        if (modeSpt === 'kolektif') {
            tags['tabelKolektif'] = '{TABEL_KOLEKTIF}';
            const kData = readKolektifFromTable('tblSptKolektif', ['nama', 'nip', 'pangkat', 'jabatan', 'ket']);
            let headers = ['No', 'Nama Pegawai<br/>NIP', 'Pangkat / Gol', 'Jabatan', 'Keterangan'];
            let widths = [300, 1800, 1000, 1100, 800];
            let rows = [];
            for (let i = 0; i < (kData.nama ? kData.nama.length : 0); i++) {
                rows.push([i + 1, (kData.nama[i] || '-') + '<br/>' + (kData.nip[i] || '-'), kData.pangkat[i] || '-', kData.jabatan[i] || '-', kData.ket[i] || '-']);
            }
            if (rows.length > 0) xmlKolektif = buildXmlTabelKolektif(headers, rows, widths);
        }
    } else if (templateName === '4. Surat Keterangan.docx') {
        let modeSuket = dataObj.modeSuket || 'sendirian';
        tags['isSendirian'] = modeSuket === 'sendirian';
        tags['isKolektif'] = modeSuket === 'kolektif';
        tags['isLampiran'] = modeSuket === 'lampiran';
        if (modeSuket === 'kolektif') {
            tags['tabelKolektif'] = '{TABEL_KOLEKTIF}';
            const kData = readKolektifFromTable('tblSuketKolektif', ['nama', 'nip', 'pangkat', 'jabatan', 'ket']);
            let headers = ['No', 'Nama Pegawai<br/>NIP', 'Pangkat / Gol', 'Jabatan', 'Keterangan'];
            let widths = [300, 1800, 1000, 1100, 800];
            let rows = [];
            for (let i = 0; i < (kData.nama ? kData.nama.length : 0); i++) {
                rows.push([i + 1, (kData.nama[i] || '-') + '<br/>' + (kData.nip[i] || '-'), kData.pangkat[i] || '-', kData.jabatan[i] || '-', kData.ket[i] || '-']);
            }
            if (rows.length > 0) xmlKolektif = buildXmlTabelKolektif(headers, rows, widths);
        }
    } else if (templateName === '7. Surat Keterangan Siswa.docx') {
        let modeSis = dataObj.modeSis || 'sendirian';
        tags['isSendirian'] = modeSis === 'sendirian';
        tags['isKolektif'] = modeSis === 'kolektif';
        tags['isLampiran'] = modeSis === 'lampiran';
        if (modeSis === 'kolektif') {
            tags['tabelKolektif'] = '{TABEL_KOLEKTIF}';
            const kData = readKolektifFromTable('tblSisKolektif', ['nama', 'nis', 'ttl', 'jk', 'kelas', 'ortu', 'ket']);
            let headers = ['No', 'Nama Siswa<br/>NIS/NISN', 'Tempat, Tanggal Lahir', 'JK', 'Kelas', 'Nama Ortu', 'Keterangan'];
            let widths = [250, 1250, 1000, 400, 500, 800, 800];
            let rows = [];
            for (let i = 0; i < (kData.nama ? kData.nama.length : 0); i++) {
                rows.push([i + 1, (kData.nama[i] || '-') + '<br/>' + (kData.nis[i] || '-'), kData.ttl[i] || '-', kData.jk[i] || '-', kData.kelas[i] || '-', kData.ortu[i] || '-', kData.ket[i] || '-']);
            }
            if (rows.length > 0) xmlKolektif = buildXmlTabelKolektif(headers, rows, widths);
        }
    }

    doc.render(tags);

    let finalXmlDoc = doc.getZip().file('word/document.xml').asText();

    function replaceParagraph(xmlStr, marker, replacement) {
        let idx = xmlStr.indexOf(marker);
        while (idx !== -1) {
            let before = xmlStr.substring(0, idx);
            let after = xmlStr.substring(idx + marker.length);
            let startTag = Math.max(before.lastIndexOf('<w:p '), before.lastIndexOf('<w:p>'));
            let endTag = after.indexOf('</w:p>');
            if (startTag !== -1 && endTag !== -1) {
                xmlStr = xmlStr.substring(0, startTag) + replacement + after.substring(endTag + 6);
                idx = xmlStr.indexOf(marker, startTag + replacement.length);
            } else {
                xmlStr = before + replacement + after;
                idx = xmlStr.indexOf(marker, before.length + replacement.length);
            }
        }
        return xmlStr;
    }

    if (xmlKolektif) {
        finalXmlDoc = replaceParagraph(finalXmlDoc, '{TABEL_KOLEKTIF}', xmlKolektif);
    }

    if (dataObj.dataTabelLampiran) {
        try {
            const tabelData = JSON.parse(dataObj.dataTabelLampiran);
            let tblXml = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/><w:jc w:val="center"/><w:tblBorders>';
            tblXml += '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '<w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '<w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '</w:tblBorders></w:tblPr>';
            if (tabelData.length > 0) {
                tblXml += '<w:tblGrid>';
                for (let c = 0; c < tabelData[0].length; c++) tblXml += '<w:gridCol w:w="3000"/>';
                tblXml += '</w:tblGrid>';
            }
            tabelData.forEach((row, ri) => {
                const isBold = ri === 0;
                tblXml += '<w:tr>';
                row.forEach(cell => {
                    const safe = (cell || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const shade = isBold ? '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="D0E4FF"/></w:tcPr>' : '';
                    const bold = isBold ? '<w:b/>' : '';
                    tblXml += `<w:tc>${shade}<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>${bold}<w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r></w:p></w:tc>`;
                });
                tblXml += '</w:tr>';
            });
            tblXml += '</w:tbl>';
            finalXmlDoc = replaceParagraph(finalXmlDoc, '###TABEL_LAMPIRAN###', tblXml);
        } catch (e) { }
    } else {
        finalXmlDoc = finalXmlDoc.replace(/###TABEL_LAMPIRAN###/g, '');
    }

    if (dataObj.pengantarIsi) {
        try {
            let tblXml = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>';
            tblXml += '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '<w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '<w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
            tblXml += '</w:tblBorders></w:tblPr>';
            tblXml += '<w:tblGrid><w:gridCol w:w="1000"/><w:gridCol w:w="4000"/><w:gridCol w:w="2000"/><w:gridCol w:w="3000"/></w:tblGrid>';
            tblXml += '<w:tr><w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="D0E4FF"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>No</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="D0E4FF"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Jenis yang dikirim</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="D0E4FF"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Banyaknya</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="D0E4FF"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Keterangan</w:t></w:r></w:p></w:tc></w:tr>';
            const safeIsi = (dataObj.pengantarIsi || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeJml = (dataObj.pengantarJml || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeKet = (dataObj.pengantarKet || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            tblXml += `<w:tr><w:tc><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr><w:t>1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${safeIsi}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${safeJml}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${safeKet}</w:t></w:r></w:p></w:tc></w:tr>`;
            tblXml += '</w:tbl>';
            finalXmlDoc = replaceParagraph(finalXmlDoc, '###TABEL_PENGANTAR###', tblXml);
        } catch (e) { }
    } else {
        finalXmlDoc = finalXmlDoc.replace(/###TABEL_PENGANTAR###/g, '');
    }

    if (finalXmlDoc.includes('###TTD_DINAMIS###') || finalXmlDoc.includes('###TTD_DINAMIS_TANGGAL###')) {
        try {
            const safeTgl = (dataObj.tanggalSuratFull || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeNama = (isAn ? (dataObj.anNama || '') : (dataObj.ttdNama || sKop.kepsek_nama || '')).toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safePangkat = (isAn ? (dataObj.anPangkat || '') : (dataObj.ttdPangkat || sKop.kepsek_pangkat || '')).toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeNip = (isAn ? (dataObj.anNip || '') : (dataObj.ttdNip || sKop.kepsek_nip || '')).toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeJabatanAn = (dataObj.anJabatan || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            let buildTtdXml = (withTanggal) => {
                let ttdXml = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr>';
                ttdXml += '<w:tblGrid><w:gridCol w:w="5500"/><w:gridCol w:w="4500"/></w:tblGrid>';
                ttdXml += '<w:tr><w:tc><w:tcPr><w:tcW w:w="2750" w:type="pct"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="2250" w:type="pct"/></w:tcPr>';

                if (withTanggal) {
                    ttdXml += `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${safeTgl}</w:t></w:r></w:p>`;
                }

                if (isAn) {
                    ttdXml += `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">a.n. Kepala Sekolah,</w:t></w:r></w:p>`;
                    ttdXml += `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${safeJabatanAn}</w:t></w:r></w:p>`;
                } else {
                    ttdXml += `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">Kepala Sekolah,</w:t></w:r></w:p>`;
                }

                ttdXml += `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`;
                ttdXml += `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${safeNama}</w:t></w:r></w:p>`;
                ttdXml += `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${safePangkat}</w:t></w:r></w:p>`;
                ttdXml += `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">NIP. ${safeNip}</w:t></w:r></w:p>`;

                ttdXml += '</w:tc></w:tr></w:tbl>';
                return ttdXml;
            };

            if (finalXmlDoc.includes('###TTD_DINAMIS###')) {
                finalXmlDoc = replaceParagraph(finalXmlDoc, '###TTD_DINAMIS###', buildTtdXml(false));
            }
            if (finalXmlDoc.includes('###TTD_DINAMIS_TANGGAL###')) {
                finalXmlDoc = replaceParagraph(finalXmlDoc, '###TTD_DINAMIS_TANGGAL###', buildTtdXml(true));
            }
        } catch (e) { }
    }

    if (dataObj.orientasiHalaman) {
        try {
            const targetOrient = dataObj.orientasiHalaman;
            finalXmlDoc = finalXmlDoc.replace(/<w:pgSz[^>]*>/g, function (match) {
                let w = match.match(/w:w="([0-9]+)"/);
                let h = match.match(/w:h="([0-9]+)"/);
                let currOrient = match.match(/w:orient="([^"]+)"/);
                currOrient = currOrient ? currOrient[1] : 'portrait';

                if (w && h && currOrient !== targetOrient) {
                    return `<w:pgSz w:w="${h[1]}" w:h="${w[1]}" w:orient="${targetOrient}"/>`;
                } else if (currOrient !== targetOrient && (!w || !h)) {
                    return match.replace(/>$/, ` w:orient="${targetOrient}"/>`);
                }
                return match;
            });
        } catch (errOrient) { console.warn('Gagal mengubah orientasi halaman:', errOrient); }
    }

    doc.getZip().file('word/document.xml', finalXmlDoc);
    return doc;
}
/* --- GENERATOR SURAT --- */
function toggleModeAreas(radioName, prefix) {
    const selectedMode = $(`input[name="${radioName}"]:checked`).val() || 'sendirian';
    ['sendirian', 'kolektif', 'lampiran'].forEach(mode => {
        const area = $(`#${prefix}Area${mode.charAt(0).toUpperCase()}${mode.slice(1)}`);
        const isVisible = mode === selectedMode;
        area.toggleClass('hide', !isVisible)
            .find('input, textarea, select, button').prop('disabled', !isVisible);
    });
}

function toggleModeSpt() { toggleModeAreas('modeSpt', 'spt'); }
function toggleModeSuket() { toggleModeAreas('modeSuket', 'suket'); }
function toggleModeSis() { toggleModeAreas('modeSis', 'sis'); }

function gantiFormSurat() {
    const t = $('#pilihJenisSurat option:selected').text().toLowerCase() || "";
    $('.form-box').addClass('d-none').find('input,textarea,select').prop('disabled', true);
    let aid = '#box-umum';
    if (t.includes('melaksanakan tugas') || t.includes('spmt') || t.includes('skmt')) { aid = '#box-spmt'; } else if (t.includes('keterangan siswa') || t.includes('siswa')) { aid = '#box-sis'; } else if (t.includes('tugas') || t.includes('spt')) { aid = '#box-spt'; } else if (t.includes('sk') || t.includes('keputusan')) { aid = '#box-sk'; } else if (t.includes('perjalanan')) { aid = '#box-sppd'; } else if (t.includes('surat izin') || t.includes('izin')) { aid = '#box-izin'; } else if (t.includes('keterangan')) { aid = '#box-suket'; } else if (t.includes('nota')) { aid = '#box-nota'; } else if (t.includes('pengantar')) { aid = '#box-pengantar'; } else if (t.includes('undangan')) { aid = '#box-undangan'; } else if (t.includes('lampiran')) { aid = '#box-lampiran'; }
    $(aid).removeClass('d-none').find('input,textarea,select').prop('disabled', false);

    if (aid === '#box-spt') toggleModeSpt();
    else if (aid === '#box-suket') toggleModeSuket();
    else if (aid === '#box-sis') toggleModeSis();

    // Logika memunculkan Tembusan untuk jenis surat tertentu
    const showTembusan = ['umum', 'dinas', 'undangan', 'keputusan', 'sk', 'tugas', 'spmt', 'skmt', 'nota', 'izin'].some(k => t.includes(k));
    if (showTembusan) {
        $('#box-tembusan').removeClass('d-none').find('textarea').prop('disabled', false);
    } else {
        $('#box-tembusan').addClass('d-none').find('textarea').prop('disabled', true);
    }

    // Auto-fill Kode Klasifikasi ke 400.3.8 secara default jika belum dipilih user
    const kodeSekarang = $('#selKodeArsip').val();
    if (!kodeSekarang) {
        let targetKode = '400.3.8';
        let found = false;
        $('#selKodeArsip option').each(function () {
            const val = $(this).val();
            if (val === targetKode || val.startsWith(targetKode)) {
                $('#selKodeArsip').val(val).trigger('change');
                found = true;
                return false;
            }
        });
        if (!found) {
            let keywords = '';
            if (t.includes('undangan')) keywords = 'undangan';
            else if (t.includes('keputusan') || t.includes('sk')) keywords = 'keputusan';
            else if (t.includes('perjalanan') || t.includes('sppd')) keywords = 'perjalanan';
            else if (t.includes('tugas') || t.includes('spt')) keywords = 'tugas';
            else if (t.includes('keterangan') || t.includes('suket')) keywords = 'keterangan';
            else if (t.includes('izin')) keywords = 'izin';
            else if (t.includes('nota')) keywords = 'nota';
            else if (t.includes('pengantar')) keywords = 'pengantar';

            if (keywords) {
                $('#selKodeArsip option').each(function () {
                    if ($(this).text().toLowerCase().includes(keywords)) {
                        $('#selKodeArsip').val($(this).val()).trigger('change');
                        found = true;
                        return false;
                    }
                });
            }
        }
    }

    loadAutoNumber();
    if (typeof updateLiveSuratPreview === 'function') updateLiveSuratPreview();
}


function loadAutoNumber() {
    apiCall('getAutoNumberData').then(r => {
        if (r.success) {
            if ($('#inpNoUrut').val() === "") { $('#inpNoUrut').val(r.nextNo); }
            $('#inpKodeSekolah').val(r.kodeSekolah);
            updatePreview();
        }
    }).catch(err => {
        // Mode Offline: Cari dari suratKeluar lokal
        localDB.suratKeluar.toArray().then(surat => {
            let maxNo = 0;
            surat.forEach(s => {
                if (s.noSurat) {
                    let parts = s.noSurat.split('/');
                    if (parts.length >= 2) {
                        let num = parseInt(parts[1], 10);
                        if (!isNaN(num) && num > maxNo) { maxNo = num; }
                    }
                }
            });
            let nextNoStr = String(maxNo + 1).padStart(3, '0');
            if ($('#inpNoUrut').val() === "") { $('#inpNoUrut').val(nextNoStr); }

            // Isi Kode Sekolah dari Pengaturan Lokal
            const sStr = localStorage.getItem('sidimas_settings');
            if (sStr) {
                try {
                    const set = JSON.parse(sStr);
                    if (set.kode_lembaga) { $('#inpKodeSekolah').val(set.kode_lembaga); }
                } catch (e) { }
            }
            updatePreview();
        }).catch(e => {
            if ($('#inpNoUrut').val() === "") { $('#inpNoUrut').val("001"); }
            updatePreview();
        });
    });
}
function updatePreview() {
    const d = new Date();
    const romawi = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][d.getMonth()];
    const format = $('input[name="formatNomor"]:checked').val();
    
    // Status Switch Variabel Bulan
    const useBulan = $('#switchBulan').length ? $('#switchBulan').is(':checked') : true;

    // Perbarui indikator teks di radio label & badge switch
    if (useBulan) {
        $('.var-bulan-sep').text(' / Bulan / ');
        $('#lblStatusBulan').text('ON').removeClass('text-muted').addClass('text-success');
    } else {
        $('.var-bulan-sep').text(' / ');
        $('#lblStatusBulan').text('OFF').removeClass('text-success').addClass('text-muted');
    }

    const kode = $('#selKodeArsip').val() || '...';
    const noUrut = $('#inpNoUrut').val() || '...';
    const kodeLembaga = $('#inpKodeSekolah').val() || '...';
    const tahun = d.getFullYear();
    const partBulan = useBulan ? `/${romawi}` : '';
    
    let f = '';
    if (format === 'format2') {
        f = `${noUrut}/${kode}/${kodeLembaga}${partBulan}/${tahun}`;
    } else {
        f = `${kode}/${noUrut}/${kodeLembaga}${partBulan}/${tahun}`;
    }
    $('#previewNomor').text(f);
    $('#nomorFull').val(f);
    if (typeof updateLiveSuratPreview === 'function') updateLiveSuratPreview();
}
function updateTanggalSurat() { if ($('#inpTglSurat').val()) { const tgl = new Date($('#inpTglSurat').val()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); const kota = $('#inpTempatTitimangsa').val() || "Tempat"; $('#tanggalSuratFull').val(kota + ", " + tgl); } }
function updateTanggalSaja() { const v = $('#inpTglSaja').val(); if (v) { const d = new Date(v); $('#valHariSaja').val(d.toLocaleDateString('id-ID', { weekday: 'long' })); $('#valTglSaja').val(d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })); $('#inpTglSurat').val(v); updateTanggalSurat(); } if (typeof updateLiveSuratPreview === 'function') updateLiveSuratPreview(); }
function updateHariAcara() { 
    const v = $('#inpTglAcara').val(); 
    const v2 = $('#inpTglAcaraSelesai').val(); 
    if (v) { 
        $('#valHariAcara').val(formatHariRentangIndo(v, v2)); 
        $('#valTglAcaraIndo').val(formatRentangTglIndo(v, v2)); 
    } 
}

/**
 * Mengonversi string tanggal yyyy-mm-dd menjadi format Indonesia panjang.
 * Contoh: '2026-07-02' → '02 Juli 2026'
 */
function formatTglIndo(rawDate) {
    if (!rawDate) return '';
    // Tambahkan 'T00:00:00' agar tidak terjadi offset timezone
    const d = new Date(rawDate + 'T00:00:00');
    if (isNaN(d)) return rawDate; // Kembalikan apa adanya jika tidak valid
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Mengonversi string tanggal yyyy-mm-dd menjadi nama hari dalam Bahasa Indonesia.
 * Contoh: '2026-07-02' → 'Kamis'
 */
function formatHariIndo(rawDate) {
    if (!rawDate) return '';
    const d = new Date(rawDate + 'T00:00:00');
    if (isNaN(d)) return '';
    return d.toLocaleDateString('id-ID', { weekday: 'long' });
}

/**
 * Menghasilkan format rentang tanggal Indonesia yang cerdas.
 * - 1 hari  : '6 Juli 2026'
 * - Bln sama: '6-9 Juli 2026'
 * - Bln beda: '6 Juli - 9 Agustus 2026'
 */
function formatRentangTglIndo(tglMulai, tglSelesai) {
    if (!tglMulai) return '';
    const dMulai = new Date(tglMulai + 'T00:00:00');
    if (isNaN(dMulai)) return tglMulai;

    const optsHari = { day: 'numeric' };
    const optsBln = { month: 'long' };
    const optsThn = { year: 'numeric' };
    const optsLengkap = { day: 'numeric', month: 'long', year: 'numeric' };

    // Jika tidak ada tanggal selesai atau sama dengan tanggal mulai
    if (!tglSelesai || tglSelesai === tglMulai) {
        return dMulai.toLocaleDateString('id-ID', optsLengkap);
    }

    const dSelesai = new Date(tglSelesai + 'T00:00:00');
    if (isNaN(dSelesai)) return dMulai.toLocaleDateString('id-ID', optsLengkap);

    const bulanMulai = dMulai.getMonth();
    const bulanSelesai = dSelesai.getMonth();
    const tahunMulai = dMulai.getFullYear();
    const tahunSelesai = dSelesai.getFullYear();

    if (tahunMulai === tahunSelesai && bulanMulai === bulanSelesai) {
        // Bulan & tahun sama: '6 s.d. 9 Juli 2026'
        const tgl1 = dMulai.toLocaleDateString('id-ID', optsHari);
        const tgl2 = dSelesai.toLocaleDateString('id-ID', optsHari);
        const bln = dMulai.toLocaleDateString('id-ID', optsBln);
        const thn = dMulai.toLocaleDateString('id-ID', optsThn);
        return `${tgl1} s.d. ${tgl2} ${bln} ${thn}`;
    } else {
        // Beda bulan atau tahun: '6 Juli s.d. 9 Agustus 2026'
        return `${dMulai.toLocaleDateString('id-ID', optsLengkap)} s.d. ${dSelesai.toLocaleDateString('id-ID', optsLengkap)}`;
    }
}

/**
 * Menghasilkan format rentang hari Indonesia.
 * - 1 hari  : 'Selasa'
 * - Beda hari: 'Selasa s.d. Kamis'
 */
function formatHariRentangIndo(tglMulai, tglSelesai) {
    if (!tglMulai) return '';
    const dMulai = new Date(tglMulai + 'T00:00:00');
    if (isNaN(dMulai)) return '';
    const h1 = dMulai.toLocaleDateString('id-ID', { weekday: 'long' });

    if (!tglSelesai || tglSelesai === tglMulai) {
        return h1;
    }

    const dSelesai = new Date(tglSelesai + 'T00:00:00');
    if (isNaN(dSelesai)) return h1;
    const h2 = dSelesai.toLocaleDateString('id-ID', { weekday: 'long' });

    return `${h1} s.d. ${h2}`;
}

/* ── INJEKSI KOP SURAT OFFLINE (Tanpa library, murni DOCX XML) ── */
function injectKopSuratOffline(zip, s) {
    const EMU = 685800; // 75px * 9144 EMU/pixel

    // Konversi base64 ke Uint8Array untuk dimasukkan ke zip
    function b64ToBytes(b64) {
        const clean = b64.replace(/^data:image\/(png|jpg|jpeg|gif|webp);base64,/i, '');
        const bs = atob(clean);
        const bytes = new Uint8Array(bs.length);
        for (let i = 0; i < bs.length; i++) bytes[i] = bs.charCodeAt(i);
        return bytes;
    }

    // Buat XML elemen <w:drawing> untuk menempatkan gambar inline
    function makeDrawXml(rId, picId) {
        return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${EMU}" cy="${EMU}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${picId}" name="KopImg${picId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${picId}" name="KopImg${picId}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${EMU}" cy="${EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
    }

    // Baca rels sekali, tambahkan kedua relasi, lalu tulis kembali
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (!relsFile) return;
    let relsStr = relsFile.asText();

    let logo1Xml = '';
    let logo2Xml = '';

    if (s.logo_instansi && s.logo_instansi.length > 50) {
        try {
            zip.file('word/media/kop_logo1.png', b64ToBytes(s.logo_instansi));
            relsStr = relsStr.replace('</Relationships>',
                '<Relationship Id="rIdKopL1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/kop_logo1.png"/></Relationships>');
            logo1Xml = makeDrawXml('rIdKopL1', 901);
        } catch (e) { console.warn('Logo1 gagal:', e); }
    }

    if (s.logo_sekolah && s.logo_sekolah.length > 50) {
        try {
            zip.file('word/media/kop_logo2.png', b64ToBytes(s.logo_sekolah));
            relsStr = relsStr.replace('</Relationships>',
                '<Relationship Id="rIdKopL2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/kop_logo2.png"/></Relationships>');
            logo2Xml = makeDrawXml('rIdKopL2', 902);
        } catch (e) { console.warn('Logo2 gagal:', e); }
    }

    zip.file('word/_rels/document.xml.rels', relsStr);

    // Helper: paragraf tengah dengan teks
    function pTxt(text, bold, sz) {
        if (!text) return '';
        const b = bold ? '<w:b/>' : '';
        return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0" w:before="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>${b}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>`;
    }

    // Susun konten teks kop
    let tengah = '';
    if (s.nama_instansi) tengah += pTxt((s.nama_instansi).toUpperCase(), false, 22);
    if (s.nama_opd) tengah += pTxt((s.nama_opd).toUpperCase(), true, 26);
    if (s.nama_sekolah) tengah += pTxt((s.nama_sekolah).toUpperCase(), true, 30);
    if (s.alamat_sekolah) tengah += pTxt(s.alamat_sekolah, false, 16);
    const kontak = [
        s.telp_sekolah && ('Telp: ' + s.telp_sekolah),
        s.email_sekolah && ('Email: ' + s.email_sekolah),
        s.website_sekolah && ('Website: ' + s.website_sekolah)
    ].filter(Boolean).join(' | ');
    if (kontak) tengah += pTxt(kontak, false, 16);

    // Paragraf logo (Drawing atau kosong)
    const cell1 = logo1Xml
        ? `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="0" w:before="0"/></w:pPr><w:r>${logo1Xml}</w:r></w:p>`
        : `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`;
    const cell3 = logo2Xml
        ? `<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="0" w:before="0"/></w:pPr><w:r>${logo2Xml}</w:r></w:p>`
        : `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`;

    // Tabel kop surat: 3 kolom [Logo Instansi | Teks | Logo Sekolah]
    const kopXml =
        `<w:tbl>` +
        `<w:tblPr>` +
        `<w:tblW w:w="5000" w:type="pct"/>` +
        `<w:tblBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tblBorders>` +
        `<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/></w:tblCellMar>` +
        `</w:tblPr>` +
        `<w:tr>` +
        `<w:tc><w:tcPr><w:tcW w:w="15" w:type="pct"/><w:vAlign w:val="center"/></w:tcPr>${cell1}</w:tc>` +
        `<w:tc><w:tcPr><w:tcW w:w="70" w:type="pct"/><w:vAlign w:val="center"/></w:tcPr>${tengah || '<w:p/>'}` + `</w:tc>` +
        `<w:tc><w:tcPr><w:tcW w:w="15" w:type="pct"/><w:vAlign w:val="center"/></w:tcPr>${cell3}</w:tc>` +
        `</w:tr></w:tbl>` +
        `<w:p><w:pPr><w:spacing w:after="60" w:before="0"/></w:pPr></w:p>`;

    // Suntikkan di awal <w:body>
    let xmlStr = zip.file('word/document.xml').asText();
    const bodyMatch = xmlStr.match(/<w:body[^>]*>/);
    if (bodyMatch) {
        const idx = xmlStr.indexOf(bodyMatch[0]) + bodyMatch[0].length;
        xmlStr = xmlStr.slice(0, idx) + kopXml + xmlStr.slice(idx);
        zip.file('word/document.xml', xmlStr);
    }
}

function submitGenerate(e) {
    e.preventDefault();
    if (!$('#inpTglSurat').val()) { Swal.fire('Info', 'Tgl Surat wajib diisi', 'warning'); return; }

    const templateName = $('#pilihJenisSurat').val();
    if (!templateName) { Swal.fire('Info', 'Pilih jenis surat/template terlebih dahulu', 'warning'); return; }

    setBtnLoading('#btnGen', true, 'Memproses...');
    updatePreview(); updateTanggalSurat(); updateTanggalSaja(); updateHariAcara();
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

    // Bersihkan nilai: jika satu nama input muncul beberapa kali (karena template berbeda memakai nama field yang sama),
    // pilih nilai yang terisi teks tidak kosong.
    for (let key in dataObj) {
        if (Array.isArray(dataObj[key])) {
            const valid = dataObj[key].find(v => typeof v === 'string' && v.trim() !== '');
            dataObj[key] = (valid !== undefined) ? valid : '';
        }
    }

    // Pastikan field penting nomor surat, kode klasifikasi, dan template terisi
    dataObj.nomorFull = $('#nomorFull').val() || dataObj.nomorFull || '';
    dataObj.kodeKlasifikasi = $('#selKodeArsip').val() || dataObj.kodeKlasifikasi || '';
    dataObj.pilihJenisSurat = templateName || dataObj.pilihJenisSurat || '';

    // Baca tabel dinamis jika form box-lampiran sedang aktif
    if (!$('#box-lampiran').hasClass('hide')) {
        let tableData = [];
        let headers = [];
        $('#tblDynamicLampiran thead input').each(function () { headers.push($(this).val()); });
        tableData.push(headers);
        $('#tblDynamicLampiran tbody tr').each(function () {
            let row = [];
            $(this).find('input').each(function () { row.push($(this).val()); });
            tableData.push(row);
        });
        dataObj.dataTabelLampiran = JSON.stringify(tableData);
    }

    showLoadingTimer2('Membuat Dokumen Secara Offline...');

    // Load template .docx (Via Electron IPC jika Desktop, atau Fetch jika Web Browser)
    let loadTemplatePromise;
    if (typeof window.sidimas !== 'undefined' && window.sidimas.readTemplate) {
        loadTemplatePromise = window.sidimas.readTemplate(templateName);
    } else {
        loadTemplatePromise = fetch(`templates/${templateName}`)
            .then(res => {
                if (!res.ok) return fetch(`user-templates/${templateName}`);
                return res;
            })
            .then(res => {
                if (!res.ok) throw new Error(`Template ${templateName} tidak ditemukan.`);
                return res.arrayBuffer();
            });
    }

    loadTemplatePromise
        .then(content => {
            const zip = new PizZip(content);

            // Ambil data Pengaturan lebih awal untuk injeksi kop
            const sStrKop = localStorage.getItem('sidimas_settings');
            let sKop = {};
            if (sStrKop) { try { sKop = JSON.parse(sStrKop); } catch (e) { } }

            // ── INJEKSI KOP SURAT OTOMATIS (Tanpa library tambahan) ──
            if (dataObj.tanpaKop !== 'ya') {
                try { injectKopSuratOffline(zip, sKop); } catch (e) { console.error("Gagal injeksi kop", e); }
            }



            const rawArray = $('#formGen').serializeArray();
            rawArray.forEach(item => { dataObj[item.name] = item.value; });

            if ($('#tanggalSuratFull').length) dataObj.tanggalSuratFull = $('#tanggalSuratFull').val();
            if ($('#valTglSaja').length) dataObj.tanggalSaja = $('#valTglSaja').val();

            const doc = buildDocxFromDataObj(zip, dataObj, templateName, sKop);

            const outBlob = doc.getZip().generate({
                type: "blob",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            const baseName = templateName.replace(/\.docx$/i, '');
            const fileName = `Generate_${baseName}_${Date.now()}.docx`;
            const blobUrl = URL.createObjectURL(outBlob);
            setBtnLoading('#btnGen', false, 'GENERATE DOKUMEN');
            Swal.close();
            openFilePreviewModal({
                title: `Pratinjau Surat: ${baseName}`,
                dataUrl: blobUrl,
                blob: outBlob,
                filename: fileName,
                typeBadge: 'DOCX',
                archiveData: { dataObj, blob: outBlob, filename: fileName }
            });

            $('#hasilGenerate').addClass('hide');
        })
        .catch(err => {
            setBtnLoading('#btnGen', false, 'GENERATE DOKUMEN');
            Swal.fire('Error', err.toString(), 'error');
        });
}

/* --- FUNGSI TABEL DINAMIS UNTUK LAMPIRAN --- */
function addRowKolektif(tableId) {
    const table = document.getElementById(tableId);
    const tbody = table && table.tBodies[0];
    const firstRow = tbody && tbody.rows[0];
    if (!tbody || !firstRow) return;

    const newRow = firstRow.cloneNode(true);
    newRow.querySelectorAll('input, textarea').forEach(field => { field.value = ''; });
    newRow.querySelectorAll('select').forEach(field => { field.selectedIndex = 0; });
    tbody.appendChild(newRow);
}

function addRowKolektifSis(tableId) {
    addRowKolektif(tableId);
}

function addColLampiran() {
    $('#tblDynamicLampiran thead tr').append('<th><input type="text" class="form-control form-control-sm fw-bold" placeholder="Header Baru"></th>');
    $('#tblDynamicLampiran tbody tr').each(function () {
        $(this).append('<td><input type="text" class="form-control form-control-sm"></td>');
    });
}

function addRowLampiran() {
    let cols = $('#tblDynamicLampiran thead th').length;
    let tr = '<tr>';
    let rowCount = $('#tblDynamicLampiran tbody tr').length + 1;
    for (let i = 0; i < cols; i++) {
        if (i === 0) {
            tr += `<td><input type="text" class="form-control form-control-sm text-center" value="${rowCount}"></td>`;
        } else {
            tr += '<td><input type="text" class="form-control form-control-sm"></td>';
        }
    }
    tr += '</tr>';
    $('#tblDynamicLampiran tbody').append(tr);
}


function resetGenerator() { $('#formGen')[0].reset(); $('#hasilGenerate').addClass('hide'); $('#selKodeArsip').val('').trigger('change'); const dateNow = new Date(); const offset = dateNow.getTimezoneOffset() * 60000; const today = (new Date(dateNow - offset)).toISOString().slice(0, 10); $('#inpTglSurat').val(today); gantiFormSurat(); updatePreview(); $('html,body').animate({ scrollTop: 0 }, 500); }


/**
 * FUNGSI LIVE PRATINJAU DOKUMEN SURAT (LEMBAR F4)
 * Menampilkan pratinjau lembaran dokumen dinas secara real-time saat pengguna mengetik data surat.
 */
let debounceLivePreviewTimer = null;
let currentLivePreviewDocxBlobUrl = null;

async function generateDocxBlob(templateName) {
    let content;
    if (typeof window.sidimas !== 'undefined' && window.sidimas.readTemplate) {
        content = await window.sidimas.readTemplate(templateName);
    } else {
        const res = await fetch('templates/' + templateName).catch(() => fetch('user-templates/' + templateName));
        if (!res.ok) throw new Error('File template ' + templateName + ' tidak ditemukan.');
        content = await res.arrayBuffer();
    }

    const zip = new PizZip(content);
    const tanpaKop = $('#inTanpaKop').is(':checked');
    const sStrKop = localStorage.getItem('sidimas_settings');
    let sKop = {};
    if (sStrKop) { try { sKop = JSON.parse(sStrKop); } catch (e) { } }

    if (!tanpaKop) {
        try { injectKopSuratOffline(zip, sKop); } catch (e) {}
    }

    const rawArray = $('#formGen').serializeArray();
    const dataObj = {};
    rawArray.forEach(item => { dataObj[item.name] = item.value; });

    if ($('#tanggalSuratFull').length) dataObj.tanggalSuratFull = $('#tanggalSuratFull').val();
    if ($('#valTglSaja').length) dataObj.tanggalSaja = $('#valTglSaja').val();

    const doc = buildDocxFromDataObj(zip, dataObj, templateName, sKop);

    return doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
}

function updateLiveSuratPreview() {
    if (debounceLivePreviewTimer) clearTimeout(debounceLivePreviewTimer);
    const paper = $('#liveDocPaper');
    
    // Tampilkan loading hanya jika belum ada agar tidak kedip terus
    if (paper.find('#docxLiveContainer').length === 0 && paper.find('.spinner-border').length === 0) {
        paper.html('<div class="text-center mt-5 pt-5" style="color:#0d6efd"><div class="spinner-border spinner-border-sm"></div><div class="mt-2" style="font-size: 10px;">Menyesuaikan Template...</div></div>');
    }

    debounceLivePreviewTimer = setTimeout(async () => {
        try {
            const templateName = $('#pilihJenisSurat').val();
            if (!templateName) {
                paper.html('<div class="text-center mt-5 pt-5 text-muted" style="font-size: 10px;">Silakan pilih template.</div>');
                return;
            }

            if (typeof updateTanggalSurat === 'function') updateTanggalSurat();
            if (typeof updateTanggalSaja === 'function') updateTanggalSaja();
            if (typeof updateHariAcara === 'function') updateHariAcara();

            const blob = await generateDocxBlob(templateName);
            if (currentLivePreviewDocxBlobUrl) URL.revokeObjectURL(currentLivePreviewDocxBlobUrl);
            currentLivePreviewDocxBlobUrl = URL.createObjectURL(blob);
            
            // Siapkan wadah dengan scale CSS agar pas di mini f4 container (lebar container ~310px)
            // Kertas A4/F4 Word di docx-preview itu sekitar 816px. 310 / 816 = ~0.38
            paper.html('<div id="docxLiveContainer" style="transform: scale(0.36); transform-origin: top left; width: 816px; pointer-events: none;"></div>');
            const container = document.getElementById('docxLiveContainer');
            
            if (typeof docx !== 'undefined' && docx.renderAsync) {
                await docx.renderAsync(blob, container, null, { inWrapper: false, ignoreWidth: false, ignoreHeight: true, ignoreMargins: false });
            } else {
                paper.html('<div class="text-center mt-5 pt-5 text-danger" style="font-size: 10px;">Library docx-preview tidak dimuat.</div>');
            }
        } catch (e) {
            console.error('Live Preview Error:', e);
            paper.html('<div class="text-center mt-5 pt-5 text-danger" style="font-size: 10px;">Gagal memuat pratinjau.<br>Pastikan template Word tidak korup.</div>');
        }
    }, 800);
}

function bukaModalPratinjauF4() {
    bukaPratinjauDariTemplateDocx();
}

async function bukaPratinjauDariTemplateDocx() {
    const templateName = $('#pilihJenisSurat').val();
    if (!templateName) {
        Swal.fire('Perhatian', 'Silakan pilih jenis template surat terlebih dahulu.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Membaca Template Word...',
        text: 'Menyusun dokumen dari ' + templateName + '...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const blob = await generateDocxBlob(templateName);
        const blobUrl = URL.createObjectURL(blob);
        Swal.close();

        openFilePreviewModal({
            dataUrl: blobUrl,
            blob: blob,
            filename: templateName,
            title: 'Pratinjau Dokumen Word: ' + templateName,
            typeBadge: 'DOCX'
        });
    } catch (err) {
        Swal.close();
        console.error('Error baca template docx:', err);
        Swal.fire('Gagal', err.message || 'Terjadi kesalahan saat memproses file template Word.', 'error');
    }
}
// ==========================================

$(document).ready(function() {
    $('#formGen').on('input change', function() {
        if (typeof updateLiveSuratPreview === 'function') {
            updateLiveSuratPreview();
        }
    });
});
