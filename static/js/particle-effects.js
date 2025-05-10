/**
 * Efectos de partículas y animaciones para el juego Simon Dice
 */

class ParticleSystem {
    constructor(container) {
        this.container = container;
        this.particles = [];
    }
    
    // Crear explosión de partículas
    createExplosion(x, y, color, count = 15, spread = 100) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.width = Math.random() * 8 + 2 + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = color;
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            
            // Dirección aleatoria
            const tx = (Math.random() - 0.5) * spread;
            const ty = (Math.random() - 0.5) * spread;
            particle.style.setProperty('--tx', tx + 'px');
            particle.style.setProperty('--ty', ty + 'px');
            
            this.container.appendChild(particle);
            this.particles.push({
                element: particle,
                removeTime: Date.now() + 1000
            });
        }
        
        // Programar limpieza
        setTimeout(() => this.cleanParticles(), 1000);
    }
    
    // Limpiar partículas antiguas
    cleanParticles() {
        const now = Date.now();
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (now >= this.particles[i].removeTime) {
                this.particles[i].element.remove();
                this.particles.splice(i, 1);
            }
        }
    }
    
    // Crear partículas de rastro que siguen al cursor
    createTrail(x, y, color) {
        const particle = document.createElement('div');
        particle.className = 'trail-particle';
        particle.style.width = '5px';
        particle.style.height = '5px';
        particle.style.background = color;
        particle.style.borderRadius = '50%';
        particle.style.position = 'absolute';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.pointerEvents = 'none';
        particle.style.opacity = '0.7';
        particle.style.zIndex = '1000';
        
        // Animación de desvanecimiento
        particle.style.animation = 'fadeOut 1s forwards';
        particle.style.animationTimingFunction = 'ease-out';
        
        this.container.appendChild(particle);
        this.particles.push({
            element: particle,
            removeTime: Date.now() + 1000
        });
        
        // Programar limpieza
        setTimeout(() => this.cleanParticles(), 1000);
    }
}

// Crear animación CSS para el desvanecimiento
function createAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            0% { transform: scale(1); opacity: 0.7; }
            100% { transform: scale(0); opacity: 0; }
        }
        
        .trail-particle {
            animation: fadeOut 1s forwards;
        }
    `;
    document.head.appendChild(style);
}

// Inicializar efectos cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    createAnimationStyles();
    
    // Inicializar sistema de partículas
    const particleSystem = new ParticleSystem(document.body);
    
    // Seguimiento del cursor para partículas de rastro
    let cursorTrailEnabled = false;
    let trailColor = '#8c52ff';
    let trailInterval;
    
    // Añadir evento para activar/desactivar rastro con tecla 'T'
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 't') {
            cursorTrailEnabled = !cursorTrailEnabled;
            
            if (cursorTrailEnabled) {
                trailInterval = setInterval(() => {
                    trailColor = `hsl(${Math.random() * 360}, 80%, 60%)`;
                }, 1000);
            } else {
                clearInterval(trailInterval);
            }
        }
    });
    
    // Crear partículas al mover el ratón
    document.addEventListener('mousemove', (e) => {
        if (cursorTrailEnabled) {
            particleSystem.createTrail(e.clientX, e.clientY, trailColor);
        }
    });
    
    // Exportar particleSystem para uso en otros scripts
    window.particleSystem = particleSystem;
});
