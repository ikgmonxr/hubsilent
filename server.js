const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;

// Conexión a MongoDB Atlas usando la variable de entorno de Render
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('¡Conectado exitosamente a MongoDB Atlas!'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Esquema de la Base de Datos para guardar los scripts
const scriptSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Script = mongoose.model('Script', scriptSchema);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ruta para guardar un script y generar su ID único
app.post('/api/save', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    const scriptId = crypto.randomBytes(16).toString('hex');
    
    await Script.create({
      id: scriptId,
      content: code
    });

    res.json({ id: scriptId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta que lee el script desde Roblox cuando ejecutas el loadstring
app.get('/api/script/:id', async (req, res) => {
  try {
    const script = await Script.findOne({ id: req.params.id });
    if (!script) {
      return res.status(404).send('-- Script no encontrado o eliminado');
    }
    res.setHeader('Content-Type', 'text/plain');
    res.send(script.content);
  } catch (err) {
    console.error(err);
    res.status(500).send('-- Error interno del servidor');
  }
});

// Interfaz Web principal (Tu panel visual)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HubSilent - Generador de Loadstring</title>
        <style>
            body {
                background-color: #0f172a;
                color: #f8fafc;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            .container {
                background: #1e293b;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                width: 600px;
                max-width: 90%;
            }
            h2 { margin-top: 0; color: #38bdf8; text-align: center; }
            textarea {
                width: 100%;
                height: 200px;
                background: #0f172a;
                color: #38bdf8;
                border: 1px solid #334155;
                border-radius: 8px;
                padding: 12px;
                font-family: monospace;
                font-size: 14px;
                resize: none;
                box-sizing: border-box;
            }
            button {
                background: #6366f1;
                color: white;
                border: none;
                width: 100%;
                padding: 12px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                margin-top: 15px;
                transition: background 0.2s;
            }
            button:hover { background: #4f46e5; }
            .output-box {
                margin-top: 20px;
                background: #0f172a;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #334155;
                word-break: break-all;
                font-family: monospace;
                font-size: 13px;
                color: #a78bfa;
            }
            label { display: block; margin-top: 15px; font-weight: bold; color: #94a3b8; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>HubSilent - Generador</h2>
            <label>Pega tu script aquí:</label>
            <textarea id="scriptInput" placeholder="print('Hola Roblox!')"></textarea>
            <button onclick="generateLoadstring()">Proteger y Generar Loadstring</button>
            
            <div id="resultContainer" style="display:none;">
                <label>Tu Loadstring:</label>
                <div class="output-box" id="loadstringOutput"></div>
            </div>
        </div>

        <script>
            async function generateLoadstring() {
                const code = document.getElementById('scriptInput').value;
                if (!code) {
                    alert('¡Escribe un script primero!');
                    return;
                }

                try {
                    const response = await fetch('/api/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });

                    const data = await response.json();
                    if (data.id) {
                        const currentOrigin = window.location.origin;
                        const loadstringText = \`loadstring(game:HttpGet("\${currentOrigin}/api/script/\${data.id}"))()\`;
                        
                        const outputDiv = document.getElementById('loadstringOutput');
                        outputDiv.innerText = loadstringText;
                        document.getElementById('resultContainer').style.display = 'block';
                    } else {
                        alert('Error al guardar el script');
                    }
                } catch (err) {
                    console.error(err);
                    alert('Error de conexión con el servidor');
                }
            }
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
