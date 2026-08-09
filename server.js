const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
app.set('trust proxy', 1);

// ====================== CONFIGURACIÓN ======================
const PORT = process.env.PORT || 3000;

// ====================== SEGURIDAD ======================
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({ origin: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    message: '🚫 Demasiadas peticiones.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// ====================== RUTA PRINCIPAL ======================

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel Limpio</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #090a0f; color: #f3f4f6; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
    <div class="glass p-8 rounded-2xl border border-zinc-800 text-center">
        <h1 class="text-2xl font-bold mb-4">⚡ Panel Limpio</h1>
        <p class="text-zinc-400">La base de datos y la gestión de scripts han sido eliminadas.</p>
    </div>
</body>
</html>
    `);
});

// ====================== SERVIDOR ======================

app.listen(PORT, () => {
    console.log(`🚀 Servidor activo en el puerto ${PORT}`);
});
