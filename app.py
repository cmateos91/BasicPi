from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_bootstrap import Bootstrap
from flask_cors import CORS
import requests
import os
import time
from dotenv import load_dotenv
import simplejson as json
import logging
# Importar el módulo de contador de pagos
from payment_counter import add_to_counter, get_counter_summary

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

# Configurar headers para la API de Pi Network
api_key = os.getenv('PI_API_KEY')
if not api_key:
    logger.error('PI_API_KEY not found in environment variables')
    raise ValueError('PI_API_KEY must be set in environment variables')

server_header = {
    'Authorization': f'Key {api_key}'
}

app = Flask(__name__, static_folder='static')
Bootstrap(app)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuración de Flask
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-key-change-in-production')

# Permitir que la aplicación se muestre en iframes
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    # Eliminar X-Frame-Options para permitir que se muestre en iframes
    if 'X-Frame-Options' in response.headers:
        del response.headers['X-Frame-Options']
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/simon')
def simon_game():
    """Ruta para el juego Simon Dice"""
    return render_template('simon.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/api/me', methods=['POST'])
def get_user_info():
    try:
        # Obtener el token de acceso del frontend
        access_token = request.json.get('accessToken')
        if not access_token:
            logger.error('No access token provided')
            return jsonify({'error': 'No access token provided'}), 400

        # Configurar headers para la petición al usuario
        user_header = {
            'Authorization': f'Bearer {access_token}'
        }

        # Hacer la petición a la API de Pi Network
        user_url = "https://api.minepi.com/v2/me"
        response = requests.get(user_url, headers=user_header)

        if response.status_code != 200:
            logger.error(f'Failed to get user info: {response.text}')
            return jsonify({'error': 'Failed to get user info'}), 400

        user_data = response.json()
        logger.info(f'Successfully retrieved user info: {user_data}')
        return jsonify(user_data)

    except Exception as e:
        logger.error(f'Error getting user info: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/wallet', methods=['POST'])
def get_wallet_info():
    try:
        # Obtener el token de acceso del frontend
        logger.debug(f'Request JSON: {request.json}')
        access_token = request.json.get('accessToken')
        if not access_token:
            logger.error('No access token provided')
            return jsonify({'error': 'No access token provided'}), 400

        logger.debug(f'Access token received: {access_token[:10]}...')

        # Configurar headers para la petición al usuario
        user_header = {
            'Authorization': f'Bearer {access_token}'
        }

        # Hacer la petición a la API de Pi Network
        wallet_url = "https://api.minepi.com/v2/wallet"
        logger.debug(f'Making request to: {wallet_url}')
        response = requests.get(wallet_url, headers=user_header)

        logger.debug(f'Response status code: {response.status_code}')
        logger.debug(f'Response content: {response.text}')

        if response.status_code != 200:
            logger.error(f'Failed to get wallet info: {response.text}')
            return jsonify({'error': f'Failed to get wallet info: {response.text}'}), 400

        wallet_data = response.json()
        logger.info(f'Successfully retrieved wallet info: {wallet_data}')
        
        # Si no hay balance, establecer un valor predeterminado
        if 'balance' not in wallet_data:
            wallet_data['balance'] = '0'
            logger.warning('Balance not found in wallet data, using default value')
            
        return jsonify(wallet_data)

    except Exception as e:
        logger.error(f'Error getting wallet info: {str(e)}')
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

