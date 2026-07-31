const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas exitosamente"))
    .catch((err) => console.error("❌ Error conectando a MongoDB:", err));

// Esquema y Modelo de la base de datos para los scripts
const scriptSchema = new mongoose.Schema({
    code: String,
    createdAt: { type: Date, default: Date.now }
});
const ScriptModel = mongoose.model('Script', scriptSchema);

// Servir archivos estáticos (tu página web frontend)
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

        const newScript = new ScriptModel({ code });
        await newScript.save();

        res.json({ id: newScript._id });
    } catch (error) {
        console.error("Error al guardar:", error);
        res.status(500).json({ error: 'Error interno del servidor al guardar' });
    }
});

// ==========================================
// 2. RUTA PARA OBTENER EL LOADSTRING (GET)
// ==========================================
app.get('/api/script/:id', async (req, res) => {
    try {
        const scriptData = await ScriptModel.findById(req.params.id);
        
        if (!scriptData) {
            return res.status(404).send('-- Script no encontrado');
        }

        // Envía el código en texto plano para que el exploit de Roblox lo ejecute
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
