/* JACK22 — tests de la Mission 3 (horloge et enregistrement vocal), avec un micro simulé.
   Charger dans la page, AVANT le premier son : fakemic.js, puis m3-bench.js, puis ce fichier.
   Usage : JACK22_M3.run().then(r => console.table(r))
   Le micro simulé réécoute la sortie du studio avec un retard exact (120 ms par défaut) : on mesure ce qui reste
   après compensation, sans dépendre de l'acoustique. Les tests matériels (Edge, vrai micro, casque) restent à faire. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const B = () => window.JACK22_M3BENCH, F = () => window.JACK22_FAKEMIC;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const TOL_MS = 1;                    // tolérance publiée (micro simulé) : décalage restant d'une prise, en valeur absolue
  const fb = () => $('cVoiceFeedback').textContent;
  const beatSec = () => 60 / getBpm();
  const grid = clip => { const r = B().residuals(clip, beatSec()), ok = r.filter(x => Math.abs(x) < 50); return { ...B().stats(ok), autres: r.length - ok.length }; };
  const within = (s, tol = TOL_MS) => s.n >= 3 && Math.abs(s.med) <= tol && Math.abs(s.min) <= tol && Math.abs(s.max) <= tol;
  const show = s => s.n ? 'médiane ' + s.med + ' ms (de ' + s.min + ' à ' + s.max + ', ' + s.n + ' clics)' : 'aucun clic';
  const micClose = () => { const b = $('cMicClose'); if (b && !b.hidden) b.click(); };
  // Rendu WAV de l'export, canal gauche en flottants.
  async function render() {
    const r = await renderSong(exportData(), expOpts()), v = new DataView(r.wav), n = (v.byteLength - 44) / 4, x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = v.getInt16(44 + i * 4, true) / 32768;
    return x;
  }
  // Décalage (ms) de b par rapport à a, par corrélation sur 1,5 s, entre -30 et +30 ms.
  function lagMs(a, b, sr = 44100) {
    const from = Math.round(0.05 * sr), len = Math.round(1.5 * sr), max = Math.round(0.03 * sr); let best = -Infinity, at = 0;
    for (let lag = -max; lag <= max; lag++) { let s = 0; for (let i = from; i < from + len; i++) s += a[i] * (b[i + lag] || 0); if (s > best) { best = s; at = lag; } }
    return +(at / sr * 1000).toFixed(2);
  }
  async function voiceVsBeat() {
    const am = audioMute, mutes = song.tracks.map(t => t.mute);
    try {
      audioMute = true; const beat = await render(); audioMute = am;
      song.tracks.forEach(t => t.mute = true); const voice = await render();
      return lagMs(beat, voice);
    } finally { audioMute = am; song.tracks.forEach((t, i) => t.mute = mutes[i]); }
  }
  function setMasterComp(on) { const f = currentSettings().fx; applyFxSave({ ...f, comp: { ...f.comp, on } }); }
  function setCapture98(record) { const v = VoiceStore.capture(); v.capture98 = { version: 1, record, recipes: v.capture98?.recipes || {} }; VoiceStore.setText(v); }

  const cases = [
    ['Mesure de latence : suit le retard injecté', async () => {
      micClose(); F().setDelay(60); const a = await B().calibrate(); F().setDelay(200); const b = await B().calibrate(); F().setDelay(120); const c = await B().calibrate();
      const d = b.ms - a.ms; if (Math.abs(d - 140) > 1) throw Error('60 → ' + a.ms + ' ms, 200 → ' + b.ms + ' ms : écart ' + d + ' au lieu de 140');
      if (Math.abs(c.ms - a.ms - 60) > 1) throw Error('retour à 120 ms : ' + c.ms);
      return 'retards 60 / 200 / 120 ms → mesures ' + a.ms + ' / ' + b.ms + ' / ' + c.ms + ' ms (écarts entre clics ' + [a, b, c].map(x => x.spread).join(' / ') + ' ms)';
    }],
    ['Trois prises calées sur la grille, micro gardé ouvert', async () => {
      const o0 = F().opened, out = [];
      for (let i = 0; i < 3; i++) { const r = await B().take({ seconds: 3 }); const s = grid(r.clip); if (!within(s)) throw Error('prise ' + (i + 1) + ' : ' + show(s)); out.push(s.med); }
      if (F().opened !== o0) throw Error('micro rouvert entre les prises (' + (F().opened - o0) + ' fois)');
      if (!/calage exact/.test(fb())) throw Error('message : ' + fb());
      return 'médianes ' + out.join(' / ') + ' ms, une seule ouverture du micro, message « calage exact »';
    }],
    ['Micro fermé puis rouvert : prise prévenue', async () => {
      const o0 = F().opened; micClose(); if ($('cMicClose') && !$('cMicClose').hidden) throw Error('bouton Fermer le micro toujours visible');
      const r = await B().take({ seconds: 2 });
      if (F().opened !== o0 + 1) throw Error('micro non rouvert');
      if (!/autre ouverture du micro/.test(fb())) throw Error('pas d’avertissement : ' + fb());
      const s = grid(r.clip); if (!within(s, 10)) throw Error('hors de 10 ms : ' + show(s));
      await B().calibrate(); return 'avertissement affiché ; décalage de cette prise ' + s.med + ' ms (le navigateur fixe le décalage d’entrée à chaque ouverture) ; nouvelle mesure faite';
    }],
    ['Prise sur le beat : superposée au beat dans le WAV (master normal)', async () => {
      setMasterComp(false); const r = await B().take({ seconds: 4, withBeat: true, metro: false }); if (!r.clip) throw Error('pas de prise');
      const lag = await voiceVsBeat(); if (Math.abs(lag) > TOL_MS) throw Error('voix décalée de ' + lag + ' ms dans le WAV');
      return 'voix ' + lag + ' ms par rapport au beat dans le WAV';
    }],
    ['Prise sur le beat, compresseur master allumé (6 ms)', async () => {
      setMasterComp(true);
      try {
        const r = await B().take({ seconds: 4, withBeat: true, metro: false }); if (!r.clip) throw Error('pas de prise');
        const lag = await voiceVsBeat(); if (Math.abs(lag) > TOL_MS) throw Error('voix décalée de ' + lag + ' ms dans le WAV');
        return 'voix ' + lag + ' ms par rapport au beat dans le WAV ; message : « ' + (fb().match(/chaîne de lecture [^·]+/) || ['—'])[0].trim() + ' »';
      } finally { setMasterComp(false); }
    }],
    ['Prise sur le beat à 97 et 160 BPM', async () => {
      const bpm0 = $('bpm').value, out = [];
      try {
        for (const bpm of [97, 160]) {
          $('bpm').value = String(bpm); $('bpm').dispatchEvent(new Event('change', { bubbles: true })); $('bpm').dispatchEvent(new Event('input', { bubbles: true }));
          const r = await B().take({ seconds: 4, withBeat: true, metro: false }); if (!r.clip) throw Error('pas de prise à ' + bpm);
          const lag = await voiceVsBeat(); if (Math.abs(lag) > TOL_MS) throw Error(bpm + ' BPM : voix décalée de ' + lag + ' ms dans le WAV');
          out.push(bpm + ' BPM ' + lag + ' ms');
        }
      } finally { $('bpm').value = bpm0; $('bpm').dispatchEvent(new Event('change', { bubbles: true })); $('bpm').dispatchEvent(new Event('input', { bubbles: true })); }
      return out.join(' ; ');
    }],
    ['Clic de prise avec compresseur master : aussi calé', async () => {
      setMasterComp(true);
      try { const r = await B().take({ seconds: 3 }); const s = grid(r.clip); if (!within(s)) throw Error(show(s)); return show(s); } finally { setMasterComp(false); }
    }],
    ['Effets voix : la voix traitée reste à sa place', async () => {
      const D = Jack22Lot3DSP, c = B().voice(1); if (!c) throw Error('pas de voix 1');
      const raw = B().onsets(c.buffer.getChannelData(0), c.buffer.sampleRate), out = [];
      for (const [name, mod] of [['compresseur', s => { s.comp.on = true; }], ['saturation', s => { s.drive.on = true; s.drive.amount = 40; }], ['compresseur + saturation + de-esser', s => { s.comp.on = true; s.drive.on = true; s.drive.amount = 40; s.deess = { on: true, amount: 50, freq: 6500 }; }]]) {
        const s = D.defaults(); mod(s); c.voice.processing = D.validate(s); Jack22Lot3.schedule(); await sleep(200); await B().until(() => !Jack22Lot3.pending, 60000, 50);
        const p = Jack22Lot3.prepared(c); if (!p) throw Error(name + ' : non traité (' + Jack22Lot3.error + ')');
        const on = B().onsets(p.getChannelData(0), p.sampleRate, 0.01), d = on.slice(0, raw.length).map((t, i) => +((t - raw[i]) * 1000).toFixed(2));
        if (d.some(x => Math.abs(x) > 0.5)) throw Error(name + ' : décalage ' + d.join(' / ') + ' ms');
        out.push(name + ' ' + Math.max(...d.map(Math.abs)) + ' ms');
      }
      c.voice.processing = D.defaults(); Jack22Lot3.schedule(); await sleep(200); await B().until(() => !Jack22Lot3.pending, 60000, 50);
      return out.join(' ; ');
    }],
    ['Pause du son pendant la prise (contexte suspendu puis repris)', async () => {
      const r = await B().take({ seconds: 4, during: async () => { await sleep(1200); await audio.suspend(); await sleep(500); await audio.resume(); } });
      const s = grid(r.clip); if (!within(s)) throw Error(show(s)); return show(s) + ' malgré 0,5 s de suspension';
    }],
    ['Zone mesures 3 à 5 : position et arrêt automatique', async () => {
      setCapture98({ on: true, mode: 'range', start: 3, end: 5, passes: 1 });
      try {
        const n0 = audioClips.length; const r = await B().take({ seconds: 8 });
        const c = audioClips.filter(x => x.voice && x.voice.slot === 1).at(-1);
        if (!c || c.startBar !== 2) throw Error('prise posée mesure ' + (c && c.startBar + 1));
        if (Math.abs(c.duration - 2 * 4 * beatSec()) > 0.05) throw Error('durée ' + c.duration.toFixed(2) + ' s au lieu de ' + (8 * beatSec()));
        const s = grid(c); if (!within(s)) throw Error(show(s));
        return 'posée mesure 3, arrêtée à la fin de la zone (' + c.duration.toFixed(2) + ' s), ' + show(s) + ', ' + (audioClips.length - n0) + ' clip ajouté';
      } finally { setCapture98({ on: false, mode: 'range', start: 1, end: 3, passes: 3 }); }
    }],
    ['Boucle mesures 1 à 2, 2 passes : chaque passe calée', async () => {
      setCapture98({ on: true, mode: 'loop', start: 1, end: 2, passes: 2 });
      try {
        const n0 = audioClips.length; await B().take({ seconds: 6 });
        const added = audioClips.slice(n0); if (added.length !== 2) throw Error(added.length + ' passes au lieu de 2');
        const out = added.map(c => { const s = grid(c); if (!within(s)) throw Error(c.name + ' : ' + show(s)); return c.name + ' ' + s.med + ' ms'; });
        return out.join(' ; ');
      } finally { setCapture98({ on: false, mode: 'range', start: 1, end: 3, passes: 3 }); }
    }],
    ['Compensation par micro', async () => {
      const m1 = Number($('cLatComp').value); micClose();
      const id2 = 'fake-mic-2-' + Date.now();                    // jamais mesuré (la mémoire du navigateur survit aux rechargements)
      F().deviceId = id2; F().label = 'Micro simulé 2'; F().setDelay(40);
      try {
        await B().take({ seconds: 2 }); if (!/Aucune mesure mémorisée pour « Micro simulé 2 »/.test(fb())) throw Error('micro 2 non signalé : ' + fb());
        const c2 = await B().calibrate(); if (Number($('cLatComp').value) !== c2.ms) throw Error('mesure du micro 2 non appliquée');
        const r = await B().take({ seconds: 2 }); const s = grid(r.clip); if (!within(s)) throw Error('micro 2 : ' + show(s));
      } finally { micClose(); F().deviceId = 'fake-mic-1'; F().label = 'Micro simulé 1'; F().setDelay(120); }
      await B().take({ seconds: 1 });
      if (Number($('cLatComp').value) !== m1) throw Error('retour au micro 1 : ' + $('cLatComp').value + ' ms au lieu de ' + m1);
      const st = JSON.parse(localStorage.getItem('jack22-latency-device-v1')), keys = Object.keys(st.devices || {});
      if (!keys.includes('fake-mic-1') || !keys.includes(id2)) throw Error('mémoire : ' + keys.join(', '));
      await B().calibrate();
      return 'micro 2 signalé, mesuré et mémorisé, prise calée ; retour au micro 1 = ' + m1 + ' ms rechargés';
    }],
    ['Micro refusé : message clair, rien de remplacé', async () => {
      micClose(); const c0 = B().voice(1); F().deny('NotAllowedError', 'Permission denied');
      const conf = window.confirm; window.confirm = () => true;
      try { Jack22Voice.beginTake(1); await B().until(() => !Jack22Voice.state.active, 10000, 30); } finally { F().deny(null); window.confirm = conf; }
      if (!/accès refusé/.test(fb())) throw Error('message : ' + fb());
      if (B().voice(1) !== c0) throw Error('prise remplacée');
      return '« ' + fb().slice(0, 70) + '… »';
    }],
    ['Micro débranché pendant la prise : prise gardée jusque-là', async () => {
      const r = await B().take({ seconds: 3, during: async () => { await sleep(1500); F().unplug(); } });
      if (!/Micro déconnecté/.test(r.status)) throw Error('message : ' + r.status);
      if (!r.clip || r.clip.duration < 1 || r.clip.duration > 2.2) throw Error('durée ' + (r.clip && r.clip.duration));
      const o0 = F().opened; const r2 = await B().take({ seconds: 1 }); if (F().opened !== o0 + 1 || !r2.clip) throw Error('micro non rouvert après débranchement');
      await B().calibrate();
      return 'prise de ' + r.clip.duration.toFixed(2) + ' s gardée, micro rouvert à la prise suivante';
    }],
    ['Pas de double compensation : sauvegarde puis chargement', async () => {
      const r = await B().take({ seconds: 3 }), before = grid(r.clip);
      await B().idle(); ProjectPersistence.save(); await B().until(() => !persistBusy, 20000);
      const conf = window.confirm; window.confirm = () => true; try { ProjectPersistence.load(); } finally { window.confirm = conf; }
      await B().until(() => !persistBusy && !Jack22Lot3.pending, 30000); await sleep(500);
      const after = grid(B().voice(1)); if (!within(after) || Math.abs(after.med - before.med) > 0.05) throw Error('avant ' + show(before) + ', après ' + show(after));
      return 'avant ' + before.med + ' ms, après rechargement ' + after.med + ' ms';
    }],
  ];

  async function run(only) {
    const out = [];
    for (const [name, fn] of cases) {
      if (only && !only.test(name)) continue;
      const t = performance.now();
      try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
      out.at(-1).ms = Math.round(performance.now() - t);
      try { await B().idle(); } catch (e) {}
    }
    return out;
  }
  window.JACK22_M3 = { run, cases: cases.map(c => c[0]), TOL_MS };
})();
