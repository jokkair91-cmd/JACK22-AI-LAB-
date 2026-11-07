/* JACK22 — tests de la Mission 5 (Piano Roll), à charger dans la page du studio.
   Usage : JACK22_M5.run().then(r => console.table(r)). Le projet est remis comme avant à la fin.
   L'identité écoute / WAV est vérifiée sur la liste exacte des notes programmées dans le moteur (instant, hauteur, fin, vélocité). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms = 20000, step = 40) { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(step); } throw Error('délai dépassé (' + ms + ' ms)'); }
  const H = () => window.Jack22Vision8, T = () => window.JACK22_NOTE_TOOLS;
  // Play est refusé tant que les voix traitées se préparent (par exemple juste après un chargement) : on attend.
  const ready = () => until(() => !Jack22Lot3.pending && !persistBusy && (!window.l3Ready || window.l3Ready()), 120000, 100);
  const MEL = 2, P = () => song.tracks[MEL].patterns[song.tracks[MEL].active];
  const preset = () => Object.keys(PRESETS)[0];
  const note = (start, dur, midi, extra = {}) => ({ start, dur, preset: preset(), octave: Math.floor(midi / 12) - 1, idx: midi % 12, ...extra });
  // Pattern de test (2 mesures) : accord à 3 sons, notes décalées en avance et en retard, même hauteur superposée, note qui déborde la fin du pattern.
  const TEST_NOTES = () => [note(0, 4, 60, { velocity: 100 }), note(0, 4, 64, { velocity: 80 }), note(0, 4, 67, { velocity: 60 }),
    note(4, 2, 72, { velocity: 110, off: 0.3 }), note(8, 2, 74, { off: -0.25 }), note(12, 8, 60), note(14, 2, 60, { velocity: 50 }),
    note(30, 2, 79, { off: 0.2 }), note(16, 2, 62, { off: -0.49 })];
  function setPattern(notes) { const p = P(); p.bars = 2; p.steps = 32; p.notes = notes.map(n => ({ ...n })); setActive(MEL, song.tracks[MEL].active); if (rollTrack === MEL) rollLoad(p); }
  function soloMelody() { const m = song.tracks.map(t => t.mute); song.tracks.forEach((t, i) => t.mute = i !== MEL); return () => song.tracks.forEach((t, i) => t.mute = m[i]); }
  const fmt = l => l.map(x => x.t.toFixed(4) + '/' + x.p + '/' + x.d.toFixed(4) + '/' + x.v).join(' ');
  // Notes jouées en direct : on enveloppe engine.scheduleNote pendant 2 tours du pattern.
  async function liveNotes() {
    initAudio(); const out = [], sn = engine.scheduleNote;
    engine.scheduleNote = function (pr, oct, idx, t, end, opts) { if (opts && opts.trackKey === song.tracks[MEL].key) out.push({ t, p: (oct + 1) * 12 + idx, end, v: opts.velocity ?? 100 }); return sn.apply(this, arguments); };
    try { setMode('pattern'); $('rollWith').checked = true; await ready(); start(0); if (state !== 'playing') throw Error('lecture non démarrée'); const t0 = stepLog[0].time, len = stepSec(); await sleep((64 * len + 0.4) * 1000); stop(); return out.filter(x => x.t < t0 + 64 * len - 1e-6).map(x => ({ t: x.t - t0, p: x.p, d: x.end - x.t, v: x.v })).sort((a, b) => a.t - b.t || a.p - b.p); }
    finally { engine.scheduleNote = sn; stop(); }
  }
  // Notes de l'export WAV (mode PATTERN, 2 répétitions) : on enveloppe le moteur hors ligne.
  async function wavNotes() {
    const out = [], ce = createEngine, loops = $('expLoops').value; $('expLoops').value = '2';
    createEngine = function (ctx, ...rest) { const E = ce.call(this, ctx, ...rest); const sn = E.scheduleNote; E.scheduleNote = function (pr, oct, idx, t, end, opts) { if (opts && opts.trackKey === song.tracks[MEL].key) out.push({ t, p: (oct + 1) * 12 + idx, d: end - t, v: opts.velocity ?? 100 }); return sn.apply(this, arguments); }; return E; };
    try { await renderSong(exportData(), expOpts()); } finally { createEngine = ce; $('expLoops').value = loops; }
    return out.sort((a, b) => a.t - b.t || a.p - b.p);
  }
  function same(a, b, tol = 2e-4) {
    if (a.length !== b.length) return 'nombre de notes : direct ' + a.length + ', WAV ' + b.length;
    for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; if (x.p !== y.p || x.v !== y.v || Math.abs(x.t - y.t) > tol || Math.abs(x.d - y.d) > tol) return 'note ' + i + ' : direct ' + fmt([x]) + ' / WAV ' + fmt([y]); }
    return '';
  }
  // Outil « Éditer les notes » : on passe par son interface (menu, cible « Tout le pattern »).
  function menuApply(buttonText, setup) {
    const box = $('j94Tools'); box.open = true; box.dispatchEvent(new Event('toggle'));
    const scope = box.querySelector('select'); scope.value = 'all';
    if (setup) setup(box);
    const b = [...box.querySelectorAll('button')].find(x => x.textContent === buttonText); if (!b) throw Error('bouton « ' + buttonText + ' » absent');
    b.click(); const msg = box.querySelector('.j94Status').textContent; box.open = false; return msg;
  }
  const sel = (box, label, value) => { const s = [...box.querySelectorAll('select')].find(x => x.getAttribute('aria-label') === label); if (!s) throw Error('liste « ' + label + ' » absente'); s.value = value; };

  const cases = [
    ['Écoute = WAV : accord, décalages fins, vélocités, notes superposées, fin de boucle', async () => {
      setPattern(TEST_NOTES()); const restore = soloMelody();
      try {
        const live = await liveNotes(), wav = await wavNotes(), d = same(live, wav);
        if (d) throw Error(d);
        if (live.length !== 2 * TEST_NOTES().length) throw Error(live.length + ' notes en direct au lieu de ' + 2 * TEST_NOTES().length);
        const len = stepSec(), first = live.find(x => x.p === 72), early = live.find(x => x.p === 74), clamp = live.find(x => x.p === 62);
        if (Math.abs(first.t - 4.3 * len) > 2e-4) throw Error('note en retard placée à ' + (first.t / len).toFixed(3) + ' pas au lieu de 4,3');
        if (Math.abs(early.t - 7.75 * len) > 2e-4) throw Error('note en avance placée à ' + (early.t / len).toFixed(3) + ' pas au lieu de 7,75');
        if (Math.abs(clamp.t - 15.51 * len) > 2e-4) throw Error('décalage −0,49 : ' + (clamp.t / len).toFixed(3));
        return live.length + ' notes identiques en direct et dans le WAV (2 tours) : instants, durées, vélocités ; décalages +0,3 / −0,25 / −0,49 pas respectés';
      } finally { restore(); }
    }],
    ['Mode SONG : bloc coupé et décalages, écoute = WAV', async () => {
      setPattern(TEST_NOTES()); const restore = soloMelody(), arr = song.arrangement, bars = song.bars;
      try {
        const key = song.tracks[MEL].key, pid = P().id; song.arrangement = [{ id: song.nextId++, trackKey: key, patternId: pid, startBar: 1, lengthBars: 3 }]; tlBuild();
        // Écoute en mode SONG depuis le début, jusqu'à la fin du bloc.
        initAudio(); const out = [], sn = engine.scheduleNote; engine.scheduleNote = function (pr, oct, idx, t, end, opts) { if (opts && opts.trackKey === key) out.push({ t, p: (oct + 1) * 12 + idx, end, v: opts.velocity ?? 100 }); return sn.apply(this, arguments); };
        let live;
        try { setMode('song'); $('rollWith').checked = true; window.JACK22_C128?.setCursor(0); await ready(); start(0); if (state !== 'playing') throw Error('lecture non démarrée'); const t0 = stepLog[0].time, len = stepSec(); await sleep((64 * len + 0.5) * 1000); stop(); live = out.map(x => ({ t: x.t - t0, p: x.p, d: x.end - x.t, v: x.v })).sort((a, b) => a.t - b.t || a.p - b.p); }
        finally { engine.scheduleNote = sn; stop(); }
        const wav = await wavNotes(), d = same(live, wav); if (d) throw Error(d);
        const last = live.filter(x => x.p === 79).at(-1), endBlock = 4 * 16 * stepSec();
        if (last.t + last.d > endBlock + 2e-4) throw Error('note non coupée à la fin du bloc');
        return live.length + ' notes identiques (bloc de 3 mesures dès la mesure 2 : 1,5 tour du pattern, dernière note coupée à la fin du bloc)';
      } finally { song.arrangement = arr; song.bars = bars; tlBuild(); setMode('pattern'); restore(); }
    }],
    ['Humaniser : décalages et vélocités bornés, annulable', async () => {
      setPattern([0, 4, 8, 12, 16, 20, 24, 28].map(s => note(s, 2, 60 + s / 4))); rollTrack = MEL; rollLoad(P());
      const msg = menuApply('Humaniser', b => { sel(b, 'Humaniser : placement', '20'); sel(b, 'Humaniser : vélocité', '10'); });
      const ns = P().notes, lim = 0.02 / stepSec() + 1e-4;
      if (!ns.some(n => n.off)) throw Error('aucun décalage : ' + msg);
      if (ns.some(n => Math.abs(n.off || 0) > lim)) throw Error('décalage hors de ± 20 ms');
      if (ns.some(n => n.start + (n.off || 0) < 0)) throw Error('note avant le début du pattern');
      if (!ns.some(n => n.velocity !== undefined && n.velocity !== 100) || ns.some(n => n.velocity !== undefined && Math.abs(n.velocity - 100) > 10)) throw Error('vélocités : ' + ns.map(n => n.velocity).join(','));
      H().travel(true); await sleep(100);
      if (P().notes.some(n => n.off || n.velocity !== undefined)) throw Error('Annuler ne remet pas les notes');
      return 'décalages ≤ 20 ms (' + ns.map(n => Math.round((n.off || 0) * stepSec() * 1000)).join(', ') + ' ms), vélocités 90 à 110 ; Annuler remet tout';
    }],
    ['Rapprocher de la grille à 50 %, puis recaler à 100 %', async () => {
      setPattern([note(4, 2, 60, { off: 0.3 }), note(9, 2, 62, { off: -0.4 })]); rollTrack = MEL; rollLoad(P());
      menuApply('Rapprocher de la grille', b => { sel(b, 'Grille', '1'); sel(b, 'Force', '0.5'); });
      let [a, c] = P().notes; if (a.start !== 4 || Math.abs(a.off - 0.15) > 1e-4 || c.start !== 9 || Math.abs(c.off + 0.2) > 1e-4) throw Error('50 % : ' + JSON.stringify(P().notes.map(n => [n.start, n.off])));
      menuApply('Recaler sur la grille', b => sel(b, 'Grille', '1'));
      [a, c] = P().notes; if (a.off || c.off) throw Error('100 % : décalages restants');
      return '50 % : 4,30 → 4,15 et 8,60 → 8,80 pas ; « Recaler sur la grille » efface le décalage';
    }],
    ['Édition fine d’une note (début, décalage en ms, durée, vélocité)', async () => {
      setPattern([note(4, 2, 60)]); rollTrack = MEL; rollLoad(P()); rollSel = roll.notes[0]; rollDraw();
      const box = $('j94Tools'); box.open = true; box.dispatchEvent(new Event('toggle')); window.C129Fill();
      const inp = l => box.querySelector('input[aria-label="' + l + '"]');
      inp('Début (pas)').value = '6'; inp('Décalage (ms)').value = String(Math.round(0.2 * stepSec() * 1000 * 10) / 10); inp('Durée (pas)').value = '3'; inp('Vélocité').value = '90';
      [...box.querySelectorAll('button')].find(x => x.textContent === 'Appliquer à la note sélectionnée').click(); box.open = false;
      const n = P().notes[0]; if (n.start !== 6 || Math.abs(n.off - 0.2) > 0.002 || n.dur !== 3 || n.velocity !== 90) throw Error('note : ' + JSON.stringify(n));
      const el = $('rollGrid').querySelector('.rn'), want = 6.2 * ROLL_CW; if (Math.abs(parseFloat(el.style.left) - want) > 1) throw Error('dessinée à ' + el.style.left + ' au lieu de ' + want.toFixed(1) + 'px');
      return 'note réglée : pas 6 + ' + Math.round(n.off * stepSec() * 1000) + ' ms, 3 pas, vélocité 90 ; dessinée à sa vraie place';
    }],
    ['Sauvegarde, rechargement et export MIDI gardent le décalage', async () => {
      setPattern(TEST_NOTES()); const before = JSON.stringify(P().notes.map(n => [n.start, n.off || 0, n.velocity ?? 100]));
      ProjectPersistence.save(); await until(() => !persistBusy, 20000);
      const conf = window.confirm; window.confirm = () => true; try { ProjectPersistence.load(); } finally { window.confirm = conf; }
      await until(() => !persistBusy && !Jack22Lot3.pending, 30000); await sleep(300);
      const after = JSON.stringify(P().notes.map(n => [n.start, n.off || 0, n.velocity ?? 100])); if (after !== before) throw Error('après rechargement : ' + after);
      const m = J97Music.midi(P().notes, getBpm()); let i = 22 + 7, t = 0; const ons = [];
      while (i < m.length - 4) { let d = 0, b; do { b = m[i++]; d = (d << 7) | (b & 127); } while (b & 128); t += d; const st = m[i++], p = m[i++], v = m[i++]; if (st === 144) ons.push([t, p, v]); }
      const late = ons.find(x => x[1] === 72), early = ons.find(x => x[1] === 74);
      if (!late || late[0] !== Math.round(4.3 * 120) || !early || early[0] !== Math.round(7.75 * 120)) throw Error('MIDI : ' + JSON.stringify(ons.slice(0, 6)));
      return 'décalages et vélocités identiques après rechargement ; MIDI : note en retard au tick ' + late[0] + ', en avance au tick ' + early[0] + ' (120 ticks par pas)';
    }],
    ['Changer de pattern pendant la lecture : la suite vient du nouveau pattern', async () => {
      setPattern([note(0, 2, 60), note(8, 2, 60), note(16, 2, 60), note(24, 2, 60)]);
      // Second pattern : un nouveau si la piste a de la place (32 au plus), sinon un pattern existant (remis comme avant à la fin).
      const tr = song.tracks[MEL], firstIdx = tr.active, created = tr.patterns.length < 32; if (created) addPattern(MEL);
      const otherIdx = created ? tr.patterns.length - 1 : (firstIdx === 0 ? 1 : 0), np = tr.patterns[otherIdx], saved = { bars: np.bars, steps: np.steps, notes: np.notes };
      np.bars = 2; np.steps = 32; np.notes = [note(4, 2, 70), note(20, 2, 70)]; setActive(MEL, firstIdx); const restore = soloMelody();
      initAudio(); const out = [], sn = engine.scheduleNote; engine.scheduleNote = function (pr, oct, idx, t, end, opts) { if (opts && opts.trackKey === tr.key) out.push({ t, p: (oct + 1) * 12 + idx }); return sn.apply(this, arguments); };
      try {
        setMode('pattern'); $('rollWith').checked = true; await ready(); start(0); if (state !== 'playing') throw Error('lecture non démarrée'); const t0 = stepLog[0].time, len = stepSec(); await sleep((32 * len + 0.2) * 1000); setActive(MEL, otherIdx); await sleep((64 * len) * 1000); stop();
        // Le changement peut s'appliquer tout de suite ou au tour suivant (lancement calé) : à partir du tour suivant, seules les notes du nouveau pattern doivent sonner.
        const after = out.filter(x => x.t - t0 >= 64 * len - 1e-3);
        if (!after.length || after.some(x => x.p !== 70)) throw Error('après le changement : ' + (after.map(x => x.p).join(',') || 'aucune note'));
        return 'premier tour : pattern 1 (' + out.filter(x => x.p === 60).length + ' notes), puis ' + after.length + ' note(s) du nouveau pattern uniquement';
      } finally { engine.scheduleNote = sn; stop(); restore(); if (created) tr.patterns.pop(); else Object.assign(np, saved); setActive(MEL, Math.min(firstIdx, tr.patterns.length - 1)); }
    }],
  ];

  async function run(only) {
    $('stop').click(); await until(() => !persistBusy && !Jack22Lot3.pending, 60000);
    const prev = ProjectTransfer.snapshot(); prev.clips = prev.clips.map(c => ({ ...c, voice: c.voice ? JSON.parse(JSON.stringify(c.voice)) : null }));
    const rt = rollTrack, out = [];
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t); $('stop').click();
      }
    } finally { $('stop').click(); ProjectTransfer.rollback(prev); rollTrack = rt; await sleep(300); }
    return out;
  }
  window.JACK22_M5 = { run, cases: cases.map(c => c[0]) };
})();
