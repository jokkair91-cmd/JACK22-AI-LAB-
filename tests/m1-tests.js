/* JACK22 — Mission 1 : tests de la copie portable (.jack22.zip).
   Dans la console du studio : await JACK22_M1.all()  (aucun son joué, rien n'est téléchargé).
   Utilitaires : JACK22_M1.fill(n) met n clips audio courts ; JACK22_M1.exportBlob() rend l'archive ; JACK22_M1.importBlob(b) la rouvre. */
(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const status = () => (document.getElementById('status') || {}).textContent || '';
  function wav(i, sr = 22050, sec = 0.25) {                   // WAV mono 16 bits, contenu propre à chaque clip
    const n = Math.round(sr * sec), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), s = (o, t) => [...t].forEach((c, k) => v.setUint8(o + k, c.charCodeAt(0)));
    s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
    for (let k = 0; k < n; k++) v.setInt16(44 + k * 2, Math.round(8000 * Math.sin(2 * Math.PI * (110 + 20 * i) * k / sr) * Math.min(1, (n - k) / 200)), true);
    return b;
  }
  async function clip(i) {
    initAudio(); const bytes = wav(i), blob = new Blob([bytes], { type: 'audio/wav' }), buf = await audio.decodeAudioData(bytes.slice(0));
    return { id: audioNextId++, name: 'M1 clip ' + String(i + 1).padStart(2, '0') + ' · é', duration: buf.duration, buffer: buf, startBar: i % Math.max(1, song.bars), peaks: audioPeaks(buf, 800), blob, type: 'wav', size: blob.size, fileId: newFileId(), hash: null, stored: false, missing: false, why: null, voice: null };
  }
  async function fill(n) {
    if (state !== 'stopped') stop(); audioKill();
    const cs = []; for (let i = 0; i < n; i++) cs.push(await clip(i));
    audioClips.splice(0, audioClips.length, ...cs); syncAudioUi(); tlBuild(); return audioClips.length;
  }
  async function exportBlob() {                                // lance l'export du studio et récupère l'archive au lieu de la télécharger
    const ou = URL.createObjectURL, oc = HTMLAnchorElement.prototype.click, oconf = window.confirm; let got = null;
    URL.createObjectURL = o => { if (o instanceof Blob && o.type === 'application/zip') got = o; return ou.call(URL, o); };
    HTMLAnchorElement.prototype.click = function () { if (this.download && /\.jack22\.zip$/.test(this.download)) return; return oc.call(this); };
    window.confirm = () => true;
    try { await ProjectTransfer.exportProject(); } finally { URL.createObjectURL = ou; HTMLAnchorElement.prototype.click = oc; window.confirm = oconf; }
    return { blob: got, status: status() };
  }
  async function importBlob(blob, answer = true) {
    const oconf = window.confirm; window.confirm = () => answer;
    try { await ProjectTransfer.importFile(new File([blob], 'test.jack22.zip', { type: 'application/zip' })); } finally { window.confirm = oconf; }
    return status();
  }
  const clipsSig = () => audioClips.map(c => [c.name, c.startBar, c.size, c.hash, Math.round(c.duration * 1000)]);
  function projectSig() {                                      // ce qui doit revenir à l'identique : tout le projet sauvegardé + les clips audio
    const w = ProjectPersistence.wrapper(null); return JSON.stringify({ w, clips: clipsSig(), level: audioLevel, mute: audioMute });
  }
  // Archive valide construite par le composant ZIP du studio, puis modifiée octet par octet.
  async function tamper(blob, fn) { const u = new Uint8Array(await blob.arrayBuffer()); fn(u); return new Blob([u]); }
  async function readOk(blob) { try { await Zip.read(blob); return 'ok'; } catch (e) { return 'refusé : ' + e.message; } }

  async function zipLimits() {                                  // composant seul : 0 à 27 audios, puis au-delà
    const out = [];
    for (const n of [0, 1, 11, 12, 24, 27, 28]) {
      const entries = [{ name: 'manifest.json', blob: new Blob(['{}']) }];
      for (let i = 0; i < n; i++) entries.push({ name: 'audio/' + String(i + 1).padStart(2, '0') + '-a.wav', blob: new Blob([wav(i, 8000, 0.02)]) });
      out.push({ audios: n, entrees: n + 1, lecture: await readOk(await Zip.build(entries)) });
    }
    return out;
  }
  async function roundTrip(n) {                                 // interface complète : export puis réouverture dans cette page
    await fill(n); const ex = await exportBlob(), before = projectSig();   // l'export calcule l'empreinte des clips : photo après l'export
    if (!ex.blob) return { audios: n, export: ex.status };
    await fill(0); const imp = await importBlob(ex.blob), after = projectSig();
    return { audios: n, taille: ex.blob.size, export: ex.status.slice(0, 60), import: imp.slice(0, 70), identique: before === after, clips: audioClips.length };
  }
  async function corrupt() {                                    // archives abîmées : refus clair, projet ouvert intact
    await fill(12); const ex = await exportBlob(), sig = projectSig(), res = {};
    const u = new Uint8Array(await ex.blob.arrayBuffer());
    const firstData = 30 + new DataView(u.buffer).getUint16(26, true);          // premier octet du manifest
    const audioStart = (() => { const dv = new DataView(u.buffer); let o = 0; o += 30 + dv.getUint16(26, true) + dv.getUint32(18, true); return o + 30 + dv.getUint16(o + 26, true) + 100; })();
    const cases = {
      'octet audio modifié (CRC)': await tamper(ex.blob, x => { x[audioStart] ^= 0xff; }),
      'manifest modifié (CRC)': await tamper(ex.blob, x => { x[firstData + 2] ^= 0x01; }),
      'archive tronquée': ex.blob.slice(0, ex.blob.size - 300),
      'fin de fichier ajoutée': new Blob([ex.blob, new Uint8Array(10)]),
      'fichier vide': new Blob([]),
      'pas un ZIP': new Blob(['bonjour'])
    };
    for (const [k, b] of Object.entries(cases)) { const st = await importBlob(b); res[k] = { message: st.slice(0, 110), projetIntact: projectSig() === sig }; }
    // audio retiré du manifest mais toujours dans l'archive, et SHA-256 faux avec CRC recalculé : passent par le manifest
    return res;
  }
  async function manifestCases() {                               // manifest modifié puis archive reconstruite (CRC justes)
    await fill(3); const ex = await exportBlob(), sig = projectSig(), entries = await Zip.read(ex.blob), res = {};
    const parts = await Promise.all(entries.map(async e => ({ name: e.name, blob: ex.blob.slice(e.start, e.start + e.size) })));
    const mf = JSON.parse(await parts[0].blob.text());
    const rebuild = async (fn, drop) => { const m = JSON.parse(JSON.stringify(mf)); fn(m); return Zip.build([{ name: 'manifest.json', blob: new Blob([JSON.stringify(m)]) }, ...parts.slice(1).filter(p => p.name !== drop)]); };
    const cases = {
      'format 99 (version plus récente)': await rebuild(m => { m.formatVersion = 99; }),
      'audio absent de l’archive': await rebuild(() => {}, parts[2].name),
      'empreinte SHA-256 fausse': await rebuild(m => { m.project.audio.clips[0].hash = '0'.repeat(64); }),
      'audio en trop non référencé': await rebuild(m => { m.project.audio.clips.pop(); })
    };
    for (const [k, b] of Object.entries(cases)) { const st = await importBlob(b); res[k] = { message: st.slice(0, 110), projetIntact: projectSig() === sig }; }
    for (const v of [1, 2, 3]) { const st = await importBlob(await rebuild(m => { m.formatVersion = v; })); res['ancien format ' + v] = { message: st.slice(0, 80), ouvert: /Projet importé/.test(st), clips: audioClips.length }; }
    await fill(3); const sig2 = projectSig(); const st = await importBlob(ex.blob, false);
    res['annulation à la confirmation'] = { message: st.slice(0, 80), projetIntact: projectSig() === sig2 };
    return res;
  }
  async function tooMany() {                                    // 28 audios (au-delà du maximum) : export refusé, rien de proposé
    const saved = audioClips.slice(); await fill(28); const ex = await exportBlob(); audioClips.splice(0, audioClips.length, ...saved); syncAudioUi(); tlBuild();
    return { archiveProposee: !!ex.blob, message: ex.status.slice(0, 110) };
  }
  async function all() {
    const r = { zip: await zipLimits(), interface: [] };
    for (const n of [0, 1, 11, 12, 24, 27]) r.interface.push(await roundTrip(n));
    r.tropDAudios = await tooMany(); r.archivesAbimees = await corrupt(); r.manifest = await manifestCases(); await fill(0);
    return r;
  }
  // Projet riche : 13 imports + voix de démo traitée, packs, racks, automation, production, capture, paroles, tempo.
  async function rich() {
    await fill(13);
    const demo = [...document.querySelectorAll('button')].find(b => /voix de d[ée]mo/i.test(b.textContent) && !b.disabled);
    if (demo) { demo.click(); for (let i = 0; i < 100 && !audioClips.some(c => c.voice); i++) await sleep(100); }
    const v = audioClips.find(c => c.voice); if (v) { const sl = document.getElementById('l3Slot'); if (sl) { sl.value = String(v.voice.slot); sl.dispatchEvent(new Event('change', { bubbles: true })); } }
    window.JACK22_PACKS.applyWarlick('master'); window.JACK22_PACKS.applyHardy('afro'); if (v) window.JACK22_PACKS.applyShire('afro');
    try { window.JACK22_AFRO.hardy?.('afro'); } catch (e) {}
    for (let i = 0; i < 100 && window.Jack22Lot3.pending; i++) await sleep(100);
    const ly = document.getElementById('cLyrics'); if (ly) { ly.value = 'Couplet M1 — é à ç\nRefrain'; ly.dispatchEvent(new Event('input', { bubbles: true })); ly.dispatchEvent(new Event('change', { bubbles: true })); }
    const bpm = document.getElementById('bpm'); bpm.value = '97'; bpm.dispatchEvent(new Event('input', { bubbles: true })); bpm.dispatchEvent(new Event('change', { bubbles: true }));
    const cur = VoiceStore.capture(), ids = audioClips.map(c => c.id), mods = {};
    mods.production97 = { ...cur.production97, mix: { drums: { level: 90, pan: -0.2, low: 3, send: 20, duck: 10, mute: false, solo: false, comp: true, points: [{ bar: 1, level: 80 }, { bar: 9, level: 110 }] } }, groups: { instruments: { level: 95 }, voices: { level: 105 } }, sample: { clipId: ids[0], root: 57, attack: 0.02, release: 0.3 }, clips: { [ids[1]]: { mute: true } } };
    mods.capture98 = { ...cur.capture98, record: { on: true, mode: 'loop', start: 2, end: 4, passes: 2 } };
    mods.workbench = { ...cur.workbench, swing: 30, loop: { on: true, start: 2, end: 6 } };
    mods.audio99 = { ...cur.audio99, tracks: cur.audio99.tracks.map((t, i) => i === 0 ? { ...t, level: 85, pan: 0.3 } : t) };
    const chain = Object.entries(cur.rack100.chains).find(([k, c]) => !k.startsWith('bus:') && c.some(e => e.type === 'eq'));
    if (chain) { const e = chain[1].find(x => x.type === 'eq'); mods.automation101 = { version: 1, curves: [{ id: 'm1curve', channel: chain[0], effect: e.id, type: 'eq', param: 'low', on: true, mode: 'linear', points: [{ bar: 1, value: 0 }, { bar: 5, value: 4 }] }] }; }
    const parsed = VoiceStore.parse({ ...cur, ...mods }); if (!parsed) throw Error('réglages de test refusés par VoiceStore.parse');
    VoiceStore.setText(parsed); await sleep(300);
    return { clips: audioClips.length, voix: audioClips.filter(c => c.voice).length, automation: !!mods.automation101, racks: Object.keys(cur.rack100.chains).length };
  }
  function richSig() {                                         // projet + état vivant des modules (ce que l'écran et le son utilisent)
    const val = x => { try { return typeof x === 'function' ? x() : x; } catch (e) { return 'erreur ' + e.message; } };
    const mods = {}; for (const [n, k] of [['JACK22_AUTOMATION', 'settings'], ['JACK22_PRODUCTION', 'config'], ['JACK22_RACKS', 'settings'], ['JACK22_TAKES', 'settings'], ['JACK22_AUDIO_EDIT', 'settings'], ['JACK22_PACKS', 'limit']]) mods[n + '.' + k] = val(window[n]?.[k]);
    const v = audioClips.filter(c => c.voice).map(c => ({ slot: c.voice.slot, fx: window.Jack22Lot3.settings(c) }));
    const ui = {}; document.querySelectorAll('#bpm,#cLyrics,[id^="mix"],#eqLow,#eqMid,#eqHigh,#compOn,#c93LimOn').forEach(e => { ui[e.id] = e.type === 'checkbox' ? e.checked : e.value; });
    return { projet: JSON.parse(projectSig()), modules: JSON.parse(JSON.stringify(mods)), voix: v, ecran: ui };
  }
  function diff(a, b, p = '', out = []) {
    if (JSON.stringify(a) === JSON.stringify(b)) return out;
    if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], p + '.' + k, out); return out; }
    out.push([p, JSON.stringify(a)?.slice(0, 100), JSON.stringify(b)?.slice(0, 100)]); return out;
  }
  window.JACK22_M1 = { rich, richSig, diff, wav, fill, exportBlob, importBlob, projectSig, zipLimits, roundTrip, corrupt, manifestCases, tooMany, all };
})();
