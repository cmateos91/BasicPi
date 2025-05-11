/**
 * Módulo para mostrar y gestionar el contador de pagos
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const counterContainer = document.getElementById('payment-counter');
    
    // Solo inicializar si el contenedor existe
    if (!counterContainer) {
        console.warn('Contenedor de contador de pagos no encontrado');
        return;
    }
    
    const PaymentCounter = {
        // Estado del contador
        counterData: null,
        
        // Inicializar el contador
        init: function() {
            // Cargar datos del contador
            this.fetchCounterData();
            
            // Actualizar cada 60 segundos
            setInterval(() => {
                this.fetchCounterData();
            }, 60000);
            
            return this;
        },
        
        // Obtener datos del contador desde el backend
        fetchCounterData: function() {
            fetch('/api/payment-counter')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        this.counterData = data.counter;
                        this.updateUI();
                    } else {
                        console.error('Error al obtener datos del contador:', data.error);
                    }
                })
                .catch(error => {
                    console.error('Error al obtener datos del contador:', error);
                });
        },
        
        // Actualizar la interfaz con los datos del contador
        updateUI: function() {
            if (!this.counterData) {
                return;
            }
            
            // Formatear datos para la UI
            const accumulatedAmount = parseFloat(this.counterData.accumulated_amount).toFixed(2);
            const paymentsCount = this.counterData.payments_count;
            
            // Formatear fecha de última actualización
            const lastUpdated = new Date(this.counterData.last_updated);
            const formattedDate = lastUpdated.toLocaleDateString() + ' ' + lastUpdated.toLocaleTimeString();
            
            // Actualizar HTML
            counterContainer.innerHTML = `
                <h4><i class="fas fa-coins"></i> Fondo para Transferencias</h4>
                <div class="payment-counter-data">
                    <div class="counter-item">
                        <div class="label">Cantidad acumulada</div>
                        <div class="value">${accumulatedAmount} Pi</div>
                    </div>
                    <div class="counter-item">
                        <div class="label">Pagos recibidos</div>
                        <div class="value">${paymentsCount}</div>
                    </div>
                    <div class="counter-item">
                        <div class="label">Última actualización</div>
                        <div class="value">${formattedDate}</div>
                    </div>
                </div>
                <div class="counter-note">
                    Por cada pago de 0.20 Pi, 0.10 Pi va a la wallet principal y 0.10 Pi se añade a este fondo para transferencia manual posterior.
                </div>
            `;
        }
    };
    
    // Inicializar el contador
    window.PaymentCounter = PaymentCounter.init();
});
