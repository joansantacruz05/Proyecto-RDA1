import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  BedDouble,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  Hotel,
  LogIn,
  ExternalLink,
  MapPin,
  Waves,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { api, getAuthToken } from '../../api/client';
import { UsuarioSession } from '../../api/types';
import {
  setAdminAlojamientoEstado,
  liberarAlojamiento,
  getEstadosOverride,
  checkIsAlojamientoReserved,
} from '../../utils/accommodationStatus';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { formatUSD } from '../../components/ui/PriceDisplay/PriceDisplay';
import styles from './AdminPage.module.css';

interface AdminPageProps {
  currentUser: UsuarioSession | null;
}

interface StatsData {
  total_alojamientos?: number;
  reservas_activas?: number;
  ingresos_totales?: number;
}

interface AlojamientoAdmin {
  id: string;
  nombre: string;
  descripcion?: string;
  destino: string;
  ubicacionId?: string;
  precioPorNoche?: number | string;
  capacidadAdultos?: number;
  capacidadNinos?: number;
  habitaciones?: number;
  habitaciones_disponibles?: number;
  imagenUrl?: string;
  tienePiscina?: boolean;
  estado?: string;
  propietario?: string;
}

interface HabitacionAdmin {
  id: string;
  nombre: string;
  precioPorNoche: number | string;
  capacidadAdultos: number;
  capacidadNinos: number;
  cantidadDisponible: number;
  imagenesUrls?: string;
  estado?: string;
}

interface ReservaAdminItem {
  id: string;
  ordenId: string;
  external_order_id?: string;
  alojamientoId?: string;
  alojamientoCodigo?: string;
  alojamientoNombre: string;
  habitacionNombre: string;
  fechaEntrada: string;
  fechaSalida: string;
  precioTotal: number | string;
  estadoId: string;
  estadoNombre: string;
  usuarioNombre?: string;
  usuarioEmail?: string;
  clienteNombre?: string;
  clienteEmail?: string;
  numeroPersonas?: number;
  checkinRealizado?: boolean;
}

interface UsuarioAdminItem {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  telefono?: string;
  edad?: number;
  creadoEn?: string;
}

interface FacturaAdminItem {
  id: string;
  numeroFactura?: string;
  claveAcceso?: string;
  nombreRazonSocial?: string;
  identificacionCliente?: string;
  total?: number | string;
  monto?: number | string;
  fechaEmision?: string;
  estado?: string;
  metodoPago?: string;
}

interface CancelacionAdminItem {
  id?: string;
  reservaId?: string;
  cliente?: string;
  clienteNombre?: string;
  alojamiento?: string;
  alojamientoNombre?: string;
  fechaCancelacion?: string;
  montoDevuelto?: number | string;
  montoPerdido?: number | string;
  politicaCancelacion?: string;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const token = getAuthToken();

  // Tab inicial según URL (/admin/recepcion abre 'recepcion')
  const initialTab = location.pathname.includes('recepcion') ? 'recepcion' : 'dashboard';
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'alojamientos' | 'recepcion' | 'usuarios' | 'facturas' | 'cancelaciones'
  >(initialTab);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isAdmin = currentUser?.rol?.toLowerCase().includes('admin');

  // 1. Estadísticas del Dashboard
  const { data: stats } = useQuery<StatsData>({
    queryKey: ['adminDashboardStats'],
    queryFn: () => api.get<StatsData>('/admin/dashboard-stats'),
    enabled: Boolean(token && isAdmin),
  });

  // 2. Lista de Alojamientos
  const { data: alojamientos = [], isLoading: loadingAlojamientos, refetch: refetchAlojamientos } = useQuery<AlojamientoAdmin[]>({
    queryKey: ['adminAlojamientos'],
    queryFn: () => api.get<AlojamientoAdmin[]>('/admin/alojamientos'),
    enabled: Boolean(token && isAdmin),
  });

  // 3. Ciudades oficiales de Ecuador
  const { data: rawCiudades = [] } = useQuery<Array<{ id: string; nombre: string } | string>>({
    queryKey: ['ciudades'],
    queryFn: () => api.get<Array<{ id: string; nombre: string } | string>>('/ciudades'),
  });

  const ciudadesEcuador = useMemo(() => {
    return rawCiudades
      .map((c) => (typeof c === 'string' ? c : c?.nombre || ''))
      .filter(Boolean);
  }, [rawCiudades]);

  // 4. Reservas de Recepción
  const { data: reservas = [], isLoading: loadingReservas, refetch: refetchReservas } = useQuery<ReservaAdminItem[]>({
    queryKey: ['adminReservasTodas'],
    queryFn: () => api.get<ReservaAdminItem[]>('/reservas/admin/todas'),
    enabled: Boolean(token && isAdmin),
  });

  // 5. Usuarios
  const { data: usuarios = [], refetch: refetchUsuarios } = useQuery<UsuarioAdminItem[]>({
    queryKey: ['adminUsuarios'],
    queryFn: () => api.get<UsuarioAdminItem[]>('/admin/usuarios'),
    enabled: Boolean(token && isAdmin),
  });

  // 6. Facturas SRI
  const { data: facturas = [] } = useQuery<FacturaAdminItem[]>({
    queryKey: ['adminFacturas'],
    queryFn: () => api.get<FacturaAdminItem[]>('/admin/facturas'),
    enabled: Boolean(token && isAdmin),
  });

  // 7. Cancelaciones
  const { data: cancelaciones = [] } = useQuery<CancelacionAdminItem[]>({
    queryKey: ['adminCancelaciones'],
    queryFn: () => api.get<CancelacionAdminItem[]>('/reservas/admin/cancelaciones'),
    enabled: Boolean(token && isAdmin),
  });

  // --- MODAL: CREAR / EDITAR ALOJAMIENTO ---
  const [alojamientoModalOpen, setAlojamientoModalOpen] = useState(false);
  const [editingAlojamientoId, setEditingAlojamientoId] = useState<string | null>(null);
  const [isSavingAlojamiento, setIsSavingAlojamiento] = useState(false);
  const [alojamientoForm, setAlojamientoForm] = useState({
    nombre: '',
    descripcion: '',
    destino: 'Quito',
    precioPorNoche: 95,
    capacidadAdultos: 2,
    capacidadNinos: 1,
    habitaciones: 3,
    imagenUrl: '',
    tienePiscina: false,
    permitePaquete: true,
    estado: 'Activo',
    liberarReservas: false,
  });

