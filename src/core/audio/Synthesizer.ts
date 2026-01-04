
/**
 * Synthesizer - Procedural Audio System
 *
 * "Zero-Asset" audio engine using Web Audio API.
 * Generates retro/cyberpunk sound effects on the fly based on frequency modulation.
 * Also handles playback of audio files for background music.
 */

export class Synthesizer {
    private static instance: Synthesizer;
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private isInitialized = false;

    // Audio buffers for music files
    private ambienceBuffer: AudioBuffer | null = null;
    private executeBuffer: AudioBuffer | null = null;
    private ambienceSource: AudioBufferSourceNode | null = null;

    // URLs for audio files
    private readonly AMBIENCE_URL = 'https://claim.monad.xyz/sounds/sign-in-loop.mp3';
    private readonly EXECUTE_URL = 'https://claim.monad.xyz/sounds/enter-the-portal.mp3';

    private constructor() { }

    public static getInstance(): Synthesizer {
        if (!Synthesizer.instance) {
            Synthesizer.instance = new Synthesizer();
        }
        return Synthesizer.instance;
    }

    public async init() {
        if (this.isInitialized) return;

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioContextClass();

            // Master gain for all audio
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Default volume
            this.masterGain.connect(this.ctx.destination);

            // Separate gain for background music (lower volume)
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.4; // Music at 40% of master
            this.musicGain.connect(this.masterGain);

            this.isInitialized = true;

            // Load audio files in background
            this.loadAudioFiles();
        } catch (e) {
            console.error('AudioContext not supported', e);
        }
    }

    private async loadAudioFiles() {
        if (!this.ctx) return;

        try {
            // Load ambience
            const ambienceResponse = await fetch(this.AMBIENCE_URL);
            const ambienceData = await ambienceResponse.arrayBuffer();
            this.ambienceBuffer = await this.ctx.decodeAudioData(ambienceData);

            // Load execute sound
            const executeResponse = await fetch(this.EXECUTE_URL);
            const executeData = await executeResponse.arrayBuffer();
            this.executeBuffer = await this.ctx.decodeAudioData(executeData);

            console.log('Audio files loaded successfully');
        } catch (e) {
            console.error('Failed to load audio files', e);
        }
    }

    public resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public setMasterVolume(value: number) {
        if (this.masterGain) {
            // Clamp between 0 and 1
            const vol = Math.max(0, Math.min(1, value));
            // Use time constant for smooth transition
            this.masterGain.gain.setTargetAtTime(vol, this.ctx?.currentTime || 0, 0.05);
        }
    }

    /**
     * Play background ambience (looped)
     */
    public playAmbience() {
        if (!this.ctx || !this.musicGain || !this.ambienceBuffer) {
            console.warn('Ambience not ready');
            return;
        }
        this.resume();

        // Stop existing ambience if playing
        this.stopAmbience();

        // Create and start new source
        this.ambienceSource = this.ctx.createBufferSource();
        this.ambienceSource.buffer = this.ambienceBuffer;
        this.ambienceSource.loop = true;
        this.ambienceSource.connect(this.musicGain);
        this.ambienceSource.start(0);
    }

    /**
     * Stop background ambience
     */
    public stopAmbience() {
        if (this.ambienceSource) {
            try {
                this.ambienceSource.stop();
            } catch (e) {
                // Already stopped
            }
            this.ambienceSource = null;
        }
    }

    /**
     * Play execute sound (one-shot)
     */
    public playExecuteSound() {
        if (!this.ctx || !this.masterGain || !this.executeBuffer) {
            console.warn('Execute sound not ready');
            return;
        }
        this.resume();

        const source = this.ctx.createBufferSource();
        source.buffer = this.executeBuffer;
        source.connect(this.masterGain);
        source.start(0);
    }

    /**
     * Generic tone generator
     */
    private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
        if (!this.ctx || !this.masterGain) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(1, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    // ==========================================
    // SFX PRESETS
    // ==========================================

    public playHover() {
        // Short, high-pitch Sine wave (0.05s, 800Hz)
        this.playTone(800, 'sine', 0.05);
    }

    public playClick() {
        // Sharp Square wave blip (0.1s, 400Hz)
        this.playTone(400, 'square', 0.1);
    }

    public playAttack() {
        if (!this.ctx || !this.masterGain) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';

        // Slide from 800Hz down to 100Hz (Laser effect)
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    public playShield() {
        if (!this.ctx || !this.masterGain) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';

        // Slide UP from 200Hz to 600Hz (Power-up effect)
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    public playCrit() {
        if (!this.ctx || !this.masterGain) return;
        this.resume();

        // Distorted Low-frequency Square wave (Impact)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }

    public playError() {
        if (!this.ctx || !this.masterGain) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    public playVictory() {
        // Fast Major Arpeggio (C-E-G-C)
        // C4 (261.63), E4 (329.63), G4 (392.00), C5 (523.25)
        const notes = [261.63, 329.63, 392.00, 523.25];
        let startTime = 0;

        notes.forEach((note, index) => {
            this.playTone(note, 'triangle', 0.2, startTime + (index * 0.1));
        });
    }
}
