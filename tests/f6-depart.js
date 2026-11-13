/* JACK22 — 7.9 : mesure du départ de chaque piste (point 6 de l'audit), à charger dans la page du studio juste après son ouverture.
   JACK22_F6DEPART.run() : projet batterie + 808 + WAV importé ; 1er Play après l'ouverture, Stop, 2e Play.
   Pour chaque piste : heure prévue du 1er son (horloge audio) par rapport au pas 0 du transport, et retard éventuel
   (programmé pour un instant déjà passé : le son part alors en retard). Aussi : délai entre le clic sur Play et le 1er son. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const wav = (sec, hz, name, amp = 6000) => { const sr = 44100, n = Math.round(sec * sr), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * hz * i / sr) * amp), true); return new File([b], name, { type: 'audio/wav' }); };
  const NOTE = (start, dur, preset, midi) => ({ start, dur, preset, octave: Math.floor(midi / 12) - 1, idx: midi % 12, velocity: 100 });
  async function measureOnce(label) {
    const ev = []; let clickAt = null;
    const h0 = hit, a0 = audioStartClip, E = engine, sn = E && E.scheduleNote;
    hit = function (r, t) { ev.push({ track: 'batterie', when: t, now: audio.currentTime }); return h0.apply(this, arguments); };
    audioStartClip = function (c, when, offset) { ev.push({ track: 'wav', when, now: audio.currentTime, offset }); return a0.apply(this, arguments); };
    const wrapE = () => { if (engine && engine.scheduleNote && !engine.__dep) { const e = engine, s = e.scheduleNote; e.__dep = s; e.scheduleNote = function (p, o, i, t0, t1, opts) { ev.push({ track: (opts && opts.trackKey) === 'bass' ? '808' : (opts && opts.trackKey) || 'synthé', when: t0, now: audio.currentTime }); return s.apply(this, arguments); }; } };
    wrapE();
    try {
      const t0perf = performance.now(); clickAt = audio ? audio.currentTime : 0;
      $('play').click(); wrapE();
      await sleep(1600);
      const step0 = stepLog.find(l => l.abs === 0), first = {};
      for (const e of ev) if (!(e.track in first)) first[e.track] = e;
      const out = {};
      for (const [k, e] of Object.entries(first)) out[k] = { depart_vs_pas0_ms: step0 ? Math.round((e.when - step0.time) * 1000 * 10) / 10 : null, retard_ms: Math.round(Math.max(0, e.now - e.when) * 1000 * 10) / 10 };
      const late = ev.filter(e => e.now > e.when + 0.0005).length;
      return { lecture: label, pas0_apres_clic_ms: step0 ? Math.round((step0.time - clickAt) * 1000) : null, premiers_sons: out, sons_programmes: ev.length, en_retard: late, clic_ms: Math.round(performance.now() - t0perf) };
    } finally { hit = h0; audioStartClip = a0; if (engine && engine.__dep) { engine.scheduleNote = engine.__dep; delete engine.__dep; } $('stop').click(); await sleep(400); }
  }
  async function run() {
    // Projet : batterie (grosse caisse au pas 0), 808 au pas 0, WAV importé à la mesure 1.
    const g = activePat(0).grid; g.forEach(r => r.fill(false)); for (let s = 0; s < 16; s += 4) g[0][s] = true; for (let s = 0; s < 16; s += 2) g[2][s] = true;
    activePat(1).notes = [NOTE(0, 6, 'sub808', 43), NOTE(8, 6, 'sub808', 43)]; activePat(2).notes = [];
    $('rollWith').checked = true; try { setMode('pattern'); } catch (e) {}
    const b2 = new Set(audioClips.map(c => c.id)); await audioImportFile(wav(3, 440, 'depart.wav')); await sleep(300);
    const w = audioClips.find(c => !b2.has(c.id)); try { window.JACK22_AUDIO_EDIT.place(w.id, 0, 'audio'); } catch (e) {}
    buildPatternUI(); tlBuild(); await sleep(300);
    const r1 = await measureOnce('1re lecture après l’ouverture'); await sleep(800);
    const r2 = await measureOnce('2e lecture'); await sleep(800);
    const r3 = await measureOnce('3e lecture');
    return { conditions: { page_cachee: document.hidden, visibilite: document.visibilityState, contexte_audio: audio.state, latence_sortie_ms: Math.round((audio.outputLatency || 0) * 1000), latence_base_ms: Math.round((audio.baseLatency || 0) * 1000) }, mesures: [r1, r2, r3] };
  }
  window.JACK22_F6DEPART = { run };
})();
