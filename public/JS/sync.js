/**
 * Sistema de sincronización offline-first
 * Guarda datos en localStorage si el servidor no está disponible
 * Sincroniza automáticamente cuando el servidor está online
 */

class SyncManager {
  constructor() {
    this.syncQueue = 'gohome_sync_queue';
    this.isOnline = navigator.onLine;
    this.syncInterval = null;
    this.syncInProgress = false;
    
    // Escuchar cambios de conectividad
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
    
    // Iniciar sincronización periódica
    this.startPeriodicSync();
  }

  /**
   * Realiza una petición HTTP (GET, POST, PUT, DELETE)
   * Si falla, intenta guardar en localStorage para sincronizar después
   */
  async request(method, endpoint, data = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(endpoint, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Si la petición fue exitosa, eliminar del queue si existe
      this.removeFromQueue(endpoint, method, data);
      
      return { success: true, data: result };
    } catch (error) {
      console.warn(`❌ Fallo al conectar con ${endpoint}:`, error.message);
      
      // Si falla y es POST/PUT/DELETE, guardar en localStorage
      if (['POST', 'PUT', 'DELETE'].includes(method)) {
        this.addToQueue(method, endpoint, data);
        return { success: false, queued: true, message: 'Datos guardados localmente. Se sincronizarán cuando el servidor esté disponible.' };
      }

      // Para GET, retornar error
      return { success: false, error: error.message };
    }
  }

  /**
   * Agregar petición al queue de sincronización
   */
  addToQueue(method, endpoint, data) {
    const queue = this.getQueue();
    const item = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      data,
      retries: 0
    };
    queue.push(item);
    this.saveQueue(queue);
    console.log(`📝 Guardado en queue: ${method} ${endpoint}`);
  }

  /**
   * Remover petición del queue
   */
  removeFromQueue(endpoint, method, data) {
    const queue = this.getQueue();
    const filtered = queue.filter(item => 
      !(item.endpoint === endpoint && item.method === method)
    );
    if (filtered.length < queue.length) {
      this.saveQueue(filtered);
      console.log(`✅ Eliminado del queue: ${method} ${endpoint}`);
    }
  }

  /**
   * Obtener queue actual
   */
  getQueue() {
    try {
      const data = localStorage.getItem(this.syncQueue);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Guardar queue
   */
  saveQueue(queue) {
    localStorage.setItem(this.syncQueue, JSON.stringify(queue));
  }

  /**
   * Sincronizar todos los datos pendientes
   */
  async syncAll() {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    const queue = this.getQueue();

    if (queue.length === 0) {
      this.syncInProgress = false;
      return;
    }

    console.log(`🔄 Sincronizando ${queue.length} cambios pendientes...`);
    // Intentar enviar la cola completa al endpoint centralizado en el servidor
    try {
      const syncUrl = (typeof window.apiUrl === 'function') ? window.apiUrl('sync/queue') : '/sync/queue';
      const resp = await fetch(syncUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(queue), cache: 'no-store' });
      if (resp.ok || resp.status === 202) {
        console.log('✅ Cola enviada al servidor para sincronización');
        this.clearQueue();
        this.syncInProgress = false;
        return;
      }
      console.warn('⚠️ El servidor no aceptó la cola completa, intentando sincronización individual');
    } catch (e) {
      console.warn('⚠️ No se pudo enviar la cola completa al servidor:', e.message);
    }

    // Fallback: intentar sincronizar ítem por ítem (comportamiento previo)
    for (const item of queue) {
      try {
        const options = {
          method: item.method,
          headers: { 'Content-Type': 'application/json' }
        };

        if (item.data) {
          options.body = JSON.stringify(item.data);
        }

        const response = await fetch(item.endpoint, options);

        if (response.ok) {
          console.log(`✅ Sincronizado: ${item.method} ${item.endpoint}`);
          // Remover del queue
          const updatedQueue = this.getQueue().filter(q => q.id !== item.id);
          this.saveQueue(updatedQueue);
        } else {
          item.retries++;
          if (item.retries > 5) {
            console.error(`❌ Error permanente: ${item.method} ${item.endpoint}`);
            // Remover después de 5 intentos
            const updatedQueue = this.getQueue().filter(q => q.id !== item.id);
            this.saveQueue(updatedQueue);
          } else {
            this.saveQueue(this.getQueue());
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error sincronizando:`, error.message);
        item.retries++;
        this.saveQueue(this.getQueue());
      }
    }

    this.syncInProgress = false;
  }

  /**
   * Iniciar sincronización periódica
   */
  startPeriodicSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    // Sincronizar cada 10 segundos si hay conexión
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncAll();
      }
    }, 10000);
  }

  /**
   * Evento cuando se restaura conexión
   */
  onOnline() {
    this.isOnline = true;
    console.log('✅ Conexión restaurada. Sincronizando datos...');
    this.syncAll();
  }

  /**
   * Evento cuando se pierde conexión
   */
  onOffline() {
    this.isOnline = false;
    console.log('⚠️ Conexión perdida. Los cambios se guardarán localmente.');
  }

  /**
   * Obtener estado de sincronización
   */
  getStatus() {
    const queue = this.getQueue();
    return {
      online: this.isOnline,
      pendingChanges: queue.length,
      queue: queue
    };
  }

  /**
   * Limpiar queue (útil para debugging)
   */
  clearQueue() {
    localStorage.removeItem(this.syncQueue);
    console.log('🗑️ Queue limpiada');
  }
}

// Instanciar el manager globalmente
const syncManager = new SyncManager();
window.syncManager = syncManager;
