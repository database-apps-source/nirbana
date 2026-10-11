'use strict';
// ===== Modul tahap 2 (dimuat setelah app.js): menimpa/menambah halaman =====
Object.assign(MENU, {
  customer: [['dash', 'Dashboard'], ['pesanan', 'Pesanan Saya'], ['pesan', 'Buat Pesanan'], ['desain', 'Desain'], ['lacak', 'Lacak']],
  karyawan: [['dash', 'Dashboard'], ['pesanan', 'Pesanan'], ['desain', 'Desain & Prepress'], ['pesan', 'Input Order']],
  owner: [['dash', 'Dashboard'], ['pesanan', 'Pesanan'], ['desain', 'Desain & Prepress'], ['bayar', 'Verifikasi Bayar'], ['master', 'Master Data'], ['laporan', 'Laporan'], ['notif', 'WhatsApp'], ['template', 'Template Dok'], ['migrasi', 'Migrasi']] });
const bg = (c, t) => `<span class="badge b-${c}">${t}</span>`;
const nav0 = nav; nav = function () { nav0(); document.body.classList.toggle('staff', !!S.user && S.user.role !== 'customer'); };
const BR = /^(login|catalog|track|boot|orders|payList|invoice|dashboard|notifQueue|crmList|batch|deScan|fileList|fileGet|mList|laporan)$/;
READ.test = x => BR.test(x);   // daftar aksi baca untuk retry/cache (tambahan tahap 2)

