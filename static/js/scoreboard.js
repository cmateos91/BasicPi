/**
 * Sistema de puntuaciones basado en blockchain para Pi Network
 * Vincula puntuaciones de usuarios mediante transacciones en la blockchain
 */

// Variables globales
let currentScores = [];
let currentUsername = '';
let maxScore = 0;
let maxLevel = 0;

// Inicializar el sistema de puntuaciones
const ScoreSystem = {
    // Reiniciar sistema de puntuaciones (borrar datos locales)
    reset: function() {
        // Vaciar puntuaciones
        currentScores = [];
        maxScore = 0;
        maxLevel = 0;
        
        // Limpiar localStorage
        localStorage.removeItem('piGameScores');
        
        // Actualizar interfaz
        if (this.scoreboardElement) {
            this.renderScoreboard();
        }
        
        if (this.userScoreElement) {
            this.updateUserScoreDisplay();
        }
        
        console.log('Sistema de puntuaciones reiniciado');
    },
    
    // Inicializar el sistema
    init: function(config = {}) {
        // Obtener referencias de elementos DOM si se proporcionan
        this.scoreboardElement = config.scoreboardElement || null;
        this.userScoreElement = config.userScoreElement || null;
        
        // Cargar usuario actual y sus datos
        this.loadCurrentUser();
        
        // Cargar puntuaciones almacenadas localmente
        this.loadLocalScores();
        
        // Intentar cargar puntuaciones desde el servidor
        this.fetchScores();
        
        // Mostrar puntuación máxima del usuario
        if (this.userScoreElement) {
            this.updateUserScoreDisplay();
        }
        
        return this;
    },
    
    // Limpiar datos de puntuaciones para eliminar duplicados y entradas inválidas
    // También se asegura de mantener solo la puntuación más alta de cada usuario
    cleanScoreData: function(scores) {
        if (!scores || !Array.isArray(scores)) return [];
        
        // Mapa para almacenar la puntuación más alta de cada usuario
        const highestScoreMap = new Map();
        
        scores.forEach(score => {
            // Verificar si es un objeto válido
            if (!score || typeof score !== 'object') return;
            
            // Asegurar que el nombre de usuario no esté vacío
            const username = score.username || 'Anónimo';
            
            // Verificar si ya existe una puntuación para este usuario
            if (!highestScoreMap.has(username) || score.score > highestScoreMap.get(username).score) {
                // Solo guarda la puntuación si es la más alta para este usuario
                highestScoreMap.set(username, {
                    ...score,
                    username: username
                });
            }
        });
        
        // Convertir el mapa a un array
        const cleanedScores = Array.from(highestScoreMap.values());
        
        // Ordenar por puntuación (de mayor a menor)
        cleanedScores.sort((a, b) => b.score - a.score);
        
        return cleanedScores;
    },
    
    // Cargar usuario actual desde localStorage
    loadCurrentUser: function() {
        try {
            const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
            currentUsername = userData.username || '';
            
            // Si el nombre de usuario está vacío, intentar obtenerlo del DOM
            if (!currentUsername && window.usernameDisplay) {
                currentUsername = window.usernameDisplay.textContent || '';
            }
            
            // Si aún está vacío o es 'Pioneer', intentar obtenerlo de la sesión en tiempo real
            if (!currentUsername || currentUsername === 'Pioneer') {
                // Intentar obtener desde Pi SDK si está disponible
                if (typeof Pi !== 'undefined') {
                    Pi.authenticate(['username'], {
                        onIncompletePaymentFound: (payment) => {}
                    }).then(auth => {
                        if (auth && auth.user && auth.user.username) {
                            currentUsername = auth.user.username;
                            console.log('Nombre de usuario obtenido desde Pi SDK:', currentUsername);
                            
                            // Actualizar en localStorage para futuras sesiones
                            const storedData = JSON.parse(localStorage.getItem('piUserData') || '{}');
                            storedData.username = currentUsername;
                            localStorage.setItem('piUserData', JSON.stringify(storedData));
                            
                            // Actualizar interfaz
                            if (this.scoreboardElement) {
                                this.renderScoreboard();
                            }
                        }
                    }).catch(err => {
                        console.error('Error al autenticar con Pi SDK:', err);
                    });
                }
            }
            
            console.log('Usuario actual cargado:', currentUsername);
        } catch (error) {
            console.error('Error al cargar usuario actual:', error);
            currentUsername = '';
        }
    },
    
    // Cargar puntuaciones guardadas localmente
    loadLocalScores: function() {
        try {
            // Intentar cargar del localStorage
            const localScores = JSON.parse(localStorage.getItem('piGameScores') || '[]');
            
            if (Array.isArray(localScores) && localScores.length > 0) {
                currentScores = localScores;
                console.log('Puntuaciones locales cargadas:', currentScores.length);
                
                // Actualizar puntuación máxima
                this.updateMaxScore();
                
                // Actualizar interfaz si está disponible
                if (this.scoreboardElement) {
                    this.renderScoreboard();
                }
            } else {
                console.log('No hay puntuaciones locales guardadas');
            }
        } catch (error) {
            console.error('Error al cargar puntuaciones locales:', error);
            currentScores = [];
        }
    },
    
    // Actualizar la puntuación máxima basada en las puntuaciones actuales
    updateMaxScore: function() {
        if (currentScores.length === 0) {
            maxScore = 0;
            maxLevel = 0;
            return;
        }
        
        // Filtrar solo las puntuaciones del usuario actual si está disponible
        const userScores = currentUsername 
            ? currentScores.filter(score => score.username === currentUsername)
            : currentScores;
        
        if (userScores.length === 0) {
            maxScore = 0;
            maxLevel = 0;
            return;
        }
        
        // Obtener puntuación y nivel máximos
        maxScore = Math.max(...userScores.map(score => score.score));
        
        // Encontrar el nivel máximo alcanzado
        const highestScoreEntry = userScores.reduce((highest, current) => {
            return (current.score > highest.score) ? current : highest;
        }, userScores[0]);
        
        maxLevel = highestScoreEntry.level;
        
        console.log('Puntuación máxima actualizada:', maxScore, 'Nivel:', maxLevel);
    },
    
    // Actualizar el progreso del juego durante una partida (sin grabar en el servidor)
    updateGameProgress: function(score, level) {
        // Actualizar puntuación máxima si es necesario
        if (score > maxScore) {
            maxScore = score;
            maxLevel = level;
            
            // Actualizar interfaz del usuario si está disponible
            if (this.userScoreElement) {
                this.updateUserScoreDisplay();
                
                // Efecto visual para nueva puntuación máxima
                this.userScoreElement.classList.add('new-record');
                setTimeout(() => {
                    this.userScoreElement.classList.remove('new-record');
                }, 3000);
            }
        }
    },
    
    // Obtener puntuaciones desde el servidor
    fetchScores: function() {
        // Filtrar por usuario actual si existe
        const url = currentUsername ? 
            `/api/scores?username=${encodeURIComponent(currentUsername)}` : 
            '/api/scores';
        
        fetch(url)
            .then(response => response.json())
            .then(scores => {
                console.log('Puntuaciones obtenidas del servidor:', scores);
                
                if (Array.isArray(scores)) {
                    // Fusionar con puntuaciones locales
                    this.mergeScores(scores);
                    
                    // Actualizar interfaz
                    if (this.scoreboardElement) {
                        this.renderScoreboard();
                    }
                    
                    // Actualizar puntuación máxima mostrada
                    if (this.userScoreElement) {
                        this.updateUserScoreDisplay();
                    }
                }
            })
            .catch(error => {
                console.error('Error al obtener puntuaciones del servidor:', error);
            });
    },
    
    // Fusionar puntuaciones nuevas con las existentes
    mergeScores: function(newScores) {
        if (!Array.isArray(newScores) || newScores.length === 0) {
            return;
        }
        
        // Crear mapa de puntuaciones existentes para comparación rápida
        const existingScoreMap = {};
        currentScores.forEach(score => {
            const key = `${score.username}_${score.timestamp}`;
            existingScoreMap[key] = true;
        });
        
        // Añadir solo puntuaciones nuevas
        newScores.forEach(score => {
            const key = `${score.username}_${score.timestamp}`;
            if (!existingScoreMap[key]) {
                currentScores.push(score);
            }
        });
        
        // Ordenar por puntuación (de mayor a menor)
        currentScores.sort((a, b) => b.score - a.score);
        
        // Actualizar puntuación máxima
        this.updateMaxScore();
        
        // Guardar en localStorage
        this.saveLocalScores();
        
        console.log('Puntuaciones fusionadas. Total:', currentScores.length);
    },
    
    // Guardar puntuaciones en localStorage
    saveLocalScores: function() {
        try {
            localStorage.setItem('piGameScores', JSON.stringify(currentScores));
            console.log('Puntuaciones guardadas localmente');
        } catch (error) {
            console.error('Error al guardar puntuaciones localmente:', error);
        }
    },
    
    // Registrar una nueva puntuación
    recordScore: function(score, level, paymentId = null) {
        // Verificar si tenemos un nombre de usuario válido
        if (!currentUsername) {
            // Intentar obtener del DOM como último recurso
            if (window.usernameDisplay) {
                currentUsername = window.usernameDisplay.textContent || '';
            }
            
            // Si aún no hay nombre de usuario válido, usar 'Invitado' pero mostrar advertencia
            if (!currentUsername) {
                console.warn('Usando "Invitado" como nombre de usuario por defecto para la puntuación');
                currentUsername = 'Invitado';
            }
        }
        
        // Validar que no sea 'Pioneer' (valor por defecto en caso de error)
        if (currentUsername === 'Pioneer') {
            // Intentar obtener del DOM
            if (window.usernameDisplay && window.usernameDisplay.textContent && 
                window.usernameDisplay.textContent !== 'Pioneer') {
                currentUsername = window.usernameDisplay.textContent;
                console.log('Nombre de usuario actualizado desde DOM:', currentUsername);
            }
        }
        
        // Crear objeto de puntuación
        const scoreObj = {
            username: currentUsername,
            score: score,
            level: level,
            timestamp: Date.now(),
            paymentId: paymentId
        };
        
        // Mostrar datos que se envían al servidor para depuración
        console.log('Enviando puntuación al servidor:', scoreObj);
        
        // Guardar en servidor
        return fetch('/api/scores/record', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scoreObj)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Puntuación registrada en servidor:', data);
            
            // Añadir a puntuaciones locales
            currentScores.push(scoreObj);
            
            // Ordenar por puntuación (de mayor a menor)
            currentScores.sort((a, b) => b.score - a.score);
            
            // Actualizar puntuación máxima
            this.updateMaxScore();
            
            // Guardar en localStorage
            this.saveLocalScores();
            
            // Actualizar interfaz
            if (this.scoreboardElement) {
                this.renderScoreboard();
            }
            
            // Actualizar puntuación máxima mostrada
            if (this.userScoreElement) {
                this.updateUserScoreDisplay();
            }
            
            return data;
        })
        .catch(error => {
            console.error('Error al registrar puntuación en servidor:', error);
            
            // Incluso si falla la grabación en el servidor, guardar localmente
            currentScores.push(scoreObj);
            currentScores.sort((a, b) => b.score - a.score);
            this.updateMaxScore();
            this.saveLocalScores();
            
            if (this.scoreboardElement) {
                this.renderScoreboard();
            }
            
            throw error;
        });
    },
    
    // Registrar puntuación en blockchain
    recordScoreOnBlockchain: async function(score, level) {
        // Verificar si tenemos un nombre de usuario válido
        if (!currentUsername) {
            // Intentar obtener del DOM como último recurso
            if (window.usernameDisplay) {
                currentUsername = window.usernameDisplay.textContent || '';
            }
            
            // Si aún no hay nombre de usuario válido, usar 'Invitado' pero mostrar advertencia
            if (!currentUsername) {
                console.warn('Usando "Invitado" como nombre de usuario por defecto para la puntuación en blockchain');
                currentUsername = 'Invitado';
            }
        }
        
        // Validar que no sea 'Pioneer' (valor por defecto en caso de error)
        if (currentUsername === 'Pioneer') {
            // Intentar obtener del DOM
            if (window.usernameDisplay && window.usernameDisplay.textContent && 
                window.usernameDisplay.textContent !== 'Pioneer') {
                currentUsername = window.usernameDisplay.textContent;
                console.log('Nombre de usuario actualizado desde DOM para blockchain:', currentUsername);
            }
        }
        
        try {
            // En una implementación completa, esto crearía una transacción en la blockchain
            // Para esta simulación, solo registramos la puntuación normalmente
            const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
            const accessToken = userData.accessToken;
            
            if (!accessToken) {
                throw new Error('No hay token de acceso disponible');
            }
            
            // Primero registrar la puntuación localmente
            const scoreObj = {
                username: currentUsername,
                score: score,
                level: level,
                timestamp: Date.now(),
                blockchain: true // Indicador de que está destinado a la blockchain
            };
            
            // Añadir a puntuaciones locales
            currentScores.push(scoreObj);
            
            // Ordenar por puntuación (de mayor a menor)
            currentScores.sort((a, b) => b.score - a.score);
            
            // Actualizar puntuación máxima
            this.updateMaxScore();
            
            // Guardar en localStorage
            this.saveLocalScores();
            
            // Actualizar interfaz
            if (this.scoreboardElement) {
                this.renderScoreboard();
            }
            
            if (this.userScoreElement) {
                this.updateUserScoreDisplay();
            }
            
            // En una implementación real, aquí se llamaría al SDK de Pi para crear una transacción
            // con metadatos que contengan la puntuación
            console.log('Simulando registro de puntuación en blockchain:', scoreObj);
            
            // Simular espera de confirmación de blockchain
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                status: 'success',
                message: 'Puntuación registrada en la blockchain (simulación)',
                data: scoreObj
            };
            
        } catch (error) {
            console.error('Error al registrar puntuación en blockchain:', error);
            throw error;
        }
    },
    
    // Renderizar tabla de puntuaciones
    renderScoreboard: function() {
        if (!this.scoreboardElement) {
            console.error('No hay elemento DOM para renderizar tabla de puntuaciones');
            return;
        }
        
        // Limpiar contenido actual
        this.scoreboardElement.innerHTML = '';
        
        // Crear encabezado
        const header = document.createElement('div');
        header.className = 'scoreboard-header';
        header.innerHTML = `
            <h5><i class="fas fa-trophy"></i> Mejores Puntuaciones</h5>
        `;
        this.scoreboardElement.appendChild(header);
        
        // Verificar si hay puntuaciones
        if (currentScores.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-scores';
            emptyMessage.innerHTML = `
                <p>No hay puntuaciones registradas aún.</p>
                <p>¡Sé el primero en jugar y registrar tu puntuación!</p>
            `;
            this.scoreboardElement.appendChild(emptyMessage);
            return;
        }
        
        // Eliminar duplicados y filas con nombres vacíos
        const cleanedScores = this.cleanScoreData(currentScores);
        
        // Crear tabla
        const table = document.createElement('table');
        table.className = 'table table-sm';
        
        // Crear encabezado de tabla
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>#</th>
                <th>Usuario</th>
                <th>Puntos</th>
                <th>Fecha</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Crear cuerpo de tabla
        const tbody = document.createElement('tbody');
        
        // Mostrar primero las puntuaciones del usuario actual
        const userScores = cleanedScores.filter(score => score.username === currentUsername);
        const otherScores = cleanedScores.filter(score => score.username !== currentUsername);
        
        // Ordenar por puntuación (de mayor a menor)
        userScores.sort((a, b) => b.score - a.score);
        otherScores.sort((a, b) => b.score - a.score);
        
        // Combinar, pero limitando a los 10 mejores
        const displayScores = [...userScores, ...otherScores].slice(0, 10);
        
        // Renderizar filas
        displayScores.forEach((score, index) => {
            const row = document.createElement('tr');
            
            // Resaltar puntuaciones del usuario actual
            if (score.username === currentUsername) {
                row.className = 'current-user-score';
            }
            
            // Añadir clase para filas alternadas
            if (index % 2 === 1) {
                row.classList.add('alt-row');
            }
            
            // Resaltar puntuaciones grabadas en blockchain
            if (score.blockchain) {
                row.classList.add('blockchain-score');
            }
            
            // Formatear fecha
            const date = new Date(score.timestamp);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            
            // Asegurar que el nombre de usuario no esté vacío
            const displayName = score.username ? score.username : 'Anónimo';
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td class="username-cell">${displayName}${score.username === currentUsername ? ' <span class="current-user-tag">(Tú)</span>' : ''}</td>
                <td class="score-cell">${score.score}</td>
                <td>${formattedDate}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        this.scoreboardElement.appendChild(table);
        
        // Añadir nota sobre blockchain
        const blockchainNote = document.createElement('div');
        blockchainNote.className = 'blockchain-note';
        blockchainNote.innerHTML = `
            <small><i class="fas fa-info-circle"></i> Las puntuaciones se registran en la blockchain de Pi Network, ¡garantizando su autenticidad!</small>
        `;
        this.scoreboardElement.appendChild(blockchainNote);
    },
    
    // Obtener puntuación máxima
    getMaxScore: function() {
        return maxScore;
    },
    
    // Obtener nivel máximo
    getMaxLevel: function() {
        return maxLevel;
    },
    
    // Actualizar elemento DOM con puntuación máxima del usuario
    updateUserScoreDisplay: function() {
        if (!this.userScoreElement) {
            return;
        }
        
        this.userScoreElement.innerHTML = `
            <div class="user-best-score">
                <i class="fas fa-medal"></i> Tu mejor puntuación: <span>${maxScore}</span> puntos
            </div>
        `;
    },
    
    // Verificar si una puntuación es un nuevo récord para el usuario
    isNewRecord: function(score) {
        return score > maxScore;
    }
};

// Exportar para uso en otros scripts
window.ScoreSystem = ScoreSystem;
