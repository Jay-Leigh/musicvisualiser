import { ColorUtils, MathUtils, PerformanceUtils } from './utils.js';

export class Visualizer2D {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        
        // Animation state
        this.animationLoop = null;
        this.isRunning = false;
        
        // Visual properties
        this.colorPalette = ColorUtils.generateMoodPalette('neutral');
        this.currentColorIndex = 0;
        this.colorTransition = 0;
        
        // Particles system
        this.particles = [];
        this.maxParticles = 150;
        
        // Visual modes
        this.modes = ['bars', 'circles', 'waves', 'particles', 'spiral'];
        this.currentMode = 0;
        this.modeTransition = 0;
        
        // Beat effects
        this.beatIntensity = 0;
        this.beatDecay = 0.95;
        this.pulseScale = 1;
        
        // Background
        this.backgroundAlpha = 0.1;
        this.gradientAngle = 0;
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastFpsTime = 0;
        this.fps = 60;
        
        this.resize();
        this.initializeParticles();
        
        // Bind resize handler
        window.addEventListener('resize', this.resize.bind(this));
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.width = rect.width;
        this.height = rect.height;
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Update canvas style for better quality
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    updateColorPalette(mood, energy = 0.5) {
        this.colorPalette = ColorUtils.generateMoodPalette(mood, energy);
    }

