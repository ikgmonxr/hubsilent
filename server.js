require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    family: 4
})
.then(() => console.log('¡Conectado exitosamente a MongoDB Atlas!'))
.catch(err => console.error('Error al conectar a MongoDB:', err));

const ScriptSchema = new mongoose.Schema({
    token: { type: String, unique: true, required: true },
    obfuscatedCode: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Script = mongoose.model('Script', ScriptSchema);

app.post('/api/upload', async (req, res) => {
    try {
        const { code } = req.body;
        const token = crypto.randomBytes(16).toString('hex');
        
        await Script.create({
            token,
            obfuscatedCode: code
        });

        // Genera la URL automáticamente dependiendo de dónde esté alojado (Render o Local)
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({ success: true, url: `${baseUrl}/api/script/${token}` });
    } catch (err) {
        console.error('Error al guardar script:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/script/:token', async (req, res) => {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const isBrowser = /mozilla|chrome|safari|edge|opera/i.test(userAgent);
        
        if (isBrowser) {
            return res.send('NO TIENES PERMISO');
        }

        const script = await Script.findOne({ token: req.params.token });
        if (!script) return res.status(404).send('Script no encontrado');
        
        res.send(script.obfuscatedCode);
    } catch (err) {
        res.status(500).send('Error del servidor');
    }
});

// Render asigna un puerto automáticamente mediante process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
