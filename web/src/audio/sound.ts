/**
 * Beadwork sound, synthesised with Web Audio: an electric piano drifting through soft seventh chords over a little
 * vinyl crackle; the plastic click of a bead on its peg, a lighter tick as one is lifted off, a pencil scratch for a
 * cross, a rising note as each line is finished, and the hiss and sizzle of the iron before a final arpeggio.
 */
const SCALE = [0, 2, 4, 5, 7, 9, 11];
export function noteHz(degree: number) { const o = Math.floor(degree / 7), s = SCALE[((degree % 7) + 7) % 7] + o * 12; return 261.63 * Math.pow(2, s / 12); }

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private next = 0;
  private beatN = 0;
  private chapter = 0;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private ducked = false;
  private lastClick = 0;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain(); this.sfx = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(1.8);
      const wet = ctx.createGain(); wet.gain.value = 0.25;
      this.verb.connect(wet).connect(this.master);
      this.music.connect(this.master); this.music.connect(this.verb);
      this.sfx.connect(this.master); this.sfx.connect(this.verb);
      this.noise = this.makeNoise();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setVolumes(music: number, sfx: number) { this.musicVol = music; this.sfxVol = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVol * 0.6 * (this.ducked ? 0.6 : 1), t, 0.3);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.05);
  }
  duck(on: boolean) { this.ducked = on; this.applyVolumes(); }
  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }

  startMusic(chapter: number) {
    if (!this.ctx) return;
    if (this.timer !== null && chapter === this.chapter) return;
    this.chapter = chapter;
    this.next = this.ctx.currentTime + 0.4;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 150);
  }
  /** Slow seventh chords, a walking bass on the beat, a few melody notes; vinyl crackle underneath. */
  private schedule() {
    const ctx = this.ctx!;
    const progs = [[[0, 2, 4, 6], [5, 7, 9, 11], [1, 3, 5, 7], [4, 6, 8, 10]], [[3, 5, 7, 9], [2, 4, 6, 8], [5, 7, 9, 11], [0, 2, 4, 6]], [[5, 7, 9, 11], [3, 5, 7, 9], [0, 2, 4, 6], [4, 6, 8, 10]]][this.chapter % 3];
    const mel = [[9, 8, 6, 4], [7, 9, 11, 9], [11, 9, 7, 6], [6, 4, 5, 4]];
    const beat = 0.5;
    while (this.next < ctx.currentTime + 0.8) {
      const t = this.next, bar = Math.floor(this.beatN / 4), pos = this.beatN % 4, ch = progs[bar % 4];
      if (pos === 0) ch.forEach((d, i) => this.ep(t + i * 0.015, noteHz(d), 0.02, 2.4, this.music));
      this.ep(t, noteHz(ch[0] - 14 + (pos === 2 ? 4 : pos === 3 ? 2 : 0)), 0.045, 0.8, this.music);
      if (bar % 2 === 1 && pos !== 3) this.ep(t + (pos === 1 ? 0.25 : 0), noteHz(mel[(bar >> 1) % 4][pos] + 7), 0.03, 1.4, this.music);
      for (let k = 0; k < 3; k++) if (Math.random() < 0.5) this.hiss(t + Math.random() * beat, 0.006, 0.006 + Math.random() * 0.006, 3000 + Math.random() * 3000, 2, this.music);
      this.next += beat; this.beatN++;
    }
  }
  /** Electric piano: a sine carrier with a decaying FM bark and a bell-like tine. */
  private ep(t: number, f: number, vol: number, dur: number, bus: GainNode) {
    const ctx = this.ctx!, car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), tine = ctx.createOscillator(), tg = ctx.createGain();
    car.frequency.value = f; mod.frequency.value = f; mg.gain.setValueAtTime(f * 1.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.4); mod.connect(mg).connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    tine.frequency.value = f * 7.1; tg.gain.setValueAtTime(vol * 0.15, t); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    car.connect(g).connect(bus); tine.connect(tg).connect(bus);
    car.start(t); mod.start(t); tine.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05); tine.stop(t + 0.2);
  }
  private hiss(t: number, dur: number, vol: number, freq: number, q = 1, bus?: GainNode, sweep?: number, type: BiquadFilterType = 'bandpass') {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = type; bp.Q.value = q; bp.frequency.setValueAtTime(freq, t); if (sweep) bp.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.004, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(bus ?? this.sfx); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  private ping(t: number, f: number, vol: number, dur: number) { const ctx = this.ctx!, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + dur + 0.02); }
  /** A bead clicks onto its peg (quieter when painting a run quickly). */
  place() { if (!this.ctx) return; const t = this.ctx.currentTime, soft = t - this.lastClick < 0.08 ? 0.6 : 1; this.lastClick = t; this.hiss(t, 0.02, 0.08 * soft, 4200, 2.5); this.ping(t, 2400 + Math.random() * 400, 0.03 * soft, 0.05); }
  lift() { if (!this.ctx) return; const t = this.ctx.currentTime; this.hiss(t, 0.015, 0.05, 3000, 2); this.ping(t, 1700, 0.02, 0.04); }
  mark() { if (!this.ctx) return; const t = this.ctx.currentTime; this.hiss(t, 0.05, 0.03, 5200, 1.2, undefined, 3600); }
  /** A row or column finished. */
  line(n: number) { if (this.ctx) this.ep(this.ctx.currentTime + 0.02, noteHz(7 + (n % 8)), 0.05, 1.2, this.sfx); }
  tap() { if (this.ctx) this.hiss(this.ctx.currentTime, 0.04, 0.03, 2600, 2); }
  undo() { if (this.ctx) this.hiss(this.ctx.currentTime, 0.16, 0.03, 1800, 1, undefined, 900); }
  hint() { if (this.ctx) { const t = this.ctx.currentTime; this.ep(t, noteHz(9), 0.05, 1.2, this.sfx); this.ep(t + 0.14, noteHz(11), 0.045, 1.4, this.sfx); } }
  /** The picture appears: a shimmer of colour. */
  reveal() { if (this.ctx) { const t = this.ctx.currentTime; for (let k = 0; k < 12; k++) this.ping(t + k * 0.04, 1800 + k * 160, 0.012, 0.15); } }
  /** The iron passes: steam and sizzle. */
  iron(dur: number) { if (this.ctx) { const t = this.ctx.currentTime; this.hiss(t, dur, 0.06, 2600, 0.6, undefined, 1400); for (let k = 0; k < dur * 30; k++) this.hiss(t + Math.random() * dur, 0.01, 0.015, 5000 + Math.random() * 3000, 3); } }
  whole() { if (this.ctx) { const t = this.ctx.currentTime; [0, 2, 4, 6, 7, 9, 11, 14].forEach((d, i) => this.ep(t + i * 0.08, noteHz(d + 7), 0.05, 1.8, this.sfx)); [0, 4, 6].forEach((d) => this.ep(t + 0.75, noteHz(d), 0.04, 2.6, this.sfx)); } }
  star(i: number) { if (this.ctx) this.ep(this.ctx.currentTime, noteHz([9, 11, 14][i] ?? 14), 0.06, 1.4, this.sfx); }

  private makeNoise() {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    return b;
  }
}
export const sound = new Sound();
