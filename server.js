const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a MongoDB (Usa la variable de entorno que configuramos en Render)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas exitosamente"))
    .catch((err) => console.error("❌ Error conectando a MongoDB:", err));

// Esquema y Modelo de la base de datos para los scripts
const scriptSchema = new mongoose.Schema({
    code: String,
    createdAt: { type: Date, default: Date.now }
});
const ScriptModel = mongoose.model('Script', scriptSchema);

// Servir los archivos estáticos de tu página web (HTML, CSS, JS)
// Asume que tu index.html y otros archivos de la web están en la misma carpeta raíz o en una carpeta 'public'
app.use(express.static(__dirname)); 

// ==========================================
// 1. RUTA PARA GUARDAR EL SCRIPT (POST)
// ==========================================
app.post('/api/script', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'No se envió ningún código' });
        }

        // Crea y guarda el nuevo script en la base de datos
        const newScript = new ScriptModel({ code });
        await newScript.save();

        // Devuelve el ID para que tu página web genere el enlace del loadstring
        res.json({ id: newScript._id });
    } catch (error) {
        console.error("Error al guardar:", error);
        res.status(500).json({ error: 'Error interno del servidor al guardar en MongoDB' });
    }
});

// ==========================================
// 2. RUTA PARA EJECUTAR EL LOADSTRING (GET)
// ==========================================
app.get('/api/script/:id', async (req, res) => {
    // Detectamos desde dónde están abriendo el enlace
    const userAgent = req.headers['user-agent'] || '';

    // Si es un navegador web (Chrome, Edge, Safari, Firefox, Opera, etc.), bloqueamos el acceso
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari') || userAgent.includes('Edge')) {
        return res.status(403).send('🚫 Acceso denegado: No tienes permiso para ver esto. Este loadstring solo puede ejecutarse mediante un exploit dentro de Roblox.');
    }

    // Si pasa la seguridad (es Roblox), buscamos el script
    try {
        const scriptData = await ScriptModel.findById(req.params.id);
        
        if (!scriptData) {
            return res.status(404).send('-- Script no encontrado o eliminado');
        }

        // Enviamos el código en texto plano para que el exploit de Roblox lo pueda ejecutar
        res.setHeader('Content-Type', 'text/plain');
        res.send(scriptData.code);
    } catch (error) {
        console.error("Error al obtener el script:", error);
        res.status(500).send('-- Error interno del servidor');
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de HubSilent corriendo en el puerto ${PORT}`);
});
