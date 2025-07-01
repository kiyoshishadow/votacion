const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuración del puerto
const PORT = process.env.PORT || 3000;
console.log('Iniciando servidor...');
console.log('Directorio actual:', __dirname);
console.log('Ruta pública:', path.join(__dirname, 'public'));

const personajes = [
    'Pomni', 'Kinger', 'Zooble', 'Ragatha', 'Jax', 'Gangle',
    'Angel', 'Alastor', 'Niffty', 'Husk', 'Pentious', 'payaso'
];


// Persistencia de votos en votes.json
const fs = require('fs');
const VOTES_FILE = path.join(__dirname, 'votes.json');
let votos = [];

// Cargar votos desde votes.json al iniciar
function cargarVotos() {
    try {
        // Verificar si el archivo existe
        if (!fs.existsSync(VOTES_FILE)) {
            // Si no existe, crearlo con un array vacío
            fs.writeFileSync(VOTES_FILE, JSON.stringify([], null, 2), 'utf8');
            votos = [];
            return;
        }
        
        // Si el archivo existe, leerlo
        const data = fs.readFileSync(VOTES_FILE, 'utf8');
        const json = JSON.parse(data);
        
        if (Array.isArray(json)) {
            votos = json;
        } else if (json && typeof json === 'object' && json.votos) {
            votos = json.votos;
        } else {
            votos = [];
        }
    } catch (e) {
        console.error('Error al cargar los votos, inicializando array vacío:', e);
        votos = [];
    }
}

// Guardar votos en votes.json
function guardarVotos() {
    try {
        fs.writeFileSync(VOTES_FILE, JSON.stringify(votos, null, 2), 'utf8');
    } catch (e) {
        console.error('Error guardando votos:', e);
    }
}

cargarVotos();

function asignarPersonaje() {
    // Asigna el siguiente personaje disponible
    const usados = votos.map(v => v.personaje);
    return personajes.find(p => !usados.includes(p));
}

// Configuración de archivos estáticos
const publicPath = path.resolve(__dirname, 'public');
console.log('Sirviendo archivos estáticos desde:', publicPath);
app.use(express.static(publicPath));

// Verificar que el archivo index.html existe
const indexPath = path.join(publicPath, 'index.html');
console.log('Ruta al index.html:', indexPath);

// Ruta raíz
app.get('/', (req, res) => {
    console.log('Solicitud recibida en /');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error al enviar index.html:', err);
            res.status(500).send('Error al cargar la aplicación');
        }
    });
});

// Para cualquier otra ruta, redirigir al index.html (SPA)
app.get('*', (req, res) => {
    console.log(`Redirigiendo ruta ${req.path} a index.html`);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error al redirigir a index.html:', err);
            res.status(404).send('Página no encontrada');
        }
    });
});

wss.on('connection', ws => {
    console.log('Cliente conectado');
    // Envía el estado actual de los votos al cliente recién conectado
    ws.send(JSON.stringify({ type: 'initial_votes', votos }));

    ws.on('message', message => {
        const data = JSON.parse(message);
        if (data.type === 'vote') {
            const { id, opcion } = data;
            // Si ya votó, ignorar
            if (votos.find(v => v.id === id)) return;
            // Asignar personaje
            const personaje = asignarPersonaje();
            if (!personaje) return; // No hay más personajes
            votos.push({ id, personaje, opcion });
            guardarVotos();
            // Emitir a todos los clientes
            const allVotesIn = votos.length === personajes.length;
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ 
                        type: 'update_votes', 
                        votos,
                        allVotesIn
                    }));
                }
            });
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado en http://0.0.0.0:${PORT}`);
});
