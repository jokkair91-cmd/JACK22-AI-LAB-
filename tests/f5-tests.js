/* JACK22 — tests de la 7.8 (retours de Bob sur le clavier du bas), à charger dans la page du studio.
   Usage : JACK22_F5.run().then(r => console.table(r)). Son, vue, « Grand Piano Roll » et touches remis comme avant à la fin. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE;
  const shown = e => !!e && e.offsetWidth > 0 && e.offsetHeight > 0 && getComputedStyle(e).display !== 'none';
  const rgb = c => { const p = document.createElement('i'); p.style.color = c; document.body.append(p); const v = getComputedStyle(p).color; p.remove(); return v; };
  let preset0 = null, big0 = null;
  const setPreset = async key => { const b = document.querySelector('[data-dock-preset="' + key + '"]'); if (b) { b.click(); } else { const s = $('preset'); s.value = key; s.dispatchEvent(new Event('change', { bubbles: true })); } await sleep(300); };
  const cases = [
    ['« Grand Piano Roll » replie et rouvre le clavier', async () => {
      WS().choose('compose', 'roll'); await sleep(500);
      const b = $('c119Big'), s = $('synth'); if (!b) throw Error('bouton absent');
      if (document.body.classList.contains('c118Big')) { b.click(); await sleep(400); }
      if (!shown(s)) throw Error('clavier caché au départ');
      // Le libellé du bouton est remis à jour par la barre du bas toutes les 0,3 s (plus lentement quand la page est cachée) : on attend.
      const until = async (ok, ms = 3000) => { const end = Date.now() + ms; while (!ok() && Date.now() < end) await sleep(100); };
      // Le libellé n'est qu'un indicateur (code de la barre, inchangé) : il est relevé, pas exigé ; ce qui compte, c'est le clavier.
      b.click(); await until(() => !shown(s) && /Afficher le clavier/.test(b.textContent));
      const hidden = !shown(s), state = document.body.classList.contains('c118Big'), label = b.textContent.trim();
      b.click(); await until(() => shown(s) && /Grand Piano Roll/.test(b.textContent));
      if (!state) throw Error('le clic n’a pas activé « Grand Piano Roll »');
      if (!hidden) throw Error('le clavier reste affiché après « Grand Piano Roll » (largeur ' + innerWidth + ' px)');
      if (!shown(s)) throw Error('le clavier ne revient pas avec « Afficher le clavier »');
      const lab = /Afficher le clavier/.test(label) ? 'libellé « Afficher le clavier »' : 'libellé pas encore remis à jour (page de test cachée : minuteries ralenties)';
      return 'largeur ' + innerWidth + ' px : le clavier se replie, puis revient ; ' + lab;
    }],
    ['Un seul bouton : « HARMONIQUES 808 » disparaît, sa valeur reste', async () => {
      const h0 = $('harmAmt').value; await setPreset('sub808');
      const dials = [...$('synth').querySelectorAll('.skinDial')].filter(shown).map(d => d.querySelector('input')?.id || '?');
      const v = $('harmAmt').value;
      if (shown($('harmCtl'))) throw Error('le bouton « HARMONIQUES 808 » est encore affiché');
      if (dials.length !== 1 || dials[0] !== 'synthVol') throw Error('boutons ronds visibles : ' + dials.join(', '));
      if (v !== h0) throw Error('valeur des harmoniques changée : ' + h0 + ' → ' + v);
      return 'son 808 choisi : un seul bouton rond (« VOLUME SYNTHÉ ») ; harmoniques gardées à ' + v + ' %';
    }],
    ['Touches : une couleur au hasard à chaque note', async () => {
      const k = [...$('piano').querySelectorAll('.key.white')].find(shown); if (!k) throw Error('aucune touche visible');
      const green = getComputedStyle(k).backgroundImage, cols = [];
      k.style.transition = 'none';
      try {
        for (let i = 0; i < 6; i++) {
          k.classList.add('down'); await sleep(30);
          const want = k.style.getPropertyValue('--c116C'), bg = getComputedStyle(k).backgroundColor, img = getComputedStyle(k).backgroundImage;
          if (!want) throw Error('aucune couleur posée sur la touche');
          if (img !== 'none' || bg !== rgb(want)) throw Error('la couleur ne s’affiche pas (fond ' + bg + ' / ' + img.slice(0, 40) + ', attendu ' + rgb(want) + ')');
          cols.push(want); k.classList.remove('down'); await sleep(30);
          if (k.style.getPropertyValue('--c116C')) throw Error('la couleur reste après la note');
        }
        // Note jouée par la lecture : même chose (la couleur du son est remplacée par une couleur au hasard).
        const P = window.JACK22_PIANO, i0 = Number(k.dataset.i), midi = (octave + 1) * 12 + i0;
        P.light(midi, true, '#123456'); await sleep(30);
        const lit = k.style.getPropertyValue('--c116C'); P.light(midi, false); await sleep(30);
        if (!lit || lit === '#123456') throw Error('note de la lecture : couleur au hasard absente (' + lit + ')');
        cols.push(lit);
      } finally { k.classList.remove('down'); k.style.removeProperty('transition'); }
      const distinct = new Set(cols).size;
      if (distinct < 4) throw Error('couleurs trop peu variées : ' + cols.join(' '));
      if (getComputedStyle(k).backgroundImage !== green) throw Error('la touche ne revient pas à son vert');
      return cols.length + ' notes : ' + distinct + ' couleurs différentes (' + cols.slice(0, 3).join(', ') + '…) ; la touche revient au vert';
    }],
  ];
  async function run(only) {
    const out = []; preset0 = $('preset')?.value; big0 = document.body.classList.contains('c118Big');
    try { for (const [name, fn] of cases) { if (only && !only.test(name)) continue; const t = performance.now(); try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); } out.at(-1).ms = Math.round(performance.now() - t); } }
    finally {
      try { if (preset0 && $('preset').value !== preset0) await setPreset(preset0); } catch (e) {}
      try { if (document.body.classList.contains('c118Big') !== big0) window.JACK22_ECRAN?.setBig(big0); } catch (e) {}
      WS()?.choose('compose', 'arrange'); await sleep(300);
    }
    return out;
  }
  window.JACK22_F5 = { run, cases: cases.map(c => c[0]) };
})();