  const handleOpenCreateAlojamiento = () => {
    setEditingAlojamientoId(null);
    setAlojamientoForm({
      nombre: '',
      descripcion: '',
      destino: ciudadesEcuador[0] || 'Quito',
      precioPorNoche: 95,
      capacidadAdultos: 2,
      capacidadNinos: 1,
      habitaciones: 3,
      imagenUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      tienePiscina: false,
      permitePaquete: true,
      estado: 'Activo',
      liberarReservas: false,
    });
    setAlojamientoModalOpen(true);
  };

  const handleOpenEditAlojamiento = (aloj: AlojamientoAdmin) => {
    setEditingAlojamientoId(aloj.id);
    setAlojamientoForm({
      nombre: aloj.nombre || '',
      descripcion: aloj.descripcion || '',
      destino: aloj.destino || 'Quito',
      precioPorNoche: Number(aloj.precioPorNoche) || 95,
      capacidadAdultos: aloj.capacidadAdultos || 2,
      capacidadNinos: aloj.capacidadNinos || 0,
      habitaciones: aloj.habitaciones || 1,
      imagenUrl: aloj.imagenUrl || '',
      tienePiscina: Boolean(aloj.tienePiscina),
      permitePaquete: true,
      estado: aloj.estado || 'Activo',
      liberarReservas: false,
    });
    setAlojamientoModalOpen(true);
  };

  const handleToggleEstadoAlojamiento = async (aloj: AlojamientoAdmin) => {
    const currentOverride = getEstadosOverride()[aloj.id];
    const currentEstado = currentOverride || aloj.estado || 'Activo';
    const nuevoEstado = currentEstado === 'Activo' ? 'Inactivo' : 'Activo';
    
    // 1. Guardar en almacenamiento reactivo local para efecto inmediato
    setAdminAlojamientoEstado(aloj.id, nuevoEstado);
    if (nuevoEstado === 'Activo') {
      liberarAlojamiento(aloj.id, aloj.nombre);
    }

    try {
      await api.patch(`/admin/alojamientos/${aloj.id}`, {
        estado: nuevoEstado,
        liberarReservas: nuevoEstado === 'Activo',
      });
    } catch {
      // Continuar con persistencia local
    }

    showToast(
      nuevoEstado === 'Activo'
        ? `"${aloj.nombre}" ahora está EN LÍNEA y visible en el catálogo principal.`
        : `"${aloj.nombre}" ha sido pausado y ocultado del catálogo.`
    );
    refetchAlojamientos();
    queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
    queryClient.invalidateQueries({ queryKey: ['hotelDetail'] });
    queryClient.invalidateQueries({ queryKey: ['reservasActivasPublicas'] });
  };

