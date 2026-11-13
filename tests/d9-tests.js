/* JACK22 — tests de la 7.0 (Mission M3) : grille et aimant des clips audio.
   Usage : JACK22_D9.run().then(r => console.table(r)) */
(() => {
 'use strict';
 const sleep = ms => new Promise(r => setTimeout(r, ms));
 const KEY = 'jack22-vision8-project-v1';
 function wav(name, sec, sr = 44100) { const len = Math.round(sec * sr), buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0))); w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true); for (let i = 0; i < len; i++) v.setInt16(44 + i * 2, 0.3 * Math.sin(2 * Math.PI * 220 * i / sr) * 32767, true); return new File([buf], name, { type: 'audio/wav' }); }
 const S = () => window.JACK22_SNAP140, A = () => window.JACK22_AUDIO_EDIT;
 async function clip() { if (!audioClips.length) await audioImportFile(wav('voix-test.wav', 4)); if (playMode !== 'song') $('modeSong').click(); tlBuild(); await sleep(200); return audioClips[0]; }
 // Glisser réel d'un clip de la timeline (évènements pointeur), de dx pixels, Alt éventuel.
 async function drag(c, dx, alt) {
  const el = document.querySelector('#tlRows .tl-aud[data-audio="' + c.id + '"]'); if (!el) throw Error('clip non dessiné');
  const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, o = { bubbles: true, pointerId: 1, isPrimary: true, button: 0, altKey: !!alt };
  el.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: x, clientY: y }));
  for (const t of [document, window]) t.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: x + dx, clientY: y }));
  el.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: x + dx, clientY: y }));
  for (const t of [el, document, window]) t.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: x + dx, clientY: y }));
  await sleep(300); return A().seconds(audioClips.find(x => x.id === c.id));
 }
 const mult = (s, q) => Math.abs(s - Math.round(s / q) * q) < 0.0005;     // le placement se fait à l'échantillon le plus proche : tolérance 0,5 ms
 const cases = [], add = (n, f) => cases.push({ n, f });
 add('Bouton et choix de grille présents, aimant allumé au 1/16 par défaut', async () => {
  const b = $('j140SnapOn'), g = $('j140Grid'); if (!b || !g) throw Error('commandes absentes');
  const s = S().state; if (!s.on || s.grid !== '16') throw Error(JSON.stringify(s));
  return '« ' + b.textContent + ' », « ' + g.selectedOptions[0].textContent + ' »';
 });
 add('Glisser un clip, grille « temps » : position calée sur un temps', async () => {
  const c = await clip(); S().set({ on: true, grid: 'beat' });
  const at = await drag(c, 0.37 * TL_BAR_W + 3, false), q = 4 * stepSec();
  if (!mult(at, q)) throw Error('position ' + at.toFixed(4) + ' s, pas un multiple de ' + q.toFixed(4) + ' s');
  return 'clip à ' + at.toFixed(3) + ' s = temps n° ' + Math.round(at / q + 1);
 });
 add('Grille « mesure »', async () => {
  const c = audioClips[0]; S().set({ grid: 'bar' });
  const at = await drag(c, 1.3 * TL_BAR_W, false), q = 16 * stepSec();
  if (!mult(at, q)) throw Error('position ' + at.toFixed(4) + ' s');
  return 'clip à ' + at.toFixed(3) + ' s = mesure ' + Math.round(at / q + 1);
 });
 add('Aimant éteint : placement libre ; Alt le rallume le temps du geste', async () => {
  const c = audioClips[0]; S().set({ on: false, grid: '16' });
  const free = await drag(c, 0.21 * TL_BAR_W + 1, false);
  if (mult(free, stepSec())) throw Error('libre attendu, obtenu calé : ' + free.toFixed(4));
  const alt = await drag(c, 0.43 * TL_BAR_W + 2, true);
  if (!mult(alt, stepSec())) throw Error('Alt : non calé ' + alt.toFixed(4));
  return 'libre à ' + free.toFixed(4) + ' s ; avec Alt à ' + alt.toFixed(4) + ' s (1/16)';
 });
 add('Touche G : aimant oui / non', async () => {
  const before = S().state.on; $('timeline').dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
  const after = S().state.on; if (after === before) throw Error('inchangé');
  return (before ? 'allumé' : 'éteint') + ' → ' + (after ? 'allumé' : 'éteint');
 });
 add('Gardé dans le projet ; une ancienne sauvegarde ouvre au 1/16', async () => {
  S().set({ on: false, grid: '8' }); await ProjectPersistence.save(); await sleep(500);
  const saved = JSON.parse(localStorage.getItem(KEY)); if (!saved.studio || !saved.studio.snap140) throw Error('pas dans la sauvegarde');
  S().set({ on: true, grid: 'bar' }); ProjectPersistence.load(); await sleep(800);
  const s1 = S().state; if (s1.on !== false || s1.grid !== '8') throw Error('rechargé : ' + JSON.stringify(s1));
  delete saved.studio.snap140; localStorage.setItem(KEY, JSON.stringify(saved)); ProjectPersistence.load(); await sleep(800);
  const s2 = S().state; if (!s2.on || s2.grid !== '16') throw Error('ancienne sauvegarde : ' + JSON.stringify(s2));
  return 'rechargé « éteint, 1/8 » ; ancienne sauvegarde → « allumé, 1/16 » ; « ' + $('status').textContent.slice(0, 60) + ' »';
 });
 async function run(only) { const out = []; for (const c of cases.filter(c => !only || only.test(c.n))) { try { out.push({ cas: c.n, ok: true, detail: await c.f() }); } catch (e) { out.push({ cas: c.n, ok: false, detail: String(e && e.message || e) }); } } return out; }
 window.JACK22_D9 = { run };
})();
