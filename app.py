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
        access_token = request.json.get('accessToken')
        if not access_token:
            logger.error('No access token provided')
            return jsonify({'error': 'No access token provided'}), 400

        # Configurar headers para la petición al usuario
        user_header = {
            'Authorization': f'Bearer {access_token}'
        }

        # Hacer la petición a la API de Pi Network
        wallet_url = "https://api.minepi.com/v2/wallet"
        response = requests.get(wallet_url, headers=user_header)

        if response.status_code != 200:
            logger.error(f'Failed to get wallet info: {response.text}')
            return jsonify({'error': 'Failed to get wallet info'}), 400

        wallet_data = response.json()
        logger.info(f'Successfully retrieved wallet info: {wallet_data}')
        return jsonify(wallet_data)

    except Exception as e:
        logger.error(f'Error getting wallet info: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    logger.info('Starting Pi Network Basic App')
    app.run(debug=True, port=int(os.getenv('PORT', 8080)))