// ---- Modal & berkas ----
function modal(h) { let m = $('#mdl'); if (!m) { m = document.createElement('div'); m.id = 'mdl'; document.body.appendChild(m); } m.innerHTML = `<div class="mb" onclick="if(event.target===this)closeM()"><div class="mc">${h}</div></div>`; }
function closeM() { const m = $('#mdl'); if (m) m.innerHTML = ''; }
const b64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.onerror = no; r.readAsDataURL(f); });
const blobUrl = (mime, d) => URL.createObjectURL(new Blob([Uint8Array.from(atob(d), c => c.charCodeAt(0))], { type: mime }));
const viewer = (mime, u) => mime.indexOf('image') === 0 ? `<img src="${u}" style="max-width:100%;border-radius:8px">` : `<iframe src="${u}" style="width:100%;height:65vh;border:0;border-radius:8px"></iframe>`;
async function pickFile(inp) { const f = inp && inp.files[0]; if (!f) { toast('Pilih berkas dulu.', 1); return null; } if (f.size > 4e6) { toast('Maksimal 4 MB.', 1); return null; } return { nama: f.name, mime: f.type, base64: await b64(f) }; }
async function viewFile(id, nama) {
  modal('<div class="sk"></div>'); const r = await api('fileGet', { id }); if (!r.success) return modal(`<p>${esc(r.message)}</p><button onclick="closeM()">Tutup</button>`);
  const u = blobUrl(r.data.mime, r.data.base64); modal(`<div class="row"><b>${esc(nama)}</b><a class="btn n" download="${esc(nama)}" href="${u}">Unduh</a><button onclick="closeM()">Tutup</button></div>${viewer(r.data.mime, u)}`);
}
// ---- Proofing desain ----
async function openProof(id) {
  modal('<div class="sk"></div>'); const r = await api('fileList', { orderID: id }); window._pf = (r.success ? r.data.proofs : []).slice().sort((a, b) => b.versi - a.versi);
  modal(`<div class="row"><h2>Persetujuan Desain Cetak — ${esc(id)}</h2><button onclick="closeM()">✕</button></div>${_pf.length ? `<div class="tabs">${_pf.map((p, i) => `<button onclick="showProof(${i},'${esc(id)}')">Versi ${p.versi}</button>`).join('')}</div><div id="pv"></div>` : '<p class="mut">Belum ada berkas desain. Unggah di bawah.</p>'}<hr><label>Unggah versi desain (PDF/JPG/PNG, maks 4 MB)</label><input type="file" id="pfile" accept=".pdf,image/*"><br><br><button class="n" onclick="upDesain('${esc(id)}')">Unggah Versi Baru</button>`);
  if (_pf.length) showProof(0, id);
}
async function showProof(i, id) {
  document.querySelectorAll('#mdl .tabs button').forEach((b, j) => b.classList.toggle('on', i === j)); const p = _pf[i], pv = $('#pv'); pv.innerHTML = '<div class="sk"></div>';
  const r = await api('fileGet', { id: p.driveId }); let u = '#', v = '<p class="mut">Pratinjau gagal dimuat.</p>'; if (r.success) { u = blobUrl(r.data.mime, r.data.base64); v = viewer(r.data.mime, u); }
  const can = S.user.role !== 'karyawan' && p.status === 'Menunggu';
  pv.innerHTML = `<div class="row"><b>${esc(p.nama)}</b>${badge(p.status === 'Menunggu' ? 'Menunggu' : p.status === 'Disetujui' ? 'Selesai' : 'Ditolak')}<a class="btn" download="${esc(p.nama)}" href="${u}">Unduh</a></div>${v}${p.catatan ? `<p class="mut">Catatan: ${esc(p.catatan)}</p>` : ''}${can ? `<label>Catatan revisi (wajib bila minta revisi)</label><textarea id="pc" rows="2"></textarea><div class="row"><button class="n" onclick="decide('${esc(p.proofID)}',1,'${esc(id)}')">Setujui Desain untuk Cetak</button><button onclick="decide('${esc(p.proofID)}',0,'${esc(id)}')">Minta Revisi Tambahan</button></div><p class="mut">Persetujuan bersifat final untuk memulai pengerjaan mesin.</p>` : ''}`;
}
async function decide(pid, ya, id) { if (ya && !confirm('Setujui desain ini untuk dicetak? Keputusan bersifat final.')) return; const r = await api('proofDecide', { proofID: pid, setuju: ya, catatan: ($('#pc') || {}).value || '' }); toast(r.message, !r.success); if (r.success) { Store.set('boot', null); openProof(id); } }
async function upDesain(id) { const f = await pickFile($('#pfile')); if (!f) return; const r = await api('fileUp', Object.assign({ orderID: id, tipe: 'desain' }, f)); toast(r.message, !r.success); if (r.success) openProof(id); }
async function upFoto(id) { const f = await pickFile($('#fp')); if (!f) return; const r = await api('fileUp', Object.assign({ orderID: id, tipe: 'foto' }, f)); toast(r.message, !r.success); if (r.success) openDetail(id); }
// ---- Unggah bukti bayar (customer/owner) ----
function openPay(id, sisa) {
  modal(`<div class="row"><h2>Unggah Bukti Pembayaran</h2><button onclick="closeM()">✕</button></div><p class="mut">${esc(id)} · sisa tagihan ${rp(sisa)}</p><label>Jenis</label><select id="pt"><option>DP</option><option>Cicilan</option><option selected>Pelunasan</option></select><label>Jumlah ditransfer</label><input id="pj" type="number" value="${sisa}"><label>Metode</label><input id="pm" value="BCA Transfer"><label>Bukti (JPG/PNG/PDF, maks 4 MB)</label><input type="file" id="pb" accept=".pdf,image/*"><br><br><button class="p" onclick="sendPay('${esc(id)}')">Kirim Bukti</button>`);
}
async function sendPay(id) { const f = await pickFile($('#pb')); if (!f) return; const r = await api('payUpload', { orderID: id, tipe: $('#pt').value, jumlah: $('#pj').value, metode: $('#pm').value, mime: f.mime, base64: f.base64 }); toast(r.message, !r.success); if (r.success) { closeM(); Store.set('pay', null); } }

