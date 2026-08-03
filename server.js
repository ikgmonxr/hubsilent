const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Confiar en el proxy de Render
app.set('trust proxy', 1);

// Cabeceras de seguridad avanzadas con Helmet
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Límite de peticiones ultra estricto anti-fuerza bruta (Máximo 5 peticiones cada 15 minutos por IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: '🚫 IP bloqueada por actividad sospechosa o intentos de fuerza bruta.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Aplicar limitador únicamente a las rutas de API
app.use('/api/', limiter);

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas con seguridad máxima"))
    .catch((err) => console.error("❌ Error de conexión a DB:", err));

// Esquema avanzado con Token de seguridad único y expiración automática
const scriptSchema = new mongoose.Schema({
    id: { 
        type: String, 
        default: () => crypto.randomBytes(16).toString('hex') 
    },
    downloadToken: {
        type: String,
        default: () => crypto.randomBytes(32).toString('hex')
    },
    code: String,
    createdAt: { type: Date, default: Date.now, expires: 60 } // Se autodestruye en MongoDB si pasa 1 minuto sin usarse
});

const ScriptModel = mongoose.model('SecureScript', scriptSchema);

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
            <title>HubSilent - Secure Generation</title>
            <style>
                body { background: #05050a; color: #f8fafc; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .container { background: #0f172a; padding: 30px; border: 1px solid #1e293b; border-radius: 12px; box-shadow: 0 0 30px rgba(56, 189, 248, 0.1); width: 480px; display: flex; flex-direction: column; gap: 15px; }
                h2 { margin: 0 0 5px 0; color: #38bdf8; text-align: center; letter-spacing: 2px; }
                p { font-size: 11px; color: #64748b; text-align: center; margin: 0 0 10px 0; }
                textarea { background: #020617; color: #38bdf8; border: 1px solid #334155; border-radius: 6px; padding: 12px; height: 140px; resize: none; outline: none; }
                textarea:focus { border-color: #38bdf8; }
                button { background: #0284c7; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
                button:hover { background: #0369a1; }
                input { background: #020617; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 10px; outline: none; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>HUBSILENT SHIELD</h2>
                <p>Sistema de Loadstrings Blindados de Un Solo Uso</p>
                <textarea id="scriptCode" placeholder="Pega tu script de Lua (recomendado ofuscado)..."></textarea>
                <button onclick="generate()">Generar Loadstring Criptográfico</button>
                <input type="text" id="result" readonly placeholder="Tu loadstring protegido aparecerá aquí...">
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
                        if(data.id && data.token) {
                            const loadstring = \`loadstring(game:HttpGet("\${window.location.origin}/api/script/\${data.id}?token=\${data.token}"))()\`;
                            const resultInput = document.getElementById('result');
                            resultInput.value = loadstring;
                            resultInput.select();
                            navigator.clipboard.writeText(loadstring);
                            alert('¡Protección aplicada! Este loadstring se autodestruirá tras su primera ejecución.');
                        } else {
                            alert('Error al generar la seguridad');
                        }
                    } catch (e) {
                        alert('Error de conexión con el servidor blindado');
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// ==========================================
// 2. RUTA PARA GUARDAR Y FIRMAR EL SCRIPT (POST)
// ==========================================
app.post('/api/script', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'No se envió código' });
        }

        const newScript = new ScriptModel({ code });
        await newScript.save();

        // Devuelve tanto el ID como el Token secreto requerido para la descarga
        res.json({ id: newScript.id, token: newScript.downloadToken });
    } catch (error) {
        console.error("Error al guardar:", error);
        res.status(500).json({ error: 'Error interno de cifrado' });
    }
});

// ==========================================
// 3. RUTA BLINDADA DE DESCARGA (GET - BURN ON READ + TOKEN)
// ==========================================
app.get('/api/script/:id', async (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const clientToken = req.query.token;

    // Bloquear navegadores web comunes
    const isBrowser = /chrome|firefox|safari|edg|opera|msie|trident/i.test(userAgent) && !userAgent.includes('Roblox');

    if (isBrowser) {
        return res.status(403).send('ACCESO DENEGADO: Este recurso requiere un cliente de ejecución autorizado en Roblox.');
    }

    // Exigir que traiga el token criptográfico correcto adjunto en la URL
    if (!clientToken) {
        return res.status(401).send('-- Error de Autenticación: Token de acceso faltante.');
    }

    try {
        // BUSCAR Y DESTRUIR AL INSTANTE (Burn-on-Read estricto por ID y Token)
        const scriptData = await ScriptModel.findOneAndDelete({ 
            id: req.params.id, 
            downloadToken: clientToken 
        });
        
        if (!scriptData) {
            return res.status(404).send('-- Error Crítico: Enlace inválido, expirado, ya utilizado o token incorrecto.');
        }

        // Entregar el código en texto plano de forma limpia al exploit
        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptData.code);
    } catch (error) {
        console.error("Error en la entrega del script:", error);
        res.status(500).send('-- Error interno del servidor blindado');
    }
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🛡️ Servidor blindado activo en el puerto ${PORT}`);
});
