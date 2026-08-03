const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Límite estricto anti-bots
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: '🚫 Demasiadas peticiones. IP bloqueada.',
});
app.use('/api/script/', limiter);

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas"))
    .catch((err) => console.error("❌ Error de conexión:", err));

const scriptSchema = new mongoose.Schema({
    id: { 
        type: String, 
        default: () => crypto.randomBytes(16).toString('hex') 
    },
    code: String,
    createdAt: { type: Date, default: Date.now, expires: 60 } // Se borra solo de MongoDB en 60 segundos si no se usa
});

const ScriptModel = mongoose.model('Script', scriptSchema);

// ==========================================
// 1. PÁGINA WEB (INTERFAZ)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>HubSilent - Secure Gen</title>
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .container { background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); width: 450px; display: flex; flex-direction: column; gap: 15px; }
                h2 { margin: 0 0 10px 0; color: #38bdf8; text-align: center; }
                textarea { background: #0f172a; color: #38bdf8; border: 1px solid #334155; border-radius: 6px; padding: 12px; height: 140px; resize: none; font-family: monospace; outline: none; }
                button { background: #22c55e; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; }
                button:hover { background: #16a34a; }
                input { background: #0f172a; color: #fff; border: 1px solid #334155; border-radius: 6px; padding: 10px; font-family: monospace; outline: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>HubSilent Secure</h2>
                <textarea id="scriptCode" placeholder="Pega tu script ofuscado aquí..."></textarea>
                <button onclick="generate()">Generar Loadstring Seguro</button>
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
                            alert('¡Loadstring generado! Solo funcionará UNA VEZ al ejecutarse.');
                        } else {
                            alert('Error al generar');
                        }
                    } catch (e) {
                        alert('Error de conexión');
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// ==========================================
// 2. GUARDAR SCRIPT (POST)
// ==========================================
app.post('/api/script', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Sin código' });

        const scriptId = crypto.randomBytes(16).toString('hex');
        const newScript = new ScriptModel({ id: scriptId, code });
        await newScript.save();

        res.json({ id: newScript.id });
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==========================================
// 3. OBTENER Y DESTRUIR SCRIPT (GET - BURN ON READ)
// ==========================================
app.get('/api/script/:id', async (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isBrowser = /chrome|firefox|safari|edg|opera|msie|trident/i.test(userAgent) && !userAgent.includes('Roblox');

    if (isBrowser) {
        return res.status(403).send('ACCESO DENEGADO: Solo ejecutores de Roblox permitidos.');
    }

    try {
        // Busca el script y ELÍMINALO de inmediato de la base de datos para que nadie más pueda descargarlo
        const scriptData = await ScriptModel.findOneAndDelete({ id: req.params.id });
        
        if (!scriptData) {
            return res.status(404).send('-- Error: Este enlace ya expiró, fue utilizado o no existe.');
        }

        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptData.code);
    } catch (error) {
        res.status(500).send('-- Error interno del servidor');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor blindado en puerto ${PORT}`);
});
