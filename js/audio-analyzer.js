import { AudioUtils, MathUtils } from './utils.js';

export class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.frequencyData = null;
        this.timeData = null;
        
        // Analysis parameters
        this.fftSize = 2048;
        this.smoothingTimeConstant = 0.8;
        
        // Beat detection
        this.beatThreshold = 0.35;
        this.beatDecay = 0.98;
        this.beatMinInterval = 200; // ms
        this.lastBeatTime = 0;
        this.energyHistory = [];
        this.maxEnergyHistorySize = 43; // ~1 second at 43 FPS
        
        // Frequency analysis
        this.frequencyBands = {
            bass: { start: 0, end: 0.1 },
            lowMid: { start: 0.1, end: 0.25 },
            mid: { start: 0.25, end: 0.5 },
            highMid: { start: 0.5, end: 0.75 },
            treble: { start: 0.75, end: 1.0 }
        };
        
        this.currentAnalysis = {
            volume: 0,
            energy: 0,
            beat: false,
            dominantFrequency: 0,
            bands: {},
            spectrum: [],
            waveform: []
        };
    }

    async initialize(audioElement) {
        try {
            // Create audio context
            this.audioContext = AudioUtils.getAudioContext();
            
            // Resume context if suspended (browser policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
            
            // Create audio source
            if (!this.source) {
                this.source = this.audioContext.createMediaElementSource(audioElement);
                this.source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
            }
            
            // Initialize data arrays
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.timeData = new Uint8Array(this.analyser.frequencyBinCount);
            
            return true;
        } catch (error) {
            console.error('Failed to initialize audio analyzer:', error);
            return false;
        }
    }

    analyze() {
        if (!this.analyser) return this.currentAnalysis;
        
        // Get frequency and time domain data
        this.analyser.getByteFrequencyData(this.frequencyData);
        this.analyser.getByteTimeDomainData(this.timeData);
        
        // Calculate volume (RMS)
        const volume = this.calculateVolume();
        
        // Calculate energy
        const energy = this.calculateEnergy();
        
        // Detect beat
        const beat = this.detectBeat(energy);
        
        // Get dominant frequency
        const dominantFrequency = AudioUtils.getDominantFrequency(
            this.frequencyData,
            this.audioContext.sampleRate,
            this.fftSize
        );
        
        // Analyze frequency bands
        const bands = this.analyzeFrequencyBands();
        
        // Update current analysis
        this.currentAnalysis = {
            volume,
            energy,
            beat,
            dominantFrequency,
            bands,
            spectrum: Array.from(this.frequencyData),
            waveform: Array.from(this.timeData)
        };
        
        return this.currentAnalysis;
    }

    calculateVolume() {
        let sum = 0;
        for (let i = 0; i < this.timeData.length; i++) {
            const sample = (this.timeData[i] - 128) / 128;
            sum += sample * sample;
        }
        return Math.sqrt(sum / this.timeData.length);
    }

    calculateEnergy() {
        let sum = 0;
        for (let i = 0; i < this.frequencyData.length; i++) {
            sum += this.frequencyData[i] * this.frequencyData[i];
        }
        return sum / (this.frequencyData.length * 255 * 255);
    }

    detectBeat(currentEnergy) {
        // Add current energy to history
        this.energyHistory.push(currentEnergy);
        if (this.energyHistory.length > this.maxEnergyHistorySize) {
            this.energyHistory.shift();
        }
        
        // Calculate average energy
        const averageEnergy = this.energyHistory.reduce((sum, energy) => sum + energy, 0) / this.energyHistory.length;
        
        // Calculate variance
        const variance = this.energyHistory.reduce((sum, energy) => sum + Math.pow(energy - averageEnergy, 2), 0) / this.energyHistory.length;
        
        // Beat detection algorithm
        const now = Date.now();
        const timeSinceLastBeat = now - this.lastBeatTime;
        
        const beatDetected = currentEnergy > (averageEnergy + this.beatThreshold * Math.sqrt(variance)) &&
                           timeSinceLastBeat > this.beatMinInterval;
        
        if (beatDetected) {
            this.lastBeatTime = now;
            return true;
        }
        
        return false;
    }

    analyzeFrequencyBands() {
        const bands = {};
        const binCount = this.frequencyData.length;
        
        Object.keys(this.frequencyBands).forEach(bandName => {
            const band = this.frequencyBands[bandName];
            const startBin = Math.floor(band.start * binCount);
            const endBin = Math.floor(band.end * binCount);
            
            let sum = 0;
            for (let i = startBin; i < endBin; i++) {
                sum += this.frequencyData[i];
            }
            
            bands[bandName] = sum / (endBin - startBin) / 255; // Normalize to 0-1
        });
        
        return bands;
    }

    getFrequencyRange(startHz, endHz) {
        const nyquist = this.audioContext.sampleRate / 2;
        const startBin = Math.floor((startHz / nyquist) * this.frequencyData.length);
        const endBin = Math.floor((endHz / nyquist) * this.frequencyData.length);
        
        let sum = 0;
        for (let i = startBin; i < endBin; i++) {
            sum += this.frequencyData[i];
        }
        
        return sum / (endBin - startBin) / 255;
    }

    // Get smoothed frequency data for visualization
    getSmoothedFrequencyData(smoothingFactor = 0.7) {
        if (!this.lastFrequencyData) {
            this.lastFrequencyData = Array.from(this.frequencyData);
            return this.lastFrequencyData;
        }
        
        for (let i = 0; i < this.frequencyData.length; i++) {
            this.lastFrequencyData[i] = MathUtils.lerp(
                this.lastFrequencyData[i],
                this.frequencyData[i],
                smoothingFactor
            );
        }
        
        return this.lastFrequencyData;
    }

    // Get processed frequency data optimized for visualization
    getVisualizationData(barCount = 64) {
        const smoothedData = this.getSmoothedFrequencyData();
        const processed = [];
        const binSize = Math.floor(smoothedData.length / barCount);
        
        for (let i = 0; i < barCount; i++) {
            const start = i * binSize;
            const end = start + binSize;
            
            let sum = 0;
            for (let j = start; j < end; j++) {
                sum += smoothedData[j];
            }
            
            // Normalize and apply logarithmic scaling for better visualization
            let value = (sum / binSize) / 255;
            value = Math.pow(value, 0.7); // Gentle curve for better visual distribution
            processed.push(value);
        }
        
        return processed;
    }

    dispose() {
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.frequencyData = null;
        this.timeData = null;
        this.energyHistory = [];
    }
}