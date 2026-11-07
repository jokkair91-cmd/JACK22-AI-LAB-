/* JACK22 — tests de la Mission 6 (sampler et batterie), à charger dans la page du studio.
   Usage : JACK22_M6.run().then(r => console.table(r)). Le projet est remis comme avant à la fin. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms = 20000, step = 40) { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(step); } throw Error('délai dépassé (' + ms + ' ms)'); }
  const S = () => window.JACK22_SAMPLER130, H = () => window.Jack22Vision8, SR = 44100;
  const RUN = 'M6 ' + Date.now().toString(36);
  const ready = () => until(() => !Jack22Lot3.pending && !persistBusy && (!window.l3Ready || window.l3Ready()), 120000, 100);
  // Sources de test : « clic » (bip 3 kHz de 20 ms) et « tenue » (ton 440 Hz d'une seconde).
  async function source(name, kind) {
    const n = 48000, x = new Float32Array(n);
    if (kind === 'clic') for (let i = 0; i < 960; i++) x[i] = 0.7 * Math.sin(2 * Math.PI * 3000 * i / 48000);
    else for (let i = 0; i < n; i++) x[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / 48000);
    const c = await JACK22_PRODUCTION.newAudio({ sampleRate: 48000 }, [x], RUN + ' ' + name, 60); return c;
  }
  const pad = (name, clipId, o = {}) => ({ name, clipId, gain: 100, start: 0, end: 0, attack: 0, decay: 0, sustain: 1, release: 0, choke: 0, tune: 0, ...o });
  // Export WAV (mode PATTERN, 1 tour) : seule la batterie sonne ; les clips audio du projet sont muets (les pads lisent leurs sources quand même).
  async function renderDrums(grid) {
    const keep = activePat(0).grid.map(r => r.slice()), mutes = song.tracks.map(t => t.mute), am = audioMute, loops = $('expLoops').value;
    activePat(0).grid = grid; song.tracks.forEach((t, i) => t.mute = i !== 0); audioMute = true; $('expLoops').value = '1'; setMode('pattern');
    try { const r = await renderSong(neutral(exportData()), expOpts()), v = new DataView(r.wav), n = (v.byteLength - 44) / 4, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = v.getInt16(44 + i * 4, true) / 32768; return x; }
    finally { activePat(0).grid = keep; song.tracks.forEach((t, i) => t.mute = mutes[i]); audioMute = am; $('expLoops').value = loops; }
  }
  // Master neutre (sans réverbération, delay ni compresseur réglés par d'autres tests) : on mesure le sampler, pas la traîne des effets.
  const neutral = d => { const f = d.settings && d.settings.fx; if (f) { f.reverb = { ...f.reverb, on: false }; f.delay = { ...f.delay, on: false }; f.comp = { ...f.comp, on: false }; f.eq = { low: 0, mid: 0, high: 0 }; } return d; };
  const empty = () => [0, 1, 2, 3].map(() => new Array(16).fill(false));
  const rms = (x, a, b) => { let s = 0, n = 0; for (let i = Math.round(a * SR); i < Math.round(b * SR) && i < x.length; i++) { s += x[i] * x[i]; n++; } return n ? Math.sqrt(s / n) : 0; };
  // Énergie d'une fréquence (Goertzel) sur une fenêtre : distingue le bip 3 kHz et la tenue 440 Hz.
  const tone = (x, f, a, b) => { const i0 = Math.round(a * SR), i1 = Math.min(x.length, Math.round(b * SR)), k = 2 * Math.cos(2 * Math.PI * f / SR); let s1 = 0, s2 = 0; for (let i = i0; i < i1; i++) { const s = x[i] + k * s1 - s2; s2 = s1; s1 = s; } return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - k * s1 * s2)) / Math.max(1, i1 - i0); };

  const cases = [
    ['Batterie : KICK joué par un pad, écoute = WAV', async () => {
      const clic = await source('clic', 'clic'); const base = S().config;
      S().set({ ...base, pads: [pad('Kick sample', clic.id)], drums: [0, null, null, null] });
      const g = empty(); [0, 4, 8, 12].forEach(s => g[0][s] = true);
      window.J22SamplerTrace = [];
      const x = await renderDrums(g), off = window.J22SamplerTrace.filter(e => !e.live).map(e => +e.t.toFixed(5));
      const len = stepSec(), want = [0, 4, 8, 12].map(s => +(s * len).toFixed(5));
      if (off.join() !== want.join()) throw Error('WAV : pads à ' + off.join(', ') + ' au lieu de ' + want.join(', '));
      for (const s of [0, 4, 8, 12]) { if (tone(x, 3000, s * len, s * len + 0.02) < 0.05) throw Error('bip absent du WAV au pas ' + s); if (tone(x, 155, s * len, s * len + 0.1) > 0.02) throw Error('kick de synthèse encore présent au pas ' + s); }
      // Écoute : même programme, relevé dans le moteur en direct.
      const keep = activePat(0).grid.map(r => r.slice()), mutes = song.tracks.map(t => t.mute); activePat(0).grid = g; song.tracks.forEach((t, i) => t.mute = i !== 0);
      window.J22SamplerTrace = [];
      try { await ready(); setMode('pattern'); start(0); if (state !== 'playing') throw Error('lecture non démarrée'); const t0 = stepLog[0].time; await sleep((16 * len + 0.3) * 1000); $('stop').click();
        const lv = window.J22SamplerTrace.filter(e => e.live && e.t < t0 + 16 * len - 1e-6).map(e => +(e.t - t0).toFixed(5));
        if (lv.length !== 4 || lv.some((t, i) => Math.abs(t - want[i]) > 2e-4)) throw Error('écoute : ' + lv.join(', ')); }
      finally { activePat(0).grid = keep; song.tracks.forEach((t, i) => t.mute = mutes[i]); window.J22SamplerTrace = null; $('stop').click(); }
      return '4 coups de pad aux pas 0/4/8/12, mêmes instants à l’écoute et dans le WAV ; le kick de synthèse ne joue plus sur cette ligne';
    }],
    ['Choke : le hi-hat fermé coupe le hi-hat ouvert', async () => {
      const clic = audioClips.find(c => c.name === RUN + ' clic'), tenue = await source('tenue', 'tenue'), base = S().config, len = stepSec();
      const g = empty(); g[2][0] = true; g[3][4] = true;
      S().set({ ...base, pads: [pad('Ouvert', tenue.id, { choke: 1 }), pad('Fermé', clic.id, { choke: 1 })], drums: [null, null, 0, 1] });
      const cut = await renderDrums(g);
      S().set({ ...S().config, pads: [pad('Ouvert', tenue.id, { choke: 0 }), pad('Fermé', clic.id, { choke: 0 })] });
      const free = await renderDrums(g), at = 4 * len + 0.03;
      const a = tone(cut, 440, at, at + 0.1), b = tone(free, 440, at, at + 0.1);
      if (!(b > 0.05)) throw Error('sans choke, la tenue devrait encore sonner (' + b.toFixed(3) + ')');
      if (!(a < b * 0.05)) throw Error('avec choke, la tenue sonne encore : ' + a.toFixed(4) + ' / ' + b.toFixed(4));
      return 'tenue 440 Hz après le coup fermé : ' + a.toFixed(4) + ' avec choke, ' + b.toFixed(3) + ' sans';
    }],
    ['Pad : ADSR et découpe dans la source', async () => {
      const tenue = audioClips.find(c => c.name === RUN + ' tenue'), base = S().config;
      S().set({ ...base, pads: [pad('ADSR', tenue.id, { start: 0.2, end: 0.8, attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.1 })], drums: [0, null, null, null] });
      const g = empty(); g[0][0] = true; const x = await renderDrums(g);
      const peak = rms(x, 0.095, 0.105), sus = rms(x, 0.3, 0.4), early = rms(x, 0, 0.01), after = rms(x, 0.62, 0.7);
      if (!(early < peak * 0.15)) throw Error('attaque : ' + (early / peak).toFixed(2));
      if (Math.abs(sus / peak - 0.5) > 0.08) throw Error('maintien : ' + (sus / peak).toFixed(2) + ' au lieu de 0,5');
      if (!(after < peak * 0.02)) throw Error('son après la fin de la découpe (0,6 s) : ' + (after / peak).toFixed(3));
      return 'attaque 0 → 1 en 0,1 s, maintien ' + (sus / peak).toFixed(2) + ', silence après 0,6 s (découpe 0,2 → 0,8 s)';
    }],
    ['Sampler mélodique : décroissance, maintien, début dans la source', async () => {
      const tenue = audioClips.find(c => c.name === RUN + ' tenue');
      const v = VoiceStore.capture(), prod = JACK22_PRODUCTION.config; prod.sample = { clipId: tenue.id, root: 60, attack: 0.01, release: 0.05 }; v.production97 = prod; VoiceStore.setText(v);
      S().set({ ...S().config, main: { decay: 0.2, sustain: 0.4, start: 0.5, end: 0 }, pads: [], drums: [null, null, null, null] });
      const tr = song.tracks[2], p = tr.patterns[tr.active], keep = { bars: p.bars, steps: p.steps, notes: p.notes }, mutes = song.tracks.map(t => t.mute), am = audioMute, loops = $('expLoops').value;
      p.bars = 1; p.steps = 16; p.notes = [{ start: 0, dur: 6, preset: 'sample97', octave: 4, idx: 0 }]; song.tracks.forEach((t, i) => t.mute = i !== 2); audioMute = true; $('expLoops').value = '1'; $('rollWith').checked = true; setMode('pattern');
      let x; try { const r = await renderSong(neutral(exportData()), expOpts()), dv = new DataView(r.wav); x = new Float32Array((dv.byteLength - 44) / 4); for (let i = 0; i < x.length; i++) x[i] = dv.getInt16(44 + i * 4, true) / 32768; }
      finally { p.bars = keep.bars; p.steps = keep.steps; p.notes = keep.notes; song.tracks.forEach((t, i) => t.mute = mutes[i]); audioMute = am; $('expLoops').value = loops; }
      const peak = rms(x, 0.01, 0.02), sus = rms(x, 0.3, 0.4);
      if (!(peak > 0.01)) throw Error('sampler muet');
      if (Math.abs(sus / peak - 0.4) > 0.08) throw Error('maintien ' + (sus / peak).toFixed(2) + ' au lieu de 0,4');
      // Début dans la source : repère (bip 3 kHz) placé à 0,6 s dans la source ; lu depuis 0,5 s, il doit sonner 0,1 s après la note.
      const m = new Float32Array(48000); for (let i = 0; i < 960; i++) m[Math.round(0.6 * 48000) + i] = 0.7 * Math.sin(2 * Math.PI * 3000 * i / 48000);
      const mark = await JACK22_PRODUCTION.newAudio({ sampleRate: 48000 }, [m], RUN + ' repère', 60), v2 = VoiceStore.capture(), prod2 = JACK22_PRODUCTION.config; prod2.sample = { ...prod2.sample, clipId: mark.id }; v2.production97 = prod2; VoiceStore.setText(v2);
      S().set({ ...S().config, main: { decay: 0, sustain: 1, start: 0.5, end: 0 } });
      p.bars = 1; p.steps = 16; p.notes = [{ start: 0, dur: 8, preset: 'sample97', octave: 4, idx: 0 }]; song.tracks.forEach((t, i) => t.mute = i !== 2); audioMute = true; $('expLoops').value = '1';
      let y; try { const r = await renderSong(neutral(exportData()), expOpts()), dv = new DataView(r.wav); y = new Float32Array((dv.byteLength - 44) / 4); for (let i = 0; i < y.length; i++) y[i] = dv.getInt16(44 + i * 4, true) / 32768; }
      finally { p.bars = keep.bars; p.steps = keep.steps; p.notes = keep.notes; song.tracks.forEach((t, i) => t.mute = mutes[i]); audioMute = am; $('expLoops').value = loops; }
      let pk = 0; for (const s of y) pk = Math.max(pk, Math.abs(s)); let at = -1; for (let i = 0; i < y.length; i++) if (Math.abs(y[i]) > pk * 0.5) { at = i / SR; break; }
      if (Math.abs(at - 0.1) > 0.003) throw Error('repère entendu à ' + at.toFixed(4) + ' s au lieu de 0,1 s');
      return 'pic puis maintien à ' + (sus / peak).toFixed(2) + ' (réglé 0,4) ; début à 0,5 s dans la source : repère entendu à ' + at.toFixed(3) + ' s (attendu 0,100)';
    }],
    ['Banques : enregistrer, changer, recharger', async () => {
      const clic = audioClips.find(c => c.name === RUN + ' clic'), tenue = audioClips.find(c => c.name === RUN + ' tenue');
      S().set({ ...S().config, pads: [pad('A', clic.id)], drums: [0, null, null, null], banks: [] });
      S().open(); const dlg = $('c130Dlg'), name = dlg.querySelector('input[aria-label="Nom de la banque"]'); name.value = 'Kit 1';
      [...dlg.querySelectorAll('button')].find(b => b.textContent.startsWith('Enregistrer les pads')).click();
      S().set({ ...S().config, pads: [pad('B', tenue.id), pad('C', clic.id)], drums: [1, 0, null, null] });
      S().open(); [...dlg.querySelectorAll('button')].find(b => b.textContent === 'Charger').click(); dlg.close();
      const c = S().config; if (c.banks.length !== 1 || c.pads.length !== 1 || c.pads[0].name !== 'A' || c.drums[0] !== 0) throw Error('après chargement : ' + JSON.stringify({ pads: c.pads.map(p => p.name), drums: c.drums, banks: c.banks.length }));
      return 'banque « Kit 1 » enregistrée dans le projet, puis rechargée (pads et batterie)';
    }],
    ['Annuler, sauvegarde et rechargement', async () => {
      const clic = audioClips.find(c => c.name === RUN + ' clic'), before = JSON.stringify(S().config);
      S().set({ ...S().config, pads: [pad('X', clic.id, { gain: 80, choke: 2 })], drums: [null, 0, null, null] });
      H().travel(true); await sleep(100); if (JSON.stringify(S().config) !== before) throw Error('Annuler ne remet pas le sampler');
      H().travel(false); await sleep(100); const mine = JSON.stringify(S().config);
      ProjectPersistence.save(); await until(() => !persistBusy, 20000);
      const conf = window.confirm; window.confirm = () => true; try { ProjectPersistence.load(); } finally { window.confirm = conf; }
      await until(() => !persistBusy && !Jack22Lot3.pending, 30000); await sleep(300);
      if (JSON.stringify(S().config) !== mine) throw Error('après rechargement : ' + JSON.stringify(S().config).slice(0, 160));
      return 'Annuler / Rétablir et sauvegarde / rechargement gardent pads, choke et batterie';
    }],
    ['Aide : plus de « sampler séquencé futur »', async () => {
      const t = document.body.innerHTML; if (/sampler séquencé restent futurs/.test(t)) throw Error('ancienne aide encore présente');
      if (!/Sampler, pads et batterie/.test(t)) throw Error('entrée de menu absente');
      return 'aide corrigée ; entrée « Sampler, pads et batterie… » dans le menu Projet';
    }],
  ];

  async function run(only) {
    $('stop').click(); await until(() => !persistBusy && !Jack22Lot3.pending, 60000);
    const prev = ProjectTransfer.snapshot(); prev.clips = prev.clips.map(c => ({ ...c, voice: c.voice ? JSON.parse(JSON.stringify(c.voice)) : null }));
    const out = [];
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t); $('stop').click();
      }
    } finally { $('stop').click(); document.getElementById('c130Dlg')?.close(); window.J22SamplerTrace = null; ProjectTransfer.rollback(prev); await sleep(300); }
    return out;
  }
  window.JACK22_M6 = { run, cases: cases.map(c => c[0]) };
})();
