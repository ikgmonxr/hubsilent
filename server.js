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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Límite anti-spam para creación
const createLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: '🚫 Demasiadas peticiones. Intenta más tarde.',
});
app.post('/api/script', createLimiter);

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas - HubSilent Blindado Activo"))
    .catch((err) => console.error("❌ Error de conexión a DB:", err));

const scriptSchema = new mongoose.Schema({
    id: { 
        type: String, 
        default: () => crypto.randomBytes(16).toString('hex') 
    },
    code: String,
    createdAt: { type: Date, default: Date.now }
});

const ScriptModel = mongoose.model('PublicScript', scriptSchema);

// ==========================================
// 1. PÁGINA WEB PRINCIPAL (PANEL DE CONTROL)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>HubSilent - Panel Blindado</title>
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                .main-container { display: flex; gap: 20px; width: 900px; max-width: 100%; flex-wrap: wrap; justify-content: center; }
                .card { background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); width: 420px; display: flex; flex-direction: column; gap: 12px; }
                h2, h3 { margin: 0 0 5px 0; color: #38bdf8; text-align: center; }
                p { font-size: 11px; color: #94a3b8; text-align: center; margin: 0; }
                textarea { background: #0f172a; color: #38bdf8; border: 1px solid #334155; border-radius: 6px; padding: 10px; height: 120px; resize: none; font-family: monospace; outline: none; }
                textarea:focus { border-color: #38bdf8; }
                button { background: #22c55e; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
                button:hover { background: #16a34a; }
                .btn-cancel { background: #ef4444; display: none; }
                .btn-cancel:hover { background: #dc2626; }
                input { background: #0f172a; color: #fff; border: 1px solid #334155; border-radius: 6px; padding: 8px; font-family: monospace; outline: none; font-size: 11px; }
                .script-list { max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 5px; }
                .script-item { background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155; display: flex; flex-direction: column; gap: 6px; }
                .script-info { font-size: 11px; color: #38bdf8; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .script-actions { display: flex; gap: 6px; }
                .script-actions button { flex: 1; padding: 6px; font-size: 11px; }
                .btn-edit { background: #3b82f6; }
                .btn-edit:hover { background: #2563eb; }
            </style>
        </head>
        <body>
            <div class="main-container">
                <!-- FORMULARIO -->
                <div class="card">
                    <h2 id="formTitle">Crear Loadstring</h2>
                    <p id="formSubtitle">Protegido con marca de agua y anti-dump</p>
                    <textarea id="scriptCode" placeholder="Pega tu código de Lua aquí..."></textarea>
                    <button id="saveBtn" onclick="saveScript()">Generar Loadstring</button>
                    <button id="cancelBtn" class="btn-cancel" onclick="resetForm()">Cancelar Edición</button>
                    <input type="text" id="result" readonly placeholder="Tu loadstring aparecerá aquí...">
                </div>

                <!-- MIS SCRIPTS -->
                <div class="card">
                    <h3>Mis Scripts Creados</h3>
                    <p>Gestiona, edita o copia tus scripts guardados</p>
                    <div class="script-list" id="scriptList">
                        <p style="color: #64748b; margin-top: 20px;">No hay scripts guardados.</p>
                    </div>
                </div>
            </div>

            <script>
                let editingId = null;
                window.onload = loadLocalScripts;

                function getLocalScripts() {
                    return JSON.parse(localStorage.getItem('my_hubsilent_scripts') || '[]');
                }

                function saveLocalScripts(scripts) {
                    localStorage.setItem('my_hubsilent_scripts', JSON.stringify(scripts));
                }

                async function saveScript() {
                    const code = document.getElementById('scriptCode').value;
                    if(!code) return alert('¡Pega un script primero!');

                    if (editingId) {
                        try {
                            const res = await fetch('/api/script/' + editingId, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code })
                            });
                            const data = await res.json();
                            if(data.success) {
                                let scripts = getLocalScripts();
                                let script = scripts.find(s => s.id === editingId);
                                if(script) script.code = code;
                                saveLocalScripts(scripts);

                                alert('¡Script actualizado con éxito!');
                                resetForm();
                                loadLocalScripts();
                            } else {
                                alert('Error al actualizar');
                            }
                        } catch(e) {
                            alert('Error de conexión');
                        }
                    } else {
                        try {
                            const res = await fetch('/api/script', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code })
                            });
                            const data = await res.json();
                            if(data.id) {
                                const loadstring = \`-- protect by ikgmonxr lol haahaha\\nloadstring(game:HttpGet('\${window.location.origin}/api/script/\${data.id}'))()\`;
                                
                                let scripts = getLocalScripts();
                                scripts.unshift({ id: data.id, code: code, loadstring: loadstring });
                                saveLocalScripts(scripts);

                                document.getElementById('result').value = loadstring;
                                document.getElementById('scriptCode').value = '';
                                loadLocalScripts();
                                alert('¡Loadstring generado con éxito!');
                            } else {
                                alert('Error al generar');
                            }
                        } catch (e) {
                            alert('Error de conexión');
                        }
                    }
                }

                function loadLocalScripts() {
                    const listContainer = document.getElementById('scriptList');
                    const scripts = getLocalScripts();
                    if(scripts.length === 0) {
                        listContainer.innerHTML = '<p style="color: #64748b; margin-top: 20px;">No hay scripts guardados.</p>';
                        return;
                    }
                    listContainer.innerHTML = '';
                    scripts.forEach(s => {
                        const item = document.createElement('div');
                        item.className = 'script-item';
                        item.innerHTML = \`
                            <div class="script-info">ID: /api/script/\${s.id}</div>
                            <div class="script-actions">
                                <button class="btn-edit" onclick="startEdit('\${s.id}')">Editar</button>
                                <button onclick="copyLoadstring(\`\${s.loadstring}\`)">Copiar</button>
                            </div>
                        \`;
                        listContainer.appendChild(item);
                    });
                }

                function startEdit(id) {
                    const scripts = getLocalScripts();
                    const script = scripts.find(s => s.id === id);
                    if(!script) return;
                    editingId = id;
                    document.getElementById('scriptCode').value = script.code;
                    document.getElementById('result').value = script.loadstring;
                    document.getElementById('formTitle').innerText = 'Editar Script';
                    document.getElementById('formSubtitle').innerText = 'Modificando script existente';
                    document.getElementById('saveBtn').innerText = 'Guardar Cambios';
                    document.getElementById('cancelBtn').style.display = 'block';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }

                function resetForm() {
                    editingId = null;
                    document.getElementById('scriptCode').value = '';
                    document.getElementById('result').value = '';
                    document.getElementById('formTitle').innerText = 'Crear Loadstring';
                    document.getElementById('formSubtitle').innerText = 'Protegido con marca de agua y anti-dump';
                    document.getElementById('saveBtn').innerText = 'Generar Loadstring';
                    document.getElementById('cancelBtn').style.display = 'none';
                }

                function copyLoadstring(text) {
                    navigator.clipboard.writeText(text);
                    alert('¡Loadstring copiado!');
                }
            </script>
        </body>
        </html>
    `);
});

// ==========================================
// 2. RUTA PARA GUARDAR (POST)
// ==========================================
app.post('/api/script', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Falta el código' });
        const newScript = new ScriptModel({ code });
        await newScript.save();
        res.json({ id: newScript.id });
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==========================================
// 3. RUTA PARA EDITAR (PUT)
// ==========================================
app.put('/api/script/:id', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Falta el código' });
        const updated = await ScriptModel.findOneAndUpdate({ id: req.params.id }, { code }, { new: true });
        if (!updated) return res.status(404).json({ error: 'No encontrado' });
        res.json({ success: true, id: updated.id });
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==========================================
// 4. RUTA DE ENTREGA BLINDADA (CON 100 LÍNEAS ANTI-DUMP)
// ==========================================
app.get('/api/script/:id', async (req, res) => {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    
    const isBrowser = /chrome|firefox|safari|edg|opera|msie|trident/i.test(userAgent) && !userAgent.includes('roblox');
    const isDiscordBot = userAgent.includes('discordbot');
    const isScraperTool = /python|axios|node-fetch|curl|wget|postman|bot|crawler|spider|scraper/i.test(userAgent);

    if (isBrowser || isDiscordBot || isScraperTool) {
        return res.status(403).send('-- ACCESO DENEGADO: Protegido contra dumpers y bots.');
    }

    try {
        const scriptData = await ScriptModel.findOne({ id: req.params.id });
        
        if (!scriptData) {
            return res.status(404).send('-- Script no encontrado');
        }

        // Generar relleno masivo (100 líneas de basura anti-dump)
        let junkPadding = "-- [PROTECTED BY IKGMONXR - ANTI-DUMP SYSTEM]\n";
        for (let i = 1; i <= 100; i++) {
            junkPadding += `-- Junk Line ${i}: local _fakeData_${i} = "${Math.random().toString(36).substring(7)}"\n`;
        }
        junkPadding += "\n-- [INICIO DEL SCRIPT REAL]\n";

        const finalProtectedCode = junkPadding + "\n" + scriptData.code;

        res.setHeader('Content-Type', 'text/plain');
        res.send(finalProtectedCode);
    } catch (error) {
        console.error("Error al obtener el script:", error);
        res.status(500).send('-- Error interno del servidor');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🛡️ Servidor completo anti-dump activo en el puerto ${PORT}`);
});
