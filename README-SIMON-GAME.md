# Simon Dice para Pi Network

## Resumen de la Implementación

Hemos integrado el clásico juego "Simon Dice" en tu aplicación Pi Network BasicPi, permitiendo a los usuarios jugar después de autenticarse con su cuenta de Pi. Esta implementación incluye todas las funcionalidades básicas del juego y una integración completa con la API de Pi Network.

## Estructura de los Archivos

1. **Nuevas Rutas en app.py**
   - `/simon` - Muestra la página del juego
   - `/api/scores` - Endpoint para guardar puntuaciones (preparado para futuras funcionalidades)

2. **Nuevos Archivos HTML**
   - `templates/simon.html` - Interfaz del juego

3. **Nuevos Archivos CSS**
   - `static/css/simon.css` - Estilos para el juego

4. **Nuevos Archivos JavaScript**
   - `static/js/simon.js` - Lógica del juego y manejo de pagos

5. **Archivos de Sonido**
   - `static/sounds/` - Directorio para los sonidos del juego
   - `static/sounds/audio-creator.js` - Script para generar los sonidos (referencia)

## Funcionalidades Implementadas

1. **Flujo de Autenticación**
   - Autenticación con Pi Network
   - Almacenamiento de la sesión en localStorage
   - Redirección automática al juego después de iniciar sesión

2. **Juego Simon Dice**
   - Tablero con cuatro botones de colores (verde, rojo, amarillo, azul)
   - Generación de secuencias aleatorias
   - Efectos visuales y auditivos
   - Sistema de puntuación
   - Aumento progresivo de la dificultad

3. **Integración con Pi Network**
   - Visualización de información del usuario (nombre y balance)
   - Sistema de donaciones mediante pagos de Pi
   - Puntos adicionales al realizar donaciones
   - Manejo completo del flujo de pagos

## Cómo Probar el Juego

1. **Iniciar la aplicación Flask**
   ```bash
   python app.py
   ```

2. **Acceder a la aplicación**
   - Abre tu navegador y ve a `http://localhost:8080`
   - Haz clic en "Conectar con Pi Network (Sandbox)"
   - Se te redirigirá automáticamente al juego después de autenticar

3. **Jugar a Simon Dice**
   - Haz clic en el botón "INICIO" para comenzar
   - Observa la secuencia de colores
   - Repite la secuencia haciendo clic en los botones
   - Gana puntos por cada secuencia correcta
   - El juego se vuelve más difícil a medida que avanzas

4. **Donaciones**
   - Puedes hacer clic en "Donar 1 Pi" para hacer una donación
   - Esto iniciará el flujo de pago de Pi Network
   - Al completar la donación, ganarás 100 puntos adicionales

## Notas para Desarrolladores

### Archivos de Sonido
El juego está configurado para usar archivos MP3 para los sonidos, pero también incluye una alternativa usando la API Web Audio en caso de que los archivos no estén disponibles. Para un funcionamiento óptimo, deberías crear archivos de sonido con los siguientes nombres:

- `green.mp3` - Do (C4) - 261.63 Hz
- `red.mp3` - Mi (E4) - 329.63 Hz
- `yellow.mp3` - Sol (G4) - 392.00 Hz
- `blue.mp3` - Do (C5) - 523.25 Hz
- `wrong.mp3` - La (A2) - 110.00 Hz

Puedes usar cualquier herramienta de generación de audio para crear estos archivos y colocarlos en el directorio `static/sounds/`.

### Futuras Mejoras
Esta implementación es funcional pero básica. Algunas mejoras que podrías considerar:

1. **Base de Datos de Puntuaciones**
   - Implementar un sistema de guardado de puntuaciones altas
   - Agregar una tabla de clasificación

2. **Modos de Juego**
   - Añadir diferentes modos (clásico, rápido, desafío)
   - Implementar niveles con velocidades diferentes

3. **Efectos Visuales y Auditivos Mejorados**
   - Mejorar la animación y el diseño
   - Agregar más efectos sonoros

4. **Recompensas con Pi**
   - Implementar un sistema donde los jugadores puedan ganar Pi por logros
   - Crear un sistema de torneos con premios

## Solución de Problemas

### El juego no reproduce sonidos
- Asegúrate de que tu navegador tenga permiso para reproducir audio
- Verifica que los archivos de sonido existan en la carpeta correspondiente
- El juego usará la API Web Audio como alternativa si los archivos no están disponibles

### Problemas con la autenticación de Pi Network
- Asegúrate de que tu aplicación esté correctamente registrada en el Developer Portal
- Verifica que la URL de la aplicación coincida con la configurada en el Developer Portal
- Comprueba que el Sandbox esté habilitado para pruebas

### Errores en los pagos
- Verifica que tu API Key de Pi Network sea válida
- Asegúrate de estar en el entorno Sandbox para las pruebas
- Revisa los registros de la aplicación para más detalles sobre los errores

## Conclusión

El juego Simon Dice es una adición divertida e interactiva a tu aplicación Pi Network. Demuestra el uso de las API de autenticación y pagos de Pi, al tiempo que proporciona una experiencia de juego entretenida para los usuarios. Esta implementación sirve como base para futuras mejoras y funcionalidades adicionales.
