/* JACK22 — 7.9 : les Mute survivent à « Sauvegarder », à la fermeture du navigateur et à « Charger ».
   Étape 1 (JACK22_F6SAVE.step1) : projet de test, coupures par les vrais boutons M, harmoniques à 73 %, Sauvegarder.
   Étape 2 (JACK22_F6SAVE.step2, dans un navigateur rouvert) : Charger, relever les états, rendu WAV coupé puis réactivé. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE, P = () => window.JACK22_PRODUCTION;
  const until = async (ok, ms = 3000, step = 50) => { const end = Date.now() + ms; while (!ok() && Date.now() < end) await sleep(step); return ok(); };
  const wav = (sec, hz, name, amp = 6000) => { const sr = 44100, n = Math.round(sec * sr), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * hz * i / sr) * amp), true); return new File([b], name, { type: 'audio/wav' }); };
  const NOTE = (start, dur, preset, midi) => ({ start, dur, preset, octave: Math.floor(midi / 12) - 1, idx: midi % 12, velocity: 100 });
  const rows = () => [...document.querySelectorAll('#tlRows>.tl-row')];
  const rowOf = pred => rows().find(pred);
  const M = { melody: () => rowOf(r => r.querySelector('.tl-lane')?.dataset.ti === '2'), inst: () => rowOf(r => r.querySelector('b')?.textContent === 'Test Sauvegarde'), take: () => rowOf(r => r.classList.contains('c150TakeRow')), audio: () => rowOf(r => r.querySelector('.tl-lane')?.dataset.j99Lane === 'audio'), voice: () => rowOf(r => /^VOIX \d/.test(r.querySelector('b')?.textContent || '') && !r.classList.contains('dockEmptyVoice')) };
  const proxy = k => M[k]()?.querySelector('.tl-label .dockRowMute');
  const pressed = k => proxy(k)?.getAttribute('aria-pressed') === 'true';
  const clickM = async k => { WS().choose('compose', 'arrange'); await sleep(120); tlBuild(); await sleep(120); const p = proxy(k); if (!p) throw Error('pas de M pour ' + k); if (p.disabled) throw Error('M inactif pour ' + k); p.click(); await sleep(120); };
  const states = () => ({ melody: pressed('melody'), inst: pressed('inst'), take: pressed('take'), audio: pressed('audio'), voice: pressed('voice'), harm: $('harmAmt').value, harmPanel: $('c150Harm')?.value, takeMuted: !!(window.J22TakeMuted && window.J22TakeMuted()) });

  async function step1() {
    initAudio(); try { await audio.resume(); } catch (e) {}
    activePat(2).notes = []; for (let s = 0; s < activePat(2).steps; s += 4) activePat(2).notes.push(NOTE(s, 3, 'lead', 84));
    activePat(1).notes = []; for (let s = 0; s < activePat(1).steps; s += 8) activePat(1).notes.push(NOTE(s, 6, 'sub808', 43));
    const key = P().addTrack('Test Sauvegarde'), ti = song.tracks.findIndex(t => t.key === key);
    activePat(ti).notes = []; for (let s = 0; s < activePat(ti).steps; s += 4) activePat(ti).notes.push(NOTE(s + 1, 3, 'pad', 77));
    take = makeTake([0, 4, 8, 12, 16, 20, 24, 28].map(s => ({ start: s + 2, dur: 2, preset: 'pluck', octave: 5, idx: 8 })), 2, getBpm()); drawTake(); uiRec();
    const before = new Set(audioClips.map(c => c.id)); $('l3Demo').click(); await until(() => audioClips.some(c => c.voice && !before.has(c.id)), 8000); await until(() => !window.Jack22Lot3?.pending, 30000, 100);
    const b2 = new Set(audioClips.map(c => c.id)); await audioImportFile(wav(3, 1500, 'sauvegarde.wav')); await sleep(200); const w = audioClips.find(c => !b2.has(c.id)); try { window.JACK22_AUDIO_EDIT.place(w.id, 0, 'audio'); } catch (e) {}
    setMode('pattern'); buildPatternUI(); tlBuild(); await sleep(300);
    for (const k of ['melody', 'inst', 'take', 'audio', 'voice']) await clickM(k);
    const h = $('harmAmt'); h.value = '73'; h.dispatchEvent(new Event('input', { bubbles: true })); h.dispatchEvent(new Event('change', { bubbles: true }));
    const s = states();
    $('save').click(); await sleep(200); await until(() => !persistBusy, 30000, 100); await sleep(500);
    return { avant: s, statut: ($('status')?.textContent || '').slice(0, 160) };
  }
  async function step2() {
    window.confirm = () => true; initAudio(); try { await audio.resume(); } catch (e) {}
    $('load').click(); await sleep(300); await until(() => !persistBusy && song.tracks.some(t => t.label === 'Test Sauvegarde'), 30000, 100); await sleep(800);
    if (!song.tracks.some(t => t.label === 'Test Sauvegarde')) throw Error('le projet sauvegardé ne s’est pas rechargé');
    await until(() => !window.Jack22Lot3?.pending && (!window.l3Ready || window.l3Ready()), 60000, 200);   // traitements de la voix recalculés après le chargement
    WS().choose('compose', 'arrange'); await sleep(200); tlBuild(); await sleep(300); window.J22MuteSync && window.J22MuteSync();
    const s = states();
    const F = window.JACK22_F6WAV; let sound = null;
    if (F) {
      $('expLoops').value = '1';
      const exp = async () => {
        let blob = null; const click0 = HTMLAnchorElement.prototype.click, url0 = URL.createObjectURL, map = new Map();
        URL.createObjectURL = function (o) { const u = url0.call(URL, o); map.set(u, o); return u; };
        HTMLAnchorElement.prototype.click = function () { if (this.download && map.has(this.href)) { blob = map.get(this.href); return; } return click0.call(this); };
        const pane = n => [...document.querySelectorAll('[data-dock-pane]')].find(b => b.dataset.dockPane === n);
        try { pane('dockExport')?.click(); await sleep(150); const b = $('expBtn'), end = Date.now() + 240000; while (b.disabled && Date.now() < end) await sleep(100); b.click(); while (!blob && Date.now() < end) await sleep(100); while (b.disabled && Date.now() < end) await sleep(100); }
        finally { HTMLAnchorElement.prototype.click = click0; URL.createObjectURL = url0; pane('studio')?.click(); await sleep(100); WS().choose('compose', 'arrange'); await sleep(200); }
        const ab = await blob.arrayBuffer(), d = new DataView(ab), n = (ab.byteLength - 44) >> 2, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = (d.getInt16(44 + i * 4, true) + d.getInt16(46 + i * 4, true)) / 65536; return F.measure(x);
      };
      const muted = await exp();
      // Contrôle de la voix sans la 808 ni la batterie : le glissé de hauteur de la 808 traverse la bande mesurée pour la voix.
      M.bass = () => rowOf(r => r.querySelector('.tl-lane')?.dataset.ti === '1'); M.drums = () => rowOf(r => r.querySelector('.tl-lane')?.dataset.ti === '0');
      await clickM('bass'); await clickM('drums');
      const mutedNoBass = await exp();
      for (const k of ['melody', 'inst', 'take', 'audio', 'voice']) await clickM(k);
      const openNoBass = await exp();
      await clickM('bass'); await clickM('drums');
      const open = await exp(), pct = k => open[k] > 0 ? Math.round(100 * muted[k] / open[k]) : null;
      sound = { melodie: pct('melody'), instrument: pct('inst'), prise: pct('take'), wav: pct('wav'), voix: pct('voice'), voix_sans_808_ni_batterie: openNoBass.voice > 0 ? Math.round(1000 * mutedNoBass.voice / openNoBass.voice) / 10 : null, basse: pct('bass'), batterie: pct('drums') };
    }
    return { apres: s, son_coupe_en_pourcent_du_son_reactive: sound, statut: ($('status')?.textContent || '').slice(0, 160) };
  }
  window.JACK22_F6SAVE = { step1, step2 };
})();
