/* JACK22 — outils de mesure de la Mission 3 (dans la page, avec m3/fakemic.js chargé avant le premier son). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms = 30000, step = 40) { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(step); } throw Error('délai dépassé (' + ms + ' ms)'); }
  // Débuts de sons (clics) dans un canal : premier échantillon au-dessus du seuil après un silence d'au moins `gap` secondes.
  function onsets(x, sr, thr = 0.02, gap = 0.15) {
    const out = []; let quietUntil = 0;
    for (let i = 0; i < x.length; i++) { if (Math.abs(x[i]) >= thr) { if (i >= quietUntil) out.push(i / sr); quietUntil = i + Math.round(gap * sr); } }
    return out;
  }
  const set = (id, v) => { const e = $(id); if (e && e.checked !== v) { e.checked = v; e.dispatchEvent(new Event('change', { bubbles: true })); } };
  const voice = slot => audioClips.find(c => c.voice && c.voice.slot === slot);
  async function idle() { $('stop').click(); await until(() => !Jack22Voice.state.active && !persistBusy && !Jack22Lot3.pending, 180000, 80); }
  async function calibrate() {
    await idle(); $('cCalibrate').click(); await sleep(300);
    await until(() => !Jack22Voice.state.active, 20000, 100);
    const r = Jack22Voice.lastCal; if (!r || !r.ok) throw Error('mesure de latence incertaine : ' + JSON.stringify(r));
    $('cLatApply').click(); return r;
  }
  // Une prise sur l'emplacement `slot` : `seconds` d'enregistrement, avec ou sans beat, clic de prise activé.
  async function take({ slot = 1, seconds = 4, withBeat = false, metro = true, during } = {}) {
    await idle();
    set('cCount', false); set('cMetroTake', metro); set('cWithBeat', withBeat);
    const conf = window.confirm; window.confirm = () => true;
    try { Jack22Voice.beginTake(slot); } finally { window.confirm = conf; }
    await until(() => Jack22Voice.state.phase === 'rec', 10000, 10);
    const t = performance.now(); if (during) await during(); const left = seconds * 1000 - (performance.now() - t); if (left > 0) await sleep(left);
    if (Jack22Voice.state.phase === 'rec') Jack22Voice.stopTake();
    await until(() => !Jack22Voice.state.active, 20000, 50);
    return { clip: voice(slot), status: $('cVoiceFeedback').textContent };
  }
  // Décalage restant de chaque clic de la prise par rapport à la grille des temps (k × durée d'un temps), en ms.
  function residuals(clip, beatSec, first = 0) {
    const x = clip.buffer.getChannelData(0), sr = clip.buffer.sampleRate, on = onsets(x, sr);
    return on.map(t => { const k = Math.round((t - first) / beatSec); return +(((t - first) - k * beatSec) * 1000).toFixed(2); });
  }
  const stats = r => { if (!r.length) return { n: 0 }; const s = r.slice().sort((a, b) => a - b); return { n: r.length, min: s[0], med: s[Math.floor(s.length / 2)], max: s.at(-1), spread: +(s.at(-1) - s[0]).toFixed(2) }; };
  window.JACK22_M3BENCH = { onsets, calibrate, take, residuals, stats, idle, set, sleep, until, voice };
})();
