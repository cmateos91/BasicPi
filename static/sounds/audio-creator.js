/**
 * Este script genera archivos de sonido para el juego Simon Dice
 * 
 * Puedes ejecutar este código en un navegador que soporte la API Web Audio
 * y la API de descarga de archivos para crear los archivos MP3 necesarios,
 * o puedes usar cualquier herramienta de generación de sonido para crear
 * los archivos manualmente.
 * 
 * Los archivos necesarios son:
 * - green.mp3: Do (C4) - 261.63 Hz
 * - red.mp3: Mi (E4) - 329.63 Hz
 * - yellow.mp3: Sol (G4) - 392.00 Hz
 * - blue.mp3: Do (C5) - 523.25 Hz
 * - wrong.mp3: La (A2) - 110.00 Hz
 */

function generateTone(frequency, duration, fileName) {
    // Crear contexto de audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Crear oscilador
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine'; // Forma de onda sinusoidal para un tono puro
    oscillator.frequency.value = frequency; // Frecuencia en Hz
    
    // Crear nodo de ganancia para controlar el volumen
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.5; // 50% de volumen
    
    // Aplicar envelope (ADSR) para un sonido más natural
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01); // Attack
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.2); // Decay
    gainNode.gain.linearRampToValueAtTime(0.3, now + duration - 0.2); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release
    
    // Conectar oscilador a la salida de audio
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Iniciar y detener el oscilador
    oscillator.start();
    oscillator.stop(now + duration);
    
    // Para descargar el archivo, necesitaríamos convertir el audio a un archivo
    // Lo cual requiere código adicional y librería externa
    console.log(`Generando tono de ${frequency} Hz para ${fileName}`);
}

// Generar sonidos para el juego
function generateSimonSounds() {
    // Verde - Do (C4)
    generateTone(261.63, 1.0, 'green.mp3');
    
    // Rojo - Mi (E4)
    generateTone(329.63, 1.0, 'red.mp3');
    
    // Amarillo - Sol (G4)
    generateTone(392.00, 1.0, 'yellow.mp3');
    
    // Azul - Do (C5)
    generateTone(523.25, 1.0, 'blue.mp3');
    
    // Error - La (A2)
    generateTone(110.00, 1.0, 'wrong.mp3');
}

// Nota: Este script solo genera los tonos, no los descarga como archivos
// Para obtener los archivos MP3, usa una herramienta de generación de audio
// o crea un script más complejo que utilice MediaRecorder para grabar y descargar
