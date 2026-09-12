// Schedule against the audio clock, rather than relying on a foreground timer.
export function createRestAudio(getContext) {
  let context;
  let voices = [];
  const cancel = () => {
    for (const {osc, gain} of voices) {
      try { osc.stop(); } catch {}
      osc.disconnect(); gain.disconnect();
    }
    voices = [];
  };
  const unlock = () => {
    try {
      context ||= getContext();
      if (context?.state !== 'running') context?.resume()?.catch(() => {});
    } catch { /* Audio unavailable: visual and haptic cues still work. */ }
  };
  const schedule = (seconds) => {
    cancel();
    if (!context || !Number.isFinite(seconds) || seconds < 0) return;
    const at = context.currentTime + Math.max(0.02, seconds);
    [[660,0,.16],[880,.19,.16],[1320,.38,.42]].forEach(([frequency, offset, duration]) => {
      const osc = context.createOscillator(), gain = context.createGain();
      osc.type = 'sine'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at + offset);
      gain.gain.linearRampToValueAtTime(.12, at + offset + .012);
      gain.gain.exponentialRampToValueAtTime(.001, at + offset + duration);
      osc.connect(gain); gain.connect(context.destination);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); voices = voices.filter(v => v.osc !== osc); };
      voices.push({osc,gain});
      osc.start(at + offset); osc.stop(at + offset + duration + .02);
    });
  };
  return {unlock, schedule, cancel};
}
export const restAudio = createRestAudio(() => {
  const Audio = window.AudioContext || window.webkitAudioContext;
  return Audio ? new Audio() : null;
});
