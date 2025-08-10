import { AudioAnalyzer } from './audio-analyzer.js';
import { Visualizer2D } from './visualizer-2d.js';
import { Visualizer3D } from './visualizer-3d.js';
import { StreamingServices } from './streaming-services.js';
import { AIIntegration } from './ai-integration.js';
import { DOMUtils, PerformanceUtils } from './utils.js';

class MusicVizApp {
    constructor() {
        this.audioElement = document.getElementById('audio-player');
        this.canvas2D = document.getElementById('canvas-2d');
        this.container3D = document.getElementById('three-container');
        
        // Core components
        this.audioAnalyzer = new AudioAnalyzer();
        this.visualizer2D = new Visualizer2D(this.canvas2D);
        this.visualizer3D = new Visualizer3D(this.container3D);
        this.streamingServices = new StreamingServices();
        this.aiIntegration = new AIIntegration();
        
        // State
        this.isPlaying = false;
        this.is3DMode = false;
        this.isFullscreen = false;
        this.currentTrack = null;
        
        // DOM elements
        this.elements = this.initializeElements();
        
        // Initialize
        this.initialize();
    }

    initializeElements() {
        return {
            // Loading
            loading: document.getElementById('loading'),
            
            // Main interface
            mainInterface: document.getElementById('main-interface'),
            
            // Input elements
            audioFile: document.getElementById('audio-file'),
            musicUrl: document.getElementById('music-url'),
            loadUrlBtn: document.getElementById('load-url'),
            
            // Audio controls
            audioControls: document.getElementById('audio-controls'),
            playPause: document.getElementById('play-pause'),
            playIcon: document.getElementById('play-icon'),
            progressFill: document.getElementById('progress-fill'),
            currentTime: document.getElementById('current-time'),
            duration: document.getElementById('duration'),
            volumeSlider: document.getElementById('volume-slider'),
            trackTitle: document.getElementById('track-title'),
            trackArtist: document.getElementById('track-artist'),
            
            // Visualizer
            visualizerContainer: document.getElementById('visualizer-container'),
            currentMode: document.getElementById('current-mode'),
            modeSwitch: document.getElementById('mode-switch'),
            backBtn: document.getElementById('back-btn'),
            
            // Controls
            visualizerToggle: document.getElementById('visualizer-toggle'),
            vizModeText: document.getElementById('viz-mode-text'),
            fullscreenBtn: document.getElementById('fullscreen-btn')
        };
    }

