/**
 * Fondo animado con partículas y símbolos Pi para la aplicación BasicPi
 * Este archivo maneja la creación y animación del fondo morado con partículas flotantes
 * y símbolos de Pi
 */

class ParticleBackground {
    constructor(containerId = 'particles') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Error: No se encontró el contenedor con ID "${containerId}"`);
            return;
        }
        
        // Configuración
        this.particleCount = 15;
        this.piLogoCount = 5;
        this.primaryColor = '#8c52ff'; // Morado principal
        
        // Inicializar
        this.init();
    }
    
    /**
     * Inicializa el fondo de partículas y símbolos Pi
     */
    init() {
        this.createParticles();
        this.createPiLogos();
        console.log('Fondo de partículas inicializado');
    }
    
    /**
     * Crea partículas flotantes en el fondo
     */
    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Tamaño aleatorio
            const size = Math.random() * 10 + 5;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            
            // Posición aleatoria
            particle.style.left = Math.random() * 100 + 'vw';
            particle.style.top = Math.random() * 100 + 'vh';
            
            // Velocidad aleatoria
            const duration = Math.random() * 15 + 10;
            particle.style.animationDuration = duration + 's';
            
            // Retraso aleatorio
            particle.style.animationDelay = Math.random() * 5 + 's';
            
            // Color personalizado
            particle.style.backgroundColor = `${this.primaryColor}33`; // Con transparencia
            
            this.container.appendChild(particle);
        }
    }
    
    /**
     * Crea logos flotantes de Pi en el fondo
     */
    createPiLogos() {
        for (let i = 0; i < this.piLogoCount; i++) {
            const logo = document.createElement('div');
            logo.className = 'pi-logo';
            logo.textContent = 'π';
            
            // Posición aleatoria
            logo.style.left = Math.random() * 100 + 'vw';
            logo.style.top = Math.random() * 100 + 'vh';
            
            // Velocidad aleatoria
            const duration = Math.random() * 30 + 20;
            logo.style.animationDuration = duration + 's';
            
            // Retraso aleatorio
            logo.style.animationDelay = Math.random() * 5 + 's';
            
            // Tamaño aleatorio
            const fontSize = Math.random() * 30 + 30;
            logo.style.fontSize = `${fontSize}px`;
            
            // Color personalizado
            logo.style.color = `${this.primaryColor}1A`; // Con transparencia
            
            this.container.appendChild(logo);
        }
    }
    
    /**
     * Limpia todas las partículas y logos
     */
    clear() {
        if (!this.container) return;
        
        // Eliminar elementos con clase particle
        const particles = this.container.querySelectorAll('.particle');
        particles.forEach(particle => particle.remove());
        
        // Eliminar elementos con clase pi-logo
        const logos = this.container.querySelectorAll('.pi-logo');
        logos.forEach(logo => logo.remove());
        
        console.log('Fondo de partículas limpiado');
    }
    
    /**
     * Reinicia el fondo con nuevas partículas
     */
    reset() {
        this.clear();
        this.init();
    }
    
    /**
     * Cambia la densidad de partículas
     */
    setParticleDensity(count) {
        this.particleCount = count;
        this.reset();
    }
    
    /**
     * Cambia la cantidad de logos Pi
     */
    setPiLogoCount(count) {
        this.piLogoCount = count;
        this.reset();
    }
}

// Inicializa el fondo cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    // Crear instancia del fondo de partículas
    window.particleBackground = new ParticleBackground('particles');
});
