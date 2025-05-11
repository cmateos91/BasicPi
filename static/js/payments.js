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
let recordsDisplay = null; // Elemento para mostrar registros

// Función para crear partículas (referencia desde simon.js)
let createParticles = null;

// Configuración del sistema de pagos
const PaymentSystem = {
    // Inicializar el sistema de pagos
    init: async function(config) {
        // Almacenar las referencias a los elementos DOM
        currentAccessToken = config.accessToken || null;
        paymentStatus = config.paymentStatus || null;
        txidDisplay = config.txidDisplay || null;
        paymentResult = config.paymentResult || null;
        donationButton = config.donationButton || null;
        simonBoard = config.simonBoard || null;
        scoreDisplay = config.scoreDisplay || null;
        recordsDisplay = config.recordsDisplay || null;
        
        // Configurar el SDK de Pi y los callbacks globales
        if (typeof Pi !== 'undefined') {
            Pi.init({ version: "2.0", sandbox: true });
            
            // Configurar el detector de pagos pendientes
            Pi.onIncompletePaymentFound = (payment) => {
                console.log('Pago incompleto encontrado:', payment);
                this.handleIncompletePayment(payment);
            };
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
        if (gameData && gameData.score !== undefined) {
            score = gameData.score;
        }
        if (gameData && gameData.level !== undefined) {
            level = gameData.level;
        }
        if (gameData && gameData.records !== undefined) {
            // Actualizar localStorage con el nuevo contador de registros
            const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
            userData.records = gameData.records;
            localStorage.setItem('piUserData', JSON.stringify(userData));
            // Actualizar la interfaz
            if (recordsDisplay) {
                recordsDisplay.textContent = gameData.records;
            }
        }
        if (gameData && gameData.lost !== undefined && gameData.lost) {
            this.decreaseRegistrationCounter();
        }
    },
    
    // Manejar pagos incompletos
    handleIncompletePayment: function(payment) {
        console.log('Pago incompleto encontrado:', payment);
        
        if (payment.status === 'completed') {
            // El pago ya está completado, no hacer nada
            return;
        }
        
        // Mostrar información sobre el pago incompleto
        if (paymentStatus) paymentStatus.textContent = 'Pago pendiente encontrado';
        if (txidDisplay) txidDisplay.textContent = payment.transaction ? payment.transaction.txid : 'No disponible';
        if (paymentResult) {
            paymentResult.style.display = 'block';
            
            // Crear botón para cancelar la transacción pendiente
            const cancelButton = document.createElement('button');
            cancelButton.innerHTML = '<i class="fas fa-times-circle"></i> Cancelar Transacción Pendiente';
            cancelButton.className = 'btn btn-danger mt-2';
            cancelButton.onclick = () => this.cancelPendingPayment(payment.identifier);
            
            // Crear botón para completar la transacción pendiente
            const completeButton = document.createElement('button');
            completeButton.innerHTML = '<i class="fas fa-check-circle"></i> Completar Transacción Pendiente';
            completeButton.className = 'btn btn-success mt-2 ms-2';
            completeButton.onclick = () => {
                if (payment.transaction && payment.transaction.txid) {
                    this.completePendingPayment(payment.identifier, payment.transaction.txid);
                } else {
                    alert('No se puede completar porque no hay ID de transacción.');
                }
            };
            
            // Limpiar botones anteriores si existen
            const existingButtons = paymentResult.querySelectorAll('.pending-payment-btn');
            existingButtons.forEach(btn => btn.remove());
            
            // Agregar clase para identificación
            cancelButton.classList.add('pending-payment-btn');
            completeButton.classList.add('pending-payment-btn');
            
            // Agregar botones al DOM
            paymentResult.appendChild(cancelButton);
            if (payment.transaction && payment.transaction.txid) {
                paymentResult.appendChild(completeButton);
            }
        }
    },
    
    // Cancelar un pago pendiente
    cancelPendingPayment: function(paymentId) {
        console.log('Intentando cancelar pago pendiente:', paymentId);
        if (paymentStatus) paymentStatus.textContent = 'Cancelando pago pendiente...';
        
        // Notificar al servidor sobre la cancelación
        fetch('/payment/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                paymentId: paymentId,
                debug: 'cancel'
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Respuesta de cancelación de pago pendiente:', data);
            if (paymentStatus) paymentStatus.textContent = 'Pago pendiente cancelado';
            
            // Eliminar botones de cancelación/completado
            if (paymentResult) {
                const buttons = paymentResult.querySelectorAll('.pending-payment-btn');
                buttons.forEach(btn => btn.remove());
                
                // Ocultar después de un tiempo
                setTimeout(() => {
                    paymentResult.style.display = 'none';
                }, 3000);
            }
            
            // Recargar la página para reiniciar el estado
            setTimeout(() => {
                window.location.reload();
            }, 3500);
        })
        .catch(error => {
            console.error('Error al cancelar pago pendiente:', error);
            if (paymentStatus) paymentStatus.textContent = 'Error al cancelar pago pendiente';
        });
    },
    
    // Aprobar un pago desde el servidor
    approvePayment: function(paymentId) {
        console.log('Aprobando pago desde el servidor:', paymentId);
        if (paymentStatus) paymentStatus.textContent = 'Aprobando pago...';
        
        // Evitar múltiples llamadas para el mismo ID de pago
        if (paymentCallbacks[paymentId] && paymentCallbacks[paymentId].approvalInProgress) {
            console.log('Aprobación ya en progreso para:', paymentId);
            return;
        }
        
        // Marcar como en progreso
        if (!paymentCallbacks[paymentId]) {
            paymentCallbacks[paymentId] = {};
        }
        paymentCallbacks[paymentId].approvalInProgress = true;
        
        // Limpiar cualquier temporizador existente para evitar múltiples llamadas
        if (paymentCallbacks[paymentId].approvalTimer) {
            clearTimeout(paymentCallbacks[paymentId].approvalTimer);
        }
        
        // Usar un temporizador para evitar múltiples llamadas rápidas
        paymentCallbacks[paymentId].approvalTimer = setTimeout(() => {
        
        fetch('/payment/approve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                paymentId: paymentId,
                accessToken: currentAccessToken
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Respuesta de aprobación de pago:', data);
            // Marcar como completado
            if (paymentCallbacks[paymentId]) {
                paymentCallbacks[paymentId].approvalInProgress = false;
            }
            
            if (data.error) {
                console.error('Error en la aprobación del pago:', data.error);
                if (paymentStatus) paymentStatus.textContent = 'Error en la aprobación del pago';
            }
        })
        .catch(error => {
            console.error('Error al aprobar pago:', error);
            if (paymentStatus) paymentStatus.textContent = 'Error al aprobar pago';
            // Marcar como completado incluso en caso de error
            if (paymentCallbacks[paymentId]) {
                paymentCallbacks[paymentId].approvalInProgress = false;
            }
        });
        }, 500); // Esperar 500ms antes de enviar la solicitud para evitar múltiples llamadas
    },
    
    // Completar un pago pendiente
    completePendingPayment: function(paymentId, txid) {
        console.log('Completando pago pendiente:', paymentId, txid);
        if (paymentStatus) paymentStatus.textContent = 'Completando pago pendiente...';
        
        // Evitar múltiples llamadas para el mismo ID de pago
        if (paymentCallbacks[paymentId] && paymentCallbacks[paymentId].completionInProgress) {
            console.log('Completado ya en progreso para:', paymentId);
            return;
        }
        
        // Marcar como en progreso
        if (!paymentCallbacks[paymentId]) {
            paymentCallbacks[paymentId] = {};
        }
        paymentCallbacks[paymentId].completionInProgress = true;
        
        fetch('/payment/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                paymentId: paymentId,
                txid: txid
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Respuesta de completado de pago pendiente:', data);
            // Marcar como completado
            if (paymentCallbacks[paymentId]) {
                paymentCallbacks[paymentId].completionInProgress = false;
            }
            
            if (paymentStatus) paymentStatus.textContent = 'Pago pendiente completado';
            
            // Añadir puntos bonus por donación completada
            if (scoreDisplay) {
                const bonusPoints = 100 + (level > 0 ? level * 5 : 0);
                score += bonusPoints;
                scoreDisplay.textContent = score.toString();
                
                // Registrar puntuación en blockchain si está disponible el sistema
                if (window.ScoreSystem) {
                    window.ScoreSystem.recordScoreOnBlockchain(score, level)
                        .then(() => {
                            console.log('Puntuación por donación registrada en blockchain');
                        })
                        .catch(err => {
                            console.error('Error al registrar puntuación por donación:', err);
                        });
                }
            }
            
            // Efectos de celebración si están disponibles las funciones
            if (createParticles && simonBoard) {
                const rect = simonBoard.getBoundingClientRect();
                createParticles(rect.left + rect.width/2, rect.top + rect.height/2, '#00c853');
            }
            
            // Eliminar botones de cancelación/completado
            if (paymentResult) {
                const buttons = paymentResult.querySelectorAll('.pending-payment-btn');
                buttons.forEach(btn => btn.remove());
                
                // Ocultar después de un tiempo
                setTimeout(() => {
                    paymentResult.style.display = 'none';
                }, 3000);
            }
        })
        .catch(error => {
            console.error('Error al completar pago pendiente:', error);
            if (paymentStatus) paymentStatus.textContent = 'Error al completar pago pendiente';
            // Marcar como completado incluso en caso de error
            if (paymentCallbacks[paymentId]) {
                paymentCallbacks[paymentId].completionInProgress = false;
            }
        });
    },
    
    // Completar un pago
    // Disminuir el contador de registros cuando el usuario pierde
    decreaseRegistrationCounter: function() {
        const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
        if (userData.records && userData.records > 0) {
            userData.records--;
            localStorage.setItem('piUserData', JSON.stringify(userData));
            if (recordsDisplay) {
                recordsDisplay.textContent = userData.records;
            }
        }
    },

    completePayment: function(paymentId, txid) {
        console.log('Completando pago:', paymentId, txid);
        if (paymentStatus) paymentStatus.textContent = 'Completando pago...';
        
        // Evitar múltiples llamadas para el mismo ID de pago
        if (paymentCallbacks[paymentId] && paymentCallbacks[paymentId].completionInProgress) {
            console.log('Completado ya en progreso para:', paymentId);
            return;
        }
        
        // Marcar como en progreso
        if (!paymentCallbacks[paymentId]) {
            paymentCallbacks[paymentId] = {};
        }
        paymentCallbacks[paymentId].completionInProgress = true;
        
        fetch('/payment/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                paymentId: paymentId,
                txid: txid
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Respuesta de completado de pago:', data);
            // Marcar como completado
            if (paymentCallbacks[paymentId]) {
                paymentCallbacks[paymentId].completionInProgress = false;
            }
            
            if (data.error) {
                console.error('Error en el completado del pago:', data.error);
                if (paymentStatus) paymentStatus.textContent = 'Error al completar el pago';
            } else {
                if (paymentStatus) paymentStatus.textContent = 'Pago completado';
                // Actualizar contador de registros
                const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
                userData.records = (userData.records || 0) + 5;
                localStorage.setItem('piUserData', JSON.stringify(userData));
                if (recordsDisplay) {
                    recordsDisplay.textContent = userData.records;
                }
                // Mostrar efectos visuales
                if (simonBoard && createParticles) {
                    const rect = simonBoard.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    createParticles(centerX, centerY, '#8c52ff', 30, 150);
                }
                
                // Añadir puntos bonus por donación completada
                if (scoreDisplay) {
                    const bonusPoints = 100 + (level > 0 ? level * 5 : 0);
                    score += bonusPoints;
                    scoreDisplay.textContent = score.toString();
                    
                    // Registrar puntuación en blockchain si está disponible el sistema
                    if (window.ScoreSystem) {
                        window.ScoreSystem.recordScoreOnBlockchain(score, level)
                            .then(() => {
                                console.log('Puntuación por donación registrada en blockchain');
                            })
                            .catch(err => {
                                console.error('Error al registrar puntuación por donación:', err);
                            });
                    }
                }
            }
            
            // Restaurar botón
            if (donationButton) {
                donationButton.disabled = false;
                donationButton.innerHTML = '<i class="fas fa-save"></i> Guardar 5 registros';
            }
        })
        .catch(error => {
            console.error('Error al completar pago:', error);
            if (paymentStatus) paymentStatus.textContent = 'Error al completar pago';
            // Marcar como completado incluso en caso de error
            if (paymentCallbacks[paymentId]) {
                paymentCallbacks[paymentId].completionInProgress = false;
            }
            
            // Restaurar botón
            if (donationButton) {
                donationButton.disabled = false;
                donationButton.innerHTML = '<i class="fas fa-save"></i> Guardar 5 registros';
            }
        });
    },
    
    // Realizar un pago de donación
    makePayment: async function(config = {}) {
        try {
            // Verificar autenticación
            if (!currentAccessToken) {
                const auth = await this.authenticate();
                if (!auth) {
                    throw new Error('Autenticación fallida');
                }
            }

            // Obtener datos del juego
            const gameData = {
                score: score,
                level: level
            };

            // Actualizar el botón de donación
            if (donationButton) {
                donationButton.disabled = true;
                donationButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Procesando...';
            }

            // Crear pago con los callbacks requeridos
            const payment = await Pi.createPayment(
                {
                    amount: 1,
                    currency: 'PI',
                    memo: "Guardar 5 registros",
                    metadata: {
                        score: score,
                        level: level,
                        ...config.metadata
                    }
                },
                {
                    // Callback cuando el pago está listo para aprobación del servidor
                    onReadyForServerApproval: (paymentId) => {
                        console.log("Pago listo para aprobación del servidor:", paymentId);
                        // Enviar el ID de pago al servidor para aprobación
                        this.approvePayment(paymentId);
                    },
                    // Callback cuando el pago está listo para completarse en el servidor
                    onReadyForServerCompletion: (paymentId, txid) => {
                        console.log("Pago listo para completarse:", paymentId, txid);
                        // Enviar el ID de pago y txid al servidor para completar
                        this.completePayment(paymentId, txid);
                    },
                    // Callback cuando el usuario cancela el pago
                    onCancel: (paymentId) => {
                        console.log("Pago cancelado:", paymentId);
                        // Restaurar botón
                        if (donationButton) {
                            donationButton.disabled = false;
                            donationButton.innerHTML = '<i class="fas fa-save"></i> Guardar 5 registros';
                        }
                    },
                    // Callback cuando ocurre un error
                    onError: (error, payment) => {
                        console.error("Error en el pago:", error, payment);
                        // Restaurar botón
                        if (donationButton) {
                            donationButton.disabled = false;
                            donationButton.innerHTML = '<i class="fas fa-save"></i> Guardar 5 registros';
                        }
                    }
                }
            );

            return payment;

        } catch (error) {
            console.error('Error al realizar el pago:', error);
            // Restaurar botón
            if (donationButton) {
                donationButton.disabled = false;
                donationButton.innerHTML = '<i class="fas fa-save"></i> Guardar 5 registros';
            }
        }
    },
    
    // Autenticar con Pi Network
    authenticate: async function() {
        try {
            console.log('Iniciando autenticación con Pi Network...');
            const scopes = ['payments', 'username'];
            
            // Función para manejar pagos incompletos durante la autenticación
            const handleIncompletePayment = (payment) => {
                console.log('Pago incompleto encontrado durante autenticación:', payment);
                this.handleIncompletePayment(payment);
            };
            
            // Realizar autenticación con Pi SDK
            const auth = await Pi.authenticate(scopes, handleIncompletePayment);
            
            if (auth && auth.accessToken) {
                // Guardar token de acceso
                currentAccessToken = auth.accessToken;
                
                // Guardar datos de usuario en localStorage
                const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
                userData.accessToken = auth.accessToken;
                
                if (auth.user && auth.user.username) {
                    userData.username = auth.user.username;
                    // Actualizar UI si existe el elemento
                    if (window.usernameDisplay) {
                        window.usernameDisplay.textContent = auth.user.username;
                    }
                }
                
                localStorage.setItem('piUserData', JSON.stringify(userData));
                console.log('Autenticación exitosa');
                return auth;
            } else {
                console.error('Autenticación fallida: No se recibió token de acceso');
                return null;
            }
        } catch (error) {
            console.error('Error durante la autenticación:', error);
            return null;
        }
    },
    
    // Verificar autenticación al cargar la página
    checkAuthentication: async function() {
        try {
            // Recuperar datos de la sesión del localStorage
            const userData = JSON.parse(localStorage.getItem('piUserData') || '{}');
            
            if (!userData || !userData.accessToken) {
                // Si no hay datos de sesión, redirigir a la página de inicio
                window.location.href = '/';
                return null;
            }
            
            // Establecer token de acceso para los pagos
            currentAccessToken = userData.accessToken;
            
            // Mostrar datos de usuario en la UI si hay elementos DOM configurados y datos disponibles
            if (window.usernameDisplay && userData.username) {
                window.usernameDisplay.textContent = userData.username;
            }
            
            if (window.balanceDisplay) {
                if (userData.balance) {
                    window.balanceDisplay.textContent = userData.balance;
                } else {
                    window.balanceDisplay.textContent = '0';
                }
            }
            
            // Re-autenticar para mantener la sesión activa
            try {
                const scopes = ['payments', 'username'];
                
                // Función para manejar pagos incompletos (directa, no como método)
                const handleIncompletePayment = (payment) => {
                    console.log('Pago incompleto encontrado durante re-autenticación:', payment);
                    this.handleIncompletePayment(payment);
                };
                
                const auth = await Pi.authenticate(scopes, handleIncompletePayment);
                
                // Actualizar token si ha cambiado
                if (auth.accessToken !== currentAccessToken) {
                    currentAccessToken = auth.accessToken;
                    userData.accessToken = currentAccessToken;
                    
                    // Actualizar datos de usuario
                    if (auth.user && auth.user.username) {
                        userData.username = auth.user.username;
                        
                        // Actualizar UI
                        if (window.usernameDisplay) {
                            window.usernameDisplay.textContent = auth.user.username;
                        }
                        
                        // Intentar obtener balance actualizado
                        try {
                            const walletInfo = await this.getWalletInfo(auth.accessToken);
                            if (walletInfo && walletInfo.balance) {
                                userData.balance = walletInfo.balance;
                                
                                // Actualizar UI
                                if (window.balanceDisplay) {
                                    window.balanceDisplay.textContent = walletInfo.balance;
                                }
                            }
                        } catch (walletError) {
                            console.warn('Error al obtener información de wallet durante re-autenticación:', walletError);
                        }
                    }
                    
                    // Guardar datos actualizados
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
                const errorData = await walletResponse.json();
                console.error('Error al obtener información de la wallet:', errorData);
                return { balance: '0' }; // Valor predeterminado
            }
            
            const walletData = await walletResponse.json();
            console.log('Información de wallet recibida:', walletData);
            return walletData;
        } catch (error) {
            console.error('Error en la solicitud de wallet:', error);
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
    },
    
    // Función especial para cancelar todos los pagos pendientes
    // Esta función se puede llamar desde la consola del navegador en caso de emergencia:
    // PaymentSystem.forcePaymentCancellation()
    forcePaymentCancellation: function() {
        console.log('Intentando forzar la cancelación de todos los pagos pendientes...');
        
        // Crear un mensaje visible para el usuario
        const messageDiv = document.createElement('div');
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.left = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.padding = '15px';
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.border = '1px solid #f5c6cb';
        messageDiv.style.color = '#721c24';
        messageDiv.style.zIndex = '9999';
        messageDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        messageDiv.innerHTML = '<strong>Cancelando pagos pendientes...</strong> Por favor, espere.';
        document.body.appendChild(messageDiv);
        
        // Llamar al servidor para cancelar todos los pagos pendientes
        fetch('/payment/cancel-all-pending', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                accessToken: currentAccessToken
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Respuesta de cancelación forzada:', data);
            messageDiv.style.backgroundColor = '#d4edda';
            messageDiv.style.border = '1px solid #c3e6cb';
            messageDiv.style.color = '#155724';
            messageDiv.innerHTML = '<strong>Pagos cancelados correctamente.</strong> La página se recargará en 3 segundos.';
            
            // Si no hay una ruta para cancelar todos los pagos, usar la alternativa
            if (data.error && data.error.includes('not found')) {
                // Alternativa: Cancelar un pago específico si tenemos el ID
                if (data.pendingPaymentId) {
                    this.cancelPendingPayment(data.pendingPaymentId);
                    messageDiv.innerHTML = '<strong>Intentando cancelar pago pendiente específico.</strong> La página se recargará en 3 segundos.';
                }
            }
            
            // Recargar la página después de un tiempo
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        })
        .catch(error => {
            console.error('Error al forzar cancelación de pagos:', error);
            messageDiv.innerHTML = `<strong>Error al cancelar pagos:</strong> ${error.message}. <br><br>Intente recargar la página o contactar al desarrollador.`;
            
            // Añadir botón para recargar
            const reloadButton = document.createElement('button');
            reloadButton.textContent = 'Recargar página';
            reloadButton.style.padding = '5px 10px';
            reloadButton.style.marginTop = '10px';
            reloadButton.style.backgroundColor = '#007bff';
            reloadButton.style.color = 'white';
            reloadButton.style.border = 'none';
            reloadButton.style.borderRadius = '3px';
            reloadButton.style.cursor = 'pointer';
            reloadButton.onclick = () => window.location.reload();
            messageDiv.appendChild(document.createElement('br'));
            messageDiv.appendChild(reloadButton);
        });
        
        // También imprimir instrucciones para acceder a la página de depuración de Pi Network
        console.log('Para resolver problemas de pagos pendientes, también puede visitar estas páginas de Pi Network:');
        console.log('- Pi Browser Developer Tools');
        console.log('- Pi Developer Portal (revisar logs de transacciones)');
    }
};

// Exportar el módulo para uso en otros scripts
window.PaymentSystem = PaymentSystem;
