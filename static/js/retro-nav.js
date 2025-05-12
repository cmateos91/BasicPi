/**
 * Sistema de navegación retro para Pi Network
 * Maneja la navegación entre las distintas secciones de la aplicación
 */

class RetroNav {
    constructor() {
        // Elementos principales
        this.mainSection = document.getElementById('main-section');
        this.scoresSection = document.getElementById('scores-section');
        this.fundsSection = document.getElementById('funds-section');
        
        // Botones de navegación
        this.scoresButton = document.getElementById('scores-button');
        this.fundsButton = document.getElementById('funds-button');
        this.backButtons = document.querySelectorAll('.back-button');
        
        // Contador retro
        this.amountDigits = {
            1: document.getElementById('amount-digit-1'),
            2: document.getElementById('amount-digit-2'),
            3: document.getElementById('amount-digit-3')
        };
        this.paymentsDigit = document.getElementById('payments-digit');
        this.updateDate = document.getElementById('update-date');
        
        // Elementos originales
        this.originalCounter = document.getElementById('payment-counter');
        this.originalScoreboard = document.querySelector('.scoreboard');
        this.retroScoreboard = document.getElementById('retro-scoreboard');
        
        // Estado actual
        this.currentSection = 'main';
        
        // Inicializar
        this.initialize();
    }
    
    // Inicializar el sistema
    initialize() {
        // Mostrar la sección principal por defecto
        this.showSection('main');
        
        // Configurar eventos de los botones
        this.setupEvents();
        
        // Inicializar el contador retro
        this.updateRetroCounter();
        
        // Inicializar la tabla de clasificación
        this.updateRetroScoreboard();
        
        console.log('Sistema de navegación retro inicializado');
    }
    
