/* JACK22 — tests du style 6.3 (agencement d'origine + design de la 6.2), à charger dans la page du studio.
   Usage : JACK22_D2.run().then(r => console.table(r)). Le studio est remis sur Composition › Arrangement à la fin. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE;
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const overflow = () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth;
  const view = async (g, s) => { WS().choose(g, s); await sleep(450); };
  const RED = 'rgb(207, 47, 59)';

  const cases = [
    ['Style actif, agencement d’origine (rien déplacé)', async () => {
      if (!window.JACK22_STYLE133?.on()) throw Error('style 6.3 non actif par défaut');
      await view('compose', 'arrange');
      // Le style n'est que du CSS : mêmes parents et même ordre de haut en bas, avec ou sans lui.
      const ids = ['dockHeader', 'j93Nav', 'dockStage', 'play', 'stop'];
      const snap = () => ids.map(id => { const e = $(id); return e ? id + '@' + (e.parentElement.id || e.parentElement.className) + '#' + [...e.parentElement.children].indexOf(e) : id + ' absent'; }).join(' | ');
      const order = () => ['dockHeader', 'j93Nav', 'dockStage'].map(id => $(id)).filter(vis).map(e => e.getBoundingClientRect().top);
      const a = snap(), oa = order();
      document.body.classList.remove('c133'); await sleep(250);
      const b = snap(), ob = order();
      document.body.classList.add('c133'); await sleep(250);
      if (a !== b) throw Error('éléments déplacés : ' + a + ' / ' + b);
      const sorted = o => o.every((v, i) => !i || v >= o[i - 1]);
      if (!sorted(oa) || !sorted(ob)) throw Error('ordre vertical changé');
      const hb = getComputedStyle($('dockHeader')).backgroundColor;
      if (hb !== 'rgb(13, 15, 18)') throw Error('fond de l’en-tête inattendu : ' + hb);
      return 'style actif par défaut ; mêmes parents et même ordre avec ou sans le style ; en-tête graphite';
    }],
    ['Arrangement : les pistes remplissent tout le panneau', async () => {
      await view('compose', 'arrange');
      const wrap = $('tlWrap'), rows = [...document.querySelectorAll('#tlRows .tl-row:not(.tl-ruler)')].filter(vis);
      if (!vis(wrap) || !rows.length) return 'arrangement non affiché à cette taille (rien à mesurer)';
      const min = Math.min(...rows.map(r => r.getBoundingClientRect().height));
      if (min < 33.5) throw Error('rangée trop basse : ' + min + ' px');
      const lanes = rows.map(r => r.querySelector('.tl-lane')).filter(Boolean), bad = lanes.filter(l => Math.abs(l.getBoundingClientRect().height - l.parentElement.getBoundingClientRect().height) > 3);
      if (bad.length) throw Error(bad.length + ' ligne(s) de grille plus courtes que leur piste');
      const wb = wrap.getBoundingClientRect().top + wrap.clientHeight, last = rows.at(-1).getBoundingClientRect().bottom;
      const scrolls = wrap.scrollHeight > wrap.clientHeight + 2;
      if (!scrolls && wb - last > 4) throw Error('espace vide sous les pistes : ' + Math.round(wb - last) + ' px');
      return rows.length + ' pistes de ' + Math.round(min) + ' px minimum ; ' + (scrolls ? 'trop de pistes pour l’écran : la liste défile' : 'aucun vide sous la dernière piste');
    }],
    ['Menus Projet, Outils et Atelier au premier plan', async () => {
      const out = [];
      for (const [g, s] of [['compose', 'arrange'], ['compose', 'roll'], ['compose', 'beat']]) {
        await view(g, s);
        for (const det of [...document.querySelectorAll('details')].filter(d => vis(d.querySelector('summary')) && /^(Projet|Outils|Atelier)\b/.test(d.querySelector('summary').textContent.trim()))) {
          det.open = true; await sleep(150);
          const body = [...det.children].find(c => c.tagName !== 'SUMMARY'), hidden = [];
          // Les lignes rangées dans un sous-menu fermé (ex. « Outils du projet ») ne sont pas affichées : on les ignore.
          const shown = b => vis(b) && (b.checkVisibility ? b.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }) : true) && ![...det.querySelectorAll('details')].some(d => !d.open && d.contains(b) && !d.querySelector('summary').contains(b));
          for (const b of [...det.querySelectorAll('button')].filter(shown)) {
            if (body && body.scrollHeight > body.clientHeight) { body.scrollTop = b.offsetTop - body.clientHeight / 2; await sleep(20); }
            const r = b.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue;
            const t = document.elementFromPoint(r.left + Math.min(10, r.width / 2), r.top + r.height / 2);
            if (t && !det.contains(t)) hidden.push(b.textContent.trim().slice(0, 24) + ' sous ' + ((t.closest('[id]') || {}).id || t.className));
          }
          det.open = false; if (body) body.scrollTop = 0;
          const name = det.querySelector('summary').textContent.trim().split(/\s/)[0];
          if (hidden.length) throw Error(name + ' (' + s + ') : ' + hidden.slice(0, 3).join(' ; '));
          if (!out.includes(name)) out.push(name);
        }
      }
      if (!out.length) return 'aucun menu affiché à cette taille';
      return out.join(', ') + ' : chaque ligne visible et cliquable, dans Arrangement, Piano Roll et Batterie';
    }],
    ['Batterie : pas actifs en rouge, clic inchangé', async () => {
      await view('compose', 'beat');
      const steps = [...document.querySelectorAll('#dockBeat .track .step')].filter(vis);
      if (!steps.length) return 'batterie non affichée à cette taille';
      const on = steps.filter(s => s.classList.contains('active')), off = steps.filter(s => !s.classList.contains('active'));
      if (on.some(s => getComputedStyle(s).backgroundColor !== RED)) throw Error('pas actif pas rouge : ' + getComputedStyle(on[0]).backgroundColor);
      if (off.some(s => getComputedStyle(s).backgroundColor === RED)) throw Error('pas inactif en rouge');
      // Le studio fait un fondu de 0,12 s ; dans une page masquée il reste figé au départ, donc on le termine avant de mesurer.
      const settle = async () => { await sleep(150); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }); };
      const s = off[0]; s.click(); await settle();
      const c1 = s.classList.contains('active') && getComputedStyle(s).backgroundColor === RED;
      s.click(); await sleep(120);
      if (!c1 || s.classList.contains('active')) throw Error('le clic sur un pas ne bascule plus correctement');
      const bars = [...document.querySelectorAll('#dockBeat .track .track-label')].map(l => getComputedStyle(l, '::before').backgroundColor);
      return on.length + ' pas actifs rouges, ' + off.length + ' gris ; un clic allume puis éteint le pas ; couleurs de ligne : ' + new Set(bars).size;
    }],
    ['Prise voix : bouton ● nommé et cliquable', async () => {
      await view('compose', 'arrange');
      const bs = [...document.querySelectorAll('#tlRows .tl-label > button:not(.dockRowMute)')].filter(vis);
      if (!bs.length) return 'pas de bouton de prise voix affiché à cette taille';
      for (const b of bs) {
        const name = (b.getAttribute('aria-label') || b.title || b.textContent || '').trim();
        if (!name) throw Error('bouton ● sans nom');
        b.scrollIntoView({ block: 'center' }); await sleep(80);
        const r = b.getBoundingClientRect(); if (r.width < 20 || r.height < 20) throw Error('bouton ● trop petit : ' + Math.round(r.width) + ' px');
        const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!b.contains(t)) throw Error('bouton ● recouvert');
      }
      return bs.length + ' boutons ● de 22 px, nommés (« ' + (bs[0].getAttribute('aria-label') || bs[0].title || bs[0].textContent).trim().slice(0, 30) + ' »), non recouverts';
    }],
    ['Aucun débordement dans les 5 vues', async () => {
      const out = [];
      for (const [g, s] of [['compose', 'arrange'], ['compose', 'beat'], ['compose', 'roll'], ['voice', 'record'], ['mix', 'mixer']]) {
        await view(g, s); const o = overflow();
        if (o > 1) throw Error(s + ' : la page déborde de ' + o + ' px');
        out.push(s);
      }
      return 'aucun débordement horizontal (' + out.join(', ') + ')';
    }],
  ];

  async function run(only) {
    const out = [];
    // Une fenêtre (ex. « Production ») laissée ouverte par un test précédent passe normalement devant tout : on la ferme d'abord.
    document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (e) {} });
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t);
      }
    } finally { document.body.classList.add('c133'); WS()?.choose('compose', 'arrange'); await sleep(300); }
    return out;
  }
  window.JACK22_D2 = { run, cases: cases.map(c => c[0]) };
})();
