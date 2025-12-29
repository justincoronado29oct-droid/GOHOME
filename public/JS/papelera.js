// Papelera global
window.papelera = window.papelera || [];

// Función para agregar un elemento a la papelera
function moverAPapelera(tipo, datos) {
    const id = Date.now(); // ID único temporal
    const item = { id, tipo, datos };
    window.papelera.push(item);
    actualizarPapeleraUI();
}

// Función para eliminar un elemento permanentemente
function eliminarPermanente(id) {
    window.papelera = window.papelera.filter(item => item.id !== id);
    actualizarPapeleraUI();
}

// Función para restaurar un elemento
function restaurarElemento(id) {
    const index = window.papelera.findIndex(item => item.id === id);
    if(index !== -1){
        const item = window.papelera[index];
        // Aquí puedes decidir cómo restaurarlo según el tipo
        // Ejemplo: volver a agregar a la lista original
        if(item.tipo === 'inquilino'){
            agregarInquilino(item.datos, true); // función que tengas para agregar inquilinos
        } else if(item.tipo === 'inmueble'){
            agregarInmueble(item.datos, true);
        } else if(item.tipo === 'papeleo'){
            agregarPapeleo(item.datos, true);
        }

        eliminarPermanente(id);
    }
}

// Función para actualizar la UI de la papelera
function actualizarPapeleraUI() {
    const contenedor = document.getElementById('papelera_lista');
    contenedor.innerHTML = '';

    if(window.papelera.length === 0){
        contenedor.innerHTML = '<p>No hay elementos en la papelera.</p>';
        return;
    }

    window.papelera.forEach(item => {
        const div = document.createElement('div');
        div.className = 'papelera_item';
        div.innerHTML = `
            <span><strong>${item.tipo.toUpperCase()}:</strong> ${item.datos.nombre || item.datos.titulo || 'Sin nombre'}</span>
            <button onclick="restaurarElemento(${item.id})">Restaurar</button>
            <button onclick="eliminarPermanente(${item.id})">Eliminar</button>
        `;
        contenedor.appendChild(div);
    });
}
