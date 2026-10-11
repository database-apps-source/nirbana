'use strict';
// ===== State, cache (SWR + versi skema + namespace per user), api() dengan timeout/retry/reqId =====
const S = { token: localStorage.getItem('ncp:tok') || '', user: JSON.parse(localStorage.getItem('ncp:usr') || 'null'), cart: {} };
const $ = (s, r) => (r || document).querySelector(s), app = $('#app');
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const tgl = d => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const Perf = { rows: [], table() { console.table(this.rows.slice(-30)); } };
const LS = 'ncp:v1:', uk = k => LS + (S.user ? S.user.email : 'anon') + ':' + k;
const Store = { get(k) { try { return JSON.parse(localStorage.getItem(uk(k))); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(uk(k), JSON.stringify(v)); } catch (e) {} } };
const hs = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; };
const READ = /^(login|catalog|track|boot|orders|payList|invoice|dashboard|notifQueue|crmList|batch|deScan)$/;
function toast(m, err) { const t = $('#toast'); t.textContent = m; t.style.background = err ? '#991b1b' : '#1e2a44'; t.className = 'show'; setTimeout(() => t.className = '', 3200); }
async function once(action, data, to, reqId) {
  const c = new AbortController(), tm = setTimeout(() => c.abort(), to), t0 = performance.now();
  try {
    const r = await fetch(GAS_URL, { method: 'POST', redirect: 'follow', cache: 'no-store', signal: c.signal, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: S.token, reqId, data: data || {} }) });
    const t = await r.text();
    try { const j = JSON.parse(t); Perf.rows.push({ action, total: Math.round(performance.now() - t0), server: j.ms }); return j; } catch (e) { return { success: false, retry: true, message: 'Server membalas bukan JSON (HTTP ' + r.status + ').' }; }
  } catch (e) { return { success: false, retry: true, message: e.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus.' }; } finally { clearTimeout(tm); }
}
async function api(action, data) {
  const rd = READ.test(action), id = rd ? '' : (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '' + Math.random()); let r;
  for (let i = 0; i < (rd ? 3 : 2); i++) { if (i) await new Promise(x => setTimeout(x, 1200 * i)); r = await once(action, data, rd ? (i ? 40000 : 25000) : 90000, id); if (r.success || !r.retry) break; }
  if (!r.success && r.data && r.data.code === 'AUTH') { keluar(true); }
  return r;
}
async function swr(key, action, data, render, fresh = 60000, force) {   // render dari cache dulu, ke server hanya bila basi
  const c = Store.get(key); if (c) render(c.d);
  if (c && !force && Date.now() - c.t < fresh) return;
  const r = await api(action, data);
  if (r.success) { const h = hs(JSON.stringify(r.data)); Store.set(key, { t: Date.now(), h, d: r.data }); if (!c || c.h !== h) render(r.data); }
  else if (!c) app.querySelector('.page:not([hidden])').insertAdjacentHTML('beforeend', `<div class="card">${esc(r.message)} <button onclick="route(true)">Coba lagi</button></div>`);
}

// ===== Router hash: halaman dibuat sekali, tidak dibuang =====
const MENU = { publik: [['beranda', 'Beranda'], ['katalog', 'Produk'], ['pesan', 'Pesan'], ['lacak', 'Lacak'], ['masuk', 'Masuk']],
  customer: [['dash', 'Dashboard'], ['pesanan', 'Pesanan Saya'], ['pesan', 'Buat Pesanan'], ['lacak', 'Lacak']],
  karyawan: [['dash', 'Dashboard'], ['pesanan', 'Pesanan'], ['pesan', 'Input Order']],
  owner: [['dash', 'Dashboard'], ['pesanan', 'Pesanan'], ['bayar', 'Pembayaran'], ['notif', 'WhatsApp'], ['template', 'Template Dok'], ['migrasi', 'Migrasi']] };
const PAGES = {};
function reg(n, def) { PAGES[n] = def; }
function nav() { const m = MENU[S.user ? S.user.role : 'publik']; $('#nav').innerHTML = m.map(x => `<a href="#/${x[0]}" data-n="${x[0]}">${x[1]}</a>`).join('') + (S.user ? '<a href="#" onclick="keluar();return false">Keluar</a>' : ''); }
function route(force) {
  const [n0, p] = location.hash.replace(/^#\/?/, '').split('/'), n = PAGES[n0] ? n0 : (S.user ? 'dash' : 'beranda'), d = PAGES[n];
  if (d.auth && (!S.user || d.auth.indexOf(S.user.role) < 0)) { location.hash = '#/masuk'; return; }
  let el = $(`.page[data-p="${n}"]`); if (!el) { el = document.createElement('section'); el.className = 'page'; el.dataset.p = n; el.innerHTML = d.tpl(); app.appendChild(el); d.init && d.init(el); }
  document.querySelectorAll('.page').forEach(x => x.hidden = x !== el); document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.n === n));
  d.show && d.show(el, p && decodeURIComponent(p), force); scrollTo(0, 0);
}
function keluar(exp) { S.token = ''; S.user = null; localStorage.removeItem('ncp:tok'); localStorage.removeItem('ncp:usr'); app.innerHTML = ''; nav(); location.hash = '#/masuk'; if (exp) toast('Sesi berakhir, silakan masuk lagi.', 1); }
const stepper = st => { const i = ['Baru', 'Diproses', 'Produksi', 'Selesai', 'Diambil/Dikirim'], k = i.indexOf(st); return '<div class="step">' + i.map((x, j) => `<i class="${j < k ? 'done' : j === k ? 'now' : ''}">${x}</i>`).join('') + '</div>'; };
const badge = s => `<span class="badge b-${esc(s)}">${esc(s)}</span>`;
let CAT = [];

