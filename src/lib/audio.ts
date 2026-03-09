export let isSoundEnabled = true;

export const toggleSound = () => {
  isSoundEnabled = !isSoundEnabled;
  return isSoundEnabled;
};

export const playTone = (freq1: number, freq2: number, type: OscillatorType = 'sine') => {
  if (!isSoundEnabled) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const play = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    play(freq1, 0, 0.15);
    if (freq2) play(freq2, 0.1, 0.3);
  } catch (e) {
    console.error("Audio error:", e);
  }
};

export const playClick = () => playTone(440, 554);
export const playSuccess = () => playTone(523.25, 659.25);
