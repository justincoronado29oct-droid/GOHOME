// ================================
// 📌 ARCHIVO: inquilinos.js
// ================================

// Función para enviar al servidor (versión mejorada)
const API_BASE = window.API_BASE || ''; // window.API_BASE set by JS/api.js ('' = mismo origen en producción, 'http://localhost:3001' en dev)

async function enviarAlServer(endpoint, method = "POST", datos = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" }
  };

  if (datos !== null) {
    opts.body = JSON.stringify(datos);
  }

  try {
    const res = await fetch(`/${endpoint}`, opts);

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`❌ Error en enviarAlServer (${endpoint}):`, err.message);
    return { error: true, message: err.message };
  }
}


// ================================
// 🔹 Cargar lista de inmuebles
// ================================
async function cargarCasas() {
  const selectCasa = document.getElementById("nombre_casa_inquilino");

  const lista = await enviarAlServer("inmuebles", "GET");
  if (!lista || lista.error) {
    console.warn("No se pudieron cargar inmuebles");
    return;
  }

  lista.forEach(casa => {
    const op = document.createElement("option");
    op.value = casa.N_casa;
    op.textContent = `Casa #${casa.N_casa} - ${casa.direccion}`;
    selectCasa.appendChild(op);
  });
}

// ================================
// 🟢 Guardar nuevo inquilino
// ================================
async function guardarInquilino() {
  const datos = {
    nombre: document.getElementById("nombre_inquilino").value,
    cedula: document.getElementById("cedula_inquilino").value,
    telefono: document.getElementById("telefono_inquilino").value,
    fecha_ospedaje: document.getElementById("fecha_ospedaje").value,
    N_casa: document.getElementById("nombre_casa_inquilino").value,
    direccion: document.getElementById("direccion_fisica_inquilino").value,
    ingreso_mensual: parseFloat(document.getElementById("ingreso_mensual").value),
    descripcion: document.getElementById("descripcion").value
  };

  console.log("📦 Datos a enviar:", datos);

  const resp = await enviarAlServer("inquilinos", "POST", datos);

  if (resp && !resp.error) {
    document.getElementById("form_inquilinos").reset();
  } else {
  }
}

// ================================
// 🎯 Eventos
// ================================
document.getElementById("btn_guardar_inquilino")
  .addEventListener("click", guardarInquilino);

window.addEventListener("DOMContentLoaded", cargarCasas);
