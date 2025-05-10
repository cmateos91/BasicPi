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
    
    // Elementos del DOM
    const greenBtn = document.getElementById('green');
    const redBtn = document.getElementById('red');
    const yellowBtn = document.getElementById('yellow');
    const blueBtn = document.getElementById('blue');
    const startBtn = document.getElementById('start-button');
    const scoreDisplay = document.getElementById('score');
    const usernameDisplay = document.getElementById('username-display');
    const balanceDisplay = document.getElementById('balance-display');
    const logoutButton = document.getElementById('logout-button');
    const donationButton = document.getElementById('donation-button');
    const paymentResult = document.getElementById('paymentResult');
    const paymentStatus = document.getElementById('paymentStatus');
    const txidDisplay = document.getElementById('txid');
    const simonBoard = document.getElementById('simon-board');
    
    // Exportar elementos importantes para acceso global
    window.usernameDisplay = usernameDisplay;
    window.balanceDisplay = balanceDisplay;
    
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
    
    // Cargar sonidos
    const sounds = {
        green: new Audio('/static/sounds/green.mp3'),
        red: new Audio('/static/sounds/red.mp3'),
        yellow: new Audio('/static/sounds/yellow.mp3'),
        blue: new Audio('/static/sounds/blue.mp3'),
        wrong: new Audio('/static/sounds/wrong.mp3'),
        success: new Audio('/static/sounds/success.mp3') // Sonido para secuencia correcta
    };

    // Función para emitir sonido
    function playSound(color) {
        try {
            sounds[color].currentTime = 0;
            sounds[color].play();
        } catch (error) {
            console.error('Error al reproducir sonido:', error);
            // Si no se carga el sonido, generamos uno con la API Web Audio
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
                // Secuencia de notas para éxito
                const notes = [261.63, 329.63, 392.00, 523.25];
                oscillator.frequency.value = notes[Math.floor(Math.random() * notes.length)];
            }
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            // Reproducir sonido brevemente
            gainNode.gain.value = 0.5;
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
            }, 300);
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
        
        // Actualizar puntuación - bonificación por nivel alto
        score = (level - 1) * 10 * (1 + Math.floor(level / 5) * 0.5);
        scoreDisplay.textContent = score.toString();
        
        // Actualizar datos en el sistema de pagos
        PaymentSystem.setScore(score);
        PaymentSystem.setLevel(level);
        
        showSequence();
    }
    
    // Función para verificar respuesta del usuario
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
                
                // Reproducir sonido de éxito
                try {
                    sounds.success.play();
                } catch (e) {
                    playSound('success');
                }
                
                // Actualizar puntuación con bonificación
                const levelBonus = Math.pow(1.2, Math.min(level, 10));
                score += Math.floor(level * 10 * levelBonus);
                scoreDisplay.textContent = score.toString();
                
                // Actualizar score en sistema de pagos
                PaymentSystem.setScore(score);
                
                setTimeout(() => {
                    nextSequence();
                }, 1000);
            }
        } else {
            // Respuesta incorrecta
            playSound('wrong');
            isGameOver = true;
            
            // Efecto visual de game over
            document.body.classList.add('game-over');
            simonBoard.style.opacity = '0.5';
            buttons.forEach(btn => btn.style.pointerEvents = 'none');
            
            setTimeout(() => {
                document.body.classList.remove('game-over');
                simonBoard.style.opacity = '1';
            }, 1500);
            
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
            
            message += `\nLlegaste al nivel ${level} con ${score} puntos.\n\n¿Quieres jugar de nuevo?`;
            
            // Mostrar mensaje de game over con pequeña demora
            setTimeout(() => {
                if (confirm(message)) {
                    resetGame();
                    // Reiniciar juego después de una breve pausa
                    setTimeout(() => {
                        isPlaying = true;
                        startBtn.textContent = 'RESET';
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
        startBtn.textContent = 'INICIO';
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
            startBtn.textContent = 'RESET';
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
    
    // Inicialización del sistema de pagos
    PaymentSystem.init({
        accessToken: null, // Se establecerá durante la autenticación
        paymentStatus: paymentStatus,
        txidDisplay: txidDisplay,
        paymentResult: paymentResult,
        donationButton: donationButton,
        simonBoard: simonBoard,
        scoreDisplay: scoreDisplay,
        createParticles: createParticles
    });
    
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
        } catch (error) {
            console.error('Error al inicializar el juego:', error);
            alert('Error al iniciar el juego. Por favor, intenta de nuevo.');
            window.location.href = '/';
        }
    }
    
    // Iniciar el juego
    initGame();
    
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