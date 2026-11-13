/* JACK22 — tests de la 7.6 (M5 : effets et courbes par piste audio), à charger dans la page du studio.
   Usage : JACK22_F3.run().then(r => console.table(r)). Pistes, clips, racks créés par le test retirés à la fin. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE, A = () => window.JACK22_AUDIO_EDIT, T = () => window.JACK22_TRACKS145, Rk = () => window.JACK22_RACKS;
  const wav = (sec, hz, name, amp = 6000) => { const sr = 44100, n = Math.round(sec * sr), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * hz * i / sr) * amp), true); return new File([b], name, { type: 'audio/wav' }); };
  const exportWav = async win => {
    let blob = null; const click0 = HTMLAnchorElement.prototype.click, url0 = URL.createObjectURL, map = new Map();
    URL.createObjectURL = function (o) { const u = url0.call(URL, o); map.set(u, o); return u; };
    HTMLAnchorElement.prototype.click = function () { if (this.download && map.has(this.href)) { blob = map.get(this.href); return; } return click0.call(this); };
    const pane = n => [...document.querySelectorAll('[data-dock-pane]')].find(b => b.dataset.dockPane === n);
    try { try { $('stop').click(); } catch (e) {} pane('dockExport')?.click(); await sleep(150); const b = $('expBtn'), end = Date.now() + 240000; while (b.disabled && Date.now() < end) await sleep(100); b.click(); while (!blob && Date.now() < end) await sleep(100); while (b.disabled && Date.now() < end) await sleep(100); }
    finally { HTMLAnchorElement.prototype.click = click0; URL.createObjectURL = url0; pane('studio')?.click(); await sleep(100); WS().choose('compose', 'arrange'); await sleep(200); }
    if (!blob) throw Error('aucun WAV exporté');
    const ab = await blob.arrayBuffer(), a = 44 + Math.floor(win[0] * 44100) * 4, z = Math.min(ab.byteLength, 44 + Math.floor(win[1] * 44100) * 4);
    if (z - a < 4000) throw Error('le WAV exporté (' + ((ab.byteLength - 44) / 176400).toFixed(1) + ' s) ne couvre pas ' + win[0] + ' s : export du pattern au lieu du morceau ?');
    return new Int16Array(ab.slice(a, z - ((z - a) % 2)));
  };
  const songMode = async () => { WS().choose('compose', 'arrange'); await sleep(300); try { setMode('song'); } catch (e) { [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'SONG' && b.offsetWidth)?.click(); } await sleep(200); };
  const peak = x => { let p = 0; for (const v of x) p = Math.max(p, Math.abs(v)); return p; };
  let lane = null, clip = null, madeClips = [];
  const cases = [
    ['Bouton « FX » sur la piste audio', async () => {
      WS().choose('compose', 'arrange'); await sleep(300);
      $('c145Tools').querySelector('button').click(); await sleep(200); lane = T().target;
      const before = new Set(audioClips.map(c => c.id)); await audioImportFile(wav(1, 440, 'm5.wav')); await sleep(200);
      clip = audioClips.find(c => !before.has(c.id)); madeClips.push(clip.id); A().place(clip.id, 90, lane); tlBuild(); await sleep(200);
      const b = document.querySelector('#timeline [data-j99-lane="' + CSS.escape(lane) + '"]')?.parentElement?.querySelector('.c147Fx');
      if (!b) throw Error('bouton FX absent'); if (b.classList.contains('on')) throw Error('FX actif sans réglage');
      b.click(); await sleep(250); const d = $('j100Dialog'); if (!d?.open) throw Error('rack non ouvert');
      const listed = (d.textContent || '').includes('♪ '); d.close(); await sleep(100);
      if (!listed) throw Error('la piste n’apparaît pas dans le menu des racks');
      return 'bouton « FX » sur la piste ; il ouvre le rack d’effets de cette piste (listée « ♪ … ») ; inactif sans réglage';
    }],
    ['Sans réglage : même chemin du son qu’avant', async () => {
      // On espionne la console : sans réglage, aucun canal propre à la piste ne doit être demandé.
      const E = engine, pn = E.productionNode, asked = [];
      E.productionNode = function (key) { asked.push(key); return pn.apply(this, arguments); };
      try { window.J97AudioNode(audio, clip, audio.destination); } finally { E.productionNode = pn; }
      if (asked.includes(lane)) throw Error('un canal propre à la piste est créé sans réglage');
      if (!asked.includes('imports')) throw Error('le clip ne passe plus par « Audio importé » (canaux demandés : ' + asked.join(', ') + ')');
      return 'piste sans réglage : le clip passe par « Audio importé », comme avant (aucun canal propre créé)';
    }],
    ['Rack sur la piste : entendu dans le WAV', async () => {
      // Clip à 30 s ; trois exports avec un rack « Gain » à 0, −12 et −24 dB sur la piste. La part du clip seul se mesure par
      // différence avec −24 dB (le reste du projet, s'il joue aussi, s'annule) : rapport attendu (0,251 − 0,063) / (1 − 0,063).
      A().place(clip.id, 30, lane); await songMode(); const win = [30.2, 30.8];
      // Un test précédent peut avoir laissé un canal en solo ou l'audio coupé (le clip serait alors muet, comme sur une vraie console) :
      // on part d'un état sans solo ni coupure ; la sauvegarde d'avant le test est remise à la fin.
      try { const prod = window.JACK22_PRODUCTION.config; for (const k of Object.keys(prod.mix || {})) { prod.mix[k].solo = false; prod.mix[k].mute = false; } const v = VoiceStore.capture(); v.production97 = prod; VoiceStore.setText(v); } catch (e) {}
      try { if (audioMute) { audioMute = false; audioApplyGain(); } } catch (e) {}
      // Même chose pour la courbe de volume général de l'atelier (un test précédent la laisse descendre à 0 après la mesure 2) : coupée
      // pendant la mesure, remise ensuite.
      const auto = $('v8AutoOn'), wasAuto = !!auto?.checked, applyAuto = on => { auto.checked = on; $('v8ApplyAuto').click(); };
      if (wasAuto) { applyAuto(false); await sleep(100); }
      try {
      const setDb = async db => { Rk().apply(s => { s.chains[lane] = [{ id: 'm5gain', type: 'gain', on: true, params: { db } }]; }); await sleep(200); };
      await setDb(0); const w0 = await exportWav(win);
      await setDb(-12); const w1 = await exportWav(win);
      await setDb(-24); const wm = await exportWav(win);      // −24 dB : le minimum du rack « Gain »
      const dpk = (x, y) => { let p = 0; for (let i = 0; i < Math.min(x.length, y.length); i++) p = Math.max(p, Math.abs(x[i] - y[i])); return p; };
      const ratio = dpk(w1, wm) / dpk(w0, wm), want = (0.2512 - 0.0631) / (1 - 0.0631);
      await setDb(-12);
      if (!(Math.abs(ratio - want) < 0.03)) {
        let diag = ''; try { const c = audioClips.find(x => x.id === clip.id); diag = ' [crêtes 0 dB ' + peak(w0) + ', −24 dB ' + peak(wm) + ' ; clip ' + (c ? 'présent, début ' + A().seconds?.(c) + ' s, piste ' + A().lane(c.id) + (c.mute ? ', muet' : '') + (c.gain != null ? ', gain ' + c.gain : '') : 'ABSENT') + ' ; réglages piste ' + window.JACK22_CONSOLE147.has(lane) + ' ; clip coupé console ' + !!window.JACK22_PRODUCTION?.config?.clips?.[clip.id]?.mute + ' ; mode ' + (typeof playMode !== 'undefined' ? playMode : '?') + ']'; } catch (e) { diag = ' [diag : ' + e.message + ']'; }
        throw Error('gain −12 dB du rack : part du clip × ' + ratio.toFixed(3) + ' au lieu de × ' + want.toFixed(3) + diag);
      }
      tlBuild(); const b = document.querySelector('#timeline [data-j99-lane="' + CSS.escape(lane) + '"]')?.parentElement?.querySelector('.c147Fx');
      if (!b?.classList.contains('on')) throw Error('bouton FX non signalé actif');
      return 'rack « Gain −12 dB » sur la piste : part du clip × ' + ratio.toFixed(3) + ' dans le WAV (attendu × ' + want.toFixed(3) + ') ; bouton FX en rouge';
      } finally { if (wasAuto) { applyAuto(true); await sleep(100); } }
    }],
    ['Courbes : la piste est une cible', async () => {
      window.JACK22_AUTOMATION.open(); await sleep(250); const d = $('j101Dialog'); const txt = d?.textContent || ''; d?.close?.(); await sleep(100);
      if (!/♪ /.test(txt)) throw Error('la piste n’apparaît pas dans les courbes');
      return 'la piste (« ♪ … ») est proposée comme cible dans « Courbes d’effets »';
    }],
    ['Sauvegarde : racks de piste acceptés, ancien projet aussi', async () => {
      const v = VoiceStore.capture(); if (!v.rack100?.chains?.[lane]) throw Error('rack de la piste absent de la sauvegarde');
      if (!VoiceStore.parse(v)) throw Error('sauvegarde refusée');
      const old = JSON.parse(JSON.stringify(v)); delete old.rack100.chains[lane]; if (!VoiceStore.parse(old)) throw Error('ancienne sauvegarde refusée');
      return 'rack de la piste dans la sauvegarde, acceptée ; ancienne sauvegarde (sans réglage de piste) acceptée';
    }],
  ];
  async function run(only) {
    const out = [], snap = VoiceStore.capture(), mode = (() => { try { return playMode; } catch (e) { return null; } })();
    try { for (const [name, fn] of cases) { if (only && !only.test(name)) continue; const t = performance.now(); try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); } out.at(-1).ms = Math.round(performance.now() - t); } }
    finally {
      try { $('stop').click(); } catch (e) {}
      try { Rk().apply(s => { if (lane) delete s.chains[lane]; }); } catch (e) {}
      for (const id of madeClips) { const i = audioClips.findIndex(c => c.id === id); if (i >= 0) { try { audioKill(audioClips[i]); } catch (e) {} audioClips.splice(i, 1); } }
      try { VoiceStore.setText(snap); } catch (e) {}
      if (mode === 'pattern') [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'PATTERN' && b.offsetWidth)?.click();
      madeClips = []; lane = null; tlBuild(); WS()?.choose('compose', 'arrange'); await sleep(300);
    }
    return out;
  }
  window.JACK22_F3 = { run, cases: cases.map(c => c[0]) };
})();
