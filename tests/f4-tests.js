/* JACK22 — tests de la 7.7 (M6 : pistes séparées par piste audio), à charger dans la page du studio.
   Usage : JACK22_F4.run().then(r => console.table(r)). Pistes, clips, racks créés par le test retirés à la fin ; option remise. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const A = () => window.JACK22_AUDIO_EDIT, T = () => window.JACK22_TRACKS145, Rk = () => window.JACK22_RACKS, S = () => window.JACK22_STEMS148;
  const wav = (sec, hz, name, amp = 6000) => { const sr = 44100, n = Math.round(sec * sr), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * hz * i / sr) * amp), true); return new File([b], name, { type: 'audio/wav' }); };
  // Lance « Exporter les pistes séparées en ZIP » et récupère le ZIP sans le télécharger.
  const stemsZip = async () => {
    let blob = null; const click0 = HTMLAnchorElement.prototype.click, url0 = URL.createObjectURL, map = new Map();
    URL.createObjectURL = function (o) { const u = url0.call(URL, o); map.set(u, o); return u; };
    HTMLAnchorElement.prototype.click = function () { if (this.download && map.has(this.href)) { blob = map.get(this.href); return; } return click0.call(this); };
    try { try { $('stop').click(); } catch (e) {} await sleep(200); await window.JACK22_PRODUCTION.stems(); }
    finally { HTMLAnchorElement.prototype.click = click0; URL.createObjectURL = url0; }
    if (!blob) throw Error('aucun ZIP exporté');
    return blob;
  };
  // ZIP « store » : [{name, data(ArrayBuffer)}]
  const unzip = async blob => {
    const ab = await blob.arrayBuffer(), v = new DataView(ab), dec = new TextDecoder(), out = []; let o = 0;
    while (o + 30 <= ab.byteLength && v.getUint32(o, true) === 0x04034b50) {
      const method = v.getUint16(o + 8, true), size = v.getUint32(o + 18, true), n = v.getUint16(o + 26, true), e = v.getUint16(o + 28, true);
      const name = dec.decode(new Uint8Array(ab, o + 30, n)), start = o + 30 + n + e;
      if (method !== 0) throw Error('ZIP compressé inattendu');
      out.push({ name, data: ab.slice(start, start + size) }); o = start + size;
    }
    return out;
  };
  const wavPeak = ab => { const x = new Int16Array(ab.slice(44, ab.byteLength - ((ab.byteLength - 44) % 2))); let p = 0; for (const s of x) p = Math.max(p, Math.abs(s)); return p; };
  let lanes = [], madeClips = [], was = null;
  const newLane = async () => { $('c145Tools').querySelector('button').click(); await sleep(200); const id = T().target; lanes.push(id); return id; };
  const newClip = async (lane, sec) => { const before = new Set(audioClips.map(c => c.id)); await audioImportFile(wav(1, 440, 'm6.wav')); await sleep(200); const c = audioClips.find(x => !before.has(x.id)); madeClips.push(c.id); A().place(c.id, sec, lane); return c; };
  const cases = [
    ['Option éteinte par défaut : un fichier par clip, comme avant', async () => {
      if (S().on) throw Error('option allumée au départ');
      if (window.J22StemGroups(audioClips) !== null) throw Error('les clips sont groupés alors que l’option est éteinte');
      return 'option éteinte : l’export séparé reste un fichier « audio-<n°>.wav » par clip, comme en 7.6';
    }],
    ['Case dans Production › Export séparé', async () => {
      window.JACK22_PRODUCTION.open('export'); await sleep(250);
      const i = $('c148ByTrack'), d = $('j97Dialog'); const ok = !!i && !i.checked && /piste audio/.test(i.parentElement?.textContent || ''); d?.close?.(); await sleep(100);
      if (!ok) throw Error('case « Un fichier par piste audio » absente ou cochée');
      return 'case « Un fichier par piste audio du montage » sous le bouton d’export séparé, décochée';
    }],
    ['ZIP : un fichier par piste, nommé comme elle, avec ses effets', async () => {
      WS().choose('compose', 'arrange'); await sleep(300);
      const la = await newLane(), lb = await newLane();
      const ca = await newClip(la, 0.2), cb1 = await newClip(lb, 0.2), cb2 = await newClip(lb, 1.6); tlBuild(); await sleep(200);
      const na = A().settings.tracks.find(t => t.id === la).name, nb = A().settings.tracks.find(t => t.id === lb).name;
      // État d'un test précédent : ni solo, ni coupure, ni courbe master (remis à la fin).
      try { const prod = window.JACK22_PRODUCTION.config; for (const k of Object.keys(prod.mix || {})) { prod.mix[k].solo = false; prod.mix[k].mute = false; } const v = VoiceStore.capture(); v.production97 = prod; VoiceStore.setText(v); } catch (e) {}
      try { if (audioMute) { audioMute = false; audioApplyGain(); } } catch (e) {}
      const auto = $('v8AutoOn'), wasAuto = !!auto?.checked, applyAuto = on => { auto.checked = on; $('v8ApplyAuto').click(); };
      if (wasAuto) { applyAuto(false); await sleep(100); }
      try {
        // Rack « Gain » : 0 dB sur la piste A, −12 dB sur la piste B (les deux passent ainsi par leur propre canal).
        Rk().apply(s => { s.chains[la] = [{ id: 'm6a', type: 'gain', on: true, params: { db: 0 } }]; s.chains[lb] = [{ id: 'm6b', type: 'gain', on: true, params: { db: -12 } }]; }); await sleep(200);
        S().set(true);
        const files = await unzip(await stemsZip()), names = files.map(f => f.name);
        const fa = files.find(f => f.name.endsWith('-' + na.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-') + '.wav'));
        const fb = files.find(f => f.name.endsWith('-' + nb.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-') + '.wav'));
        if (!fa || !fb) throw Error('fichiers des pistes absents (ZIP : ' + names.join(', ') + ')');
        if ([ca, cb1, cb2].some(c => names.includes('audio-' + c.id + '.wav'))) throw Error('un clip a encore son fichier à lui');
        // Piste B : deux clips dans un seul fichier → du son autour de 0,2 s ET autour de 1,6 s.
        const seg = (ab, a, z) => { const x = new Int16Array(ab.slice(44 + Math.floor(a * 44100) * 4, 44 + Math.floor(z * 44100) * 4)); let p = 0; for (const s of x) p = Math.max(p, Math.abs(s)); return p; };
        const b1 = seg(fb.data, 0.4, 0.9), b2 = seg(fb.data, 1.8, 2.3);
        if (!(b1 > 50 && b2 > 50)) throw Error('le fichier de la piste B ne contient pas ses deux clips (crêtes ' + b1 + ' / ' + b2 + ')');
        const pa = wavPeak(fa.data), pb = wavPeak(fb.data), ratio = pb / pa;
        if (!(Math.abs(ratio - 0.251) < 0.03)) throw Error('rack −12 dB de la piste B : crête × ' + ratio.toFixed(3) + ' au lieu de × 0.251 (A ' + pa + ', B ' + pb + ')');
        return names.length + ' fichiers ; « ' + fa.name + ' » et « ' + fb.name + ' » (2 clips dans un seul fichier) ; rack −12 dB entendu : × ' + ratio.toFixed(3) + ' (attendu × 0.251)';
      } finally { if (wasAuto) { applyAuto(true); await sleep(100); } }
    }],
    ['Option éteinte de nouveau : retour au fichier par clip', async () => {
      S().set(false);
      if (window.J22StemGroups(audioClips) !== null) throw Error('les clips restent groupés');
      return 'case décochée : un fichier par clip, comme avant';
    }],
  ];
  const WS = () => window.JACK22_WORKSPACE;
  async function run(only) {
    const out = [], snap = VoiceStore.capture(); was = S().on;
    try { for (const [name, fn] of cases) { if (only && !only.test(name)) continue; const t = performance.now(); try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); } out.at(-1).ms = Math.round(performance.now() - t); } }
    finally {
      try { $('stop').click(); } catch (e) {}
      try { S().set(was); } catch (e) {}
      try { Rk().apply(s => { for (const l of lanes) delete s.chains[l]; }); } catch (e) {}
      for (const id of madeClips) { const i = audioClips.findIndex(c => c.id === id); if (i >= 0) { try { audioKill(audioClips[i]); } catch (e) {} audioClips.splice(i, 1); } }
      try { VoiceStore.setText(snap); } catch (e) {}
      madeClips = []; lanes = []; tlBuild(); WS()?.choose('compose', 'arrange'); await sleep(300);
    }
    return out;
  }
  window.JACK22_F4 = { run, cases: cases.map(c => c[0]) };
})();
