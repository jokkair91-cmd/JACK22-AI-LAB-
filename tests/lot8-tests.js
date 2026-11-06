/* JACK22 — suite de tests du lot 8 (à charger dans la page du studio).
   Usage : window.JACK22_LOT8_TESTS().then(r => console.table(r.results))
   Les téléchargements sont interceptés : rien n'est écrit sur le disque. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms = 20000, step = 50) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(step); }
    throw Error('délai dépassé (' + ms + ' ms)');
  }
  // Fonction absente de la version testée : « non applicable », pas un échec.
  class Skip extends Error {}
  const errors = [];
  addEventListener('error', e => errors.push(e.message));
  addEventListener('unhandledrejection', e => errors.push(String(e.reason && e.reason.message || e.reason)));

  // Interception des téléchargements : on garde le Blob produit par le studio.
  const blobs = new Map(), downloads = [];
  const createURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = obj => { const u = createURL(obj); blobs.set(u, obj); return u; };
  const anchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) { downloads.push({ name: this.download, blob: blobs.get(this.href) || null }); return; }
    return anchorClick.call(this);
  };
  const nextDownload = async (from, ms) => { await until(() => downloads.length > from, ms); return downloads[from]; };
  let confirmAnswer = true;
  window.confirm = () => confirmAnswer;
  window.alert = m => errors.push('alert: ' + m);

  const sha256 = async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
  async function readWav(blob) {
    const v = new DataView(await blob.arrayBuffer()), tag = o => String.fromCharCode(...[0, 1, 2, 3].map(i => v.getUint8(o + i)));
    if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw Error('en-tête RIFF/WAVE absent');
    let o = 12, fmt = null, data = null;
    while (o + 8 <= v.byteLength) { const id = tag(o), size = v.getUint32(o + 4, true); if (id === 'fmt ') fmt = o + 8; if (id === 'data') { data = { at: o + 8, size }; break; } o += 8 + size + (size & 1); }
    if (!fmt || !data) throw Error('blocs fmt/data absents');
    const ch = v.getUint16(fmt + 2, true), rate = v.getUint32(fmt + 4, true), bits = v.getUint16(fmt + 14, true);
    let peak = 0, sum = 0, n = 0, finite = true;
    for (let i = data.at; i + 1 < data.at + data.size; i += 2) { const s = v.getInt16(i, true) / 32768; if (!Number.isFinite(s)) finite = false; peak = Math.max(peak, Math.abs(s)); sum += s * s; n++; }
    return { ch, rate, bits, seconds: n / ch / rate, peak, rms: Math.sqrt(sum / Math.max(1, n)), finite, bytes: blob.size };
  }
  // 11.5 : présentation par espaces (Composition, Voix & texte, Console…) au lieu des onglets.
  const spaces = () => document.body.classList.contains('j93Workspace');
  // Les vues (Arrangement, Batterie, Piano Roll…) n'apparaissent qu'une fois leur espace choisi.
  const GROUP = { 'Arrangement': 'Composition', 'Batterie': 'Composition', 'Piano Roll': 'Composition' };
  const navBtn = name => [...document.querySelectorAll('#j93Nav button')].find(x => x.textContent.trim() === name && x.offsetWidth);
  const room = name => { if (!navBtn(name) && GROUP[name]) navBtn(GROUP[name])?.click(); const b = navBtn(name); if (!b) throw Error('espace « ' + name + ' » introuvable'); b.click(); };
  const noTabs = () => { if (spaces()) throw new Skip('présentation par espaces (11.5) : vérifiée par le test 31'); };
  const tab = name => [...document.querySelectorAll('[data-dock-pane]')].find(b => b.dataset.dockPane === name);
  const show = name => { tab(name).click(); };
  const stopAll = () => { $('stop').click(); };
  async function exportOnce() {
    show('dockExport');
    const from = downloads.length; $('expBtn').click();
    const d = await nextDownload(from, 60000);
    await until(() => !$('expBtn').disabled, 30000);
    return d;
  }

  const tests = [
    ['01 Démarrage', async () => {
      const build = document.querySelector('meta[name=jack22-build]').content;
      const keys = $('piano').querySelectorAll('[data-idx],.key,.wk,.bk').length || $('piano').children.length;
      const img = document.querySelector('.skinRobot');
      if (!img.complete || !img.naturalWidth) throw Error('image Jackbot non chargée');
      if (!document.querySelectorAll('#tlRows .tl-row').length) throw Error('timeline vide');
      return 'build ' + build + ', piano ' + keys + ' éléments, timeline ' + document.querySelectorAll('#tlRows .tl-row').length + ' lignes';
    }],
    ['02 Navigation des onglets', async () => {
      noTabs();
      const names = [...document.querySelectorAll('[data-dock-pane]')].map(b => b.dataset.dockPane);
      for (const n of names) {
        show(n);
        if (n === 'studio') { if ($('dockStage').hidden) throw Error('studio caché'); continue; }
        if ($(n).hidden || $('dockDrawer').hidden) throw Error(n + ' ne s\'affiche pas');
        $(n).querySelector('[data-dock-close]').click();
        if ($('dockStage').hidden) throw Error('Retour au studio inopérant depuis ' + n);
      }
      return names.length + ' onglets, retour au studio OK';
    }],
    ['03 Lecture / Pause / Stop', async () => {
      stopAll(); $('play').click(); await sleep(400);
      if (!/Pause/.test($('play').textContent)) throw Error('Play ne démarre pas');
      if (audio.state !== 'running') throw Error('AudioContext ' + audio.state);
      $('play').click(); await sleep(100);
      if (!/Play/.test($('play').textContent)) throw Error('Pause inopérante');
      $('play').click(); await sleep(200); stopAll(); await sleep(100);
      if (state !== 'stopped') throw Error('Stop : état ' + state);
      return 'AudioContext running, Play → Pause → Play → Stop';
    }],
    ['04 Raccourcis clavier', async () => {
      if (!window.JACK22_EASE) throw new Skip('pas de raccourcis Espace / Ctrl+S dans cette version');
      stopAll(); document.activeElement?.blur?.();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true })); await sleep(250);
      if (state !== 'playing') throw Error('Espace ne lance pas la lecture');
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true })); await sleep(100);
      if (state !== 'paused') throw Error('Espace ne met pas en pause');
      stopAll();
      $('bpm').focus(); $('bpm').dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true })); await sleep(100); $('bpm').blur();
      if (state !== 'stopped') throw Error('Espace agit pendant la saisie');
      let saved = 0; const orig = ProjectPersistence.save; ProjectPersistence.save = function () { saved++; return orig.apply(this, arguments); };
      const ev = new KeyboardEvent('keydown', { key: 's', code: 'KeyS', ctrlKey: true, bubbles: true, cancelable: true });
      document.body.dispatchEvent(ev); ProjectPersistence.save = orig;
      if (!saved || !ev.defaultPrevented) throw Error('Ctrl+S ne sauvegarde pas');
      await until(() => !persistBusy, 20000);
      return 'Espace = Play/Pause (ignoré dans les champs), Ctrl+S = Sauvegarder';
    }],
    ['05 Grille de batterie', async () => {
      show('dockComposer');
      // Placement propre à la 8.7 de Claude ; la 8.8 de ChatGPT range la batterie dans sa propre grille.
      if (window.JACK22_EASE?.version === '8.7' && $('patterns').nextElementSibling?.id !== 'dockBeat') throw Error('grille pas sous les patterns');
      const grid = activePat(0).grid, before = grid.map(r => r.join('')).join('|');
      const cells = ['KICK pas 1', 'KICK pas 9', 'SNARE pas 5', 'SNARE pas 13', 'HI-HAT pas 3', 'HI-HAT pas 7'];
      for (const c of cells) { const b = document.querySelector('[aria-label="' + c + '"]'); if (!b) throw Error(c + ' introuvable'); b.click(); }
      const after = activePat(0).grid.map(r => r.join('')).join('|');
      if (before === after) throw Error('aucun pas modifié');
      show('studio');
      return cells.length + ' pas activés dans le pattern ' + activePat(0).name;
    }],
    ['06 Piano Roll', async () => {
      show('dockComposer');
      const g = $('rollGrid'), r = g.getBoundingClientRect(), n0 = roll.notes.length;
      const at = (type, x, y) => g.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 7, clientX: r.left + x, clientY: r.top + y }));
      g.scrollIntoView({ block: 'center' }); const r2 = g.getBoundingClientRect(); r.x = r2.x;
      const p = (type, x, y) => g.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 7, clientX: r2.left + x, clientY: r2.top + y }));
      p('pointerdown', 30, 120); p('pointerup', 30, 120); p('pointerdown', 150, 160); p('pointerup', 150, 160);
      if (roll.notes.length < n0 + 2) throw Error('notes ajoutées : ' + (roll.notes.length - n0));
      if ($('rollUndo').disabled) throw Error('Annuler reste grisé');
      $('rollUndo').click(); if (roll.notes.length !== n0 + 1) throw Error('Annuler inopérant');
      show('studio');
      return 'notes ajoutées et annulation OK (' + roll.notes.length + ' notes)';
    }],
    ['07 Timeline (mode SONG)', async () => {
      $('modeSong').click(); if (playMode !== 'song') throw Error('mode SONG non activé');
      const lane = document.querySelector('#tlRows .tl-lane[data-ti="0"]'), r = lane.getBoundingClientRect(), b0 = song.arrangement.length;
      lane.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 5, clientY: r.top + r.height / 2 }));
      if (song.arrangement.length !== b0 + 1) throw Error('bloc non placé');
      const block = document.querySelector('#tlRows .tl-block'); block.click();
      if ($('tlDup').disabled) throw Error('sélection de bloc inopérante');
      $('tlDup').click(); if (song.arrangement.length !== b0 + 2) throw Error('Dupliquer inopérant');
      const mel = document.querySelector('#tlRows .tl-lane[data-ti="2"]'), m = mel.getBoundingClientRect();
      mel.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: m.left + 5, clientY: m.top + m.height / 2 }));
      return song.arrangement.length + ' blocs sur la timeline';
    }],
    ['08 Mixeur et Mute', async () => {
      $('muteKick').click(); const on = $('muteKick').getAttribute('aria-pressed'); $('muteKick').click();
      if (on !== 'true' || $('muteKick').getAttribute('aria-pressed') !== 'false') throw Error('Mute Kick');
      const f = $('mixSnare'); f.value = 60; f.dispatchEvent(new Event('input', { bubbles: true }));
      if (!/60/.test($('mixSnareVal').textContent)) throw Error('fader Snare non affiché');
      f.value = 100; f.dispatchEvent(new Event('input', { bubbles: true }));
      // Le Mute d'une ligne de timeline doit couper la vraie piste (pas seulement changer de couleur).
      const rowMute = () => document.querySelector('#tlRows .dockRowMute[aria-label="Mute BATTERIE"]');
      await until(() => rowMute() && !rowMute().disabled, 2000);
      rowMute().click(); await sleep(50);
      if (!song.tracks[0].mute) throw Error('Mute BATTERIE de la timeline sans effet sur la piste');
      await until(() => rowMute(), 2000); rowMute().click(); await sleep(50);
      if (song.tracks[0].mute) throw Error('Mute BATTERIE ne se rétablit pas');
      return 'Mute Kick, fader Snare et Mute BATTERIE de la timeline OK';
    }],
    ['09 Effets master', async () => {
      const tabs = [...document.querySelectorAll('[data-dock-fx]')];
      for (const [i, b] of tabs.entries()) { b.click(); if (document.querySelector('[data-dock-fx-card="' + i + '"]').hidden) throw Error('carte effet ' + i); }
      for (const id of ['fxRevOn', 'fxDlyOn', 'fxCmpOn']) { $(id).click(); if ($(id).getAttribute('aria-pressed') !== 'true') throw Error(id + ' ne s’active pas'); }
      tabs[0].click();
      return 'ÉQ, Réverb, Delay, Comp. affichés ; trois effets activés';
    }],
    ['10 Synthé Orbite', async () => {
      if (spaces()) { room('Piano Roll'); await sleep(200); }
      for (const b of document.querySelectorAll('[data-dock-preset]')) { b.click(); if ($('preset').value !== b.dataset.dockPreset) throw Error('planète ' + b.textContent); }
      if (getComputedStyle($('harmCtl')).display === 'none' || !$('harmAmt').offsetParent) throw Error('harmoniques 808 invisibles');
      const o = Number($('octVal').textContent); $('octUp').click(); const up = Number($('octVal').textContent); $('octDown').click();
      if (up !== o + 1 || Number($('octVal').textContent) !== o) throw Error('octave');
      $('panic').click(); document.querySelector('[data-dock-preset="lead"]').click();
      return '5 sons, harmoniques 808 visibles, octave ±';
    }],
    ['11 Export WAV', async () => {
      stopAll(); const d = await exportOnce();
      if (!d.blob) throw Error('aucun fichier produit');
      const w = await readWav(d.blob);
      if (w.ch !== 2 || w.rate !== 44100 || w.bits !== 16) throw Error('format ' + w.ch + 'ch ' + w.rate + ' Hz ' + w.bits + ' bits');
      if (!w.finite || w.peak <= 0) throw Error('signal nul');
      window.__lot8wav = d.blob; show('studio');
      return d.name + ' : PCM stéréo 44,1 kHz, ' + w.seconds.toFixed(2) + ' s, ' + w.bytes + ' octets, crête ' + w.peak.toFixed(3);
    }],
    ['12 Répétabilité WAV', async () => {
      const a = await sha256(window.__lot8wav), d = await exportOnce(), b = await sha256(d.blob); show('studio');
      if (a !== b) throw Error('empreintes différentes');
      return 'SHA-256 identique : ' + a.slice(0, 16) + '…';
    }],
    ['13 Sauvegarde locale', async () => {
      $('bpm').value = 97; $('bpm').dispatchEvent(new Event('change', { bubbles: true }));
      await ProjectPersistence.save(); await until(() => !persistBusy, 20000);
      $('bpm').value = 140; $('bpm').dispatchEvent(new Event('change', { bubbles: true }));
      confirmAnswer = true; await ProjectPersistence.load(); await until(() => !persistBusy, 20000);
      if (Number($('bpm').value) !== 97) throw Error('BPM rechargé : ' + $('bpm').value);
      return 'BPM 97 sauvegardé, modifié, puis retrouvé au chargement';
    }],
    ['14 Projet portable', async () => {
      const from = downloads.length; $('projExport').click(); const d = await nextDownload(from, 30000);
      if (!d.blob || d.blob.size < 100) throw Error('archive vide');
      const m = $('master'); m.value = 20; m.dispatchEvent(new Event('input', { bubbles: true }));
      await ProjectTransfer.importFile(new File([d.blob], d.name)); await until(() => !persistBusy, 20000);
      if (Number($('master').value) !== 70) throw Error('master après import : ' + $('master').value);
      // Archive altérée puis fichier trop court : refusés, le projet ouvert (master à 20) ne bouge pas.
      m.value = 20; m.dispatchEvent(new Event('input', { bubbles: true }));
      const bytes = new Uint8Array(await d.blob.arrayBuffer()); bytes[Math.floor(bytes.length / 2)] ^= 0xff;
      await ProjectTransfer.importFile(new File([bytes], 'altere.jack22')); await until(() => !persistBusy, 20000);
      if (Number($('master').value) !== 20) throw Error('projet altéré accepté');
      await ProjectTransfer.importFile(new File([new Uint8Array(10)], 'court.jack22')); await until(() => !persistBusy, 20000);
      if (Number($('master').value) !== 20) throw Error('fichier court accepté');
      m.value = 70; m.dispatchEvent(new Event('input', { bubbles: true }));
      return d.name + ' (' + d.blob.size + ' octets) : réimport OK, archive altérée et fichier court refusés';
    }],
    ['15 Voix de démo et J-Tune', async () => {
      show('dockVoices');
      if (!audioClips.some(c => c.buffer && c.voiceSlot)) { $('l3Demo').click(); await until(() => document.querySelectorAll('#tlRows .tl-row').length && audioClips.some(c => c.buffer), 20000); }
      const tune = document.querySelector('[data-l3="tune.on"]'); if (tune.disabled) throw Error('J-Tune grisé avec une voix');
      if (!tune.checked) tune.click();
      await sleep(300);
      await until(() => /Traitements prêts/.test($('l3Status').textContent) && $('l3Cancel').disabled, 60000, 200);
      if (!/rendu/.test($('l3TrackInfo').textContent)) throw Error('pas de rendu traité : ' + $('l3TrackInfo').textContent);
      // La voix traitée doit être audible dans l'export.
      const d = await exportOnce(), w = await readWav(d.blob); show('studio');
      if (!w.finite || w.peak <= 0) throw Error('export avec voix silencieux');
      return 'voix de démo + J-Tune : ' + $('l3TrackInfo').textContent + ' ; WAV ' + w.seconds.toFixed(2) + ' s, crête ' + w.peak.toFixed(3);
    }],
    ['16 Sampler', async () => {
      show('dockTools'); const keys = [...document.querySelectorAll('[data-sample-note]')];
      if (!$('v8Sample').options.length) throw Error('aucune source sampler');
      if (keys.some(k => k.disabled)) throw Error('touches sampler grisées');
      keys[0].click(); keys[4].click(); show('studio');
      return 'source « ' + $('v8Sample').selectedOptions[0].textContent + ' », touches jouables';
    }],
    ['17 Repères, historique, automation', async () => {
      show('dockTools'); const s0 = $('v8Sections').children.length; $('v8AddSection').click();
      if ($('v8Sections').children.length <= s0) throw Error('repère non ajouté');
      if ($('v8Undo').disabled) throw Error('historique vide');
      $('v8Curve').value = '1, 100\n2, 0'; $('v8AutoOn').checked = true; $('v8AutoOn').dispatchEvent(new Event('change', { bubbles: true })); $('v8ApplyAuto').click();
      const st = $('v8Status').textContent; show('studio');
      return 'repère ajouté, Annuler disponible, courbe : ' + st.slice(0, 70);
    }],
    ['18 Diagnostic', async () => {
      show('dockMore'); $('v8Check').click(); await until(() => !/Aucun diagnostic/.test($('v8Diag').textContent), 5000);
      const j = JSON.parse($('v8Diag').textContent); show('studio');
      const meta = document.querySelector('meta[name=jack22-build]').content;
      if (j.build !== meta) throw Error('diagnostic ' + j.build + ' ≠ build de la page ' + meta);
      return 'diagnostic ' + j.build + ', AudioWorklet ' + j.available.audioWorklet;
    }],
    ['19 Mise en page', async () => {
      const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      if (over > 1) throw Error('débordement horizontal ' + over + ' px');
      const warn = $('storeWarn').getBoundingClientRect().height; if (window.JACK22_EASE?.version === '8.7' && warn > 60) throw Error('bandeau trop haut ' + warn);
      return 'largeur ' + innerWidth + ' px : pas de débordement, bandeau ' + Math.round(warn) + ' px';
    }],
    ['20 Espace de travail', async () => {
      // Testé par l'interface seulement : vaut pour le module de ChatGPT comme pour la version fusionnée.
      const W = window.JACK22_WORKSPACE, bar = $('workspace87');
      if (!bar) throw new Skip('pas de barre Espace de travail dans cette version');
      const btn = name => [...bar.querySelectorAll('button')].find(b => b.textContent === name);
      // Vues : un seul panneau visible, agrandi ; retour à la vue complète.
      for (const [id, name] of [['timeline', 'Arrangement'], ['mixer', 'Mixeur'], ['synth', 'Orbite'], ['fx', 'Effets']]) {
        btn(name).click();
        const shown = [...document.querySelectorAll('#dockStage>section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id);
        if (shown.join() !== id) throw Error('vue ' + name + ' affiche ' + shown.join());
        if (btn(name).getAttribute('aria-pressed') !== 'true') throw Error('bouton ' + name + ' non marqué');
        if ($(id).getBoundingClientRect().width < $('dockStage').getBoundingClientRect().width - 4) throw Error('vue ' + name + ' pas agrandie');
      }
      show('dockVoices'); btn('Mixeur').click();
      if ($('dockStage').hidden) throw Error('une vue ne ramène pas au studio');
      btn('Vue complète').click();
      if ([...document.querySelectorAll('#dockStage>section')].some(s => getComputedStyle(s).display === 'none')) throw Error('vue complète incomplète');
      // Repli : le panneau ne garde que son titre ; l'état est mémorisé.
      const toggles = document.querySelectorAll('.workspace87Toggle');
      if (!toggles.length) throw Error('aucun bouton de repli');
      const fx = $('fx'), h0 = fx.getBoundingClientRect().height, t = () => [...toggles].find(b => b.closest('#fx'));
      t().click();
      const hf = fx.getBoundingClientRect().height;
      if (!fx.classList.contains('workspace87Folded') || hf > h0 / 2) { t().click(); throw Error('repli du panneau Effets (' + Math.round(h0) + ' → ' + Math.round(hf) + ' px)'); }
      if (W && !W.prefs.folded.includes('fx')) throw Error('repli non mémorisé');
      t().click();
      if (fx.classList.contains('workspace87Folded') || fx.getBoundingClientRect().height < h0 - 2) throw Error('réouverture du panneau Effets');
      const notes = [];
      if (![...toggles].some(b => b.closest('#mixer'))) notes.push('mixeur sans bouton de repli');
      // Un bouton de repli ne doit masquer aucune autre commande.
      for (const b of toggles) {
        if (!b.offsetParent) continue; const r = b.getBoundingClientRect();
        const hit = [...b.closest('section').querySelectorAll('button,select,input,summary')].find(e => e !== b && e.offsetParent && (q => q.width && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom))(e.getBoundingClientRect()));
        if (hit) notes.push('repli de ' + b.closest('section').id + ' sur ' + (hit.id || hit.textContent.trim().slice(0, 20)));
      }
      // Titre conservé quand on replie (panneaux dont le titre n'est pas directement dans le panneau).
      for (const id of ['timeline', 'synth']) {
        const tg = [...toggles].find(b => b.closest('#' + id)); if (!tg) continue; tg.click();
        const p = $(id), title = getComputedStyle(p, '::before').content, h2 = p.querySelector('h2');
        if (!(h2 && h2.offsetParent) && (!title || title === 'none')) notes.push(id + ' perd son titre une fois replié');
        [...document.querySelectorAll('.workspace87Toggle')].find(b => b.closest('#' + id)).click();
      }
      // Espacement compact : pilote la taille des onglets.
      show('dockComposer'); const size = () => $('dockComposer').getBoundingClientRect().height, compact = size();
      btn('Espacement compact').click(); const large = size();
      if (document.body.classList.contains('workspace87Compact') || large <= compact) throw Error('espacement normal sans effet (' + compact + ' → ' + large + ')');
      btn('Espacement compact').click();
      if (!document.body.classList.contains('workspace87Compact') || Math.abs(size() - compact) > 2) throw Error('retour au compact');
      if (W && W.prefs.compact !== true) throw Error('préférence compacte non mémorisée');
      show('studio');
      return '4 vues agrandies, ' + toggles.length + ' panneaux repliables, Composer compact ' + Math.round(compact) + ' px / normal ' + Math.round(large) + ' px' + (notes.length ? ' — À NOTER : ' + notes.join(' ; ') : '');
    }],
    ['22 Espaces compacts (ChatGPT 8.8)', async () => {
      noTabs();
      const C = window.JACK22_COMPACT;
      if (!C) throw new Skip('pas d’espaces compacts 8.8 dans cette version');
      const notes = [];
      // Sous-vues : chaque bouton ne montre que ses panneaux, « Vue complète » les remet tous.
      let views = 0;
      for (const pane of document.querySelectorAll('.dockPane')) {
        show(pane.id); await sleep(20); const grid = pane.querySelector('.compact88Grid');
        for (const b of pane.querySelectorAll('[data-c88-view]')) {
          b.click(); views++;
          const want = (b.dataset.c88Targets || '').split(' ').filter(Boolean);
          const shown = [...grid.children].filter(e => !e.hidden && e.id && e.id !== 'v8Status').map(e => e.id);
          if (b.getAttribute('aria-pressed') !== 'true') throw Error('sous-vue ' + b.textContent + ' non marquée');
          if (want.length && want.some(id => id !== 'v8Status' && !shown.includes(id))) throw Error(pane.id + ' / ' + b.textContent + ' : ' + shown.join(','));
          if (want.length === 1 && shown.length !== 1) notes.push(pane.id + ' / ' + b.textContent + ' montre aussi ' + shown.join(','));
        }
        pane.querySelector('[data-c88-view]')?.click();
      }
      // Replier puis agrandir chaque panneau d'outil.
      let panels = 0;
      for (const pane of document.querySelectorAll('.dockPane')) {
        // Le mode compact est rétabli par un observateur quand on quitte l'accueil : on laisse passer ce tour.
        show(pane.id); await sleep(20);
        for (const panel of pane.querySelectorAll('.compact88Panel')) {
          const fold = panel.querySelector('[data-c88-action="fold"]'), focus = panel.querySelector('[data-c88-action="focus"]');
          if (!fold || !focus || panel.hidden) continue; panels++;
          const h0 = panel.getBoundingClientRect().height;
          fold.click();
          if (!panel.classList.contains('compact88Folded') || panel.getBoundingClientRect().height >= h0 - 1) notes.push('repli sans effet : ' + panel.id);
          fold.click();
          focus.click();
          if (!panel.classList.contains('compact88Focused')) throw Error('agrandir ' + panel.id);
          const others = [...pane.querySelectorAll('.compact88Panel')].filter(p => p !== panel && p.offsetParent);
          if (others.length) notes.push('agrandir ' + panel.id + ' laisse visibles ' + others.map(p => p.id).join(','));
          focus.click();
          if (panel.classList.contains('compact88Focused')) throw Error('rétablir ' + panel.id);
        }
      }
      // Onglets des effets voix et taille du texte des paroles.
      show('dockVoices'); const fxb = [...document.querySelectorAll('[data-c88-fx]')];
      for (const b of fxb) { b.click(); const card = document.querySelector('[data-c88-fx-card="' + b.dataset.c88Fx + '"]'); if (card.hidden) throw Error('effet voix ' + b.textContent); }
      fxb[0]?.click();
      show('dockWords'); const fs0 = parseFloat(getComputedStyle($('cLyrics')).fontSize);
      document.querySelector('[data-c88-text="1"]').click(); const fs1 = parseFloat(getComputedStyle($('cLyrics')).fontSize);
      document.querySelector('[data-c88-text="-1"]').click();
      if (fs1 <= fs0) notes.push('Texte + sans effet (' + fs0 + ' → ' + fs1 + ' px)');
      // Barre des vues du Studio.
      show('studio'); const sb = [...document.querySelectorAll('[data-c88-studio]')];
      for (const b of sb) { b.click(); if (b.dataset.c88Studio !== 'all') { const vis = [...document.querySelectorAll('#dockStage>section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id); if (vis.join() !== b.dataset.c88Studio) throw Error('vue Studio ' + b.textContent + ' : ' + vis.join()); } }
      sb[0]?.click();
      return views + ' sous-vues, ' + panels + ' panneaux repliables/agrandissables, ' + fxb.length + ' onglets d’effets voix, ' + sb.length + ' vues Studio' + (notes.length ? ' — À NOTER : ' + notes.join(' ; ') : '');
    }],
    ['23 Commandes atteignables', async () => {
      // Chaque commande visible peut être amenée à l'écran et reçoit bien le clic (rien ne la recouvre ni ne la coupe).
      const bad = []; let n = 0;
      for (const pane of ['studio', ...[...document.querySelectorAll('.dockPane')].map(p => p.id)]) {
        show(pane); await sleep(30);
        const root = pane === 'studio' ? $('dockStage') : $(pane);
        for (const el of root.querySelectorAll('button,select,input:not([type=file]),textarea,summary')) {
          // Contenu d'un menu <details> fermé : non affiché (Chrome lui garde pourtant une position).
          const host = el.tagName === 'SUMMARY' ? el.parentElement.parentElement : el;
          if (!el.offsetParent || host?.closest('details:not([open])')) continue;
          const r0 = el.getBoundingClientRect(); if (r0.width < 2 || r0.height < 2) continue;
          n++; el.scrollIntoView({ block: 'center', inline: 'center' });
          const r = el.getBoundingClientRect(), x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
          const hit = document.elementFromPoint(x, y);
          if (!hit || !(hit === el || el.contains(hit) || hit.contains(el) && hit.tagName === 'LABEL' || el.labels && [...el.labels].some(l => l.contains(hit))))
            bad.push(pane + ' : ' + (el.id || el.getAttribute('aria-label') || el.textContent.trim().slice(0, 24) || el.tagName) + ' sous ' + (hit ? hit.tagName + (hit.id ? '#' + hit.id : '.' + String(hit.className).split(' ')[0]) : 'hors écran'));
        }
      }
      window.scrollTo(0, 0); show('studio');
      if (bad.length) throw Error(bad.length + '/' + n + ' commandes inaccessibles : ' + bad.slice(0, 8).join(' | '));
      return n + ' commandes visibles, toutes atteignables à ' + innerWidth + '×' + innerHeight;
    }],
    ['24 Ergonomie 8.9 (barres, projet, étapes)', async () => {
      const E = window.JACK22_C89;
      if (!E || E.version !== '8.9') throw new Skip('pas de barre unique ni d’étapes 8.9 (Claude) dans cette version');
      show('studio');
      // Barres : étapes, vues du Studio et messages sur une seule ligne.
      const bar = $('claude89Bar');
      if (!bar || !bar.contains($('dockNav')) || !bar.contains($('dockMessages'))) throw Error('barre unique absente');
      E.setWarn(true); const topOpen = Math.round($('dockContent').getBoundingClientRect().top);
      E.setWarn(false); const top = Math.round($('dockContent').getBoundingClientRect().top);
      if (getComputedStyle($('storeWarn')).display !== 'none' || top >= topOpen) throw Error('bandeau toujours affiché une fois réduit (' + topOpen + ' → ' + top + ' px)');
      E.setWarn(true);
      // Étapes : 4 onglets visibles + ⚙ ; Paroles regroupé avec Voix.
      const visible = [...$('dockNav').querySelectorAll('[data-dock-pane]')].filter(b => b.offsetParent).map(b => b.dataset.dockPane);
      if (visible.join() !== 'dockComposer,studio,dockVoices,dockExport') throw Error('étapes : ' + visible.join());
      document.querySelector('[data-claude89-go="dockWords"]').click(); await sleep(20);
      if ($('dockWords').hidden) throw Error('lien vers Paroles');
      if (document.querySelector('[data-dock-pane="dockVoices"]').getAttribute('aria-pressed') !== 'true') throw Error('Voix & paroles non marqué sur Paroles');
      document.querySelector('[data-claude89-go="dockVoices"]').click();
      if ($('dockVoices').hidden) throw Error('lien retour vers Voix');
      const more = document.querySelector('.claude89More'); more.open = true;
      more.querySelector('button').click(); await sleep(20);
      if ($('dockTools').hidden || more.open) throw Error('menu ⚙ → Outils');
      if (!more.classList.contains('claude89Active')) throw Error('⚙ non marqué sur Outils');
      show('studio');
      // Projet : témoin ● après une modification, effacé après Enregistrer.
      const bpm = $('bpm'), v0 = bpm.value; bpm.value = Number(v0) + 1; bpm.dispatchEvent(new Event('change', { bubbles: true })); E.syncDirty();
      if (!$('save').classList.contains('claude89Dirty')) throw Error('témoin ● absent après modification');
      await ProjectPersistence.save(); await until(() => !persistBusy, 20000); E.syncDirty();
      if ($('save').classList.contains('claude89Dirty')) throw Error('témoin ● reste après Enregistrer');
      const menu = document.querySelector('.dockProject .dockPopupBody');
      for (const id of ['projExport', 'load', 'projImport', 'clear']) if (!menu.contains($(id))) throw Error(id + ' hors du menu Projet');
      // Bandeau : réduit en pastille après une copie réussie sur l'ordinateur.
      E.setWarn(true); const from = downloads.length; await ProjectTransfer.exportProject(); await nextDownload(from, 30000);
      const pill = document.querySelector('.claude89Pill');
      if (getComputedStyle($('storeWarn')).display !== 'none' || !pill.offsetParent) throw Error('bandeau non réduit après la copie');
      pill.click();
      if (getComputedStyle($('storeWarn')).display === 'none' || pill.offsetParent) throw Error('la pastille ne rouvre pas le bandeau');
      return 'contenu à ' + top + ' px du haut avec le bandeau réduit (' + topOpen + ' px ouvert), 4 étapes + ⚙, témoin ● et menu Projet OK, bandeau réduit après copie';
    }],
    ['25 Version de référence (ChatGPT 8.9)', async () => {
      noTabs();
      const E = window.JACK22_C89;
      if (!E || E.version !== '8.9-reference') throw new Skip('pas la présentation de référence 8.9');
      show('studio'); await sleep(30);
      const notes = [];
      // Présentation classique : 7 onglets visibles, messages sur leur propre ligne, Studio à l'accueil.
      const tabs = [...$('dockNav').querySelectorAll('[data-dock-pane]')].filter(b => b.offsetParent).map(b => b.dataset.dockPane);
      if (tabs.length !== 7) throw Error('onglets visibles : ' + tabs.join());
      if ($('dockMessages').parentElement !== $('dockNav').parentElement || $('dockNav').contains($('dockMessages'))) throw Error('messages non séparés');
      if (/M6|^15$/.test([...document.querySelectorAll('.orbitMixerName>b,.orbitSynthName>b')].map(b => b.textContent).join())) throw Error('badges M6 / 15 encore présents');
      // Témoin ● sur Sauvegarder.
      const bpm = $('bpm'); bpm.value = Number(bpm.value) + 1; bpm.dispatchEvent(new Event('change', { bubbles: true })); E.syncDirty();
      if (!$('save').classList.contains('claude89Dirty')) throw Error('témoin ● absent après modification');
      await ProjectPersistence.save(); await until(() => !persistBusy, 20000); E.syncDirty();
      if ($('save').classList.contains('claude89Dirty')) throw Error('témoin ● reste après Sauvegarder');
      // Bandeau : visible à l'ouverture ; on le masque (bouton du bandeau ou menu Projet) et le menu Projet le réaffiche.
      if (getComputedStyle($('storeWarn')).display === 'none') throw Error('bandeau absent à l’ouverture');
      const menu = document.querySelector('.dockProject .dockPopupBody'), item = t => [...menu.querySelectorAll('button')].find(b => b.textContent.includes(t) && !b.hidden);
      const reduce = $('storeWarn').querySelector('.claude89Reduce');
      (reduce && reduce.offsetParent ? reduce : item('Masquer l’avertissement')).click();
      if (getComputedStyle($('storeWarn')).display !== 'none') throw Error('masquer le bandeau sans effet');
      item('Afficher l’avertissement').click();
      if (getComputedStyle($('storeWarn')).display === 'none') throw Error('le menu Projet ne réaffiche pas le bandeau');
      // Accueil : présentation 8.6 (mode compact coupé sur le Studio complet, rétabli ailleurs).
      if (window.JACK22_ACCUEIL) {
        if (!document.body.classList.contains('c89Accueil') || document.body.classList.contains('compact88')) throw Error('accueil hors présentation 8.6');
        show('dockComposer'); await sleep(20); if (!document.body.classList.contains('compact88')) throw Error('mode compact absent hors accueil'); show('studio'); await sleep(20);
        if (!document.body.classList.contains('c89Accueil')) throw Error('retour à l’accueil sans présentation 8.6');
      }
      // Vues détaillées du Studio : cachées par défaut, affichées depuis le menu Projet.
      if ($('workspace88').offsetParent) throw Error('vues détaillées visibles par défaut');
      item('vues détaillées').click();
      if (!$('workspace88').offsetParent) throw Error('vues détaillées non affichées');
      item('vues détaillées').click();
      // Liens Voix ⇄ Paroles.
      show('dockVoices'); [...$('dockVoices').querySelectorAll('.claude89Link')][0]?.click(); await sleep(20);
      if ($('dockWords').hidden) throw Error('lien vers Paroles');
      [...$('dockWords').querySelectorAll('.claude89Link')][0]?.click(); await sleep(20);
      if ($('dockVoices').hidden) throw Error('lien vers Voix');
      show('studio'); await sleep(30);
      // Piano entier : chaque touche visible en entier et cliquable après défilement.
      const keys = [...$('piano').querySelectorAll('.key')]; let bad = 0;
      for (const k of keys) {
        k.scrollIntoView({ block: 'center' }); const r = k.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.bottom - 6);
        if (!(hit === k || k.contains(hit))) bad++;
      }
      if (keys.length !== 24 || bad) throw Error(keys.length + ' touches, ' + bad + ' recouvertes ou coupées');
      const ph = Math.round($('piano').getBoundingClientRect().height);
      // Mixeur entier : les 6 faders gardent leur hauteur utile.
      const faders = [...document.querySelectorAll('#dockInstrumentBank .fader')].map(f => Math.round(f.getBoundingClientRect().height));
      if (faders.some(h => h < 60)) notes.push('faders courts : ' + faders.join('/') + ' px');
      window.scrollTo(0, 0);
      return '7 onglets, messages séparés, ● OK, bandeau réductible/réaffichable, vues détaillées et liens Voix ⇄ Paroles OK, piano 24 touches entières (' + ph + ' px), faders ' + faders.join('/') + ' px' + (notes.length ? ' — À NOTER : ' + notes.join(' ; ') : '');
    }],
    ['26 Corrections 9.0 (Claude)', async () => {
      if (!window.JACK22_C90 || !window.JACK22_WORKFLOW) throw new Skip('pas d’outils 9.0 corrigés dans cette version');
      show('studio'); await sleep(30);
      // Outils de l'arrangement dans « Réglages ▾ », rien d'ajouté sous la timeline.
      const sel = document.querySelector('.dockSelection'), set = document.querySelector('#timeline .dockTimelineSettings');
      for (const id of ['j90Inspect', 'j90Zoom', 'j90Undo', 'j90Redo']) { if (sel.contains($(id)) || !set.contains($(id))) throw Error(id + ' pas dans Réglages'); }
      const normal = [...$('j90Zoom').querySelectorAll('button')].find(b => b.textContent === 'Taille normale');
      if (!normal) throw Error('bouton Taille normale absent');
      $('j90Zoom').querySelector('button').click(); normal.click();
      if (TL_BAR_W !== 56 || $('j90ZoomValue').textContent !== '100 %') throw Error('Taille normale ne remet pas 100 %');
      // Annuler de l'arrangement disponible après une lecture.
      const setv = (id, v) => { const f = $(id); f.value = v; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); };
      setv('mixSnare', 70); await sleep(450); $('play').click(); await sleep(400); setv('mixKick', 40); await sleep(450); stopAll(); await sleep(600);
      if ($('j90Undo').disabled || $('v8Undo').disabled) throw Error('Annuler grisé après la lecture');
      $('j90Undo').click(); await sleep(300);
      if ($('mixKick').value === '40') throw Error('Annuler sans effet après la lecture');
      setv('mixKick', 100); setv('mixSnare', 100); await sleep(450);
      // Fenêtre ouverte : la barre d'espace ne lance pas la lecture ; la recherche reçoit le curseur.
      const d = $('j90Dialog'); document.querySelector('.dockProject .dockPopupBody button:last-child')?.click(); await sleep(150);
      if (!d.open) { window.JACK22_WORKFLOW.library(); await sleep(150); }
      if (document.activeElement !== d.querySelector('input[type=search]')) throw Error('recherche sans curseur à l’ouverture');
      document.activeElement.blur(); document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true })); await sleep(250);
      const st = state; d.close(); stopAll();
      if (st !== 'stopped') throw Error('Espace a lancé la lecture derrière la fenêtre');
      return 'outils dans Réglages ▾ (accueil inchangé), Taille normale = 100 %, Annuler disponible après lecture, Espace bloqué sous fenêtre, curseur dans la recherche';
    }],
    ['27 Interface allégée 9.1 (Claude)', async () => {
      if (!window.JACK22_C91) throw new Skip('pas d’interface allégée 9.1 dans cette version');
      noTabs();
      const visible = el => getComputedStyle(el).color !== 'rgba(0, 0, 0, 0)';
      // Accueil : clavier inchangé (lettres visibles).
      show('studio'); await sleep(30);
      if ([...$('piano').querySelectorAll('.kk')].some(k => getComputedStyle(k).opacity === '0')) throw Error('lettres du piano masquées sur l’accueil');
      // Piano Roll : seuls les repères d'octave (C) sont écrits ; ligne survolée et note sélectionnée nommées.
      show('dockComposer'); await sleep(30);
      const keys = [...$('rollKeyCol').querySelectorAll('.roll-key')], shown = keys.filter(visible).map(k => k.textContent);
      if (!shown.length || shown.some(t => !/^C-?\d$/.test(t))) throw Error('colonne des notes : ' + shown.join(' '));
      const n0 = roll.notes.length, g = $('rollGrid'); g.scrollIntoView({ block: 'center' }); const r = g.getBoundingClientRect();
      const p = (t, x, y) => g.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, button: 0, pointerId: 9, clientX: r.left + x, clientY: r.top + y }));
      p('pointerdown', 70, 88); p('pointerup', 70, 88); await sleep(60);
      const sel = g.querySelector('.rn.sel');
      if (roll.notes.length !== n0 + 1 || !sel || !sel.dataset.note || getComputedStyle(sel, '::after').content.replace(/"/g, '') !== sel.dataset.note) throw Error('note sélectionnée sans nom');
      p('pointermove', 300, 88); await sleep(150);
      const lit = $('rollKeyCol').querySelector('.c91Row');
      if (!lit || lit.textContent !== sel.dataset.note) throw Error('ligne survolée : ' + (lit?.textContent || 'aucune') + ' au lieu de ' + sel.dataset.note);
      p('pointerleave', 0, 0); $('rollUndo').click(); await sleep(30);
      // Batterie : temps 1, 5, 9, 13 seuls ; pas survolé affiché ; pistes sous la règle.
      const legend = document.querySelector('#dockBeat .legend'), nums = [...legend.children].slice(1).filter(visible).map(d => d.textContent);
      if (nums.join() !== '1,5,9,13') throw Error('règle de la batterie : ' + nums.join());
      const st = $('tracks').querySelector('.track').querySelectorAll('.step')[6]; st.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); await sleep(150);
      if (legend.querySelector('.c91Col')?.textContent !== '7') throw Error('pas survolé non affiché');
      $('tracks').dispatchEvent(new PointerEvent('pointerleave'));
      // Vue détaillée Orbite : lettres masquées, nom et lettre de la touche jouée.
      show('studio'); await sleep(30); document.body.classList.add('referenceViews');
      document.querySelector('[data-c88-studio="synth"]').click(); await sleep(60);
      const kk = [...$('piano').querySelectorAll('.kk')];
      if (kk.some(k => getComputedStyle(k).opacity !== '0')) throw Error('lettres visibles en vue Orbite');
      const key = $('piano').querySelector('.key'); key.classList.add('down'); await sleep(150);
      const tag = getComputedStyle(key, '::after').content.replace(/"/g, ''), kop = getComputedStyle(key.querySelector('.kk')).opacity;
      key.classList.remove('down'); document.querySelector('[data-c88-studio="all"]').click(); document.body.classList.remove('referenceViews'); await sleep(30);
      if (tag !== key.getAttribute('aria-label') || kop !== '1') throw Error('touche jouée sans nom (' + tag + ')');
      return 'accueil intact ; Piano Roll : ' + shown.length + ' repères C, ligne et note nommées ; batterie : 1·5·9·13 + pas survolé ; Orbite : lettres masquées, touche jouée nommée';
    }],
    ['28 Mode Pro (fenêtres)', async () => {
      const P = window.JACK22_PRO;
      if (!P) throw new Skip('pas de mode Pro dans cette version');
      if (innerWidth < 900) throw new Skip('mode Pro empilé sur écran étroit : contrôlé par le test 23');
      document.querySelectorAll('dialog[open]').forEach(d => d.close());   // fenêtre laissée ouverte par un test précédent
      // 11.5 : l'écran de départ, ce sont les espaces (un test précédent a pu passer par l'ancien écran).
      const WS0 = !!window.JACK22_WORKSPACE;
      if (WS0) { if (!$('dockDrawer').hidden) show('studio'); await sleep(300); window.JACK22_WORKSPACE.enter(); } else show('studio'); await sleep(400);
      // Instantané de l'accueil, comparé après la sortie du mode Pro.
      // Instantané par emplacement (l'arrangement est redessiné à la sortie : ses éléments sont recréés à l'identique).
      const snap = () => { window.scrollTo(0, 0); const main = document.querySelector('main.dockApp'), m = new Map();
        const key = e => { const p = []; for (let x = e; x && x !== main; x = x.parentElement) { if (x.id) { p.unshift('#' + x.id); break; } const sib = [...x.parentElement.children].filter(c => c.tagName === x.tagName); p.unshift(x.tagName.toLowerCase() + '[' + sib.indexOf(x) + ']' + (typeof x.className === 'string' && x.className ? '.' + x.className.split(' ')[0] : '')); } return p.join('>'); };
        // Barre du haut exclue : le témoin ● de Sauvegarder y change selon l'état du projet, sans lien avec le mode Pro.
        for (const e of main.querySelectorAll('*')) { if (e.closest('#dockDrawer') || e.closest('#dockHeader .transport') || e.closest('#j93Library') || e.closest('details:not([open])>:not(summary)')) continue; const r = e.getBoundingClientRect(); if (!r.width && !r.height) continue; const s = getComputedStyle(e); m.set(key(e), [r.left, r.top, r.width, r.height].map(Math.round).join() + '|' + s.color + '|' + s.opacity); } return m; };
      const before = snap(), parents = new Map(P.WINS.map(id => [id, $(id)?.parentElement])), selParent = document.querySelector('.dockSelection').parentElement;
      // Entrée par le menu Projet.
      document.querySelector('.dockProject').open = true; $('c92Enter').click(); await sleep(150);
      if (!P.on || !document.body.classList.contains('c92Pro')) throw Error('mode Pro non activé');
      // Disposition d'origine (une disposition mémorisée par un essai précédent ne compte pas).
      P.resetLayout(); await sleep(50);
      const open = P.WINS.filter(id => !$(id).classList.contains('c92Closed')), desk = $('dockStage').getBoundingClientRect();
      if (open.join() !== 'timeline,c92Inspector,fx,mixer,synth') throw Error('fenêtres ouvertes : ' + open.join());
      const rects = open.map(id => $(id).getBoundingClientRect());
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i], b = rects[j]; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) throw Error('chevauchement ' + open[i] + '/' + open[j]); }
      if (rects.some(r => r.left < desk.left - 1 || r.right > desk.right + 1 || r.bottom > desk.bottom + 1)) throw Error('fenêtre hors du bureau');
      // Déplacer (barre de titre), redimensionner (poignée), clavier ; disposition mémorisée.
      const tl = $('timeline'), bar = tl.querySelector('.c92WinBar'), b0 = tl.getBoundingClientRect();
      const drag = (el, dx, dy) => { const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 21, clientX: x, clientY: y })); el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 21, clientX: x + dx, clientY: y + dy })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 21, clientX: x + dx, clientY: y + dy })); };
      drag(bar, 40, 30); const b1 = tl.getBoundingClientRect();
      if (Math.round(b1.left - b0.left) !== 40 || Math.round(b1.top - b0.top) !== 30) throw Error('déplacement : ' + Math.round(b1.left - b0.left) + ',' + Math.round(b1.top - b0.top));
      const grips = [...$('dockStage').querySelectorAll(':scope>.c92Grip')], mix = $('mixer'), m0 = mix.getBoundingClientRect();
      const mg = grips.find(g => { const r = g.getBoundingClientRect(); return Math.abs(r.right - m0.right) < 3 && Math.abs(r.bottom - m0.bottom) < 3; });
      if (!mg) throw Error('poignée du mixeur introuvable');
      drag(mg, -60, -40); const m1 = mix.getBoundingClientRect();
      if (Math.round(m0.width - m1.width) !== 60 || Math.round(m0.height - m1.height) !== 40) throw Error('redimensionnement mixeur');
      bar.focus(); bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })); const b2 = tl.getBoundingClientRect();
      if (Math.round(b1.left - b2.left) !== 16) throw Error('déplacement au clavier');
      const saved = JSON.parse(localStorage.getItem('jack22.pro.layout.v1') || '{}');
      if (!saved.timeline || !saved.mixer) throw Error('disposition non mémorisée');
      // Fermer / rouvrir une fenêtre.
      const fx = $('fx'); fx.querySelector('.c92WinClose').click();
      if (!fx.classList.contains('c92Closed') || $('c92Bar').querySelector('[data-win="fx"]').getAttribute('aria-pressed') !== 'false') throw Error('fermeture Effets');
      $('c92Bar').querySelector('[data-win="fx"]').click(); if (fx.classList.contains('c92Closed') || fx.offsetWidth < 200) throw Error('réouverture Effets');
      // Menu « Réglages ▾ » de l'arrangement : entier et cliquable par-dessus la fenêtre.
      const pop = tl.querySelector('details.dockPopup'); pop.open = true; await sleep(60);
      const pbEl = pop.querySelector('.dockPopupBody'), pb = pbEl.getBoundingClientRect(), inspect = $('j90Inspect').getBoundingClientRect();
      const hit = document.elementFromPoint(inspect.left + inspect.width / 2, inspect.top + inspect.height / 2);
      // Le bas du menu aussi doit être au premier plan (pas sous une autre fenêtre).
      const low = document.elementFromPoint(pb.left + pb.width / 2, Math.min(pb.bottom, innerHeight) - 6);
      pop.open = false; await sleep(30);
      if (pb.right > innerWidth + 1 || pb.bottom > innerHeight + 1 || !(hit === $('j90Inspect') || $('j90Inspect').contains(hit))) throw Error('menu Réglages coupé ou recouvert');
      if (!low || !pbEl.contains(low)) throw Error('bas du menu Réglages recouvert par ' + (low ? (low.closest('section')?.id || low.tagName) : 'rien'));
      // Sortie (sans avoir touché au morceau) : chaque panneau à sa place, accueil identique.
      $('c92Bar').querySelector('.c92Exit').click(); await sleep(700); // les icônes des pistes Orbite sont redessinées en différé
      // 11.5 : les espaces reposent sur le mode Pro ; quitter les fenêtres libres ramène aux espaces.
      if (WS0) { if (!window.JACK22_WORKSPACE.on || $('c92Bar').offsetWidth || [...$('dockStage').querySelectorAll('.c92Grip,.c92WinBar')].some(g => g.offsetWidth)) throw Error('retour aux espaces après les fenêtres libres'); }
      else if (P.on || document.body.classList.contains('c92Pro')) throw Error('sortie du mode Pro');
      for (const [id, parent] of parents) if ($(id) && $(id).parentElement !== parent) throw Error(id + ' pas revenu à sa place');
      if (!WS0 && (document.querySelector('.dockSelection').parentElement !== selParent || $('c92Inspector') || $('dockStage').querySelector('.c92Grip,.c92WinBar'))) throw Error('restes du mode Pro');
      const after = snap(); let diff = 0, only = 0, kinds = []; for (const [k, v] of before) { const w = after.get(k); if (w === undefined) { only++; if (kinds.length < 3) kinds.push('−' + k.split('>').slice(-2).join('>')); continue; } if (w !== v) { diff++; if (kinds.length < 3) kinds.push(k.split('>').slice(-3).join('>') + ' [' + v + ' → ' + w + ']'); } } for (const k of after.keys()) if (!before.has(k)) { only++; if (kinds.length < 3) kinds.push('+' + k.split('>').slice(-2).join('>')); }
      if (diff || only) throw Error('accueil modifié après la sortie : ' + diff + ' écarts, ' + only + ' en plus/en moins (' + kinds.join(', ') + ')');
      // Retour en mode Pro : disposition retrouvée.
      P.enter(); await sleep(150); const back = $('timeline').getBoundingClientRect();
      if (Math.abs(back.left - b2.left) > 2 || Math.abs(back.top - b2.top) > 2) throw Error('disposition non restaurée');
      // Fonctions dans les fenêtres : lecture, Mute, inspecteur, Piano Roll et batterie.
      $('play').click(); await sleep(250); const playing = state === 'playing'; stopAll(); await sleep(100);
      if (!playing) throw Error('lecture en mode Pro');
      $('muteKick').click(); const muted = $('muteKick').getAttribute('aria-pressed') === 'true'; $('muteKick').click();
      if (!muted) throw Error('Mute dans la fenêtre Mixeur');
      const lane = document.querySelector('#tlRows .tl-lane[data-ti="0"]'); lane.scrollIntoView({ block: 'nearest' }); const lr = lane.getBoundingClientRect(), n0 = song.arrangement.length;
      lane.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: lr.left + 5, clientY: lr.top + lr.height / 2 }));
      // Le studio sélectionne un bloc à l'appui (pointerdown), pas au clic.
      { const blk = document.querySelector('#tlRows .tl-block:not(.tl-aud)'), br = blk.getBoundingClientRect(), o = { bubbles: true, cancelable: true, button: 0, pointerId: 23, clientX: br.left + 6, clientY: br.top + br.height / 2 };
        blk.dispatchEvent(new PointerEvent('pointerdown', o)); blk.dispatchEvent(new PointerEvent('pointerup', o)); document.body.dispatchEvent(new PointerEvent('pointerup', o)); }
      await sleep(400);
      const ins = $('c92Inspector');
      if (!/Piste/.test(ins.textContent) || !/Pattern/.test(ins.textContent)) throw Error('inspecteur sans description du bloc');
      if (!ins.contains($('tlDup'))) throw Error('commandes de sélection absentes de l’inspecteur');
      const n1 = song.arrangement.length; $('tlDup').click(); if (song.arrangement.length !== n1 + 1) throw Error('Dupliquer depuis l’inspecteur');
      $('c92Bar').querySelector('[data-win="roll"]').click(); await sleep(60);
      const g = $('rollGrid'), gr = g.getBoundingClientRect(), r0 = roll.notes.length;
      g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 22, clientX: gr.left + 40, clientY: gr.top + 40 })); g.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 22 }));
      if (roll.notes.length !== r0 + 1) throw Error('note du Piano Roll en mode Pro');
      $('c92Bar').querySelector('[data-win="dockBeat"]').click(); await sleep(30);
      const step = document.querySelector('[aria-label="CLAP pas 3"]'), on0 = step.classList.contains('active'); step.click();
      if (step.classList.contains('active') === on0) throw Error('pas de batterie en mode Pro');
      if (WS0) { $('c92Bar').querySelector('.c92Exit').click(); await sleep(300); } else { P.exit(); await sleep(100); }
      for (const [id, parent] of parents) if ($(id) && $(id).parentElement !== parent) throw Error(id + ' pas revenu à sa place après usage');
      return '5 fenêtres sans chevauchement, déplacement/poignée/clavier OK, disposition mémorisée, menu Réglages entier, lecture/Mute/inspecteur/Piano Roll/batterie OK, accueil identique après sortie (' + before.size + ' éléments)';
    }],
    ['29 Packs (limiteur, de-esser, Shire, Warlick, Hardy Bay)', async () => {
      const K = window.JACK22_PACKS, D = window.Jack22Lot3DSP;
      if (!K) throw new Skip('pas de packs dans cette version');
      stopAll(); K.setLimit({ on: false, ceiling: -1, drive: 0 }); await sleep(300); await until(() => !Jack22Lot3.pending, 60000, 200);
      // Limiteur éteint : export identique à l'octet ; allumé : plafond respecté.
      // Le navigateur arrondit parfois un échantillon isolé d'1/32768 d'un export à l'autre (déjà vu sur la 9.2) : comparaison à 1 pas près.
      const pcm = async blob => new Int16Array((await blob.arrayBuffer()).slice(44));
      const gap = (x, y) => { if (x.length !== y.length) return Infinity; let m = 0, n = 0; for (let i = 0; i < x.length; i++) { const d = Math.abs(x[i] - y[i]); if (d) { n++; m = Math.max(m, d); } } return m > 1 ? Infinity : m; };
      const a = await pcm((await exportOnce()).blob);
      K.setLimit({ on: true, ceiling: -12, drive: 12 }); const dl = await exportOnce(), wl = await readWav(dl.blob), l = await pcm(dl.blob);
      K.setLimit({ on: false, ceiling: -1, drive: 0 }); const c = await pcm((await exportOnce()).blob); show('studio');
      if (gap(a, c) === Infinity) throw Error('limiteur éteint : export différent');
      if (gap(a, l) !== Infinity) throw Error('limiteur allumé sans effet');
      if (!wl.finite || wl.peak > 0.36 || wl.peak < 0.1) throw Error('crête avec limiteur à −12 dB : ' + wl.peak.toFixed(3));
      // Sauvegarde : bloc limit écrit, relu, absent = éteint ; sauvegarde du projet.
      K.setLimit({ on: true, ceiling: -3, drive: 2 });
      const f = currentFxSave(); if (!f.limit || f.limit.ceiling !== -3) throw Error('limiteur absent de la sauvegarde');
      if (parseFxSave(Object.assign({}, f, { limit: { on: true, ceiling: 5, drive: 0 } })) !== null) throw Error('plafond invalide accepté');
      await ProjectPersistence.save(); await until(() => !persistBusy, 20000);
      K.setLimit({ on: false, ceiling: -1, drive: 0 });
      confirmAnswer = true; await ProjectPersistence.load(); await until(() => !persistBusy, 20000);
      if (!K.limit.on || K.limit.ceiling !== -3 || K.limit.drive !== 2) throw Error('limiteur non retrouvé au chargement : ' + JSON.stringify(K.limit));
      if (!$('c93LimOn').checked || $('c93LimCeil').value !== '-3') throw Error('panneau du limiteur pas à jour');
      const nf = Object.assign({}, f); delete nf.limit; applyFxSave(nf); if (K.limit.on) throw Error('ancien projet sans limiteur : limiteur resté allumé');
      // De-esser : chaîne voix sur bruit blanc, les aigus baissent ; réglage absent = chaîne d'avant.
      const render = async deess => { const ctx = new OfflineAudioContext(1, 44100, 44100), b = ctx.createBuffer(1, 44100, 44100), x = b.getChannelData(0); let s = 7; for (let i = 0; i < x.length; i++) { s = (s * 16807) % 2147483647; x[i] = (s / 2147483647 - 0.5); }
        const src = ctx.createBufferSource(); src.buffer = b; const cfg = D.validate(D.defaults()); if (deess) cfg.deess = deess; buildFxChain(ctx, src, ctx.destination, cfg); src.start(); const y = (await ctx.startRendering()).getChannelData(0); let e = 0; for (let i = 4410; i < y.length; i++) e += y[i] * y[i]; return Math.sqrt(e / (y.length - 4410)); };
      const r0 = await render(null), r1 = await render({ on: true, amount: 100, freq: 5000 }), r2 = await render({ on: false, amount: 100, freq: 5000 });
      if (!(r1 < r0 * 0.8)) throw Error('de-esser sans effet sur les aigus (' + r0.toFixed(3) + ' → ' + r1.toFixed(3) + ')');
      if (r2 !== r0) throw Error('de-esser éteint : rendu différent');
      if ('deess' in D.validate(D.defaults())) throw Error('de-esser présent par défaut');
      // Shire sur la voix (démo si besoin), onglet De-esser des effets voix.
      show('dockVoices');
      if (!audioClips.some(c => c.buffer && c.voice)) { $('l3Demo').click(); await until(() => audioClips.some(c => c.buffer && c.voice), 20000); }
      await until(() => !Jack22Lot3.pending, 60000, 200);
      const tabBtn = [...document.querySelectorAll('#l3Editor [data-c88-fx]')].find(b => b.textContent === 'De-esser');
      if (!tabBtn) throw Error('onglet De-esser absent'); tabBtn.click(); await sleep(30);
      if ($('c93Deess').hidden) throw Error('carte De-esser cachée après clic');
      show('dockTools'); const rap = document.querySelector('[data-c93-shire="rap"]'); await until(() => !rap.disabled, 3000);
      // Après un chargement, la voix est recalculée en différé : Shire attend (message), comme pour l'utilisateur on réessaie.
      const vclip = () => audioClips.find(c => c.voice && c.voice.slot === Number($('l3Slot').value));
      await until(async () => { if (!Jack22Lot3.pending) rap.click(); await sleep(400); return Jack22Lot3.settings(vclip())?.deess; }, 60000, 100).catch(() => {});
      await until(() => !Jack22Lot3.pending, 60000, 200);
      const clip = audioClips.find(c => c.voice && c.voice.slot === Number($('l3Slot').value)), st = Jack22Lot3.settings(clip);
      if (!st.deess || st.deess.amount !== 60 || st.comp.thr !== -20 || !st.eq.on) throw Error('Shire Rap non appliqué : ' + $('c93Status').textContent + ' (piste ' + $('l3Slot').value + ', clips ' + audioClips.map(c => c.voice && c.voice.slot).join() + ')');
      if (!Jack22Lot3.prepared(clip)) throw Error('voix non recalculée après Shire');
      show('dockVoices'); tabBtn.click(); await sleep(700);
      if (!document.querySelector('[data-c93-deess="on"]').checked || document.querySelector('[data-c93-deess="amount"]').value !== '60') throw Error('carte De-esser pas à jour');
      // Warlick et Hardy Bay.
      show('dockTools'); document.querySelector('[data-c93-warlick="master"]').click();
      if (!K.limit.on || Number($('fxLow')?.value ?? 2) !== 2) throw Error('Warlick Master non appliqué');
      document.querySelector('[data-c93-warlick="neutre"]').click(); if (K.limit.on) throw Error('Warlick Neutre : limiteur resté allumé');
      document.querySelector('[data-c93-hardy="afro"]').click();
      if ($('mixHat').value !== '85' || $('mixKick').value !== '90') throw Error('Hardy Bay non appliqué');
      document.querySelector('[data-c93-hardy="equilibre"]').click(); show('studio');
      return 'limiteur éteint = export identique, allumé = crête ' + wl.peak.toFixed(3) + ' ; sauvegarde/chargement OK ; de-esser −' + Math.round(100 - 100 * r1 / r0) + ' % sur bruit blanc ; Shire, Warlick, Hardy Bay appliqués';
    }],
    ['30 Mode afro, guitare, Hardy Bay par instrument', async () => {
      const AF = window.JACK22_AFRO;
      if (!AF) throw new Skip('pas de mode afro dans cette version');
      stopAll(); await sleep(300); await until(() => !Jack22Lot3.pending && !persistBusy, 180000, 200);
      if (!PRESETS.guitar || ![...$('preset').options].some(o => o.value === 'guitar')) throw Error('son Guitare absent du synthé');
      const n0 = song.tracks.map(t => t.patterns.length);
      AF.applyAfro('afrobeats', { bass: true, guitar: true, tempo: true }); await sleep(100);
      const act = i => song.tracks[i].patterns[song.tracks[i].active];
      if (song.tracks.some((t, i) => t.patterns.length !== n0[i] + 1)) throw Error('patterns non ajoutés');
      if (act(0).grid[0].join() !== AF.AFRO.afrobeats.drums[0].join()) throw Error('batterie afrobeats non choisie');
      if (!act(1).notes.length || act(1).notes.some(n => n.preset !== 'sub808')) throw Error('basse 808 absente');
      if (!act(2).notes.length || act(2).notes.some(n => n.preset !== 'guitar')) throw Error('riff guitare absent');
      if ($('bpm').value !== '104') throw Error('tempo : ' + $('bpm').value);
      // Annuler (historique du morceau) retire tout l'ajout en une fois ; Rétablir le remet.
      $('v8Undo').click(); await sleep(300);
      if (song.tracks.some((t, i) => t.patterns.length !== n0[i]) || $('bpm').value === '104') throw Error('Annuler ne retire pas l’ajout afro');
      // Annuler peut relancer le calcul d'une voix : Rétablir attend la fin de ce calcul, comme pour l'utilisateur.
      await sleep(300); await until(() => !Jack22Lot3.pending && !persistBusy, 180000, 200);
      $('v8Redo').click(); await sleep(300); await until(() => !Jack22Lot3.pending && !persistBusy, 180000, 200);
      if (song.tracks.some((t, i) => t.patterns.length !== n0[i] + 1) || act(2).notes[0]?.preset !== 'guitar') throw Error('Rétablir ne remet pas l’ajout afro');
      // La guitare s'entend : export en mode PATTERN, mélodie coupée puis rétablie.
      $('modePattern')?.click(); await sleep(50);
      const on = await readWav((await exportOnce()).blob); song.tracks[2].mute = true;
      const off = await readWav((await exportOnce()).blob); song.tracks[2].mute = false; show('studio');
      if (!on.finite || on.peak <= 0) throw Error('export afro silencieux');
      if (Math.abs(on.rms - off.rms) < 1e-4) throw Error('guitare inaudible dans l’export');
      // Hardy Bay : égaliseurs dans les racks, effets personnels conservés.
      const R = window.JACK22_RACKS; let rack = 'sans racks';
      if (R && R.apply) {
        R.apply(s => { (s.chains.drums = s.chains.drums || []).push({ id: 'mine', type: 'gain', on: true, params: { db: 0 } }); });
        document.querySelector('[data-c93-hardy="afro"]').click(); await sleep(100);
        let d = R.settings.chains.drums.map(e => e.id).join();
        if (d !== 'mine,hbeq,hbcomp') throw Error('racks batterie après Percussions afro : ' + d);
        document.querySelector('[data-c93-hardy="equilibre"]').click(); await sleep(100);
        d = R.settings.chains.drums.map(e => e.id).join();
        if (d !== 'mine,hbeq' || R.settings.chains.bass.find(e => e.id === 'hbeq').params.high !== -3) throw Error('racks après Équilibré : ' + d);
        if ($('mixHat').value !== '65') throw Error('volumes Hardy Bay');
        R.apply(s => { for (const k of Object.keys(s.chains)) delete s.chains[k]; });
        rack = 'égaliseurs posés dans les racks, effet personnel conservé';
      }
      if (!document.querySelector('[data-c93-warlick="afro"]')) throw Error('Warlick Master afro absent');
      return 'Afrobeats : batterie, basse 808, guitare, 104 BPM ; guitare audible (RMS ' + off.rms.toFixed(4) + ' → ' + on.rms.toFixed(4) + ') ; Annuler/Rétablir OK ; Hardy Bay : ' + rack;
    }],
    ['31 Espaces 11.5 (navigation, retours, fenêtres libres)', async () => {
      const WS = window.JACK22_WORKSPACE;
      if (!WS) throw new Skip('pas d’espaces dans cette version');
      if (innerWidth < 900) throw new Skip('espaces empilés sur écran étroit : contrôlés par le test 23');
      stopAll(); if (!WS.on) WS.enter(); await sleep(200);
      const real = el => { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.click(); };
      const shown = () => [...$('dockStage').children].filter(p => p.classList.contains('panel') && p.offsetWidth > 40 && p.offsetHeight > 40).map(p => p.id);
      const want = { 'Arrangement': ['timeline'], 'Batterie': ['dockBeat'], 'Piano Roll': ['roll', 'synth'], 'Console': ['mixer', 'fx'], 'Voix & texte': ['cVoices'] };
      for (const [name, ids] of Object.entries(want)) {
        room(name); await sleep(250); const s = shown();
        for (const id of ids) if (!s.includes(id)) throw Error('espace ' + name + ' : ' + id + ' absent (' + s.join() + ')');
        if (document.documentElement.scrollWidth > innerWidth + 1) throw Error('débordement dans ' + name);
      }
      // Outils du menu : « Retour au studio » ramène aux espaces.
      const tools = () => [...document.querySelectorAll('#j93Nav details')].find(d => /^Outils/.test(d.querySelector('summary').textContent.trim()));
      for (const label of ['Sons & sampler', 'Packs & mode afro']) {
        real(tools().querySelector('summary')); await sleep(150);
        const item = [...tools().querySelectorAll('button')].find(b => b.textContent.trim() === label);
        if (!item) { if (label === 'Packs & mode afro' && !window.JACK22_AFRO) continue; throw Error('« ' + label + ' » absent du menu Outils'); }
        real(item); await sleep(400);
        if (label === 'Packs & mode afro' && !($('c93Packs').offsetWidth > 200)) throw Error('panneau Packs non affiché');
        real(document.querySelector('#dockTools [data-dock-close]')); await sleep(500);
        if (!WS.on || !spaces()) throw Error('retour au studio après « ' + label + ' » : ancien écran au lieu des espaces');
      }
      // Fenêtres libres depuis le menu Projet : synthé visible, retour aux espaces.
      document.querySelector('.dockProject').open = true; $('c92Enter').click(); await sleep(400);
      if (!$('c92Bar').offsetWidth) throw Error('« Mode Pro (fenêtres)… » sans effet');
      if (!($('synth').offsetWidth > 0) && !$('synth').classList.contains('c92Closed')) throw Error('fenêtre Synthé Orbite invisible');
      $('c92Bar').querySelector('.c92Exit').click(); await sleep(500);
      if (!WS.on) throw Error('sortie des fenêtres libres : ancien écran au lieu des espaces');
      return Object.keys(want).length + ' espaces avec leurs panneaux, sans débordement ; retours depuis Outils et fenêtres libres vers les espaces ; synthé visible en fenêtre';
    }],
    ['32 Prises : remplacer sur la piste', async () => {
      const V = window.JACK22_VOIX_MAQUETTE;
      if (!V || !V.useTake) throw new Skip('pas de choix de prise dans cette version');
      stopAll(); await sleep(200); await until(() => !Jack22Lot3.pending && !persistBusy, 180000, 200);
      window.JACK22_WORKSPACE?.choose('voice', 'record'); await sleep(400);
      [...document.querySelectorAll('#j109VoiceTabs button')][0]?.click(); await sleep(200);
      let c1 = audioClips.find(c => c.voice && c.voice.slot === 1);
      if (!c1) { $('l3Demo').click(); await until(() => audioClips.find(c => c.voice && c.voice.slot === 1), 20000); await until(() => !Jack22Lot3.pending, 180000, 200); c1 = audioClips.find(c => c.voice && c.voice.slot === 1); }
      // Seconde prise gardée muette, comme après une prise en plusieurs passes (deux fois moins forte).
      const b = c1.buffer, ch = Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i).map(s => s * 0.5));
      const c2 = await JACK22_PRODUCTION.newAudio({ sampleRate: b.sampleRate }, ch, 'VOIX 1 · passe test', c1.startBar);
      const prod = JACK22_PRODUCTION.config; prod.clips = prod.clips || {}; prod.clips[c2.id] = { mute: true, archivedVoice: JSON.parse(JSON.stringify(c1.voice)) };
      const v = VoiceStore.capture(); v.production97 = prod; VoiceStore.setText(v); tlBuild(); await sleep(700);
      const rows = () => [...document.querySelectorAll('#c120Takes li')];
      if (rows().length < 2) throw Error('les deux prises ne sont pas listées');
      const cb = rows().map(l => l.querySelector('input')).find(i => i && !i.disabled); cb.click(); await sleep(400);
      const btn = [...document.querySelectorAll('#c120Takes button')].find(x => x.textContent === 'Remplacer sur la piste');
      if (btn.disabled) throw Error('« Remplacer sur la piste » grisé après avoir coché');
      btn.click(); await sleep(300); await until(() => !Jack22Lot3.pending, 180000, 200);
      if (c1.voice || c2.voice?.slot !== 1 || !JACK22_PRODUCTION.config.clips[c1.id]?.mute) throw Error('échange de prise incomplet');
      if (!rows()[0].classList.contains('sel')) throw Error('la nouvelle prise n’est pas marquée SÉLECTIONNÉE');
      $('v8Undo').click(); await sleep(300); await until(() => !Jack22Lot3.pending, 180000, 200);
      if (!audioClips.find(c => c.id === c1.id)?.voice) throw Error('Annuler ne remet pas la première prise');
      return 'deux prises listées, la seconde mise sur la piste (la première gardée muette), Annuler revient en arrière';
    }],
    ['33 Coller des notes (format Signal)', async () => {
      const K = window.JACK22_COLLER;
      if (!K) throw new Skip('pas de « Coller des notes » dans cette version');
      stopAll(); await sleep(200); await until(() => !Jack22Lot3.pending && !persistBusy, 180000, 200);
      K.open(); await sleep(200);
      const dlg = $('c124Dlg'), ta = dlg.querySelector('textarea'), sel = dlg.querySelector('select'), go = [...dlg.querySelectorAll('button')].find(b => b.textContent === 'Coller dans JACK22');
      // Texte d'IA avec bloc ```json, nom de note, force et une note trop aiguë.
      sel.value = '2'; sel.dispatchEvent(new Event('change'));
      ta.value = 'Voici :\n```json\n[{"midi":69,"time":0,"duration":0.5,"velocity":0.9},{"midi":"C5","time":0.5,"duration":0.5},{"midi":76,"time":1,"duration":1},{"midi":110,"time":4,"duration":1}]\n```'; ta.dispatchEvent(new Event('input'));
      if (go.disabled) throw Error('mélodie refusée : ' + dlg.querySelector('.preview').textContent);
      const n0 = song.tracks[2].patterns.length; go.click(); await sleep(500);
      const tr = song.tracks[2], p = tr.patterns[tr.active];
      if (tr.patterns.length !== n0 + 1 || p.notes.length !== 4) throw Error('pattern collé incorrect');
      const c5 = p.notes.find(n => n.start === 2); if (!c5 || (c5.octave + 1) * 12 + c5.idx !== 72) throw Error('« C5 » mal lu');
      if (p.notes[0].velocity !== 90 || p.bars !== 2) throw Error('force ou longueur incorrecte');
      // Texte invalide : refusé, avec un message.
      K.open(); await sleep(100); ta.value = '[{"midi":60}]'; ta.dispatchEvent(new Event('input'));
      if (!go.disabled || !/incomplète/.test(dlg.querySelector('.preview').textContent)) throw Error('note incomplète acceptée');
      // Batterie GM sur la grille.
      sel.value = '0'; sel.dispatchEvent(new Event('change')); ta.value = '[{"midi":36,"time":0},{"midi":38,"time":1},{"midi":42,"time":0.5},{"midi":39,"time":3}]'; ta.dispatchEvent(new Event('input'));
      go.click(); await sleep(500);
      const g = song.tracks[0].patterns[song.tracks[0].active].grid;
      if (!g[0][0] || !g[1][4] || !g[2][2] || !g[3][12]) throw Error('batterie mal placée');
      dlg.close();
      $('v8Undo').click(); await sleep(400); $('v8Undo').click(); await sleep(400);
      if (song.tracks[2].patterns.length !== n0) throw Error('Annuler ne retire pas le pattern collé');
      return 'mélodie (bloc ```json, « C5 », force, octave ramenée) et batterie collées, note incomplète refusée, Annuler OK';
    }],
    ['34 Projet portable au-delà de 11 audios (Mission 1)', async () => {
      if (typeof ZIP_MAX_ENTRIES === 'undefined' || typeof Zip === 'undefined') throw new Skip('pas de projet portable dans cette version');
      if (!window.JACK22_M1) { for (const u of ['/tools/m1-tests.js', 'm1-tests.js', 'tests/m1-tests.js']) { try { const r = await fetch(u); if (r.ok) { (0, eval)(await r.text()); break; } } catch (e) {} } }
      const M = window.JACK22_M1; if (!M) throw new Skip('m1-tests.js introuvable à côté de la suite');
      stopAll(); await sleep(200); await until(() => !Jack22Lot3.pending && !persistBusy, 180000, 200);
      const prev = ProjectTransfer.snapshot();
      try {
        const z = await M.zipLimits(), bad = z.filter(x => (x.audios <= 27) !== (x.lecture === 'ok'));
        if (bad.length) throw Error('limites ZIP : ' + bad.map(x => x.audios + ' audios → ' + x.lecture).join(' ; '));
        for (const n of [12, 27]) { const r = await M.roundTrip(n); if (!r.identique || r.clips !== n) throw Error(n + ' audios : ' + r.import); }
        const t = await M.tooMany(); if (t.archiveProposee) throw Error('28 audios : archive proposée malgré la limite');
      } finally { ProjectTransfer.rollback(prev); await sleep(300); }
      return 'ZIP lu de 0 à 27 audios, 28 refusé ; 12 et 27 audios exportés puis rouverts à l’identique ; projet remis';
    }],
    ['21 Aucune erreur JavaScript', async () => {
      // « ResizeObserver loop… » : simple avis du navigateur (une mise en page refaite à l'image suivante), pas une erreur du studio.
      const real = errors.filter(e => !/^alert:/.test(e) && !/^ResizeObserver loop/.test(e));
      if (real.length) throw Error(real.slice(0, 3).join(' | '));
      return 'aucune erreur pendant la suite' + (errors.length ? ' (messages : ' + errors.length + ')' : '');
    }],
  ];

  window.JACK22_LOT8_TESTS = async (only) => {
    const results = [];
    for (const [name, fn] of tests) {
      if (only && !only.test(name)) continue;
      const t = performance.now();
      try { results.push({ test: name, ok: true, detail: await fn() }); }
      catch (e) { results.push({ test: name, ok: e instanceof Skip ? null : false, detail: e.message }); }
      results.at(-1).ms = Math.round(performance.now() - t);
    }
    stopAll();
    const passed = results.filter(r => r.ok === true).length, skipped = results.filter(r => r.ok === null).length;
    return { passed, skipped, failed: results.length - passed - skipped, total: results.length, results, downloads: downloads.map(d => d.name) };
  };
})();
