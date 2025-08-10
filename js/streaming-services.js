import { DOMUtils } from './utils.js';

export class StreamingServices {
    constructor() {
        this.services = {
            soundcloud: {
                pattern: /soundcloud\.com/i,
                handler: this.handleSoundCloud.bind(this)
            },
            youtube: {
                pattern: /(?:youtube\.com|youtu\.be|music\.youtube\.com)/i,
                handler: this.handleYouTube.bind(this)
            },
            spotify: {
                pattern: /(?:spotify\.com|open\.spotify\.com)/i,
                handler: this.handleSpotify.bind(this)
            },
            appleMusic: {
                pattern: /music\.apple\.com/i,
                handler: this.handleAppleMusic.bind(this)
            }
        };
        
        this.currentService = null;
        this.proxyUrl = this.getProxyUrl();
    }

    getProxyUrl() {
        // For development, use a simple proxy
        // In production, this should be replaced with your own proxy service
        return 'https://api.allorigins.win/raw?url=';
    }

    async handleUrl(url) {
        try {
            // Detect service
            const service = this.detectService(url);
            if (!service) {
                throw new Error('Unsupported streaming service');
            }

            // Handle the URL based on service
            return await service.handler(url);
        } catch (error) {
            console.error('Error handling streaming URL:', error);
            DOMUtils.showToast(`Error loading from streaming service: ${error.message}`, 'error');
            return null;
        }
    }

    detectService(url) {
        for (const [name, service] of Object.entries(this.services)) {
            if (service.pattern.test(url)) {
                this.currentService = name;
                return service;
            }
        }
        return null;
    }

    async handleSoundCloud(url) {
        try {
            // Extract track info from SoundCloud URL
            const trackId = this.extractSoundCloudId(url);
            if (!trackId) {
                throw new Error('Invalid SoundCloud URL');
            }

            // Use SoundCloud's oembed API for track info
            const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
            const response = await fetch(oembedUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch track information');
            }

            const trackInfo = await response.json();
            
            // For demo purposes, we'll show that we detected the track
            // In a real implementation, you'd need SoundCloud API credentials
            return {
                service: 'soundcloud',
                title: trackInfo.title,
                artist: trackInfo.author_name,
                thumbnail: trackInfo.thumbnail_url,
                // Note: Direct streaming requires SoundCloud SDK and authentication
                streamUrl: null,
                requiresProxy: true,
                message: 'SoundCloud integration requires API credentials for direct playback'
            };
        } catch (error) {
            console.error('SoundCloud error:', error);
            throw new Error('Unable to load SoundCloud track. This demo requires API credentials.');
        }
    }

    async handleYouTube(url) {
        try {
            // Extract video ID
            const videoId = this.extractYouTubeId(url);
            if (!videoId) {
                throw new Error('Invalid YouTube URL');
            }

            // Use YouTube oEmbed API for basic info
            const oembedUrl = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`;
            const response = await fetch(oembedUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch video information');
            }

            const videoInfo = await response.json();
            
            return {
                service: 'youtube',
                title: videoInfo.title,
                artist: videoInfo.author_name,
                thumbnail: videoInfo.thumbnail_url,
                videoId: videoId,
                // Note: Direct audio extraction requires server-side processing
                streamUrl: null,
                requiresProxy: true,
                message: 'YouTube audio extraction requires server-side processing'
            };
        } catch (error) {
            console.error('YouTube error:', error);
            throw new Error('Unable to load YouTube video. This demo requires server-side processing.');
        }
    }

    async handleSpotify(url) {
        try {
            // Extract Spotify track/album/playlist ID
            const spotifyData = this.extractSpotifyId(url);
            if (!spotifyData) {
                throw new Error('Invalid Spotify URL');
            }

            // Note: Spotify Web API requires authentication
            // This is a placeholder implementation
            return {
                service: 'spotify',
                title: 'Spotify Track',
                artist: 'Unknown Artist',
                thumbnail: null,
                spotifyId: spotifyData.id,
                type: spotifyData.type,
                streamUrl: null,
                requiresProxy: false,
                message: 'Spotify integration requires Web Playback SDK and authentication'
            };
        } catch (error) {
            console.error('Spotify error:', error);
            throw new Error('Unable to load Spotify content. This demo requires API credentials.');
        }
    }

    async handleAppleMusic(url) {
        try {
            // Apple Music URLs are complex and require MusicKit JS
            return {
                service: 'applemusic',
                title: 'Apple Music Track',
                artist: 'Unknown Artist',
                thumbnail: null,
                streamUrl: null,
                requiresProxy: false,
                message: 'Apple Music integration requires MusicKit JS and authentication'
            };
        } catch (error) {
            console.error('Apple Music error:', error);
            throw new Error('Unable to load Apple Music content. This demo requires MusicKit JS.');
        }
    }

    extractSoundCloudId(url) {
        // Simple extraction - in production, you'd use SoundCloud's resolve API
        const match = url.match(/soundcloud\.com\/([^\/]+)\/([^\/\?]+)/);
        return match ? `${match[1]}/${match[2]}` : null;
    }

    extractYouTubeId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/,
            /music\.youtube\.com\/watch\?v=([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    extractSpotifyId(url) {
        const match = url.match(/spotify\.com\/(track|album|playlist)\/([^?\s]+)/);
        if (match) {
            return {
                type: match[1],
                id: match[2]
            };
        }
        return null;
    }

    // Create a demo audio URL for testing
    getDemoAudioUrl() {
        // For demo purposes, return a placeholder audio file
        // In production, you'd return the actual stream URL
        return 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.mp3';
    }

    // Check if URL is from a supported service
    isSupportedUrl(url) {
        return Object.values(this.services).some(service => service.pattern.test(url));
    }

    // Get service name from URL
    getServiceName(url) {
        for (const [name, service] of Object.entries(this.services)) {
            if (service.pattern.test(url)) {
                return name;
            }
        }
        return null;
    }

    // Create proxy URL for CORS bypass
    createProxyUrl(url) {
        if (!this.proxyUrl) return url;
        return this.proxyUrl + encodeURIComponent(url);
    }

    // Initialize service-specific SDKs (placeholder)
    async initializeSDKs() {
        // In a production app, you'd initialize:
        // - SoundCloud SDK
        // - YouTube iframe API
        // - Spotify Web Playback SDK
        // - Apple MusicKit JS
        
        console.log('Streaming service SDKs would be initialized here');
        
        // For demo purposes, just resolve
        return Promise.resolve();
    }

    // Cleanup service connections
    cleanup() {
        // Cleanup any active service connections
        this.currentService = null;
        console.log('Streaming services cleaned up');
    }
}