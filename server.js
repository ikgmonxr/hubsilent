const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Límite anti-spam
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: '🚫 Demasiadas peticiones. Tranquilo.',
});
app.use('/api/', limiter);

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🔥 Servidor Pro & API Key System Activo"))
    .catch((err) => console.error("❌ Error DB:", err));

// Esquemas de Base de Datos
const scriptSchema = new mongoose.Schema({
    id: { type: String, default: () => crypto.randomBytes(12).toString('hex') },
    name: String,
    code: String,
    createdAt: { type: Date, default: Date.now }
});

const keySchema = new mongoose.Schema({
    key: { type: String, default: () => "IKG-" + crypto.randomBytes(6).toString('hex').toUpperCase() },
    hwid: { type: String, default: null },
    expiresAt: { type: Date, default: () => Date.now() + 7 * 24 * 60 * 60 * 1000 }, // 7 días
    active: { type: Boolean, default: true }
});

const ScriptModel = mongoose.model('HubScript', scriptSchema);
const KeyModel = mongoose.model('HubKey', keySchema);

// ==========================================
// DASHBOARD WEB PRO (UI ESTILO SAAS / HUB)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ikgonavi Hub | Control Center</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
                body { font-family: 'Plus Jakarta Sans', sans-serif; background: #090a0f; color: #f3f4f6; }
                .glass { background: rgba(18, 20, 32, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
                .glow { box-shadow: 0 0 25px -5px rgba(88, 101, 242, 0.3); }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #090a0f; }
                ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
            </style>
        </head>
        <body class="min-h-screen flex flex-col items-center p-4 md:p-8">
            <!-- Header -->
            <header class="w-full max-w-5xl flex justify-between items-center mb-8 glass p-5 rounded-2xl glow">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white">⚡</div>
                    <div>
                        <h1 class="font-bold text-lg text-white">Ikgonavi Security API</h1>
                        <p class="text-xs text-indigo-400">Protección Anti-Dump & Key System Activa</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="switchTab('scripts')" id="btnTabScripts" class="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white transition">Scripts</button>
                    <button onclick="switchTab('keys')" id="btnTabKeys" class="px-4 py-2 rounded-xl text-sm font-semibold bg-zinc-800 text-zinc-400 hover:text-white transition">API Keys</button>
                </div>
            </header>

            <!-- Main Content Container -->
            <main class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <!-- Columna Izquierda: Formularios de Creación -->
                <div class="md:col-span-1 glass p-6 rounded-2xl flex flex-col gap-4 h-fit">
                    <h2 id="panelTitle" class="font-bold text-base text-indigo-300">Crear Nuevo Script</h2>
                    
                    <div id="scriptFormInputs" class="flex flex-col gap-3">
                        <input type="text" id="scriptName" placeholder="Nombre del Script (Ej. Silent Aim)" class="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white outline-none focus:border-indigo-500">
                        <textarea id="scriptCode" placeholder="Pega tu código Lua aquí..." class="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-indigo-300 font-mono h-40 resize-none outline-none focus:border-indigo-500"></textarea>
                        <button onclick="saveScript()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-indigo-600/20">Generar Loadstring</button>
                    </div>

                    <div id="keyFormInputs" class="hidden flex flex-col gap-3">
                        <p class="text-xs text-zinc-400">Genera accesos seguros para bloquear el script a usuarios sin key.</p>
                        <button onclick="generateKey()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-emerald-600/20">Crear Nueva API Key</button>
                    </div>

                    <div class="mt-2">
                        <label class="text-xs text-zinc-400 mb-1 block">Loadstring Generado / Resultado:</label>
                        <input type="text" id="resultOutput" readonly placeholder="Aparecerá aquí..." class="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-emerald-400 font-mono outline-none w-full">
                    </div>
                </div>

                <!-- Columna Derecha: Listados Dinámicos -->
                <div class="md:col-span-2 glass p-6 rounded-2xl flex flex-col gap-4">
                    <div class="flex justify-between items-center">
                        <h3 id="listTitle" class="font-bold text-base text-white">Scripts Registrados</h3>
                        <span id="counterBadge" class="text-xs bg-indigo-950 text-indigo-300 px-3 py-1 rounded-full border border-indigo-800">0 ítems</span>
                    </div>

                    <!-- Lista de Scripts -->
                    <div id="scriptListContainer" class="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                        <p class="text-zinc-500 text-xs text-center py-10">Cargando elementos...</p>
                    </div>

                    <!-- Lista de Keys (Oculta por defecto) -->
                    <div id="keyListContainer" class="hidden flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                        <p class="text-zinc-500 text-xs text-center py-10">Cargando API keys...</p>
                    </div>
                </div>

            </main>

            <script>
                let currentTab = 'scripts';

                function switchTab(tab) {
                    currentTab = tab;
                    const btnScripts = document.getElementById('btnTabScripts');
                    const btnKeys = document.getElementById('btnTabKeys');
                    const scriptInputs = document.getElementById('scriptFormInputs');
                    const keyInputs = document.getElementById('keyFormInputs');
                    const scriptList = document.getElementById('scriptListContainer');
                    const keyList = document.getElementById('keyListContainer');
                    const panelTitle = document.getElementById('panelTitle');
                    const listTitle = document.getElementById('listTitle');

                    if(tab === 'scripts') {
                        btnScripts.className = "px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white transition";
                        btnKeys.className = "px-4 py-2 rounded-xl text-sm font-semibold bg-zinc-800 text-zinc-400 hover:text-white transition";
                        scriptInputs.classList.remove('hidden');
                        keyInputs.classList.add('hidden');
                        scriptList.classList.remove('hidden');
                        keyList.classList.add('hidden');
                        panelTitle.innerText = "Crear Nuevo Script";
                        listTitle.innerText = "Scripts Registrados";
                        loadScripts();
                    } else {
                        btnKeys.className = "px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white transition";
                        btnScripts.className = "px-4 py-2 rounded-xl text-sm font-semibold bg-zinc-800 text-zinc-400 hover:text-white transition";
                        keyInputs.classList.remove('hidden');
                        scriptInputs.classList.add('hidden');
                        keyList.classList.remove('hidden');
                        scriptList.classList.add('hidden');
                        panelTitle.innerText = "Gestión de Licencias";
                        listTitle.innerText = "API Keys Activas";
                        loadKeys();
                    }
                }

                async function loadScripts() {
                    try {
                        const res = await fetch('/api/scripts');
                        const data = await res.json();
                        const container = document.getElementById('scriptListContainer');
                        document.getElementById('counterBadge').innerText = data.length + ' scripts';
                        
                        if(data.length === 0) {
                            container.innerHTML = '<p class="text-zinc-500 text-xs text-center py-10">No hay scripts creados.</p>';
                            return;
                        }

                        container.innerHTML = '';
                        data.forEach(s => {
                            const loadstring = \`loadstring(game:HttpGet('\${window.location.origin}/api/script/\${s.id}?key=TU_API_KEY'))()\`;
                            const card = document.createElement('div');
                            card.className = "bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-xl flex flex-col gap-2";
                            card.innerHTML = \`
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-sm text-indigo-300">\${s.name || 'Sin Nombre'}</span>
                                    <span class="text-[10px] text-zinc-500 font-mono">ID: \${s.id}</span>
                                </div>
                                <div class="flex gap-2 mt-1">
                                    <input type="text" readonly value="\${loadstring}" class="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-400 font-mono w-full outline-none">
                                    <button onclick="navigator.clipboard.writeText(\\\`\${loadstring}\\\`); alert('¡Copiado!');" class="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-semibold">Copiar</button>
                                </div>
                            \`;
                            container.appendChild(card);
                        });
                    } catch(e) { console.error(e); }
                }

                async function loadKeys() {
                    try {
                        const res = await fetch('/api/keys');
                        const data = await res.json();
                        const container = document.getElementById('keyListContainer');
                        document.getElementById('counterBadge').innerText = data.length + ' keys';

                        if(data.length === 0) {
                            container.innerHTML = '<p class="text-zinc-500 text-xs text-center py-10">No hay API keys generadas.</p>';
                            return;
                        }

                        container.innerHTML = '';
                        data.forEach(k => {
                            const card = document.createElement('div');
                            card.className = "bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-xl flex justify-between items-center";
                            card.innerHTML = \`
                                <div>
                                    <div class="font-mono font-bold text-emerald-400 text-sm">\${k.key}</div>
                                    <div class="text-[10px] text-zinc-500">HWID: \${k.hwid || 'No vinculado (Libre)'}</div>
                                </div>
                                <button onclick="navigator.clipboard.writeText('\${k.key}'); alert('¡Key copiada!');" class="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-semibold">Copiar Key</button>
                            \`;
                            container.appendChild(card);
                        });
                    } catch(e) { console.error(e); }
                }

                async function saveScript() {
                    const name = document.getElementById('scriptName').value;
                    const code = document.getElementById('scriptCode').value;
                    if(!code) return alert('¡Pega el código primero!');

                    const res = await fetch('/api/script', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ name, code })
                    });
                    const data = await res.json();
                    if(data.id) {
                        document.getElementById('resultOutput').value = \`loadstring(game:HttpGet('\${window.location.origin}/api/script/\${data.id}?key=TU_API_KEY'))()\`;
                        document.getElementById('scriptCode').value = '';
                        document.getElementById('scriptName').value = '';
                        loadScripts();
                        alert('¡Script creado con éxito!');
                    }
                }

                async function generateKey() {
                    const res = await fetch('/api/key', { method: 'POST' });
                    const data = await res.json();
                    if(data.key) {
                        loadKeys();
                        alert('¡API Key generada con éxito: ' + data.key + ' !');
                    }
                }

                window.onload = loadScripts;
            </script>
        </body>
        </html>
    `);
});

// ==========================================
// API ENDPOINTS (SEGURIDAD Y VALIDACIÓN)
// ==========================================

// Obtener lista de scripts para la UI
app.get('/api/scripts', async (req, res) => {
    const scripts = await ScriptModel.find().sort({ createdAt: -1 });
    res.json(scripts);
});

// Obtener lista de keys para la UI
app.get('/api/keys', async (req, res) => {
    const keys = await KeyModel.find().sort({ _id: -1 });
    res.json(keys);
});

// Crear Script
app.post('/api/script', async (req, res) => {
    const { name, code } = req.body;
    if (!code) return res.status(400).json({ error: 'Falta el código' });
    const newScript = new ScriptModel({ name: name || 'Script Sin Nombre', code });
    await newScript.save();
    res.json({ id: newScript.id });
});

// Crear API Key
app.post('/api/key', async (req, res) => {
    const newKey = new KeyModel();
    await newKey.save();
    res.json({ key: newKey.key });
});

// RUTA DE ENTREGA BLINDADA CON VALIDACIÓN DE API KEY + ANTI-DUMP 100 LÍNEAS
app.get('/api/script/:id', async (req, res) => {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const clientKey = req.query.key; // El usuario pasa la key por parámetro en el loadstring (?key=XYZ)

    const isBrowser = /chrome|firefox|safari|edg|opera|msie|trident/i.test(userAgent) && !userAgent.includes('roblox');
    const isDiscordBot = userAgent.includes('discordbot');
    const isScraperTool = /python|axios|node-fetch|curl|wget|postman|bot|crawler|spider|scraper/i.test(userAgent);

    if (isBrowser || isDiscordBot || isScraperTool) {
        return res.status(403).send('-- ACCESO DENEGADO: Protegido contra dumpers y bots.');
    }

    // 1. Validar si la API Key existe y está activa
    if (!clientKey) {
        return res.status(401).send('-- ERROR: Se requiere una API Key válida para ejecutar este script.');
    }

    const validKey = await KeyModel.findOne({ key: clientKey, active: true });
    if (!validKey) {
        return res.status(403).send('-- ERROR: API Key inválida, expirada o bloqueada.');
    }

    try {
        const scriptData = await ScriptModel.findOne({ id: req.params.id });
        if (!scriptData) {
            return res.status(404).send('-- Script no encontrado');
        }

        // 2. Generar relleno masivo anti-dump (100 líneas de ruido basura)
        let junkPadding = `-- [SECURED BY IKGMONXR - API LICENSE SYSTEM]\n`;
        for (let i = 1; i <= 100; i++) {
            junkPadding += `-- Junk Data Node ${i}: local _securityToken_${i} = "${Math.random().toString(36).substring(7)}"\n`;
        }
        junkPadding += `\n-- [INICIO DE EJECUCIÓN AUTORIZADA]\n`;

        const finalProtectedCode = junkPadding + "\n" + scriptData.code;

        res.setHeader('Content-Type', 'text/plain');
        res.send(finalProtectedCode);
    } catch (error) {
        console.error("Error al entregar script:", error);
        res.status(500).send('-- Error interno del servidor');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🛡️ Panel Cyberpunk y Sistema de API en puerto ${PORT}`);
});
