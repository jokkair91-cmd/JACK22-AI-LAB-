/* JACK22 — tests de la 7.3 (Mission M4) : écran « Montage ».
   Usage : JACK22_D12.run().then(r => console.table(r)) ; JACK22_D12.overlaps() = boutons qui se chevauchent à la taille actuelle. */
(() => {
 'use strict';
 const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
 const A = () => window.JACK22_AUDIO_EDIT, M = () => window.JACK22_MONTAGE143;
 function wav(name, sec, f, sr = 22050) { const len = Math.round(sec * sr), buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0))); w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true); for (let i = 0; i < len; i++) v.setInt16(44 + i * 2, 0.25 * Math.sin(2 * Math.PI * f * i / sr) * 32767, true); return new File([buf], name + '.wav', { type: 'audio/wav' }); }
 const BAR = () => 16 * stepSec(), byName = n => audioClips.find(c => c.name === n), at = c => A().seconds(c), lane = c => A().lane(c.id);
 const near = (a, b) => Math.abs(a - b) < 1e-6;
 const key = (k, o = {}) => $('tlWrap').dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }));
 const pe = (type, x, y, o = {}) => new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true, ...o });
 const laneEl = id => document.querySelector('#tlRows [data-j99-lane="' + id + '"]');
 // Glisser un clip à la souris : vers une piste et une mesure (aimant 1/16 allumé).
 async function drag(c, toLane, bar) {
  const L = laneEl(toLane); L.scrollIntoView({ block: 'nearest' }); await sleep(30);
  const el = document.querySelector('.tl-aud[data-audio="' + c.id + '"]'), r = el.getBoundingClientRect(), x = Math.max(r.left + 20, 200), y = r.top + r.height / 2;
  el.dispatchEvent(pe('pointerdown', x, y));
  const dx = (bar * BAR() - at(c)) / BAR() * TL_BAR_W;
  window.dispatchEvent(pe('pointermove', x + dx / 2, y)); window.dispatchEvent(pe('pointermove', x + dx, y));
  const lr = L.getBoundingClientRect(), ty = lr.top + lr.height / 2, tx = Math.min(Math.max(lr.left + 30, 200), innerWidth - 30);
  window.dispatchEvent(pe('pointerup', tx, ty)); await sleep(60);
  if (!near(at(c), bar * BAR()) || lane(c) !== toLane) throw Error('« ' + c.name + ' » : ' + at(c).toFixed(4) + ' s sur ' + lane(c) + ' au lieu de mesure ' + (bar + 1) + ' sur ' + toLane);
 }
 async function fresh() {
  if (state !== 'stopped') stop(); audioClips.splice(0, audioClips.length); tlBuild();
  activePat(0).grid.forEach(r => r.fill(false)); for (let ti = 1; ti < song.tracks.length; ti++) activePat(ti).notes = []; roll.notes = []; rollChanged();
  $('bpm').value = '90'; $('bpm').dispatchEvent(new Event('input', { bubbles: true })); $('bpm').dispatchEvent(new Event('change', { bubbles: true }));
  $('tlBars').value = '96'; $('tlBars').dispatchEvent(new Event('change'));
  $('expLoops').value = '1'; $('expLoops').dispatchEvent(new Event('change'));
 }
 const cases = [], add = (n, f) => cases.push({ n, f });
 add('Onglet « Montage » dans Composition', async () => {
  if (!M()) throw Error('écran Montage absent');
  window.JACK22_WORKSPACE.choose('compose', 'arrange'); await sleep(100);
  const tab = $('c143Tab'); if (!tab || !tab.closest('.j93Subs')) throw Error('pas d’onglet Montage dans Composition');
  tab.click(); await sleep(200);
  if (!M().on || !document.body.classList.contains('c143On') || !$('c143Bar').offsetParent) throw Error('écran non ouvert');
  const subs = $('c143Tab').parentElement, pressed = [...subs.querySelectorAll('button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent);
  if (pressed.join() !== 'Montage') throw Error('onglets allumés : ' + pressed.join());
  if (document.querySelector('dialog[open]')) throw Error('fenêtre ouverte');
  [...subs.querySelectorAll('button')].find(b => b.textContent === 'Batterie').click(); await sleep(150);
  if (M().on) throw Error('Batterie ne ferme pas le Montage');
  $('c143Tab').click(); await sleep(150); if (!M().on) throw Error('réouverture');
  return 'onglet à côté d’Arrangement / Batterie / Piano Roll ; ouvert dans la page (pas de fenêtre) ; Batterie le ferme ; barre : ' + [...$('c143Bar').querySelectorAll('button')].length + ' boutons';
 });
 add('Toutes les pistes visibles, même vides (instruments + pistes audio)', async () => {
  await fresh(); M().setSize('S'); const id = A().addTrack('Ad-libs 2'); await sleep(50);
  const labels = [...document.querySelectorAll('#tlRows .tl-row:not(.tl-ruler)')].filter(r => r.offsetParent).map(r => r.querySelector('.tl-label b')?.textContent.trim());
  for (const want of ['BATTERIE', '808 / BASS', 'MÉLODIE', 'AUDIO', 'VOIX 1', 'VOIX 2', 'VOIX 3', 'Ad-libs 2']) if (!labels.includes(want)) throw Error('piste absente : ' + want + ' (vu : ' + labels.join(', ') + ')');
  for (const l of ['audio', 'v1', 'v2', 'v3', id]) if (!laneEl(l) || !laneEl(l).offsetParent) throw Error('piste audio sans zone de dépôt : ' + l);
  M().close(); await sleep(50); const outside = !!laneEl('v1'); M().open(); await sleep(50);
  if (outside) throw Error('l’Arrangement a changé (piste VOIX 1 vide ajoutée hors Montage)');
  return labels.length + ' pistes : ' + labels.join(' · ') + ' ; hors Montage, l’Arrangement est inchangé';
 });
 add('Morceau de référence monté à la souris (9 fichiers, 3 min 20)', async () => {
  const plan = [['Instru', 200, 70], ['Couplet 1', 16 * 8 / 3, 220], ['Couplet 2', 16 * 8 / 3, 230], ['Refrain', 8 * 8 / 3, 260], ['Doublage refrain', 8 * 8 / 3, 330], ['Doublage couplet', 2 * 8 / 3, 300], ['Ad-lib 1', 1.5, 440], ['Ad-lib 2', 1.5, 470], ['Ad-lib 3', 1.5, 500]];
  for (const [n, s, f] of plan) await audioImportFile(wav(n, s, f));
  if (audioClips.length !== 9) throw Error('importés : ' + audioClips.length + ' ; ' + $('status').textContent);
  M().fitAll(); await sleep(50);
  const moves = [['Couplet 1', 'v1', 8], ['Refrain', 'v1', 24], ['Couplet 2', 'v1', 40], ['Doublage refrain', 'v2', 24], ['Doublage couplet', 'v2', 22], ['Ad-lib 1', 'v3', 12], ['Ad-lib 2', 'v3', 30], ['Ad-lib 3', 'v3', 46]];
  for (const [n, l, b] of moves) await drag(byName(n), l, b);
  if (lane(byName('Instru')) !== 'audio' || !near(at(byName('Instru')), 0)) throw Error('instru déplacée');
  return moves.length + ' clips glissés à la souris, chacun exactement au début de sa mesure et sur sa piste (aimant 1/16) ; instru en mesure 1 sur AUDIO';
 });
 add('Au clavier : Ctrl+D, Ctrl+C / Ctrl+V à la tête de lecture, Maj+→, S', async () => {
  const ref = byName('Refrain'); A().select([ref.id]); laneEl('v1').dispatchEvent(pe('pointerdown', 0, 0)); await sleep(20); window.dispatchEvent(pe('pointerup', 0, 0));
  A().select([ref.id]); let n = audioClips.length; key('d', { ctrlKey: true }); await sleep(150);
  const dup = audioClips[audioClips.length - 1]; if (audioClips.length !== n + 1 || !near(at(dup), 32 * BAR()) || lane(dup) !== 'v1') throw Error('Ctrl+D : ' + at(dup) / BAR());
  A().select([ref.id]); key('c', { ctrlKey: true }); window.JACK22_C128.setCursor(56 * 16); await sleep(50); n = audioClips.length; key('v', { ctrlKey: true }); await sleep(150);
  const pst = audioClips[audioClips.length - 1]; if (audioClips.length !== n + 1 || !near(at(pst), 56 * BAR()) || lane(pst) !== 'v1') throw Error('Ctrl+V : ' + at(pst) / BAR() + ' ' + lane(pst));
  const dc = byName('Doublage couplet'); A().select([dc.id]); key('ArrowRight', { shiftKey: true }); await sleep(150); if (!near(at(dc), 23 * BAR())) throw Error('Maj+→ : ' + at(dc) / BAR());
  key('ArrowLeft', { shiftKey: true }); await sleep(150); if (!near(at(dc), 22 * BAR())) throw Error('Maj+← : ' + at(dc) / BAR());
  const c2 = byName('Couplet 2'); A().select([c2.id]); window.JACK22_C128.setCursor(48 * 16); await sleep(30); n = audioClips.length; key('s'); await sleep(400);
  const b = audioClips[audioClips.length - 1], ec = A().clipEdit(c2.id), eb = A().clipEdit(b.id);
  if (audioClips.length !== n + 1 || !near(at(b), 48 * BAR()) || Math.abs(ec.len - 8 * BAR()) > 1e-3 || Math.abs(eb.len - 8 * BAR()) > 1e-3 || b.buffer !== c2.buffer) throw Error('S : ' + JSON.stringify({ n: audioClips.length, at: at(b) / BAR(), a: ec.len, b: eb.len }));
  return 'refrain doublé en mesure 33 (Ctrl+D) et recopié en mesure 57 (Ctrl+V) ; fin de couplet décalée d’une mesure et remise ; couplet 2 coupé en deux à la mesure 49 (même fichier, ' + ec.len.toFixed(3) + ' s + ' + eb.len.toFixed(3) + ' s)';
 });
 add('Rectangle de sélection, Suppr de 3 clips, Ctrl+Z en une étape', async () => {
  const L = laneEl('v3'); L.scrollIntoView({ block: 'nearest' }); await sleep(30); const r = L.getBoundingClientRect(), y0 = r.top + 2, y1 = r.bottom - 2;
  L.dispatchEvent(pe('pointerdown', r.left + 1, y0)); window.dispatchEvent(pe('pointermove', r.left + 200, y1)); window.dispatchEvent(pe('pointerup', r.right - 1, y1)); await sleep(50);
  const ids = A().selection.slice().sort(), want = ['Ad-lib 1', 'Ad-lib 2', 'Ad-lib 3'].map(n => byName(n).id).sort();
  if (ids.join() !== want.join()) throw Error('sélection : ' + ids.join() + ' au lieu de ' + want.join());
  const n = audioClips.length; await sleep(50); key('Delete'); await sleep(200);
  if (audioClips.length !== n - 3) throw Error('Suppr : ' + audioClips.length);
  key('z', { ctrlKey: true }); await sleep(500);
  if (audioClips.length !== n || want.some(id => !audioClips.some(c => c.id === id))) throw Error('Ctrl+Z : ' + audioClips.length);
  const a1 = byName('Ad-lib 1'); if (!near(at(a1), 12 * BAR()) || lane(a1) !== 'v3') throw Error('Ad-lib 1 revenu à ' + at(a1) / BAR());
  return '3 ad-libs pris dans le rectangle, retirés par Suppr, revenus à leur place par un seul Ctrl+Z';
 });
 add('Zoom (boutons, touches +/−) : clips, règle et tête de lecture suivent', async () => {
  const w0 = TL_BAR_W; $('c143ZoomIn').click(); await sleep(50); const w1 = TL_BAR_W; key('-'); await sleep(50); const w2 = TL_BAR_W;
  if (!(w1 > w0 && w2 < w1)) throw Error('zoom : ' + [w0, w1, w2]);
  const c = byName('Refrain'), el = document.querySelector('.tl-aud[data-audio="' + c.id + '"]'), want = A().startStep(c) / 16 * TL_BAR_W;
  if (Math.abs(parseFloat(el.style.left) - want) > 0.5) throw Error('clip à ' + el.style.left + ' au lieu de ' + want);
  const nums = document.querySelectorAll('#tlRows .tl-ruler .tl-num'); if (Math.abs(nums[1].getBoundingClientRect().left - nums[0].getBoundingClientRect().left - TL_BAR_W) > 1) throw Error('règle');
  M().fitAll(); await sleep(50); const wrap = $('tlWrap'), last = document.querySelector('#tlRows .tl-ruler .tl-num:nth-child(' + (Math.ceil(songEndStep() / 16) + 1) + ')');
  if (!last || last.getBoundingClientRect().right > wrap.getBoundingClientRect().right + 2) throw Error('Tout voir : la fin du morceau dépasse');
  return 'largeur de mesure ' + w0 + ' → ' + w1 + ' → ' + w2 + ' px ; clips et règle recalculés ; « Tout voir » montre les ' + Math.ceil(songEndStep() / 16) + ' mesures (' + TL_BAR_W + ' px/mesure)';
 });
 add('Règle en mesures, tête de lecture et position affichée', async () => {
  M().zoomTo(64); $('tlWrap').scrollLeft = 0; await sleep(50);
  const nums = document.querySelectorAll('#tlRows .tl-ruler .tl-num'), n9 = nums[8], r = n9.getBoundingClientRect(), y = r.top + r.height / 2;
  n9.dispatchEvent(pe('pointerdown', r.left + 0.5, y)); $('tlRows').dispatchEvent(pe('pointerup', r.left + 0.5, y)); await sleep(100);
  const cur = window.JACK22_C128.cursor; if (Math.abs(cur - 128) > 1) throw Error('tête de lecture à ' + cur);
  await sleep(300); const t = $('c143Pos').textContent; if (!/Mesure 9 · temps 1 · 0:21,3/.test(t)) throw Error('affichage : ' + t);
  key('Home'); await sleep(300); if (window.JACK22_C128.cursor !== 0 || !/Mesure 1 ·/.test($('c143Pos').textContent)) throw Error('Début : ' + $('c143Pos').textContent);
  const head = $('tlHead'); if (getComputedStyle(head).display === 'none') throw Error('tête de lecture cachée');
  return 'clic sur la mesure 9 → « ' + t + ' » ; touche Début → mesure 1 ; tête rouge visible à l’arrêt';
 });
 add('Export WAV du morceau monté + Sauvegarder / Charger', async () => {
  const r = await renderSong(exportData(), expOpts()), sec = (r.wav.byteLength - 44) / 4 / 44100;
  if (sec < 200 || sec > 210) throw Error('durée ' + sec);
  const before = audioClips.map(c => c.name + '@' + at(c).toFixed(6) + '/' + lane(c)).join('|');
  await ProjectPersistence.save(); await sleep(800); audioClips.splice(0, audioClips.length); tlBuild(); ProjectPersistence.load(); await sleep(3000);
  const after = audioClips.map(c => c.name + '@' + at(c).toFixed(6) + '/' + lane(c)).join('|');
  if (after !== before) throw Error('après chargement : ' + after.slice(0, 300));
  return 'WAV de ' + sec.toFixed(2) + ' s (crête ' + r.peak.toFixed(3) + ') ; ' + audioClips.length + ' clips retrouvés à l’identique après Sauvegarder / Charger';
 });
 // Boutons visibles qui se chevauchent (barre du haut, navigation, barre de l'arrangement, barre du Montage).
 function overlaps() {
  const zones = ['#j93Nav', '.dockTimelineBar', '#c143Bar', 'header', '#dockTop', '.dockTop'].flatMap(s => [...document.querySelectorAll(s)]);
  const els = [...new Set(zones.flatMap(z => [...z.querySelectorAll('button,select,summary,input,#c143Pos')]))].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && e.offsetParent && !e.closest('[hidden],details:not([open])>div,.dockPopupBody,.j93Menu'); });
  const out = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { if (els[i].contains(els[j]) || els[j].contains(els[i])) continue; const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect(), w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (w > 1 && h > 1) out.push((els[i].id || els[i].textContent.trim().slice(0, 14)) + ' × ' + (els[j].id || els[j].textContent.trim().slice(0, 14))); }
  const bar = $('c143Bar'), br = bar && bar.getBoundingClientRect(); if (bar && bar.offsetParent && br.right > innerWidth + 1) out.push('barre du Montage plus large que l’écran');
  return { n: els.length, out };
 }
 async function run(only) { const out = []; for (const c of cases.filter(c => !only || only.test(c.n))) { try { out.push({ cas: c.n, ok: true, detail: await c.f() }); } catch (e) { try { stop(); } catch (x) {} out.push({ cas: c.n, ok: false, detail: String(e && e.message || e) }); } } return out; }
 window.JACK22_D12 = { run, overlaps };
})();