// ===== Halaman publik =====
reg('beranda', { tpl: () => `<div class="hero"><h1>Percetakan Presisi & Solusi Kreatif untuk Setiap Kebutuhan Anda</h1><p>Cetak dokumen, promosi, buku, merchandise hingga event. Pesan tanpa wajib daftar, pantau real-time.</p><a class="btn p" href="#/pesan">Pesan Sekarang</a> <a class="btn" href="#/katalog">Lihat Katalog</a></div><h2>Layanan</h2><div class="grid" id="kat"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>`,
  show: el => swr('cat', 'catalog', {}, d => { CAT = d; el.querySelector('#kat').innerHTML = [...new Set(d.map(p => p.kat))].map(k => `<div class="card"><b>${esc(k)}</b><p class="mut">${d.filter(p => p.kat === k).length} produk</p><a href="#/katalog">Lihat katalog →</a></div>`).join(''); }, 600000) });
reg('katalog', { tpl: () => `<h1>Produk & Jasa</h1><input id="q" placeholder="Cari produk..."><div class="grid" id="lst" style="margin-top:12px"></div>`,
  init: el => el.querySelector('#q').oninput = () => draw(el),
  show: el => swr('cat', 'catalog', {}, d => { CAT = d; draw(el); }, 600000) });
function draw(el) { const q = el.querySelector('#q').value.toLowerCase(); el.querySelector('#lst').innerHTML = CAT.filter(p => (p.nama + p.kat).toLowerCase().includes(q)).map(p => `<div class="card"><span class="badge">${esc(p.kat)}</span><h3>${esc(p.nama)}</h3><p class="mut">Mulai dari <b>${rp(p.harga)}</b>/${esc(p.satuan)}</p><button class="p" onclick="S.cart['${esc(p.prodID)}']=(S.cart['${esc(p.prodID)}']||0)+1;toast('Ditambahkan ke pesanan');">Pesan</button></div>`).join('') || '<p class="mut">Tidak ada hasil.</p>'; }
reg('pesan', { tpl: () => `<h1>Formulir Pesanan Online</h1><div class="card"><div id="items"></div><label>Nama</label><input id="n"><label>WhatsApp</label><input id="w" inputmode="tel" placeholder="08xxxxxxxxxx"><label>Email (opsional)</label><input id="e" type="email"><label>Catatan</label><textarea id="c" rows="2"></textarea><p><b id="tot"></b></p><button class="p" id="go">Kirim Pesanan</button></div><div id="ok"></div>`,
  init: el => el.querySelector('#go').onclick = async ev => {
    const b = ev.target, items = Object.keys(S.cart).filter(k => S.cart[k] > 0).map(k => ({ prodID: k, qty: S.cart[k] })); if (!items.length) return toast('Pilih produk dulu di Katalog.', 1);
    b.disabled = true; b.textContent = 'Mengirim...';
    const r = await api('createOrder', { nama: $('#n', el).value, wa: $('#w', el).value, email: $('#e', el).value, catatan: $('#c', el).value, items });
    b.disabled = false; b.textContent = 'Kirim Pesanan';
    if (!r.success) return toast(r.message, 1); S.cart = {};
    $('#ok', el).innerHTML = `<div class="card"><h2>Pesanan Berhasil Dibuat!</h2><p>Kode pelacakan: <b>${esc(r.data.orderID)}</b> (total ${rp(r.data.total)})</p><a class="btn n" href="#/lacak/${esc(r.data.orderID)}">Lacak Sekarang</a> <a class="btn" href="#/masuk">Buat Akun</a></div>`; },
  show: el => swr('cat', 'catalog', {}, d => { CAT = d; const list = Object.keys(S.cart).filter(k => S.cart[k] > 0); let t = 0;
    $('#items', el).innerHTML = list.map(k => { const p = d.find(x => x.prodID === k); if (!p) return ''; t += p.harga * S.cart[k]; return `<div class="row"><span>${esc(p.nama)}</span><input type="number" min="1" value="${S.cart[k]}" style="max-width:90px" onchange="S.cart['${esc(k)}']=Math.max(0,+this.value);route()"><b>${rp(p.harga * S.cart[k])}</b></div>`; }).join('') || '<p class="mut">Belum ada produk. <a href="#/katalog">Pilih di katalog</a></p>';
    $('#tot', el).textContent = 'Estimasi: ' + rp(t); }, 600000) });
