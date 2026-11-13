/* JACK22 — tests de la 6.9 (Mission M1) : export long.
   Usage : JACK22_D8.run().then(r => console.table(r))
   Instru de test : WAV mono 44,1 kHz (un clic par temps à 90 BPM sur un fond grave), longueur choisie.
   Les téléchargements sont interceptés (rien n'est écrit sur le disque). */
(() => {
 'use strict';
 const sleep = ms => new Promise(r => setTimeout(r, ms));
 const until = async (f, ms) => { const t = performance.now(); while (!f()) { if (performance.now() - t > ms) throw Error('délai dépassé'); await sleep(100); } };
 const sha = async b => [...new Uint8Array(await crypto.subtle.digest('SHA-256', b instanceof Blob ? await b.arrayBuffer() : b))].map(x => x.toString(16).padStart(2, '0')).join('');
 function wav(name, sec, sr = 44100) {
  const len = Math.round(sec * sr), buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true);
  const per = Math.round(60 / 90 * sr);
  for (let i = 0; i < len; i++) { const k = i % per; const x = 0.15 * Math.sin(2 * Math.PI * 55 * i / sr) + (k < 400 ? 0.5 * Math.sin(2 * Math.PI * 1000 * k / sr) * (1 - k / 400) : 0); v.setInt16(44 + i * 2, x * 32767, true); }
  return new File([buf], name, { type: 'audio/wav' });
 }
 const wavInfo = async b => { const v = new DataView(b instanceof Blob ? await b.arrayBuffer() : b); return { sec: v.getUint32(40, true) / (v.getUint32(28, true)), bytes: v.byteLength }; };
 let caught = [];
 const origClick = HTMLAnchorElement.prototype.click, urls = new Map(), origURL = URL.createObjectURL;
 function hook() { caught = []; URL.createObjectURL = o => { const u = origURL.call(URL, o); urls.set(u, o); return u; }; HTMLAnchorElement.prototype.click = function () { if (this.download) { caught.push({ name: this.download, blob: urls.get(this.href) }); return; } return origClick.call(this); }; }
 function unhook() { URL.createObjectURL = origURL; HTMLAnchorElement.prototype.click = origClick; }
 function clear() { audioClips.splice(0, audioClips.length); tlBuild(); }
 async function project(sec) {
  clear(); $('bpm').value = '90'; $('bpm').dispatchEvent(new Event('change'));
  if (playMode !== 'pattern') document.querySelector('[data-mode="pattern"],#modePattern')?.click();
  const dp = activePat(0); dp.grid.forEach(r => r.fill(false)); [0, 4, 8, 12].forEach(s => dp.grid[0][s] = true);
  await audioImportFile(wav('instru-' + sec + 's.wav', sec)); await until(() => window.l3Ready ? window.l3Ready() : true, 30000);
  $('expLoops').value = '1'; $('expLoops').dispatchEvent(new Event('change'));
 }
 const cases = [], add = (n, f) => cases.push({ name: n, fn: f });

 add('Morceau de référence 3 min 20 : export WAV par le bouton, deux fois identique', async () => {
  await project(200); hook();
  try {
   const t0 = performance.now(); $('expBtn').click(); await until(() => caught.length === 1 && !exporting, 120000); const t1 = performance.now();
   $('expBtn').click(); await until(() => caught.length === 2 && !exporting, 120000);
   const a = await sha(caught[0].blob), b = await sha(caught[1].blob), i = await wavInfo(caught[0].blob);
   if (a !== b) throw Error('deux exports différents');
   if (i.sec < 200 || i.sec > 205) throw Error('durée ' + i.sec.toFixed(2) + ' s');
   return caught[0].name + ' · ' + fmtDur(i.sec) + ' · ' + (i.bytes / 1048576).toFixed(1) + ' Mo · rendu ' + ((t1 - t0) / 1000).toFixed(1) + ' s · SHA identique ' + a.slice(0, 12) + '… · « ' + $('expStatus').textContent.slice(0, 60) + '… »';
  } finally { unhook(); }
 });

 add('Pistes séparées du morceau de 3 min 20 (ZIP)', async () => {
  hook();
  try {
   const t0 = performance.now(); await window.JACK22_PRODUCTION.stems(); await until(() => caught.length === 1, 120000);
   const z = caught[0], bytes = new Uint8Array(await z.blob.arrayBuffer()); let n = 0; for (let i = 0; i + 4 < bytes.length; i++) if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 3 && bytes[i + 3] === 4) n++;
   return z.name + ' · ' + (z.blob.size / 1048576).toFixed(1) + ' Mo · ' + n + ' fichiers · ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s';
  } finally { unhook(); }
 });

 add('Morceau de 8 minutes : export accepté et complet', async () => {
  await project(480); hook();
  try {
   const m0 = performance.memory ? performance.memory.usedJSHeapSize : 0, t0 = performance.now();
   $('expBtn').click(); await until(() => caught.length === 1 && !exporting, 300000);
   const i = await wavInfo(caught[0].blob), m1 = performance.memory ? performance.memory.usedJSHeapSize : 0;
   if (i.sec < 480 || i.sec > 486) throw Error('durée ' + i.sec.toFixed(2) + ' s ; « ' + $('expStatus').textContent + ' »');
   return fmtDur(i.sec) + ' · ' + (i.bytes / 1048576).toFixed(0) + ' Mo · rendu ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s · mémoire JS après : ' + Math.round(m1 / 1048576) + ' Mo';
  } finally { unhook(); }
 });

 add('Au-delà de 10 minutes : refus clair, rien de téléchargé', async () => {
  await project(350); await audioImportFile(wav('suite-350s.wav', 350)); await until(() => audioClips.length === 2, 30000); audioClips[1].startBar = 100; tlBuild(); hook();   // un fichier seul est limité à 10 min : le 2e posé mesure 101 (4 min 27) finit à 10 min 17
  try {
   $('expBtn').click(); await sleep(800);
   const s = $('expStatus').textContent;
   if (caught.length) throw Error('un fichier a été produit');
   if (!/maximum 10 minutes/.test(s)) throw Error('message : « ' + s + ' »');
   return '« ' + s.slice(0, 110) + '… »';
  } finally { unhook(); clear(); }
 });

 async function run(only) { const out = []; for (const c of cases.filter(c => !only || only.test(c.name))) { const t0 = performance.now(); try { out.push({ cas: c.name, ok: true, detail: await c.fn() }); } catch (e) { out.push({ cas: c.name, ok: false, detail: String(e && e.message || e) }); } out[out.length - 1].ms = Math.round(performance.now() - t0); } return out; }
 window.JACK22_D8 = { run };
})();
