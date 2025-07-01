// Función para animar texto con efecto de ola
function applyWaveText(element) {
    if (!element) return;
    
    const text = element.textContent;
    element.innerHTML = '';
    
    const waveContainer = document.createElement('span');
    waveContainer.className = 'wave-text';
    
    // Para cada carácter, crear un span con animación
    text.split('').forEach((char, i) => {
        const charSpan = document.createElement('span');
        charSpan.textContent = char === ' ' ? '\u00A0' : char; // Usar espacio de no separación
        charSpan.style.setProperty('--i', i);
        waveContainer.appendChild(charSpan);
    });
    
    element.appendChild(waveContainer);
}

// Generar o recuperar un id único por navegador
function getUserId() {
    let id = localStorage.getItem('user_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('user_id', id);
    }
    return id;
}

// Lista de personajes y sus imágenes
const personajes = [
    { nombre: 'Pomni', img: './Img/Pomni.png' },
    { nombre: 'Kinger', img: './Img/Kinger.png' },
    { nombre: 'Zooble', img: './Img/Zooble.png' },
    { nombre: 'Ragatha', img: './Img/Ragatha.png' },
    { nombre: 'Jax', img: './Img/Jax.png' },
    { nombre: 'Gangle', img: './Img/Gangle.png' },
    { nombre: 'Angel', img: './Img/Angel.png' },
    { nombre: 'Alastor', img: './Img/Alastor.png' },
    { nombre: 'Niffty', img: './Img/Niffty.png' },
    { nombre: 'Husk', img: './Img/Husk.png' },
    { nombre: 'Pentious', img: './Img/Pentious.png' },
    { nombre: 'payaso', img: './Img/payaso.png' }
];

const pregunta = '¿Debería Kido hacer un directo usando un traje de maid?';
const container = document.getElementById('characters-container');
const preguntaDiv = document.getElementById('pregunta');
const votarDiv = document.getElementById('votar');
const messageDiv = document.getElementById('message');

// Configuración de WebSocket para desarrollo y producción
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = protocol + '//' + window.location.host;
const ws = new WebSocket(wsUrl);

let yaVoto = false;

function renderVotantes(votos) {
    // Animación suave: mantener los nodos existentes y animar los nuevos
    const prevNodes = Array.from(container.children);
    // Limpiar solo los nodos de personajes (no los placeholders)
    prevNodes.forEach(node => {
        if (!node.classList.contains('character-placeholder')) {
            node.classList.add('character-removing');
            node.style.transition = 'opacity 0.4s cubic-bezier(.22,.7,.36,.99), transform 0.4s cubic-bezier(.22,.7,.36,.99)';
            node.style.opacity = '0';
            node.style.transform += ' scale(0.9) translateY(20px)';
            setTimeout(() => node.remove(), 400);
        }
    });
    // Esperar un frame para evitar que los nuevos nodos se animen como "removidos"
    setTimeout(() => {
        container.innerHTML = '';
        // Ajustar clase para muchos personajes
        const muchos = personajes.length > 5;
        if (muchos) {
            container.classList.add('muchos');
            container.style.setProperty('--cols', 6);
        } else {
            container.classList.remove('muchos');
            container.style.setProperty('--cols', personajes.length);
        }
        container.style.removeProperty('background');
        container.style.removeProperty('borderRadius');
        container.style.removeProperty('padding');
        container.style.removeProperty('boxShadow');
        container.style.removeProperty('marginTop');

        // Encontrar el índice del personaje actual que está votando
        const currentVoterIndex = votos.length % personajes.length;
        const currentVoterName = personajes[currentVoterIndex]?.nombre;

        personajes.forEach((personaje, i) => {
            const voto = votos.find(v => v.personaje === personaje.nombre);
            const isCurrentVoter = personaje.nombre === currentVoterName;
            // Mostrar solo si ya votó o es el actual votante
            if (voto || isCurrentVoter) {
                let icon = '';
                let iconColor = '';
                if (voto) {
                    icon = voto.opcion === 'yes' ? 'check_circle' : 'cancel';
                    iconColor = voto.opcion === 'yes' ? 'vote-yes' : 'vote-no';
                }
                const characterDiv = document.createElement('div');
                characterDiv.style.display = 'flex';
                characterDiv.style.flexDirection = 'column';
                characterDiv.style.alignItems = 'center';
                characterDiv.style.position = 'relative';
                characterDiv.className = 'character-appear';
                characterDiv.style.animationDelay = '0s';
                if (isCurrentVoter && !voto) {
                    characterDiv.classList.add('current-voter');
                }
                // Agregar avatar-glow solo al avatar del votante actual
                const avatarClass = isCurrentVoter && !voto ? 'character-avatar avatar-glow' : 'character-avatar';
                characterDiv.innerHTML = `
                    <div class="${avatarClass}" style="background-image: url('${personaje.img}')"></div>
                    ${icon ? `<span class="material-icons vote-icon ${iconColor}" style="font-size:3rem;position:absolute;bottom:0;right:0;">${icon}</span>` : ''}
                `;
                container.appendChild(characterDiv);
            }
        });
        // Asegurarse de que siempre haya al menos un personaje visible (el actual votante)
        if (container.children.length === 0 && personajes.length > 0) {
            const currentVoter = personajes[0];
            const characterDiv = document.createElement('div');
            characterDiv.style.display = 'flex';
            characterDiv.style.flexDirection = 'column';
            characterDiv.style.alignItems = 'center';
            characterDiv.style.position = 'relative';
            characterDiv.className = 'character-appear current-voter';
            characterDiv.innerHTML = `
                <div class="character-avatar" style="background-image: url('${currentVoter.img}')"></div>
            `;
            container.appendChild(characterDiv);
        }
        // Agrega placeholders para completar la última fila a 6
        const totalVisible = container.children.length;
        const resto = totalVisible % 6;
        const placeholders = resto === 0 ? 0 : 6 - resto;
        for (let i = 0; i < placeholders; i++) {
            const placeholder = document.createElement('div');
            placeholder.className = 'character-placeholder';
            container.appendChild(placeholder);
        }
    }, 20);
}