// ---- Pesanan: tab status + hitungan + detail ----
reg('pesanan', { auth: ALL, tpl: () => `<h1>${S.user.role === 'customer' ? 'Pesanan Saya' : 'Daftar Pesanan & Antrean Bengkel'}</h1><div class="tabs" id="tb"></div><input id="q" placeholder="Cari Order ID / nama pelanggan..."><div id="l" style="margin-top:12px"></div>`,
  init: el => { el._t = 'Semua'; el.querySelector('#q').oninput = () => ordTbl(el); }, show: el => swr('boot', 'boot', {}, d => { el._d = d.orders; ordTbl(el); }) });
function ordTbl(el) {
  const q = $('#q', el).value.toLowerCase(), d = el._d || [], st = S.user.role !== 'customer', T = ['Semua'].concat(STATUS_LIST);
  $('#tb', el).innerHTML = T.map(t => `<button class="${t === el._t ? 'on' : ''}" onclick="this.closest('.page')._t='${t}';ordTbl(this.closest('.page'))">${t}<span class="cnt">${t === 'Semua' ? d.length : d.filter(o => o.status === t).length}</span></button>`).join('');
  $('#l', el).innerHTML = '<div class="card tbl"><table><tr><th>Order</th><th>Pelanggan</th><th>Total</th><th>Sisa</th><th>Status</th><th></th></tr>' + d.filter(o => (el._t === 'Semua' || o.status === el._t) && (o.orderID + o.nama).toLowerCase().includes(q)).map(o => { const sisa = o.total - o.dibayar;
    return `<tr><td><b>${esc(o.orderID)}</b></td><td>${esc(o.nama)}</td><td class="r">${rp(o.total)}</td><td class="r">${sisa > 0 ? rp(sisa) : bg('Selesai', 'Lunas')}</td><td>${st ? `<select onchange="setSt('${esc(o.orderID)}',this.value)">${STATUS_LIST.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select>` : badge(o.status)}</td><td><button onclick="openDetail('${esc(o.orderID)}')">Detail</button> <button onclick="openProof('${esc(o.orderID)}')">Desain</button>${!st && sisa > 0 ? ` <button class="p" onclick="openPay('${esc(o.orderID)}',${sisa})">Bayar</button>` : ''}</td></tr>`; }).join('') + '</table></div>';
}
const STATUS_LIST = ['Baru', 'Diproses', 'Produksi', 'Selesai', 'Diambil/Dikirim'];
async function openDetail(id) {
  modal('<div class="sk"></div>'); const [t, f] = await Promise.all([api('track', { orderID: id }), api('fileList', { orderID: id })]);
  if (!t.success) return modal(`<p>${esc(t.message)}</p><button onclick="closeM()">Tutup</button>`); const o = t.data, fl = f.success ? f.data.files : [], st = S.user.role !== 'customer';
  modal(`<div class="row"><h2>${esc(o.orderID)} ${badge(o.status)}</h2><button onclick="closeM()">✕</button></div>${stepper(o.status)}<p class="mut">${esc(o.nama)} · Operator ${esc(o.operator || '-')} · Deadline ${tgl(o.deadline)}</p><div class="tbl"><table>${o.items.map(i => `<tr><td>${esc(i.nama)}</td><td>${i.qty}</td><td class="r">${rp(i.qty * i.harga)}</td></tr>`).join('')}<tr><th>Total</th><th></th><th class="r">${rp(o.total)}</th></tr></table></div><h3>Riwayat Status</h3>${o.log.map(l => `<p class="mut">${tgl(l.ts)} — ${esc(l.ke)}</p>`).join('')}<h3>Berkas</h3>${fl.map(x => `<p>${esc(x.tipe)} · ${esc(x.nama)} <button onclick="viewFile('${esc(x.driveId)}','${esc(x.nama)}')">Lihat</button></p>`).join('') || '<p class="mut">Belum ada berkas.</p>'}${st ? `<label>Unggah foto hasil produksi (wajib sebelum QC)</label><input type="file" id="fp" accept="image/*"><br><br><button class="n" onclick="upFoto('${esc(id)}')">Unggah Foto</button>` : ''}<div class="row noprint"><button onclick="openProof('${esc(id)}')">Proofing Desain</button><a class="btn" href="#/invoice/${esc(id)}" onclick="closeM()">Invoice</a></div>`);
}
reg('desain', { auth: ALL, tpl: () => `<h1>Desain & Prepress</h1><p class="mut">Pilih pesanan untuk melihat proofing, menyetujui, atau mengunggah versi baru.</p><div id="l"></div>`,
  show: el => swr('boot', 'boot', {}, d => { $('#l', el).innerHTML = d.orders.map(o => `<div class="card row"><span><b>${esc(o.orderID)}</b> · ${esc(o.nama)}</span>${badge(o.status)}<button class="n" onclick="openProof('${esc(o.orderID)}')">Buka Proofing</button></div>`).join('') || '<p class="mut">Belum ada pesanan.</p>'; }) });
// ---- Verifikasi pembayaran: + lihat bukti ----
reg('bayar', { auth: ['owner'], tpl: () => `<h1>Verifikasi Pembayaran & Rekonsiliasi</h1><div id="k" class="grid"></div><div id="l"></div>`,
  show: el => swr('pay', 'payList', {}, d => { const w = d.filter(p => p.status === 'Menunggu');
    $('#k', el).innerHTML = `<div class="card"><span class="mut">Menunggu verifikasi</span><div class="kpi">${w.length}</div><span class="mut">${rp(w.reduce((s, p) => s + Number(p.jumlah), 0))}</span></div><div class="card"><span class="mut">Terverifikasi</span><div class="kpi">${d.filter(p => p.status === 'Terverifikasi').length}</div></div>`;
    $('#l', el).innerHTML = '<div class="card tbl"><table><tr><th>Order</th><th>Tipe</th><th>Nominal riil masuk</th><th>Status</th><th></th></tr>' + d.slice().reverse().map(p => `<tr><td>${esc(p.orderID)}</td><td>${esc(p.tipe)}</td><td>${p.status === 'Menunggu' ? `<input id="j${esc(p.payID)}" type="number" value="${p.jumlah}" style="width:130px">` : rp(p.jumlah)}</td><td>${badge(p.status)}</td><td>${p.buktiURL ? `<button onclick="viewFile('${esc(p.buktiURL)}','bukti-${esc(p.payID)}')">Lihat Bukti</button> ` : ''}${p.status === 'Menunggu' ? `<button class="n" onclick="vp('${esc(p.payID)}',1)">Verifikasi</button> <button onclick="vp('${esc(p.payID)}',0)">Tolak</button>` : ''}</td></tr>`).join('') + '</table></div>'; }, 15000) });

// ---- Master data (CRUD) ----
const MS = { Produk: 'Produk & Harga', Users: 'Pengguna', Customer: 'Customer', Inventory: 'Inventory', Supplier: 'Supplier', Pengeluaran: 'Pengeluaran' };
const NUM = /^(harga|stok|stokMinimum|hargaSatuan|jumlah)$/, HID = /^(createdAt|updatedAt|tanggal|olehUserID|userID|prodID|custID|invID|supID|expID)$/;
reg('master', { auth: ['owner'], tpl: () => `<h1>Master Data</h1><div class="tabs" id="tb"></div><div id="l"></div>`, init: el => { el._s = 'Produk'; },
  show: el => { $('#tb', el).innerHTML = Object.keys(MS).map(k => `<button class="${k === el._s ? 'on' : ''}" onclick="this.closest('.page')._s='${k}';route(true)">${MS[k]}</button>`).join('');
    swr('m:' + el._s, 'mList', { sheet: el._s }, d => { el._m = d; const L = $('#l', el), c = d.cols; window._mr = d.rows;
      L.innerHTML = `<div class="row"><button class="p" onclick="mForm('${el._s}',-1)">+ Tambah</button></div><div class="card tbl"><table><tr>${c.map(x => `<th>${esc(x)}</th>`).join('')}<th></th></tr>${d.rows.map((r, i) => `<tr>${c.map(x => `<td>${NUM.test(x) ? rp(r[x]).replace('Rp', '') : esc(String(r[x]).slice(0, 40))}</td>`).join('')}<td><button onclick="mForm('${el._s}',${i})">Ubah</button></td></tr>`).join('')}</table></div>`; }, 20000); } });
function mForm(sheet, i) {
  const el = $('.page[data-p=master]'), cols = el._m.cols, r = i < 0 ? {} : _mr[i], f = c => { const v = r[c] == null ? '' : r[c];
    if (c === 'role') return `<select id="m_${c}">${['customer', 'karyawan', 'owner'].map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
    if (c === 'status') return `<select id="m_${c}">${(sheet === 'Users' ? ['Aktif', 'Nonaktif'] : ['Aktif', 'Nonaktif']).map(x => `<option ${x === (v || 'Aktif') ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
    return `<input id="m_${c}" type="${NUM.test(c) ? 'number' : 'text'}" value="${esc(v)}">`; };
  modal(`<div class="row"><h2>${i < 0 ? 'Tambah' : 'Ubah'} ${MS[sheet]}</h2><button onclick="closeM()">✕</button></div>${cols.filter(c => !HID.test(c) && c !== 'passwordHash').map(c => `<label>${esc(c)}</label>${f(c)}`).join('')}${sheet === 'Users' ? '<label>Sandi ' + (i < 0 ? '(wajib)' : '(kosongkan bila tidak diubah)') + '</label><input id="m_password" type="password">' : ''}<p class="mut">Data tidak dihapus permanen — nonaktifkan lewat Status agar riwayat tetap utuh.</p><button class="p" onclick="mSave('${sheet}',${i})">Simpan</button>`);
}
async function mSave(sheet, i) {
  const el = $('.page[data-p=master]'), row = i < 0 ? {} : { [el._m.cols[0]]: _mr[i][el._m.cols[0]] };
  el._m.cols.forEach(c => { const x = $('#m_' + c); if (x) row[c] = NUM.test(c) ? Number(x.value) : x.value; }); const pw = $('#m_password'); if (pw && pw.value) row.password = pw.value;
  const r = await api('mSave', { sheet, row }); toast(r.message, !r.success); if (r.success) { closeM(); Store.set('m:' + sheet, null); route(true); }
}

// ---- 6 laporan prioritas ----
const LAP = { penjualan: 'Penjualan', piutang: 'Piutang', produksi: 'Produksi', pembayaran: 'Pembayaran', laba: 'Laba', inventory: 'Inventory' };
const bars = (a, f) => { const mx = Math.max(1, ...a.map(x => x.v)); return a.map(x => `<div class="bar"><span>${esc(x.k)}</span><i style="width:${Math.max(2, x.v / mx * 60)}%"></i><b>${f ? f(x.v) : x.v}</b></div>`).join('') || '<p class="mut">Belum ada data.</p>'; };
const LR = {
  penjualan: d => `<div class="card"><h3>Harian (14 hari)</h3>${bars(d.harian, rp)}</div><div class="card"><h3>Bulanan</h3>${bars(d.bulanan, rp)}</div><div class="card"><h3>Per Kategori</h3>${bars(d.kategori, rp)}</div>`,
  piutang: d => `<div class="card"><h3>Aging Piutang</h3>${bars(d.aging, rp)}</div><div class="card tbl"><table><tr><th>Order</th><th>Pelanggan</th><th>Umur</th><th>Sisa</th></tr>${d.daftar.map(x => `<tr><td>${esc(x.orderID)}</td><td>${esc(x.nama)}</td><td>${x.umur} hari</td><td class="r">${rp(x.sisa)}</td></tr>`).join('')}</table></div>`,
  produksi: d => `<div class="card"><h3>Beban Operator (order aktif)</h3>${bars(d.beban)}</div><div class="card tbl"><h3>Mendekati Deadline</h3><table><tr><th>Order</th><th>Pelanggan</th><th>Deadline</th><th>Status</th><th>Operator</th></tr>${d.dekat.map(x => `<tr><td>${esc(x.orderID)}</td><td>${esc(x.nama)}</td><td>${tgl(x.deadline)}</td><td>${badge(x.status)}</td><td>${esc(x.operator || '-')}</td></tr>`).join('')}</table></div>`,
  pembayaran: d => `<div class="card"><h3>Cash-in Harian</h3>${bars(d.harian, rp)}</div><div class="card"><h3>Metode Pembayaran</h3>${bars(d.metode, rp)}</div>`,
  laba: d => `<div class="grid"><div class="card"><span class="mut">Omzet pesanan</span><div class="kpi">${rp(d.omzet)}</div></div><div class="card"><span class="mut">Kas masuk (terverifikasi)</span><div class="kpi">${rp(d.masuk)}</div></div><div class="card"><span class="mut">Pengeluaran</span><div class="kpi">${rp(d.keluar)}</div></div><div class="card"><span class="mut">Laba kas</span><div class="kpi">${rp(d.laba)}</div></div></div><div class="card"><h3>Pengeluaran per Kategori</h3>${bars(d.kategori, rp)}</div><p class="mut">Laba = kas masuk terverifikasi − seluruh pengeluaran (termasuk kategori Modal).</p>`,
  inventory: d => `<div class="card tbl"><table><tr><th>Bahan</th><th>Stok</th><th>Minimum</th><th></th></tr>${d.map(x => `<tr><td>${esc(x.namaBahan)}</td><td>${x.stok} ${esc(x.satuan)}</td><td>${x.stokMinimum}</td><td>${x.alert ? bg('Ditolak', 'Stok menipis') : bg('Selesai', 'Aman')}</td></tr>`).join('')}</table></div>` };
reg('laporan', { auth: ['owner'], tpl: () => `<h1>Laporan</h1><div class="tabs" id="tb"></div><div id="l"></div>`, init: el => { el._j = 'penjualan'; },
  show: el => { $('#tb', el).innerHTML = Object.keys(LAP).map(k => `<button class="${k === el._j ? 'on' : ''}" onclick="this.closest('.page')._j='${k}';route(true)">${LAP[k]}</button>`).join('');
    swr('lap:' + el._j, 'laporan', { jenis: el._j }, d => $('#l', el).innerHTML = LR[el._j](d), 30000); } });

// ---- Beranda & footer ala mockup ----
const KAT10 = ['Print & Copy', 'Foto & Album', 'Desa & Instansi', 'Memorial', 'Promosi Bisnis', 'Jasa Desain', 'Jilid & Finishing', 'Sekolah & Kampus', 'Souvenir', 'Event & Acara'];
reg('beranda', { tpl: () => `<div class="hero"><span class="badge">STANDAR INDUSTRI OFFSET & DIGITAL PRINT</span><h1>Percetakan Presisi & Solusi Kreatif untuk Setiap Kebutuhan Anda</h1><p>Dari kebutuhan dokumen instansi, cetak offset, promosi bisnis hingga merchandise custom berkualitas tinggi dengan kontrol warna pre-press terverifikasi.</p><a class="btn p" href="#/pesan">Pesan Sekarang →</a> <a class="btn" href="#/katalog">Lihat Katalog Produk</a></div>
<div class="grid usp"><div class="card"><b>10+ Kategori Layanan</b><p class="mut">Cetak, promosi, event & instansi</p></div><div class="card"><b>Pre-Press Terverifikasi</b><p class="mut">Proofing sebelum cetak massal</p></div><div class="card"><b>Tracking Real-time</b><p class="mut">Lacak progres produksi 24/7</p></div><div class="card"><b>Pesan Tanpa Login</b><p class="mut">Order cukup dengan nomor WhatsApp</p></div></div>
<h2>Kategori Layanan Percetakan</h2><div class="grid">${KAT10.map(k => `<a class="card" href="#/katalog" style="text-decoration:none;color:inherit"><b>${k}</b><p class="mut">Lihat Katalog →</p></a>`).join('')}</div>
<h2>Cara Pemesanan yang Transparan</h2><div class="grid"><div class="card"><span class="badge">01</span><h3>Pilih Produk & Spesifikasi</h3><p class="mut">Tentukan ukuran, jenis kertas, jumlah dan finishing.</p></div><div class="card"><span class="badge">02</span><h3>Unggah Desain & Review</h3><p class="mut">Pre-press memeriksa file; Anda menyetujui proofing digital.</p></div><div class="card"><span class="badge">03</span><h3>Produksi & Kirim / Ambil</h3><p class="mut">Pantau progres lewat tracking hingga pesanan siap.</p></div></div>
<div class="hero"><h2>Butuh Konsultasi Cetak Skala Besar atau Penawaran Instansi?</h2><p>Dapatkan sampel bahan gratis, negosiasi termin pembayaran SPK/PO resmi.</p><a class="btn p" href="#/pesan">Konsultasi Sekarang</a></div>` });
$('.foot').innerHTML = '<div class="grid" style="text-align:left;max-width:1100px;margin:auto"><div><b>Nirbana Collection Persada</b><p>Platform percetakan komersial dan offset modern dengan standar industri.</p></div><div><b>Navigasi</b><p>Produk & Jasa · Cara Pemesanan · Lacak Pesanan</p></div><div><b>Hubungi Kami</b><p>WhatsApp CS & Order<br>+62 812-3456-7890<br>Senin–Jumat 08.00–21.00 WIB</p></div></div><p>© 2026 Nirbana Collection Persada. Hak Cipta Dilindungi Undang-Undang.</p>';
// ---- Katalog dengan chip kategori ----
reg('katalog', { tpl: () => `<h1>Produk & Jasa</h1><div class="tabs" id="ch"></div><input id="q" placeholder="Cari produk..."><div class="grid" id="lst" style="margin-top:12px"></div>`, init: el => { el._k = 'Semua'; el.querySelector('#q').oninput = () => draw(el); },
  show: el => swr('cat', 'catalog', {}, d => { CAT = d; draw(el); }, 600000) });
const draw0 = draw; draw = function (el) { const ks = ['Semua'].concat([...new Set(CAT.map(p => p.kat))]); $('#ch', el).innerHTML = ks.map(k => `<button class="${k === el._k ? 'on' : ''}" onclick="this.closest('.page')._k='${esc(k)}';draw(this.closest('.page'))">${esc(k)}</button>`).join('');
  const q = $('#q', el).value.toLowerCase(); $('#lst', el).innerHTML = CAT.filter(p => (el._k === 'Semua' || p.kat === el._k) && (p.nama + p.kat).toLowerCase().includes(q)).map(p => `<div class="card"><span class="badge">${esc(p.kat)}</span><h3>${esc(p.nama)}</h3><p class="mut">Mulai dari <b>${rp(p.harga)}</b>/${esc(p.satuan)}</p><button class="p" onclick="S.cart['${esc(p.prodID)}']=(S.cart['${esc(p.prodID)}']||0)+1;toast('Ditambahkan ke pesanan')">Pesan</button></div>`).join('') || '<p class="mut">Tidak ada hasil.</p>'; };
app.innerHTML = ''; nav(); route();
