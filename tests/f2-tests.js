/* JACK22 — tests de la 7.5 (M4 : enregistrer dans le montage), à charger dans la page du studio.
   Le micro simulé (fakemic.js) doit être chargé AVANT le premier son : sinon les cas sont « non exécutés ».
   Usage : JACK22_F2.run().then(r => console.table(r)). Pistes et prises créées par le test retirées à la fin. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WS = () => window.JACK22_WORKSPACE, A = () => window.JACK22_AUDIO_EDIT, T = () => window.JACK22_TRACKS145, R = () => window.JACK22_REC146;
  const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(100); } return null; };
  let made = [];
  // Une prise : tête de lecture à la mesure voulue, piste de destination, ● puis ■ après « sec » secondes d'enregistrement.
  const take = async (bar, lane, sec) => {
    try { window.JACK22_C128.setCursor ? window.JACK22_C128.setCursor((bar - 1) * 16) : null; } catch (e) {}
    T().target = lane; await sleep(100);
    const before = new Set(audioClips.map(c => c.id));
    R().button.click();
    if (!(await until(() => window.Jack22Voice?.state.active, 15000))) throw Error('l’enregistrement ne démarre pas');
    // Attendre la fin du décompte : la prise commence quand l'enregistreur passe en phase « rec ».
    if (!(await until(() => window.Jack22Voice?.state.phase === 'rec', 20000))) throw Error('pas de phase d’enregistrement (phase : ' + window.Jack22Voice?.state.phase + ')');
    await sleep(sec * 1000); R().button.click();
    await until(() => !R().busy, 30000); await sleep(300);
    const c = audioClips.find(x => !before.has(x.id) && !x.voice); if (!c) throw Error('aucune prise posée sur la piste');
    made.push(c.id); return c;
  };
  const cases = [
    ['Bouton « ● Enregistrer ici »', async () => {
      WS().choose('compose', 'arrange'); await sleep(400);
      const b = R()?.button; if (!b || !b.offsetWidth) throw Error('bouton absent de l’Arrangement');
      return 'bouton visible à côté de « ＋ Piste audio »';
    }],
    ['Prise micro posée sur la piste choisie, à la mesure de la tête', async () => {
      if (!window.JACK22_FAKEMIC) return { skip: 'micro simulé non chargé' };
      $('c145Tools').querySelector('button').click(); await sleep(200); const lane = T().target; made.push('lane:' + lane);
      const c = await take(3, lane, 2.5);
      if (A().lane(c.id) !== lane) throw Error('prise sur « ' + A().lane(c.id) + ' » au lieu de la piste choisie');
      const want = 2 * 16 * stepSec(), at = A().seconds(c);
      if (Math.abs(at - want) > 0.05) throw Error('prise à ' + at.toFixed(3) + ' s au lieu de ' + want.toFixed(3) + ' s (mesure 3)');
      if (audioClips.some(x => x.voice && x.voice.slot === 1)) throw Error('la voix 1 n’a pas été libérée');
      if (!c.buffer || c.duration < 0.5) throw Error('prise vide');
      return '« ' + c.name + ' » : ' + c.duration.toFixed(2) + ' s, sur la piste choisie, à ' + at.toFixed(3) + ' s (début de la mesure 3) ; voix 1 libérée';
    }],
    ['Deuxième prise sur une autre piste (doublage)', async () => {
      if (!window.JACK22_FAKEMIC) return { skip: 'micro simulé non chargé' };
      $('c145Tools').querySelector('button').click(); await sleep(200); const lane2 = T().target; made.push('lane:' + lane2);
      const c = await take(3, lane2, 2);
      const takes = audioClips.filter(x => made.includes(x.id));
      if (takes.length !== 2) throw Error(takes.length + ' prise(s) au lieu de 2');
      if (A().lane(takes[0].id) === A().lane(takes[1].id)) throw Error('les deux prises sont sur la même piste');
      return 'deux prises superposées sur deux pistes (lead + doublage), même mesure ; la voix reste libre pour la suivante';
    }],
    ['Prises gardées par la sauvegarde', async () => {
      if (!window.JACK22_FAKEMIC) return { skip: 'micro simulé non chargé' };
      const v = VoiceStore.capture(), ids = made.filter(x => typeof x === 'number' || /^\d+$/.test(String(x)));
      if (!ids.every(id => v.audio99?.clips?.[id]?.lane)) throw Error('une prise manque dans la sauvegarde');
      return ids.length + ' prises et leurs pistes dans la sauvegarde';
    }],
  ];
  async function run(only) {
    const out = [], snap = VoiceStore.capture();
    try { for (const [name, fn] of cases) { if (only && !only.test(name)) continue; const t = performance.now(); try { const d = await fn(); if (d && d.skip) out.push({ cas: name, ok: null, detail: 'non exécuté : ' + d.skip }); else out.push({ cas: name, ok: true, detail: d }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); } out.at(-1).ms = Math.round(performance.now() - t); } }
    finally {
      try { if (R()?.busy) R().button.click(); } catch (e) {}
      for (const id of made) { if (typeof id !== 'number') continue; const i = audioClips.findIndex(c => c.id === id); if (i >= 0) { try { audioKill(audioClips[i]); } catch (e) {} audioClips.splice(i, 1); } }
      try { VoiceStore.setText(snap); } catch (e) {}
      made = []; tlBuild(); WS()?.choose('compose', 'arrange'); await sleep(300);
    }
    return out;
  }
  window.JACK22_F2 = { run, cases: cases.map(c => c[0]) };
})();
