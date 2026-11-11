/* JACK22 — tests de la 6.5 (message de prise du Clavier visible), à charger dans la page du studio.
   Usage : JACK22_D4.run().then(r => console.table(r)). Le message est remis comme au départ à la fin. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE;
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const view = async (g, s) => { WS().choose(g, s); await sleep(450); };
  const LONG = 'Prise : 3 notes · 2 mesures. REC pour en refaire une, ou Supprimer.';
  // Positions mesurées par rapport au panneau du Clavier (le défilement de la page ne compte pas).
  const btns = () => { const o = $('synth').getBoundingClientRect(); return ['recRec', 'recStop', 'recPlay', 'piano'].map(id => $(id)).filter(Boolean).map(e => { const r = e.getBoundingClientRect(); return e.id + '@' + Math.round(r.left - o.left) + ',' + Math.round(r.top - o.top) + ',' + Math.round(r.width); }).join(' '); };
  let saved = null;
  const show = async txt => { const s = $('recStatus'); if (!saved) saved = { txt: s.textContent, idle: s.classList.contains('c116Idle') }; s.classList.remove('c116Idle'); s.textContent = txt; await sleep(250); return s; };

  const cases = [
    ['Message de prise visible, pas sous le clavier', async () => {
      await view('compose', 'roll');
      if (!vis($('synth'))) return 'clavier non affiché à cette taille';
      const s = await show(LONG); s.scrollIntoView({ block: 'center' }); await sleep(100);
      if (innerWidth < 700) return 'téléphone : disposition d’origine gardée (le message a sa propre ligne)';
      const sy = $('synth');
      if (sy.classList.contains('c135Tight')) return 'place trop étroite à cette taille : message masqué (il reste dans « Messages »)';
      const r = s.getBoundingClientRect(); if (r.width < 90) throw Error('message trop étroit : ' + Math.round(r.width) + ' px');
      for (const x of [r.left + 10, r.left + r.width / 2, r.right - 10]) { const t = document.elementFromPoint(x, r.top + r.height / 2); if (!t || !s.contains(t)) throw Error('message recouvert par ' + ((t && (t.id || t.className)) || 'rien')); }
      const p = $('piano').getBoundingClientRect(); if (r.bottom > p.top + 1) throw Error('message sur le clavier');
      const lbl = sy.querySelector('.dockSynthToolbar .c119Lbl'); if (lbl && r.right > lbl.getBoundingClientRect().left + 1) throw Error('message sur « Clavier »');
      if (s.title !== LONG) throw Error('texte complet absent au survol');
      return 'message lisible à gauche de « Clavier » (' + Math.round(r.width) + ' px), ni sur le clavier ni sur les boutons ; texte complet au survol';
    }],
    ['Boutons et clavier à la même place', async () => {
      await view('compose', 'roll'); if (!vis($('synth'))) return 'clavier non affiché à cette taille';
      const s = $('recStatus'); s.classList.add('c116Idle'); await sleep(200); const a = btns();
      await show(LONG); const b = btns();
      if (a !== b) throw Error('déplacés : ' + a + ' / ' + b);
      return 'REC, STOP, PLAY et clavier immobiles, avec ou sans message';
    }],
    ['Le studio range toujours le message', async () => {
      await view('compose', 'arrange'); const s = $('recStatus');
      const off = !$('synth').classList.contains('c135On') || !vis($('synth'));
      await view('compose', 'roll'); const back = $('j108Performance')?.contains(s);
      if (!back) throw Error('le message n’est plus dans la zone du Clavier');
      return 'hors Piano Roll : mise en place retirée (' + off + ') ; retour dans le Piano Roll : message remis par le studio';
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
    } finally {
      const s = $('recStatus'); if (saved && s) { s.textContent = saved.txt; s.classList.toggle('c116Idle', saved.idle); }
      WS()?.choose('compose', 'arrange'); await sleep(300);
    }
    return out;
  }
  window.JACK22_D4 = { run, cases: cases.map(c => c[0]) };
})();
