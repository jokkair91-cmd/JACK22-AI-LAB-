/* JACK22 — tests de la 7.2 (Mission M7) : export MP3.
   Usage : JACK22_D11.run().then(r => console.table(r)). Téléchargements interceptés. */
(() => {
 'use strict';
 const sleep = ms => new Promise(r => setTimeout(r, ms)), M = () => window.JACK22_MP3142;
 function wav(name, sec, sr = 44100) { const len = Math.round(sec * sr), buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0))); w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true); const per = Math.round(60 / 90 * sr); for (let i = 0; i < len; i++) { const k = i % per, x = (i < sr ? 0 : 0.1 * Math.sin(2 * Math.PI * 110 * i / sr)) + (i >= sr && k < 300 ? 0.6 * Math.sin(2 * Math.PI * 1000 * k / sr) : 0); v.setInt16(44 + i * 2, x * 32767, true); } return new File([buf], name, { type: 'audio/wav' }); }
 const origClick = HTMLAnchorElement.prototype.click, origURL = URL.createObjectURL, urls = new Map(); let caught = [];
 const hook = () => { caught = []; URL.createObjectURL = o => { const u = origURL.call(URL, o); urls.set(u, o); return u; }; HTMLAnchorElement.prototype.click = function () { if (this.download) { caught.push({ name: this.download, blob: urls.get(this.href) }); return; } return origClick.call(this); }; };
 const unhook = () => { URL.createObjectURL = origURL; HTMLAnchorElement.prototype.click = origClick; };
 async function project(sec) {
  audioClips.splice(0, audioClips.length); tlBuild(); if (playMode !== 'pattern') $('modePattern').click();
  activePat(0).grid.forEach(r => r.fill(false)); roll.notes = []; rollChanged(); $('bpm').value = '90'; $('bpm').dispatchEvent(new Event('change'));
  $('expLoops').value = '1'; $('expLoops').dispatchEvent(new Event('change')); await audioImportFile(wav('instru.wav', sec));
 }
 const onset = (x, sr) => { for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > 0.15) return i / sr; return null; };
 const cases = [], add = (n, f) => cases.push({ n, f });
 add('Morceau de 3 min 20 en MP3 192 kbit/s : relu par Edge, même durée et même calage que le WAV', async () => {
  await project(200); hook();
  try {
   const t0 = performance.now(), m = await M().exportMp3(192); if (!m || caught.length !== 1) throw Error('pas de MP3 : « ' + $('expStatus').textContent + ' »');
   const t = (performance.now() - t0) / 1000, w = await renderSong(exportData(), expOpts());
   const dm = await audio.decodeAudioData(await m.blob.arrayBuffer()), dw = await audio.decodeAudioData(w.wav.slice(0));
   const lenDiff = dm.duration - dw.duration, om = onset(dm.getChannelData(0), dm.sampleRate), ow = onset(dw.getChannelData(0), dw.sampleRate);
   if (Math.abs(lenDiff) > 0.1) throw Error('durée MP3 ' + dm.duration.toFixed(3) + ' s / WAV ' + dw.duration.toFixed(3) + ' s');
   if (om === null || Math.abs(om - ow) > 0.03) throw Error('calage : premier clic MP3 ' + om + ' s / WAV ' + ow + ' s');
   const kb = m.blob.size * 8 / 1000 / dm.duration;
   return caught[0].name + ' · ' + (m.blob.size / 1048576).toFixed(2) + ' Mo · ' + kb.toFixed(0) + ' kbit/s mesurés · relu ' + dm.duration.toFixed(3) + ' s (WAV ' + dw.duration.toFixed(3) + ' s) · premier clic à ' + (om * 1000).toFixed(1) + ' ms (WAV ' + (ow * 1000).toFixed(1) + ' ms) · ' + t.toFixed(1) + ' s';
  } finally { unhook(); }
 });
 add('128 et 320 kbit/s : taille proportionnelle au débit', async () => {
  hook();
  try {
   const a = await M().exportMp3(128), b = await M().exportMp3(320); if (!a || !b) throw Error('export manquant');
   const r = b.blob.size / a.blob.size; if (r < 2.2 || r > 2.8) throw Error('rapport ' + r.toFixed(2));
   return '128k : ' + (a.blob.size / 1048576).toFixed(2) + ' Mo · 320k : ' + (b.blob.size / 1048576).toFixed(2) + ' Mo (×' + r.toFixed(2) + ')';
  } finally { unhook(); }
 });
 add('Bouton et choix du débit dans l’écran d’export', async () => {
  const b = $('j142Mp3Btn'), s = $('j142Kbps'); if (!b || !s) throw Error('commandes absentes');
  return '« ' + b.textContent + ' » + ' + [...s.options].map(o => o.textContent).join(' / ') + ' (par défaut ' + s.value + ')';
 });
 add('Au-delà de 10 minutes : MP3 refusé comme le WAV', async () => {
  await project(350); await audioImportFile(wav('suite.wav', 350)); audioClips[1].startBar = 100; tlBuild(); hook();
  try { const m = await M().exportMp3(192); if (m || caught.length) throw Error('produit'); const s = $('expStatus').textContent; if (!/maximum 10 minutes/.test(s)) throw Error(s); return '« ' + s + ' »'; }
  finally { unhook(); audioClips.splice(0, audioClips.length); tlBuild(); }
 });
 async function run(only) { const out = []; for (const c of cases.filter(c => !only || only.test(c.n))) { try { out.push({ cas: c.n, ok: true, detail: await c.f() }); } catch (e) { out.push({ cas: c.n, ok: false, detail: String(e && e.message || e) }); } } return out; }
 window.JACK22_D11 = { run };
})();
