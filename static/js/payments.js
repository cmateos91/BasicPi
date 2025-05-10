/**
 * Módulo de pagos para la aplicación Pi Network
 * Gestiona todas las interacciones con el sistema de pagos de Pi
 */

// Variables globales del módulo de pagos
let currentAccessToken = null;
let paymentCallbacks = {};
let paymentStatus = null;
let txidDisplay = null;
let paymentResult = null;
let donationButton = null;
let simonBoard = null; // Referencia al tablero para efectos visuales
let score = 0; // Puntuación actual del juego
let level = 0; // Nivel actual del juego
let scoreDisplay = null; // Elemento para mostrar puntuación

// Función para crear partículas (referencia desde simon.js)
let createParticles = null;

// Configuración del sistema de pagos
const PaymentSystem = {
    // Inicializar el sistema de pagos
    init: function(config) {
        // Almacenar las referencias a los elementos DOM
        currentAccessToken = config.accessToken || null;
        paymentStatus = config.paymentStatus || null;
        txidDisplay = config.txidDisplay || null;
        paymentResult = config.paymentResult || null;
        donationButton = config.donationButton || null;
        simonBoard = config.simonBoard || null;
        scoreDisplay = config.scoreDisplay || null;
        
        // Configurar el callback para pagos incompletos
        if (typeof Pi !== 'undefined') {
            Pi.init({ version: "2.0", sandbox: true });
        }
        
        // Configurar callbacks para el botón de donación
        if (donationButton) {
            donationButton.addEventListener('click', this.makePayment.bind(this));
        }
        
        // Guardar referencia a la función de partículas
        createParticles = config.createParticles || null;
        
        return this;
    },
    
    // Actualizar datos del juego para el sistema de pagos
    updateGameData: function(gameData) {
        score = gameData.score || 0;
        level = gameData.level || 0;
    },
    
    // Manejar pagos incompletos
    handleIncompletePayment: function(payment) {
        console.log('Pago incompleto encontrado:', payment);
        
        if (payment.status === 'completed') {
            // El pago ya está completado, no hacer nada
            return;
        }
        
        // Mostrar información sobre el pago incompleto
        if (paymentStatus) paymentStatus.textContent = 'Completando pago pendiente...';
        if (txidDisplay) txidDisplay.textContent = payment.transaction ? payment.transaction.txid : 'No disponible';
        if (paymentResult) paymentResult.style.display = 'block';
        
        // Completar el pago si tiene transacción
        if (payment.transaction && payment.transaction.txid) {
            fetch('/payment/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    paymentId: payment.identifier,
                    txid: payment.transaction.txid
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Respuesta de completado de pago incompleto:', data);
                if (paymentStatus) paymentStatus.textContent = 'Pago pendiente completado';
                
                // Añadir puntos bonus por donación completada anteriormente
                if (scoreDisplay) {
                    score += 100;
                    scoreDisplay.textContent = score.toString();
                }
                
                // Efectos de celebración si están disponibles las funciones
                if (createParticles && simonBoard) {
                    const rect = simonBoard.getBoundingClientRect();
                    createParticles(rect.left + rect.width/2, rect.top + rect.height/2, '#00c853');
                }
                
                // Ocultar después de un tiempo
                setTimeout(() => {
                    if (paymentResult) paymentResult.style.display = 'none';
                }, 5000);
            })
            .catch(error => {
                console.error('Error al completar pago pendiente:', error);
                if (paymentStatus) paymentStatus.textContent = 'Error al completar pago pendiente';
            });
        }
    },
    
    // Realizar un pago de donación
    makePayment: async function(config = {}) {
        try {
            // Parámetros opcionales (se pueden pasar en la llamada a la función)
            const amount = config.amount || 1;
            const memo = config.memo || "Donación para SimonDice";
            const metadata = config.metadata || {};
            const onSuccess = config.onSuccess || null;
            const gameScore = config.gameScore || score;
            const maxLevel = config.maxLevel || level;
            
            // Deshabilitar botón mientras se procesa
            if (donationButton) {
                donationButton.disabled = true;
                donationButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            }
            
            // Crear un identificador único para el pago
            const paymentId = 'donation_' + Date.now();
            
            // Configurar el pago
            const paymentData = {
                amount: amount,
                memo: memo,
                metadata: { 
                    paymentId: paymentId,
                    gameScore: gameScore,
                    maxLevel: maxLevel,
                    ...metadata
                }
            };
            
            // Callbacks para el proceso de pago
            const paymentCallbacks = {
                onReadyForServerApproval: function(paymentDTO) {
                    console.log('Listo para aprobación del servidor:', paymentDTO);
                    if (paymentStatus) paymentStatus.textContent = 'Esperando aprobación...';
                    if (txidDisplay) txidDisplay.textContent = 'Pendiente';
                    if (paymentResult) paymentResult.style.display = 'block';
                    
                    // Llamar al servidor para aprobar el pago
                    fetch('/payment/approve', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            paymentId: paymentDTO,
                            accessToken: currentAccessToken
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Respuesta de aprobación:', data);
                        if (paymentStatus) paymentStatus.textContent = 'Aprobado, esperando confirmación...';
                    })
                    .catch(error => {
                        console.error('Error al aprobar el pago:', error);
                        if (paymentStatus) paymentStatus.textContent = 'Error al aprobar el pago';
                        if (donationButton) {
                            donationButton.disabled = false;
                            donationButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
                        }
                    });
                },
                onReadyForServerCompletion: function(paymentDTO, txid) {
                    console.log('Listo para completar en el servidor:', paymentDTO, txid);
                    if (paymentStatus) paymentStatus.textContent = 'Completando...';
                    if (txidDisplay) txidDisplay.textContent = txid || 'No disponible';
                    
                    // Llamar al servidor para completar el pago
                    fetch('/payment/complete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            paymentId: paymentDTO,
                            txid: txid
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Respuesta de completado:', data);
                        if (paymentStatus) paymentStatus.textContent = 'Completado - ¡Gracias por tu donación!';
                        
                        // Agregar puntos bonus por donación
                        if (scoreDisplay) {
                            const bonusPoints = 100 + (level > 0 ? level * 5 : 0);
                            score += bonusPoints;
                            scoreDisplay.textContent = score.toString();
                        }
                        
                        // Efectos de celebración
                        if (createParticles && simonBoard) {
                            const rect = simonBoard.getBoundingClientRect();
                            createParticles(rect.left + rect.width/2, rect.top + rect.height/2, '#00c853');
                        }
                        
                        // Ejecutar callback de éxito si se proporcionó
                        if (typeof onSuccess === 'function') {
                            onSuccess(data);
                        }
                        
                        // Restaurar botón después de un tiempo
                        setTimeout(() => {
                            if (donationButton) {
                                donationButton.disabled = false;
                                donationButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
                            }
                            
                            // Ocultar resultado de pago
                            setTimeout(() => {
                                if (paymentResult) paymentResult.style.display = 'none';
                            }, 3000);
                        }, 1000);
                    })
                    .catch(error => {
                        console.error('Error al completar el pago:', error);
                        if (paymentStatus) paymentStatus.textContent = 'Error al completar el pago';
                        if (donationButton) {
                            donationButton.disabled = false;
                            donationButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
                        }
                    });
                },
                onCancel: function(paymentDTO) {
                    console.log('Pago cancelado:', paymentDTO);
                    if (paymentStatus) paymentStatus.textContent = 'Cancelado';
                    if (donationButton) {
                        donationButton.disabled = false;
                        donationButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
                    }
                    
                    // Ocultar resultado después de un tiempo
                    setTimeout(() => {
                        if (paymentResult) paymentResult.style.display = 'none';
                    }, 3000);
                    
                    // Notificar al servidor sobre la cancelación
                    fetch('/payment/complete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            paymentId: paymentDTO,
                            debug: 'cancel'
                        })
                    })
                    .then(response => response.json())
                    .catch(error => {
                        console.error('Error al notificar cancelación:', error);
                    });
                },
                onError: function(error, paymentDTO) {
                    console.error('Error en el pago:', error, paymentDTO);
                    if (paymentStatus) paymentStatus.textContent = 'Error: ' + (error.message || 'Desconocido');
                    if (donationButton) {
                        donationButton.disabled = false;
                        donationButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
                    }
                    
                    // Notificar al servidor sobre el error
                    fetch('/payment/error', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            paymentDTO: paymentDTO,
                            paymentId: paymentDTO,
                            error: error.message || 'Error desconocido'
                        })
                    })
                    .then(response => response.json())
                    .catch(error => {
                        console.error('Error al notificar error:', error);
                    });
                }
            };
            
            // Crear el pago
            if (typeof Pi !== 'undefined') {
                Pi.createPayment(paymentData, paymentCallbacks);
            } else {
                console.error('Pi SDK no está disponible');
                if (donationButton) {
                    donationButton.disabled = false;
                    donationButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
                }
            }
            
        } catch (error) {
            console.error('Error al realizar el pago:', error);
            alert('Error al realizar el pago: ' + error.message);
            if (donationButton) {
                donationButton.disabled = false;
                donationButton.innerHTML = '<i class="fas fa-donate"></i> Donar 1 Pi';
            }
        }
    },
    
    // Función de autenticación con Pi Network
    authenticate: async function() {
        if (typeof Pi === 'undefined') {
            console.error('Pi SDK no está disponible');
            throw new Error('Pi SDK no está disponible');
        }
        
        try {
            const auth = await Pi.authenticate(['payments', 'username', 'wallet_address'], {
                onIncompletePaymentFound: this.handleIncompletePayment.bind(this)
            });
            
            // Actualizar token de acceso
            currentAccessToken = auth.accessToken;
            
            return auth;
        } catch (error) {
            console.error('Error en autenticación:', error);
            throw error;
        }
    },
    
    // Verificar autenticación al cargar la página
    checkAuthentication: async function() {
        try {
            // Recuperar datos de la sesión del localStorage
            const userData = JSON.parse(localStorage.getItem('piUserData'));
            
            if (!userData || !userData.accessToken) {
                // Si no hay datos de sesión, redirigir a la página de inicio
                window.location.href = '/';
                return null;
            }
            
            // Establecer token de acceso para los pagos
            currentAccessToken = userData.accessToken;
            
            // Mostrar datos de usuario en la UI si hay elementos DOM configurados
            if (window.usernameDisplay) {
                window.usernameDisplay.textContent = userData.username || 'Usuario';
            }
            
            if (window.balanceDisplay) {
                window.balanceDisplay.textContent = userData.balance || '0';
            }
            
            // Re-autenticar para mantener la sesión activa
            try {
                const auth = await Pi.authenticate(['payments'], {
                    onIncompletePaymentFound: this.handleIncompletePayment.bind(this)
                });
                
                // Actualizar token si ha cambiado
                if (auth.accessToken !== currentAccessToken) {
                    currentAccessToken = auth.accessToken;
                    userData.accessToken = currentAccessToken;
                    localStorage.setItem('piUserData', JSON.stringify(userData));
                }
                
                return auth;
            } catch (authError) {
                console.warn('Error en re-autenticación:', authError);
                // Continuar con el token existente
                return { user: userData, accessToken: currentAccessToken };
            }
            
        } catch (error) {
            console.error('Error al verificar autenticación:', error);
            window.location.href = '/';
            return null;
        }
    },
    
    // Obtener información del usuario desde el servidor
    getUserInfo: async function(accessToken) {
        try {
            const userResponse = await fetch('/api/me', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accessToken: accessToken || currentAccessToken })
            });
            
            if (!userResponse.ok) {
                throw new Error('Error al obtener información del usuario');
            }
            
            return await userResponse.json();
        } catch (error) {
            console.error('Error al obtener información del usuario:', error);
            throw error;
        }
    },
    
    // Obtener información de la wallet desde el servidor
    getWalletInfo: async function(accessToken) {
        try {
            const walletResponse = await fetch('/api/wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accessToken: accessToken || currentAccessToken })
            });
            
            if (!walletResponse.ok) {
                return { balance: '0' }; // Valor predeterminado
            }
            
            return await walletResponse.json();
        } catch (error) {
            console.warn('No se pudo obtener información de la wallet:', error);
            return { balance: '0' }; // Valor predeterminado
        }
    },
    
    // Establecer token de acceso
    setAccessToken: function(token) {
        currentAccessToken = token;
    },
    
    // Obtener token de acceso actual
    getAccessToken: function() {
        return currentAccessToken;
    },
    
    // Actualizar la puntuación actual
    setScore: function(newScore) {
        score = newScore;
    },
    
    // Actualizar el nivel actual
    setLevel: function(newLevel) {
        level = newLevel;
    }
};

// Exportar el módulo para uso en otros scripts
window.PaymentSystem = PaymentSystem;
