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
    
    // Completar un pago pendiente
    completePendingPayment: function(paymentId, txid) {
        console.log('Completando pago pendiente:', paymentId, txid);
        if (paymentStatus) paymentStatus.textContent = 'Completando pago pendiente...';
        
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
            if (paymentStatus) paymentStatus.textContent = 'Pago pendiente completado';
            
            // Añadir puntos bonus por donación completada
            if (scoreDisplay) {
                score += 100;
                scoreDisplay.textContent = score.toString();
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
        });
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
            // Configuramos un detector de pagos pendientes más agresivo
            let pendingPaymentFound = false;
            
            const auth = await Pi.authenticate(['payments', 'username', 'wallet_address'], {
                onIncompletePaymentFound: (payment) => {
                    console.log('Pago incompleto encontrado durante autenticación:', payment);
                    pendingPaymentFound = true;
                    this.handleIncompletePayment(payment);
                }
            });
            
            // Actualizar token de acceso
            currentAccessToken = auth.accessToken;
            
            // Si no se detectó ningún pago pendiente automáticamente, verificar manualmente
            if (!pendingPaymentFound) {
                console.log('Verificando manualmente pagos pendientes...');
                this.checkPendingPayments();
            }
            
            return auth;
        } catch (error) {
            console.error('Error en autenticación:', error);
            throw error;
        }
    },
    
    // Verificar manualmente si hay pagos pendientes
    checkPendingPayments: async function() {
        if (typeof Pi === 'undefined') {
            console.error('Pi SDK no está disponible');
            return;
        }
        
        try {
            // Esta es una solución alternativa usando el API del backend
            fetch('/payment/check-pending', {
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
                if (data.pendingPayments && data.pendingPayments.length > 0) {
                    console.log('Pagos pendientes encontrados manualmente:', data.pendingPayments);
                    // Manejar el primer pago pendiente encontrado
                    this.handleIncompletePayment(data.pendingPayments[0]);
                } else {
                    console.log('No se encontraron pagos pendientes manualmente');
                }
            })
            .catch(error => {
                console.error('Error al verificar pagos pendientes manualmente:', error);
            });
        } catch (error) {
            console.error('Error al verificar pagos pendientes:', error);
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