# Rutas para manejar pagos de Pi Network
@app.route('/payment/approve', methods=['POST'])
def approve_payment():
    try:
        # Obtener el ID del pago y el token de acceso
        payment_id = request.json.get('paymentId')
        access_token = request.json.get('accessToken')
        
        if not payment_id or not access_token:
            logger.error('Missing paymentId or accessToken')
            return jsonify({'error': 'Missing paymentId or accessToken'}), 400
        
        logger.info(f'Approving payment: {payment_id}')
        
        # Configurar headers para la petición a la API de Pi Network
        headers = {
            'Authorization': f'Key {api_key}'
        }
        
        # Aprobar el pago en la API de Pi Network
        approve_url = f"https://api.minepi.com/v2/payments/{payment_id}/approve"
        approve_data = {}  # No se necesitan datos adicionales para aprobar
        
        response = requests.post(approve_url, json=approve_data, headers=headers)
        
        if response.status_code != 200:
            logger.error(f'Failed to approve payment: {response.text}')
            return jsonify({'error': f'Failed to approve payment: {response.text}'}), 400
        
        approval_result = response.json()
        logger.info(f'Payment approved: {approval_result}')
        
        return jsonify(approval_result)
    
    except Exception as e:
        logger.error(f'Error approving payment: {str(e)}')
        return jsonify({'error': f'Error approving payment: {str(e)}'}), 500

@app.route('/payment/complete', methods=['POST'])
def complete_payment():
    try:
        # Obtener el ID del pago y el ID de la transacción
        payment_id = request.json.get('paymentId')
        txid = request.json.get('txid')
        
        if not payment_id:
            logger.error('Missing paymentId')
            return jsonify({'error': 'Missing paymentId'}), 400
        
        logger.info(f'Completing payment: {payment_id}, txid: {txid}')
        
        # Si es una cancelación o un error, simplemente registrarlo
        debug = request.json.get('debug')
        if debug == 'cancel':
            logger.info(f'Payment {payment_id} was cancelled')
            return jsonify({'status': 'cancelled'})
        elif debug == 'error':
            logger.info(f'Payment {payment_id} had an error')
            return jsonify({'status': 'error'})
        
        # Si no hay txid, puede ser una cancelación o un error
        if not txid:
            logger.warning(f'No txid provided for payment {payment_id}')
            return jsonify({'status': 'incomplete', 'message': 'No transaction ID provided'})
        
        # Configurar headers para la petición a la API de Pi Network
        headers = {
            'Authorization': f'Key {api_key}'
        }
        
        # Obtener detalles completos del pago desde la API de Pi
        payment_url = f"https://api.minepi.com/v2/payments/{payment_id}"
        payment_response = requests.get(payment_url, headers=headers)
        
        if payment_response.status_code != 200:
            logger.error(f'Failed to get payment details: {payment_response.text}')
            return jsonify({'error': f'Failed to get payment details: {payment_response.text}'}), 400
        
        payment_details = payment_response.json()
        payment_amount = float(payment_details.get('amount', 0.0))
        user_id = payment_details.get('user_uid', '')
        username = payment_details.get('user_uid', '') # Usamos user_uid como nombre también, podríamos obtener el nombre real con otra llamada API
        
        # Completar el pago en la API de Pi Network
        complete_url = f"https://api.minepi.com/v2/payments/{payment_id}/complete"
        complete_data = {
            'txid': txid
        }
        
        response = requests.post(complete_url, json=complete_data, headers=headers)
        
        if response.status_code != 200:
            logger.error(f'Failed to complete payment: {response.text}')
            return jsonify({'error': f'Failed to complete payment: {response.text}'}), 400
        
        completion_result = response.json()
        logger.info(f'Payment completed: {completion_result}')
        
        # Añadir el 50% del pago al contador (la otra mitad va a la wallet principal)
        amount_to_add = payment_amount / 2  # Dividimos el pago en dos partes iguales
        counter_result = add_to_counter(
            amount=amount_to_add,
            payment_id=payment_id,
            user_id=user_id,
            username=username
        )
        
        logger.info(f'Added {amount_to_add} Pi to counter. Total accumulated: {counter_result["accumulated_amount"]} Pi')
        
        # Devolver el resultado con la información del contador
        return jsonify({
            'status': 'success',
            'message': 'Payment completed and counter updated',
            'payment_result': completion_result,
            'counter': {
                'amount_added': amount_to_add,
                'total_accumulated': counter_result['accumulated_amount'],
                'payments_count': counter_result['payments_count']
            }
        })
    
    except Exception as e:
        logger.error(f'Error completing payment: {str(e)}')
        return jsonify({'error': f'Error completing payment: {str(e)}'}), 500

