// Utility functions for MusicViz

// Color utilities
export const ColorUtils = {
    // Convert HSL to RGB
    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const r = hue2rgb(p, q, h + 1/3);
        const g = hue2rgb(p, q, h);
        const b = hue2rgb(p, q, h - 1/3);
        
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },

    // Generate color palette based on mood
    generateMoodPalette(mood, energy = 0.5) {
        const palettes = {
            energetic: [
                { h: 0, s: 85, l: 60 },    // Red
                { h: 30, s: 90, l: 55 },   // Orange
                { h: 60, s: 80, l: 65 },   // Yellow
                { h: 340, s: 85, l: 60 }   // Pink
            ],
            calm: [
                { h: 210, s: 60, l: 70 },  // Light Blue
                { h: 180, s: 40, l: 75 },  // Cyan
                { h: 120, s: 30, l: 80 },  // Light Green
                { h: 240, s: 45, l: 75 }   // Lavender
            ],
            melancholy: [
                { h: 240, s: 30, l: 40 },  // Dark Blue
                { h: 260, s: 35, l: 45 },  // Purple
                { h: 200, s: 25, l: 50 },  // Steel Blue
                { h: 280, s: 40, l: 35 }   // Dark Purple
            ],
            uplifting: [
                { h: 50, s: 80, l: 65 },   // Bright Yellow
                { h: 120, s: 70, l: 60 },  // Green
                { h: 200, s: 85, l: 65 },  // Sky Blue
                { h: 300, s: 75, l: 70 }   // Magenta
            ],
            neutral: [
                { h: 220, s: 50, l: 60 },  // Blue
                { h: 280, s: 60, l: 65 },  // Purple
                { h: 320, s: 70, l: 60 },  // Pink
                { h: 180, s: 55, l: 65 }   // Teal
            ]
        };

        const basePalette = palettes[mood] || palettes.neutral;
        return basePalette.map(color => {
            // Adjust saturation and lightness based on energy
            const s = Math.max(20, Math.min(100, color.s * (0.5 + energy * 0.5)));
            const l = Math.max(30, Math.min(80, color.l * (0.6 + energy * 0.4)));
            return this.hslToRgb(color.h, s, l);
        });
    },

    // Interpolate between two colors
    interpolateColor(color1, color2, factor) {
        return [
            Math.round(color1[0] + (color2[0] - color1[0]) * factor),
            Math.round(color1[1] + (color2[1] - color1[1]) * factor),
            Math.round(color1[2] + (color2[2] - color1[2]) * factor)
        ];
    },

    // Convert RGB to CSS string
    rgbToCss(rgb, alpha = 1) {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    }
};

// Math utilities
export const MathUtils = {
    // Linear interpolation
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    },

    // Map value from one range to another
    map(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },

    // Smooth step function
    smoothStep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    },

    // Generate noise (simple implementation)
    noise(x, y = 0) {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return n - Math.floor(n);
    },

    // Random in range
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    // Random integer in range
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

// DOM utilities
export const DOMUtils = {
    // Show element with animation
    show(element, animationClass = 'fade-in') {
        element.classList.remove('hidden');
        element.classList.add(animationClass);
    },

    // Hide element with animation
    hide(element, animationClass = 'fade-out') {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.add('hidden');
            element.classList.remove(animationClass);
        }, 300);
    },

    // Toggle fullscreen
    toggleFullscreen(element = document.documentElement) {
        if (!document.fullscreenElement) {
            element.requestFullscreen().catch(err => {
                console.warn('Could not enter fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    },

    // Format time for display
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },

    // Show toast message
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('error-toast');
        const messageEl = document.getElementById('error-message');
        
        toast.className = `toast ${type}`;
        messageEl.textContent = message;
        this.show(toast);
        
        setTimeout(() => {
            this.hide(toast);
        }, duration);
    }
};

// Audio utilities
export const AudioUtils = {
    // Check if audio format is supported
    isFormatSupported(format) {
        const audio = new Audio();
        return audio.canPlayType(`audio/${format}`) !== '';
    },

    // Get audio context with fallback
    getAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        return new AudioContext();
    },

    // Detect beat using onset detection
    detectBeat(frequencyData, threshold = 0.3) {
        const sum = frequencyData.reduce((acc, val) => acc + val, 0);
        const average = sum / frequencyData.length;
        return average > threshold * 255;
    },

    // Get dominant frequency
    getDominantFrequency(frequencyData, sampleRate, fftSize) {
        let maxIndex = 0;
        let maxValue = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxValue) {
                maxValue = frequencyData[i];
                maxIndex = i;
            }
        }
        
        return (maxIndex * sampleRate) / fftSize;
    },

    // Analyze frequency bands
    analyzeFrequencyBands(frequencyData) {
        const bands = {
            bass: 0,
            lowMid: 0,
            mid: 0,
            highMid: 0,
            treble: 0
        };
        
        const bassEnd = Math.floor(frequencyData.length * 0.1);
        const lowMidEnd = Math.floor(frequencyData.length * 0.25);
        const midEnd = Math.floor(frequencyData.length * 0.5);
        const highMidEnd = Math.floor(frequencyData.length * 0.75);
        
        // Calculate average amplitude for each band
        for (let i = 0; i < bassEnd; i++) {
            bands.bass += frequencyData[i];
        }
        bands.bass /= bassEnd;
        
        for (let i = bassEnd; i < lowMidEnd; i++) {
            bands.lowMid += frequencyData[i];
        }
        bands.lowMid /= (lowMidEnd - bassEnd);
        
        for (let i = lowMidEnd; i < midEnd; i++) {
            bands.mid += frequencyData[i];
        }
        bands.mid /= (midEnd - lowMidEnd);
        
        for (let i = midEnd; i < highMidEnd; i++) {
            bands.highMid += frequencyData[i];
        }
        bands.highMid /= (highMidEnd - midEnd);
        
        for (let i = highMidEnd; i < frequencyData.length; i++) {
            bands.treble += frequencyData[i];
        }
        bands.treble /= (frequencyData.length - highMidEnd);
        
        return bands;
    }
};

// Performance utilities
export const PerformanceUtils = {
    // Debounce function calls
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function calls
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // RAF-based animation loop
    createAnimationLoop(callback) {
        let isRunning = false;
        let animationId;
        
        const loop = (timestamp) => {
            if (isRunning) {
                callback(timestamp);
                animationId = requestAnimationFrame(loop);
            }
        };
        
        return {
            start() {
                if (!isRunning) {
                    isRunning = true;
                    animationId = requestAnimationFrame(loop);
                }
            },
            stop() {
                isRunning = false;
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
            }
        };
    }
};