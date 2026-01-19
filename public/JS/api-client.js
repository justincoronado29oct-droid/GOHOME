/**
 * API Client - Usa SyncManager para manejar offline/online automáticamente
 * Todas las peticiones pasan por el SyncManager que maneja fallos y sincronización
 */

class APIClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * GET - obtener datos
   */
  async get(endpoint) {
    return syncManager.request('GET', this.baseUrl + endpoint);
  }

  /**
   * POST - crear datos
   */
  async post(endpoint, data) {
    return syncManager.request('POST', this.baseUrl + endpoint, data);
  }

  /**
   * PUT - actualizar datos
   */
  async put(endpoint, data) {
    return syncManager.request('PUT', this.baseUrl + endpoint, data);
  }

  /**
   * DELETE - eliminar datos
   */
  async delete(endpoint) {
    return syncManager.request('DELETE', this.baseUrl + endpoint);
  }

  // ===== MÉTODOS ESPECÍFICOS PARA INQUILINOS =====

  async getInquilinos() {
    return this.get('/inquilinos');
  }

  async getInquilino(id) {
    return this.get(`/inquilinos/${id}`);
  }

  async createInquilino(data) {
    return this.post('/inquilinos', data);
  }

  async updateInquilino(id, data) {
    return this.put(`/inquilinos/${id}`, data);
  }

  async deleteInquilino(id) {
    return this.delete(`/inquilinos/${id}`);
  }

  // ===== MÉTODOS ESPECÍFICOS PARA INMUEBLES =====

  async getInmuebles() {
    return this.get('/inmuebles');
  }

  async getInmueble(id) {
    return this.get(`/inmuebles/${id}`);
  }

  async createInmueble(data) {
    return this.post('/inmuebles', data);
  }

  async updateInmueble(id, data) {
    return this.put(`/inmuebles/${id}`, data);
  }

  async deleteInmueble(id) {
    return this.delete(`/inmuebles/${id}`);
  }

  // ===== MÉTODOS ESPECÍFICOS PARA PAGOS =====

  async getPagosPendientes() {
    return this.get('/pagos-pendientes');
  }

  async createPagoPendiente(data) {
    return this.post('/pagos-pendientes', data);
  }

  async deletePagoPendiente(id) {
    return this.delete(`/pagos-pendientes/${id}`);
  }

  // ===== MÉTODOS ESPECÍFICOS PARA USUARIOS =====

  async getUsuarios() {
    return this.get('/info-usuarios');
  }

  async createUsuario(data) {
    return this.post('/info-usuarios', data);
  }

  async loginUsuario(data) {
    return this.post('/login', data);
  }
}

// Instanciar el cliente globalmente
const apiClient = new APIClient();
