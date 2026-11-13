/* JACK22 — tests de la 6.7 (Mission 0a) : notes au début du pattern.
   Usage : JACK22_D6.run().then(r => console.table(r))
   Les mêmes cas tournent sur la 6.6 pour montrer le défaut (attendu : échecs), et sur la 6.7 (attendu : tout réussi). */
(() => {
 'use strict';
 const KEY = 'jack22-vision8-project-v1';
 const sleep = ms => new Promise(r => setTimeout(r, ms));
 const T = () => window.JACK22_NOTE_TOOLS, E = () => window.JACK22_NOTE_EDITOR;
 const st = () => (document.getElementById('status') || {}).textContent || '';
 const N = (start, off, idx = 0) => Object.assign({ start, dur: 2, preset: 'lead', octave: 4, idx }, off ? { off } : {});
 const bad = notes => notes.filter(n => n.start + (n.off || 0) < 0).length;
 function setNotes(notes) { roll.notes = notes.map(n => ({ ...n })); rollSel = null; rollChanged(); }
 async function saveLoad() {
  await ProjectPersistence.save(); await sleep(400);
  const saved = JSON.parse(localStorage.getItem(KEY));
  setNotes([]);                                         // on vide, pour voir ce que le chargement ramène
  ProjectPersistence.load(); await sleep(600);
  return { saved, status: st(), notes: roll.notes.map(n => ({ ...n })) };
 }
 const savedMelody = s => s.song.tracks[2].patterns[s.song.tracks[2].active].notes;
 const cases = [];
 const add = (name, fn) => cases.push({ name, fn });

 add('Glisser à la souris une note décalée sur la case 1 (vrais évènements pointeur)', async () => {
  setNotes([N(2, -0.3)]);
  const grid = $('rollGrid'), el = grid.querySelector('.rn'); if (!el) throw Error('note non dessinée');
  const r = el.getBoundingClientRect(), x = r.left + 4, y = r.top + r.height / 2;
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true }));
  grid.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x - 2 * ROLL_CW, clientY: y, pointerId: 1, isPrimary: true }));
  const leftDuring = parseFloat(el.style.left);
  grid.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x - 2 * ROLL_CW, clientY: y, pointerId: 1, isPrimary: true }));
  const n = roll.notes[0];
  if (!n || n.start !== 0) throw Error('la note n’est pas arrivée en case 1 (début ' + (n && n.start) + ')');
  if (bad(roll.notes)) throw Error('note avant la case 1 : décalage ' + n.off);
  if (leftDuring < 0) throw Error('dessinée hors de la grille pendant le glisser (' + leftDuring + ' px)');
  const L = await saveLoad();
  if (/invalide/i.test(L.status) || L.notes.length !== 1) throw Error('chargement : « ' + L.status + ' », ' + L.notes.length + ' note(s)');
  return 'case 1, décalage ' + (n.off || 0) + ', dessinée à ' + leftDuring + ' px ; sauvegarde rouverte (' + L.notes.length + ' note)';
 });

 add('« Déplacer −1 » sur une note décalée en case 2', async () => {
  setNotes([N(1, -0.3), N(6, -0.2, 4)]);
  const r = T().transform(roll.notes, roll.steps, [0], 'move', -1); if (!r.ok) throw Error(r.error);
  if (!E().commit(r, 'move', [0])) throw Error('geste refusé');
  if (bad(roll.notes)) throw Error('note avant la case 1 : ' + JSON.stringify(roll.notes));
  const other = roll.notes.find(n => n.start === 6);
  if (!other || other.off !== -0.2) throw Error('l’autre note a perdu son décalage');
  const L = await saveLoad();
  if (/invalide/i.test(L.status) || L.notes.length !== 2) throw Error('chargement : « ' + L.status + ' »');
  if (L.notes.find(n => n.start === 6).off !== -0.2) throw Error('décalage de la note 7 perdu au chargement');
  return 'note en case 1 sans décalage, la note en case 7 garde −0,2 ; sauvegarde rouverte';
 });

 add('Copier deux notes (la première décalée) puis Coller mesure 1', async () => {
  setNotes([N(4, -0.2, 2), N(6, 0, 4)]);
  const c = T().copy(roll.notes, roll.steps, [0, 1]); if (!c.ok) throw Error(c.error);
  const r = T().paste(roll.notes, roll.steps, c.notes, 0); if (!r.ok) throw Error(r.error);
  if (!E().commit(r, 'paste', r.selectionIndices || [])) throw Error('geste refusé');
  if (roll.notes.length !== 4 || bad(roll.notes)) throw Error(JSON.stringify(roll.notes));
  const L = await saveLoad();
  if (/invalide/i.test(L.status) || L.notes.length !== 4) throw Error('chargement : « ' + L.status + ' », ' + L.notes.length + ' notes');
  return '4 notes, aucune avant la case 1 ; sauvegarde rouverte avec les 4';
 });

 add('Sauvegarde déjà abîmée par la 6.6 : le projet se rouvre', async () => {
  setNotes([N(3, 0)]); await ProjectPersistence.save(); await sleep(400);
  const s = JSON.parse(localStorage.getItem(KEY)), mel = s.song.tracks[2];
  mel.patterns[mel.active].notes = [N(0, -0.2, 2), N(2, 0, 4), N(5, -0.25, 7)];
  s.song.tracks[1].patterns[s.song.tracks[1].active].notes = [{ start: 0, dur: 4, preset: 'sub808', octave: 1, idx: 0, off: -0.1 }];
  s.bpm = 93; localStorage.setItem(KEY, JSON.stringify(s));
  setNotes([]); ProjectPersistence.load(); await sleep(700);
  const status = st();
  if (/invalide/i.test(status)) throw Error('refusé : « ' + status + ' »');
  const mp = activePat(2).notes, bp = activePat(1).notes;
  if (mp.length !== 3 || bp.length !== 1) throw Error('notes manquantes : mélodie ' + mp.length + ', basse ' + bp.length);
  if (bad(mp) || bad(bp)) throw Error('note encore avant la case 1');
  if (mp.find(n => n.start === 5).off !== -0.25) throw Error('la note 6 a perdu son décalage');
  if (getBpm() !== 93) throw Error('tempo non chargé');
  if (!/ramenée/.test(status)) throw Error('pas de message : « ' + status + ' »');
  return '« ' + status + ' »';
 });

 add('Une note décalée hors de la case 1 ne change pas (écoute, dessin, sauvegarde)', async () => {
  setNotes([N(4, -0.3), N(8, 0.25, 2)]);
  const off = roll.notes.map(n => window.J22Off(n));
  const L = await saveLoad();
  const back = L.notes.map(n => window.J22Off(n));
  if (JSON.stringify(off) !== JSON.stringify([-0.3, 0.25]) || JSON.stringify(back) !== JSON.stringify(off)) throw Error(JSON.stringify({ off, back }));
  const el = $('rollGrid').querySelector('.rn');
  if (Math.abs(parseFloat(el.style.left) - (4 - 0.3) * ROLL_CW) > 0.01) throw Error('dessin déplacé : ' + el.style.left);
  return 'décalages −0,3 et +0,25 identiques avant / après ; dessin à ' + el.style.left;
 });

 add('Pattern non affiché contenant une note abîmée : la sauvegarde est propre', async () => {
  setNotes([N(2, 0)]);
  const other = activePat(1); other.notes = [{ start: 0, dur: 2, preset: 'sub808', octave: 1, idx: 0, off: -0.4 }];
  const s = currentSongSave();
  if (parseSongSave(JSON.parse(JSON.stringify(s))) === null) throw Error('sauvegarde encore refusée');
  return 'la note de la 808 est ramenée sur la case 1 dans la sauvegarde';
 });

 add('Annuler revient à l’état d’avant le geste', async () => {
  setNotes([N(1, -0.3)]);
  const r = T().transform(roll.notes, roll.steps, [0], 'move', -1); E().commit(r, 'move', [0]);
  rollUndoDo();
  const n = roll.notes[0];
  if (!n || n.start !== 1 || n.off !== -0.3) throw Error(JSON.stringify(roll.notes));
  return 'note revenue en case 2 avec −0,3';
 });

 async function run() {
  const keep = localStorage.getItem(KEY), out = [];
  for (const c of cases) {
   const t0 = performance.now();
   try { out.push({ cas: c.name, ok: true, detail: await c.fn() }); }
   catch (e) { out.push({ cas: c.name, ok: false, detail: String(e && e.message || e) }); }
   out[out.length - 1].ms = Math.round(performance.now() - t0);
  }
  try { if (keep === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, keep); } catch (e) {}
  setNotes([]);
  return out;
 }
 window.JACK22_D6 = { run };
})();
