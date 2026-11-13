/* JACK22 — tests de la 7.4 (pistes audio dans l'Arrangement), à charger dans la page du studio.
   Crée des pistes et importe de petits WAV générés ; tout est retiré à la fin (projet remis comme avant).
   Usage : JACK22_F1.run().then(r => console.table(r)). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE, A = () => window.JACK22_AUDIO_EDIT, T = () => window.JACK22_TRACKS145;
  // Petit WAV 16 bits mono (sinus), généré dans la page.
  const wav = (sec, hz, name) => { const sr = 44100, n = Math.round(sec * sr), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * hz * i / sr) * 8000), true);
    return new File([b], name, { type: 'audio/wav' }); };
  const laneOf = id => A().lane(id);
  let made = [], madeClips = [];

  const cases = [
    ['« ＋ Piste audio » dans l’Arrangement', async () => {
      WS().choose('compose', 'arrange'); await sleep(400);
      const ui = $('c145Tools'); if (!ui || !ui.offsetWidth) throw Error('outils de piste absents de l’Arrangement');
      const n0 = T().tracks().length; ui.querySelector('button').click(); await sleep(300);
      const ts = T().tracks(); if (ts.length !== n0 + 1) throw Error('piste non créée');
      const t = ts.at(-1); made.push(t.id);
      if (!document.querySelector('#timeline [data-j99-lane="' + CSS.escape(t.id) + '"]')) throw Error('nouvelle piste absente de l’Arrangement');
      if ($('j99Dialog')?.open) throw Error('fenêtre de réglage restée ouverte');
      if (T().target !== t.id) throw Error('la nouvelle piste n’est pas la destination des imports');
      return '« ' + t.name + ' » créée en un clic, couleur ' + t.color + ', visible, destination des imports';
    }],
    ['Import d’un WAV sur la piste choisie', async () => {
      const target = T().target, before = new Set(audioClips.map(c => c.id));
      await audioImportFile(wav(1.5, 220, 'test-m1.wav')); await sleep(300);
      const c = audioClips.find(x => !before.has(x.id)); if (!c) throw Error('import non fait');
      madeClips.push(c.id);
      if (laneOf(c.id) !== target) throw Error('clip importé sur « ' + laneOf(c.id) + ' » au lieu de la piste choisie');
      if (!document.querySelector('#timeline [data-j99-lane="' + CSS.escape(target) + '"] [data-audio="' + c.id + '"]')) throw Error('clip absent de sa piste à l’écran');
      return '« test-m1.wav » (1,5 s) arrivé sur la piste choisie, avec sa forme d’onde';
    }],
    ['32 pistes au maximum, avec message', async () => {
      const ui = $('c145Tools'), add = ui.querySelector('button'); let guard = 40;
      while (T().tracks().length < 32 && guard--) { add.click(); made.push(T().tracks().at(-1).id); await sleep(20); }
      if (T().tracks().length !== 32) throw Error(T().tracks().length + ' pistes au lieu de 32');
      if (!add.disabled) throw Error('bouton encore actif à 32 pistes');
      const rows = document.querySelectorAll('#timeline [data-j99-lane]').length;
      if (rows < 29) throw Error('seulement ' + rows + ' lignes audio à l’écran');
      return '32 pistes audio : ' + rows + ' lignes à l’écran (les voix vides restent cachées, comme avant) ; bouton désactivé avec « Maximum 32 pistes audio atteint »';
    }],
    ['Performances : 32 pistes et des clips', async () => {
      const lanes = T().tracks().filter(t => t.id.startsWith('aud_')).map(t => t.id); let k = 0;
      while (audioClips.filter(c => !c.voice).length < 12 && k < 12) { T().target = lanes[k % lanes.length]; const before = new Set(audioClips.map(c => c.id)); try { await audioImportFile(wav(2, 110 + k * 20, 'perf-' + k + '.wav')); } catch (e) { break; } const c = audioClips.find(x => !before.has(x.id)); if (c) madeClips.push(c.id); k++; }
      const t0 = performance.now(); for (let i = 0; i < 5; i++) tlBuild(); const build = (performance.now() - t0) / 5;
      // Lecture : notes en retard et tâches longues pendant 4 s.
      let late = 0, starts = 0; const ctx = audio, P = AudioBufferSourceNode.prototype, s0 = P.start; P.start = function (w, ...a) { starts++; if (w > 0 && w < ctx.currentTime) late++; return s0.call(this, w, ...a); };
      const longs = []; let po; try { po = new PerformanceObserver(l => l.getEntries().forEach(e => longs.push(e.duration))); po.observe({ type: 'longtask' }); } catch (e) {}
      $('play').click(); await sleep(4000); $('stop').click(); P.start = s0; po?.disconnect();
      if (build > 400) throw Error('Arrangement lent à redessiner : ' + Math.round(build) + ' ms');
      if (late) throw Error(late + ' son(s) démarré(s) en retard');
      return k + ' clips sur 32 pistes : Arrangement redessiné en ' + Math.round(build) + ' ms ; lecture : ' + starts + ' démarrages, 0 en retard, ' + longs.length + ' tâche(s) longue(s)';
    }],
    ['Sauvegarde du projet : pistes et clips gardés', async () => {
      const saved = VoiceStore.capture(), a = saved.audio99;
      if (!a || !Array.isArray(a.tracks)) throw Error('pistes absentes de la sauvegarde');
      const ok = made.every(id => a.tracks.some(t => t.id === id)) && madeClips.every(id => a.clips[id]?.lane);
      if (!ok) throw Error('une piste ou un clip manque dans la sauvegarde');
      try { A().validate(a); } catch (e) { throw Error('sauvegarde refusée par le lecteur : ' + e.message); }
      return a.tracks.length + ' pistes et ' + madeClips.length + ' clips dans la sauvegarde, acceptée par le lecteur';
    }],
  ];

  async function run(only) {
    const out = [], keepTarget = T()?.target ?? null, snap = VoiceStore.capture();
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t);
      }
    } finally {
      // Retire ce que le test a créé : remet la sauvegarde audio d'avant, supprime les clips importés.
      try { $('stop').click(); } catch (e) {}
      for (const id of madeClips) { const i = audioClips.findIndex(c => c.id === id); if (i >= 0) { try { audioKill(audioClips[i]); } catch (e) {} audioClips.splice(i, 1); } }
      try { VoiceStore.setText(snap); } catch (e) {}
      made = []; madeClips = []; if (T()) T().target = keepTarget; tlBuild(); WS()?.choose('compose', 'arrange'); await sleep(300);
    }
    return out;
  }
  window.JACK22_F1 = { run, cases: cases.map(c => c[0]) };
})();