@app.route('/payment/error', methods=['POST'])
def payment_error():
    try:
        # Obtener los datos del error
        payment_dto = request.json.get('paymentDTO')
        payment_id = request.json.get('paymentId')
        
        logger.error(f'Payment error: {payment_id}, DTO: {payment_dto}')
        
        # Aquí podrías implementar lógica para manejar errores de pago
        # Por ejemplo, notificar al usuario, intentar nuevamente, etc.
        
        return jsonify({'status': 'error_logged'})
    
    except Exception as e:
        logger.error(f'Error handling payment error: {str(e)}')
        return jsonify({'error': f'Error handling payment error: {str(e)}'}), 500

@app.route('/payment/check-pending', methods=['POST'])
def check_pending_payments():
    try:
        # Obtener el token de acceso
        access_token = request.json.get('accessToken')
        
        if not access_token:
            logger.error('Missing accessToken')
            return jsonify({'error': 'Missing accessToken'}), 400
        
        # Configurar headers para la petición al usuario
        user_header = {
            'Authorization': f'Bearer {access_token}'
        }
        
        # Consultar la API de Pi Network para pagos pendientes
        # Esto es una aproximación, ya que la API puede no tener este endpoint exacto
        try:
            payments_url = "https://api.minepi.com/v2/payments/incomplete"
            response = requests.get(payments_url, headers=user_header)
            
            if response.status_code == 200:
                payments_data = response.json()
                logger.info(f'Found pending payments: {payments_data}')
                return jsonify({'pendingPayments': payments_data})
            else:
                # Si la API no tiene el endpoint, buscar en el servidor local
                logger.warning(f'Could not get pending payments from API: {response.text}')
                # Aquí podrías implementar lógica para buscar pagos pendientes localmente
                return jsonify({'pendingPayments': []})
                
        except Exception as api_error:
            logger.error(f'Error checking pending payments from API: {str(api_error)}')
            # Fallback a un método alternativo
            return jsonify({'pendingPayments': [], 'error': str(api_error)})
    
    except Exception as e:
        logger.error(f'Error checking pending payments: {str(e)}')
        return jsonify({'error': f'Error checking pending payments: {str(e)}'}), 500

@app.route('/payment/cancel-all-pending', methods=['POST'])
def cancel_all_pending_payments():
    try:
        # Obtener el token de acceso
        access_token = request.json.get('accessToken')
        
        if not access_token:
            logger.error('Missing accessToken')
            return jsonify({'error': 'Missing accessToken'}), 400
        
        # Configurar headers
        user_header = {
            'Authorization': f'Bearer {access_token}'
        }
        
        server_header = {
            'Authorization': f'Key {api_key}'
        }
        
        # 1. Primero intenta obtener la lista de pagos pendientes
        try:
            # Intentar obtener pagos pendientes (la API puede no tener este endpoint)
            payments_url = "https://api.minepi.com/v2/payments/incomplete"
            response = requests.get(payments_url, headers=user_header)
            
            # Si la API responde correctamente
            if response.status_code == 200:
                payments_data = response.json()
                logger.info(f'Found payments to cancel: {payments_data}')
                
                # Cancelar cada pago pendiente
                results = []
                for payment in payments_data:
                    payment_id = payment.get('identifier')
                    if payment_id:
                        cancel_url = f"https://api.minepi.com/v2/payments/{payment_id}/cancel"
                        cancel_response = requests.post(cancel_url, headers=server_header)
                        
                        if cancel_response.status_code == 200:
                            logger.info(f'Successfully cancelled payment {payment_id}')
                            results.append({'id': payment_id, 'status': 'cancelled'})
                        else:
                            logger.error(f'Failed to cancel payment {payment_id}: {cancel_response.text}')
                            results.append({'id': payment_id, 'status': 'error', 'message': cancel_response.text})
                
                return jsonify({'status': 'completed', 'results': results})
            else:
                # API no soporta esta operación, intentar alternativa
                logger.warning(f'API does not support listing incomplete payments: {response.text}')
                
                # Como no podemos obtener la lista, intentamos cancelar un pago específico si se proporciona
                specific_payment_id = request.json.get('specificPaymentId')
                if specific_payment_id:
                    cancel_url = f"https://api.minepi.com/v2/payments/{specific_payment_id}/cancel"
                    cancel_response = requests.post(cancel_url, headers=server_header)
                    
                    if cancel_response.status_code == 200:
                        logger.info(f'Successfully cancelled specific payment {specific_payment_id}')
                        return jsonify({'status': 'completed', 'message': f'Cancelled payment {specific_payment_id}'})
                    else:
                        logger.error(f'Failed to cancel specific payment {specific_payment_id}: {cancel_response.text}')
                        return jsonify({'status': 'error', 'message': f'Failed to cancel payment: {cancel_response.text}'})
                
                # Si no hay un ID específico, informar que no podemos realizar la operación
                return jsonify({'status': 'error', 'error': 'Cannot list or cancel pending payments through API', 'pendingPaymentId': specific_payment_id})
                
        except Exception as api_error:
            logger.error(f'Error cancelling payments through API: {str(api_error)}')
            return jsonify({'status': 'error', 'error': str(api_error)})
    
    except Exception as e:
        logger.error(f'Error in cancel all pending payments: {str(e)}')
        return jsonify({'error': f'Error cancelling payments: {str(e)}'}), 500

