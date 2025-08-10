import { ColorUtils, DOMUtils } from './utils.js';

export class AIIntegration {
    constructor() {
        this.apiKey = this.getAPIKey();
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.visionUrl = 'https://vision.googleapis.com/v1/images:annotate';
        
        // Mood classification cache
        this.moodCache = new Map();
        this.colorCache = new Map();
        
        // Default mood classifications
        this.defaultMoods = {
            electronic: 'energetic',
            rock: 'energetic', 
            pop: 'uplifting',
            classical: 'calm',
            jazz: 'neutral',
            ambient: 'calm',
            metal: 'energetic',
            blues: 'melancholy',
            country: 'neutral',
            rap: 'energetic',
            hiphop: 'energetic',
            reggae: 'uplifting',
            folk: 'calm',
            default: 'neutral'
        };
    }

    getAPIKey() {
        // In production, this should come from environment variables
        // For demo purposes, return null to use fallback logic
        return process.env.GOOGLE_AI_API_KEY || null;
    }

    async analyzeMood(metadata) {
        try {
            // Create cache key
            const cacheKey = `${metadata.title || ''}_${metadata.artist || ''}`.toLowerCase();
            
            // Check cache first
            if (this.moodCache.has(cacheKey)) {
                return this.moodCache.get(cacheKey);
            }

            // If no API key, use fallback analysis
            if (!this.apiKey) {
                return this.fallbackMoodAnalysis(metadata);
            }

            // Prepare prompt for Gemini
            const prompt = this.createMoodAnalysisPrompt(metadata);
            
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 100
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const result = this.parseAIMoodResponse(data);
            
            // Cache the result
            this.moodCache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.warn('AI mood analysis failed, using fallback:', error);
            return this.fallbackMoodAnalysis(metadata);
        }
    }

    createMoodAnalysisPrompt(metadata) {
        const title = metadata.title || 'Unknown';
        const artist = metadata.artist || 'Unknown';
        const genre = metadata.genre || 'Unknown';
        const lyrics = metadata.lyrics ? metadata.lyrics.substring(0, 500) : '';

        return `Analyze the mood and energy of this music based on the metadata:

Title: ${title}
Artist: ${artist}
Genre: ${genre}
${lyrics ? `Lyrics (sample): ${lyrics}` : ''}

Classify the mood as one of: energetic, calm, melancholy, uplifting, neutral
Also provide an energy level from 0.0 to 1.0 (where 0.0 is very calm, 1.0 is very energetic)

Respond in this exact format:
mood: [mood]
energy: [energy_level]
reasoning: [brief explanation]`;
    }

    parseAIMoodResponse(apiResponse) {
        try {
            const text = apiResponse.candidates[0]?.content?.parts[0]?.text || '';
            
            // Extract mood and energy from the response
            const moodMatch = text.match(/mood:\s*(\w+)/i);
            const energyMatch = text.match(/energy:\s*([\d.]+)/i);
            const reasoningMatch = text.match(/reasoning:\s*(.+)/i);
            
            const mood = moodMatch ? moodMatch[1].toLowerCase() : 'neutral';
            const energy = energyMatch ? parseFloat(energyMatch[1]) : 0.5;
            const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'AI analysis';
            
            return {
                mood: this.validateMood(mood),
                energy: Math.max(0, Math.min(1, energy)),
                reasoning,
                source: 'ai'
            };
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            return this.getFallbackMood();
        }
    }

    fallbackMoodAnalysis(metadata) {
        try {
            const title = (metadata.title || '').toLowerCase();
            const artist = (metadata.artist || '').toLowerCase();
            const genre = (metadata.genre || '').toLowerCase();
            
            // Simple keyword-based analysis
            let mood = 'neutral';
            let energy = 0.5;
            
            // Genre-based mood mapping
            for (const [genreKey, moodValue] of Object.entries(this.defaultMoods)) {
                if (genre.includes(genreKey)) {
                    mood = moodValue;
                    break;
                }
            }
            
            // Keyword analysis for energy and mood
            const energeticKeywords = ['dance', 'party', 'energy', 'power', 'rock', 'metal', 'fast', 'beat', 'pump'];
            const calmKeywords = ['slow', 'soft', 'peaceful', 'calm', 'ambient', 'chill', 'relax', 'meditation'];
            const melancholyKeywords = ['sad', 'blue', 'melancholy', 'sorrow', 'lonely', 'dark', 'pain'];
            const upliftingKeywords = ['happy', 'joy', 'bright', 'sunshine', 'love', 'hope', 'celebration'];
            
            const text = `${title} ${artist} ${genre}`;
            
            // Calculate energy based on keywords
            const energeticCount = energeticKeywords.filter(keyword => text.includes(keyword)).length;
            const calmCount = calmKeywords.filter(keyword => text.includes(keyword)).length;
            
            if (energeticCount > 0) {
                energy = Math.min(1, 0.7 + (energeticCount * 0.1));
                if (mood === 'neutral') mood = 'energetic';
            } else if (calmCount > 0) {
                energy = Math.max(0, 0.3 - (calmCount * 0.1));
                if (mood === 'neutral') mood = 'calm';
            }
            
            // Mood refinement based on keywords
            if (melancholyKeywords.some(keyword => text.includes(keyword))) {
                mood = 'melancholy';
                energy = Math.max(0.2, energy - 0.3);
            } else if (upliftingKeywords.some(keyword => text.includes(keyword))) {
                mood = 'uplifting';
                energy = Math.min(0.8, energy + 0.2);
            }
            
            return {
                mood: this.validateMood(mood),
                energy: Math.max(0, Math.min(1, energy)),
                reasoning: 'Keyword-based analysis',
                source: 'fallback'
            };
        } catch (error) {
            console.error('Fallback analysis failed:', error);
            return this.getFallbackMood();
        }
    }

