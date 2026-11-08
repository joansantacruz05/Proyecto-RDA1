// ─────────────────────────────────────────────────────────────────────────────
// Tipos de Dominio y Contrato OpenAPI v2.2.0 para LuxeStays
// ─────────────────────────────────────────────────────────────────────────────

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  instance?: string;
  invalid_params?: Array<{
    name: string;
    reason: string;
  }>;
}

export class ProblemDetailsException extends Error {
  public readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title || 'Error en la petición');
    this.name = 'ProblemDetailsException';
    this.problem = problem;
  }
}

export interface PaginationMetadata {
  total_results: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
}

export interface AlojamientoItem {
  id: string;
  codigo?: string;
  nombre: string;
  ciudad?: string;
  destino?: string;
  direccion?: string;
  descripcion?: string;
  estrellas: number;
  tipo?: string;
  imagenUrl?: string;
  precioPorNoche?: string | number;
  precioDesde?: number;
  moneda?: string;
  amenities?: string[];
  activo?: boolean;
  habitacionesDisponibles?: number;
  tienePiscina?: boolean;
  permitePaquete?: boolean;
}

export interface HabitacionDetalle {
  id: string;
  alojamientoId?: string;
  codigo?: string;
  nombre: string;
  capacidadAdultos?: number;
  capacidadNinos?: number;
  capacidad?: number;
  precioPorNoche: number | string;
  cantidadDisponible?: number;
  tipoHabitacion?: string;
  imagenUrl?: string;
  descripcion?: string;
  amenities?: string[];
  estado?: string;
}

export interface AlojamientoDetalle {
  id: string;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  destino?: string;
  ciudad?: string;
  direccion?: string;
  estrellas?: number;
  estado?: string;
  habitaciones?: HabitacionDetalle[];
}

export interface AvailabilityOpcion {
  tipoHabitacionCodigo: string;
  estaDisponible: boolean;
  habitacionesRemanentes: number;
  precioNoche: number;
  precioTotalEstancia: number;
  planTarifaCodigo: string;
}

export interface AvailabilityResponse {
  accommodation_id: string;
  checkin?: string;
  checkout?: string;
  opciones: AvailabilityOpcion[];
}

export interface ResenaItem {
  id: string;
  calificacion: number;
  comentario: string;
  autorNombre?: string;
  fechaCreacion: string;
}

export interface ResenasResponse {
  resenas: ResenaItem[];
  promedio: number;
  total: number;
}

export interface UsuarioSession {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  telefono?: string;
  edad?: number;
  direccion?: string;
  pais?: string;
  scopes?: string[];
}

export interface LoginResponse {
  access_token: string;
  usuario: UsuarioSession;
}

export interface ClienteHuesped {
  client_id: string;
  nombre: string;
  email: string;
  identificacion: string;
  telefono?: string;
}

export interface MetodoPagoItem {
  id: string;
  nombre: string;
  estado: string;
}

export interface OrderCreateResponse {
  orderId?: string;
  external_order_id?: string;
  externalOrderId?: string;
  codigoReserva?: string;
  reservation_code?: string;
  status?: string;
  estado?: string;
  total_amount?: number;
  total?: string | number;
  currency?: string;
  moneda?: string;
  saga_id?: string;
  alojamientoId?: string;
  alojamientoNombre?: string;
  tipoHabitacionCodigo?: string;
  tipoHabitacion?: string;
  cantidadHabitaciones?: number;
  checkinFecha?: string;
  checkoutFecha?: string;
  noches?: number;
  huespedTitular?: {
    nombreCompleto: string;
    identificacion: string;
    email: string;
    telefono: string;
    tipoDocumento?: string;
    nacionalidad?: string;
  };
  desgloseFiscal?: {
    subtotal: string;
    iva: string;
    tasaMunicipal: string;
    total: string;
    moneda: string;
  };
  dates?: {
    check_in: string;
    check_out: string;
  };
  holder_info?: {
    name: string;
    email: string;
  };
}

export interface FacturaSRI {
  id: string;
  numeroFactura: string;
  claveAcceso?: string;
  identificacion?: string;
  nombreRazonSocial?: string;
  subtotal: number | string;
  iva: number | string;
  tasaMunicipal?: number | string;
  total: number | string;
  fechaEmision?: string;
}

export interface PagoResponse {
  pagoId: string;
  reservaId: string;
  monto: number | string;
  estado: string;
  mensaje?: string;
  factura?: FacturaSRI;
}

export interface ReservaUsuarioItem {
  id: string;
  ordenId: string;
  fechaEntrada: string;
  fechaSalida: string;
  precioTotal: number;
  subtotal?: number;
  iva?: number;
  tasaMunicipal?: number;
  numeroPersonas: number;
  estadoId: string;
  estadoNombre: string;
  espacioId: string;
  habitacionNombre: string;
  precioPorNoche: number;
  alojamientoId: string;
  alojamientoNombre: string;
  alojamientoCodigo?: string;
  imagenUrl?: string;
  contratoFirmado?: boolean;
  estadoPago?: string;
  pagoId?: string;
  facturaId?: string;
  numeroFactura?: string;
  calificacion?: number;
  comentario?: string;
}

export interface DashboardStats {
  totalAlojamientos: number;
  totalHabitaciones: number;
  totalReservas: number;
  reservasConfirmadas: number;
  reservasCanceladas: number;
  ingresosTotales: number;
}

