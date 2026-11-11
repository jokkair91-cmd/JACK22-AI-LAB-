/* JACK22 — tests des retouches 6.4 (doublons, en-tête Console, clavier vert, notes vertes, volume synthé), à charger dans la page.
   Usage : JACK22_D3.run().then(r => console.table(r)). Le studio est remis sur Composition › Arrangement à la fin. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE;
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const view = async (g, s) => { WS().choose(g, s); await sleep(450); };
  const overflow = () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth;
  const settle = async () => { await sleep(150); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }); };

  const cases = [
    ['Plus de doublons, les vrais onglets marchent', async () => {
      await view('compose', 'roll');
      if (vis(document.querySelector('#c119Head .c119Seg'))) throw Error('« Batterie / Piano Roll » encore en double dans la barre de l’éditeur');
      if (vis(document.querySelector('#j93Nav [data-c118-console]'))) throw Error('onglet « Console » encore dans Composition');
      const sub = t => [...document.querySelectorAll('#j93Nav .j93Subs button')].find(b => b.textContent.trim() === t && vis(b));
      for (const [t, id] of [['Batterie', 'dockBeat'], ['Piano Roll', 'roll'], ['Arrangement', 'timeline']]) {
        const b = sub(t); if (!b) throw Error('onglet « ' + t + ' » absent en haut');
        b.click(); await sleep(450);
        if (!vis($(id))) throw Error('« ' + t + ' » n’ouvre plus sa vue');
      }
      const groups = [...document.querySelectorAll('#j93Nav .j93Groups button')].find(b => /Console/.test(b.textContent) && vis(b));
      if (!groups) throw Error('espace Console introuvable en haut');
      groups.click(); await sleep(450); if (!vis($('mixer'))) throw Error('l’espace Console n’ouvre plus le mixeur');
      return 'copies masquées ; Arrangement, Batterie, Piano Roll et l’espace Console s’ouvrent par les onglets du haut';
    }],
    ['Console : en-tête sur une ligne, faders entiers', async () => {
      await view('mix', 'mixer');
      const mx = $('mixer'); if (!vis(mx)) return 'console non affichée à cette taille';
      const parts = [mx.querySelector(':scope>.skinTop'), mx.querySelector(':scope>.dockBanks'), $('j106MixTools')].filter(vis);
      if (parts.length < 3) throw Error('élément d’en-tête manquant');
      // Titre, Instruments/Voix et outils sur une même rangée (les outils peuvent se replier sur eux-mêmes si la console est étroite).
      const tops = parts.map(p => p.getBoundingClientRect().top), oneLine = mx.getBoundingClientRect().width >= 520;
      if (oneLine && Math.max(...tops) - Math.min(...tops) > 8) throw Error('en-tête sur plusieurs rangées : ' + tops.map(Math.round).join('/'));
      const hb = Math.max(...parts.map(p => p.getBoundingClientRect().bottom)), bt = $('dockInstrumentBank').getBoundingClientRect().top;
      if (bt < hb - 1) throw Error('les faders passent sous l’en-tête');
      const mb = mx.getBoundingClientRect().bottom, bank = $('dockInstrumentBank');
      const cut = [...bank.children].filter(vis).filter(s => s.getBoundingClientRect().bottom > mb + 1);
      if (innerHeight >= 700 && cut.length) throw Error(cut.length + ' tranche(s) de fader coupée(s) en bas');
      const voix = [...mx.querySelectorAll('.dockBanks button')].find(b => /Voix/.test(b.textContent)), inst = [...mx.querySelectorAll('.dockBanks button')].find(b => /Instruments/.test(b.textContent));
      voix.click(); await sleep(300); const okV = vis(mx.querySelector('.dockVoiceBank')) || vis($('dockVoiceBank'));
      inst.click(); await sleep(300);
      if (!okV || !vis(bank)) throw Error('Instruments / Voix ne change plus la rangée de faders');
      return (oneLine ? 'en-tête sur une ligne' : 'en-tête replié (écran étroit)') + ' ; faders entiers ; Instruments / Voix fonctionnent';
    }],
    ['Clavier du bas vert, touches du Piano Roll inchangées', async () => {
      await view('compose', 'roll');
      const w = document.querySelector('#piano .key.white'), rk = document.querySelector('#roll .roll-key:not(.blk)');
      if (!vis(w)) return 'clavier non affiché à cette taille';
      const img = getComputedStyle(w).backgroundImage;
      if (!/196, 230, 188/.test(img)) throw Error('touche blanche pas verte : ' + img.slice(0, 80));
      if (rk && /196, 230, 188|159, 209, 154/.test(getComputedStyle(rk).backgroundImage)) throw Error('les touches du Piano Roll ont changé');
      return 'clavier du bas vert ; touches à gauche du Piano Roll comme avant';
    }],
    ['Notes vertes, note choisie entourée', async () => {
      await view('compose', 'roll');
      const g = $('rollGrid'); if (!g) return 'Piano Roll absent';
      // Note témoin (jamais enregistrée) : seule l'apparence est mesurée.
      const n = document.createElement('div'); n.className = 'rn p-lead'; n.style.cssText = 'left:0;top:0;width:40px'; g.append(n);
      const s = document.createElement('div'); s.className = 'rn p-lead sel'; s.style.cssText = 'left:60px;top:0;width:40px'; g.append(s);
      await settle(); const bg = getComputedStyle(n).backgroundColor, bs = getComputedStyle(s).borderTopColor; n.remove(); s.remove();
      if (bg !== 'rgb(143, 214, 160)') throw Error('note pas verte : ' + bg);
      if (bs !== 'rgb(242, 184, 75)') throw Error('note choisie sans contour orange : ' + bs);
      return 'notes vertes ; note choisie avec contour orange';
    }],
    ['Volume synthé : style graphite, réglage inchangé', async () => {
      await view('compose', 'roll');
      const box = document.querySelector('#synth .dockVolumePlanet'), dial = box?.querySelector('.skinDial'), inp = $('synthVol'), val = $('synthVolVal');
      if (!vis(dial)) return 'volume synthé non affiché à cette taille';
      const cs = getComputedStyle(dial);
      if (/246, 144, 136/.test(cs.backgroundImage)) throw Error('bouton encore rouge plein');
      if (cs.borderTopColor !== 'rgb(207, 47, 59)') throw Error('contour inattendu : ' + cs.borderTopColor);
      const sb = $('synth').getBoundingClientRect();
      for (const e of [box.querySelector('label'), dial, val]) { const r = e.getBoundingClientRect(); if (r.top < sb.top - 1 || r.bottom > sb.bottom + 1 || r.height < 9) throw Error('« ' + (e.textContent || 'bouton').trim().slice(0, 14) + ' » coupé'); }
      const was = inp.value; inp.value = '55'; inp.dispatchEvent(new Event('input', { bubbles: true })); await sleep(120);
      const shown = val.textContent.trim(); inp.value = was; inp.dispatchEvent(new Event('input', { bubbles: true })); await sleep(120);
      if (!/55/.test(shown)) throw Error('le réglage ne s’affiche plus : ' + shown);
      return 'bouton graphite à contour rouge ; étiquette, bouton et valeur visibles ; réglage affiché (55 %) puis remis à ' + was + ' %';
    }],
    ['Aucun débordement dans les 5 vues', async () => {
      for (const [g, s] of [['compose', 'arrange'], ['compose', 'beat'], ['compose', 'roll'], ['voice', 'record'], ['mix', 'mixer']]) {
        await view(g, s); const o = overflow(); if (o > 1) throw Error(s + ' : la page déborde de ' + o + ' px');
      }
      return 'aucun débordement horizontal (arrange, beat, roll, record, mixer)';
    }],
  ];

  async function run(only) {
    const out = [];
    document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (e) {} });
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t);
      }
    } finally { WS()?.choose('compose', 'arrange'); await sleep(300); }
    return out;
  }
  window.JACK22_D3 = { run, cases: cases.map(c => c[0]) };
})();
