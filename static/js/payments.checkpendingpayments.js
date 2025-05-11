/**
 * Función auxiliar para verificar pagos pendientes
 * Esta función se debe añadir a PaymentSystem en payments.js
 */

// Verificar si hay pagos pendientes
PaymentSystem.checkPendingPayments = function() {
    console.log('Verificando pagos pendientes...');
    // Esta función ya no es necesaria explícitamente porque Pi SDK maneja esto automáticamente
    // a través del callback onIncompletePaymentFound configurado en init()
    // Sin embargo, la mantenemos para compatibilidad con el código existente
    
    // Si tenemos el SDK de Pi disponible, verificar pagos pendientes
    if (typeof Pi !== 'undefined') {
        console.log('SDK de Pi disponible, Pi se encargará de notificar pagos pendientes automáticamente');
    } else {
        console.warn('SDK de Pi no disponible, no se pueden verificar pagos pendientes');
    }
    
    return true; // Devolvemos true para indicar que se ha ejecutado correctamente
};
