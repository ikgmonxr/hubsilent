// ... (mantiene la configuración anterior de express, mongoose, etc.)

// ====================== NUEVA RUTA DE RESTAURACIÓN ======================
app.post('/api/scripts/restore', requirePanelAuth, async (req, res) => {
    try {
        // 1. Limpiamos todo primero
        await ScriptModel.deleteMany({});
        
        // 2. Definimos tus scripts "por defecto" (aquí puedes editar los que quieras)
        const defaults = [
            { name: "Ejemplo Aimbot", code: "-- Tu código de aimbot aquí" },
            { name: "Ejemplo ESP", code: "-- Tu código de ESP aquí" },
            { name: "Ejemplo Fly", code: "-- Tu código de vuelo aquí" }
        ];

        // 3. Insertamos los defaults
        await ScriptModel.insertMany(defaults.map(s => ({
            name: s.name,
            code: strongObfuscate(s.code) // Se ofuscan al restaurar
        })));

        res.json({ success: true, message: "Base de datos restaurada a defaults" });
    } catch (e) {
        res.status(500).json({ error: "Error al restaurar" });
    }
});

// ... (resto de tus rutas anteriores)

// ====================== EN EL HTML (dentro del <header>) ======================
/* 
    Agrega este botón en el header junto al de "Borrar Todo":
    <button onclick="restoreDefaults()" class="text-xs bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 px-3 py-2 rounded-xl border border-emerald-800/50">🔄 Restaurar Defaults</button>
*/

// ====================== EN EL SCRIPT (JS del Frontend) ======================
/*
    Agrega esta función al final de tu tag <script>:
    
    async function restoreDefaults() {
        if (!confirm('⚠️ ¿Restaurar scripts predeterminados? Esto borrará tus scripts actuales.')) return;
        try {
            const res = await fetch('/api/scripts/restore', {
                method: 'POST',
                headers: { 'x-panel-password': panelPass }
            });
            if (res.ok) {
                alert('¡Base de datos restaurada!');
                loadScripts();
            } else {
                alert('Error al restaurar');
            }
        } catch {
            alert('Error de conexión');
        }
    }
*/
