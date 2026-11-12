/* JACK22 — tests de la 6.8 (Mission 0b : voyant de saturation du Master), à charger dans la page du studio.
   Usage : JACK22_E2.run().then(r => console.table(r)). Volumes, mode de lecture et Piano Roll remis comme avant à la fin. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE, S = () => window.JACK22_SAT138;
  const setRange = (id, v) => { const e = $(id); if (!e) return; e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  const playFor = async ms => { let lit = false; $('play').click(); const end = Date.now() + ms; while (Date.now() < end) { await sleep(100); if (S().isOn()) lit = true; } $('stop').click(); await sleep(400); return lit; };
  const patternMode = async () => { WS().choose('compose', 'arrange'); await sleep(300); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'PATTERN' && b.offsetWidth); b?.click(); await sleep(200); };
  const stress = () => { roll.notes.length = 0; for (let s = 0; s < roll.steps; s += 4) for (const i of [0, 4, 7, 11]) roll.notes.push({ start: s, dur: 4, preset: 'pad', octave: 4, idx: i }); rollChanged(); };

  const cases = [
    ['Voyant dans la barre du bas, éteint à l’arrêt', async () => {
      WS().choose('compose', 'roll'); await sleep(400);
      const el = $('c138Sat'); if (!el || !$('c119Bar')?.contains(el)) throw Error('voyant absent de la barre de lecture');
      const r = el.getBoundingClientRect(); if (r.width < 40) throw Error('voyant trop petit');
      if (S().isOn()) throw Error('voyant allumé sans lecture');
      return 'voyant « Master / SATURÉ » présent, éteint, nommé pour les lecteurs d’écran (« ' + el.getAttribute('aria-label') + ' »)';
    }],
    ['Projet chargé, volumes par défaut : pas de saturation', async () => {
      initAudio(); if (window.JACK22_AFRO) window.JACK22_AFRO.applyAfro('afrobeats', { bass: true, guitar: true, tempo: true });
      WS().choose('compose', 'roll'); await sleep(300); stress(); await patternMode();
      const lit = await playFor(5000), l = S().last;
      if (!l) throw Error('aucune mesure pendant la lecture');
      if (lit || l.pct > 0) throw Error('saturation au volume par défaut : crête ' + l.peak.toFixed(2));
      return 'batterie + 808 + guitare + accords de 4 notes : crête ' + l.peak.toFixed(2) + ', voyant éteint';
    }],
    ['Master et synthé à 100 % : le voyant s’allume et un message le dit', async () => {
      setRange('master', 100); setRange('synthVol', 100); await sleep(100);
      const lit = await playFor(6000), l = S().last;
      const msg = [$('dockMessages'), $('status'), $('c119Msg')].filter(Boolean).map(e => e.textContent).join(' ');
      if (!l || l.pct <= 0) return 'pas de saturation mesurée même à 100 % sur cette machine (crête ' + (l ? l.peak.toFixed(2) : '?') + ') : rien à signaler';
      if (!lit) throw Error('saturation mesurée (crête ' + l.peak.toFixed(2) + ') mais voyant jamais allumé');
      if (!/Master a saturé/.test(msg)) throw Error('aucun message après la lecture saturée');
      return 'crête ' + l.peak.toFixed(2) + ' (' + l.pct.toFixed(2) + ' % au-delà) : voyant allumé, message « baisse le volume Master… » affiché';
    }],
  ];

  async function run(only) {
    const out = [], keep = { master: $('master')?.value, synth: $('synthVol')?.value, notes: JSON.parse(JSON.stringify(roll.notes)), mode: (() => { try { return playMode; } catch (e) { return null; } })() };
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t);
      }
    } finally {
      try { $('stop').click(); } catch (e) {}
      if (keep.master != null) setRange('master', keep.master); if (keep.synth != null) setRange('synthVol', keep.synth);
      roll.notes.length = 0; keep.notes.forEach(n => roll.notes.push(n)); rollChanged();
      if (keep.mode === 'song') { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'SONG' && b.offsetWidth); b?.click(); }
      WS()?.choose('compose', 'arrange'); await sleep(300);
    }
    return out;
  }
  window.JACK22_E2 = { run, cases: cases.map(c => c[0]) };
})();
