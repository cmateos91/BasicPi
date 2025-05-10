from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_bootstrap import Bootstrap
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import simplejson as json
import logging

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
        
        return jsonify(completion_result)
    
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

if __name__ == '__main__':
    logger.info('Starting Pi Network Basic App')
    app.run(debug=True, port=int(os.getenv('PORT', 8080)))