# Rutas para el sistema de contador de pagos
@app.route('/api/payment-counter', methods=['GET'])
def get_payment_counter():
    """Obtener el estado actual del contador de pagos"""
    try:
        counter_data = get_counter_summary()
        
        if not counter_data:
            return jsonify({
                'error': 'No se pudo obtener el contador de pagos'
            }), 500
        
        return jsonify({
            'status': 'success',
            'counter': counter_data
        })
    
    except Exception as e:
        logger.error(f'Error al obtener el contador de pagos: {str(e)}')
        return jsonify({
            'error': f'Error al obtener el contador de pagos: {str(e)}'
        }), 500

# Rutas para el juego Simon Dice
@app.route('/api/scores', methods=['POST'])
def save_score():
    """Guardar puntuación del juego (para futura funcionalidad)"""
    try:
        username = request.json.get('username')
        score = request.json.get('score')
        
        if not username or score is None:
            return jsonify({'error': 'Missing username or score'}), 400
        
        logger.info(f'Saving score for {username}: {score}')
        
        # Aquí podrías implementar lógica para guardar puntuaciones en una base de datos
        # Por ahora, solo registramos en el log
        
        return jsonify({'status': 'success', 'message': 'Score saved'})
    
    except Exception as e:
        logger.error(f'Error saving score: {str(e)}')
        return jsonify({'error': f'Error saving score: {str(e)}'}), 500

