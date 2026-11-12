/* JACK22 — tests de la 6.7 (Mission 0a : notes en début de pattern), à charger dans la page du studio.
   Passe par les vraies commandes de l'éditeur (JACK22_NOTE_EDITOR, JACK22_MULTI_NOTES). Le Piano Roll est remis comme avant à la fin.
   Usage : JACK22_E1.run().then(r => console.table(r)). */
(() => {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE;
  const N = (start, off, idx = 0) => ({ start, dur: 2, preset: 'lead', octave: 4, idx, ...(off !== undefined ? { off } : {}) });
  const valid = () => roll.notes.every(n => n.off === undefined || (n.start + n.off >= 0 && Math.abs(n.off) < 0.5));
  const reopen = () => { const r = parseRollSave(JSON.parse(JSON.stringify(currentRollSave()))); return r ? r.notes.length : 'REJET'; };
  const setNotes = list => { roll.notes.length = 0; list.forEach(n => roll.notes.push({ ...n })); rollSel = null; rollChanged(); rollDraw(); };
  const scopeOne = () => { const s = document.querySelector('#j94Tools select[aria-label="Cible"]'); if (s) { const o = [...s.options].find(o => o.value !== 'all' && o.value !== 'multi'); if (o) s.value = o.value; } return s; };
  const show = () => JSON.stringify(roll.notes.map(n => [n.start, n.off || 0]));

  const cases = [
    ['Humaniser sur la première case', async () => {
      setNotes([N(0), N(0, undefined, 4), N(1, -0.2, 7)]); const s = document.querySelector('#j94Tools select[aria-label="Cible"]'); if (s) s.value = 'all';
      let worst = 0;
      for (const seed of [1, 7, 42, 99, 1234]) {
        setNotes([N(0), N(0, undefined, 4), N(1, -0.2, 7)]); if (s) s.value = 'all';
        window.JACK22_NOTE_EDITOR.apply('humanize', { timing: 0.45, velocity: 20, seed }); await sleep(30);
        if (!valid()) throw Error('graine ' + seed + ' : note avant la case 1 : ' + show());
        if (reopen() !== 3) throw Error('graine ' + seed + ' : réouverture ' + reopen());
        worst = Math.min(worst, ...roll.notes.map(n => n.start + (n.off || 0)));
      }
      scopeOne();
      return '5 tirages (force maximale 0,45) sur 3 notes en case 1-2 : aucune avant la case 1 (minimum ' + worst + ') ; réouverture : 3 notes à chaque fois';
    }],
    ['Déplacer une note décalée vers la case 1', async () => {
      setNotes([N(1, -0.3)]); scopeOne(); rollSel = roll.notes[0];
      const ok = window.JACK22_NOTE_EDITOR.apply('move', -1); await sleep(100);
      if (!ok) throw Error('déplacement refusé : ' + (document.querySelector('#j94Tools [aria-live]')?.textContent || '?'));
      if (roll.notes[0]?.start !== 0) throw Error('note non déplacée : ' + show());
      if (!valid()) throw Error('note avant la case 1 : ' + show());
      if (reopen() !== 1) throw Error('réouverture : ' + reopen());
      return 'case 2 décalée de −0,3 → case 1, décalage ramené à 0 (' + show() + ') ; réouverture : 1 note';
    }],
    ['Copier / coller sur la mesure 1', async () => {
      setNotes([N(4, -0.3, 0), N(6, 0.2, 4)]); const M = window.JACK22_MULTI_NOTES; M.all(); await sleep(50);
      if (!M.copy()) throw Error('copie refusée');
      const at = [...document.querySelectorAll('#j94Tools input[type="number"]')].find(i => /mesure/i.test((i.getAttribute('aria-label') || '') + (i.title || '') + (i.previousSibling?.textContent || '') + (i.parentElement?.textContent || '')));
      if (!at) throw Error('champ « mesure » du collage introuvable');
      at.value = '1'; at.dispatchEvent(new Event('input', { bubbles: true }));
      const ok = M.paste(); await sleep(100);
      if (!ok) throw Error('collage refusé');
      if (roll.notes.length !== 4) throw Error('collage incomplet : ' + show());
      if (!valid()) throw Error('note avant la case 1 : ' + show());
      if (reopen() !== 4) throw Error('réouverture : ' + reopen());
      return 'copie collée au début de la mesure 1 : 4 notes valides (' + show() + ') ; réouverture : 4 notes';
    }],
    ['Édition fine : décalage négatif sur la case 1', async () => {
      setNotes([N(0)]); scopeOne(); rollSel = roll.notes[0];
      window.JACK22_NOTE_EDITOR.apply('set', { start: 0, off: -0.25, dur: 2, velocity: 100 }); await sleep(100);
      if (!valid()) throw Error('note avant la case 1 : ' + show());
      if (reopen() !== 1) throw Error('réouverture : ' + reopen());
      return 'décalage −0,25 demandé sur la case 1 → ' + (roll.notes[0].off ? 'gardé ' + roll.notes[0].off : 'ramené à 0') + ' ; réouverture : 1 note';
    }],
    ['Fin d’un glisser à la souris (case 1, décalage négatif)', async () => {
      // Le glisser modifie start puis appelle rollChanged() : on reproduit exactement cet état final.
      setNotes([N(3, -0.4)]); roll.notes[0].start = 0; rollChanged(); await sleep(50);
      if (!valid()) throw Error('note avant la case 1 : ' + show());
      if (reopen() !== 1) throw Error('réouverture : ' + reopen());
      return 'note glissée en case 1 avec −0,4 → ' + show() + ' ; réouverture : 1 note';
    }],
    ['Ancienne sauvegarde abîmée : rien n’est perdu', async () => {
      setNotes([N(2), N(5, 0.1, 2)]);
      const save = JSON.parse(JSON.stringify(currentRollSave()));
      save.notes.push(N(0, -0.3, 4));                                   // note limite (état produit par la 6.6)
      save.notes.push({ start: 7, dur: 2, preset: 'inconnu', octave: 4, idx: 1 }); // note illisible
      const d0 = window.JACK22_NOTES137?.stats.dropped ?? 0;
      const r = parseRollSave(save);
      if (!r) throw Error('Piano Roll entier rejeté');
      await sleep(60);
      // Rien ne disparaît en silence : le compte des notes ignorées augmente et un message le dit.
      if ((window.JACK22_NOTES137?.stats.dropped ?? 0) !== d0 + 1) throw Error('note illisible ignorée sans être comptée');
      const msgs = [document.getElementById('dockMessages'), document.getElementById('status'), document.getElementById('c119Msg')].filter(Boolean).map(e => e.textContent).join(' ') + ' ' + (window.Jack22Feedback?.history?.map?.(h => h.text || h).join(' ') || '');
      if (!/illisible/.test(msgs)) throw Error('aucun message affiché pour la note ignorée');
      if (r.notes.length !== 3) throw Error(r.notes.length + ' notes gardées au lieu de 3');
      const lim = r.notes.find(n => n.start === 0); if (!lim || (lim.off !== undefined && lim.start + lim.off < 0)) throw Error('note limite non réparée');
      // Même chose au niveau du projet entier.
      const song = JSON.parse(JSON.stringify(currentSongSave())); let put = false;
      for (const t of song.tracks || []) for (const p of t.patterns || []) if (!put && Array.isArray(p.notes)) { p.notes.push(N(0, -0.3, 7)); put = true; }
      if (!put) return 'Piano Roll : 3 notes sur 4 gardées (1 réparée, 1 illisible ignorée) ; pas de pattern de notes dans ce projet pour le test du projet entier';
      if (!parseSongSave(song)) throw Error('projet entier rejeté à cause d’une note');
      return 'Piano Roll : 3 notes sur 4 gardées (1 réparée, 1 illisible ignorée, message affiché) ; projet entier : rouvert';
    }],
    ['Lecture inchangée pour les notes normales', async () => {
      const a = [N(0), N(4, 0.2, 2), N(8, -0.1, 4)]; setNotes(a);
      const same = JSON.stringify(roll.notes.map(n => [n.start, n.off || 0])) === JSON.stringify(a.map(n => [n.start, n.off || 0]));
      if (!same) throw Error('notes normales modifiées : ' + show());
      return 'notes valides laissées telles quelles (' + show() + ')';
    }],
  ];

  async function run(only) {
    const out = [];
    WS()?.choose('compose', 'roll'); await sleep(450);
    const before = JSON.parse(JSON.stringify(roll.notes)), selBefore = rollSel;
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t);
      }
    } finally {
      try { window.JACK22_MULTI_NOTES?.clear(); } catch (e) {}
      roll.notes.length = 0; before.forEach(n => roll.notes.push(n)); rollSel = selBefore; rollChanged(); rollDraw();
      WS()?.choose('compose', 'arrange'); await sleep(300);
    }
    return out;
  }
  window.JACK22_E1 = { run, cases: cases.map(c => c[0]) };
})();