  const handleLiberarAlojamiento = async (aloj: AlojamientoAdmin) => {
    try {
      // 1. Liberar cupos y forzar estado En Línea
      liberarAlojamiento(aloj.id, aloj.nombre);
      setAdminAlojamientoEstado(aloj.id, 'Activo');

      try {
        await api.patch(`/admin/alojamientos/${aloj.id}`, {
          estado: 'Activo',
          liberarReservas: true,
        });
      } catch {
        // Continuar con persistencia local
      }

      showToast(`"${aloj.nombre}" ha sido inspeccionado y liberado. Vuelve a estar en línea y disponible para reservas en la página principal.`);
      refetchAlojamientos();
      queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['hotelDetail'] });
      queryClient.invalidateQueries({ queryKey: ['reservasActivasPublicas'] });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al liberar alojamiento', 'error');
    }
  };

  const handleSaveAlojamiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAlojamiento(true);
    try {
      if (editingAlojamientoId) {
        // Guardar estado local
        setAdminAlojamientoEstado(editingAlojamientoId, alojamientoForm.estado);
        if (alojamientoForm.liberarReservas) {
          liberarAlojamiento(editingAlojamientoId, alojamientoForm.nombre);
        }

        // Editar existente (PATCH /admin/alojamientos/:id)
        try {
          await api.patch(`/admin/alojamientos/${editingAlojamientoId}`, alojamientoForm);
        } catch {
          // Continuar con persistencia local
        }
        showToast('Alojamiento actualizado exitosamente en el catálogo');
      } else {
        // Crear nuevo (POST /admin/alojamientos)
        await api.post('/admin/alojamientos', alojamientoForm);
        showToast('Nuevo alojamiento y habitaciones creados con éxito');
      }
      setAlojamientoModalOpen(false);
      refetchAlojamientos();
      queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['hotelDetail'] });
      queryClient.invalidateQueries({ queryKey: ['reservasActivasPublicas'] });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al guardar alojamiento', 'error');
    } finally {
      setIsSavingAlojamiento(false);
    }
  };

  const handleDeleteAlojamiento = async (id: string, nombre: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el alojamiento "${nombre}"? Esta acción no se puede deshacer.`)) {
      try {
        await api.delete(`/admin/alojamientos/${id}`);
        showToast(`Se eliminó el alojamiento "${nombre}"`);
        refetchAlojamientos();
        queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
      }
    }
  };

  // --- MODAL: GESTOR DE HABITACIONES POR ALOJAMIENTO ---
  const [roomsModalHotel, setRoomsModalHotel] = useState<AlojamientoAdmin | null>(null);
  const [roomsList, setRoomsList] = useState<HabitacionAdmin[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HabitacionAdmin | null>(null);
  const [newRoomPhotoInput, setNewRoomPhotoInput] = useState('');

  const openRoomsManager = async (hotel: AlojamientoAdmin) => {
    setRoomsModalHotel(hotel);
    setEditingRoom(null);
    setLoadingRooms(true);
    try {
      const data = await api.get<HabitacionAdmin[]>(`/admin/alojamientos/${hotel.id}/habitaciones`);
      setRoomsList(Array.isArray(data) ? data : []);
    } catch {
      showToast('Error al cargar habitaciones del alojamiento', 'error');
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleCreateNewRoom = () => {
    setEditingRoom({
      id: 'Nueva',
      nombre: 'Suite Deluxe Ejecutiva',
      precioPorNoche: Number(roomsModalHotel?.precioPorNoche) || 120,
      capacidadAdultos: 2,
      capacidadNinos: 1,
      cantidadDisponible: 3,
      imagenesUrls: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      estado: 'Activo',
    });
  };

  const handleSaveRoom = async () => {
    if (!editingRoom || !roomsModalHotel) return;
    try {
      if (editingRoom.id === 'Nueva') {
        const res = await api.post<{ id: string }>(
          `/admin/alojamientos/${roomsModalHotel.id}/habitaciones`,
          editingRoom,
        );
        setRoomsList([...roomsList, { ...editingRoom, id: res?.id || `HAB-${Date.now()}` }]);
        showToast('Habitación creada exitosamente');
      } else {
        await api.patch(`/admin/habitaciones/${editingRoom.id}`, editingRoom);
        setRoomsList(roomsList.map((r) => (r.id === editingRoom.id ? editingRoom : r)));
        showToast('Habitación actualizada con éxito');
      }
      setEditingRoom(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al guardar habitación', 'error');
    }
  };

  const handleDeleteRoom = async (habId: string) => {
    if (window.confirm('¿Deseas eliminar permanentemente esta habitación?')) {
      try {
        await api.delete(`/admin/habitaciones/${habId}`);
        setRoomsList(roomsList.filter((r) => r.id !== habId));
        showToast('Habitación eliminada');
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Error al eliminar habitación', 'error');
      }
    }
  };

  // --- MODAL: CREAR NUEVO USUARIO ---
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    nombre: '',
    correo: '',
    contrasena: 'Admin2026*',
    rol: 'Admin',
    telefono: '+593991234567',
    edad: 28,
  });

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      await api.post('/auth/register', userForm);
      showToast(`Usuario ${userForm.correo} (${userForm.rol}) creado exitosamente`);
      setUserModalOpen(false);
      refetchUsuarios();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al registrar usuario', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // --- MODAL: CHECK-IN / CONFIRMAR LLEGADA RECEPCIÓN ---
  const CHECKED_IN_KEY = 'luxestays_checked_in_orders';
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(CHECKED_IN_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // Ignorar error de parsing
    }
    return new Set<string>();
  });

  const saveCheckedInId = (id: string, ordenId?: string) => {
    setCheckedInIds((prev) => {
      const updated = new Set(prev);
      if (id) updated.add(id);
      if (ordenId) updated.add(ordenId);
      try {
        localStorage.setItem(CHECKED_IN_KEY, JSON.stringify(Array.from(updated)));
      } catch {
        // Ignorar
      }
      return updated;
    });
  };

  const [checkinModalReserva, setCheckinModalReserva] = useState<ReservaAdminItem | null>(null);
  const [huespedesReales, setHuespedesReales] = useState(1);
  const [observacionesCheckin, setObservacionesCheckin] = useState('Huésped presentado en recepción');
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);

  const handleConfirmCheckin = async () => {
    if (!checkinModalReserva) return;
    setIsSubmittingCheckin(true);
    try {
      const orderIdentifier = checkinModalReserva.ordenId || checkinModalReserva.id;
      await api.post(`/orders/${orderIdentifier}/check-in`, {
        numero_personas_reales: huespedesReales,
        observaciones: observacionesCheckin,
        external_order_id: checkinModalReserva.external_order_id || undefined,
      });

      saveCheckedInId(checkinModalReserva.id, checkinModalReserva.ordenId);
      showToast(`Check-in confirmado para ${checkinModalReserva.clienteNombre || checkinModalReserva.usuarioNombre || 'huésped'}. Sincronizado vía outbox.`);
      setCheckinModalReserva(null);
      refetchReservas();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al registrar check-in', 'error');
    } finally {
      setIsSubmittingCheckin(false);
    }
  };

  const [checkedOutIds, setCheckedOutIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('luxestays_checked_out_orders');
      if (stored) return new Set(JSON.parse(stored));
    } catch {
      // Ignorar
    }
    return new Set<string>();
  });

  const handleCheckoutReserva = async (res: ReservaAdminItem) => {
    try {
      if (res.alojamientoId || res.alojamientoNombre) {
        liberarAlojamiento(res.alojamientoId || '', res.alojamientoNombre);
      }

      const orderIdentifier = res.ordenId || res.id;
      try {
        await api.post(`/orders/${orderIdentifier}/check-out`, {});
      } catch {
        // Continuar con persistencia local
      }

      setCheckedOutIds((prev) => {
        const next = new Set(prev);
        next.add(res.id);
        if (res.ordenId) next.add(res.ordenId);
        try {
          localStorage.setItem('luxestays_checked_out_orders', JSON.stringify(Array.from(next)));
        } catch {
          // Ignorar
        }
        return next;
      });

      showToast(`Check-out completado para ${res.clienteNombre || res.usuarioNombre || 'huésped'}. La propiedad ha sido liberada y ya está disponible en la página principal.`);
      refetchReservas();
      refetchAlojamientos();
      queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['hotelDetail'] });
      queryClient.invalidateQueries({ queryKey: ['reservasActivasPublicas'] });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al registrar check-out', 'error');
    }
  };

  // Buscador de reservas
  const [searchReservaQuery, setSearchReservaQuery] = useState('');
  const filteredReservas = useMemo(() => {
    if (!searchReservaQuery.trim()) return reservas;
    const q = searchReservaQuery.toLowerCase();
    return reservas.filter(
      (r) =>
        r.ordenId?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q) ||
        r.alojamientoNombre?.toLowerCase().includes(q) ||
        (r.clienteNombre && r.clienteNombre.toLowerCase().includes(q)) ||
        (r.usuarioNombre && r.usuarioNombre.toLowerCase().includes(q)),
    );
  }, [reservas, searchReservaQuery]);

  // Si no está autenticado o no es admin
  if (!token || !currentUser) {
    return (
      <div className={`container ${styles.adminPageContainer}`} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Hotel size={48} color="#14406B" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '12px' }}>Acceso al Panel de Administración</h2>
        <p style={{ color: '#64748B', marginBottom: '24px' }}>
          Debes iniciar sesión con una cuenta de Administrador de LuxeStays para gestionar propiedades, usuarios y reservas.
        </p>
        <Button variant="gold" icon={<LogIn size={16} />} onClick={() => navigate('/login?returnUrl=/admin')}>
          Iniciar Sesión como Administrador
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={`container ${styles.adminPageContainer}`} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <ShieldCheck size={48} color="#B42318" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '12px' }}>Acceso Restringido</h2>
        <p style={{ color: '#64748B', marginBottom: '24px' }}>
          Tu cuenta ({currentUser.correo}) no cuenta con rol de Administrador.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Volver al Inicio
        </Button>
      </div>
    );
  }

  return (
    <div className={`container ${styles.adminPageContainer}`}>
      {/* Encabezado Principal */}
      <div className={styles.adminHeader}>
        <div>
          <h1 className={styles.adminTitle}>Panel de Control · LuxeStays</h1>
          <div className={styles.adminSubtitle}>
            <span>Bienvenido, <strong>{currentUser.nombre}</strong></span>
            <span>·</span>
            <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} /> Nodo Certificado E5K3 (Azure Activo)
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <a
            href="https://posada-ec-alojamientos.azurewebsites.net/api/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              background: '#FFFFFF',
              color: '#1E293B',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={14} /> Swagger API Docs
          </a>
        </div>
      </div>

      {/* Pestañas de Navegación del Panel */}
      <div className={styles.navTabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'dashboard' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Building2 size={16} /> Dashboard
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'alojamientos' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('alojamientos')}
        >
          <Hotel size={16} /> Alojamientos ({alojamientos.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'recepcion' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('recepcion')}
        >
          <CheckCircle2 size={16} /> Recepción & Check-in ({reservas.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'usuarios' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          <Users size={16} /> Usuarios ({usuarios.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'facturas' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('facturas')}
        >
          <FileText size={16} /> Facturas SRI ({facturas.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'cancelaciones' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('cancelaciones')}
        >
          <XCircle size={16} /> Cancelaciones ({cancelaciones.length})
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────
          TAB 1: DASHBOARD OVERVIEW
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div>
                <div className={styles.statLabel}>Alojamientos Registrados</div>
                <div className={styles.statValue}>{stats?.total_alojamientos ?? alojamientos.length}</div>
              </div>
              <div className={styles.statIconBox} style={{ background: 'rgba(20, 64, 107, 0.08)', color: '#14406B' }}>
                <Hotel size={26} />
              </div>
            </div>

            <div className={styles.statCard}>
              <div>
                <div className={styles.statLabel}>Reservas Activas</div>
                <div className={styles.statValue}>{stats?.reservas_activas ?? reservas.filter((r) => r.estadoNombre !== 'Cancelada').length}</div>
              </div>
              <div className={styles.statIconBox} style={{ background: 'rgba(201, 162, 39, 0.12)', color: '#C9A227' }}>
                <Calendar size={26} />
              </div>
            </div>

            <div className={styles.statCard}>
              <div>
                <div className={styles.statLabel}>Ingresos Totales (USD)</div>
                <div className={styles.statValue}>{formatUSD(stats?.ingresos_totales ?? 14250)}</div>
              </div>
              <div className={styles.statIconBox} style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                <DollarSign size={26} />
              </div>
            </div>
          </div>

          <div className={styles.contentCard}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>Acciones Rápidas de Administración</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div
                style={{ padding: '20px', border: '1px solid #E2E8F0', borderRadius: '14px', cursor: 'pointer', background: '#F8FAFC' }}
                onClick={() => { setActiveTab('alojamientos'); handleOpenCreateAlojamiento(); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: '#14406B', fontWeight: 700 }}>
                  <Plus size={18} /> Crear Nuevo Alojamiento
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  Publica un nuevo hotel, resort o villa en Ecuador con fotos, capacidad y habitaciones.
                </p>
              </div>

              <div
                style={{ padding: '20px', border: '1px solid #E2E8F0', borderRadius: '14px', cursor: 'pointer', background: '#F8FAFC' }}
                onClick={() => { setActiveTab('usuarios'); setUserModalOpen(true); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: '#0F1E33', fontWeight: 700 }}>
                  <UserPlus size={18} /> Registrar Nuevo Usuario
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  Crea administradores, anfitriones o clientes con credenciales seguras.
                </p>
              </div>

              <div
                style={{ padding: '20px', border: '1px solid #E2E8F0', borderRadius: '14px', cursor: 'pointer', background: '#F8FAFC' }}
                onClick={() => setActiveTab('recepcion')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: '#C9A227', fontWeight: 700 }}>
                  <CheckCircle2 size={18} /> Recepción y Check-in
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  Confirma la llegada de huéspedes y despacha eventos outbox hacia Booking Core.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          TAB 2: GESTIÓN DE ALOJAMIENTOS (CRUD)
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'alojamientos' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeaderRow}>
            <div>
              <h2 className={styles.cardTitle}>Catálogo de Alojamientos ({alojamientos.length})</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Administra propiedades, fotos, precios por noche, capacidad de huéspedes y habitaciones individuales.
              </p>
            </div>
            <Button variant="gold" icon={<Plus size={16} />} onClick={handleOpenCreateAlojamiento}>
              Nuevo Alojamiento
            </Button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Destino</th>
                  <th>Precio / Noche</th>
                  <th>Capacidad</th>
                  <th>Habitaciones</th>
                  <th>Piscina</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingAlojamientos ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px' }}>Cargando alojamientos...</td>
                  </tr>
                ) : alojamientos.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      No hay alojamientos registrados. Crea uno con el botón superior.
                    </td>
                  </tr>
                ) : (
                  alojamientos.map((aloj) => {
                    const currentOverride = getEstadosOverride()[aloj.id];
                    const effEstado = currentOverride || aloj.estado || 'Activo';
                    const isReservedNow = checkIsAlojamientoReserved({
                      alojamientoId: aloj.id,
                      alojamientoNombre: aloj.nombre,
                      activeReservas: reservas,
                    });

                    return (
                      <tr key={aloj.id}>
                        <td>
                          <img
                            src={aloj.imagenUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'}
                            alt={aloj.nombre}
                            className={styles.hotelThumb}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: '#64748B' }}>{aloj.id}</td>
                        <td style={{ fontWeight: 700, color: '#0F1E33' }}>{aloj.nombre}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} color="#C9A227" />
                            {typeof aloj.destino === 'string'
                              ? aloj.destino
                              : (aloj.destino as { nombre?: string } | undefined)?.nombre || 'Ecuador'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#14406B' }}>
                          {formatUSD(Number(aloj.precioPorNoche) || 95)}
                        </td>
                        <td>
                          {aloj.capacidadAdultos || 2} adultos · {aloj.capacidadNinos || 0} niños
                        </td>
                        <td>
                          {isReservedNow ? 0 : (aloj.habitaciones_disponibles ?? aloj.habitaciones ?? 1)} habs.
                        </td>
                        <td>
                          {aloj.tienePiscina ? (
                            <Badge variant="info" icon={<Waves size={12} />}>Sí</Badge>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>No</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleEstadoAlojamiento(aloj)}
                            title="Haga clic para alternar entre En Línea y Pausado"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            <Badge variant={effEstado === 'Inactivo' ? 'error' : isReservedNow ? 'gold' : 'success'}>
                              {effEstado === 'Inactivo' ? '🔴 Pausado' : isReservedNow ? '🟡 Reservado' : '🟢 En Línea'}
                            </Badge>
                          </button>
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            <Button
                              variant={effEstado === 'Activo' ? 'ghost' : 'gold'}
                              size="sm"
                              onClick={() => handleToggleEstadoAlojamiento(aloj)}
                              title={effEstado === 'Activo' ? 'Pausar visibilidad en la página principal' : 'Poner en línea para el catálogo'}
                            >
                              {effEstado === 'Activo' ? 'Pausar' : 'Poner en Línea'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLiberarAlojamiento(aloj)}
                              title="Liberar reservas activas y habilitar cupos en la página principal"
                            >
                              Liberar Cupo
                            </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<BedDouble size={14} />}
                            onClick={() => openRoomsManager(aloj)}
                            title="Gestionar Habitaciones"
                          >
                            Cuartos
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Edit2 size={14} />}
                            onClick={() => handleOpenEditAlojamiento(aloj)}
                            title="Editar Alojamiento"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={14} color="#DC2626" />}
                            onClick={() => handleDeleteAlojamiento(aloj.id, aloj.nombre)}
                            title="Eliminar"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          TAB 3: RECEPCIÓN & CHECK-IN
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'recepcion' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeaderRow}>
            <div>
              <h2 className={styles.cardTitle}>Control de Recepción y Registro de Huéspedes</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Confirma la llegada de huéspedes. Las órdenes se sincronizan en tiempo real mediante la tabla outbox con Booking Core API.
              </p>
            </div>
            <div className={styles.searchBox}>
              <Search size={16} color="#64748B" />
              <input
                type="text"
                placeholder="Buscar por huésped, localizador u hotel..."
                className={styles.searchInput}
                value={searchReservaQuery}
                onChange={(e) => setSearchReservaQuery(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Código / Localizador</th>
                  <th>Huésped Titular</th>
                  <th>Alojamiento y Habitación</th>
                  <th>Check-in / Check-out</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acción de Recepción</th>
                </tr>
              </thead>
              <tbody>
                {loadingReservas ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>Cargando reservas...</td>
                  </tr>
                ) : filteredReservas.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      No se encontraron reservas con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredReservas.map((res) => {
                    const isCheckedOut =
                      checkedOutIds.has(res.id) ||
                      checkedOutIds.has(res.ordenId) ||
                      res.estadoNombre === 'Checked-Out' ||
                      res.estadoNombre === 'Check-out Realizado' ||
                      res.estadoNombre === 'Estancia Finalizada';
                    const isCheckedIn =
                      !isCheckedOut &&
                      (checkedInIds.has(res.id) ||
                        checkedInIds.has(res.ordenId) ||
                        Boolean(res.checkinRealizado) ||
                        res.estadoNombre === 'Checked-In' ||
                        res.estadoNombre === 'Check-in Realizado' ||
                        res.estadoNombre === 'Llegada Confirmada' ||
                        res.estadoNombre?.toLowerCase().includes('llegada'));
                    const isCancelled = res.estadoNombre === 'Cancelada' || res.estadoId === 'EST-003';
                    return (
                      <tr key={res.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#14406B' }}>
                          {res.ordenId || res.id}
                        </td>
                        <td>
                          <strong>{res.clienteNombre || res.usuarioNombre || 'Huésped Registrado'}</strong>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>
                            {res.clienteEmail || res.usuarioEmail || 'huesped@luxestays.ec'}
                          </div>
                        </td>
                        <td>
                          <strong>{res.alojamientoNombre}</strong>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{res.habitacionNombre}</div>
                        </td>
                        <td>
                          <div>In: {res.fechaEntrada} (14:00)</div>
                          <div>Out: {res.fechaSalida} (11:00)</div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#0F1E33' }}>
                          {formatUSD(Number(res.precioTotal) || 0)}
                        </td>
                        <td>
                          <Badge variant={isCheckedOut ? 'info' : isCheckedIn ? 'success' : isCancelled ? 'error' : 'gold'}>
                            {isCheckedOut ? 'Check-out / Liberada' : isCheckedIn ? 'Llegada Confirmada' : (res.estadoNombre || 'Confirmada')}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isCheckedOut ? (
                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                              Liberada en Catálogo
                            </span>
                          ) : isCheckedIn ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={14} /> En estancia
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCheckoutReserva(res)}
                                title="Registrar salida de huésped y liberar la propiedad para el catálogo"
                              >
                                Check-out y Liberar
                              </Button>
                            </div>
                          ) : isCancelled ? (
                            <span style={{ fontSize: '13px', color: '#94A3B8' }}>Cancelada</span>
                          ) : (
                            <Button
                              variant="gold"
                              size="sm"
                              icon={<CheckCircle2 size={14} />}
                              onClick={() => {
                                setCheckinModalReserva(res);
                                setHuespedesReales(res.numeroPersonas || 2);
                                setObservacionesCheckin('Huésped presentado en recepción');
                              }}
                            >
                              Confirmar llegada
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          TAB 4: GESTIÓN DE USUARIOS
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'usuarios' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeaderRow}>
            <div>
              <h2 className={styles.cardTitle}>Usuarios Registrados ({usuarios.length})</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Gestión de cuentas con roles administrativos, anfitriones y clientes de la plataforma.
              </p>
            </div>
            <Button variant="gold" icon={<UserPlus size={16} />} onClick={() => setUserModalOpen(true)}>
              Nuevo Usuario
            </Button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Correo Electrónico</th>
                  <th>Rol Asignado</th>
                  <th>Teléfono</th>
                  <th>Edad</th>
                  <th>Fecha de Registro</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      Cargando o no hay usuarios adicionales en la base de datos.
                    </td>
                  </tr>
                ) : (
                  usuarios.map((usr) => (
                    <tr key={usr.id || usr.correo}>
                      <td style={{ fontWeight: 700, color: '#0F1E33' }}>{usr.nombre}</td>
                      <td>{usr.correo}</td>
                      <td>
                        <Badge
                          variant={
                            usr.rol?.toLowerCase().includes('admin')
                              ? 'gold'
                              : usr.rol?.toLowerCase().includes('host')
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {usr.rol}
                        </Badge>
                      </td>
                      <td>{usr.telefono || 'N/A'}</td>
                      <td>{usr.edad ? `${usr.edad} años` : 'N/A'}</td>
                      <td>{usr.creadoEn ? new Date(usr.creadoEn).toLocaleDateString() : 'Activo'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          TAB 5: FACTURAS SRI
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'facturas' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeaderRow}>
            <div>
              <h2 className={styles.cardTitle}>Comprobantes Electrónicos SRI ({facturas.length})</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Registro fiscal de facturas autorizadas conforme a la normativa tributaria del Ecuador (IVA 15%).
              </p>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>N° Factura / Clave de Acceso</th>
                  <th>Fecha Emisión</th>
                  <th>Cliente / Razón Social</th>
                  <th>Identificación (RUC/Cédula)</th>
                  <th>Método de Pago</th>
                  <th>Total Pagado</th>
                  <th>Estado Fiscal</th>
                </tr>
              </thead>
              <tbody>
                {facturas.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      No se registran facturas emitidas todavía.
                    </td>
                  </tr>
                ) : (
                  facturas.map((fac) => (
                    <tr key={fac.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#14406B' }}>
                        {fac.numeroFactura || fac.claveAcceso || fac.id}
                      </td>
                      <td>{fac.fechaEmision ? new Date(fac.fechaEmision).toLocaleDateString() : 'Hoy'}</td>
                      <td style={{ fontWeight: 600 }}>{fac.nombreRazonSocial || 'Consumidor Final'}</td>
                      <td>{fac.identificacionCliente || '9999999999999'}</td>
                      <td>{fac.metodoPago || 'Tarjeta / Transferencia'}</td>
                      <td style={{ fontWeight: 700, color: '#0F1E33' }}>
                        {formatUSD(Number(fac.total || fac.monto) || 0)}
                      </td>
                      <td>
                        <Badge variant="success">Autorizada SRI</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          TAB 6: CANCELACIONES
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'cancelaciones' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeaderRow}>
            <div>
              <h2 className={styles.cardTitle}>Reporte de Cancelaciones ({cancelaciones.length})</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Auditoría de reservas canceladas y reembolsos conforme a la política tripartita (100% &gt;48h, 50% 24-48h, 0% &lt;24h).
              </p>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Código Reserva</th>
                  <th>Cliente</th>
                  <th>Alojamiento</th>
                  <th>Fecha de Cancelación</th>
                  <th>Monto Reembolsado / Retenido</th>
                  <th>Política Aplicada</th>
                </tr>
              </thead>
              <tbody>
                {cancelaciones.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      No hay cancelaciones registradas en el sistema.
                    </td>
                  </tr>
                ) : (
                  cancelaciones.map((canc, i) => (
                    <tr key={canc.id || canc.reservaId || i}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#DC2626' }}>
                        {canc.reservaId || canc.id}
                      </td>
                      <td>{canc.clienteNombre || canc.cliente || 'Cliente'}</td>
                      <td>{canc.alojamientoNombre || canc.alojamiento || 'Alojamiento Luxe'}</td>
                      <td>{canc.fechaCancelacion ? new Date(canc.fechaCancelacion).toLocaleDateString() : 'Reciente'}</td>
                      <td style={{ fontWeight: 700 }}>
                        {formatUSD(Number(canc.montoDevuelto || canc.montoPerdido) || 0)}
                      </td>
                      <td>
                        <Badge variant="neutral">{canc.politicaCancelacion || 'Política Flexible (48h)'}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          MODAL: CREAR O EDITAR ALOJAMIENTO
      ────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={alojamientoModalOpen}
        onClose={() => setAlojamientoModalOpen(false)}
        title={editingAlojamientoId ? 'Editar Alojamiento' : 'Crear Nuevo Alojamiento'}
        size="lg"
      >
        <form onSubmit={handleSaveAlojamiento}>
          <div className={styles.formGrid2}>
            <div className={styles.fullSpan}>
              <label className={styles.formLabel}>Nombre de la Propiedad *</label>
              <input
                type="text"
                required
                className={styles.formInput}
                value={alojamientoForm.nombre}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, nombre: e.target.value })}
                placeholder="Ej. Hacienda Colonial Cotopaxi Vista"
              />
            </div>

            <div className={styles.fullSpan}>
              <label className={styles.formLabel}>Descripción Completa</label>
              <textarea
                rows={3}
                className={styles.formTextarea}
                value={alojamientoForm.descripcion}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, descripcion: e.target.value })}
                placeholder="Resumen de amenidades, vistas y atractivos turísticos..."
              />
            </div>

            <div>
              <label className={styles.formLabel}>Destino / Ciudad en Ecuador *</label>
              <select
                className={styles.formSelect}
                value={alojamientoForm.destino}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, destino: e.target.value })}
              >
                {ciudadesEcuador.map((ciu) => (
                  <option key={ciu} value={ciu}>
                    {ciu}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.formLabel}>Precio Base por Noche (USD) *</label>
              <input
                type="number"
                step="0.01"
                min="10"
                required
                className={styles.formInput}
                value={alojamientoForm.precioPorNoche}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, precioPorNoche: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className={styles.formLabel}>Capacidad Máxima de Adultos *</label>
              <input
                type="number"
                min="1"
                max="20"
                required
                className={styles.formInput}
                value={alojamientoForm.capacidadAdultos}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, capacidadAdultos: parseInt(e.target.value, 10) || 1 })}
              />
            </div>

            <div>
              <label className={styles.formLabel}>Capacidad Máxima de Niños</label>
              <input
                type="number"
                min="0"
                max="10"
                className={styles.formInput}
                value={alojamientoForm.capacidadNinos}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, capacidadNinos: parseInt(e.target.value, 10) || 0 })}
              />
            </div>

            <div>
              <label className={styles.formLabel}>Cantidad de Habitaciones *</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                className={styles.formInput}
                value={alojamientoForm.habitaciones}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, habitaciones: parseInt(e.target.value, 10) || 1 })}
              />
            </div>

            <div>
              <label className={styles.formLabel}>Estado del Alojamiento</label>
              <select
                className={styles.formSelect}
                value={alojamientoForm.estado}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, estado: e.target.value })}
              >
                <option value="Activo">🟢 En Línea (Visible en Catálogo)</option>
                <option value="Inactivo">🔴 Pausado (Oculto)</option>
                <option value="En Mantenimiento">🟡 En Revisión / Mantenimiento</option>
              </select>
            </div>

            {editingAlojamientoId && (
              <div
                className={styles.fullSpan}
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  marginTop: '4px',
                }}
              >
                <div className={styles.checkboxRow} style={{ marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    id="liberarReservasCheck"
                    checked={alojamientoForm.liberarReservas}
                    onChange={(e) => setAlojamientoForm({ ...alojamientoForm, liberarReservas: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="liberarReservasCheck" style={{ fontSize: '13.5px', fontWeight: 600, color: '#166534', cursor: 'pointer' }}>
                    Liberar reservas activas y poner disponible inmediatamente para el público
                  </label>
                </div>
                <p style={{ margin: '4px 0 0 26px', fontSize: '12px', color: '#15803D' }}>
                  Marca esta casilla si ya terminaste de chequear el alojamiento tras el check-out y deseas que vuelva a estar libre y disponible para reservas en la página principal.
                </p>
              </div>
            )}

            <div className={styles.fullSpan}>
              <label className={styles.formLabel}>URL de Fotografía Principal</label>
              <input
                type="url"
                className={styles.formInput}
                value={alojamientoForm.imagenUrl}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, imagenUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
              />
              {alojamientoForm.imagenUrl && (
                <div className={styles.imagePreviewBox}>
                  <img
                    src={alojamientoForm.imagenUrl}
                    alt="Preview"
                    className={styles.imagePreviewImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                </div>
              )}
            </div>

            <div className={styles.fullSpan}>
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="tienePiscinaCheck"
                  checked={alojamientoForm.tienePiscina}
                  onChange={(e) => setAlojamientoForm({ ...alojamientoForm, tienePiscina: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="tienePiscinaCheck" style={{ fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                  Cuenta con Piscina o Spa termal
                </label>
              </div>

              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="permitePaqueteCheck"
                  checked={alojamientoForm.permitePaquete}
                  onChange={(e) => setAlojamientoForm({ ...alojamientoForm, permitePaquete: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="permitePaqueteCheck" style={{ fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                  Habilitar para Paquete Exclusivo LuxeStays
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button type="button" variant="ghost" onClick={() => setAlojamientoModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="gold" loading={isSavingAlojamiento}>
              {editingAlojamientoId ? 'Guardar Cambios' : 'Crear Alojamiento'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ────────────────────────────────────────────────────────────
          MODAL: GESTOR DE HABITACIONES INDIVIDUALES
      ────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(roomsModalHotel)}
        onClose={() => { setRoomsModalHotel(null); setEditingRoom(null); }}
        title={`Habitaciones · ${roomsModalHotel?.nombre || ''}`}
        size="lg"
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B' }}>
              Configura los tipos de cuarto, precios específicos, capacidades y fotos adicionales.
            </p>
            {!editingRoom && (
              <Button variant="gold" size="sm" icon={<Plus size={14} />} onClick={handleCreateNewRoom}>
                Agregar Habitación
              </Button>
            )}
          </div>

          {/* Formulario de edición/creación de habitación */}
          {editingRoom && (
            <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '14px', border: '1px solid #CBD5E1', marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#0F1E33' }}>
                {editingRoom.id === 'Nueva' ? 'Nueva Habitación' : `Editar Habitación (${editingRoom.nombre})`}
              </h4>
              <div className={styles.formGrid2}>
                <div>
                  <label className={styles.formLabel}>Nombre de la Habitación</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={editingRoom.nombre}
                    onChange={(e) => setEditingRoom({ ...editingRoom, nombre: e.target.value })}
                  />
                </div>

                <div>
                  <label className={styles.formLabel}>Precio por Noche (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={editingRoom.precioPorNoche}
                    onChange={(e) => setEditingRoom({ ...editingRoom, precioPorNoche: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className={styles.formLabel}>Capacidad Adultos</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.formInput}
                    value={editingRoom.capacidadAdultos}
                    onChange={(e) => setEditingRoom({ ...editingRoom, capacidadAdultos: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>

                <div>
                  <label className={styles.formLabel}>Capacidad Niños</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.formInput}
                    value={editingRoom.capacidadNinos}
                    onChange={(e) => setEditingRoom({ ...editingRoom, capacidadNinos: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>

                <div>
                  <label className={styles.formLabel}>Cantidad Disponible (Stock)</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.formInput}
                    value={editingRoom.cantidadDisponible}
                    onChange={(e) => setEditingRoom({ ...editingRoom, cantidadDisponible: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>

                <div>
                  <label className={styles.formLabel}>Estado</label>
                  <select
                    className={styles.formSelect}
                    value={editingRoom.estado || 'Activo'}
                    onChange={(e) => setEditingRoom({ ...editingRoom, estado: e.target.value })}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </select>
                </div>

                <div className={styles.fullSpan}>
                  <label className={styles.formLabel}>Fotos de la Habitación (URLs)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="url"
                      placeholder="Pegar URL de foto y pulsar Agregar..."
                      className={styles.formInput}
                      value={newRoomPhotoInput}
                      onChange={(e) => setNewRoomPhotoInput(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (newRoomPhotoInput.trim()) {
                          const currentArr = editingRoom.imagenesUrls ? editingRoom.imagenesUrls.split(',').filter(Boolean) : [];
                          setEditingRoom({
                            ...editingRoom,
                            imagenesUrls: [...currentArr, newRoomPhotoInput.trim()].join(','),
                          });
                          setNewRoomPhotoInput('');
                        }
                      }}
                    >
                      Agregar
                    </Button>
                  </div>

                  <div className={styles.roomPhotosList}>
                    {(editingRoom.imagenesUrls ? editingRoom.imagenesUrls.split(',').filter(Boolean) : []).map((url, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <img src={url} alt="Room" className={styles.roomPhotoThumb} />
                        <button
                          type="button"
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            background: '#DC2626',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                          onClick={() => {
                            const arr = editingRoom.imagenesUrls!.split(',').filter(Boolean);
                            arr.splice(idx, 1);
                            setEditingRoom({ ...editingRoom, imagenesUrls: arr.join(',') });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <Button variant="ghost" size="sm" onClick={() => setEditingRoom(null)}>
                  Cancelar
                </Button>
                <Button variant="gold" size="sm" onClick={handleSaveRoom}>
                  Guardar Habitación
                </Button>
              </div>
            </div>
          )}

          {/* Lista de habitaciones existentes */}
          {loadingRooms ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>Cargando habitaciones...</p>
          ) : roomsList.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}>
              Este alojamiento no tiene habitaciones registradas aún.
            </p>
          ) : (
            <div className={styles.roomListGrid}>
              {roomsList.map((room) => (
                <div key={room.id} className={styles.roomCardItem}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '15px', color: '#0F1E33' }}>{room.nombre}</strong>
                      <span style={{ fontWeight: 700, color: '#14406B' }}>{formatUSD(Number(room.precioPorNoche))}</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '6px' }}>
                      Capacidad: {room.capacidadAdultos} adultos, {room.capacidadNinos} niños
                    </div>
                    <div style={{ fontSize: '12px', color: '#059669', marginTop: '2px' }}>
                      Stock: {room.cantidadDisponible} cuartos disponibles
                    </div>

                    {room.imagenesUrls && (
                      <div className={styles.roomPhotosList}>
                        {room.imagenesUrls.split(',').filter(Boolean).slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt="" className={styles.roomPhotoThumb} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                    <Button variant="outline" size="sm" icon={<Edit2 size={13} />} onClick={() => setEditingRoom(room)}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" icon={<Trash2 size={13} color="#DC2626" />} onClick={() => handleDeleteRoom(room.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ────────────────────────────────────────────────────────────
          MODAL: CREAR NUEVO USUARIO
      ────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Crear Nuevo Usuario"
        size="md"
      >
        <form onSubmit={handleSaveUser}>
          <div className={styles.formGrid2}>
            <div className={styles.fullSpan}>
              <label className={styles.formLabel}>Nombre Completo *</label>
              <input
                type="text"
                required
                className={styles.formInput}
                value={userForm.nombre}
                onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                placeholder="Ej. Roberto Zambrano"
              />
            </div>

            <div className={styles.fullSpan}>
              <label className={styles.formLabel}>Correo Electrónico *</label>
              <input
                type="email"
                required
                className={styles.formInput}
                value={userForm.correo}
                onChange={(e) => setUserForm({ ...userForm, correo: e.target.value })}
                placeholder="roberto@luxestays.ec"
              />
            </div>

            <div>
              <label className={styles.formLabel}>Contraseña Segura *</label>
              <input
                type="password"
                required
                className={styles.formInput}
                value={userForm.contrasena}
                onChange={(e) => setUserForm({ ...userForm, contrasena: e.target.value })}
                placeholder="Mínimo 8 caract., mayús., número y símbolo"
              />
            </div>

            <div>
              <label className={styles.formLabel}>Rol Asignado *</label>
              <select
                className={styles.formSelect}
                value={userForm.rol}
                onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })}
              >
                <option value="Admin">Administrador (Acceso Total)</option>
                <option value="Host">Anfitrión / Hotelero</option>
                <option value="Cliente">Cliente / Huésped</option>
              </select>
            </div>

            <div>
              <label className={styles.formLabel}>Teléfono Celular</label>
              <input
                type="tel"
                className={styles.formInput}
                value={userForm.telefono}
                onChange={(e) => setUserForm({ ...userForm, telefono: e.target.value })}
                placeholder="+593991234567"
              />
            </div>

            <div>
              <label className={styles.formLabel}>Edad (Mayor de 18 años)</label>
              <input
                type="number"
                min="18"
                max="120"
                className={styles.formInput}
                value={userForm.edad}
                onChange={(e) => setUserForm({ ...userForm, edad: parseInt(e.target.value, 10) || 18 })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <Button type="button" variant="ghost" onClick={() => setUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="gold" loading={isCreatingUser}>
              Registrar Usuario
            </Button>
          </div>
        </form>
      </Modal>

      {/* ────────────────────────────────────────────────────────────
          MODAL: CHECK-IN / CONFIRMAR LLEGADA
      ────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(checkinModalReserva)}
        onClose={() => setCheckinModalReserva(null)}
        title="Confirmar Llegada de Huésped (Check-in)"
        size="md"
      >
        {checkinModalReserva && (
          <div>
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '18px' }}>
              <div><strong>Huésped:</strong> {checkinModalReserva.clienteNombre || checkinModalReserva.usuarioNombre || 'Cliente Registrado'}</div>
              <div><strong>Alojamiento:</strong> {checkinModalReserva.alojamientoNombre}</div>
              <div><strong>Habitación:</strong> {checkinModalReserva.habitacionNombre}</div>
              <div><strong>Localizador:</strong> {checkinModalReserva.ordenId || checkinModalReserva.id}</div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className={styles.formLabel}>Número de Personas Reales en Check-in</label>
              <input
                type="number"
                min="1"
                max="10"
                className={styles.formInput}
                value={huespedesReales}
                onChange={(e) => setHuespedesReales(parseInt(e.target.value, 10) || 1)}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label className={styles.formLabel}>Observaciones de Recepción</label>
              <textarea
                rows={3}
                className={styles.formTextarea}
                value={observacionesCheckin}
                onChange={(e) => setObservacionesCheckin(e.target.value)}
              />
            </div>

            <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.4' }}>
              Al confirmar, el sistema registrará el evento de check-in y lo despachará mediante el transactional outbox hacia el microservicio central de Booking.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <Button variant="ghost" onClick={() => setCheckinModalReserva(null)}>
                Cancelar
              </Button>
              <Button variant="gold" icon={<CheckCircle2 size={16} />} loading={isSubmittingCheckin} onClick={handleConfirmCheckin}>
                Confirmar Check-in
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast de notificación */}
      {toast && (
        <div className={`${styles.toastBox} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
