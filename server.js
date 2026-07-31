const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas exitosamente"))
    .catch((err) => console.error("❌ Error conectando a MongoDB:", err));

// Esquema para la base de datos
const scriptSchema = new mongoose.Schema({
    _id: { 
        type: String, 
        default: () => crypto.randomBytes(16).toString('hex') 
    },
    code: String,
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const ScriptModel = mongoose.model('Script', scriptSchema);

// ==========================================
// 1. PÁGINA WEB PRINCIPAL (INTERFAZ VISUAL)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>HubSilent - Generador de Loadstrings</title>
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .container { background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); width: 450px; display: flex; flex-direction: column; gap: 15px; }
                h2 { margin: 0 0 10px 0; color: #38bdf8; text-align: center; }
                textarea { background: #0f172a; color: #38bdf8; border: 1px solid #334155; border-radius: 6px; padding: 12px; height: 140px; resize: none; font-family: monospace; outline: none; }
                textarea:focus { border-color: #38bdf8; }
                button { background: #22c55e; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
                button:hover { background: #16a34a; }
                input { background: #0f172a; color: #fff; border: 1px solid #334155; border-radius: 6px; padding: 10px; font-family: monospace; outline: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>HubSilent Hub</h2>
                <textarea id="scriptCode" placeholder="Pega tu script de Lua aquí..."></textarea>
                <button onclick="generate()">Generar Loadstring</button>
                <input type="text" id="result" readonly placeholder="Tu loadstring aparecerá aquí...">
            </div>
            <script>
                async function generate() {
                    const code = document.getElementById('scriptCode').value;
                    if(!code) return alert('¡Pega un script primero!');
                    
                    try {
                        const res = await fetch('/api/script', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code })
                        });
                        const data = await res.json();
                        if(data.id) {
                            const loadstring = \`loadstring(game:HttpGet("\${window.location.origin}/api/script/\${data.id}"))()\`;
                            const resultInput = document.getElementById('result');
                            resultInput.value = loadstring;
                            resultInput.select();
                            navigator.clipboard.writeText(loadstring);
                            alert('¡Loadstring generado y copiado al portapapeles!');
                        } else {
                            alert('Error al generar el loadstring');
                        }
                    } catch (e) {
                        alert('Error de conexión con el servidor');
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// ==========================================
// 2. RUTA PARA GUARDAR EL SCRIPT (POST)
// ==========================================
app.post('/api/script', async (req, res) => {
    try {
        const { code, customId } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'No se envió ningún código' });
        }

        const scriptId = customId || crypto.randomBytes(16).toString('hex');
        const newScript = new ScriptModel({ _id: scriptId, code });
        await newScript.save();

        res.json({ id: newScript._id });
    } catch (error) {
        console.error("Error al guardar:", error);
        res.status(500).json({ error: 'Error interno del servidor al guardar' });
    }
});

// ==========================================
// 3. RUTA PARA OBTENER EL LOADSTRING (GET)
// ==========================================
app.get('/api/script/:id', async (req, res) => {
    try {
        const scriptData = await ScriptModel.findById(req.params.id);
        
        if (!scriptData) {
            return res.status(404).send('-- Script no encontrado');
        }

        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptData.code);
    } catch (error) {
        console.error("Error al obtener el script:", error);
        res.status(500).send('-- Error interno del servidor');
    }
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
