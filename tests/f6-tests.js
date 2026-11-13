/* JACK22 — tests de la 7.9 (audit « Mute, MIDI et démarrage audio »), à charger dans la page du studio.
   Usage : JACK22_F6.run().then(r => console.table(r)).
   Les mêmes cas tournent sur la 7.8 pour reproduire les défauts (ils doivent y échouer) puis sur la 7.9.
   Les cas « pendant la lecture » demandent une page visible (Edge au premier plan ou sans fenêtre) : dans une page cachée,
   le navigateur ralentit les minuteries et ces cas sont déclarés « non applicables ». */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE, P = () => window.JACK22_PRODUCTION;
  class Skip extends Error {}
  const live = () => { if (document.hidden) throw new Skip('page cachée : minuteries ralenties par le navigateur (cas lancé dans Edge)'); };
  const wav = (sec, hz, name, amp = 6000) => { const sr = 44100, n = Math.round(sec * sr), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * hz * i / sr) * amp), true); return new File([b], name, { type: 'audio/wav' }); };
  const rowOf = pred => [...document.querySelectorAll('#tlRows>.tl-row')].find(pred);
  const rowTi = ti => rowOf(r => r.querySelector('.tl-lane')?.dataset.ti === String(ti));
  const rowLane = id => rowOf(r => r.querySelector('.tl-lane')?.dataset.j99Lane === id);
  const rowTitle = re => rowOf(r => re.test(r.querySelector('.tl-label b')?.textContent || ''));
  const proxyOf = row => row && row.querySelector('.tl-label .dockRowMute');
  const pressed = el => !!el && el.getAttribute('aria-pressed') === 'true';
  const stopAll = async () => { try { if (typeof state !== 'undefined' && state !== 'stopped') $('stop').click(); } catch (e) {} await sleep(150); };
  const play = async () => { initAudio(); try { await audio.resume(); } catch (e) {} await stopAll(); start(0); await sleep(50); if (state !== 'playing') throw Error('la lecture ne démarre pas'); };
  const until = async (ok, ms = 3000, step = 30) => { const end = Date.now() + ms; while (!ok() && Date.now() < end) await sleep(step); return ok(); };
  // Espion du moteur : notes programmées (avec leur piste) et voix coupées.
  const spy = () => {
    initAudio(); const E = engine, sn = E.scheduleNote, kv = E.killVoice, sched = [], killed = [];
    E.scheduleNote = function (p, o, i, t0, t1, opts) { const v = sn.apply(this, arguments); sched.push({ key: opts && opts.trackKey, preset: p, t0, t1, at: audio.currentTime, v }); return v; };
    E.killVoice = function (v) { const s = sched.find(x => x.v === v); killed.push({ key: s ? s.key : '?', preset: s ? s.preset : '?', at: audio.currentTime, t0: s ? s.t0 : null }); return kv.apply(this, arguments); };
    return { sched, killed, undo() { E.scheduleNote = sn; E.killVoice = kv; } };
  };
  const NOTE = (start, dur, preset, midi) => ({ start, dur, preset, octave: Math.floor(midi / 12) - 1, idx: midi % 12, velocity: 100 });
  let saved = null, madeTracks = [], madeClips = [], savedTake;
  const setup = () => {
    if (!saved) saved = { bass: JSON.parse(JSON.stringify(activePat(1).notes)), mel: JSON.parse(JSON.stringify(activePat(2).notes)), mutes: song.tracks.map(t => t.mute), rollWith: $('rollWith').checked, recWith: $('recWith').checked, mode: (() => { try { return playMode; } catch (e) { return null; } })() };
    const b = activePat(1), m = activePat(2);
    b.notes = []; for (let s = 0; s < b.steps; s += 8) b.notes.push(NOTE(s, 6, 'sub808', 43));      // 808 : Sol 2, une note par demi-mesure
    m.notes = []; for (let s = 0; s < m.steps; s += 4) m.notes.push(NOTE(s, 2, 'lead', 84));         // Mélodie : Do 6, une note par temps
    song.tracks.forEach(t => { t.mute = false; }); $('rollWith').checked = true; $('recWith').checked = true;
    try { setMode('pattern'); } catch (e) {}
    try { rollLoad(activePat(rollTrack)); } catch (e) {} buildPatternUI(); tlBuild();
  };
  const clickRowM = row => { const p = proxyOf(row); if (!p) throw Error('bouton M absent'); if (p.disabled) throw Error('bouton M inactif (désactivé)'); p.click(); };

  const cases = [
    ['Mute Mélodie pendant la lecture : la basse et le transport continuent', async () => {
      live(); setup(); const s0 = spy();
      try {
        await play();
        if (!await until(() => s0.sched.some(x => x.key === 'bass') && s0.sched.some(x => x.key === 'melody'), 3000)) throw Error('basse ou mélodie jamais programmée');
        await sleep(300);
        const abs0 = absStep, tm = audio.currentTime;
        const heldBass = s0.sched.filter(x => x.key === 'bass' && x.t0 <= tm && x.t1 > tm + 0.05).map(x => x.v);
        clickRowM(rowTi(2)); await sleep(1300);
        const bassKilled = s0.killed.filter(k => k.key === 'bass' && k.at >= tm - 0.01).length, melAfter = s0.sched.filter(x => x.key === 'melody' && x.at > tm + 0.02).length;
        const bassAfter = s0.sched.filter(x => x.key === 'bass' && x.at > tm + 0.02).length, stillHeld = heldBass.filter(v => v.state === 'held' || v.state === 'releasing').length;
        if (bassKilled) throw Error('le Mute Mélodie coupe aussi la basse/808 : ' + bassKilled + ' voix de basse arrêtée(s)');
        if (melAfter) throw Error(melAfter + ' note(s) de mélodie programmée(s) après le Mute');
        if (!bassAfter) throw Error('la basse ne joue plus après le Mute Mélodie');
        if (state !== 'playing' || absStep < abs0 + 6) throw Error('le transport s’est arrêté ou est reparti (pas ' + abs0 + ' → ' + absStep + ')');
        return 'Mute Mélodie : 0 voix de basse arrêtée (' + stillHeld + '/' + heldBass.length + ' tenue(s) intacte(s)), ' + bassAfter + ' nouvelle(s) note(s) de basse, 0 de mélodie ; transport : pas ' + abs0 + ' → ' + absStep;
      } finally { s0.undo(); }
    }],
    ['Réactivation de la Mélodie : notes suivantes à leur place, rien de rejoué', async () => {
      live(); const s0 = spy();
      try {
        if (state !== 'playing') { setup(); song.tracks[2].mute = true; buildPatternUI(); await play(); await sleep(400); }
        const tu = audio.currentTime; clickRowM(rowTi(2)); await sleep(1500);
        const mel = s0.sched.filter(x => x.key === 'melody' && x.at >= tu - 0.005);
        if (mel.length < 2) throw Error('la mélodie ne repart pas (' + mel.length + ' note)');
        const past = mel.filter(x => x.t0 < tu - 0.002); if (past.length) throw Error(past.length + ' note(s) rejouée(s) avant la réactivation');
        const steps = activePat(2).steps, bad = mel.filter(x => { const e = stepLog.find(l => Math.abs(l.time - x.t0) < 0.003); return !e || (((e.abs % steps) + steps) % steps) % 4 !== 0; });
        if (bad.length) throw Error(bad.length + ' note(s) hors de leur pas');
        return mel.length + ' note(s) de mélodie après la réactivation, toutes à leur pas (tous les 4 pas), aucune avant';
      } finally { s0.undo(); await stopAll(); }
    }],
    ['Mute Basse/808 pendant la lecture : la mélodie continue', async () => {
      live(); setup(); const s0 = spy();
      try {
        await play(); if (!await until(() => s0.sched.some(x => x.key === 'melody'), 3000)) throw Error('mélodie jamais programmée');
        await sleep(300); const tm = audio.currentTime;
        clickRowM(rowTi(1)); await sleep(1300);
        const melKilled = s0.killed.filter(k => k.key === 'melody' && k.at >= tm - 0.01).length, melAfter = s0.sched.filter(x => x.key === 'melody' && x.at > tm + 0.02).length, bassAfter = s0.sched.filter(x => x.key === 'bass' && x.at > tm + 0.02).length;
        clickRowM(rowTi(1)); await sleep(100);
        if (melKilled) throw Error('le Mute Basse coupe aussi la mélodie : ' + melKilled + ' voix arrêtée(s)');
        if (!melAfter) throw Error('la mélodie ne joue plus');
        if (bassAfter) throw Error(bassAfter + ' note(s) de basse après le Mute');
        return 'Mute Basse : 0 voix de mélodie arrêtée, ' + melAfter + ' note(s) de mélodie ensuite, 0 de basse';
      } finally { s0.undo(); await stopAll(); }
    }],
    ['Instrument ajouté : bouton M actif, relié à sa piste, même état partout', async () => {
      await stopAll(); setup();
      const key = P().addTrack('Test Mute'); madeTracks.push(key); const ti = song.tracks.findIndex(t => t.key === key);
      activePat(ti).notes = []; for (let s = 0; s < activePat(ti).steps; s += 4) activePat(ti).notes.push(NOTE(s, 2, 'pad', 74));
      WS().choose('compose', 'arrange'); await sleep(300); tlBuild(); await sleep(200);
      const row = rowTi(ti); if (!row) throw Error('pas de ligne pour l’instrument dans l’arrangement');
      const m = proxyOf(row); if (!m) throw Error('bouton M absent'); if (m.disabled) throw Error('bouton M inactif : il ne trouve aucune commande (piste ' + ti + ')');
      m.click(); await sleep(60);
      const a = { tr: song.tracks[ti].mute, row: pressed(proxyOf(rowTi(ti))), pat: pressed(document.querySelector('.mute[data-track-key="' + key + '"]')) };
      P().open('mix'); await sleep(200);
      const card = [...document.querySelectorAll('#j97Body .j97Card')].find(c => c.querySelector('h3')?.textContent === 'Test Mute'), box = card && [...card.querySelectorAll('label')].find(l => /Muet/.test(l.textContent))?.querySelector('input');
      const mix = !!(box && box.checked); $('j97Dialog')?.close?.(); await sleep(100);
      proxyOf(rowTi(ti)).click(); await sleep(60);
      const b = { tr: song.tracks[ti].mute, row: pressed(proxyOf(rowTi(ti))) };
      if (!a.tr) throw Error('le clic ne coupe pas la piste');
      if (!a.row || !a.pat) throw Error('état affiché incohérent (arrangement ' + a.row + ', panneau Patterns ' + a.pat + ')');
      if (!mix) throw Error('le mixeur de la Production ne montre pas la piste coupée');
      if (b.tr || b.row) throw Error('le second clic ne réactive pas la piste');
      return '« Test Mute » (piste ' + (ti + 1) + ') : M actif ; coupé = arrangement, panneau Patterns et mixeur cochés ; second clic : réactivé';
    }],
    ['Prise synthé : un M à elle, séparé de la Mélodie', async () => {
      live(); await stopAll(); setup(); savedTake = savedTake === undefined ? (take ? JSON.parse(JSON.stringify(take)) : null) : savedTake;
      take = makeTake([0, 4, 8, 12, 16, 20, 24, 28].map(s => ({ start: s + 2, dur: 1, preset: 'pluck', octave: 5, idx: 8 })), 2, getBpm()); drawTake(); uiRec(); tlBuild(); await sleep(150);
      const row = rowOf(r => r.classList.contains('c150TakeRow')) || rowTitle(/PRISE SYNTH/);
      if (!row) throw Error('aucune commande Mute pour la prise synthé (seule la case « Mélodie avec le beat » existe)');
      const s0 = spy();
      try {
        await play(); if (!await until(() => s0.sched.some(x => x.preset === 'pluck') && s0.sched.some(x => x.key === 'melody'), 3000)) throw Error('prise ou mélodie jamais programmée');
        // 1) Mute Mélodie : la prise continue
        let tm = audio.currentTime; clickRowM(rowTi(2)); await sleep(900);
        const takeKilledByMel = s0.killed.filter(k => k.preset === 'pluck' && k.at >= tm - 0.01).length, takeAfterMel = s0.sched.filter(x => x.preset === 'pluck' && x.at > tm + 0.02).length;
        clickRowM(rowTi(2)); await sleep(200);
        // 2) M de la prise : la prise s'arrête, la mélodie continue
        tm = audio.currentTime; clickRowM(row); await sleep(900);
        const takeAfter = s0.sched.filter(x => x.preset === 'pluck' && x.at > tm + 0.02).length, melAfter = s0.sched.filter(x => x.key === 'melody' && x.at > tm + 0.02).length, melKilled = s0.killed.filter(k => k.key === 'melody' && k.at >= tm - 0.01).length;
        clickRowM(row); await sleep(100);
        if (takeKilledByMel) throw Error('le Mute Mélodie coupe aussi la prise synthé (' + takeKilledByMel + ' voix)');
        if (!takeAfterMel) throw Error('la prise ne joue plus pendant le Mute Mélodie');
        if (takeAfter) throw Error(takeAfter + ' note(s) de la prise jouée(s) malgré son M');
        if (!melAfter || melKilled) throw Error('le M de la prise touche la mélodie');
        return 'Mute Mélodie : la prise continue (' + takeAfterMel + ' notes) ; M de la prise : prise arrêtée, mélodie intacte (' + melAfter + ' notes)';
      } finally { s0.undo(); await stopAll(); }
    }],
    ['Voix et WAV importés : chacun son M', async () => {
      live(); await stopAll();
      const before = new Set(audioClips.map(c => c.id));
      if (!audioClips.some(c => c.voice)) { $('l3Demo').click(); await until(() => audioClips.some(c => c.voice && !before.has(c.id)), 8000); }
      await until(() => !window.Jack22Lot3?.pending, 20000, 100);
      const voice = audioClips.find(c => c.voice); if (!voice) throw Error('prise voix de démonstration absente');
      if (!before.has(voice.id)) madeClips.push(voice.id);
      const b2 = new Set(audioClips.map(c => c.id)); await audioImportFile(wav(4, 1500, 'f6-wav.wav')); await sleep(200);
      const w = audioClips.find(c => !b2.has(c.id)); if (!w) throw Error('import WAV impossible'); madeClips.push(w.id);
      try { window.JACK22_AUDIO_EDIT.place(w.id, 0, 'audio'); } catch (e) {}
      try { setMode('song'); } catch (e) {} WS().choose('compose', 'arrange'); await sleep(200); tlBuild(); await sleep(200);
      await play(); await until(() => audioPlaying.some(a => a.c === voice) && audioPlaying.some(a => a.c === w), 3000); await sleep(300);
      const g = c => { const a = audioPlaying.find(x => x.c === c); return a ? a.g.gain.value : null; };
      const g0 = { v: g(voice), w: g(w) };
      clickRowM(rowLane('audio')); await sleep(400); const g1 = { v: g(voice), w: g(w) };
      clickRowM(rowLane('audio')); await sleep(400); const g2 = { v: g(voice), w: g(w) };
      const vrow = rowTitle(new RegExp('^VOIX ' + voice.voice.slot)); clickRowM(vrow); await sleep(400); const g3 = { v: g(voice), w: g(w) };
      clickRowM(vrow); await sleep(300); await stopAll();
      const f = x => x === null ? '—' : x.toFixed(2);
      if (g0.v === null || g0.w === null) throw Error('la voix ou le WAV ne joue pas');
      if (!(g1.w < 0.02)) throw Error('M de la ligne AUDIO : le WAV continue (gain ' + f(g1.w) + ')');
      if (!(g1.v > 0.05)) throw Error('M de la ligne AUDIO : la voix est coupée aussi (gain ' + f(g1.v) + ')');
      if (!(g2.w > 0.05)) throw Error('réactivation AUDIO : le WAV reste muet');
      if (!(g3.v < 0.02) || !(g3.w > 0.05)) throw Error('M de VOIX ' + voice.voice.slot + ' : voix ' + f(g3.v) + ', WAV ' + f(g3.w));
      return 'gains pendant la lecture : départ voix ' + f(g0.v) + ' / WAV ' + f(g0.w) + ' ; M AUDIO → ' + f(g1.v) + ' / ' + f(g1.w) + ' ; réactivé → ' + f(g2.v) + ' / ' + f(g2.w) + ' ; M VOIX → ' + f(g3.v) + ' / ' + f(g3.w);
    }],
    ['MIDI : note relâchée pendant que « Production » est ouverte', async () => {
      await stopAll(); initAudio(); try { await audio.resume(); } catch (e) {}
      const R = P().receiveMIDI, note = (octave + 1) * 12 + 4, src0 = new Set(engine.alive);
      R({ data: [0x90, note, 100], target: { id: 'kbA' } }); await sleep(30);
      const v = engine.alive.find(x => !src0.has(x)); if (!v) throw Error('aucune voix démarrée');
      P().open('tracks'); await sleep(150);
      R({ data: [0x80, note, 0], target: { id: 'kbA' } }); await sleep(30);
      const st = v.state; $('j97Dialog')?.close?.(); await sleep(50);
      if (st === 'held') { try { engine.releaseVoice(v); } catch (e) {} throw Error('voix toujours tenue : 1 démarrée, 0 relâchée'); }
      return 'note jouée, « Production » ouverte, touche relâchée : voix ' + st + ' (1 démarrée, 1 relâchée)';
    }],
    ['MIDI : deux claviers tiennent le même Do sur le même canal', async () => {
      await stopAll(); initAudio(); const R = P().receiveMIDI, note = (octave + 1) * 12, a0 = new Set(engine.alive);
      R({ data: [0x90, note, 100], target: { id: 'kbA' } }); await sleep(20); const va = engine.alive.find(x => !a0.has(x));
      const a1 = new Set(engine.alive); R({ data: [0x90, note, 100], target: { id: 'kbB' } }); await sleep(20); const vb = engine.alive.find(x => !a1.has(x));
      R({ data: [0x80, note, 0], target: { id: 'kbA' } }); await sleep(30);
      const sa = va && va.state, sb = vb && vb.state;
      R({ data: [0x80, note, 0], target: { id: 'kbB' } }); await sleep(30);
      const sa2 = va && va.state, sb2 = vb && vb.state;
      for (const v of [va, vb]) if (v && v.state === 'held') try { engine.releaseVoice(v); } catch (e) {}
      if (!va || !vb) throw Error('deux voix attendues, ' + [va, vb].filter(Boolean).length + ' démarrée(s)');
      if (sa === 'held' || sb !== 'held') throw Error('relâcher le Do du clavier A : A ' + sa + ', B ' + sb + ' (B doit rester tenu)');
      if (sa2 === 'held' || sb2 === 'held') throw Error('après les deux relâchements : A ' + sa2 + ', B ' + sb2);
      return 'A relâché → A ' + sa + ', B ' + sb + ' ; puis B relâché → ' + sb2;
    }],
    ['MIDI : un clavier débranché libère ses notes', async () => {
      await stopAll(); initAudio(); const R = P().receiveMIDI, n0 = (octave + 1) * 12;
      if (typeof P().releaseInput !== 'function') throw Error('aucune libération des notes au débranchement');
      const a0 = new Set(engine.alive); R({ data: [0x90, n0, 100], target: { id: 'kbA' } }); R({ data: [0x90, n0 + 4, 100], target: { id: 'kbA' } }); R({ data: [0x90, n0 + 7, 100], target: { id: 'kbB' } }); await sleep(30);
      const vs = engine.alive.filter(x => !a0.has(x)), freed = P().releaseInput('kbA'); await sleep(30);
      const held = vs.filter(v => v.state === 'held').length;
      R({ data: [0x80, n0 + 7, 0], target: { id: 'kbB' } }); await sleep(30);
      if (vs.length !== 3) throw Error(vs.length + ' voix au lieu de 3');
      if (freed !== 2 || held !== 1) throw Error('débranchement de A : ' + freed + ' note(s) libérée(s), ' + held + ' encore tenue(s)');
      return 'clavier A débranché : 2 notes libérées ; la note du clavier B reste tenue, puis se relâche normalement';
    }],
    ['MIDI : la touche jouée s’allume et s’éteint', async () => {
      await stopAll(); initAudio(); WS().choose('compose', 'roll'); await sleep(300);
      const R = P().receiveMIDI, note = (octave + 1) * 12 + 2, k = $('piano').querySelector('.key[data-i="2"]'); if (!k) throw Error('touche introuvable');
      R({ data: [0x90, note, 100], target: { id: 'kbA' } }); await sleep(40); const on = k.classList.contains('c116Lit') || k.classList.contains('down'), col = k.style.getPropertyValue('--c116C');
      R({ data: [0x80, note, 0], target: { id: 'kbA' } }); await sleep(40); const off = !k.classList.contains('c116Lit') && !k.classList.contains('down') && !k.style.getPropertyValue('--c116C');
      WS().choose('compose', 'arrange'); await sleep(100);
      if (!on) throw Error('la touche ne s’allume pas pour une note MIDI');
      if (!off) throw Error('la touche reste allumée après le relâchement');
      return 'Ré joué en MIDI : touche allumée (' + col + '), éteinte au relâchement';
    }],
    ['Export MIDI : JACK22-pattern.mid de référence réexporté à l’identique', async () => {
      const ref = Uint8Array.from(atob(REF), c => c.charCodeAt(0)), notes = parseMid(ref);
      const out = window.J97Music.midi(notes.map(n => ({ start: n.on / 120, dur: (n.off - n.on) / 120, octave: Math.floor(n.p / 12) - 1, idx: n.p % 12, velocity: n.v })), 120);
      const same = out.length === ref.length && out.every((b, i) => b === ref[i]);
      if (notes.length !== 8) throw Error('référence : ' + notes.length + ' notes au lieu de 8');
      if (!same) throw Error('réexport différent : ' + out.length + ' octets au lieu de ' + ref.length);
      return 'référence : 8 notes, 120 BPM, 480 ticks par noire ; réexport : ' + out.length + ' octets identiques';
    }],
    ['Export MIDI : deux notes de même hauteur qui se chevauchent', async () => {
      const notes = [{ start: 0, dur: 8, octave: 4, idx: 0, velocity: 100 }, { start: 4, dur: 8, octave: 4, idx: 0, velocity: 90 }];
      const ev = events(window.J97Music.midi(notes, 120));
      let open = 0, maxOpen = 0; for (const e of ev) { open += e.on ? 1 : -1; maxOpen = Math.max(maxOpen, open); }
      const fifo = reimport(ev, 'fifo'), all = reimport(ev, 'all'), second = r => r.find(n => n.on === 480);
      const d = r => second(r) ? (second(r).off - second(r).on) / 120 : 0;
      if (maxOpen > 1) throw Error('deux « Note On » du même Do avant le premier « Note Off » ; à la réimportation (règle « un Note Off coupe la touche ») la 2e note dure ' + d(all) + ' pas au lieu de 8');
      if (d(fifo) !== 8 || d(all) !== 8) throw Error('2e note réimportée : ' + d(fifo) + ' / ' + d(all) + ' pas');
      return 'règle d’export : la 1re note s’arrête quand la 2e commence (4 pas) ; la 2e garde ses 8 pas avec les deux règles de réimportation testées';
    }],
    ['Grand Piano Roll : la grille récupère la place, libellé tout de suite', async () => {
      await stopAll(); WS().choose('compose', 'roll'); await sleep(400);
      const b = $('c119Big'), wrap = $('rollWrap'), stage = $('dockStage'); if (!b || !wrap) throw Error('éléments absents');
      if (document.body.classList.contains('c118Big')) { window.JACK22_ECRAN.setBig(false); await sleep(300); }
      const h0 = wrap.getBoundingClientRect().height;
      b.click(); await sleep(20); const lab = b.textContent.trim(); await sleep(400);
      const h1 = wrap.getBoundingClientRect().height, gap = stage.getBoundingClientRect().bottom - $('roll').getBoundingClientRect().bottom;
      b.click(); await sleep(20); const lab2 = b.textContent.trim(); await sleep(300); const h2 = wrap.getBoundingClientRect().height;
      if (!/Afficher le clavier/.test(lab) || !/Grand Piano Roll/.test(lab2)) throw Error('libellé pas à jour tout de suite : « ' + lab + ' » puis « ' + lab2 + ' »');
      if (!(h1 > h0 + 20)) throw Error('grille non agrandie (' + Math.round(h0) + ' → ' + Math.round(h1) + ' px, ' + innerWidth + ' px de large)');
      if (gap > 40) throw Error('place libre laissée sous la grille : ' + Math.round(gap) + ' px');
      if (Math.abs(h2 - h0) > 2) throw Error('hauteur pas revenue (' + Math.round(h0) + ' → ' + Math.round(h2) + ')');
      return innerWidth + ' px : grille ' + Math.round(h0) + ' → ' + Math.round(h1) + ' px clavier replié, revenue à ' + Math.round(h2) + ' ; libellé immédiat';
    }],
    ['Touches : jamais la même couleur deux fois de suite', async () => {
      WS().choose('compose', 'roll'); await sleep(300);
      const k = [...$('piano').querySelectorAll('.key.white')].find(x => x.offsetWidth); if (!k) throw Error('touche absente');
      const hues = [];
      for (let i = 0; i < 40; i++) { k.classList.add('down'); await sleep(5); const c = k.style.getPropertyValue('--c116C'); hues.push(Number((c.match(/hsl\((\d+)/) || [])[1])); k.classList.remove('down'); await sleep(5); }
      const close = hues.slice(1).filter((h, i) => { const d = Math.abs(h - hues[i]); return Math.min(d, 360 - d) < 60; }).length;
      // Lecture (allumage programmé) puis retour à l'état normal
      window.JACK22_PIANO.light((octave + 1) * 12 + Number(k.dataset.i), true, '#123456'); await sleep(20); const litCol = k.style.getPropertyValue('--c116C');
      window.JACK22_PIANO.light((octave + 1) * 12 + Number(k.dataset.i), false); await sleep(20); const back = !k.classList.contains('c116Lit') && !k.style.getPropertyValue('--c116C');
      WS().choose('compose', 'arrange');
      if (hues.some(h => !Number.isFinite(h))) throw Error('couleur absente');
      if (close) throw Error(close + ' fois sur 39 la même teinte (à moins de 60°) que la frappe précédente');
      if (!litCol || litCol === '#123456' || !back) throw Error('lecture : couleur ' + litCol + ', retour normal ' + back);
      return '40 frappes : jamais deux couleurs proches à la suite ; note jouée par la lecture : couleur au hasard, puis retour au vert';
    }],
    ['Harmoniques du 808 dans « Synthé ▾ » ; un seul bouton rond', async () => {
      WS().choose('compose', 'roll'); await sleep(400);
      const det = $('c150SynthOpts'), sl = $('c150Harm'), h = $('harmAmt'); if (!det || !sl) throw Error('réglage des harmoniques introuvable dans les paramètres du synthé');
      const v0 = h.value; det.open = true; await sleep(80);
      { const r = det.querySelector('.c150SynthBody').getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + 20, hit = document.elementFromPoint(x, y);
        if (!(r.width > 100 && r.height > 60 && r.top >= 0 && r.bottom <= innerHeight && hit && det.contains(hit))) { det.open = false; throw Error('le menu « Synthé ▾ » s’ouvre mais reste invisible (caché par le panneau du clavier)'); } }
      sl.value = '73'; sl.dispatchEvent(new Event('input', { bubbles: true })); await sleep(50);
      const a = h.value, sAfter = currentSettings().harm;
      $('c150HarmDef').click(); await sleep(50); const b = h.value;
      h.value = v0; h.dispatchEvent(new Event('input', { bubbles: true })); det.open = false;
      document.querySelector('[data-dock-preset="sub808"]')?.click(); await sleep(100);
      const dials = [...$('synth').querySelectorAll('.skinDial')].filter(d => d.offsetWidth).length;
      document.querySelector('[data-dock-preset="lead"]')?.click(); WS().choose('compose', 'arrange');
      if (a !== '73' || Number(sAfter) !== 73) throw Error('le curseur ne règle pas les harmoniques (' + a + ', projet ' + sAfter + ')');
      if (b !== '50') throw Error('valeur par défaut : ' + b);
      if (dials !== 1) throw Error(dials + ' boutons ronds sur le clavier');
      return 'curseur 73 % → réglage du projet 73 % ; « Valeur par défaut » → 50 % ; son 808 : 1 seul bouton rond sur le clavier';
    }],
  ];
  // Fichier de référence (Téléchargements\JACK22-pattern.mid, 100 octets), embarqué pour tourner aussi en file://
  const REF = 'TVRoZAAAAAYAAAABAeBNVHJrAAAATgD/UQMHoSAAkD5kAJBBZIFwgD4AAIBBAHiQPmQAkEJkeJBAZHiAPgAAgEIAeIBAAHiQQWR4kD9keIBBAHiAPwCCaJBAZIFwgEAAAP8vAA==';
  function events(bytes) {
    let i = 22; const out = []; let t = 0;
    const vlq = () => { let v = 0, b; do { b = bytes[i++]; v = (v << 7) | (b & 127); } while (b & 128); return v; };
    while (i < bytes.length) { t += vlq(); const s = bytes[i++]; if (s === 0xff) { const type = bytes[i++], len = vlq(); i += len; if (type === 0x2f) break; continue; } const p = bytes[i++], v = bytes[i++]; if ((s & 0xf0) === 0x90 && v > 0) out.push({ t, on: true, p, v }); else if ((s & 0xf0) === 0x80 || (s & 0xf0) === 0x90) out.push({ t, on: false, p, v }); }
    return out;
  }
  function parseMid(bytes) { return reimport(events(bytes), 'fifo').map(n => ({ on: n.on, off: n.off, p: n.p, v: n.v })); }
  // Réimportation : « fifo » = un Note Off termine la plus ancienne note ouverte de cette hauteur (séquenceurs courants) ;
  // « all » = un Note Off termine toutes les notes ouvertes de cette hauteur (synthés, une voix par touche).
  function reimport(ev, rule) { const open = [], notes = []; for (const e of ev) { if (e.on) { const n = { on: e.t, off: null, p: e.p, v: e.v }; open.push(n); notes.push(n); } else { const same = open.filter(n => n.p === e.p); const done = rule === 'all' ? same : same.slice(0, 1); for (const n of done) { n.off = e.t; open.splice(open.indexOf(n), 1); } } } return notes; }

  async function run(only) {
    const out = [];
    try { for (const [name, fn] of cases) { if (only && !only.test(name)) continue; const t = performance.now(); try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: e instanceof Skip ? null : false, detail: e.message }); } out.at(-1).ms = Math.round(performance.now() - t); } }
    finally {
      await stopAll();
      try { if (saved) { activePat(1).notes = saved.bass; activePat(2).notes = saved.mel; song.tracks.forEach((t, i) => { if (i < saved.mutes.length) t.mute = saved.mutes[i]; }); $('rollWith').checked = saved.rollWith; $('recWith').checked = saved.recWith; if (saved.mode) setMode(saved.mode); } } catch (e) {}
      try { if (savedTake !== undefined) { take = savedTake; drawTake(); uiRec(); } } catch (e) {}
      for (const k of madeTracks) try { P().removeTrack(k); } catch (e) {}
      for (const id of madeClips) { const i = audioClips.findIndex(c => c.id === id); if (i >= 0) { try { audioKill(audioClips[i]); } catch (e) {} audioClips.splice(i, 1); } }
      try { window.JACK22_AUDIO_EDIT.setTrack && window.JACK22_AUDIO_EDIT.setTrack('audio', { mute: false }); } catch (e) {}
      saved = null; savedTake = undefined; madeTracks = []; madeClips = [];
      try { buildPatternUI(); tlBuild(); rollLoad(activePat(rollTrack)); } catch (e) {} WS()?.choose('compose', 'arrange'); await sleep(200);
    }
    return out;
  }
  window.JACK22_F6 = { run, cases: cases.map(c => c[0]) };
})();
