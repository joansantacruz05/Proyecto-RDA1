export interface Habitacion {
  id: string | number;
  alojamientoId?: string | number;
  titulo: string;
  tipo: string;
  precioNoche: number | string;
  capacidad: number;
  cantidadDisponible: number;
  fotos?: string[];
  amenities?: string[];
  activa?: boolean;
}

export interface Alojamiento {
  id: string | number;
  titulo: string;
  descripcion?: string;
  tipo: string; // 'Hotel' | 'Airbnb' | 'Resort' | 'Hostería' | 'Villa'
  ciudad: string;
  direccion?: string;
  precioBaseNoche?: number | string;
  fotos: string[];
  amenities: string[];
  calificacion?: number;
  activo?: boolean;
  habitaciones?: Habitacion[];
  propietarioId?: string;
}

export interface OrdenPreview {
  habitacionId: string | number;
  fechaEntrada: string;
  fechaSalida: string;
  noches: number;
  precioBaseNoche: string;
  factorTemporada: string;
  subtotal: string;
  iva: string;
  tasaMunicipal: string;
  total: string;
}

export interface Reserva {
  id: string | number;
  codigo?: string;
  usuarioId: string;
  alojamientoId: string | number;
  habitacionId: string | number;
  fechaEntrada: string;
  fechaSalida: string;
  noches?: number;
  estado: 'Pendiente' | 'Confirmada' | 'Pagada' | 'Cancelada' | 'Completada' | string;
  subtotal?: string | number;
  iva?: string | number;
  tasaMunicipal?: string | number;
  total: string | number;
  metodoPago?: string;
  transaccionId?: string;
  contratoFirmado?: boolean;
  fechaFirmaContrato?: string;
  calificacion?: number;
  comentarioCalificacion?: string;
  fechaCalificacion?: string;
  createdAt?: string;
  alojamiento?: Alojamiento;
  habitacion?: Habitacion;
  usuario?: {
    id: string;
    nombre: string;
    correo: string;
    telefono?: string;
  };
  factura?: FacturaSRI;
}

export interface FacturaSRI {
  id: string | number;
  numeroFactura: string;
  reservaId: string | number;
  clienteNombre: string;
  clienteIdentificacion: string;
  tipoIdentificacion: 'CEDULA' | 'RUC' | 'PASAPORTE';
  subtotal: string | number;
  iva: string | number;
  tasaMunicipal?: string | number;
  total: string | number;
  estado: string;
  createdAt: string;
}

export interface AdminDashboardStats {
  total_alojamientos: number;
  total_habitaciones?: number;
  reservas_activas: number;
  reservas_completadas?: number;
  ingresos_totales: string | number;
}

export interface StockOutboxItem {
  id: string | number;
  habitacionId: string | number;
  fecha: string;
  cantidadDisponible: number;
  estado: 'PENDIENTE' | 'ENVIADO' | 'FALLIDO';
  reintentos: number;
  errorMensaje?: string;
  createdAt: string;
  updatedAt: string;
}