reg('lacak', { tpl: () => `<h1>Lacak Pesanan</h1><div class="row"><input id="id" placeholder="NCP-2026-08492"><button class="n" id="go">Lacak</button></div><div id="out"></div>`,
  init: el => el.querySelector('#go').onclick = () => cari(el),
  show: (el, p) => { if (p) { $('#id', el).value = p; cari(el); } } });
async function cari(el) {
  const out = $('#out', el); out.innerHTML = '<div class="sk"></div>'; const r = await api('track', { orderID: $('#id', el).value });
  if (!r.success) return out.innerHTML = `<div class="card">${esc(r.message)}</div>`; const o = r.data;
  out.innerHTML = `<div class="card"><h2>${esc(o.orderID)} ${badge(o.status)}</h2><p class="mut">${esc(o.nama)} · Deadline ${tgl(o.deadline)} · Operator ${esc(o.operator || '-')}</p>${stepper(o.status)}</div>
  <div class="card tbl"><table>${o.items.map(i => `<tr><td>${esc(i.nama)}</td><td>${i.qty}</td><td class="r">${rp(i.qty * i.harga)}</td></tr>`).join('')}<tr><th>Total</th><th></th><th class="r">${rp(o.total)}</th></tr><tr><td>Sudah dibayar</td><td></td><td class="r">${rp(o.dibayar)}</td></tr></table></div>
  <div class="card"><b>Riwayat</b>${o.log.map(l => `<p class="mut">${tgl(l.ts)} — ${esc(l.ke)}</p>`).join('')}</div>`;
}
reg('masuk', { tpl: () => `<div class="card" style="max-width:420px;margin:auto"><h2>Selamat Datang di Portal NCP</h2><label>Email atau Nomor WhatsApp</label><input id="e"><label>Kata Sandi</label><input id="p" type="password"><br><br><button class="p" id="go" style="width:100%">Masuk ke Akun</button></div>`,
  init: el => el.querySelector('#go').onclick = async ev => {
    const b = ev.target; b.disabled = true; const r = await api('login', { email: $('#e', el).value, password: $('#p', el).value }); b.disabled = false; if (!r.success) return toast(r.message, 1);
    S.token = r.data.token; S.user = r.data.user; localStorage.setItem('ncp:tok', S.token); localStorage.setItem('ncp:usr', JSON.stringify(S.user));
    Store.set('boot', { t: Date.now(), h: '', d: r.data.boot }); nav(); location.hash = '#/dash'; prefetch(); } });

