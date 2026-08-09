const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
app.set('trust proxy', 1);

// ====================== CONFIGURACIÓN ======================
const PANEL_PASSWORD = "aleme2027";
const PORT = process.env.PORT || 3000;

// ====================== SEGURIDAD ======================
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 25, message: '🚫 Demasiadas peticiones.', standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);

const scriptLimiter = rateLimit({ windowMs: 60 * 1000, max: 8, message: '-- Rate limit exceeded' });

// ====================== BASE DE DATOS ======================
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://yarishdz2_db_user:7cp3VZH9aXK77wX@ikgmxer.8tj7kfa.mongodb.net/hubsilent?appName=ikgmxer")
    .then(() => console.log("🔥 Ikgonavi Hub Pro - Blindado Activo"))
    .catch((err) => console.error("❌ Error DB:", err));

const scriptSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: String,
    code: String,
    createdAt: { type: Date, default: Date.now }
});

const ScriptModel = mongoose.model('HubScript', scriptSchema);

// ====================== FUNCIONES ======================
function strongObfuscate(rawCode) {
    const encoded = Buffer.from(rawCode, 'utf8').toString('base64');
    const v = () => '_' + crypto.randomBytes(4).toString('hex');
    const vars = { data: v(), decode: v(), result: v(), temp1: v(), temp2: v() };
    let junk = "";
    for (let i = 0; i < 40; i++) junk += `local ${v()} = "${crypto.randomBytes(8).toString('hex')}"\n`;

    return `-- [IKGONAVI HUB PRO - PROTECTION]\n${junk}\nlocal ${vars.data} = "${encoded}"\nlocal function ${vars.decode}(data)\n    if type(base64_decode) == "function" then return base64_decode(data) end\n    if crypt and crypt.base64 and crypt.base64.decode then return crypt.base64.decode(data) end\n    local b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'\n    data = string.gsub(data, '[^'..b..'=]', '')\n    return (data:gsub('.', function(x)\n        if (x == '=') then return '' end\n        local r, f = '', (b:find(x) - 1)\n        for i = 6, 1, -1 do r = r .. (f % 2^i - f % 2^(i-1) > 0 and '1' or '0') end\n        return r\n    end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)\n        if (#x ~= 8) then return '' end\n        local c = 0\n        for i = 1, 8 do c = c + (x:sub(i, i) == '1' and 2^(8-i) or 0) end\n        return string.char(c)\n    end))\nend\nlocal ${vars.result} = ${vars.decode}(${vars.data})\nlocal ${vars.temp1}, ${vars.temp2} = pcall(loadstring, ${vars.result})\nif ${vars.temp1} and ${vars.temp2} then ${vars.temp2}() else error("Failed to load") end`.trim();
}

function requirePanelAuth(req, res, next) {
    const password = req.headers['x-panel-password'] || req.body?.password;
    if (password !== PANEL_PASSWORD) return res.status(401).json({ error: 'No autorizado' });
    next();
}

// ====================== RUTAS API ======================
app.get('/api/scripts', requirePanelAuth, async (req, res) => {
    try { const scripts = await ScriptModel.find({}, { code: 0 }).sort({ createdAt: -1 }); res.json(scripts); } catch { res.json([]); }
});

app.post('/api/script', requirePanelAuth, async (req, res) => {
    try {
        const { name, code } = req.body;
        const newScript = new ScriptModel({ id: crypto.randomBytes(16).toString('hex'), name: name || 'Script', code: strongObfuscate(code) });
        await newScript.save();
        res.json({ id: newScript.id });
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/scripts/restore', requirePanelAuth, async (req, res) => {
    try {
        await ScriptModel.deleteMany({});
        const defaults = [
            { id: "34e93f16f26764708ccb5c63e2372341", name: "Script Restaurado 1", code: "-- Codigo 1" },
            { id: "7752d53d155a5d26715209fab1438cd9", name: "Script Restaurado 2", code: "-- Codigo 2" }
        ];
        await ScriptModel.insertMany(defaults.map(s => ({ id: s.id, name: s.name, code: strongObfuscate(s.code) })));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.delete('/api/scripts/wipe', requirePanelAuth, async (req, res) => {
    await ScriptModel.deleteMany({});
    res.json({ success: true });
});

app.delete('/api/script/:id', requirePanelAuth, async (req, res) => {
    await ScriptModel.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
});

app.get('/api/script/:id', scriptLimiter, async (req, res) => {
    const scriptData = await ScriptModel.findOne({ id: req.params.id });
    if (!scriptData) return res.status(404).send('-- Not Found');
    res.setHeader('Content-Type', 'text/plain');
    res.send(scriptData.code);
});

// ====================== FRONTEND ======================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Ikgonavi Hub Pro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { background: #090a0f; color: white; font-family: sans-serif; }</style>
</head>
<body class="p-8">
    <div id="loginScreen" class="max-w-md mx-auto bg-zinc-900 p-6 rounded-xl">
        <h1 class="text-xl font-bold mb-4">Ikgonavi Hub Pro</h1>
        <input type="password" id="p" placeholder="Contraseña" class="w-full bg-black p-2 rounded mb-2">
        <button onclick="login()" class="w-full bg-indigo-600 p-2 rounded">Entrar</button>
    </div>
    <div id="mainPanel" class="hidden max-w-4xl mx-auto">
        <header class="flex justify-between mb-6">
            <h1 class="text-xl font-bold">Panel de Control</h1>
            <div class="flex gap-2">
                <button onclick="restore()" class="bg-emerald-800 px-3 py-1 rounded text-xs">🔄 Restaurar IDs</button>
                <button onclick="logout()" class="bg-zinc-800 px-3 py-1 rounded text-xs">Salir</button>
            </div>
        </header>
        <div id="list" class="space-y-4"></div>
    </div>
    <script>
        let pass = localStorage.getItem('pass');
        function login() { pass = document.getElementById('p').value; localStorage.setItem('pass', pass); location.reload(); }
        function logout() { localStorage.removeItem('pass'); location.reload(); }
        async function load() {
            const r = await fetch('/api/scripts', { headers: { 'x-panel-password': pass } });
            const s = await r.json();
            document.getElementById('list').innerHTML = s.map(x => \`<div class="bg-zinc-900 p-4 rounded">\${x.name} <br> <code class="text-xs text-indigo-400">/api/script/\${x.id}</code></div>\`).join('');
        }
        async function restore() { if(confirm('¿Restaurar?')) { await fetch('/api/scripts/restore', { method:'POST', headers:{'x-panel-password': pass} }); load(); } }
        if(pass) { document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('mainPanel').classList.remove('hidden'); load(); }
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => console.log(`🚀 Servidor en ${PORT}`));