ws.onopen = () => {
    console.log('Conectado al servidor WebSocket');
};

ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.type === 'initial_votes' || data.type === 'update_votes') {
        renderVotantes(data.votos);
        if (data.votos.find(v => v.id === getUserId())) {
            yaVoto = true;
            if (votarDiv) votarDiv.style.display = 'none';
        }
        
        // Mostrar mensaje cuando todos hayan votado
        if (data.allVotesIn && messageDiv) {
            messageDiv.textContent = '¡La votación ha finalizado!';
            messageDiv.style.display = 'block';
            messageDiv.style.color = '#4CAF50';
            messageDiv.style.fontSize = '24px';
            messageDiv.style.margin = '20px 0';
            messageDiv.style.textAlign = 'center';
            messageDiv.style.fontWeight = 'bold';
        }
    }
};

ws.onclose = () => {
    console.log('Desconectado del servidor WebSocket');
};

ws.onerror = error => {
    console.error('Error en WebSocket:', error);
};

function sendVote(opcion) {
    if (yaVoto) return;
    ws.send(JSON.stringify({ type: 'vote', id: getUserId(), opcion }));
    yaVoto = true;
    votarDiv.style.display = 'none';
    // Lanzar confeti al votar
    if (typeof lanzarConfeti === 'function') lanzarConfeti();
}

if (votarDiv) {
    votarDiv.innerHTML = `
        <button class="vote-btn btn-yes" id="btn-si">Sí</button>
        <button class="vote-btn btn-no" id="btn-no">No</button>
    `;
    document.getElementById('btn-si').onclick = () => sendVote('yes');
    document.getElementById('btn-no').onclick = () => sendVote('no');
}
// Aplicar animación de ola a los textos
if (preguntaDiv) {
    preguntaDiv.textContent = '';
    const waveText = document.createElement('span');
    waveText.className = 'wave-text';
    pregunta.split('').forEach((char, i) => {
        const charSpan = document.createElement('span');
        charSpan.textContent = char === ' ' ? '\u00A0' : char;
        charSpan.style.setProperty('--i', i);
        waveText.appendChild(charSpan);
    });
    preguntaDiv.appendChild(waveText);
}

// Aplicar animación al título VOTE CALLED
document.addEventListener('DOMContentLoaded', () => {
    const voteTitle = document.querySelector('.vote-title-text');
    if (!voteTitle) return;

    // Get all direct children (letters and spacer)
    const elements = Array.from(voteTitle.children);
    
    // Apply wave animation to each letter
    elements.forEach((element, index) => {
        if (element.classList.contains('spacer')) return; // Skip the spacer
        
        const letter = element.textContent;
        element.innerHTML = ''; // Clear the content
        
        // Create a new span for the letter with animation
        const span = document.createElement('span');
        span.textContent = letter;
        span.style.setProperty('--i', index);
        
        // Add the animated span back to the element
        element.appendChild(span);
    });
});
