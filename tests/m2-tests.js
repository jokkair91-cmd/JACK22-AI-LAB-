/* JACK22 — tests de la Mission 2 (historique cohérent), à charger dans la page du studio.
   Usage : JACK22_M2.run().then(r => console.table(r))
   Chaque cas part de l'état courant, puis le projet est remis comme avant (ProjectTransfer.rollback). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms = 20000, step = 30) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(step); }
    throw Error('délai dépassé (' + ms + ' ms)');
  }
  const V8 = () => window.Jack22Vision8;
  // Versions sans compteur exposé (base Mission 1) : lecture du texte « N annulation(s) · M rétablissement(s) ».
  const hist = () => V8().history || (m => ({ undo: +m[1], redo: +m[2], queued: 0 }))($('v8History').textContent.match(/(\d+)\D+(\d+)/));
  const status = () => $('v8Status').textContent;
  const undoBtn = () => $('v8Undo'), redoBtn = () => $('v8Redo');
  async function idle() {
    $('stop').click();
    await until(() => !Jack22Lot3.pending && !persistBusy && !hist().queued, 180000, 100);
    await sleep(250); V8().remember();
  }
  const cell = (row, step) => document.querySelector('[aria-label="' + row + ' pas ' + step + '"]');
  const on = (ti, row, step) => !!activePat(ti).grid[row][step - 1];
  const key = (k, o = {}) => { const e = new KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true, cancelable: true, ...o }); (o.target || document.body).dispatchEvent(e); return e; };
  const ptr = (el, type, x = 5, y = 5) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 31, clientX: r.left + x, clientY: r.top + y })); };

  const cases = [
    ['Deux clics rapides = deux étapes ; Annuler, Rétablir', async () => {
      await idle();
      const a = cell('KICK', 2), b = cell('KICK', 4); if (!a || !b) throw Error('cases de batterie introuvables');
      const a0 = on(0, 0, 2), b0 = on(0, 0, 4), u0 = hist().undo;
      a.click(); b.click();
      if (hist().undo !== Math.min(24, u0 + 2)) throw Error('étapes : ' + (hist().undo - u0) + ' au lieu de 2');
      undoBtn().click(); if (on(0, 0, 2) === a0 || on(0, 0, 4) !== b0) throw Error('1er Annuler : mauvaise étape');
      undoBtn().click(); if (on(0, 0, 2) !== a0) throw Error('2e Annuler sans effet');
      redoBtn().click(); redoBtn().click(); if (on(0, 0, 2) === a0 || on(0, 0, 4) === b0) throw Error('Rétablir incomplet');
      return 'deux étapes, annulées une par une puis rétablies';
    }],
    ['Annuler, nouvelle action, puis Annuler encore (photo partagée)', async () => {
      await idle();
      const s = [11, 12, 13], a0 = s.map(x => on(0, 0, x));
      cell('KICK', 11).click(); cell('KICK', 12).click(); undoBtn().click();
      if (on(0, 0, 11) === a0[0] || on(0, 0, 12) !== a0[1]) throw Error('1er Annuler');
      cell('KICK', 13).click(); if (on(0, 0, 13) === a0[2]) throw Error('clic après Annuler sans effet sur le morceau');
      undoBtn().click(); if (on(0, 0, 13) !== a0[2] || on(0, 0, 11) === a0[0]) throw Error('2e Annuler : état faux (pas 11 ' + on(0, 0, 11) + ', pas 13 ' + on(0, 0, 13) + ')');
      undoBtn().click(); if (on(0, 0, 11) !== a0[0]) throw Error('3e Annuler : pas 11 non remis');
      return 'chaque Annuler remet exactement l’état d’avant';
    }],
    ['Fader tenu = une seule étape (pauses de 250 ms comprises)', async () => {
      await idle();
      const m = $('master'), v0 = m.value, u0 = hist().undo;
      ptr(m, 'pointerdown');
      for (const v of [20, 35, 50, 65]) { m.value = String(v); m.dispatchEvent(new Event('input', { bubbles: true })); await sleep(250); }
      if (hist().undo !== u0) throw Error('étape enregistrée pendant le geste');
      ptr(m, 'pointerup'); m.dispatchEvent(new Event('change', { bubbles: true }));
      if (hist().undo !== Math.min(24, u0 + 1)) throw Error('étapes : ' + (hist().undo - u0) + ' au lieu de 1');
      undoBtn().click(); if (m.value !== v0) throw Error('Annuler : volume ' + m.value + ' au lieu de ' + v0);
      return 'glisser du volume master avec pauses = 1 étape, Annuler remet ' + v0;
    }],
    ['Annuler aussitôt après une note du Piano Roll', async () => {
      await idle();
      window.JACK22_WORKSPACE?.choose('compose', 'roll'); await sleep(300);
      const g = $('rollGrid'), n0 = roll.notes.length;
      ptr(g, 'pointerdown', 50, 100); ptr(g, 'pointerup', 50, 100);
      if (roll.notes.length !== n0 + 1) throw Error('note non ajoutée');
      undoBtn().click();
      if (roll.notes.length !== n0) throw Error('note encore là après Annuler immédiat');
      return 'note posée puis retirée par Annuler sans attendre';
    }],
    ['Clavier : Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z ; champs texte intacts', async () => {
      await idle();
      const a0 = on(0, 0, 6), h0 = JSON.stringify(hist()); cell('KICK', 6).click(); const h1 = JSON.stringify(hist()), a1 = on(0, 0, 6);
      const ez = key('z');
      if (!ez.defaultPrevented || on(0, 0, 6) !== a0) throw Error('Ctrl+Z (empêché ' + ez.defaultPrevented + ', case ' + a0 + '→' + a1 + '→' + on(0, 0, 6) + ', historique ' + h0 + ' ' + h1 + ' ' + JSON.stringify(hist()) + ', « ' + status() + ' »)');
      if (!key('y').defaultPrevented || on(0, 0, 6) === a0) throw Error('Ctrl+Y');
      key('z'); if (!key('Z', { shiftKey: true }).defaultPrevented || on(0, 0, 6) === a0) throw Error('Ctrl+Maj+Z');
      key('z');
      const ta = $('v8Curve'), e = key('z', { target: ta });
      if (e.defaultPrevented) throw Error('Ctrl+Z intercepté dans un champ texte');
      return 'raccourcis OK ; Ctrl+Z laissé au champ texte';
    }],
    ['Tempo, piste ajoutée, piste supprimée', async () => {
      await idle();
      const P = window.JACK22_PRODUCTION, bpm0 = $('bpm').value, t0 = song.tracks.length;
      $('bpm').value = String(Number(bpm0) === 101 ? 102 : 101); $('bpm').dispatchEvent(new Event('change', { bubbles: true }));
      P.addTrack('Piste M2'); if (song.tracks.length !== t0 + 1) throw Error('piste non ajoutée');
      const k = song.tracks.at(-1).key; P.removeTrack(k); if (song.tracks.length !== t0) throw Error('piste non supprimée');
      undoBtn().click(); if (song.tracks.length !== t0 + 1 || song.tracks.at(-1).key !== k) throw Error('suppression non annulée');
      undoBtn().click(); if (song.tracks.length !== t0) throw Error('ajout non annulé');
      undoBtn().click(); if ($('bpm').value !== bpm0) throw Error('tempo non annulé : ' + $('bpm').value);
      return 'tempo, ajout et suppression de piste annulés dans l’ordre';
    }],
    ['Lecture en cours : refus expliqué, rien ne change', async () => {
      await idle();
      cell('KICK', 8).click(); const u0 = hist().undo, a = on(0, 0, 8);
      $('play').click(); await until(() => state === 'playing', 10000);
      undoBtn().click(); const msg = status();
      $('stop').click(); await sleep(150);
      if (on(0, 0, 8) !== a || hist().undo !== u0) throw Error('annulé pendant la lecture');
      if (!/Arrête la lecture/.test(msg)) throw Error('pas de message : « ' + msg + ' »');
      undoBtn().click(); if (on(0, 0, 8) === a) throw Error('Annuler après Stop sans effet');
      return 'message « ' + msg.slice(0, 60) + '… », puis Annuler après Stop';
    }],
    ['Voix présente : Coller des notes puis 2× Annuler (défaut du test 33)', async () => {
      await idle();
      if (!audioClips.some(c => c.voice)) { $('l3Demo').click(); await until(() => audioClips.some(c => c.voice), 20000); }
      await idle();
      // Voix traitée (panoramique), comme après le test 15 de la suite : son traité à préparer.
      const v = audioClips.find(c => c.voice), s = Jack22Lot3.settings(v);
      if (s.pan === 0) { s.pan = 0.25; v.voice.processing = s; Jack22Lot3.schedule(); await sleep(200); }
      await idle(); if (!Jack22Lot3.prepared(audioClips.find(c => c.voice))) throw Error('voix traitée non préparée');
      const K = window.JACK22_COLLER; if (!K) throw Error('Coller des notes absent');
      K.open(); await sleep(100);
      const dlg = $('c124Dlg'), ta = dlg.querySelector('textarea'), sel = dlg.querySelector('select'), go = [...dlg.querySelectorAll('button')].find(b => b.textContent === 'Coller dans JACK22');
      const n2 = song.tracks[2].patterns.length, n0 = song.tracks[0].patterns.length;
      sel.value = '2'; sel.dispatchEvent(new Event('change')); ta.value = '[{"midi":60,"time":0,"duration":1},{"midi":64,"time":1,"duration":1}]'; ta.dispatchEvent(new Event('input')); go.click(); await sleep(300);
      K.open(); await sleep(100); sel.value = '0'; sel.dispatchEvent(new Event('change')); ta.value = '[{"midi":36,"time":0},{"midi":38,"time":1}]'; ta.dispatchEvent(new Event('input')); go.click(); await sleep(300); dlg.close();
      if (song.tracks[2].patterns.length !== n2 + 1) throw Error('mélodie non collée');
      let rebuilt = false; const watch = setInterval(() => { if (Jack22Lot3.pending) rebuilt = true; }, 10);
      undoBtn().click(); await sleep(150); undoBtn().click(); await sleep(400); clearInterval(watch);
      await until(() => !hist().queued && !Jack22Lot3.pending, 180000, 100);
      if (song.tracks[2].patterns.length !== n2 || song.tracks[0].patterns.length > n0) throw Error('Annuler ne retire pas les patterns collés' + (rebuilt ? ' (voix recalculée après Annuler)' : ''));
      if (rebuilt) throw Error('voix recalculée après l’annulation d’un collage de notes');
      return 'deux collages annulés à 150 ms d’écart ; voix non recalculée, son traité réutilisé';
    }],
    ['Annuler pendant la préparation des voix : mis en attente, dans l’ordre', async () => {
      await idle();
      const c = audioClips.find(x => x.voice); if (!c) throw Error('pas de voix');
      const a0 = on(0, 0, 10); cell('KICK', 10).click();
      const s = Jack22Lot3.settings(c), pan0 = s.pan; s.pan = pan0 === 0.37 ? 0.21 : 0.37;
      V8().remember(); c.voice.processing = s; Jack22Lot3.schedule(); V8().remember();
      await until(() => Jack22Lot3.pending, 5000, 5);
      undoBtn().click(); undoBtn().click();
      const q = hist().queued, msg = status();
      if (q !== 2) throw Error('actions en attente : ' + q + ' (message : ' + msg + ')');
      await until(() => !hist().queued && !Jack22Lot3.pending, 180000, 100);
      const c2 = audioClips.find(x => x.voice && x.voice.slot === c.voice.slot);
      if (Jack22Lot3.settings(c2).pan !== pan0) throw Error('réglage voix non annulé');
      if (on(0, 0, 10) !== a0) throw Error('2e Annuler perdu');
      return '2 Annuler mis en attente pendant le calcul, appliqués ensuite dans l’ordre';
    }],
    ['Plafond de 24 états ; une nouvelle action efface les Rétablir', async () => {
      await idle();
      for (let i = 0; i < 30; i++) cell('HI-HAT', 1 + (i % 16)).click();
      if (hist().undo !== 24) throw Error('états : ' + hist().undo);
      undoBtn().click(); undoBtn().click(); if (hist().redo !== 2) throw Error('rétablissements : ' + hist().redo);
      cell('SNARE', 2).click(); if (hist().redo !== 0) throw Error('Rétablir non effacé');
      return '24 états gardés sur 30 actions ; nouvelle action après Annuler = Rétablir vidé';
    }],
  ];

  async function run(only) {
    const prev = ProjectTransfer.snapshot(); prev.clips = prev.clips.map(c => ({ ...c, voice: c.voice ? JSON.parse(JSON.stringify(c.voice)) : null }));
    const out = [];
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t);
      }
    } finally { $('stop').click(); await until(() => !hist().queued && !Jack22Lot3.pending, 180000, 100).catch(() => {}); ProjectTransfer.rollback(prev); await sleep(300); }
    return out;
  }
  window.JACK22_M2 = { run, cases: cases.map(c => c[0]) };
})();