    // Configurar eventos de los botones
    setupEvents() {
        // Botón de puntuaciones
        if (this.scoresButton) {
            this.scoresButton.addEventListener('click', () => {
                this.navigateTo('scores');
            });
        }
        
        // Botón de fondos
        if (this.fundsButton) {
            this.fundsButton.addEventListener('click', () => {
                this.navigateTo('funds');
            });
        }
        
        // Botones de retroceso
        this.backButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.navigateTo('main');
            });
        });
        
        // Actualizar contador cuando cambie el original
        document.addEventListener('paymentCounterUpdated', (event) => {
            if (event.detail) {
                const { amount, payments, lastUpdate } = event.detail;
                this.updateRetroCounter(amount || 0, payments || 0, lastUpdate || '--');
            }
        });
        
        // Actualizar tabla cuando cambie la original
        document.addEventListener('scoreboardUpdated', () => {
            this.updateRetroScoreboard();
        });
    }
    
    // Navegar a una sección
    navigateTo(section) {
        // Definir las clases de animación según la navegación
        let outClass, inClass;
        
        if (this.currentSection === 'main') {
            // Si vamos desde main a otra sección
            outClass = 'slide-out-left';
            inClass = 'slide-in-right';
        } else {
            // Si volvemos a main desde otra sección
            outClass = 'slide-out-right';
            inClass = 'slide-in-left';
        }
        
        // Ocultar sección actual con animación
        const currentElement = this.getSectionElement(this.currentSection);
        if (currentElement) {
            currentElement.classList.remove('active');
            currentElement.classList.add(outClass);
            
            // Cuando termine la animación, actualizar las clases
            setTimeout(() => {
                currentElement.classList.remove(outClass);
                currentElement.style.display = 'none';
            }, 500);
        }
        
        // Mostrar nueva sección con animación
        const newElement = this.getSectionElement(section);
        if (newElement) {
            newElement.style.display = 'block';
            newElement.classList.add(inClass);
            
            // Cuando termine la animación, actualizar las clases
            setTimeout(() => {
                newElement.classList.remove(inClass);
                newElement.classList.add('active');
            }, 500);
        }
        
        // Actualizar botones activos
        this.updateActiveButtons(section);
        
        // Actualizar estado
        this.currentSection = section;
        
        console.log('Navegación a sección:', section);
    }
    
    // Mostrar una sección sin animación
    showSection(section) {
        // Ocultar todas las secciones
        this.hideAllSections();
        
        // Mostrar la sección solicitada
        const element = this.getSectionElement(section);
        if (element) {
            element.style.display = 'block';
            element.classList.add('active');
        }
        
        // Actualizar botones activos
        this.updateActiveButtons(section);
        
        // Actualizar estado
        this.currentSection = section;
    }
    
    // Ocultar todas las secciones
    hideAllSections() {
        if (this.mainSection) this.mainSection.style.display = 'none';
        if (this.scoresSection) this.scoresSection.style.display = 'none';
        if (this.fundsSection) this.fundsSection.style.display = 'none';
        
        if (this.mainSection) this.mainSection.classList.remove('active');
        if (this.scoresSection) this.scoresSection.classList.remove('active');
        if (this.fundsSection) this.fundsSection.classList.remove('active');
    }
    
    // Obtener el elemento de una sección
    getSectionElement(section) {
        switch (section) {
            case 'main': return this.mainSection;
            case 'scores': return this.scoresSection;
            case 'funds': return this.fundsSection;
            default: return null;
        }
    }
    
    // Actualizar los botones activos
    updateActiveButtons(section) {
        // Eliminar clase activa de todos los botones
        if (this.scoresButton) this.scoresButton.classList.remove('active');
        if (this.fundsButton) this.fundsButton.classList.remove('active');
        
        // Añadir clase activa al botón actual
        switch (section) {
            case 'scores':
                if (this.scoresButton) this.scoresButton.classList.add('active');
                break;
            case 'funds':
                if (this.fundsButton) this.fundsButton.classList.add('active');
                break;
        }
    }
    
    // Actualizar el contador retro con los datos del contador original
    updateRetroCounter(amount, payments, lastUpdate) {
        // Si no se proporcionan valores, obtenerlos del contador original
        if (amount === undefined || payments === undefined || lastUpdate === undefined) {
            if (this.originalCounter) {
                const amountElement = this.originalCounter.querySelector('.counter-item:first-child .value');
                const paymentsElement = this.originalCounter.querySelector('.counter-item:nth-child(2) .value');
                const updateElement = this.originalCounter.querySelector('.counter-item:nth-child(3) .value');
                
                if (amountElement && paymentsElement && updateElement) {
                    const amountStr = amountElement.textContent;
                    amount = parseFloat(amountStr) || 0;
                    
                    const paymentsStr = paymentsElement.textContent;
                    payments = parseInt(paymentsStr) || 0;
                    
                    lastUpdate = updateElement.textContent || '--';
                }
            }
        }
        
        // Actualizar los dígitos del monto
        this.updateAmountDigits(amount);
        
        // Actualizar el dígito de pagos
        if (this.paymentsDigit) {
            this.paymentsDigit.textContent = payments;
        }
        
        // Actualizar la fecha
        if (this.updateDate) {
            this.updateDate.textContent = lastUpdate;
        }
    }
    
    // Actualizar los dígitos del monto
    updateAmountDigits(amount) {
        if (!this.amountDigits) return;
        
        const amountStr = amount.toFixed(2).toString();
        let digitIndex = 0;
        
        for (let i = 0; i < amountStr.length; i++) {
            if (amountStr[i] !== '.') {
                const index = digitIndex + 1;
                if (this.amountDigits[index]) {
                    this.amountDigits[index].textContent = amountStr[i];
                }
                digitIndex++;
            }
        }
    }
    
    // Actualizar la tabla de clasificación retro
    updateRetroScoreboard() {
        if (!this.retroScoreboard || !this.originalScoreboard) {
            return;
        }
        
        const tbody = this.retroScoreboard.querySelector('tbody');
        if (!tbody) return;
        
        // Limpiar tabla actual
        tbody.innerHTML = '';
        
        // Obtener filas de la tabla original
        const originalRows = this.originalScoreboard.querySelectorAll('tbody tr');
        if (!originalRows || originalRows.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="2" style="text-align: center;">Sin puntuaciones</td>';
            tbody.appendChild(emptyRow);
            return;
        }
        
        // Obtener el nombre de usuario actual
        const currentUsername = document.getElementById('username-display');
        const username = currentUsername ? currentUsername.textContent : '';
        
        // Límite de filas a mostrar
        const maxRows = 5;
        let count = 0;
        
        // Recorrer filas originales y agregarlas a la tabla retro
        originalRows.forEach((row) => {
            if (count >= maxRows) return;
            
            const usernameCell = row.querySelector('td:first-child');
            const scoreCell = row.querySelector('td:nth-child(2)');
            
            if (usernameCell && scoreCell) {
                const rowUsername = usernameCell.textContent.trim();
                const rowScore = scoreCell.textContent.trim();
                
                const newRow = document.createElement('tr');
                if (rowUsername === username) {
                    newRow.classList.add('current-user-row');
                }
                
                newRow.innerHTML = `
                    <td class="username-cell">${rowUsername}</td>
                    <td class="score-cell">${rowScore}</td>
                `;
                
                tbody.appendChild(newRow);
                count++;
            }
        });
    }
}

// Inicializar la navegación retro cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para asegurarse de que otros scripts han cargado
    setTimeout(() => {
        const retroNav = new RetroNav();
    }, 500);
});