@app.route('/api/transactions', methods=['POST'])
def get_user_transactions():
    try:
        # Obtener el token de acceso
        access_token = request.json.get('accessToken')
        filter_type = request.json.get('filterType', None)
        
        if not access_token:
            logger.error('No access token provided')
            return jsonify({'error': 'No access token provided'}), 400
        
        # Configurar headers para la petición al usuario
        user_header = {
            'Authorization': f'Bearer {access_token}'
        }
        
        # En un entorno sandbox, simulamos las transacciones almacenadas en localStorage
        # Para producción, se usaría la API real de Pi Network
        try:
            # Intentar consultar transacciones a la API de Pi Network
            # Esta URL puede variar según la documentación actual de Pi
            tx_url = "https://api.minepi.com/v2/transactions"
            response = requests.get(tx_url, headers=user_header)
            
            if response.status_code == 200:
                transactions = response.json()
                logger.info(f'Successfully retrieved {len(transactions)} transactions')
            else:
                # Si la API no está disponible o devuelve error, usamos simulación
                logger.warning(f'Could not get transactions from API: {response.text}')
                # Simulamos transacciones para desarrollo/testing
                transactions = []
        except Exception as api_error:
            logger.error(f'Error getting transactions from API: {str(api_error)}')
            # Simulamos transacciones para desarrollo/testing
            transactions = []
        
        # Filtrar transacciones por tipo si se especifica
        if filter_type and transactions:
            filtered_transactions = []
            for tx in transactions:
                if 'metadata' in tx and 'type' in tx['metadata'] and tx['metadata']['type'] == filter_type:
                    filtered_transactions.append(tx)
            transactions = filtered_transactions
        
        return jsonify(transactions)
    
    except Exception as e:
        logger.error(f'Error getting transactions: {str(e)}')
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/scores/record', methods=['POST'])
def record_score():
    try:
        # Obtener el access token desde el frontend
        access_token = request.json.get('accessToken')
        score = request.json.get('score')
        level = request.json.get('level')
        payment_id = request.json.get('paymentId')

        if not access_token or score is None or level is None:
            logger.error('Missing accessToken, score, or level')
            return jsonify({'error': 'Missing accessToken, score, or level'}), 400

        # Validar el access token con el endpoint /me
        user_header = {'Authorization': f'Bearer {access_token}'}
        response = requests.get("https://api.minepi.com/v2/me", headers=user_header)
        if response.status_code != 200:
            logger.error('Invalid access token')
            return jsonify({'error': 'Invalid access token'}), 401

        user_info = response.json().get('user')
        username = user_info.get('username')
        uid = user_info.get('uid')

        logger.info(f'Recording score for verified user {username} ({uid}): {score} at level {level}')

        # Abrir o crear archivo JSON para almacenar puntuaciones
        scores_file = os.path.join(app.root_path, 'data', 'scores.json')
        os.makedirs(os.path.dirname(scores_file), exist_ok=True)

        # Leer puntuaciones existentes
        if os.path.exists(scores_file):
            with open(scores_file, 'r') as f:
                try:
                    scores = json.load(f)
                except json.JSONDecodeError:
                    scores = []
        else:
            scores = []

        # Crear objeto de puntuación seguro usando uid y username validados
        score_obj = {
            'username': username,
            'uid': uid,
            'score': score,
            'level': level,
            'timestamp': int(time.time() * 1000),
            'paymentId': payment_id,
            'blockchain': request.json.get('blockchain', False)
        }

        scores.append(score_obj)

        # Guardar puntuaciones
        with open(scores_file, 'w') as f:
            json.dump(scores, f)

        return jsonify({
            'status': 'success',
            'message': 'Score recorded successfully',
            'data': score_obj
        })

    except Exception as e:
        logger.error(f'Error recording score: {str(e)}')
        return jsonify({'error': f'Error recording score: {str(e)}'}), 500


@app.route('/api/scores', methods=['GET'])
def get_scores():
    try:
        # Obtener el nombre de usuario desde el query parameter (opcional)
        username_filter = request.args.get('username', None)
        
        # Abrir o crear un archivo JSON para almacenar puntuaciones
        scores_file = os.path.join(app.root_path, 'data', 'scores.json')
        
        # Crear directorio si no existe
        os.makedirs(os.path.dirname(scores_file), exist_ok=True)
        
        # Leer puntuaciones del archivo JSON si existe
        if os.path.exists(scores_file):
            with open(scores_file, 'r') as f:
                try:
                    scores = json.load(f)
                except json.JSONDecodeError:
                    # Si el archivo está corrupto, crear lista vacía
                    scores = []
        else:
            # No hay archivo de puntuaciones, inicializar con lista vacía
            scores = []
        
        # Filtrar por nombre de usuario si se proporciona
        if username_filter:
            scores = [score for score in scores if score.get('username') == username_filter]
        
        # Ordenar por puntuación (de mayor a menor)
        scores.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        return jsonify(scores)
    
    except Exception as e:
        logger.error(f'Error getting scores: {str(e)}')
        return jsonify({'error': f'Error getting scores: {str(e)}'}), 500

if __name__ == '__main__':
    logger.info('Starting Pi Network Basic App')
    app.run(debug=True, port=int(os.getenv('PORT', 8080)))
