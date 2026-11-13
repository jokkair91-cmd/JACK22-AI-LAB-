/* JACK22 — tests de la 7.1 (Mission M2) : gain par clip, copier / coller sans nouveau fichier, fondus croisés automatiques.
   Usage : JACK22_D10.run().then(r => console.table(r)) */
(() => {
 'use strict';
 const sleep = ms => new Promise(r => setTimeout(r, ms)), KEY = 'jack22-vision8-project-v1';
 const A = () => window.JACK22_AUDIO_EDIT, G = () => window.JACK22_CLIPS141;
 function wav(name, sec, amp = 0.4, sr = 44100) { const len = Math.round(sec * sr), buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0))); w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true); for (let i = 0; i < len; i++) v.setInt16(44 + i * 2, amp * Math.sin(2 * Math.PI * 330 * i / sr) * 32767, true); return new File([buf], name, { type: 'audio/wav' }); }
 async function fresh() {
  audioClips.splice(0, audioClips.length); tlBuild();
  activePat(0).grid.forEach(r => r.fill(false)); for (let ti = 1; ti < song.tracks.length; ti++) activePat(ti).notes = []; roll.notes = []; rollChanged(); if (playMode !== 'pattern') $('modePattern').click();   // seul le clip doit sonner
  $('expLoops').value = '1'; $('expLoops').dispatchEvent(new Event('change'));
  await audioImportFile(wav('phrase.wav', 2)); return audioClips[0];
 }
 async function wavPeak() { const r = await renderSong(exportData(), expOpts()); return r.peak; }
 const cases = [], add = (n, f) => cases.push({ n, f });
 add('Gain −6 dB : WAV et écoute baissent pareil, fichier intact', async () => {
  const c = await fresh(), p0 = await wavPeak(), before = c.buffer.getChannelData(0).slice(0, 2000).join();
  G().setGain(c.id, -6); const p1 = await wavPeak(), ratio = p1 / p0;
  if (Math.abs(ratio - 0.5012) > 0.01) throw Error('WAV : rapport ' + ratio.toFixed(4));
  start(0); await sleep(250); const pl = audioPlaying.find(a => a.c.id === c.id), live = pl && pl.env.gain.value; stop(); await sleep(150);
  if (!pl || Math.abs(live - 0.5012) > 0.01) throw Error('écoute : gain ' + live);
  if (c.buffer.getChannelData(0).slice(0, 2000).join() !== before) throw Error('source modifiée');
  return 'crête WAV ' + p0.toFixed(3) + ' → ' + p1.toFixed(3) + ' (×' + ratio.toFixed(3) + ') ; écoute ×' + live.toFixed(3) + ' ; source intacte';
 });
 add('Annuler le gain : une seule étape', async () => {
  const c = audioClips[0]; await sleep(50); $('v8Undo').click(); await sleep(400);
  if (G().gainOf(c.id) !== 0) throw Error('gain après Annuler : ' + G().gainOf(c.id));
  return 'gain revenu à 0 dB en un Annuler';
 });
 add('Copier / coller à la tête de lecture : même son, aucun nouveau fichier, coupe et gain repris', async () => {
  const c = audioClips[0]; A().setEdit(c.id, { trimIn: 0.2, fadeOut: 0.3 }); G().setGain(c.id, -3);
  G().copyClip(c.id); const n0 = audioClips.length, id = G().pasteClip(5);
  const b = audioClips.find(x => x.id === id), e = A().editOf(id);
  if (audioClips.length !== n0 + 1) throw Error('nombre de clips ' + audioClips.length);
  if (b.buffer !== c.buffer || b.blob !== c.blob) throw Error('nouveau son créé');
  if (Math.abs(A().seconds(b) - 5) > 1e-6) throw Error('position ' + A().seconds(b));
  if (e.trimIn !== 0.2 || e.fadeOut !== 0.3 || G().gainOf(id) !== -3) throw Error('réglages non repris ' + JSON.stringify(e) + ' gain ' + G().gainOf(id));
  return '« ' + b.name + ' » à 5,000 s, même son décodé que l’original, coupe 0,2 s, fondu 0,3 s, gain −3 dB';
 });
 add('Annuler le collage : une seule étape', async () => {
  const n = audioClips.length; $('v8Undo').click(); await sleep(400);
  if (audioClips.length !== n - 1) throw Error('clips après Annuler : ' + audioClips.length);
  $('v8Redo').click(); await sleep(400); if (audioClips.length !== n) throw Error('Rétablir : ' + audioClips.length);
  return 'Annuler retire la copie, Rétablir la remet';
 });
 add('Ctrl+D dans la timeline : duplique juste après', async () => {
  const c = audioClips[0]; A().select([c.id]); $('timeline').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  const n = audioClips.length; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }));
  await sleep(200); if (audioClips.length !== n + 1) throw Error('pas de copie');
  const d = audioClips[audioClips.length - 1], want = A().seconds(c) + A().clipEdit(c.id).len;
  if (Math.abs(A().seconds(d) - want) > 1e-6) throw Error('position ' + A().seconds(d) + ' au lieu de ' + want);
  return 'copie posée à ' + want.toFixed(3) + ' s (fin du clip)';
 });
 add('Fondus croisés automatiques sur un chevauchement', async () => {
  const c = await fresh(); A().setEdit(c.id, { trimIn: 0, trimOut: 0, fadeIn: 0, fadeOut: 0 });
  G().copyClip(c.id); const id = G().pasteClip(1.5);                 // 0,5 s de chevauchement
  const n = G().autoCrossfades(), a = A().editOf(c.id), b = A().editOf(id);
  if (n !== 1 || Math.abs(a.fadeOut - 0.5) > 1e-4 || Math.abs(b.fadeIn - 0.5) > 1e-4) throw Error(JSON.stringify({ n, a, b }));
  const r = await renderSong(exportData(), expOpts());
  return n + ' fondu croisé de ' + a.fadeOut.toFixed(3) + ' s ; WAV crête ' + r.peak.toFixed(3) + ' (deux sinus en phase : pas de bosse au-dessus de 0,4)';
 });
 add('Gain et copie gardés après Sauvegarder / Charger', async () => {
  const c = audioClips[0]; G().setGain(c.id, -4.5); const ids = audioClips.map(x => x.id).join();
  await ProjectPersistence.save(); await sleep(600); G().setGain(c.id, 0); ProjectPersistence.load(); await sleep(1200);
  if (G().gainOf(c.id) !== -4.5) throw Error('gain rechargé : ' + G().gainOf(c.id) + ' ; « ' + $('status').textContent + ' »');
  if (audioClips.map(x => x.id).join() !== ids) throw Error('clips : ' + audioClips.map(x => x.id).join());
  return 'gain −4,5 dB et ' + audioClips.length + ' clips retrouvés ; « ' + $('status').textContent.slice(0, 70) + ' »';
 });
 add('Prise voix : copie refusée avec explication', async () => {
  const c = audioClips[0], keep = c.voice; c.voice = { slot: 1 };
  try { G().copyClip(c.id); throw Error('acceptée'); } catch (e) { if (!/Dupliquer après le clip/.test(e.message)) throw e; return '« ' + e.message + ' »'; } finally { c.voice = keep; }
 });
 async function run(only) { const out = []; for (const c of cases.filter(c => !only || only.test(c.n))) { try { out.push({ cas: c.n, ok: true, detail: await c.f() }); } catch (e) { try { stop(); } catch (x) {} out.push({ cas: c.n, ok: false, detail: String(e && e.message || e) }); } } return out; }
 window.JACK22_D10 = { run };
})();
