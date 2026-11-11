/* JACK22 — tests de la Mission 4 (arrangement et montage), à charger dans la page du studio.
   Usage : JACK22_M4.run().then(r => console.table(r)). Le projet est remis comme avant à la fin. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms = 20000, step = 40) { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(step); } throw Error('délai dépassé (' + ms + ' ms)'); }
  const A = () => window.JACK22_AUDIO_EDIT, H = () => window.Jack22Vision8;
  const SR = 44100, RUN = 'M4 ' + Date.now().toString(36), NA = RUN + ' A', NB = RUN + ' B';   // noms uniques : le stockage du navigateur garde les projets des passages précédents
  // Clip de test : un « bip » de 5 ms toutes les 0,25 s (repères exacts), sur fond de ton continu faible (pour voir les fondus).
  async function testClip(name, seconds = 4) {
    const n = Math.round(seconds * 48000), x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = 0.05 * Math.sin(2 * Math.PI * 220 * i / 48000);
    for (let k = 0; k * 0.25 < seconds; k++) { const at = Math.round(k * 0.25 * 48000); for (let j = 0; j < 240 && at + j < n; j++) x[at + j] += 0.6 * Math.sin(2 * Math.PI * 2000 * j / 48000); }
    return JACK22_PRODUCTION.newAudio({ sampleRate: 48000 }, [x], name, 0);
  }
  // Rendu WAV de l'export, instruments muets : seul l'audio reste. Canal gauche.
  // Partie audio de l'export, par le même chemin (moteur hors ligne, scheduleAudioClips), sans rien changer au projet.
  async function render(seconds = 12) {
    const data = exportData(); if (data.audio) data.audio.clips = data.audio.clips.filter(c => c.name.startsWith(RUN));   // seulement les clips de ce test (le projet peut en contenir d'autres)
    if (!data.audio || !data.audio.clips.length) return new Float32Array(Math.round(seconds * SR));
    // Master neutre (sans réverbération, delay ni compresseur) : on mesure le montage, pas la traîne des effets réglés par d'autres tests.
    const st = JSON.parse(JSON.stringify(data.settings)); if (st.fx) { st.fx.reverb = { ...st.fx.reverb, on: false }; st.fx.delay = { ...st.fx.delay, on: false }; st.fx.comp = { ...st.fx.comp, on: false }; st.fx.eq = { low: 0, mid: 0, high: 0 }; }
    const ctx = new OfflineAudioContext(2, Math.round(seconds * SR), SR), E = withSeed(EXPORT_SEED, () => createEngine(ctx, st)), bus = E.createBus();
    scheduleAudioClips(ctx, bus, data); const b = await ctx.startRendering(); return b.getChannelData(0).slice(0);
  }
  // Bips : au-dessus de la moitié du maximum (le niveau de l'export dépend du volume AUDIO et du master).
  const bips = (x, sr = SR) => { let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v)); const out = []; if (!pk) return out; let quiet = 0; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk * 0.5) { if (i >= quiet) out.push(+(i / sr).toFixed(4)); quiet = i + Math.round(0.1 * sr); } return out; };
  // Chaque cas repart du clip A entier, sans fondu, à 1 s, et de la règle « mélange ».
  function resetA() { const a = audioClips.find(x => x.name === NA); if (!a) return null; A().setEdit(a.id, { trimIn: 0, trimOut: 0, fadeIn: 0, fadeOut: 0 }); A().place(a.id, 1, 'audio'); if (A().overlap !== 'mix') A().setOverlap('mix'); A().select([]); return a; }
  const rms = (x, a, b, sr = SR) => { let s = 0, n = 0; for (let i = Math.round(a * sr); i < Math.round(b * sr) && i < x.length; i++) { s += x[i] * x[i]; n++; } return n ? Math.sqrt(s / n) : 0; };
  const maxDiff = (a, b) => { let m = 0; for (let i = 0; i < Math.max(a.length, b.length); i++) m = Math.max(m, Math.abs((a[i] || 0) - (b[i] || 0))); return m; };
  const near = (a, b, tol = 0.002) => Math.abs(a - b) <= tol;
  const stop = () => $('stop').click();
  const ptr = (el, type, x, y, o = {}) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 41, clientX: x, clientY: y, ...o }));
  const block = id => document.querySelector('.tl-aud[data-audio="' + id + '"]');

  const cases = [
    ['Couper début et fin : le WAV suit, sans toucher au fichier', async () => {
      const c = await testClip(NA); A().place(c.id, 1, 'audio');
      const before = await render(), b0 = bips(before);
      A().setEdit(c.id, { trimIn: 0.5, trimOut: 1 });
      const x = await render(), b = bips(x), dur = window.l3Duration(c);
      if (!near(dur, 2.5)) throw Error('durée jouée ' + dur);
      if (!near(b[0], 1) || b.length !== 10) throw Error('bips ' + b.slice(0, 4).join(' / ') + '… (' + b.length + ')');
      if (rms(x, 3.55, 3.95) > 0.002) throw Error('son après la fin coupée');
      if (c.buffer.duration < 3.99) throw Error('fichier modifié');
      tlBuild(); const w = parseFloat(block(c.id).style.width), exp = 2.5 / (16 * stepSec()) * TL_BAR_W - 2; if (Math.abs(w - exp) > 2) throw Error('largeur à l’écran ' + w + ' au lieu de ' + exp.toFixed(1));
      A().setEdit(c.id, { trimIn: 0, trimOut: 0 }); const back = await render(); if (maxDiff(back, before) > 1e-4) throw Error('clip remis entier ≠ original (' + maxDiff(back, before) + ')');
      return 'premier bip à 1 s (0,5 s retirés), ' + b.length + ' bips, durée jouée 2,5 s, fichier intact ; remis entier = WAV identique (avant : ' + b0.length + ' bips)';
    }],
    ['Fondus d’entrée et de sortie, identiques dans le WAV', async () => {
      const c = audioClips.find(x => x.name === NA);
      A().setEdit(c.id, { fadeIn: 1, fadeOut: 1 });
      const x = await render(), mid = rms(x, 2.6, 2.7), first = rms(x, 1.02, 1.08), quarter = rms(x, 1.27, 1.33), end = rms(x, 4.92, 4.98);
      A().setEdit(c.id, { fadeIn: 0, fadeOut: 0 });
      if (!(first < mid * 0.12)) throw Error('début du fondu trop fort : ' + (first / mid).toFixed(2));
      if (!(quarter > mid * 0.15 && quarter < mid * 0.4)) throw Error('fondu d’entrée non linéaire : ' + (quarter / mid).toFixed(2));
      if (!(end < mid * 0.12)) throw Error('fin du fondu trop forte : ' + (end / mid).toFixed(2));
      return 'niveau relatif : début ' + (first / mid).toFixed(2) + ', à 0,3 s ' + (quarter / mid).toFixed(2) + ', fin ' + (end / mid).toFixed(2);
    }],
    ['Écoute = WAV : fondu et coupe rejoués à l’identique en direct', async () => {
      const c = audioClips.find(x => x.name === NA); A().setEdit(c.id, { trimIn: 0.5, fadeIn: 0.5 });
      try {
        // Lecture en direct depuis la mesure 1, enregistrée par un nœud d'écoute branché sur la sortie audio du clip.
        // Captation datée à l'échantillon près (AudioWorklet, horloge audio), comme le micro du studio.
        initAudio();
        if (!window.__m4probe) { await audio.audioWorklet.addModule(URL.createObjectURL(new Blob(["class P extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c&&c.length)this.port.postMessage({f:currentFrame,d:c.slice(0)});return true;}}registerProcessor('m4probe',P);"], { type: 'application/javascript' }))); window.__m4probe = 1; }
        const rec = [], probe = new AudioWorkletNode(audio, 'm4probe'), sink = audio.createGain(); sink.gain.value = 0;
        const conn = AudioNode.prototype.connect;
        const orig = window.J97AudioNode; window.J97AudioNode = function (ctx, clip, bus) { const n = orig(ctx, clip, bus); if (ctx === audio && clip.id === c.id) { const t = ctx.createGain(); conn.call(n, t); conn.call(t, probe); } return n; };
        conn.call(probe, sink); conn.call(sink, audio.destination); probe.port.onmessage = e => rec.push(e.data);
        setMode('song'); window.JACK22_C128.setCursor(0); $('play').click(); await sleep(3200); stop(); await sleep(100); window.J97AudioNode = orig; probe.port.onmessage = null; try { probe.disconnect(); sink.disconnect(); } catch (e) {}
        const sr = audio.sampleRate, base = rec[0].f, live = new Float32Array(rec.at(-1).f + rec.at(-1).d.length - base); for (const b of rec) live.set(b.d, b.f - base);
        const lb = bips(live, sr); if (lb.length < 4) throw Error('pas assez de bips en direct');
        // Écart entre bips successifs (en direct) = 0,25 s, et niveau du ton juste après le début du fondu ~ 0 (comme dans le WAV).
        // Le premier bip détecté est atténué par le fondu : sa détection (seuil) est un peu plus tardive. On contrôle les écarts après le fondu.
        const gaps = lb.slice(1).map((t, i) => +(t - lb[i]).toFixed(4)); if (gaps.slice(1).some(g => Math.abs(g - 0.25) > 0.0005)) throw Error('écarts ' + gaps.join(' / '));
        // Repère : premier bip à pleine force = 0,5 s après le début du clip (fin du fondu). Ton mesuré 0,1 s après le début du clip, puis à 0,6 s.
        const full = (y, s) => { let pk = 0; for (const v of y) pk = Math.max(pk, Math.abs(v)); for (let i = 0; i < y.length; i++) if (Math.abs(y[i]) > pk * 0.7) return i / s; return null; };
        const x = await render(), cw = full(x, SR) - 0.5, cl = full(live, sr) - 0.5;
        const ratioWav = rms(x, cw + 0.1, cw + 0.15) / rms(x, cw + 0.6, cw + 0.65), ratioLive = rms(live, cl + 0.1, cl + 0.15, sr) / rms(live, cl + 0.6, cl + 0.65, sr);
        if (Math.abs(cw - 1) > 0.003) throw Error('clip du WAV commence à ' + cw.toFixed(4) + ' s au lieu de 1 s');
        if (Math.abs(ratioLive - ratioWav) > 0.08) throw Error('fondu différent : direct ' + ratioLive.toFixed(2) + ', WAV ' + ratioWav.toFixed(2));
        return 'bips espacés de 0,25 s en direct, fondu : direct ' + ratioLive.toFixed(2) + ' / WAV ' + ratioWav.toFixed(2);
      } finally { A().setEdit(c.id, { trimIn: 0, fadeIn: 0 }); }
    }],
    ['Couper en deux à la tête de lecture : WAV identique, fichier partagé', async () => {
      const c = audioClips.find(x => x.name === NA); A().setEdit(c.id, { trimIn: 0.25, fadeIn: 0.1, fadeOut: 0.2 });
      const before = await render(), n0 = audioClips.length;
      const id = await A().splitAt(c.id, 2.4);
      const b = audioClips.find(x => x.id === id); if (!b || audioClips.length !== n0 + 1 || b.buffer !== c.buffer) throw Error('seconde partie absente ou fichier copié');
      const after = await render(), d = maxDiff(before, after);
      if (d > 2e-3) throw Error('WAV différent après la coupe : écart ' + d.toFixed(4));
      H().travel(true); await sleep(200); if (audioClips.length !== n0) throw Error('Annuler ne retire pas la seconde partie');
      if (!near(A().editOf(c.id).trimIn, 0.25) || A().editOf(c.id).trimOut) throw Error('Annuler ne remet pas le montage');
      return 'deux clips sur le même fichier, WAV identique (écart max ' + d.toFixed(5) + '), Annuler remet le clip d’origine';
    }],
    ['Sélection multiple : déplacer ensemble, une seule annulation', async () => {
      let a = audioClips.find(x => x.name === NA); if (!a) { a = await testClip(NA); A().place(a.id, 1, 'audio'); }
      const b = audioClips.find(x => x.name === NB) || await testClip(NB, 2); A().place(b.id, 8, 'audio');
      window.JACK22_WORKSPACE?.choose('compose', 'arrange'); tlBuild(); await sleep(200);
      const ea = block(a.id), eb = block(b.id); if (!ea || !eb) throw Error('clips non affichés');
      const ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect();
      ptr(ea, 'pointerdown', ra.left + 30, ra.top + 10); ptr(window, 'pointerup', ra.left + 30, ra.top + 10);
      ptr(eb, 'pointerdown', rb.left + 30, rb.top + 10, { ctrlKey: true });
      const sel = A().selection; if (sel.length !== 2) throw Error('sélection : ' + sel.length);
      const sa = A().seconds(a), sb = A().seconds(b), u0 = H().history.undo;
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true, cancelable: true }));
      await sleep(100); const bar = 16 * stepSec();
      if (!near(A().seconds(a), sa + bar, 1e-4) || !near(A().seconds(b), sb + bar, 1e-4)) throw Error('Maj+→ : ' + A().seconds(a) + ' / ' + A().seconds(b));
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true, cancelable: true }));
      if (!near(A().seconds(a), sa + bar - 0.01, 1e-4)) throw Error('Alt+← : ' + A().seconds(a));
      const seen = []; const pos = () => A().seconds(audioClips.find(x => x.id === a.id)).toFixed(3) + '/' + A().seconds(audioClips.find(x => x.id === b.id)).toFixed(3);
      seen.push(pos()); H().travel(true); seen.push(pos()); H().travel(true); seen.push(pos()); await sleep(100);
      if (!near(A().seconds(audioClips.find(x => x.id === a.id)), sa, 1e-4) || !near(A().seconds(audioClips.find(x => x.id === b.id)), sb, 1e-4)) throw Error('Annuler ×2 : ' + seen.join(' → ') + ' (attendu ' + sa + '/' + sb + ')');
      return '2 clips sélectionnés (Ctrl+clic), Maj+→ = 1 mesure pour les deux, Alt+← = 10 ms, deux Annuler remettent tout';
    }],
    ['Glisser un clip (grille) et ses bords (coupe non destructive)', async () => {
      const a = audioClips.find(x => x.name === NA); A().select([]); tlBuild(); await sleep(100);
      let el = block(a.id), r = el.getBoundingClientRect(); const s0 = A().seconds(a), step = TL_BAR_W / 16;
      ptr(el, 'pointerdown', r.left + 40, r.top + 10); ptr(window, 'pointermove', r.left + 40 + step * 3.4, r.top + 10); ptr(window, 'pointerup', r.left + 40 + step * 3.4, r.top + 10);
      const want = Math.round((s0 + 3.4 * stepSec()) / stepSec()) * stepSec();   // calé sur la grille absolue (1/16)
      if (!near(A().seconds(a), want, 1e-4)) throw Error('déplacement calé : ' + A().seconds(a).toFixed(4) + ' s au lieu de ' + want.toFixed(4));
      el = block(a.id); r = el.getBoundingClientRect(); const right = el.querySelector('.c128R'), rr = right.getBoundingClientRect();
      ptr(right, 'pointerdown', rr.left + 3, rr.top + 5); ptr(window, 'pointermove', rr.left + 3 - TL_BAR_W, rr.top + 5); ptr(window, 'pointerup', rr.left + 3 - TL_BAR_W, rr.top + 5);
      const o1 = A().seconds(audioClips.find(x => x.id === a.id)), endWant = Math.round((o1 + a.duration - 16 * stepSec()) / stepSec()) * stepSec();   // fin calée sur la grille
      const e1 = A().editOf(a.id); if (!near(e1.trimOut, o1 + a.duration - endWant, 0.002)) throw Error('bord droit : fin retirée ' + e1.trimOut + ' au lieu de ' + (o1 + a.duration - endWant).toFixed(4));
      el = block(a.id); const left = el.querySelector('.c128L'), lr = left.getBoundingClientRect(), at0 = A().seconds(a);
      ptr(left, 'pointerdown', lr.left + 3, lr.top + 5); ptr(window, 'pointermove', lr.left + 3 + step * 4, lr.top + 5); ptr(window, 'pointerup', lr.left + 3 + step * 4, lr.top + 5);
      const e2 = A().editOf(a.id); if (!near(e2.trimIn, 4 * stepSec(), 0.002) || !near(A().seconds(a), at0 + 4 * stepSec(), 1e-3)) throw Error('bord gauche : début retiré ' + e2.trimIn + ', position ' + A().seconds(a));
      if (a.buffer.duration < 3.99) throw Error('fichier modifié');
      H().travel(true); H().travel(true); H().travel(true); await sleep(100);
      if (!near(A().seconds(a), s0, 1e-4) || A().editOf(a.id).trimOut || A().editOf(a.id).trimIn) throw Error('Annuler ×3 ne remet pas le clip');
      return 'glisser = 3 pas pile, bord droit = 1 mesure retirée, bord gauche = 4 pas retirés (le son reste en place), 3 Annuler remettent tout';
    }],
    ['Chevauchements : signalés, mélangés ou coupés au choix', async () => {
      const a = audioClips.find(x => x.name === NA), b = audioClips.find(x => x.name === NB);
      A().place(a.id, 1, 'audio'); A().place(b.id, 3, 'audio');
      const ov = A().overlaps().filter(o => o.a === a.id && o.b === b.id); if (!ov.length || !near(ov[0].sec, 2, 0.01)) throw Error('chevauchement non vu : ' + JSON.stringify(A().overlaps()));
      tlBuild(); if (!block(a.id).classList.contains('c128Over')) throw Error('pas de pointillés sur la timeline');
      const mix = await render(); A().setOverlap('cut'); const cut = await render();
      const tone = (x) => rms(x, 3.6, 3.7); // b n'a que ses bips à 3.5/3.75 ; a est coupé à 3 s en mode « cut »
      if (!(near(window.l3Duration(a), 2, 0.001))) throw Error('durée de A en mode coupe : ' + window.l3Duration(a));
      if (!(tone(cut) < tone(mix) * 0.85)) throw Error('A non coupé dans le WAV : ' + tone(cut).toFixed(4) + ' / ' + tone(mix).toFixed(4));
      H().travel(true); await sleep(100); if (A().overlap !== 'mix') throw Error('Annuler ne remet pas la règle');
      return 'chevauchement de 2 s signalé (pointillés) ; règle « coupe » : A s’arrête à l’arrivée de B dans le WAV ; Annuler remet « mélange »';
    }],
    ['Tête de lecture rouge : règle cliquée, Play part de là', async () => {
      setMode('song'); tlBuild(); await sleep(100);
      // Cible : 1,5 s après le début du clip A (au milieu du clip, quel que soit le tempo).
      const a = audioClips.find(x => x.name === NA), want = Math.floor((A().seconds(a) + 1.5) / stepSec()), bar = Math.floor(want / 16);
      const num = document.querySelectorAll('#tlRows .tl-ruler .tl-num')[bar], r = num.getBoundingClientRect(), x = r.left + TL_BAR_W * ((want % 16) + 0.1) / 16;
      ptr(num, 'pointerdown', x, r.top + 5); ptr(num, 'pointerup', x, r.top + 5);
      const cur = window.JACK22_C128.cursor; if (cur !== want) throw Error('tête à ' + cur + ' au lieu de ' + want);
      // Position mesurée à l'écran (6.1) : la ligne doit tomber sur l'endroit de la règle qui correspond à la tête, quelle que soit la mise en page.
      const h = $('tlHead'), n0 = document.querySelector('#tlRows .tl-ruler .tl-num').getBoundingClientRect(), wantX = n0.left + want / 16 * n0.width, gotX = h.getBoundingClientRect().left;
      if (h.style.display !== 'block' || Math.abs(gotX - wantX) > 2) throw Error('ligne rouge à ' + gotX.toFixed(1) + ' px au lieu de ' + wantX.toFixed(1) + ' px');
      $('play').click(); await sleep(250); const first = stepLog[0]?.abs; const playingA = audioPlaying.some(p => p.c.name === NA); stop();
      if (first !== want) throw Error('lecture partie de ' + first + ' au lieu de ' + want);
      if (!playingA) throw Error('le clip en cours ne joue pas');
      if (h.style.display !== 'block') throw Error('ligne rouge cachée après Stop');
      window.JACK22_C128.setCursor(0);
      return 'règle cliquée = mesure ' + (bar + 1) + ', pas ' + (want % 16 + 1) + ' (au milieu du clip) ; Play part de là, le clip en cours reprend ; ligne rouge visible à l’arrêt';
    }],
    ['Sauvegarde puis chargement : montage conservé', async () => {
      const a = audioClips.find(x => x.name === NA); A().setEdit(a.id, { trimIn: 0.3, fadeOut: 0.4 }); A().setOverlap('cut');
      const before = await render(); ProjectPersistence.save(); await until(() => !persistBusy, 20000);
      const conf = window.confirm; window.confirm = () => true; try { ProjectPersistence.load(); } finally { window.confirm = conf; }
      await until(() => !persistBusy && !Jack22Lot3.pending, 30000); await sleep(400);
      const a2 = audioClips.find(x => x.name === NA), e = A().editOf(a2.id);
      if (!near(e.trimIn, 0.3) || !near(e.fadeOut, 0.4) || A().overlap !== 'cut') throw Error('montage perdu : ' + JSON.stringify(e) + ' ' + A().overlap);
      const after = await render(), d = maxDiff(before, after); if (d > 1e-3) throw Error('WAV différent après rechargement : ' + d);
      return 'début retiré, fondu et règle « coupe » retrouvés ; WAV identique (écart ' + d.toFixed(5) + ')';
    }],
  ];

  async function run(only) {
    stop(); await until(() => !persistBusy && !Jack22Lot3.pending, 60000);
    const prev = ProjectTransfer.snapshot(); prev.clips = prev.clips.map(c => ({ ...c, voice: c.voice ? JSON.parse(JSON.stringify(c.voice)) : null }));
    const out = [];
    try {
      for (const [name, fn] of cases) {
        if (only && !only.test(name)) continue;
        const t = performance.now();
        try { resetA(); out.push({ cas: name, ok: true, detail: await fn() }); } catch (e) { out.push({ cas: name, ok: false, detail: e.message }); }
        out.at(-1).ms = Math.round(performance.now() - t); stop();
      }
    } finally { stop(); ProjectTransfer.rollback(prev); window.JACK22_C128?.setCursor(0); await sleep(300); }
    return out;
  }
  window.JACK22_M4 = { run, cases: cases.map(c => c[0]) };
})();