    initializeParticles() {
        this.particles = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 3 + 1,
                life: Math.random(),
                maxLife: Math.random() * 0.5 + 0.5,
                decay: Math.random() * 0.02 + 0.005
            });
        }
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.animationLoop = PerformanceUtils.createAnimationLoop(this.render.bind(this));
        this.animationLoop.start();
    }

    stop() {
        this.isRunning = false;
        if (this.animationLoop) {
            this.animationLoop.stop();
        }
    }

    render(timestamp) {
        if (!this.audioAnalyzer || !this.isRunning) return;
        
        // Update FPS counter
        this.updateFPS(timestamp);
        
        // Get audio analysis data
        const analysis = this.audioAnalyzer.analyze();
        const visualData = this.audioAnalyzer.getVisualizationData(64);
        
        // Update visual state
        this.updateVisualState(analysis);
        
        // Clear canvas with background
        this.renderBackground(analysis);
        
        // Render based on current mode
        switch (this.modes[this.currentMode]) {
            case 'bars':
                this.renderBars(visualData, analysis);
                break;
            case 'circles':
                this.renderCircles(visualData, analysis);
                break;
            case 'waves':
                this.renderWaves(visualData, analysis);
                break;
            case 'particles':
                this.renderParticles(visualData, analysis);
                break;
            case 'spiral':
                this.renderSpiral(visualData, analysis);
                break;
        }
        
        // Render beat effects
        this.renderBeatEffects(analysis);
        
        // Update transitions
        this.updateTransitions();
    }

    updateFPS(timestamp) {
        this.frameCount++;
        if (timestamp - this.lastFpsTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsTime));
            this.frameCount = 0;
            this.lastFpsTime = timestamp;
        }
    }

    updateVisualState(analysis) {
        // Update beat intensity
        if (analysis.beat) {
            this.beatIntensity = 1;
            this.pulseScale = 1.2;
            // Randomly change mode on strong beats
            if (Math.random() < 0.1) {
                this.switchMode();
            }
        }
        
        this.beatIntensity *= this.beatDecay;
        this.pulseScale = MathUtils.lerp(this.pulseScale, 1, 0.1);
        
        // Update color cycling
        this.colorTransition += 0.01;
        if (this.colorTransition >= 1) {
            this.colorTransition = 0;
            this.currentColorIndex = (this.currentColorIndex + 1) % this.colorPalette.length;
        }
        
        // Update gradient angle
        this.gradientAngle += analysis.energy * 0.02;
    }

    renderBackground(analysis) {
        // Create gradient background
        const gradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, Math.max(this.width, this.height)
        );
        
        const baseColor = this.getCurrentColor();
        gradient.addColorStop(0, ColorUtils.rgbToCss(baseColor, 0.1 + analysis.energy * 0.1));
        gradient.addColorStop(1, ColorUtils.rgbToCss([0, 0, 20], 0.9));
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Add overlay for smooth transitions
        this.ctx.fillStyle = `rgba(15, 15, 35, ${this.backgroundAlpha})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    renderBars(data, analysis) {
        const barWidth = this.width / data.length;
        const maxHeight = this.height * 0.8;
        
        data.forEach((value, index) => {
            const height = value * maxHeight * this.pulseScale;
            const x = index * barWidth;
            const y = this.height - height;
            
            // Color based on frequency and position
            const colorIndex = Math.floor((index / data.length) * this.colorPalette.length);
            const color = this.colorPalette[colorIndex];
            
            // Create gradient for each bar
            const gradient = this.ctx.createLinearGradient(x, y, x, this.height);
            gradient.addColorStop(0, ColorUtils.rgbToCss(color, 0.8));
            gradient.addColorStop(1, ColorUtils.rgbToCss(color, 0.3));
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, barWidth - 1, height);
            
            // Add glow effect on strong beats
            if (analysis.beat && value > 0.7) {
                this.ctx.shadowColor = ColorUtils.rgbToCss(color, 0.8);
                this.ctx.shadowBlur = 20;
                this.ctx.fillRect(x, y, barWidth - 1, height);
                this.ctx.shadowBlur = 0;
            }
        });
    }

    renderCircles(data, analysis) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.min(this.width, this.height) * 0.4;
        
        data.forEach((value, index) => {
            const angle = (index / data.length) * Math.PI * 2;
            const radius = (value * maxRadius + 20) * this.pulseScale;
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const color = this.getColorByIndex(index, data.length);
            const size = value * 8 + 2;
            
            // Draw circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = ColorUtils.rgbToCss(color, 0.7);
            this.ctx.fill();
            
            // Add connecting lines
            if (index > 0) {
                const prevAngle = ((index - 1) / data.length) * Math.PI * 2;
                const prevRadius = (data[index - 1] * maxRadius + 20) * this.pulseScale;
                const prevX = centerX + Math.cos(prevAngle) * prevRadius;
                const prevY = centerY + Math.sin(prevAngle) * prevRadius;
                
                this.ctx.beginPath();
                this.ctx.moveTo(prevX, prevY);
                this.ctx.lineTo(x, y);
                this.ctx.strokeStyle = ColorUtils.rgbToCss(color, 0.3);
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        });
    }

    renderWaves(data, analysis) {
        const waveCount = 3;
        const amplitude = this.height * 0.15;
        
        for (let wave = 0; wave < waveCount; wave++) {
            this.ctx.beginPath();
            
            const offset = (wave / waveCount) * Math.PI * 2;
            const color = this.colorPalette[wave % this.colorPalette.length];
            
            for (let x = 0; x <= this.width; x++) {
                const dataIndex = Math.floor((x / this.width) * data.length);
                const value = data[dataIndex] || 0;
                
                const baseY = this.height / 2 + (wave - waveCount / 2) * 50;
                const waveY = Math.sin((x / this.width) * Math.PI * 4 + offset + this.gradientAngle) * amplitude * value;
                const y = baseY + waveY * this.pulseScale;
                
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.strokeStyle = ColorUtils.rgbToCss(color, 0.6);
            this.ctx.lineWidth = 2 + wave;
            this.ctx.stroke();
        }
    }

    renderParticles(data, analysis) {
        // Update particles based on audio
        const avgAmplitude = data.reduce((sum, val) => sum + val, 0) / data.length;
        
        this.particles.forEach((particle, index) => {
            // Update particle based on audio data
            const dataIndex = index % data.length;
            const audioInfluence = data[dataIndex];
            
            // Update position
            particle.x += particle.vx + audioInfluence * 2;
            particle.y += particle.vy + audioInfluence * 2;
            
            // Update life
            particle.life -= particle.decay;
            if (particle.life <= 0) {
                particle.life = particle.maxLife;
                particle.x = Math.random() * this.width;
                particle.y = Math.random() * this.height;
                particle.vx = (Math.random() - 0.5) * 2;
                particle.vy = (Math.random() - 0.5) * 2;
            }
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
            
            // Draw particle
            const color = this.getColorByValue(audioInfluence);
            const alpha = particle.life * audioInfluence;
            const size = particle.size * (1 + audioInfluence) * this.pulseScale;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = ColorUtils.rgbToCss(color, alpha);
            this.ctx.fill();
            
            // Connect nearby particles
            for (let j = index + 1; j < this.particles.length; j++) {
                const other = this.particles[j];
                const distance = Math.sqrt(
                    Math.pow(particle.x - other.x, 2) + Math.pow(particle.y - other.y, 2)
                );
                
                if (distance < 100 && audioInfluence > 0.3) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(other.x, other.y);
                    this.ctx.strokeStyle = ColorUtils.rgbToCss(color, alpha * 0.3);
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        });
    }

    renderSpiral(data, analysis) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.min(this.width, this.height) * 0.4;
        const spirals = 2;
        
        for (let spiral = 0; spiral < spirals; spiral++) {
            this.ctx.beginPath();
            
            const spiralOffset = (spiral / spirals) * Math.PI * 2;
            const color = this.colorPalette[spiral % this.colorPalette.length];
            
            for (let i = 0; i < data.length; i++) {
                const progress = i / data.length;
                const angle = progress * Math.PI * 8 + spiralOffset + this.gradientAngle;
                const radius = (progress * maxRadius + data[i] * 50) * this.pulseScale;
                
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
                
                // Add dots at high amplitude points
                if (data[i] > 0.6) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, data[i] * 5, 0, Math.PI * 2);
                    this.ctx.fillStyle = ColorUtils.rgbToCss(color, 0.8);
                    this.ctx.fill();
                }
            }
            
            this.ctx.strokeStyle = ColorUtils.rgbToCss(color, 0.6);
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    renderBeatEffects(analysis) {
        if (this.beatIntensity > 0.1) {
            // Screen flash effect
            const flashAlpha = this.beatIntensity * 0.1;
            const flashColor = this.getCurrentColor();
            
            this.ctx.fillStyle = ColorUtils.rgbToCss(flashColor, flashAlpha);
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            // Radial pulse effect
            const centerX = this.width / 2;
            const centerY = this.height / 2;
            const pulseRadius = this.beatIntensity * Math.max(this.width, this.height) * 0.5;
            
            const gradient = this.ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, pulseRadius
            );
            
            gradient.addColorStop(0, ColorUtils.rgbToCss(flashColor, 0.3 * this.beatIntensity));
            gradient.addColorStop(1, ColorUtils.rgbToCss(flashColor, 0));
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    updateTransitions() {
        // Smooth mode transitions
        this.modeTransition = Math.max(0, this.modeTransition - 0.02);
    }

    switchMode() {
        this.currentMode = (this.currentMode + 1) % this.modes.length;
        this.modeTransition = 1;
    }

    getCurrentColor() {
        const currentColor = this.colorPalette[this.currentColorIndex];
        const nextColor = this.colorPalette[(this.currentColorIndex + 1) % this.colorPalette.length];
        return ColorUtils.interpolateColor(currentColor, nextColor, this.colorTransition);
    }

    getColorByIndex(index, total) {
        const colorIndex = Math.floor((index / total) * this.colorPalette.length);
        return this.colorPalette[colorIndex % this.colorPalette.length];
    }

    getColorByValue(value) {
        const index = Math.floor(value * this.colorPalette.length);
        return this.colorPalette[Math.min(index, this.colorPalette.length - 1)];
    }

    setAudioAnalyzer(analyzer) {
        this.audioAnalyzer = analyzer;
    }

    dispose() {
        this.stop();
        window.removeEventListener('resize', this.resize.bind(this));
        
        if (this.animationLoop) {
            this.animationLoop.stop();
            this.animationLoop = null;
        }
    }
}