# Pi Network Basic App

Una aplicación básica que muestra la información del usuario en Pi Network.

## Requisitos

- Python 3.8+
- pip
- Flask
- Flask-Bootstrap
- python-dotenv
- requests
- simplejson

## Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/BasicPi.git
cd BasicPi
```

2. Instala las dependencias:
```bash
pip install -r requirements.txt
```

3. Configura las variables de entorno:
- Crea un archivo `.env` en la raíz del proyecto
- Agrega las siguientes variables:
```
# Pi Network API Key (Required)
PI_API_KEY=tu_api_key_aqui

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=1
FLASK_SECRET_KEY=tu_secret_key_aqui

# App Configuration
APP_NAME=Nombre de tu App
APP_DESCRIPTION=Descripción de tu App
APP_NETWORK=Pi Testnet

# Development URL (must match with Developer Portal)
DEVELOPMENT_URL=http://localhost:8080
```

4. Configura la aplicación en el Developer Portal:
- Ve a `develop.pi` en el Pi Browser
- Registra una nueva aplicación
- Selecciona "Pi Testnet" como red
- Configura la URL de desarrollo como `http://localhost:8080`

5. Ejecuta la aplicación:
```bash
python app.py
```

La aplicación estará disponible en `http://localhost:8080`

## Funcionalidades

- Autenticación con Pi Network
- Muestra el nombre de usuario
- Muestra el balance de la wallet
- Interfaz responsive
- Manejo de errores
- Logging detallado

## Uso

1. Configura la aplicación en el Developer Portal
2. Obtén el código de autorización del Sandbox
3. Abre la aplicación en tu navegador
4. Haz clic en "Conectar con Pi Network (Sandbox)"
5. La aplicación mostrará tu nombre de usuario y balance de Pi

## Notas

- La aplicación está configurada para funcionar en modo Sandbox
- Asegúrate de tener una wallet de testnet antes de usar la aplicación
- La aplicación usa Bootstrap 5 para el diseño responsivo
- Mantén tu API Key segura y nunca la compartas
