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



// --- MongoDB Atlas ---
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let votos = [];
let votosCollection;

async function conectarMongo() {
  try {
    await client.connect();
    const db = client.db('votacion');
    votosCollection = db.collection('votos');
    // Cargar votos al iniciar
    votos = await votosCollection.find({}).toArray();
    console.log('Conectado a MongoDB Atlas. Votos cargados:', votos.length);
  } catch (e) {
    console.error('Error conectando a MongoDB:', e);
  }
}

async function guardarVotoMongo(voto) {
  try {
    await votosCollection.insertOne(voto);
    votos.push(voto);
  } catch (e) {
    console.error('Error guardando voto en MongoDB:', e);
  }
}

conectarMongo();

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

    ws.on('message', async message => {
        const data = JSON.parse(message);
        if (data.type === 'vote') {
            const { id, opcion } = data;
            // Si ya votó, ignorar
            if (votos.find(v => v.id === id)) return;
            // Asignar personaje
            const personaje = asignarPersonaje();
            if (!personaje) return; // No hay más personajes
            const voto = { id, personaje, opcion };
            await guardarVotoMongo(voto);
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
