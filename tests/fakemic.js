/* JACK22 — micro simulé pour mesurer la compensation sans matériel (Mission 3).
   À charger dans la page AVANT le premier son (avant initAudio).
   Tout ce que le studio envoie vers la sortie audio est aussi envoyé, avec un retard connu, dans un faux micro.
   Le studio voit un vrai flux micro (getUserMedia) : la mesure de latence, les prises et leur placement
   passent par le même code que sur une vraie machine. Seul le trajet acoustique est remplacé par un retard exact. */
(() => {
  'use strict';
  if (window.JACK22_FAKEMIC) return;
  const conn = AudioNode.prototype.connect, taps = new WeakMap();
  let delayMs = 0, denial = null, last = null, opened = 0;
  function tapFor(ctx) {
    let t = taps.get(ctx);
    if (!t) {
      const g = ctx.createGain(), d = ctx.createDelay(5), dst = ctx.createMediaStreamDestination();
      d.delayTime.value = delayMs / 1000; conn.call(g, d); conn.call(d, dst);
      t = { g, d, dst }; taps.set(ctx, t);
    }
    return t;
  }
  AudioNode.prototype.connect = function (target, ...rest) {
    const r = conn.call(this, target, ...rest);
    // Sortie en direct seulement : les rendus hors ligne (export, traitements voix) ne passent pas par le faux micro.
    if (target instanceof AudioDestinationNode && target.context instanceof AudioContext) conn.call(this, tapFor(target.context).g);
    return r;
  };
  const md = navigator.mediaDevices;
  md.getUserMedia = async () => {
    if (denial) { const e = new DOMException(denial.message, denial.name); throw e; }
    initAudio();
    const tr = tapFor(audio).dst.stream.getAudioTracks()[0].clone();
    // Identité stable du faux micro, comme getSettings() d'un vrai périphérique.
    const id = window.JACK22_FAKEMIC.deviceId, label = window.JACK22_FAKEMIC.label;
    tr.getSettings = () => ({ deviceId: id, groupId: 'fake', sampleRate: audio.sampleRate, channelCount: 1 });
    Object.defineProperty(tr, 'label', { value: label, configurable: true });
    last = tr; opened++;
    return new MediaStream([tr]);
  };
  window.JACK22_FAKEMIC = {
    deviceId: 'fake-mic-1', label: 'Micro simulé 1',
    setDelay(ms) { delayMs = ms; const t = typeof audio !== 'undefined' && audio ? taps.get(audio) : null; if (t) t.d.delayTime.setValueAtTime(ms / 1000, audio.currentTime); },
    get delay() { return delayMs; },
    deny(name, message) { denial = name ? { name, message: message || name } : null; },
    unplug() { if (last) { last.stop(); last.dispatchEvent(new Event('ended')); } },
    get opened() { return opened; },
  };
})();
