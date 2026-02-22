(() => {
  const STORAGE_KEY = 'inquilinos_boxes_v1';
  const CHECK_INTERVAL = 1000;

  const INTERES_DIARIO = 0; // Intereses deshabilitados
  const DIA_MS = 24 * 60 * 60 * 1000;

  /* ================= helpers ================= */
  function readBoxes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function writeBoxes(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {}
  }

  function money(n) {
    return Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatTime(ms) {
    // Compacto: muestra días, horas, minutos y segundos (según corresponda) en formato corto: d,h,m,s
    if (!isFinite(ms) || ms <= 0) return '0s';
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days >= 1) return `${days}d ${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
    if (hours >= 1) return `${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
    if (minutes >= 1) return `${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
    return `${String(seconds).padStart(2,'0')}s`;
  }

  function calcularIntereses(base, overdueMs) {
    const dias = Math.floor(overdueMs / DIA_MS);
    const MES_MS = 30 * DIA_MS; // 30 días = 1 mes
    const mesesVencidos = Math.floor(overdueMs / MES_MS);
    
    // Deuda base multiplicada por cantidad de meses vencidos
    const deudaPorMeses = base * Math.max(1, mesesVencidos);
    
    return { 
      dias, 
      mesesVencidos,
      deudaPorMeses,
      interes: 0,
      total: deudaPorMeses
    };
  }

  // Calcula información para pagos incompletos: lo que pagó, lo que falta, y total general
  function calcularIncompleto(base, pagado, overdueMs) {
    const dias = Math.floor(overdueMs / DIA_MS);
    const MES_MS = 30 * DIA_MS; // 30 días = 1 mes
    const mesesVencidos = Math.floor(overdueMs / MES_MS);
    
    // Deuda base multiplicada por cantidad de meses vencidos
    const deudaPorMeses = base * Math.max(1, mesesVencidos);
    
    const pag = Number(pagado || 0);
    const falta = Math.max(0, deudaPorMeses - pag);
    
    return { 
      dias, 
      mesesVencidos,
      deudaPorMeses,
      pagado: pag, 
      falta,
      interes: 0,
      total: falta
    };
  }

  /* ================= UI helpers ================= */
  function normalizarTrasPago(item, boxEl) {
    delete item.status;
    delete item.overdueSince;
    delete item.pendienteInfo;
    delete item.incompletoInfo;

    item._pagoConfirmado = true;

    boxEl.dataset.status = 'AL_DIA';
    boxEl.style.borderLeftColor = '#10b981';
    boxEl.style.backgroundColor = '';

    const panelPendiente = boxEl.querySelector('.status-pendiente');
    if (panelPendiente) panelPendiente.remove();

    const panelIncompleto = boxEl.querySelector('.status-incompleto');
    if (panelIncompleto) panelIncompleto.remove();

    const timer = boxEl.querySelector('.timer');
    if (timer) timer.style.color = '';
  }

  function aplicarPendienteUI(box, calc, overdueMs) {
    box.dataset.status = 'PENDIENTE';
    box.style.borderLeftColor = '#dc2626';
    box.style.backgroundColor = '#fff1f2';

    const timer = box.querySelector('.timer');
    if (timer) {
      timer.textContent = formatTime(overdueMs);
      timer.style.color = '#b91c1c';
    }

    let panel = box.querySelector('.status-pendiente');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'status-pendiente';
      panel.style.cssText = `
        margin-top:12px;
        padding:12px;
        border-radius:10px;
        background:#fef2f2;
        border:1px solid #fecaca;
        font-size:0.9rem;
      `;
      box.appendChild(panel);
    }

    panel.innerHTML = `
      <div style="font-weight:800; color:#991b1b; margin-bottom:6px;">
        ⛔ ESTATUS: PENDIENTE (${calc.mesesVencidos} mes${calc.mesesVencidos !== 1 ? 'es' : ''})
      </div>
      <div>💰 Deuda por meses: <strong>$${money(calc.deudaPorMeses)}</strong> (${calc.mesesVencidos} × ${money(calc.deudaPorMeses / Math.max(1, calc.mesesVencidos))})</div>
      <div style="margin-top:6px; font-weight:900; color:#7f1d1d;">
        TOTAL A PAGAR: $${money(calc.total)}
      </div>
    `;
  }

  function aplicarIncompletoUI(box, info, overdueMs) {
    box.dataset.status = 'INCOMPLETO';
    box.style.borderLeftColor = '#facc15';
    box.style.backgroundColor = '#fff7cc';

    const timer = box.querySelector('.timer');
    if (timer) {
      timer.textContent = formatTime(overdueMs);
      timer.style.color = '#b45309';
    }

    let panel = box.querySelector('.status-incompleto');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'status-incompleto';
      panel.style.cssText = `
        margin-top:12px;
        padding:12px;
        border-radius:10px;
        background:#fefce8;
        border:1px solid #fcd34d;
        font-size:0.9rem;
      `;
      box.appendChild(panel);
    }

    panel.innerHTML = `
      <div style="font-weight:800; color:#92400e; margin-bottom:6px;">
        ⚠️ ESTATUS: INCOMPLETO (${info.mesesVencidos} mes${info.mesesVencidos !== 1 ? 'es' : ''})
      </div>
      <div>💰 Deuda por meses: <strong>$${money(info.deudaPorMeses)}</strong> (${info.mesesVencidos} × ${money(info.deudaPorMeses / Math.max(1, info.mesesVencidos))})</div>
      <div>💰 Pagado: <strong>$${money(info.pagado)}</strong></div>
      <div>💰 Falta por pagar: <strong style="color:#b45309;">$${money(info.falta)}</strong></div>
      <div style="margin-top:6px; font-weight:900; color:#78350f;">
        TOTAL A PAGAR: $${money(info.total)}</div>
    `;
  }

  function limpiarPendienteUI(box) {
    const panel = box.querySelector('.status-pendiente');
    if (panel) panel.remove();
  }

  function limpiarIncompletoUI(box) {
    const panel = box.querySelector('.status-incompleto');
    if (panel) panel.remove();
  }

  /* ================= Modal ================= */
  function renderPendienteEnModal(item) {
    const modalBody =
      document.querySelector('#modalInfo .modal-body') ||
      document.querySelector('.modal-body');

    if (!modalBody) return;

    const oldPendiente = modalBody.querySelector('.modal-pendiente');
    if (oldPendiente) oldPendiente.remove();

    const oldIncompleto = modalBody.querySelector('.modal-incompleto');
    if (oldIncompleto) oldIncompleto.remove();

    if (item.status === 'PENDIENTE' && item.pendienteInfo) {
      const p = item.pendienteInfo;

      const block = document.createElement('div');
      block.className = 'modal-pendiente';
      block.style.cssText = `
        margin-top:14px;
        padding:14px;
        border-radius:10px;
        background:#fef2f2;
        border:1px solid #fecaca;
        font-size:0.95rem;
      `;

      block.innerHTML = `
        <div style="font-weight:900; color:#991b1b; margin-bottom:6px;">
          ⛔ PAGO PENDIENTE (${p.mesesVencidos} mes${p.mesesVencidos !== 1 ? 'es' : ''})
        </div>
        <div>💰 Deuda por meses: <strong>$${money(p.deudaPorMeses)}</strong> (${p.mesesVencidos} × ${money(p.deudaPorMeses / Math.max(1, p.mesesVencidos))})</div>
        <div style="margin-top:6px; font-weight:900; color:#7f1d1d;">
          TOTAL A PAGAR: $${money(p.total)}
        </div>
      `;

      modalBody.appendChild(block);
    }

    if (item.status === 'INCOMPLETO' && item.incompletoInfo) {
      const i = item.incompletoInfo;

      const block = document.createElement('div');
      block.className = 'modal-incompleto';
      block.style.cssText = `
        margin-top:14px;
        padding:14px;
        border-radius:10px;
        background:#fefce8;
        border:1px solid #fcd34d;
        font-size:0.95rem;
      `;

      block.innerHTML = `
        <div style="font-weight:900; color:#92400e; margin-bottom:6px;">
          ⚠️ INCOMPLETO (${i.mesesVencidos} mes${i.mesesVencidos !== 1 ? 'es' : ''})
        </div>
        <div>💰 Deuda por meses: <strong>$${money(i.deudaPorMeses)}</strong> (${i.mesesVencidos} × ${money(i.deudaPorMeses / Math.max(1, i.mesesVencidos))})</div>
        <div>💰 Pagado: <strong>$${money(i.pagado)}</strong></div>
        <div>💰 Falta por pagar: <strong style="color:#b45309;">$${money(i.falta)}</strong></div>
        <div style="margin-top:6px; font-weight:900; color:#78350f;">
          TOTAL A PAGAR: $${money(i.total)}
        </div>
      `;

      modalBody.appendChild(block);
    }
  }

  /* ================= main loop ================= */
  function tick() {
    const now = Date.now();
    const boxes = readBoxes();
    let dirty = false;

    boxes.forEach(item => {
      if (!item.endTime) return;

      const boxEl = document.querySelector(
        `.inquilino-box[data-id="${item.id}"]`
      );
      if (!boxEl) return;

      // ✅ AL DÍA / PAGO RECIÉN APLICADO
      if (now <= item.endTime) {
        if ((item.status === 'PENDIENTE' || item.status === 'INCOMPLETO') && !item._pagoConfirmado) {
          normalizarTrasPago(item, boxEl);

          if (window.Swal) {
            Swal.fire({
              icon: 'success',
              title: 'Pago registrado',
              text: 'El pago se generó de manera exitosa.',
              timer: 2000,
              showConfirmButton: false
            });
          } else {
            alert('Pago generado de manera exitosa');
          }

          dirty = true;
        }

        limpiarPendienteUI(boxEl);
        limpiarIncompletoUI(boxEl);
        return;
      }

      // ⛔ PASA A PENDIENTE O PAGO_INCOMPLETO
      if (!item.overdueSince) {
        item.overdueSince = item.endTime;
        item.status = 'PENDIENTE';
        item._pagoConfirmado = false;
        dirty = true;
      }

      const overdueMs = now - item.overdueSince;
      const base = Number(item.ingreso_mensual || 0);

      // Intereses acumulados diarios sobre lo que falta
      const pagado = Number(item.montoPagado || 0);

      if (pagado > 0 && pagado < base) {
        // Pago incompleto: intereses sobre lo que falta, aumentan cada 24h
        const info = calcularIncompleto(base, pagado, overdueMs);
        item.status = 'INCOMPLETO';
        item.incompletoInfo = info;
        aplicarIncompletoUI(boxEl, item.incompletoInfo, overdueMs);
      } else {
        // Pendiente normal (sin pago parcial)
        const calc = calcularIntereses(base, overdueMs);
        item.status = 'PENDIENTE';
        item.pendienteInfo = calc;
        aplicarPendienteUI(boxEl, item.pendienteInfo, overdueMs);
      }

      dirty = true;
    });

    if (dirty) writeBoxes(boxes);
  }

  /* ================= API pública ================= */
  window.pagos = window.pagos || {};
  window.pagos.registrarPagoParcial = function(id, amount) {
    const boxes = readBoxes();
    const item = boxes.find(x => String(x.id) === String(id));
    if (!item) return false;

    const monto = Number(amount || 0);
    item.montoPagado = (Number(item.montoPagado) || 0) + monto;

    // Si aún no tenía overdueSince y ya venció, establecerlo para empezar a contar intereses
    if (!item.overdueSince && Date.now() > item.endTime) {
      item.overdueSince = item.endTime;
    }

    writeBoxes(boxes);
    // Forzar actualización visual inmediata
    try { tick(); } catch(e) { /* ignore */ }
    return true;
  };

  // Exponer calculadora para pruebas
  window.pagos.calcularIncompleto = function(base, pagado, overdueMs) {
    return calcularIncompleto(base, pagado, overdueMs);
  };

  // Crea un inquilino de prueba con pago parcial (incompleto) y lo guarda en storage.
  // Si no existe ya uno de prueba, lo crea y recarga la página para que aparezca en la UI.
  window.pagos.crearInquilinoPruebaIncompleto = function(autoReload = true) {
    try {
      const boxes = readBoxes();
      // evitar duplicados
      if (boxes.find(x => x && x.__test_incompleto === true)) return false;
      const now = Date.now();
      const id = `${now}-test-inc`;
      const endTime = now - (2 * DIA_MS); // vencido hace 2 días
      const ingreso = 1000;
      const item = {
        id: id,
        nombre: 'Inquilino Prueba (Incompleto)',
        cedula: 'TEST-INC',
        telefono: '000000000',
        direccion: 'Dirección de prueba',
        descripcion: 'Generado automáticamente para pruebas - pago incompleto',
        N_casa: 'T-1',
        fecha_registro: new Date().toISOString(),
        ingreso_mensual: ingreso,
        montoPagado: 250,
        endTime: endTime,
        __test_incompleto: true
      };
      boxes.unshift(item);
      writeBoxes(boxes);

      // marcar que ya se creó para no repetir en reload
      localStorage.setItem('__test_incompleto_created__', '1');

      if (autoReload && typeof location !== 'undefined') {
        try { location.reload(); } catch(e) { /* ignore */ }
      } else {
        try { tick(); } catch(e) { /* ignore */ }
      }

      if (window.Swal) Swal.fire({ title: 'Inquilino de prueba creado', text: 'Se creó un inquilino con pago parcial; recarga la página si no aparece inmediatamente.', icon: 'info', timer: 1500, showConfirmButton: false });
      return item;
    } catch (e) {
      console.warn('crearInquilinoPruebaIncompleto failed', e);
      return false;
    }
  };

  // Ejecutar automáticamente una vez si aún no existe el test (útil para comprobar ahora)
  try {
    if (!localStorage.getItem('__test_incompleto_created__')) {
      // no forzar reload si preferimos que el usuario lo haga manualmente; aquí lo hacemos con reload para mostrar enseguida
      window.pagos.crearInquilinoPruebaIncompleto(true);
    }
  } catch(e) {}

  /* ================= click modal sync ================= */
  document.addEventListener('click', e => {
    const box = e.target.closest('.inquilino-box');
    if (!box) return;

    const id = box.dataset.id;
    if (!id) return;

    const boxes = readBoxes();
    const item = boxes.find(x => String(x.id) === String(id));
    if (!item) return;

    setTimeout(() => {
      renderPendienteEnModal(item);
    }, 50);
  });

  setInterval(tick, CHECK_INTERVAL);
})();
