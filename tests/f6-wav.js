/* JACK22 — 7.9 : vrais rendus WAV pour vérifier les Mute (modes Pattern et Morceau), à charger dans la page du studio.
   Usage : JACK22_F6WAV.run().then(r => console.table(r)).
   Chaque source a sa propre « signature » dans le fichier : une hauteur à elle (mesurée par l'algorithme de Goertzel) ;
   la batterie, ses aigus (charleston, 12 à 16 kHz). Une source coupée doit disparaître du WAV (≤ 10 % de son énergie
   de référence) et les autres rester audibles (≥ 30 %). Les coupures passent par les vrais boutons M de l'arrangement. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE, P = () => window.JACK22_PRODUCTION;
  const wav = (sec, hz, name, amp = 6000) => { const sr = 44100, n = Math.round(sec * sr), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * hz * i / sr) * amp), true); return new File([b], name, { type: 'audio/wav' }); };
  const until = async (ok, ms = 3000, step = 50) => { const end = Date.now() + ms; while (!ok() && Date.now() < end) await sleep(step); return ok(); };
  const exportWav = async () => {
    let blob = null; const click0 = HTMLAnchorElement.prototype.click, url0 = URL.createObjectURL, map = new Map();
    URL.createObjectURL = function (o) { const u = url0.call(URL, o); map.set(u, o); return u; };
    HTMLAnchorElement.prototype.click = function () { if (this.download && map.has(this.href)) { blob = map.get(this.href); return; } return click0.call(this); };
    const pane = n => [...document.querySelectorAll('[data-dock-pane]')].find(b => b.dataset.dockPane === n);
    try { try { $('stop').click(); } catch (e) {} pane('dockExport')?.click(); await sleep(150); const b = $('expBtn'), end = Date.now() + 240000; while (b.disabled && Date.now() < end) await sleep(100); b.click(); while (!blob && Date.now() < end) await sleep(100); while (b.disabled && Date.now() < end) await sleep(100); }
    finally { HTMLAnchorElement.prototype.click = click0; URL.createObjectURL = url0; pane('studio')?.click(); await sleep(100); WS().choose('compose', 'arrange'); await sleep(200); }
    if (!blob) throw Error('aucun WAV exporté');
    const ab = await blob.arrayBuffer(), d = new DataView(ab), n = (ab.byteLength - 44) >> 2, x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = (d.getInt16(44 + i * 4, true) + d.getInt16(46 + i * 4, true)) / 65536;
    return x;
  };
  const goertzel = (x, f, sr = 44100) => { const w = 2 * Math.PI * f / sr, c = 2 * Math.cos(w); let s1 = 0, s2 = 0; for (let i = 0; i < x.length; i++) { const s = x[i] + c * s1 - s2; s2 = s1; s1 = s; } return (s1 * s1 + s2 * s2 - c * s1 * s2) / x.length; };
  const band = (x, lo, hi, step) => { let p = 0; for (let f = lo; f <= hi; f += step) p += goertzel(x, f); return p; };
  // Signatures : hauteurs choisies pour ne pas tomber sur les harmoniques des autres sources.
  const SIG = {
    drums: x => band(x, 12000, 16000, 250),
    bass: x => band(x, 94, 102, 1),        // 808 Sol 2 (98 Hz)
    melody: x => band(x, 1042, 1051, 1),   // Lead Do 6 (1046,5 Hz)
    inst: x => band(x, 694, 703, 1),       // Pad Fa 5 (698,5 Hz)
    take: x => band(x, 826, 835, 1),       // Pluck Sol♯ 5 (830,6 Hz) : prise synthé
    voice: x => band(x, 214, 231, 1),      // démo voix : 225 Hz (ou 220 Hz recalé par J-Tune)
    wav: x => band(x, 1496, 1504, 1),      // WAV importé : 1500 Hz
  };
  const SRC = Object.keys(SIG);
  const measure = x => Object.fromEntries(SRC.map(k => [k, SIG[k](x)]));
  const NOTE = (start, dur, preset, midi) => ({ start, dur, preset, octave: Math.floor(midi / 12) - 1, idx: midi % 12, velocity: 100 });
  const rowOf = pred => [...document.querySelectorAll('#tlRows>.tl-row')].find(pred);
  const proxyOf = row => row && row.querySelector('.tl-label .dockRowMute');
  let ctx = null;
  const control = k => {
    const r = k === 'drums' ? rowOf(r => r.querySelector('.tl-lane')?.dataset.ti === '0') : k === 'bass' ? rowOf(r => r.querySelector('.tl-lane')?.dataset.ti === '1') : k === 'melody' ? rowOf(r => r.querySelector('.tl-lane')?.dataset.ti === '2')
      : k === 'inst' ? rowOf(r => r.querySelector('.tl-lane')?.dataset.ti === String(ctx.instTi)) : k === 'take' ? rowOf(r => r.classList.contains('c150TakeRow') || /PRISE SYNTH/.test(r.querySelector('b')?.textContent || ''))
      : k === 'voice' ? rowOf(r => new RegExp('^VOIX ' + ctx.voiceSlot).test(r.querySelector('b')?.textContent || '')) : rowOf(r => r.querySelector('.tl-lane')?.dataset.j99Lane === 'audio');
    return proxyOf(r);
  };
  const toggle = async k => { WS().choose('compose', 'arrange'); await sleep(150); tlBuild(); await sleep(150); const m = control(k); if (!m) throw Error('aucune commande M pour « ' + k + ' »'); if (m.disabled) throw Error('commande M inactive pour « ' + k + ' »'); m.click(); await sleep(150); };

  async function setup() {
    initAudio(); try { await audio.resume(); } catch (e) {}
    ctx = { arr: JSON.parse(JSON.stringify(song.arrangement)), nextId: song.nextId, notes: [1, 2].map(i => JSON.parse(JSON.stringify(activePat(i).notes || []))), grid: activePat(0).grid.map(r => r.slice()), mutes: song.tracks.map(t => t.mute), take: take ? JSON.parse(JSON.stringify(take)) : null, loops: $('expLoops').value, mel: $('expMel').checked, roll: $('expRoll').checked, rollWith: $('rollWith').checked, mode: (() => { try { return playMode; } catch (e) { return null; } })(), clips: [], tracks: [] };
    const g = activePat(0).grid; g.forEach(r => r.fill(false)); for (let s = 0; s < 16; s += 2) g[2][s] = true;                 // charleston sur les croches
    const b = activePat(1), m = activePat(2);
    b.notes = []; for (let s = 0; s < b.steps; s += 8) b.notes.push(NOTE(s, 6, 'sub808', 43));
    m.notes = []; for (let s = 0; s < m.steps; s += 4) m.notes.push(NOTE(s, 3, 'lead', 84));
    const key = P().addTrack('Test WAV'); ctx.tracks.push(key); ctx.instTi = song.tracks.findIndex(t => t.key === key);
    const ip = activePat(ctx.instTi); ip.notes = []; for (let s = 0; s < ip.steps; s += 4) ip.notes.push(NOTE(s + 1, 3, 'pad', 77));
    take = makeTake([0, 4, 8, 12, 16, 20, 24, 28].map(s => ({ start: s + 2, dur: 2, preset: 'pluck', octave: 5, idx: 8 })), 2, getBpm()); drawTake(); uiRec();
    song.tracks.forEach(t => { t.mute = false; });
    $('expLoops').value = '1'; $('expMel').checked = true; $('expRoll').checked = true; $('rollWith').checked = true;
    const before = new Set(audioClips.map(c => c.id));
    if (!audioClips.some(c => c.voice)) { $('l3Demo').click(); await until(() => audioClips.some(c => c.voice && !before.has(c.id)), 8000); }
    await until(() => !window.Jack22Lot3?.pending, 30000, 100);
    const v = audioClips.find(c => c.voice); if (!v) throw Error('démo voix absente'); if (!before.has(v.id)) ctx.clips.push(v.id); ctx.voiceSlot = v.voice.slot;
    try { window.JACK22_AUDIO_EDIT.place(v.id, 0, window.JACK22_AUDIO_EDIT.lane(v.id)); } catch (e) {}
    const b2 = new Set(audioClips.map(c => c.id)); await audioImportFile(wav(3, 1500, 'f6-signature.wav')); await sleep(200);
    const w = audioClips.find(c => !b2.has(c.id)); if (!w) throw Error('import WAV impossible'); ctx.clips.push(w.id);
    try { window.JACK22_AUDIO_EDIT.place(w.id, 0, 'audio'); } catch (e) {}
    buildPatternUI(); tlBuild(); await sleep(200);
  }
  const songMode = async on => {
    if (on) { song.arrangement.splice(0, song.arrangement.length, ...[0, 1, 2, ctx.instTi].map(ti => ({ id: song.nextId++, trackKey: song.tracks[ti].key, patternId: activePat(ti).id, startBar: 0, lengthBars: 2 }))); setMode('song'); }
    else setMode('pattern');
    tlBuild(); await sleep(200);
  };
  async function restore() {
    try { $('stop').click(); } catch (e) {}
    try { song.arrangement.splice(0, song.arrangement.length, ...ctx.arr); song.nextId = Math.max(song.nextId, ctx.nextId); activePat(1).notes = ctx.notes[0]; activePat(2).notes = ctx.notes[1]; activePat(0).grid.forEach((r, i) => r.splice(0, r.length, ...ctx.grid[i])); } catch (e) {}
    for (const k of ctx.tracks) try { P().removeTrack(k); } catch (e) {}
    try { song.tracks.forEach((t, i) => { if (i < ctx.mutes.length) t.mute = ctx.mutes[i]; }); } catch (e) {}
    try { take = ctx.take; drawTake(); uiRec(); } catch (e) {}
    for (const id of ctx.clips) { const i = audioClips.findIndex(c => c.id === id); if (i >= 0) { try { audioKill(audioClips[i]); } catch (e) {} audioClips.splice(i, 1); } }
    try { window.JACK22_AUDIO_EDIT.setTrack && window.JACK22_AUDIO_EDIT.setTrack('audio', { mute: false }); } catch (e) {}
    $('expLoops').value = ctx.loops; $('expMel').checked = ctx.mel; $('expRoll').checked = ctx.roll; $('rollWith').checked = ctx.rollWith; try { if (ctx.mode) setMode(ctx.mode); } catch (e) {}
    try { buildPatternUI(); tlBuild(); render?.(); } catch (e) {}
  }
  const pct = (a, b) => b > 0 ? Math.round(100 * a / b) : NaN;
  async function oneMode(label, isSong) {
    await songMode(isSong);
    const base = measure(await exportWav()), rows = [];
    const silent = SRC.filter(k => !(base[k] > 1e-7)); if (silent.length) throw Error(label + ' : sources inaudibles même sans Mute : ' + silent.join(', '));
    for (const k of SRC) {
      let r; try { await toggle(k); r = measure(await exportWav()); } catch (e) { rows.push({ k, err: e.message }); continue; } finally { try { await toggle(k); } catch (e) {} }
      const gone = pct(r[k], base[k]), others = SRC.filter(o => o !== k).map(o => [o, pct(r[o], base[o])]), lost = others.filter(([, p]) => !(p >= 30));
      rows.push({ k, gone, lost: lost.map(([o, p]) => o + ' ' + p + ' %'), ok: gone <= 10 && !lost.length });
    }
    return { base, rows };
  }
  async function run() {
    const out = [];
    try {
      await setup();
      for (const [label, isSong] of [['Pattern', false], ['Morceau', true]]) {
        const t0 = performance.now();
        try {
          const { rows } = await oneMode(label, isSong), bad = rows.filter(r => !r.ok);
          const txt = rows.map(r => r.err ? r.k + ' : ' + r.err : r.k + ' coupé → reste ' + r.gone + ' %' + (r.lost.length ? ' ; perdu aussi : ' + r.lost.join(', ') : '')).join(' | ');
          out.push({ cas: 'Rendu WAV, mode ' + label + ' : chaque M retire sa source, et seulement elle', ok: !bad.length, detail: txt, ms: Math.round(performance.now() - t0) });
        } catch (e) { out.push({ cas: 'Rendu WAV, mode ' + label, ok: false, detail: e.message }); }
      }
      // Mute + Solo (mixeur de la Production) : le Mute l'emporte ; le Solo laisse seulement la piste choisie.
      const t1 = performance.now();
      try {
        await songMode(false);
        P().open('mix'); await sleep(250);
        const card = [...document.querySelectorAll('#j97Body .j97Card')].find(c => c.querySelector('h3')?.textContent === song.tracks[1].label), solo = card && [...card.querySelectorAll('label')].find(l => /Solo/.test(l.textContent))?.querySelector('input'), apply = card && [...card.querySelectorAll('button')].find(b => /Appliquer/.test(b.textContent));
        if (!solo || !apply) throw Error('carte du mixeur introuvable'); solo.checked = true; apply.click(); await sleep(150); $('j97Dialog')?.close?.();
        const s1 = measure(await exportWav());
        await toggle('bass'); const s2 = measure(await exportWav()); await toggle('bass');
        await toggle('melody'); const s3 = measure(await exportWav()); await toggle('melody');
        P().open('mix'); await sleep(250);
        const card2 = [...document.querySelectorAll('#j97Body .j97Card')].find(c => c.querySelector('h3')?.textContent === song.tracks[1].label); const solo2 = [...card2.querySelectorAll('label')].find(l => /Solo/.test(l.textContent)).querySelector('input'); solo2.checked = false; [...card2.querySelectorAll('button')].find(b => /Appliquer/.test(b.textContent)).click(); await sleep(150); $('j97Dialog')?.close?.();
        const base = measure(await exportWav()), p = (m, k) => pct(m[k], base[k]);
        const checks = [['Solo Basse : basse présente', p(s1, 'bass') >= 30], ['Solo Basse : mélodie absente', p(s1, 'melody') <= 10], ['Solo Basse : batterie absente', p(s1, 'drums') <= 10],
          ['Solo + Mute Basse : basse absente (le Mute l’emporte)', p(s2, 'bass') <= 10], ['Solo Basse + Mute Mélodie : basse présente', p(s3, 'bass') >= 30], ['Solo Basse + Mute Mélodie : mélodie absente', p(s3, 'melody') <= 10]];
        const bad = checks.filter(c => !c[1]);
        out.push({ cas: 'Rendu WAV : Mute + Solo', ok: !bad.length, detail: (bad.length ? 'échecs : ' + bad.map(c => c[0]).join(' ; ') + ' — ' : '') + 'Solo Basse → basse ' + p(s1, 'bass') + ' %, mélodie ' + p(s1, 'melody') + ' %, batterie ' + p(s1, 'drums') + ' % ; + Mute Basse → basse ' + p(s2, 'bass') + ' % ; + Mute Mélodie → basse ' + p(s3, 'bass') + ' %, mélodie ' + p(s3, 'melody') + ' %', ms: Math.round(performance.now() - t1) });
      } catch (e) { out.push({ cas: 'Rendu WAV : Mute + Solo', ok: false, detail: e.message }); }
    } catch (e) { out.push({ cas: 'Préparation du projet de test', ok: false, detail: e.message }); }
    finally { if (ctx) await restore(); ctx = null; }
    return out;
  }
  window.JACK22_F6WAV = { run, measure };
})();
