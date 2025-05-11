document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el SDK de Pi Network
    if (typeof Pi === 'undefined') {
        console.error('Pi SDK no está cargado correctamente');
        alert('Error: No se pudo cargar el SDK de Pi Network. Por favor, intenta de nuevo.');
        return;
    }
    
    Pi.init({
        version: "2.0",
        sandbox: true
    });
    
    // Variables para control de autenticación
    let authPrimaryComplete = false;
    let authSecondaryPending = true; // Indica si todavía debe mostrarse el diálogo secundario
    let savedUsername = null; // Guardar el nombre de usuario de la primera autenticación

    // Elementos del DOM
    const greenBtn = document.getElementById('green');
    const redBtn = document.getElementById('red');
    const yellowBtn = document.getElementById('yellow');
    const blueBtn = document.getElementById('blue');
    const startBtn = document.getElementById('start-button');
    const scoreDisplay = document.getElementById('score');
    const usernameDisplay = document.getElementById('username-display');
    const balanceDisplay = document.getElementById('balance-display');
    const recordsDisplay = document.getElementById('records-display');
    const logoutButton = document.getElementById('logout-button');
    const donationButton = document.getElementById('donation-button');
    const paymentResult = document.getElementById('paymentResult');
    const paymentStatus = document.getElementById('paymentStatus');
    const txidDisplay = document.getElementById('txid');
    const simonBoard = document.getElementById('simon-board');
    
    // Asegurarse de que los elementos existan antes de usarlos
    if (!usernameDisplay) {
        console.error('Elemento username-display no encontrado');
    } else {
        console.log('Elemento username-display encontrado:', usernameDisplay);
    }
    
    if (!balanceDisplay) {
        console.error('Elemento balance-display no encontrado');
    } else {
        console.log('Elemento balance-display encontrado:', balanceDisplay);
    }
    
    if (!recordsDisplay) {
        console.error('Elemento records-display no encontrado');
    } else {
        console.log('Elemento records-display encontrado:', recordsDisplay);
    }
    
    // Variable para contener función de actualización de puntuaciones blockchain
    let recordScoreOnBlockchain = null;
    
    // Exportar elementos importantes para acceso global
    window.usernameDisplay = usernameDisplay;
    window.balanceDisplay = balanceDisplay;
    window.recordsDisplay = recordsDisplay;
    
    // Variables del juego
    const buttons = [greenBtn, redBtn, yellowBtn, blueBtn];
    const buttonColors = ['green', 'red', 'yellow', 'blue'];
    let gamePattern = [];
    let userPattern = [];
    let level = 0;
    let score = 0;
    let isPlaying = false;
    let isGameOver = false;
    let maxLevel = 0; // Nivel máximo alcanzado
    
    // Cargar sonidos (usando SoundManager)
    // Ahora todos los sonidos se generan desde green.wav con diferentes tonos

    // Función para emitir sonido usando SoundManager
    function playSound(color) {
        // Use the global SoundManager if available, otherwise fallback to default
        if (window.SoundManager) {
            window.SoundManager.playSound(color);
        } else {
            // Fallback to simple audio playback if SoundManager isn't loaded
            console.warn('SoundManager not found, using fallback sound');
            try {
                // Create a simple oscillator-based sound
                const context = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();
                
                // Configurar frecuencia según el color
                if (color === 'green') oscillator.frequency.value = 261.63; // Do (C4)
                if (color === 'red') oscillator.frequency.value = 329.63; // Mi (E4)
                if (color === 'yellow') oscillator.frequency.value = 392.00; // Sol (G4)
                if (color === 'blue') oscillator.frequency.value = 523.25; // Do (C5)
                if (color === 'wrong') oscillator.frequency.value = 110.00; // La (A2)
                if (color === 'success') {
                    // Simple success tone
                    oscillator.frequency.value = 349.23; // F4
                }
                
                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                
                // Reproducir sonido brevemente
                gainNode.gain.value = 0.5;
                oscillator.start();
                setTimeout(() => {
                    oscillator.stop();
                }, 300);
            } catch (error) {
                console.error('Error al reproducir sonido fallback:', error);
            }
        }
    }
    
    // Función para crear partículas
    function createParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.width = Math.random() * 8 + 2 + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = color;
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            
            // Dirección aleatoria
            const tx = (Math.random() - 0.5) * 100;
            const ty = (Math.random() - 0.5) * 100;
            particle.style.setProperty('--tx', tx + 'px');
            particle.style.setProperty('--ty', ty + 'px');
            
            document.body.appendChild(particle);
            
            // Eliminar después de la animación
            setTimeout(() => {
                particle.remove();
            }, 1000);
        }
    }
    
    // Función para iluminar botón
    function animateButton(button, color) {
        // Coordenadas para partículas en botón correcto
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        button.classList.add('active');
        playSound(color);
        
        setTimeout(() => {
            button.classList.remove('active');
        }, 300);
    }
    
    // Función para mostrar secuencia
    async function showSequence() {
        // Desactivar botones durante la secuencia
        buttons.forEach(btn => {
            btn.style.pointerEvents = 'none';
        });
        
        // Mostrar secuencia
        for (let i = 0; i < gamePattern.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 600 - Math.min(level * 20, 300))); // Velocidad aumenta con el nivel
            const color = gamePattern[i];
            const button = buttons[buttonColors.indexOf(color)];
            animateButton(button, color);
        }
        
        // Breve pausa antes de permitir la entrada del usuario
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Reactivar botones después de la secuencia
        buttons.forEach(btn => {
            btn.style.pointerEvents = 'auto';
        });
    }
    
    // Función para añadir nuevo color a la secuencia
    function nextSequence() {
        userPattern = [];
        level++;
        
        // Actualizar nivel máximo
        if (level > maxLevel) {
            maxLevel = level;
            // Podría guardarse en el servidor para un sistema de puntuaciones
        }
        
        const randomIndex = Math.floor(Math.random() * 4);
        const randomColor = buttonColors[randomIndex];
        gamePattern.push(randomColor);
        
        // No actualizamos la puntuación aquí, se hace cuando se completa correctamente una secuencia
        
        // Resetear correctamente el nivel, asegurándonos de que la puntuación sea 0
        PaymentSystem.setScore(score);
        PaymentSystem.setLevel(level);
        
        showSequence();
    }
    
    // Verificar respuesta del usuario
    function checkAnswer(currentLevel) {
        // Coordenadas para partículas en el centro del tablero
        const rect = simonBoard.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        if (userPattern[currentLevel] === gamePattern[currentLevel]) {
            // Respuesta correcta
            if (userPattern.length === gamePattern.length) {
                // Secuencia completa - efectos de celebración
                simonBoard.classList.add('celebrate');
                createParticles(centerX, centerY, '#8c52ff', 30, 150); // Más partículas y mayor dispersión para celebración
                setTimeout(() => {
                    simonBoard.classList.remove('celebrate');
                }, 500);
                
                // Reproducir sonido de éxito - secuencia especial
                if (window.SoundManager) {
                    window.SoundManager.playSuccessSequence();
                } else {
                    playSound('success');
                }
                
                // Actualizar la puntuación inmediatamente cuando se completa una secuencia
                score = level;
                scoreDisplay.textContent = score.toString();
                
                // Actualizar score en sistema de pagos
                PaymentSystem.setScore(score);
                PaymentSystem.setLevel(level);
                
                // Actualizar sistema de puntuaciones
                if (window.ScoreSystem) {
                    // Registrar puntuación actual para actualizaciones en tiempo real
                    window.ScoreSystem.updateGameProgress(score, level);
                }
                
                setTimeout(() => {
                    nextSequence();
                }, 1000);
            }
        } else {
            // Respuesta incorrecta - secuencia especial para game over
            if (window.SoundManager) {
                window.SoundManager.playGameOverSequence();
            } else {
                playSound('wrong');
            }
            isGameOver = true;
            
            // Efecto visual de game over
            document.body.classList.add('game-over');
            simonBoard.style.opacity = '0.5';
            buttons.forEach(btn => btn.style.pointerEvents = 'none');
            
            setTimeout(() => {
                document.body.classList.remove('game-over');
                simonBoard.style.opacity = '1';
            }, 1500);
            
            // Actualizar estado de juego en PaymentSystem cuando pierde
            PaymentSystem.updateGameData({
                score: score,
                level: level,
                lost: true
            });

            // Mensaje personalizado según el nivel alcanzado
            let message = '¡Juego terminado! ';
            
            if (level <= 3) {
                message += 'Apenas estás empezando. ¡Sigue practicando!';
            } else if (level <= 7) {
                message += '¡Buen intento! Estás mejorando tus habilidades.';
            } else if (level <= 12) {
                message += '¡Impresionante! Tu memoria es excelente.';
            } else {
                message += '¡WOW! Eres un maestro del Simon Dice.';
            }
            
            message += `\nLlegaste al nivel ${level}, superando ${score} rondas.\n\n¿Quieres jugar de nuevo?`;
            
            // Registrar puntuación final en el sistema
            if (window.ScoreSystem) {
                window.ScoreSystem.recordScore(score, level)
                    .then(() => {
                        console.log('Puntuación registrada con éxito');
                    })
                    .catch(err => {
                        console.error('Error al registrar puntuación:', err);
                    });
            }
            
            // Mostrar mensaje de game over con pequeña demora
            setTimeout(() => {
                if (confirm(message)) {
                    resetGame();
                    // Reiniciar juego después de una breve pausa
                    setTimeout(() => {
                        isPlaying = true;
                        startBtn.style.display = 'none';
                        document.querySelector('.controls-title').style.display = 'none';
                        nextSequence();
                    }, 500);
                } else {
                    resetGame();
                }
            }, 500);
        }
    }
    
    // Función para reiniciar juego
    function resetGame() {
        gamePattern = [];
        userPattern = [];
        level = 0;
        score = 0;
        isPlaying = false;
        isGameOver = false;
        scoreDisplay.textContent = '0';
        startBtn.style.display = 'block';
        document.querySelector('.controls-title').style.display = 'block';
        buttons.forEach(btn => btn.style.pointerEvents = 'auto');
        
        // Actualizar datos en el sistema de pagos
        PaymentSystem.setScore(0);
        PaymentSystem.setLevel(0);
    }
    
    // Event listeners para botones de colores
    buttons.forEach((button, index) => {
        button.addEventListener('click', function() {
            if (!isPlaying || isGameOver) return;
            
            const color = buttonColors[index];
            userPattern.push(color);
            
            // Efectos visuales en el botón
            animateButton(button, color);
            
            // Añadir partículas en el botón
            const rect = button.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Color de partículas según el botón
            let particleColor;
            if (color === 'green') particleColor = '#00e676';
            if (color === 'red') particleColor = '#ff1744';
            if (color === 'yellow') particleColor = '#ffea00';
            if (color === 'blue') particleColor = '#2979ff';
            
            createParticles(centerX, centerY, particleColor);
            
            // Verificar respuesta
            checkAnswer(userPattern.length - 1);
        });
    });
    
    // Event listener para botón de inicio
    startBtn.addEventListener('click', function() {
        if (isGameOver) {
            resetGame();
            isGameOver = false;
        }
        
        if (!isPlaying) {
            isPlaying = true;
            startBtn.style.display = 'none';
            document.querySelector('.controls-title').style.display = 'none';
            nextSequence();
        } else {
            resetGame();
        }
    });
    
    // Event listener para botón de cierre de sesión
    logoutButton.addEventListener('click', function() {
        // Eliminar datos de sesión
        localStorage.removeItem('piUserData');
        window.location.href = '/';
    });
    
    // Inicializar el sistema de pagos
    PaymentSystem.init({
        accessToken: null, // Se establecerá durante la autenticación
        paymentStatus: paymentStatus,
        txidDisplay: txidDisplay,
        paymentResult: paymentResult,
        donationButton: donationButton,
        simonBoard: simonBoard,
        scoreDisplay: scoreDisplay,
        recordsDisplay: recordsDisplay,
        createParticles: createParticles
    });
    
    // Inicializar el sistema de puntuaciones
    if (window.ScoreSystem) {
        window.ScoreSystem.init({
            scoreboardElement: document.getElementById('scoreboard'),
            userScoreElement: document.getElementById('user-best-score')
        });
        
        // Guardar referencia a la función de registro en blockchain
        recordScoreOnBlockchain = window.ScoreSystem.recordScoreOnBlockchain.bind(window.ScoreSystem);
    }
    
    // Verificar autenticación al cargar la página y configurar el sistema de pagos
    async function initGame() {
        try {
            // Reiniciar el SDK de Pi para asegurar un estado limpio
            Pi.init({ version: "2.0", sandbox: true });
            
            // Configurar los permisos que necesitamos
            const scopes = ['payments'];
            
            // Función para manejar pagos incompletos (pasada directamente, no como método de objeto)
            function handleIncompletePayment(payment) {
                console.log('Pago incompleto encontrado en autenticación:', payment);
                PaymentSystem.handleIncompletePayment(payment);
            }
            
            // Autenticar manualmente
            try {
                const auth = await Pi.authenticate(scopes, handleIncompletePayment);
                
                // Verificar si auth y auth.user están definidos
                if (!auth || !auth.user) {
                    throw new Error('Autenticación incompleta - datos de usuario no disponibles');
                }
                
                // Marcar la autenticación primaria como completada
                authPrimaryComplete = true;
                
                // Guardar el nombre de usuario para usarlo en la segunda autenticación
                if (auth.user && auth.user.username) {
                    savedUsername = auth.user.username;
                    console.log('Nombre de usuario guardado de primera autenticación:', savedUsername);
                }
                
                // Almacenar el token para los pagos
                PaymentSystem.setAccessToken(auth.accessToken);
                
                // Mostrar datos del usuario en la interfaz
                if (usernameDisplay && auth.user && auth.user.username) {
                    usernameDisplay.textContent = auth.user.username;
                }
                
                // Guardar datos del usuario en localStorage para persistencia
                try {
                    const userData = {
                        username: auth.user.username,
                        accessToken: auth.accessToken
                    };
                    localStorage.setItem('piUserData', JSON.stringify(userData));
                } catch (storageError) {
                    console.warn('No se pudieron guardar datos en localStorage:', storageError);
                }
                
                console.log('Autenticación completada:', auth.user.username);
                
                // Obtener información adicional del usuario si es necesario
                try {
                    const walletInfo = await PaymentSystem.getWalletInfo(auth.accessToken);
                    if (balanceDisplay && walletInfo && walletInfo.balance) {
                        balanceDisplay.textContent = walletInfo.balance;
                    }
                } catch (walletError) {
                    console.warn('Error al obtener información de wallet:', walletError);
                }
                
                // Verificar pagos pendientes adicionales
                PaymentSystem.checkPendingPayments();
            } catch (authError) {
                console.error('Error en autenticación inicial:', authError);
                
                // Intentar cargar datos de sesión existentes
                const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
                if (userData && userData.accessToken) {
                    PaymentSystem.setAccessToken(userData.accessToken);
                    console.log('Usando token de sesión existente');
                    
                    // Mostrar datos del usuario desde localStorage
                    if (usernameDisplay && userData.username) {
                        usernameDisplay.textContent = userData.username;
                    }
                    
                    if (balanceDisplay && userData.balance) {
                        balanceDisplay.textContent = userData.balance;
                    } else {
                        // Intentar obtener balance si no está guardado
                        try {
                            const walletInfo = await PaymentSystem.getWalletInfo(userData.accessToken);
                            if (balanceDisplay && walletInfo && walletInfo.balance) {
                                balanceDisplay.textContent = walletInfo.balance;
                                
                                // Actualizar localStorage con el balance
                                userData.balance = walletInfo.balance;
                                localStorage.setItem('piUserData', JSON.stringify(userData));
                            }
                        } catch (walletError) {
                            console.warn('Error al obtener información de wallet con token guardado:', walletError);
                        }
                    }
                }
            }
            
            // Forzar cancelación de pagos pendientes si hay problemas
            if (window.location.search.includes('force_cancel=true')) {
                console.log('Forzando cancelación de pagos pendientes por parámetro URL');
                setTimeout(() => {
                    PaymentSystem.forcePaymentCancellation();
                }, 1000);
            }
            
            // Todo listo para iniciar el juego
            
            // SOLUCIÓN PARA DOBLE AUTENTICACIÓN: Usar nombre guardado o intentar varias fuentes
            console.log('Estableciendo nombre de usuario de manera confiable:');
            
            try {
                // Prioridad 1: Usar el nombre guardado de la primera autenticación
                if (savedUsername) {
                    usernameDisplay.textContent = savedUsername;
                    console.log('Nombre de usuario establecido desde primera autenticación:', savedUsername);
                    
                    // Bloquear para evitar sobrescrituras
                    usernameDisplay.dataset.usernameLocked = 'true';
                    
                    // Guardar en almacenamiento
                    try {
                        const userData = {
                            username: savedUsername,
                            accessToken: auth ? auth.accessToken : null
                        };
                        localStorage.setItem('piUserData', JSON.stringify(userData));
                        sessionStorage.setItem('piUserData', JSON.stringify(userData));
                        console.log('Datos de usuario guardados con nombre de primera autenticación');
                    } catch (storageError) {
                        console.warn('Error al guardar datos con nombre de primera autenticación:', storageError);
                    }
                    
                    return;
                }
                
                // Obtener el nombre de usuario directamente
                // Intento 1: Desde sessionStorage
                const sessionData = JSON.parse(sessionStorage.getItem('piUserData') || '{}');
                if (sessionData && sessionData.username) {
                    if (usernameDisplay) {
                        usernameDisplay.textContent = sessionData.username;
                        console.log('Nombre de usuario establecido desde sessionStorage:', sessionData.username);
                        usernameDisplay.dataset.usernameLocked = 'true'; // Bloquear para evitar cambios
                    }
                }
                
                // Intento 2: Desde localStorage
                if (!usernameDisplay.dataset.usernameLocked) {
                    const localData = JSON.parse(localStorage.getItem('piUserData') || '{}');
                    if (localData && localData.username) {
                        if (usernameDisplay) {
                            usernameDisplay.textContent = localData.username;
                            console.log('Nombre de usuario establecido desde localStorage:', localData.username);
                            usernameDisplay.dataset.usernameLocked = 'true'; // Bloquear para evitar cambios
                        }
                    }
                }
                
                // Intento 3: Si aún no hay nombre, intentar obtenerlo de la autenticación
                if (!usernameDisplay.dataset.usernameLocked && auth && auth.user && auth.user.username) {
                    usernameDisplay.textContent = auth.user.username;
                    console.log('Nombre de usuario establecido desde auth:', auth.user.username);
                    usernameDisplay.dataset.usernameLocked = 'true'; // Bloquear para evitar cambios
                }
                
                // Intento 4: Establecer un valor por defecto si todo lo demás falla
                if (!usernameDisplay.dataset.usernameLocked) {
                    usernameDisplay.textContent = 'Pioneer';
                    console.log('Establecido nombre de usuario por defecto: Pioneer');
                }
            } catch (userError) {
                console.error('Error al intentar establecer nombre de usuario:', userError);
                // Establecer un valor por defecto si hay un error
                if (usernameDisplay && !usernameDisplay.dataset.usernameLocked) {
                    usernameDisplay.textContent = 'Pioneer';
                    console.log('Establecido nombre de usuario por defecto debido a error');
                }
            }
        } catch (error) {
            console.error('Error al inicializar el juego:', error);
            alert('Error al iniciar el juego. Por favor, intenta de nuevo.');
            window.location.href = '/';
        }
    }
    
    // Event listener para botón de reinicio de puntuaciones
    const resetScoresButton = document.getElementById('reset-scores-button');
    if (resetScoresButton) {
        resetScoresButton.addEventListener('click', function() {
            // Confirmar antes de reiniciar
            if (confirm('¿Estás seguro de que quieres reiniciar todas las puntuaciones locales?')) {
                // Eliminar todas las puntuaciones guardadas
                localStorage.removeItem('simonScores');
                // Eliminar el mejor puntaje del usuario
                localStorage.removeItem('userBestScore');
                // Eliminar contador de registros
                const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
                userData.records = 0;
                localStorage.setItem('piUserData', JSON.stringify(userData));
                // Actualizar la interfaz
                if (window.ScoreSystem) {
                    window.ScoreSystem.renderScoreboard(); // Actualizar tabla de puntuaciones
                    window.ScoreSystem.updateUserScoreDisplay(); // Actualizar puntuación máxima
                }
                updateUserInterface(); // Actualizar el contador de registros
                // Mostrar mensaje de éxito
                alert('Puntuaciones locales y contador de registros reiniciados exitosamente');
            }
        });
    }
    
    // Iniciar el juego
    initGame();
    
    // Función auxiliar para actualizar la interfaz de usuario con el nombre, balance y registros
    function updateUserInterface() {
        // Intentar obtener datos del usuario desde localStorage
        try {
            // Si el nombre de usuario ya está bloqueado, no hacer nada
            if (usernameDisplay && usernameDisplay.dataset.usernameLocked === 'true') {
                // Solo actualizar el balance y registros
                const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
                if (userData && userData.balance && balanceDisplay) {
                    balanceDisplay.textContent = userData.balance;
                }
                if (userData && userData.records && recordsDisplay) {
                    recordsDisplay.textContent = userData.records;
                }
                return;
            }

            const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
            
            // Actualizar nombre de usuario si está disponible
            if (userData && userData.username && usernameDisplay) {
                usernameDisplay.textContent = userData.username;
                console.log('UI actualizada: nombre de usuario =', userData.username);
                // Bloquear para evitar sobrescrituras
                usernameDisplay.dataset.usernameLocked = 'true';
            } else if (usernameDisplay && !usernameDisplay.dataset.usernameLocked) {
                // Establecer un valor por defecto
                usernameDisplay.textContent = 'Pioneer';
                console.log('UI actualizada: nombre de usuario por defecto = Pioneer');
            }
            
            // Actualizar balance si está disponible
            if (userData && userData.balance && balanceDisplay) {
                balanceDisplay.textContent = userData.balance;
                console.log('UI actualizada: balance =', userData.balance);
            }
            
            // Actualizar contador de registros si está disponible
            if (userData && userData.records && recordsDisplay) {
                recordsDisplay.textContent = userData.records;
                console.log('UI actualizada: registros =', userData.records);
            }
        } catch (error) {
            console.error('Error al actualizar la interfaz de usuario:', error);
        }
    }
    
    // Ejecutar inmediatamente para asegurar que la UI tenga datos
    updateUserInterface();
    
    // Programar actualizaciones periódicas del balance solamente
    setInterval(function() {
        // Solo actualizar el balance, no el nombre de usuario
        try {
            const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
            if (userData && userData.balance && balanceDisplay) {
                balanceDisplay.textContent = userData.balance;
            }
        } catch (error) {
            console.error('Error al actualizar balance:', error);
        }
    }, 5000); // Cada 5 segundos
    
    // Añadir efecto de vibración al juego para dispositivos móviles
    if (navigator.vibrate) {
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                if (!isPlaying || isGameOver) return;
                navigator.vibrate(30); // Vibración corta
            });
        });
    }
});