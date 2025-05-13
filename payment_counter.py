"""
Sistema de conteo de pagos para Pi Network
Mantiene un contador de los pagos recibidos y acumula fondos para transferencia posterior
"""

import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

# Ruta al archivo JSON que almacenará el contador
DATA_DIR = '/tmp'
os.makedirs(DATA_DIR, exist_ok=True)  # ✅ ahora sí es válido en Vercel
COUNTER_FILE = os.path.join(DATA_DIR, 'counter.json')

def get_counter_summary():
    if os.path.exists(COUNTER_FILE):
        with open(COUNTER_FILE, 'r') as f:
            return json.load(f)
    return {'accumulated_amount': 0, 'payments_count': 0}

def add_to_counter(amount, payment_id, user_id, username):
    summary = get_counter_summary()
    summary['accumulated_amount'] += amount
    summary['payments_count'] += 1
    with open(COUNTER_FILE, 'w') as f:
        json.dump(summary, f)
    return summary

# Asegurarse de que el directorio de datos existe
os.makedirs(DATA_DIR, exist_ok=True)

def initialize_counter():
    """Inicializa el contador si no existe"""
    if not os.path.exists(COUNTER_FILE):
        counter_data = {
            'accumulated_amount': 0.0,
            'last_updated': datetime.now().isoformat(),
            'payments_count': 0,
            'payments_history': []
        }
        save_counter(counter_data)
        return counter_data
    return load_counter()

def load_counter():
    """Carga el contador desde el archivo JSON"""
    try:
        if os.path.exists(COUNTER_FILE):
            with open(COUNTER_FILE, 'r') as f:
                return json.load(f)
        else:
            return initialize_counter()
    except Exception as e:
        logger.error(f"Error al cargar el contador: {str(e)}")
        # Si hay un error, inicializar un nuevo contador
        return initialize_counter()

def save_counter(counter_data):
    """Guarda el contador en el archivo JSON"""
    try:
        with open(COUNTER_FILE, 'w') as f:
            json.dump(counter_data, f, indent=2)
    except Exception as e:
        logger.error(f"Error al guardar el contador: {str(e)}")

def add_to_counter(amount, payment_id=None, user_id=None, username=None):
    """
    Añade una cantidad al contador
    
    Args:
        amount (float): La cantidad a añadir al contador (en Pi)
        payment_id (str, opcional): El ID del pago
        user_id (str, opcional): El ID del usuario que realizó el pago
        username (str, opcional): El nombre de usuario que realizó el pago
        
    Returns:
        dict: Los datos actualizados del contador
    """
    try:
        # Cargar el contador actual
        counter_data = load_counter()
        
        # Añadir la cantidad al acumulado
        counter_data['accumulated_amount'] += float(amount)
        counter_data['payments_count'] += 1
        counter_data['last_updated'] = datetime.now().isoformat()
        
        # Añadir el registro del pago al historial
        payment_record = {
            'timestamp': datetime.now().isoformat(),
            'amount': float(amount),
            'payment_id': payment_id,
            'user_id': user_id,
            'username': username
        }
        
        # Añadir al inicio para tener los más recientes primero
        counter_data['payments_history'].insert(0, payment_record)
        
        # Limitar el historial a los últimos 100 pagos para que no crezca indefinidamente
        counter_data['payments_history'] = counter_data['payments_history'][:100]
        
        # Guardar los datos actualizados
        save_counter(counter_data)
        
        logger.info(f"Añadido {amount} Pi al contador. Total acumulado: {counter_data['accumulated_amount']} Pi")
        return counter_data
    except Exception as e:
        logger.error(f"Error al añadir al contador: {str(e)}")
        return None

def get_counter_summary():
    """
    Obtiene un resumen del contador
    
    Returns:
        dict: Un resumen del contador
    """
    try:
        counter_data = load_counter()
        return {
            'accumulated_amount': counter_data['accumulated_amount'],
            'payments_count': counter_data['payments_count'],
            'last_updated': counter_data['last_updated']
        }
    except Exception as e:
        logger.error(f"Error al obtener el resumen del contador: {str(e)}")
        return None

def reset_counter():
    """
    Reinicia el contador después de realizar una transferencia manual
    Guarda el historial anterior en un archivo separado
    
    Returns:
        bool: True si se reinició correctamente, False en caso contrario
    """
    try:
        # Cargar el contador actual
        counter_data = load_counter()
        
        # Guardar el historial anterior
        history_file = os.path.join(
            DATA_DIR, 
            f"payment_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        
        with open(history_file, 'w') as f:
            json.dump(counter_data, f, indent=2)
        
        # Reiniciar el contador
        counter_data['accumulated_amount'] = 0.0
        counter_data['last_updated'] = datetime.now().isoformat()
        # Mantenemos el payments_count para tener un registro histórico
        # Mantenemos el payments_history para referencia
        
        # Guardar el contador reiniciado
        save_counter(counter_data)
        
        logger.info(f"Contador reiniciado. Historial guardado en {history_file}")
        return True
    except Exception as e:
        logger.error(f"Error al reiniciar el contador: {str(e)}")
        return False

# Inicializar el contador al importar el módulo
initialize_counter()
