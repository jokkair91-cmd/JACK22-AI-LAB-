/* JACK22 — tests de la 6.8 (Mission 0b) : horloge et crête du Master.
   Usage : JACK22_D7.run().then(r => console.table(r))   (charger avant le premier Play)
   Mêmes cas sur la 6.7 (défaut attendu) et la 6.8 (attendu : tout réussi). Projet de stress construit par le test :
   instru (un clic par temps, 90 BPM), batterie, 808, accords de pad, puis trois « voix » fortes. */
(() => {
 'use strict';
 const sleep = ms => new Promise(r => setTimeout(r, ms));
 const busy = ms => { const t = performance.now(); while (performance.now() - t < ms) {} };   // page occupée (gros calcul simulé)
 const st = () => (document.getElementById('status') || {}).textContent || '';
 function wav(name, sec, fill, sr = 44100) {
  const len = Math.round(sec * sr), buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, fill(i, sr))) * 32767, true);
  return new File([buf], name, { type: 'audio/wav' });
 }
 const click = bpm => (i, sr) => { const per = Math.round(60 / bpm * sr), k = i % per; return k < 400 ? 0.6 * Math.sin(2 * Math.PI * 1000 * k / sr) * (1 - k / 400) : 0; };
 const sine = (f, a) => (i, sr) => a * Math.sin(2 * Math.PI * f * i / sr);
 async function stressProject() {
  $('bpm').value = '90'; $('bpm').dispatchEvent(new Event('change'));
  if (!audioClips.some(c => c.name === 'clic-90bpm')) await audioImportFile(wav('clic-90bpm.wav', 43, click(90)));
  const dp = activePat(0); dp.grid.forEach(r => r.fill(false)); [0, 4, 8, 12].forEach(s => dp.grid[0][s] = true); for (let s = 0; s < 16; s += 2) dp.grid[Math.min(2, dp.grid.length - 1)][s] = true;
  const mel = []; for (const s of [0, 16]) for (const [o, i] of [[4, 0], [4, 4], [4, 7], [4, 11], [5, 2]]) mel.push({ start: s, dur: 16, preset: 'pad', octave: o, idx: i });
  roll.notes = mel; roll.bars = 2; roll.steps = 32; rollChanged();
  const bp = activePat(1); bp.bars = 2; bp.steps = 32; bp.notes = []; for (let s = 0; s < 32; s += 4) bp.notes.push({ start: s, dur: 4, preset: 'sub808', octave: 1, idx: 0 });
  $('rollWith').checked = true;
 }
 const drift = () => { const a0 = stepLog.find(s => s.abs === 0), last = stepLog[stepLog.length - 1]; return Math.round((last.time - (a0.time + last.abs * last.len)) * 1000); };
 const cases = [];
 const add = (name, fn) => cases.push({ name, fn });

 add('Un blocage de 0,4 s : la batterie reste calée sur l’instru importée', async () => {
  await stressProject(); start(0); await sleep(1500);
  const before = drift(); busy(400); await sleep(2000);
  const after = drift(), s = st(); stop(); await sleep(200);
  if (Math.abs(after) > 5) throw Error('décalage après blocage : ' + after + ' ms (avant : ' + before + ' ms)');
  if (!/recalés/.test(s)) throw Error('pas de message : « ' + s + ' »');
  return 'décalage avant ' + before + ' ms, après ' + after + ' ms ; « ' + s + ' »';
 });

 add('Trois blocages de suite (0,3 s, 0,6 s, 0,2 s)', async () => {
  start(0); await sleep(1000);
  for (const ms of [300, 600, 200]) { busy(ms); await sleep(700); }
  const after = drift(), n = window.JACK22_CLOCK138 ? window.JACK22_CLOCK138.state.stalls : 0; stop(); await sleep(200);
  if (Math.abs(after) > 5) throw Error('décalage : ' + after + ' ms');
  return 'décalage final ' + after + ' ms ; ' + n + ' recalages comptés';
 });

 add('Un fichier qui devait démarrer pendant le blocage démarre au bon endroit de son contenu', async () => {
  if (!audioClips.some(c => c.name === 'cible-mesure2')) { await audioImportFile(wav('cible-mesure2.wav', 6, sine(660, 0.3))); }
  const c = audioClips.find(x => x.name === 'cible-mesure2'); c.startBar = 1; tlBuild();     // mesure 2 = pas 16 = 2,667 s à 90 BPM
  const starts = [], mk = audio.createBufferSource.bind(audio);
  audio.createBufferSource = function () { const s = mk(); const o = s.start.bind(s); s.start = (w, off, d) => { if (s.buffer && Math.abs(s.buffer.duration - 6) < 0.01) starts.push({ w, off: off || 0 }); return o(w, off, d); }; return s; };
  try {
   start(0); await sleep(10); const a0 = stepLog.find(s => s.abs === 0).time, ideal = a0 + 16 * stepSec();
   while (audio.currentTime < ideal - 0.25) await sleep(10);
   busy(600); await sleep(1200);
   stop(); await sleep(200);
   if (!starts.length) throw Error('le fichier n’a pas démarré');
   const s = starts[0], err = Math.round(((s.w - s.off) - ideal) * 1000);
   if (Math.abs(err) > 2) throw Error('contenu décalé de ' + err + ' ms (départ ' + s.w.toFixed(3) + ', dans le fichier à ' + s.off.toFixed(3) + ' s)');
   return 'démarré ' + Math.round((s.w - ideal) * 1000) + ' ms après son heure, à ' + Math.round(s.off * 1000) + ' ms dans le fichier : calé à ' + err + ' ms';
  } finally { delete audio.createBufferSource; c.startBar = 20; tlBuild(); }
 });

 add('Master à 100 % avec trois voix fortes : « SATURE » affiché', async () => {
  for (const [n, f] of [['voix-lead', 220], ['doublage', 330], ['adlib', 440]]) if (!audioClips.some(c => c.name === n)) await audioImportFile(wav(n + '.wav', 20, sine(f, 0.9)));
  for (const n of ['voix-lead', 'doublage', 'adlib']) audioClips.find(c => c.name === n).startBar = 0; tlBuild();
  $('master').value = '100'; $('master').dispatchEvent(new Event('input'));
  start(0); await sleep(2000); const b = document.getElementById('j138Peak'), txt = b && b.textContent, hot = b && b.classList.contains('hot'); stop(); await sleep(300);
  if (!b) throw Error('aucun voyant de crête');
  if (!hot || !/SATURE/.test(txt)) throw Error('voyant : « ' + txt + ' »');
  return '« ' + txt + ' » en rouge';
 });

 add('Master à 30 % : pas d’alerte, crête affichée', async () => {
  $('master').value = '30'; $('master').dispatchEvent(new Event('input'));
  start(0); await sleep(2000); const b = document.getElementById('j138Peak'), txt = b && b.textContent, hot = b && b.classList.contains('hot'); stop(); await sleep(300);
  $('master').value = '70'; $('master').dispatchEvent(new Event('input'));
  if (!b || hot || !/crête -?\d/.test(txt)) throw Error('voyant : « ' + txt + ' »' + (hot ? ' (rouge)' : ''));
  for (const n of ['voix-lead', 'doublage', 'adlib', 'clic-90bpm', 'cible-mesure2']) { const c = audioClips.find(x => x.name === n); if (c) audioClips.splice(audioClips.indexOf(c), 1); } tlBuild();
  return '« ' + txt + ' », sans rouge';
 });

 async function run() { const out = []; for (const c of cases) { const t0 = performance.now(); try { out.push({ cas: c.name, ok: true, detail: await c.fn() }); } catch (e) { try { stop(); } catch (x) {} out.push({ cas: c.name, ok: false, detail: String(e && e.message || e) }); } out[out.length - 1].ms = Math.round(performance.now() - t0); } return out; }
 window.JACK22_D7 = { run };
})();
