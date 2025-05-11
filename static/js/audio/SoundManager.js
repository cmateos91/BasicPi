/**
 * SoundManager.js
 * Manages sound effects in the Pi Network Simon game using the Web Audio API.
 * Uses a single sound file (green.wav) with pitch variations for all buttons.
 */

class SoundManager {
    constructor() {
        // Create audio context
        this.audioContext = null;
        this.sounds = {};
        this.initialized = false;
        this.baseSoundPath = '/static/sounds/green.wav';
        this.soundBuffer = null;
        
        // Define pitch ratios for different buttons/sounds
        this.pitchMap = {
            green: 1.0,         // Original pitch
            red: 1.25,          // Perfect fourth higher
            yellow: 1.5,        // Perfect fifth higher 
            blue: 2.0,          // Octave higher
            wrong: 0.5,         // Octave lower
            success: 1.33       // Major third higher
        };
        
        // Initialize on first user interaction
        this.setupInitialization();
    }
    
    /**
     * Sets up event listeners to initialize audio after user interaction
     */
    setupInitialization() {
        const initFunction = () => {
            if (!this.initialized) {
                this.init();
                
                // Remove event listeners once initialized
                document.removeEventListener('click', initFunction);
                document.removeEventListener('touchstart', initFunction);
                document.removeEventListener('keydown', initFunction);
            }
        };
        
        // Add event listeners for common user interactions
        document.addEventListener('click', initFunction);
        document.addEventListener('touchstart', initFunction);
        document.addEventListener('keydown', initFunction);
    }
    
    /**
     * Initialize the audio context and load the base sound
     */
    async init() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load the base sound file
            await this.loadBaseSound();
            
            this.initialized = true;
            console.log('SoundManager initialized successfully');
        } catch (error) {
            console.error('Error initializing SoundManager:', error);
            this.fallbackToDefaultSounds();
        }
    }
    
    /**
     * Loads the base sound file (green.wav) that will be used for all sounds
     */
    async loadBaseSound() {
        try {
            const response = await fetch(this.baseSoundPath);
            const arrayBuffer = await response.arrayBuffer();
            this.soundBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log('Base sound loaded successfully');
        } catch (error) {
            console.error('Error loading base sound:', error);
            throw error;
        }
    }
    
    /**
     * Play sound with pitch adjustment based on the color/type
     * @param {string} type - The type/color of sound to play ('green', 'red', etc.)
     * @param {number} volume - Volume level from 0 to 1
     */
    playSound(type, volume = 0.6) {
        if (!this.initialized) {
            this.init().then(() => this.playSound(type, volume));
            return;
        }
        
        try {
            if (!this.soundBuffer) {
                console.warn('Sound buffer not loaded yet, trying to load');
                this.loadBaseSound().then(() => this.playSound(type, volume));
                return;
            }
            
            // Get the pitch ratio for the specified type
            const pitchRatio = this.pitchMap[type] || 1.0;
            
            // Create source node from buffer
            const source = this.audioContext.createBufferSource();
            source.buffer = this.soundBuffer;
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = volume;
            
            // Set the playback rate (pitch)
            source.playbackRate.value = pitchRatio;
            
            // Connect nodes: source -> gain -> destination
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Play the sound
            source.start(0);
            
            // Add some visual feedback
            this.visualizeSoundPlay(type);
            
            return source;
        } catch (error) {
            console.error(`Error playing sound (${type}):`, error);
            this.playFallbackSound(type);
        }
    }
    
    /**
     * Provides visual feedback when a sound is played
     * @param {string} type - The type/color of sound being played
     */
    visualizeSoundPlay(type) {
        // Optional: Add a small visual indicator when sounds play
        const visualFeedback = document.createElement('div');
        visualFeedback.className = 'sound-visual-feedback';
        visualFeedback.style.position = 'fixed';
        visualFeedback.style.bottom = '10px';
        visualFeedback.style.right = '10px';
        visualFeedback.style.width = '10px';
        visualFeedback.style.height = '10px';
        visualFeedback.style.borderRadius = '50%';
        visualFeedback.style.backgroundColor = type;
        visualFeedback.style.boxShadow = `0 0 10px ${type}`;
        visualFeedback.style.zIndex = '9999';
        visualFeedback.style.opacity = '0.8';
        visualFeedback.style.transition = 'transform 0.1s, opacity 0.3s';
        
        document.body.appendChild(visualFeedback);
        
        // Animate and remove
        setTimeout(() => {
            visualFeedback.style.transform = 'scale(1.5)';
            visualFeedback.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(visualFeedback);
            }, 300);
        }, 10);
    }
    
    /**
     * Fallback method to generate sounds if the audio file fails to load
     * @param {string} type - The type/color of sound to play
     */
    playFallbackSound(type) {
        try {
            // Create a new audio context if needed
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Create oscillator
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Set frequency based on type
            switch (type) {
                case 'green': oscillator.frequency.value = 261.63; break; // C4
                case 'red': oscillator.frequency.value = 329.63; break;   // E4
                case 'yellow': oscillator.frequency.value = 392.00; break; // G4
                case 'blue': oscillator.frequency.value = 523.25; break;  // C5
                case 'wrong': oscillator.frequency.value = 110.00; break; // A2
                case 'success': oscillator.frequency.value = 349.23; break; // F4
                default: oscillator.frequency.value = 261.63; // C4
            }
            
            // Connect and play
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Short decay
            gainNode.gain.value = 0.5;
            oscillator.start();
            
            // Stop after 300ms
            setTimeout(() => {
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                setTimeout(() => {
                    oscillator.stop();
                }, 100);
            }, 200);
            
        } catch (error) {
            console.error('Error in fallback sound:', error);
        }
    }
    
    /**
     * Fall back to using default sounds if initialization fails
     */
    fallbackToDefaultSounds() {
        console.warn('Falling back to default sound mechanism');
        // Existing mechanism will take over
    }
    
    /**
     * Plays a success sequence with ascending pitches
     */
    playSuccessSequence() {
        if (!this.initialized) {
            this.init().then(() => this.playSuccessSequence());
            return;
        }
        
        const pitches = [1.0, 1.25, 1.5, 2.0]; // Ascending pitches
        let delay = 0;
        
        pitches.forEach((pitch, index) => {
            setTimeout(() => {
                try {
                    const source = this.audioContext.createBufferSource();
                    source.buffer = this.soundBuffer;
                    
                    const gainNode = this.audioContext.createGain();
                    gainNode.gain.value = 0.5;
                    
                    source.playbackRate.value = pitch;
                    source.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    source.start(0);
                } catch (error) {
                    console.error('Error playing success sequence:', error);
                }
            }, delay);
            
            delay += 150; // 150ms between notes
        });
    }
    
    /**
     * Plays a game over sequence with descending pitches
     */
    playGameOverSequence() {
        if (!this.initialized) {
            this.init().then(() => this.playGameOverSequence());
            return;
        }
        
        const pitches = [1.5, 1.0, 0.75, 0.5]; // Descending pitches
        let delay = 0;
        
        pitches.forEach((pitch, index) => {
            setTimeout(() => {
                try {
                    const source = this.audioContext.createBufferSource();
                    source.buffer = this.soundBuffer;
                    
                    const gainNode = this.audioContext.createGain();
                    gainNode.gain.value = 0.5;
                    
                    source.playbackRate.value = pitch;
                    source.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    source.start(0);
                } catch (error) {
                    console.error('Error playing game over sequence:', error);
                }
            }, delay);
            
            delay += 150; // 150ms between notes
        });
    }
}

// Create global instance
window.SoundManager = new SoundManager();