// ===== Halaman terautentikasi =====
const ALL = ['customer', 'karyawan', 'owner'];
reg('dash', { auth: ALL, tpl: () => `<h1>Dashboard</h1><div id="d"></div>`,
  show: el => S.user.role === 'owner' ? swr('dash', 'dashboard', {}, d => { $('#d', el).innerHTML = `<div class="grid"><div class="card"><span class="mut">Order hari ini</span><div class="kpi">${d.hariIni}</div></div><div class="card"><span class="mut">Omzet bulan ini</span><div class="kpi">${rp(d.omzet)}</div></div><div class="card"><span class="mut">Piutang</span><div class="kpi">${rp(d.piutang)}</div></div><div class="card"><span class="mut">Bukti menunggu verifikasi</span><div class="kpi">${d.menungguBayar}</div></div></div>
    <div class="card"><h2>AI Insight</h2>${d.insight.map(i => `<p>• ${esc(i)}</p>`).join('') || '<p class="mut">Belum ada insight.</p>'}</div><div class="card tbl"><h2>Top 5 Produk</h2><table>${d.top.map((t, i) => `<tr><td>#${i + 1}</td><td>${esc(t.nama)}</td><td class="r">${rp(t.omzet)}</td></tr>`).join('')}</table></div>`; }, 30000)
    : swr('boot', 'boot', {}, d => { const a = d.orders.filter(o => o.status !== 'Diambil/Dikirim'); $('#d', el).innerHTML = `<div class="card"><span class="mut">Order aktif</span><div class="kpi">${a.length}</div></div>` + a.slice(0, 5).map(o => `<div class="card"><b>${esc(o.orderID)}</b> ${badge(o.status)}${stepper(o.status)}</div>`).join(''); }) });
reg('pesanan', { auth: ALL, tpl: () => `<h1>Pesanan</h1><input id="q" placeholder="Cari Order ID / nama..."><div id="l" style="margin-top:12px"></div>`, init: el => el.querySelector('#q').oninput = () => ordTbl(el),
  show: el => swr('boot', 'boot', {}, d => { el._d = d.orders; ordTbl(el); }) });
function ordTbl(el) {
  const q = $('#q', el).value.toLowerCase(), staff = S.user.role !== 'customer';
  $('#l', el).innerHTML = '<div class="card tbl"><table><tr><th>Order</th><th>Pelanggan</th><th>Total</th><th>Status</th><th></th></tr>' + (el._d || []).filter(o => (o.orderID + o.nama).toLowerCase().includes(q)).map(o => `<tr><td><b>${esc(o.orderID)}</b></td><td>${esc(o.nama)}</td><td class="r">${rp(o.total)}</td><td>${staff ? `<select onchange="setSt('${esc(o.orderID)}',this.value)">${['Baru', 'Diproses', 'Produksi', 'Selesai', 'Diambil/Dikirim'].map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select>` : badge(o.status)}</td><td><a href="#/invoice/${esc(o.orderID)}">Invoice</a></td></tr>`).join('') + '</table></div>';
}
async function setSt(id, st) {   // optimistic: UI sudah berubah, rollback bila gagal
  const el = $('.page[data-p=pesanan]'), o = el._d.find(x => x.orderID === id), prev = o.status; o.status = st;
  const r = await api('setStatus', { orderID: id, status: st }); if (!r.success) { o.status = prev; ordTbl(el); toast(r.message, 1); } else toast('Status diperbarui');
}
reg('bayar', { auth: ['owner'], tpl: () => `<h1>Verifikasi Pembayaran</h1><div id="l"></div>`,
  show: el => swr('pay', 'payList', {}, d => { el._d = d; $('#l', el).innerHTML = '<div class="card tbl"><table><tr><th>Order</th><th>Tipe</th><th>Nominal riil masuk</th><th>Status</th><th></th></tr>' + d.slice().reverse().map(p => `<tr><td>${esc(p.orderID)}</td><td>${esc(p.tipe)}</td><td>${p.status === 'Menunggu' ? `<input id="j${esc(p.payID)}" type="number" value="${p.jumlah}" style="width:130px">` : rp(p.jumlah)}</td><td>${badge(p.status)}</td><td>${p.status === 'Menunggu' ? `<button class="n" onclick="vp('${esc(p.payID)}',1)">Verifikasi</button> <button onclick="vp('${esc(p.payID)}',0)">Tolak</button>` : ''}</td></tr>`).join('') + '</table></div>'; }, 15000) });
async function vp(id, ok) { const j = $('#j' + id); const r = await api('payVerify', { payID: id, terima: ok, jumlah: j ? j.value : 0 }); toast(r.message, !r.success); if (r.success) { Store.set('pay', null); route(true); } }
reg('invoice', { auth: ALL, tpl: () => `<div id="i"></div>`,
  show: async (el, id) => { el.querySelector('#i').innerHTML = '<div class="sk"></div>'; const r = await api('invoice', { orderID: id }); if (!r.success) return el.querySelector('#i').innerHTML = `<div class="card">${esc(r.message)}</div>`; const d = r.data, o = d.order;
    el.querySelector('#i').innerHTML = `<div class="row noprint"><button class="n" onclick="print()">Cetak Faktur</button><button onclick="mkDoc('${esc(o.orderID)}')">Buat PDF dari Template</button></div><div class="inv"><h2>${esc(d.institusi.nama)}</h2><p>FAKTUR PENJUALAN · ${esc(o.orderID)} · ${tgl(o.tgl)}</p><p>Kepada: <b>${esc(o.nama)}</b> · ${esc(o.wa)}</p><table>${d.items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.nama)}</td><td>${i.qty}</td><td class="r">${rp(i.qty * i.harga)}</td></tr>`).join('')}<tr><th colspan=3>TOTAL</th><th class="r">${rp(o.total)}</th></tr><tr><td colspan=3>Dibayar</td><td class="r">${rp(o.dibayar)}</td></tr><tr><td colspan=3>Sisa tagihan</td><td class="r"><b>${d.sisa <= 0 ? 'LUNAS' : rp(d.sisa)}</b></td></tr></table><p class="mut">Rekening: ${esc(d.institusi.rek)}</p>${d.readOnly ? '<p class="mut noprint">Mode karyawan/customer: nominal terkunci (read-only).</p>' : ''}</div>`; } });
async function mkDoc(id) { toast('Membuat dokumen...'); const r = await api('deRender', { orderID: id, kode: 'INVOICE' }); if (r.success) open(r.data.url, '_blank'); else toast(r.message, 1); }
reg('notif', { auth: ['owner'], tpl: () => `<h1>WhatsApp & Notifikasi</h1><div class="card"><label>Token Fonnte (disimpan di server, tidak pernah dikirim balik)</label><input id="t" type="password"><label>URL aplikasi (untuk {link})</label><input id="u" value="${esc(location.origin + location.pathname)}"><div class="row"><label><input id="w" type="checkbox" style="width:auto"> WhatsApp aktif</label><label><input id="m" type="checkbox" style="width:auto"> Email aktif</label></div><br><button class="p" id="sv">Simpan</button> <button id="sy">Sinkron CRM</button></div><div class="card tbl"><h2>Antrean</h2><div id="q"></div></div><div class="card tbl"><h2>CRM Kontak</h2><div id="c"></div></div>`,
  init: el => { el.querySelector('#sv').onclick = async () => { const r = await api('notifConfig', { token: $('#t', el).value, appUrl: $('#u', el).value, wa: $('#w', el).checked, email: $('#m', el).checked }); toast(r.message || 'Tersimpan', !r.success); };
    el.querySelector('#sy').onclick = async () => { const r = await api('crmSync'); toast(r.message, !r.success); route(true); }; },
  show: el => { swr('nq', 'notifQueue', {}, d => $('#q', el).innerHTML = '<table>' + d.slice().reverse().map(x => `<tr><td>${esc(x.kanal)}</td><td>${esc(x.tujuan)}</td><td>${esc(x.event)}</td><td>${badge(x.status === 'Terkirim' ? 'Selesai' : x.status === 'Gagal' ? 'Ditolak' : 'Menunggu')}</td></tr>`).join('') + '</table>', 20000);
    swr('crm', 'crmList', {}, d => $('#c', el).innerHTML = '<table>' + d.map(k => `<tr><td>${esc(k.nama)}</td><td>${esc(k.email)}</td><td>${esc(k.wa)}</td><td>${esc(k.segmen)}</td></tr>`).join('') + '</table>', 60000); } });
reg('template', { auth: ['owner'], tpl: () => `<h1>Template Dokumen</h1><div class="card"><p class="mut">Buat template di Google Docs dengan placeholder seperti {{NOMOR}} {{NAMA_CUSTOMER}} {{RINCIAN}} {{TOTAL}} {{SISA}}. Tempel URL-nya, sistem memindai otomatis.</p><label>URL / ID Google Docs</label><input id="f"><div class="row"><button class="n" id="sc">Pindai Placeholder</button></div><div id="o"></div></div>`,
  init: el => { el.querySelector('#sc').onclick = async () => { const r = await api('deScan', { file: $('#f', el).value }); if (!r.success) return toast(r.message, 1);
    $('#o', el).innerHTML = `<p>Ditemukan: ${r.data.placeholder.map(p => `<span class="badge">${esc(p)}</span>`).join(' ')}</p><label>Kode template</label><input id="k" value="INVOICE"><button class="p" id="sv">Simpan Template</button>`;
    $('#sv', el).onclick = async () => { const s = await api('deSave', { kode: $('#k', el).value, nama: $('#k', el).value, fileId: r.data.fileId, bidang: r.data.placeholder }); toast(s.message, !s.success); }; }; } });
reg('migrasi', { auth: ['owner'], tpl: () => `<h1>Migrasi Data</h1><div class="card"><p class="mut">Spreadsheet lama hanya DIBACA. Pakai akun Google yang sama. Aman diulang (tanpa data ganda).</p><label>URL / ID spreadsheet lama</label><input id="s"><div class="row"><button id="dr">Pindai (Dry-run)</button><button class="p" id="rn">Jalankan Import</button></div><pre id="o"></pre></div>`,
  init: el => { const go = dry => async () => { if (!dry && !confirm('Jalankan import sungguhan?')) return; const r = await api('importData', { source: $('#s', el).value, dryRun: dry }); $('#o', el).textContent = r.success ? JSON.stringify(r.data.laporan, null, 1) : r.message; };
    el.querySelector('#dr').onclick = go(true); el.querySelector('#rn').onclick = go(false); } });

// ===== Boot =====
function prefetch() { if (!S.user || S.user.role !== 'owner') return; (window.requestIdleCallback || setTimeout)(() => api('batch', { calls: [{ action: 'payList' }, { action: 'notifQueue' }, { action: 'crmList' }] }).then(r => { if (r.success) { const m = { payList: 'pay', notifQueue: 'nq', crmList: 'crm' }; Object.keys(r.data).forEach(a => r.data[a].success && Store.set(m[a], { t: Date.now(), h: hs(JSON.stringify(r.data[a].data)), d: r.data[a].data })); } }), 1500); }
$('#theme').onclick = () => { const d = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = d; localStorage.setItem('ncp:theme', d); };
document.documentElement.dataset.theme = localStorage.getItem('ncp:theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
addEventListener('hashchange', () => route()); fetch(GAS_URL + '?ping=' + Date.now(), { mode: 'no-cors' }).catch(() => {});   // warm-up server
nav(); route(); prefetch();
