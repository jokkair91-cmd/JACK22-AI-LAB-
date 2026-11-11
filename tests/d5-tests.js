/* JACK22 — tests de la 6.6 (Mission 0 : message de prise du Clavier), à charger dans la page du studio.
   Ordinateur seulement (demande de Bob) : sous 700 px de large, les cas sont déclarés « non exécutés ».
   Usage : JACK22_D5.run().then(r => console.table(r)). La prise de test est supprimée à la fin. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE;
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const view = async (g, s) => { WS().choose(g, s); await sleep(450); };
  const until = async (fn, ms, step = 100) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(step); } return null; };
  const layout = () => { const tb = document.querySelector('#synth .dockSynthToolbar'), pf = $('j108Performance'); return tb && pf && tb.getBoundingClientRect().height < 42 && Math.abs(tb.getBoundingClientRect().top - pf.getBoundingClientRect().top) < 12 ? 'une ligne' : 'plusieurs lignes'; };
  const rel = () => { const o = $('synth').getBoundingClientRect(); return ['recRec', 'recStop', 'recPlay', 'piano'].map(id => $(id)).filter(Boolean).map(e => { const r = e.getBoundingClientRect(); return e.id + '@' + Math.round(r.left - o.left) + ',' + Math.round(r.top - o.top) + ',' + Math.round(r.width); }).join(' '); };
  // Le message est-il lisible ou consultable, là où il est ? Renvoie une description, ou lève une erreur.
  const readable = async () => {
    const s = $('recStatus'), sy = $('synth'), full = s.textContent.trim();
    s.scrollIntoView({ block: 'center' }); await sleep(150);
    const r = s.getBoundingClientRect(), p = $('piano').getBoundingClientRect();
    if (!vis(s)) throw Error('message invisible (' + layout() + ')');
    for (const x of [r.left + 6, r.left + Math.min(r.width - 6, 60)]) { const t = document.elementFromPoint(x, r.top + r.height / 2); if (!t || !s.contains(t)) throw Error('message recouvert par ' + ((t && (t.id || String(t.className).slice(0, 30))) || 'rien (hors écran)')); }
    if (r.bottom > p.top + 1 && r.top < p.bottom - 1) throw Error('message sur le clavier');
    if (sy.classList.contains('c136Chip')) {
      if (s.tabIndex !== 0 || s.getAttribute('aria-label') !== full || s.dataset.c136full !== full) throw Error('pastille non consultable au clavier');
      s.dispatchEvent(new MouseEvent('mouseenter')); await sleep(80); const tip = getComputedStyle(s, '::after').content;
      s.dispatchEvent(new MouseEvent('mouseleave')); await sleep(50);
      if (!tip || tip === 'none' || !tip.includes('Prise')) throw Error('le message entier ne s’affiche pas au survol de la pastille');
      return 'pastille « ⓘ Prise » consultable (survol et Tab)';
    }
    if (sy.classList.contains('c136On') && s.title !== full) throw Error('texte complet absent au survol');
    // Le message ne doit couvrir aucun réglage du Clavier (Preset, Octave, boutons).
    const ctrls = [...$('synth').querySelectorAll('.dockSynthToolbar select, .dockSynthToolbar button, .dockSynthToolbar input, #j108Performance button')].filter(vis);
    const hit = ctrls.find(c => { const q = c.getBoundingClientRect(); return q.left < r.right - 1 && q.right > r.left + 1 && q.top < r.bottom - 1 && q.bottom > r.top + 1; });
    if (hit) throw Error('message posé sur un réglage : ' + (hit.id || hit.textContent.trim().slice(0, 16) || hit.tagName));
    return Math.round(r.width) + ' px lisibles';
  };

  const cases = [
    ['Vraie prise au Clavier : message lisible ou consultable', async () => {
      await view('compose', 'roll'); if (!vis($('synth'))) throw Error('Clavier non affiché');
      if (rec.state !== 'idle') throw Error('enregistreur déjà occupé');
      if (take) { $('recDel').click(); await sleep(200); }
      const before = rel();
      $('recRec').click();
      if (!(await until(() => rec.state !== 'idle' && stepLog.length, 8000))) throw Error('REC ne démarre pas');
      // Joue sur les vraies touches du clavier (événements souris), pendant la prise.
      const keys = [...document.querySelectorAll('#piano .key.white')].slice(0, 8);
      await until(() => { try { return absNow() >= 0; } catch (e) { return false; } }, 8000, 50);
      for (let i = 0; i < 6 && rec.state !== 'idle'; i++) {
        const k = keys[i % keys.length], r = k.getBoundingClientRect(), o = { bubbles: true, pointerId: 7, isPrimary: true, clientX: r.left + r.width / 2, clientY: r.bottom - 8, button: 0, buttons: 1 };
        k.dispatchEvent(new PointerEvent('pointerdown', o)); await sleep(160); k.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 })); await sleep(160);
      }
      let how = 'touches à la souris';
      if (!rec.raw.length && rec.state !== 'idle') { how = 'touches non captées par les événements simulés : notes jouées par le moteur du clavier (noteOn)'; for (let i = 0; i < 4 && rec.state !== 'idle'; i++) { noteOn('t' + i, i * 2); await sleep(150); noteOff('t' + i); await sleep(150); } }
      if (!(await until(() => rec.state === 'idle', 20000))) { $('recStop').click(); await sleep(300); }
      const s = $('recStatus'); const ok = await until(() => /^Prise : \d+ note/.test(s.textContent.trim()) && !s.classList.contains('c116Idle'), 5000);
      if (!ok) throw Error('pas de message de prise après l’enregistrement : « ' + s.textContent.trim() + ' »');
      await sleep(200);
      const where = await readable();
      if (rel() !== before) throw Error('REC/STOP/PLAY ou clavier déplacés');
      return 'prise réelle (' + how + ') → « ' + s.textContent.trim().slice(0, 28) + '… » ; ' + layout() + ' : ' + where + ' ; boutons et clavier immobiles';
    }],
    ['Départ du Piano Roll puis retour', async () => {
      await view('compose', 'roll'); const s = $('recStatus');
      if (!/^Prise/.test(s.textContent.trim())) return 'aucune prise en cours (cas précédent en échec) : rien à vérifier';
      await view('compose', 'arrange');
      // Au départ : plus aucune mise en place, et le message n'apparaît nulle part sur l'écran d'arrangement.
      if ($('synth').classList.contains('c136On')) throw Error('mise en place laissée active hors du Piano Roll');
      if (vis(s)) { const r = s.getBoundingClientRect(), t = document.elementFromPoint(r.left + 6, r.top + r.height / 2); if (t && s.contains(t)) throw Error('message de prise visible sur l’écran Arrangement'); }
      await view('compose', 'roll');
      // Au retour : le studio a remis le message à sa place, et il est de nouveau lisible.
      if (!$('j108Performance')?.contains(s)) throw Error('message non remis dans la zone du Clavier');
      const where = await readable();
      return 'départ : rien ne reste affiché hors du Piano Roll ; retour : ' + layout() + ', ' + where;
    }],
    ['Boutons immobiles, avec ou sans message', async () => {
      await view('compose', 'roll'); const s = $('recStatus');
      const was = { t: s.textContent, idle: s.classList.contains('c116Idle') };
      s.classList.add('c116Idle'); await sleep(250); const a = rel();
      s.classList.remove('c116Idle'); s.textContent = 'Prise : 3 notes · 2 mesures. REC pour en refaire une, ou Supprimer.'; await sleep(250); const b = rel();
      s.textContent = was.t; s.classList.toggle('c116Idle', was.idle); await sleep(150);
      if (a !== b) throw Error('déplacés : ' + a + ' / ' + b);
      return 'REC, STOP, PLAY et clavier immobiles (' + layout() + ')';
    }],
    ['Réglages du Clavier sans chevauchement', async () => {
      await view('compose', 'roll'); if (!vis($('synth'))) throw Error('Clavier non affiché');
      const ctrls = [...$('synth').querySelectorAll('.dockSynthToolbar select, .dockSynthToolbar button, #j108Performance button, #j108Performance summary')].filter(vis);
      for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) {
        const a = ctrls[i].getBoundingClientRect(), b = ctrls[j].getBoundingClientRect();
        if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) throw Error('« ' + (ctrls[i].id || ctrls[i].textContent.trim().slice(0, 14)) + ' » chevauche « ' + (ctrls[j].id || ctrls[j].textContent.trim().slice(0, 14)) + ' »');
      }
      const vb = document.querySelector('#synth .dockVolumePlanet'), vl = vb?.querySelector('label');
      // L'étiquette ne doit pas déborder de sa boîte (sinon le texte passe sous le bouton sans que les boîtes se touchent).
      if (vl && vis(vl) && vl.scrollWidth > vl.clientWidth + 1) throw Error('« VOLUME SYNTHÉ » déborde de sa place (' + vl.scrollWidth + ' > ' + vl.clientWidth + ' px)');
      const vp = vb ? [vl, vb.querySelector('.skinDial'), $('synthVolVal')].filter(vis).map(e => e.getBoundingClientRect()) : [];
      for (let i = 0; i < vp.length; i++) for (let j = i + 1; j < vp.length; j++) { const a = vp[i], b = vp[j]; if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) throw Error('« VOLUME SYNTHÉ » : étiquette, bouton ou valeur se chevauchent'); }
      return ctrls.length + ' réglages (Preset, Octave, REC, STOP, PLAY, Options…) et le volume synthé sans aucun chevauchement (' + layout() + ')';
    }],
    ['Pastille quand la place manque (forcée)', async () => {
      await view('compose', 'roll'); if (layout() !== 'une ligne') return 'Clavier sur plusieurs lignes à cette taille : pas de pastille (message sur sa ligne)';
      const s = $('recStatus'), sy = $('synth'), tb = sy.querySelector('.dockSynthToolbar'), was = { t: s.textContent, idle: s.classList.contains('c116Idle') };
      s.classList.remove('c116Idle'); s.textContent = 'Prise : 3 notes · 2 mesures. REC pour en refaire une, ou Supprimer.';
      // Occupe la place libre pour la réduire sous 90 px (aucune largeur réelle ne le fait aujourd'hui).
      const free = parseFloat(sy.style.getPropertyValue('--c136w')) || 0, fill = document.createElement('span');
      fill.style.cssText = 'display:inline-block;flex:none;width:' + Math.max(0, free - 50) + 'px'; tb.insertBefore(fill, [...tb.children].find(e => e !== s && e.getBoundingClientRect().width > 0));
      const wrapWas = tb.style.flexWrap; tb.style.flexWrap = 'nowrap';
      window.JACK22_MSG136.fit(); await sleep(200);
      try {
        if (!sy.classList.contains('c136Chip')) throw Error('pas de pastille avec ' + sy.style.getPropertyValue('--c136w') + ' de place');
        return await readable();
      } finally { fill.remove(); tb.style.flexWrap = wrapWas; s.textContent = was.t; s.classList.toggle('c116Idle', was.idle); window.JACK22_MSG136.fit(); await sleep(150); }
    }],
    ['Samples ouvert : clavier et REC visibles', async () => {
      await view('compose', 'roll');
      const sb = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Samples' && vis(b)); if (!sb) return 'bouton Samples absent à cette taille';
      const lib = () => vis($('j93Library')); const opened = !lib(); if (opened) { sb.click(); await sleep(700); }
      try {
        if (!lib()) return 'panneau Samples non affiché à cette taille';
        const s = $('recStatus'), was = { t: s.textContent, idle: s.classList.contains('c116Idle') };
        s.classList.add('c116Idle'); await sleep(300); const a = rel();
        s.classList.remove('c116Idle'); s.textContent = 'Prise : 3 notes · 2 mesures. REC pour en refaire une, ou Supprimer.'; await sleep(300);
        if (rel() !== a) throw Error('REC/STOP/PLAY ou clavier bougent quand le message apparaît : ' + a + ' / ' + rel());
        const ph = $('piano').getBoundingClientRect().height; if (ph < 50) throw Error('clavier écrasé : ' + Math.round(ph) + ' px de haut');
        const rr = $('recRec').getBoundingClientRect(), t = document.elementFromPoint(rr.left + 10, rr.top + rr.height / 2); if (!t || !$('recRec').contains(t)) throw Error('REC recouvert');
        const where = await readable(); s.textContent = was.t; s.classList.toggle('c116Idle', was.idle);
        return 'clavier ' + Math.round(ph) + ' px, REC cliquable, message ' + where + ' (' + layout() + ')';
      } finally { if (opened && lib()) { sb.click(); await sleep(400); } }
    }],
    ['Bas de page jamais caché par la barre de lecture', async () => {
      await view('compose', 'roll');
      const bar = $('c119Bar'); if (!bar || getComputedStyle(bar).position !== 'fixed') return 'barre de lecture non fixe à cette taille';
      scrollTo(0, document.documentElement.scrollHeight); await sleep(150);
      const last = $('j108Performance').getBoundingClientRect(), b = bar.getBoundingClientRect();
      if (last.bottom > b.top + 1 && last.bottom > innerHeight - b.height) throw Error('la ligne REC/STOP/PLAY reste sous la barre de lecture (' + Math.round(last.bottom) + ' > ' + Math.round(b.top) + ')');
      scrollTo(0, 0);
      return 'en bas de page, la zone REC/STOP/PLAY finit au-dessus de la barre de lecture';
    }],
  ];

  async function run(only) {
    const out = [];
    if (innerWidth < 700) return cases.filter(c => !only || only.test(c[0])).map(c => ({ cas: c[0], ok: null, detail: 'non exécuté : ' + innerWidth + ' px, hors périmètre (ordinateur seulement)' }));
    document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (e) {} });
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t);
      }
    } finally {
      try { if (rec.state !== 'idle') $('recStop').click(); if (take) $('recDel').click(); } catch (e) {}
      scrollTo(0, 0); WS()?.choose('compose', 'arrange'); await sleep(300);
    }
    return out;
  }
  window.JACK22_D5 = { run, cases: cases.map(c => c[0]) };
})();
