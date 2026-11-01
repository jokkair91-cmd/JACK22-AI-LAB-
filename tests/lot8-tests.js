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
      const C = window.JACK22_COMPACT;
      if (!C) throw new Skip('pas d’espaces compacts 8.8 dans cette version');
      const notes = [];
      // Sous-vues : chaque bouton ne montre que ses panneaux, « Vue complète » les remet tous.
      let views = 0;
      for (const pane of document.querySelectorAll('.dockPane')) {
        show(pane.id); const grid = pane.querySelector('.compact88Grid');
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
        show(pane.id);
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
    ['21 Aucune erreur JavaScript', async () => {
      const real = errors.filter(e => !/^alert:/.test(e));
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
