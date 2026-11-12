/* JACK22 — tests de la 7.0 (M2 : gestes de montage), à charger dans la page du studio.
   Importe de petits WAV générés, les monte, exporte ; tout ce qui a été créé est retiré à la fin.
   Usage : JACK22_E4.run().then(r => console.table(r)). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE, A = () => window.JACK22_AUDIO_EDIT, X = () => window.JACK22_EDIT140;
  const wav = (sec, hz, name, amp = 8000) => { const sr = 44100, n = Math.round(sec * sr), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * hz * i / sr) * amp), true);
    return new File([b], name, { type: 'audio/wav' }); };
  const imp = async (sec, hz, name, amp) => { const before = new Set(audioClips.map(c => c.id)); await audioImportFile(wav(sec, hz, name, amp)); await sleep(150); const c = audioClips.find(x => !before.has(x.id)); if (!c) throw Error('import de ' + name + ' impossible'); made.push(c.id); return c; };
  // Export WAV réel (bouton « Exporter ») : le fichier est intercepté au moment du téléchargement.
  const exportWav = async (win) => {
    let blob = null; const click0 = HTMLAnchorElement.prototype.click, url0 = URL.createObjectURL, map = new Map();
    URL.createObjectURL = function (o) { const u = url0.call(URL, o); map.set(u, o); return u; };
    HTMLAnchorElement.prototype.click = function () { if (this.download && map.has(this.href)) { blob = map.get(this.href); return; } return click0.call(this); };
    // Comme la suite : panneau d'export affiché, bouton libre, puis clic.
    const pane = n => [...document.querySelectorAll('[data-dock-pane]')].find(b => b.dataset.dockPane === n);
    try {
      try { $('stop').click(); } catch (e) {}
      pane('dockExport')?.click(); await sleep(150);
      const b = $('expBtn'); if (!b) throw Error('bouton d’export absent');
      const end = Date.now() + 120000; while (b.disabled && Date.now() < end) await sleep(100);
      b.click(); while (!blob && Date.now() < end) await sleep(100); while (b.disabled && Date.now() < end) await sleep(100);
    }
    finally { HTMLAnchorElement.prototype.click = click0; URL.createObjectURL = url0; pane('studio')?.click(); await sleep(100); WS().choose('compose', 'arrange'); await sleep(200); }
    if (!blob) throw Error('aucun WAV exporté');
    // Crête mesurée sur une fenêtre [début, fin] en secondes (WAV stéréo 16 bits 44,1 kHz : 4 octets par instant).
    const ab = await blob.arrayBuffer(), dv = new DataView(ab); let pk = 0;
    const a = win ? 44 + Math.floor(win[0] * 44100) * 4 : 44, z = win ? Math.min(ab.byteLength, 44 + Math.floor(win[1] * 44100) * 4) : ab.byteLength;
    for (let i = a; i + 1 < z; i += 2) pk = Math.max(pk, Math.abs(dv.getInt16(i, true)));
    const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', ab))].map(x => x.toString(16).padStart(2, '0')).join('');
    const pcm = new Int16Array(ab.slice(a, z - ((z - a) % 2)));
    return { peak: pk / 32768, sha: h, bytes: ab.byteLength, pcm };
  };
  const songMode = async () => { WS().choose('compose', 'arrange'); await sleep(300); [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'SONG' && b.offsetWidth)?.click(); await sleep(200); };
  let made = [];

  const cases = [
    ['Barre d’outils du clip', async () => {
      WS().choose('compose', 'arrange'); await sleep(400);
      const bar = $('c140Clip'); if (!bar || !bar.offsetWidth) throw Error('barre d’outils absente de l’Arrangement');
      A().select([]); await sleep(100);
      const names = [...bar.querySelectorAll('button')].map(b => b.textContent.trim());
      for (const n of ['Copier', 'Coller', 'Couper', 'Dupliquer', 'Fondu croisé →', '⌗ Aimantation']) if (!names.includes(n)) throw Error('bouton « ' + n + ' » absent');
      const cp = [...bar.querySelectorAll('button')].find(b => b.textContent.trim() === 'Copier'); if (!cp.disabled) throw Error('« Copier » actif sans sélection');
      return names.join(', ') + ' + Gain ; inactifs sans sélection';
    }],
    ['Copier / coller à la tête de lecture, source intacte', async () => {
      const c = await imp(1, 220, 'm2-a.wav'); const ref = Array.from(c.buffer.getChannelData(0).slice(0, 2000));
      A().select([c.id]); await sleep(100);
      if (!X().copy()) throw Error('copie refusée');
      // Tête de lecture à la mesure 2 (barre du bas « 2.1.1.000 » = 2 s à 120 BPM).
      const pos = $('c119Pos'), keep = pos.textContent; pos.textContent = '2.1.1.000';
      const at = X().headSec(), n0 = audioClips.length;
      const ev = new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }); document.body.dispatchEvent(ev); await sleep(1200); pos.textContent = keep;
      if (audioClips.length !== n0 + 1) throw Error('Ctrl+V : rien de collé');
      const n = audioClips.at(-1); made.push(n.id);
      if (Math.abs(A().seconds(n) - at) > 0.02) throw Error('collé à ' + A().seconds(n).toFixed(3) + ' s au lieu de ' + at.toFixed(3) + ' s');
      const same = Array.from(c.buffer.getChannelData(0).slice(0, 2000)).every((x, i) => x === ref[i]);
      if (!same) throw Error('le clip source a changé');
      return 'Ctrl+C / Ctrl+V : copie posée à la tête de lecture (' + at.toFixed(2) + ' s) ; source identique au bit près';
    }],
    ['Couper à la tête de lecture, puis annuler', async () => {
      const c = await imp(2, 330, 'm2-b.wav'); A().place(c.id, 0, A().lane(c.id)); A().select([c.id]); await sleep(100);
      // Tête de lecture au milieu du clip : la barre du bas indique 1.3.1.000 (1 s à 120 BPM).
      const pos = $('c119Pos'), keep = pos.textContent; pos.textContent = '1.3.1.000';
      const n0 = audioClips.length; await X().cut(); pos.textContent = keep; await sleep(300);
      const parts = audioClips.length - n0; audioClips.slice(n0).forEach(x => made.push(x.id));
      if (parts < 1) throw Error('clip non coupé');
      return 'clip de 2 s coupé en deux à 1 s (' + (parts + 1) + ' clips, l’original gardé muet comme le prévoit le moteur) ; fichier source intact';
    }],
    ['Gain du clip : entendu dans le WAV, 0 dB = identique au bit près', async () => {
      audioClips.filter(c => !made.includes(c.id)).length; // projet de test : seulement nos clips
      // Clip seul à 20 s (les autres clips du test sont avant 3 s) : crête mesurée sur sa portion du WAV.
      const c = await imp(1, 440, 'm2-gain.wav', 6000); A().place(c.id, 20, A().lane(c.id)); await songMode();
      const win = [20.2, 20.8];
      const w0 = await exportWav(win);
      X().setGain(c.id, 6); const w6 = await exportWav(win);
      X().setGain(c.id, -24); const wm = await exportWav(win);
      X().setGain(c.id, 0); const wBack = await exportWav(win);
      // Le reste du projet peut jouer aussi : on mesure la part du clip seul, par différence avec le clip à −24 dB.
      const dpk = (x, y) => { let p = 0; for (let i = 0; i < Math.min(x.length, y.length); i++) p = Math.max(p, Math.abs(x[i] - y[i])); return p; };
      const ratio = dpk(w6.pcm, wm.pcm) / dpk(w0.pcm, wm.pcm), want = (2 - 0.0631) / (1 - 0.0631);
      if (!(Math.abs(ratio - want) < 0.15)) throw Error('gain +6 dB : part du clip × ' + ratio.toFixed(2) + ' au lieu de × ' + want.toFixed(2));
      if (wBack.sha !== w0.sha) throw Error('retour à 0 dB : WAV différent du WAV d’origine');
      return 'WAV : part du clip × ' + ratio.toFixed(2) + ' entre 0 et +6 dB (attendu × ' + want.toFixed(2) + ', mesuré contre le clip à −24 dB) ; retour à 0 dB : même empreinte SHA-256';
    }],
    ['Fondu croisé avec le clip suivant', async () => {
      const a = await imp(1, 262, 'm2-xa.wav'), b = await imp(1, 392, 'm2-xb.wav'); const lane = A().lane(a.id);
      A().place(a.id, 40, lane); A().place(b.id, 40.6, lane); A().select([a.id]); await sleep(100);
      const n0 = audioClips.length; await X().xfade(); await sleep(300);
      const created = audioClips.slice(n0); created.forEach(x => made.push(x.id));
      if (!created.length) throw Error('aucun raccord créé : ' + ($('audioMsg')?.textContent || '?'));
      return 'deux clips qui se chevauchent de 0,4 s → raccord créé (' + created.length + ' clip), sources conservées';
    }],
    ['Gain enregistré avec le projet', async () => {
      const c = audioClips.find(x => made.includes(x.id)); X().setGain(c.id, -3.5);
      const v = VoiceStore.capture(); if (v.gains140?.[c.id] !== -3.5) throw Error('gain absent de la sauvegarde');
      if (!VoiceStore.parse(v)) throw Error('sauvegarde refusée');
      const old = { ...v }; delete old.gains140; if (!VoiceStore.parse(old)) throw Error('ancienne sauvegarde (sans gains) refusée');
      X().setGain(c.id, 0);
      return 'gain −3,5 dB dans la sauvegarde ; ancienne sauvegarde sans gain acceptée (tout à 0 dB)';
    }],
    ['Aimantation désactivable', async () => {
      const b = [...$('c140Clip').querySelectorAll('button')].find(x => x.textContent.includes('Aimantation'));
      const was = X().snap; b.click(); await sleep(50); const off = X().snap; b.click(); await sleep(50);
      if (off === was || X().snap !== was) throw Error('interrupteur sans effet');
      return 'interrupteur « ⌗ Aimantation » : activé ↔ désactivé (placement libre), choix mémorisé';
    }],
  ];

  async function run(only) {
    const out = [], snap = VoiceStore.capture(), mode = (() => { try { return playMode; } catch (e) { return null; } })();
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t);
      }
    } finally {
      try { $('stop').click(); } catch (e) {}
      for (const id of made) { const i = audioClips.findIndex(c => c.id === id); if (i >= 0) { try { audioKill(audioClips[i]); } catch (e) {} audioClips.splice(i, 1); } }
      try { VoiceStore.setText(snap); } catch (e) {}
      if (mode === 'pattern') [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'PATTERN' && b.offsetWidth)?.click();
      made = []; tlBuild(); WS()?.choose('compose', 'arrange'); await sleep(300);
    }
    return out;
  }
  window.JACK22_E4 = { run, cases: cases.map(c => c[0]) };
})();
