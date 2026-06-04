
document.addEventListener("DOMContentLoaded", () => {
  const papeleoLista = document.getElementById("papeleo_lista");

  // ======= BOTÓN CREAR CARPETA =======
  const btnNuevaCarpeta = document.createElement("button");
  btnNuevaCarpeta.textContent = "+ Nueva Carpeta";
  btnNuevaCarpeta.className = 'btn btn--primary btn-new-folder';
  btnNuevaCarpeta.style.margin = '20px auto';
  btnNuevaCarpeta.style.display = 'block';
  btnNuevaCarpeta.style.position = 'relative';
  btnNuevaCarpeta.style.zIndex = '40';
  papeleoLista.before(btnNuevaCarpeta);

  // ======= ESTILOS DE GRID =======
  papeleoLista.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 25px;
    padding: 30px;
  `;

  // ======= CARGAR CARPETAS =======
  function cargarCarpetas() {
    papeleoLista.innerHTML = "";
    const carpetas = JSON.parse(localStorage.getItem("carpetasPapeleo")) || [];

    carpetas.forEach((carpeta, index) => {
      const div = document.createElement("div");
      div.classList.add("carpeta");
      div.innerHTML = `
        <div class="carpeta__title">📁 ${carpeta.nombre}</div>
        <button type="button" class="btn btn--secondary btn-ver">Ver archivos</button>
        <button type="button" class="btn btn--danger btn-eliminar">Eliminar</button>
      `;

      // ======= VER ARCHIVOS =======
      div.querySelector(".btn-ver").addEventListener("click", () => {
        mostrarArchivos(carpeta, index);
      });

      // ======= ELIMINAR =======
      div.querySelector(".btn-eliminar").addEventListener("click", () => {
        Swal.fire({
          title: `¿Eliminar "${carpeta.nombre}"?`,
          text: "Esta acción no se puede deshacer.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Sí, eliminar",
          cancelButtonText: "Cancelar",
          confirmButtonColor: "#d33",
        }).then((res) => {
          if (res.isConfirmed) {
            carpetas.splice(index, 1);
            localStorage.setItem("carpetasPapeleo", JSON.stringify(carpetas));
            cargarCarpetas();
            Swal.fire("Eliminada", "La carpeta fue eliminada correctamente.", "success");
          }
        });
      });

      papeleoLista.appendChild(div);
    });
  }

  // ======= MOSTRAR ARCHIVOS =======
  function mostrarArchivos(carpeta, index) {
    const archivosHTML = carpeta.archivos?.length
      ? carpeta.archivos
          .map(
            (a, i) =>
              `<li style="text-align:left; margin-bottom:6px;">
                📄 <a href="${a.data}" target="_blank" style="color:#6a0dad; text-decoration:none;">${a.nombre}</a>
                <button data-i="${i}" class="btn-borrar-archivo" style="background:#ff5555;color:white;border:none;border-radius:5px;padding:2px 6px;margin-left:6px;cursor:pointer;">x</button>
              </li>`
          )
          .join("")
      : "<p style='color:gray;'>Sin archivos guardados</p>";

    Swal.fire({
      title: `📁 ${carpeta.nombre}`,
      html: `
        <div style="text-align:center;">
          <button id="subirArchivo" style="
            background:#6a0dad;
            color:white;
            border:none;
            padding:8px 14px;
            border-radius:8px;
            margin-bottom:10px;
            cursor:pointer;">Subir archivos</button>
          <ul id="listaArchivos" style="list-style:none; padding:0;">${archivosHTML}</ul>
        </div>
      `,
      showConfirmButton: false,
      didOpen: () => {

        // Subir archivo
        document.getElementById("subirArchivo").addEventListener("click", () => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = ".jpg,.jpeg,.png,.pdf,.doc,.docx";
          input.click();
          input.addEventListener("change", async (e) => {
            const nuevosArchivos = await Promise.all(
              Array.from(e.target.files).map((f) => leerArchivoComoBase64(f))
            );
            carpeta.archivos = [...(carpeta.archivos || []), ...nuevosArchivos];
            const carpetas = JSON.parse(localStorage.getItem("carpetasPapeleo")) || [];
            carpetas[index] = carpeta;
            localStorage.setItem("carpetasPapeleo", JSON.stringify(carpetas));
            mostrarArchivos(carpeta, index);
          });
        });

        // Borrar archivo
        document.querySelectorAll(".btn-borrar-archivo").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const i = e.target.getAttribute("data-i");
            carpeta.archivos.splice(i, 1);
            const carpetas = JSON.parse(localStorage.getItem("carpetasPapeleo")) || [];
            carpetas[index] = carpeta;
            localStorage.setItem("carpetasPapeleo", JSON.stringify(carpetas));
            mostrarArchivos(carpeta, index);
          });
        });
      },
    });
  }

  // ======= CONVERTIR ARCHIVO A BASE64 =======
  function leerArchivoComoBase64(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve({ nombre: archivo.name, data: lector.result });
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });
  }

  // ======= CREAR NUEVA CARPETA =======
  btnNuevaCarpeta.addEventListener("click", async () => {
    const { value: nombre } = await Swal.fire({
      title: "Nueva Carpeta",
      input: "text",
      inputPlaceholder: "Nombre de la carpeta",
      confirmButtonText: "Crear",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#6a0dad",
      inputValidator: (value) => {
        if (!value) return "Debes ingresar un nombre.";
      },
    });

    if (nombre) {
      const carpetas = JSON.parse(localStorage.getItem("carpetasPapeleo")) || [];
      carpetas.push({ nombre, archivos: [] });
      localStorage.setItem("carpetasPapeleo", JSON.stringify(carpetas));
      cargarCarpetas();
      Swal.fire("Carpeta creada", `📁 "${nombre}" se ha añadido.`, "success");
    }
  });

  // ======= INICIALIZAR =======
  cargarCarpetas();
  
});