    async initialize() {
        try {
            // Show loading screen
            this.showLoading();
            
            // Initialize streaming services
            await this.streamingServices.initializeSDKs();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize visualizers with audio analyzer
            this.visualizer2D.setAudioAnalyzer(this.audioAnalyzer);
            this.visualizer3D.setAudioAnalyzer(this.audioAnalyzer);
            
            // Hide loading screen
            this.hideLoading();
            
            console.log('MusicViz initialized successfully');
        } catch (error) {
            console.error('Failed to initialize MusicViz:', error);
            DOMUtils.showToast('Failed to initialize application', 'error');
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // File upload
        this.elements.audioFile.addEventListener('change', this.handleFileUpload.bind(this));
        
        // URL loading
        this.elements.loadUrlBtn.addEventListener('click', this.handleUrlLoad.bind(this));
        this.elements.musicUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUrlLoad();
            }
        });
        
        // Audio controls
        this.elements.playPause.addEventListener('click', this.togglePlayPause.bind(this));
        this.elements.volumeSlider.addEventListener('input', this.handleVolumeChange.bind(this));
        
        // Progress bar interaction
        const progressContainer = document.querySelector('.progress-bar');
        progressContainer.addEventListener('click', this.handleProgressClick.bind(this));
        
        // Visualizer controls
        this.elements.visualizerToggle.addEventListener('click', this.toggleVisualizerMode.bind(this));
        this.elements.modeSwitch.addEventListener('click', this.toggleVisualizerMode.bind(this));
        this.elements.backBtn.addEventListener('click', this.exitVisualizer.bind(this));
        this.elements.fullscreenBtn.addEventListener('click', this.toggleFullscreen.bind(this));
        
        // Audio element events
        this.audioElement.addEventListener('loadedmetadata', this.handleAudioLoaded.bind(this));
        this.audioElement.addEventListener('timeupdate', this.handleTimeUpdate.bind(this));
        this.audioElement.addEventListener('play', this.handleAudioPlay.bind(this));
        this.audioElement.addEventListener('pause', this.handleAudioPause.bind(this));
        this.audioElement.addEventListener('ended', this.handleAudioEnded.bind(this));
        this.audioElement.addEventListener('error', this.handleAudioError.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
        
        // Fullscreen change
        document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
        
        // Error toast close
        const closeErrorBtn = document.getElementById('close-error');
        closeErrorBtn.addEventListener('click', () => {
            DOMUtils.hide(document.getElementById('error-toast'));
        });
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // Validate file type
            if (!this.isValidAudioFile(file)) {
                throw new Error('Unsupported file type. Please use MP3, WAV, M4A, or OGG files.');
            }
            
            // Create object URL
            const url = URL.createObjectURL(file);
            
            // Extract metadata
            const metadata = {
                title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                artist: 'Unknown Artist',
                genre: this.guessGenreFromFilename(file.name)
            };
            
            // Load the audio
            await this.loadAudio(url, metadata);
            
            DOMUtils.showToast('Audio file loaded successfully', 'success');
        } catch (error) {
            console.error('File upload error:', error);
            DOMUtils.showToast(error.message, 'error');
        }
    }

    async handleUrlLoad() {
        const url = this.elements.musicUrl.value.trim();
        if (!url) return;
        
        try {
            this.elements.loadUrlBtn.disabled = true;
            this.elements.loadUrlBtn.textContent = 'Loading...';
            
            // Check if it's a streaming service URL
            if (this.streamingServices.isSupportedUrl(url)) {
                const result = await this.streamingServices.handleUrl(url);
                
                if (result && result.streamUrl) {
                    await this.loadAudio(result.streamUrl, {
                        title: result.title,
                        artist: result.artist
                    });
                    DOMUtils.showToast('Stream loaded successfully', 'success');
                } else {
                    DOMUtils.showToast(result?.message || 'Unable to load stream', 'warning');
                }
            } else {
                // Try to load as direct audio URL
                await this.loadAudio(url, {
                    title: 'Audio Stream',
                    artist: 'Unknown Artist'
                });
                DOMUtils.showToast('Direct audio stream loaded', 'success');
            }
        } catch (error) {
            console.error('URL load error:', error);
            DOMUtils.showToast('Failed to load audio from URL', 'error');
        } finally {
            this.elements.loadUrlBtn.disabled = false;
            this.elements.loadUrlBtn.textContent = 'Load';
        }
    }

    async loadAudio(url, metadata) {
        try {
            // Set audio source
            this.audioElement.src = url;
            
            // Store track info
            this.currentTrack = {
                url,
                ...metadata,
                loadTime: Date.now()
            };
            
            // Initialize audio analyzer
            await this.audioAnalyzer.initialize(this.audioElement);
            
            // Update UI
            this.updateTrackInfo(metadata);
            DOMUtils.show(this.elements.audioControls);
            
            // AI analysis
            if (metadata.title !== 'Unknown') {
                this.performAIAnalysis(metadata);
            }
            
        } catch (error) {
            console.error('Failed to load audio:', error);
            throw new Error('Failed to load audio file');
        }
    }

    async performAIAnalysis(metadata) {
        try {
            const analysis = await this.aiIntegration.analyzeTrack(metadata);
            
            // Update visualizers with AI insights
            this.visualizer2D.updateColorPalette(analysis.mood, analysis.energy);
            this.visualizer3D.updateColorPalette(analysis.mood, analysis.energy);
            
            console.log('AI Analysis applied:', analysis);
            DOMUtils.showToast(`Mood: ${analysis.mood} (${analysis.source})`, 'info', 2000);
        } catch (error) {
            console.warn('AI analysis failed:', error);
        }
    }

    updateTrackInfo(metadata) {
        this.elements.trackTitle.textContent = metadata.title || 'Unknown Title';
        this.elements.trackArtist.textContent = metadata.artist || 'Unknown Artist';
    }

    isValidAudioFile(file) {
        const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg'];
        const validExtensions = ['.mp3', '.wav', '.m4a', '.ogg'];
        
        return validTypes.includes(file.type) || 
               validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    }

    guessGenreFromFilename(filename) {
        const name = filename.toLowerCase();
        const genreKeywords = {
            'electronic': ['electronic', 'edm', 'techno', 'house', 'trance'],
            'rock': ['rock', 'metal', 'punk', 'grunge'],
            'pop': ['pop', 'mainstream'],
            'classical': ['classical', 'symphony', 'orchestral'],
            'jazz': ['jazz', 'blues'],
            'ambient': ['ambient', 'chill', 'lounge']
        };
        
        for (const [genre, keywords] of Object.entries(genreKeywords)) {
            if (keywords.some(keyword => name.includes(keyword))) {
                return genre;
            }
        }
        
        return 'unknown';
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pauseAudio();
        } else {
            this.playAudio();
        }
    }

    async playAudio() {
        try {
            await this.audioElement.play();
            this.isPlaying = true;
            this.elements.playIcon.textContent = '⏸';
            
            // Start visualizers
            this.startVisualizers();
        } catch (error) {
            console.error('Failed to play audio:', error);
            DOMUtils.showToast('Failed to play audio', 'error');
        }
    }

    pauseAudio() {
        this.audioElement.pause();
        this.isPlaying = false;
        this.elements.playIcon.textContent = '▶';
        
        // Pause visualizers
        this.pauseVisualizers();
    }

    startVisualizers() {
        if (this.is3DMode) {
            this.visualizer3D.start();
            this.visualizer2D.stop();
        } else {
            this.visualizer2D.start();
            this.visualizer3D.stop();
        }
    }

    pauseVisualizers() {
        this.visualizer2D.stop();
        this.visualizer3D.stop();
    }

    handleVolumeChange(event) {
        const volume = parseFloat(event.target.value);
        this.audioElement.volume = volume;
    }

    handleProgressClick(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const progress = clickX / rect.width;
        const newTime = progress * this.audioElement.duration;
        
        if (!isNaN(newTime)) {
            this.audioElement.currentTime = newTime;
        }
    }

    handleAudioLoaded() {
        const duration = this.audioElement.duration;
        this.elements.duration.textContent = DOMUtils.formatTime(duration);
    }

    handleTimeUpdate() {
        const current = this.audioElement.currentTime;
        const duration = this.audioElement.duration;
        
        if (!isNaN(current) && !isNaN(duration)) {
            const progress = (current / duration) * 100;
            this.elements.progressFill.style.width = `${progress}%`;
            this.elements.currentTime.textContent = DOMUtils.formatTime(current);
        }
    }

    handleAudioPlay() {
        this.isPlaying = true;
        this.startVisualizers();
    }

    handleAudioPause() {
        this.isPlaying = false;
        this.pauseVisualizers();
    }

    handleAudioEnded() {
        this.isPlaying = false;
        this.elements.playIcon.textContent = '▶';
        this.pauseVisualizers();
    }

    handleAudioError(event) {
        console.error('Audio error:', event);
        DOMUtils.showToast('Audio playback error occurred', 'error');
        this.isPlaying = false;
        this.pauseVisualizers();
    }

    toggleVisualizerMode() {
        this.is3DMode = !this.is3DMode;
        
        if (this.is3DMode) {
            this.canvas2D.style.display = 'none';
            this.container3D.style.display = 'block';
            this.elements.currentMode.textContent = '3D Mode';
            this.elements.modeSwitch.textContent = 'Switch to 2D';
            this.elements.vizModeText.textContent = '3D';
        } else {
            this.canvas2D.style.display = 'block';
            this.container3D.style.display = 'none';
            this.elements.currentMode.textContent = '2D Mode';
            this.elements.modeSwitch.textContent = 'Switch to 3D';
            this.elements.vizModeText.textContent = '2D';
        }
        
        // Restart visualizers if playing
        if (this.isPlaying) {
            this.startVisualizers();
        }
    }

    enterVisualizer() {
        if (!this.isPlaying) {
            DOMUtils.showToast('Please start playing music first', 'info');
            return;
        }
        
        DOMUtils.hide(this.elements.mainInterface);
        DOMUtils.show(this.elements.visualizerContainer);
        
        // Start appropriate visualizer
        this.startVisualizers();
    }

    exitVisualizer() {
        DOMUtils.hide(this.elements.visualizerContainer);
        DOMUtils.show(this.elements.mainInterface);
        
        // Stop visualizers
        this.pauseVisualizers();
    }

    toggleFullscreen() {
        if (this.elements.visualizerContainer.classList.contains('hidden')) {
            // Enter visualizer mode and fullscreen
            this.enterVisualizer();
            setTimeout(() => {
                DOMUtils.toggleFullscreen(this.elements.visualizerContainer);
            }, 100);
        } else {
            DOMUtils.toggleFullscreen();
        }
    }

    handleFullscreenChange() {
        this.isFullscreen = !!document.fullscreenElement;
        
        if (!this.isFullscreen && !this.elements.visualizerContainer.classList.contains('hidden')) {
            // Exit visualizer when leaving fullscreen
            this.exitVisualizer();
        }
    }

    handleKeyboard(event) {
        if (event.target.tagName === 'INPUT') return;
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'KeyF':
                event.preventDefault();
                this.toggleFullscreen();
                break;
            case 'KeyV':
                event.preventDefault();
                if (!this.elements.visualizerContainer.classList.contains('hidden')) {
                    this.toggleVisualizerMode();
                }
                break;
            case 'Escape':
                if (!this.elements.visualizerContainer.classList.contains('hidden')) {
                    this.exitVisualizer();
                }
                break;
            case 'KeyM':
                event.preventDefault();
                this.toggleMute();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.seekAudio(-5);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.seekAudio(5);
                break;
        }
    }

    toggleMute() {
        if (this.audioElement.volume > 0) {
            this.audioElement.volume = 0;
            this.elements.volumeSlider.value = 0;
        } else {
            this.audioElement.volume = 0.8;
            this.elements.volumeSlider.value = 0.8;
        }
    }

    seekAudio(seconds) {
        if (!this.audioElement.duration) return;
        
        const newTime = this.audioElement.currentTime + seconds;
        this.audioElement.currentTime = Math.max(0, Math.min(newTime, this.audioElement.duration));
    }

    showLoading() {
        DOMUtils.show(this.elements.loading);
    }

    hideLoading() {
        DOMUtils.hide(this.elements.loading);
    }

    // Cleanup on page unload
    dispose() {
        this.audioAnalyzer.dispose();
        this.visualizer2D.dispose();
        this.visualizer3D.dispose();
        this.streamingServices.cleanup();
        this.aiIntegration.clearCache();
        
        // Revoke object URLs to prevent memory leaks
        if (this.currentTrack && this.currentTrack.url.startsWith('blob:')) {
            URL.revokeObjectURL(this.currentTrack.url);
        }
    }
}

// Auto-start when entering visualizer mode
document.addEventListener('DOMContentLoaded', () => {
    const app = new MusicVizApp();
    
    // Auto-enter visualizer when audio starts playing
    app.audioElement.addEventListener('play', () => {
        setTimeout(() => {
            if (!app.elements.visualizerContainer.classList.contains('hidden')) {
                return; // Already in visualizer
            }
            app.enterVisualizer();
        }, 1000); // Small delay to ensure audio is stable
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        app.dispose();
    });
    
    // Make app globally accessible for debugging
    window.MusicVizApp = app;
});