    validateMood(mood) {
        const validMoods = ['energetic', 'calm', 'melancholy', 'uplifting', 'neutral'];
        return validMoods.includes(mood) ? mood : 'neutral';
    }

    getFallbackMood() {
        return {
            mood: 'neutral',
            energy: 0.5,
            reasoning: 'Default fallback',
            source: 'default'
        };
    }

    async analyzeAlbumArt(imageUrl) {
        try {
            // Create cache key
            const cacheKey = imageUrl;
            
            if (this.colorCache.has(cacheKey)) {
                return this.colorCache.get(cacheKey);
            }

            if (!this.apiKey) {
                return this.fallbackColorAnalysis(imageUrl);
            }

            // Convert image to base64 for Vision API
            const base64Image = await this.imageUrlToBase64(imageUrl);
            
            const response = await fetch(`${this.visionUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: [{
                        image: {
                            content: base64Image
                        },
                        features: [
                            {
                                type: 'IMAGE_PROPERTIES',
                                maxResults: 10
                            }
                        ]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Vision API request failed: ${response.status}`);
            }

            const data = await response.json();
            const colors = this.parseVisionResponse(data);
            
            // Cache the result
            this.colorCache.set(cacheKey, colors);
            
            return colors;
        } catch (error) {
            console.warn('Album art color analysis failed, using fallback:', error);
            return this.fallbackColorAnalysis(imageUrl);
        }
    }

    parseVisionResponse(apiResponse) {
        try {
            const imageProperties = apiResponse.responses[0]?.imagePropertiesAnnotation;
            const dominantColors = imageProperties?.dominantColorsAnnotation?.colors || [];
            
            // Extract RGB values from dominant colors
            const colors = dominantColors.slice(0, 5).map(colorInfo => {
                const color = colorInfo.color;
                return [
                    Math.round(color.red || 0),
                    Math.round(color.green || 0),
                    Math.round(color.blue || 0)
                ];
            });
            
            return colors.length > 0 ? colors : this.getDefaultColors();
        } catch (error) {
            console.error('Failed to parse Vision API response:', error);
            return this.getDefaultColors();
        }
    }

    async imageUrlToBase64(url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1]; // Remove data:image/...;base64, prefix
                    resolve(base64);
                };
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Failed to convert image to base64:', error);
            throw error;
        }
    }

    fallbackColorAnalysis(imageUrl) {
        // Simple fallback: generate colors based on URL hash
        const hash = this.simpleHash(imageUrl);
        const colors = [];
        
        for (let i = 0; i < 5; i++) {
            const hue = ((hash + i * 73) % 360);
            const saturation = 60 + ((hash + i * 37) % 40);
            const lightness = 50 + ((hash + i * 23) % 30);
            
            colors.push(ColorUtils.hslToRgb(hue, saturation, lightness));
        }
        
        return colors;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    getDefaultColors() {
        return [
            [102, 126, 234], // Primary blue
            [118, 75, 162],  // Secondary purple
            [240, 147, 251], // Accent pink
            [34, 197, 94],   // Success green
            [249, 115, 22]   // Warning orange
        ];
    }

    // Main analysis function that combines mood and color analysis
    async analyzeTrack(metadata, albumArtUrl = null) {
        try {
            // Show loading state
            DOMUtils.showToast('Analyzing track with AI...', 'info', 2000);
            
            // Run mood analysis and color analysis in parallel
            const promises = [
                this.analyzeMood(metadata)
            ];
            
            if (albumArtUrl) {
                promises.push(this.analyzeAlbumArt(albumArtUrl));
            }
            
            const [moodAnalysis, colorPalette] = await Promise.all(promises);
            
            // Combine results
            const result = {
                mood: moodAnalysis.mood,
                energy: moodAnalysis.energy,
                reasoning: moodAnalysis.reasoning,
                source: moodAnalysis.source,
                colorPalette: colorPalette || ColorUtils.generateMoodPalette(moodAnalysis.mood, moodAnalysis.energy),
                timestamp: Date.now()
            };
            
            console.log('AI Analysis Result:', result);
            
            return result;
        } catch (error) {
            console.error('Track analysis failed:', error);
            DOMUtils.showToast('AI analysis failed, using defaults', 'warning');
            
            // Return safe defaults
            const fallbackMood = this.getFallbackMood();
            return {
                ...fallbackMood,
                colorPalette: ColorUtils.generateMoodPalette(fallbackMood.mood, fallbackMood.energy),
                timestamp: Date.now()
            };
        }
    }

    // Clear caches
    clearCache() {
        this.moodCache.clear();
        this.colorCache.clear();
    }

    // Get cache stats
    getCacheStats() {
        return {
            moodCacheSize: this.moodCache.size,
            colorCacheSize: this.colorCache.size
        };
    }
}