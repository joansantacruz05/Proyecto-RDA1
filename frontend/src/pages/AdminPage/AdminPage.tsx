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
  DoorOpen,
  SlidersHorizontal,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { api, getAuthToken } from '../../api/client';
import { HabitacionAdmin, ReservaAdminItem, UsuarioSession } from '../../api/types';
import {
  setAdminAlojamientoEstado,
  liberarAlojamiento,
  setAlojamientoEnLimpieza,
  getEstadosOverride,
  checkIsAlojamientoReserved,
} from '../../utils/accommodationStatus';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { formatUSD } from '../../components/ui/PriceDisplay/PriceDisplay';
import { InteractiveMap } from '../../components/map/InteractiveMap';
import { ReceptionModalMode, ReceptionStayModal } from '../../components/admin/ReceptionStayModal';
import { InvoiceModal, InvoiceModalData } from '../../components/modals/InvoiceModal';
import { ExtraCargoItem } from '../../api/types';
import {
  formatHoraHHMM,
  getCityCenterCoords,
  hasValidCoordinates,
} from '../../utils/ecuadorLocations';
import { toIsoDateOnly } from '../../utils/receptionFolio';
import styles from './AdminPage.module.css';

interface AdminPageProps {
  currentUser: UsuarioSession | null;
}

interface StatsData {
  total_alojamientos?: number;
  reservas_activas?: number;
  ingresos_totales?: number;
  alojamientos_en_limpieza?: number;
}

interface AlojamientoAdmin {
  id: string;
  nombre: string;
  descripcion?: string;
  destino: string;
  direccion?: string;
  latitud?: number | null;
  longitud?: number | null;
  horaCheckIn?: string;
  horaCheckOut?: string;
  ubicacionId?: string;
  precioPorNoche?: number | string;
  capacidadAdultos?: number;
  capacidadNinos?: number;
  habitaciones?: number;
  habitaciones_disponibles?: number;
  habitaciones_limpieza?: number;
  numHabitaciones?: number;
  numCamas?: number;
  tipoCamas?: string;
  enLimpiezaDesde?: string | null;
  imagenUrl?: string;
  tienePiscina?: boolean;
  estado?: string;
  propietario?: string;
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
  direccion?: string;
  subtotal?: number | string;
  iva?: number | string;
  tasaMunicipal?: number | string;
  total?: number | string;
  monto?: number | string;
  fechaEmision?: string;
  estado?: string;
  estadoPago?: string;
  metodoPago?: string;
  alojamientoNombre?: string;
  alojamientoDireccion?: string;
  alojamientoDestino?: string;
  habitacionNombre?: string;
  fechaEntrada?: string;
  fechaSalida?: string;
  huespedesReales?: number;
  numeroPersonas?: number;
  extrasCargos?: ExtraCargoItem[];
  cargosAdicionalesTotal?: number | string;
  ordenId?: string;
  reservaId?: string;
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
  const initialQuitoCoords = getCityCenterCoords('Quito');
  const [hasCustomPin, setHasCustomPin] = useState(false);
  const [alojamientoForm, setAlojamientoForm] = useState({
    nombre: '',
    descripcion: '',
    destino: 'Quito',
    direccion: '',
    latitud: initialQuitoCoords.lat,
    longitud: initialQuitoCoords.lng,
    horaCheckIn: '14:00',
    horaCheckOut: '11:00',
    precioPorNoche: 95,
    capacidadAdultos: 2,
    capacidadNinos: 1,
    habitaciones: 3,
    numHabitaciones: 1,
    numCamas: 1,
    tipoCamas: '1 Cama King / Queen',
    imagenUrl: '',
    tienePiscina: false,
    permitePaquete: true,
    estado: 'Activo',
    liberarReservas: false,
  });

  const handleOpenCreateAlojamiento = () => {
    const defaultDestino = ciudadesEcuador[0] || 'Quito';
    const cityCoords = getCityCenterCoords(defaultDestino);
    setEditingAlojamientoId(null);
    setHasCustomPin(false);
    setAlojamientoForm({
      nombre: '',
      descripcion: '',
      destino: defaultDestino,
      direccion: '',
      latitud: cityCoords.lat,
      longitud: cityCoords.lng,
      horaCheckIn: '14:00',
      horaCheckOut: '11:00',
      precioPorNoche: 95,
      capacidadAdultos: 2,
      capacidadNinos: 1,
      habitaciones: 3,
      numHabitaciones: 1,
      numCamas: 1,
      tipoCamas: '1 Cama King / Queen',
      imagenUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      tienePiscina: false,
      permitePaquete: true,
      estado: 'Activo',
      liberarReservas: false,
    });
    setAlojamientoModalOpen(true);
  };

  const handleOpenEditAlojamiento = (aloj: AlojamientoAdmin) => {
    const cityName =
      typeof aloj.destino === 'string'
        ? aloj.destino
        : (aloj.destino as { nombre?: string } | undefined)?.nombre || 'Quito';
    const validPin = hasValidCoordinates(aloj.latitud, aloj.longitud);
    const cityCoords = getCityCenterCoords(cityName);

    setEditingAlojamientoId(aloj.id);
    setHasCustomPin(validPin);
    setAlojamientoForm({
      nombre: aloj.nombre || '',
      descripcion: aloj.descripcion || '',
      destino: cityName,
      direccion: aloj.direccion || '',
      latitud: validPin ? Number(aloj.latitud) : cityCoords.lat,
      longitud: validPin ? Number(aloj.longitud) : cityCoords.lng,
      horaCheckIn: formatHoraHHMM(aloj.horaCheckIn, '14:00'),
      horaCheckOut: formatHoraHHMM(aloj.horaCheckOut, '11:00'),
      precioPorNoche: Number(aloj.precioPorNoche) || 95,
      capacidadAdultos: aloj.capacidadAdultos || 2,
      capacidadNinos: aloj.capacidadNinos || 0,
      habitaciones: aloj.habitaciones || 1,
      numHabitaciones: aloj.numHabitaciones || 1,
      numCamas: aloj.numCamas || 1,
      tipoCamas: aloj.tipoCamas || '1 Cama King / Queen',
      imagenUrl: aloj.imagenUrl || '',
      tienePiscina: Boolean(aloj.tienePiscina),
      permitePaquete: true,
      estado: aloj.estado || 'Activo',
      liberarReservas: false,
    });
    setAlojamientoModalOpen(true);
  };

  const handleMarkCleanAndOnline = async (alojamientoId: string, alojamientoNombre?: string | null) => {
    if (!alojamientoId) return;
    try {
      try {
        await api.post(`/admin/alojamientos/${alojamientoId}/marcar-limpio`, {});
      } catch {
        await api.patch(`/admin/alojamientos/${alojamientoId}`, {
          estado: 'Activo',
          liberarReservas: false,
        });
      }
      liberarAlojamiento(alojamientoId, alojamientoNombre);
      setAdminAlojamientoEstado(alojamientoId, 'Activo');

      showToast(
        `"${alojamientoNombre || alojamientoId}" marcado como limpio y habilitado nuevamente EN LÍNEA.`,
      );
      await Promise.all([refetchAlojamientos(), refetchReservas()]);
      queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['hotelDetail'] });
      queryClient.invalidateQueries({ queryKey: ['reservasActivasPublicas'] });
      queryClient.invalidateQueries({ queryKey: ['adminReservasTodas'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al habilitar alojamiento limpio', 'error');
    }
  };

  const handleToggleEstadoAlojamiento = async (aloj: AlojamientoAdmin) => {
    const currentOverride = getEstadosOverride()[aloj.id];
    const currentEstado =
      aloj.estado === 'En Limpieza' || currentOverride === 'En Limpieza'
        ? 'En Limpieza'
        : currentOverride || aloj.estado || 'Activo';

    if (currentEstado === 'En Limpieza') {
      await handleMarkCleanAndOnline(aloj.id, aloj.nombre);
      return;
    }

    const nuevoEstado = currentEstado === 'Activo' ? 'Inactivo' : 'Activo';

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
      await Promise.all([refetchAlojamientos(), refetchReservas()]);
      queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['hotelDetail'] });
      queryClient.invalidateQueries({ queryKey: ['reservasActivasPublicas'] });
      queryClient.invalidateQueries({ queryKey: ['adminReservasTodas'] });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al liberar alojamiento', 'error');
    }
  };

  const handleSaveAlojamiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAlojamiento(true);
    const payload = {
      ...alojamientoForm,
      direccion: alojamientoForm.direccion.trim() || `Centro de ${alojamientoForm.destino}`,
      latitud: Number(alojamientoForm.latitud),
      longitud: Number(alojamientoForm.longitud),
      horaCheckIn: formatHoraHHMM(alojamientoForm.horaCheckIn, '14:00'),
      horaCheckOut: formatHoraHHMM(alojamientoForm.horaCheckOut, '11:00'),
      numHabitaciones: Math.max(1, Number(alojamientoForm.numHabitaciones) || 1),
      numCamas: Math.max(1, Number(alojamientoForm.numCamas) || 1),
      tipoCamas: alojamientoForm.tipoCamas.trim() || '1 Cama Doble / Queen',
    };
    try {
      if (editingAlojamientoId) {
        if (payload.estado === 'En Limpieza') {
          setAlojamientoEnLimpieza(editingAlojamientoId, payload.nombre);
        } else {
          setAdminAlojamientoEstado(editingAlojamientoId, payload.estado);
          if (payload.liberarReservas || payload.estado === 'Activo') {
            liberarAlojamiento(editingAlojamientoId, payload.nombre);
          }
        }

        await api.patch(`/admin/alojamientos/${editingAlojamientoId}`, payload);
        showToast('Alojamiento actualizado exitosamente en el catálogo');
      } else {
        await api.post('/admin/alojamientos', payload);
        showToast('Nuevo alojamiento y habitaciones creados con éxito');
      }
      setAlojamientoModalOpen(false);
      refetchAlojamientos();
      queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['hotelDetail'] });
      queryClient.invalidateQueries({ queryKey: ['reservasActivasPublicas'] });
      queryClient.invalidateQueries({ queryKey: ['misReservas'] });
      queryClient.invalidateQueries({ queryKey: ['reservaDetail'] });
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
      numHabitaciones: 1,
      numCamas: 2,
      tipoCamas: '1 Cama King / Queen',
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
      queryClient.invalidateQueries({ queryKey: ['alojamientos'] });
      queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['hotelDetail', roomsModalHotel.id] });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al guardar habitación', 'error');
    }
  };

  const handleMarkRoomClean = async (habId: string) => {
    if (!roomsModalHotel) return;
    try {
      await api.post(`/admin/habitaciones/${habId}/marcar-limpio`, {});
      setRoomsList(roomsList.map((r) => (r.id === habId ? { ...r, estado: 'Activo' } : r)));
      showToast('Habitación marcada limpia y disponible');
      queryClient.invalidateQueries({ queryKey: ['alojamientos'] });
      queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['hotelDetail', roomsModalHotel.id] });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al marcar habitación limpia', 'error');
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

  // --- MODAL: CREAR Y EDITAR USUARIO ---
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    nombre: '',
    correo: '',
    contrasena: 'Admin2026*',
    rol: 'Admin',
    telefono: '+593991234567',
    edad: 28,
  });

  // --- MODAL: VER FACTURA SRI ---
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceModalData | null>(null);

  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setUserForm({
      nombre: '',
      correo: '',
      contrasena: 'Admin2026*',
      rol: 'Admin',
      telefono: '+593991234567',
      edad: 28,
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (usr: UsuarioAdminItem) => {
    setEditingUserId(usr.id);
    const rolLower = String(usr.rol || '').toLowerCase();
    const mappedRol = rolLower.includes('admin')
      ? 'Admin'
      : rolLower.includes('anfitr') || rolLower.includes('host') || rolLower.includes('hotel')
        ? 'Anfitrión'
        : 'Cliente';
    setUserForm({
      nombre: usr.nombre || '',
      correo: usr.correo || '',
      contrasena: '',
      rol: mappedRol,
      telefono: usr.telefono || '+593991234567',
      edad: usr.edad && usr.edad >= 18 ? usr.edad : 28,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      if (editingUserId) {
        const updatePayload: Record<string, unknown> = {
          nombre: userForm.nombre,
          correo: userForm.correo,
          rol: userForm.rol,
          telefono: userForm.telefono,
          edad: userForm.edad,
        };
        if (userForm.contrasena && userForm.contrasena.trim().length > 0) {
          updatePayload.contrasena = userForm.contrasena.trim();
        }
        await api.patch(`/admin/usuarios/${editingUserId}`, updatePayload);
        showToast(`Usuario ${userForm.nombre} (${userForm.rol}) actualizado exitosamente`);
      } else {
        await api.post('/auth/register', userForm);
        showToast(`Usuario ${userForm.correo} (${userForm.rol}) creado exitosamente`);
      }
      setUserModalOpen(false);
      setEditingUserId(null);
      refetchUsuarios();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al guardar usuario', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // --- CONTROL OPERATIVO DE CHECK-IN, ESTANCIA Y CHECK-OUT ---
  const [receptionModalState, setReceptionModalState] = useState<{
    mode: ReceptionModalMode;
    reserva: ReservaAdminItem;
  } | null>(null);
  const [receptionFilter, setReceptionFilter] = useState<
    'todos' | 'pendientes' | 'estancia' | 'limpieza' | 'finalizados'
  >('todos');

  const getReservaLifecycle = (res: ReservaAdminItem) => {
    const isCancelled = res.estadoNombre === 'Cancelada' || res.estadoId === 'EST-003';
    const isCleaning =
      !isCancelled &&
      (res.estadoId === 'EST-004' ||
        res.estadoNombre === 'En Limpieza' ||
        (Boolean(res.checkoutRealizado) &&
          res.limpiezaCompletada === false &&
          res.estadoId !== 'EST-005'));
    const isCheckedOut =
      !isCancelled &&
      (isCleaning ||
        Boolean(res.checkoutRealizado) ||
        res.estadoId === 'EST-005' ||
        res.estadoNombre === 'Finalizada' ||
        res.estadoNombre === 'Checked-Out' ||
        res.estadoNombre === 'Check-out Realizado' ||
        res.estadoNombre === 'Estancia Finalizada');
    const isCheckedIn =
      !isCancelled &&
      !isCheckedOut &&
      (Boolean(res.checkinRealizado) ||
        res.estadoNombre === 'Checked-In' ||
        res.estadoNombre === 'Check-in Realizado' ||
        res.estadoNombre === 'Llegada Confirmada' ||
        Boolean(res.estadoNombre?.toLowerCase().includes('llegada')));
    return { isCancelled, isCleaning, isCheckedOut, isCheckedIn };
  };

  const receptionStats = useMemo(() => {
    let pendientes = 0;
    let enEstancia = 0;
    let enLimpieza = 0;
    let finalizados = 0;
    let totalExtras = 0;

    for (const r of reservas) {
      const { isCancelled, isCleaning, isCheckedOut, isCheckedIn } = getReservaLifecycle(r);
      if (isCancelled) continue;
      if (isCleaning) enLimpieza += 1;
      else if (isCheckedOut) finalizados += 1;
      else if (isCheckedIn) enEstancia += 1;
      else pendientes += 1;
      totalExtras += Number(r.cargosAdicionalesTotal || 0);
    }

    return {
      pendientes,
      enEstancia,
      enLimpieza,
      finalizados,
      totalExtras: Number(totalExtras.toFixed(2)),
    };
  }, [reservas]);

  // Buscador y filtro operativo de reservas
  const [searchReservaQuery, setSearchReservaQuery] = useState('');
  const filteredReservas = useMemo(() => {
    const q = searchReservaQuery.trim().toLowerCase();
    return reservas.filter((r) => {
      const { isCancelled, isCleaning, isCheckedOut, isCheckedIn } = getReservaLifecycle(r);
      if (receptionFilter === 'pendientes' && (isCancelled || isCheckedIn || isCheckedOut)) {
        return false;
      }
      if (receptionFilter === 'estancia' && !isCheckedIn) {
        return false;
      }
      if (receptionFilter === 'limpieza' && !isCleaning) {
        return false;
      }
      if (receptionFilter === 'finalizados' && (!isCheckedOut || isCleaning)) {
        return false;
      }
      if (!q) return true;
      return (
        r.ordenId?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q) ||
        r.alojamientoNombre?.toLowerCase().includes(q) ||
        r.habitacionNombre?.toLowerCase().includes(q) ||
        (r.clienteIdentificacion && r.clienteIdentificacion.toLowerCase().includes(q)) ||
        (r.clienteNombre && r.clienteNombre.toLowerCase().includes(q)) ||
        (r.usuarioNombre && r.usuarioNombre.toLowerCase().includes(q))
      );
    });
  }, [reservas, searchReservaQuery, receptionFilter]);

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
          <DoorOpen size={16} /> Check-in & Check-out ({reservas.length})
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

            <div className={styles.statCard}>
              <div>
                <div className={styles.statLabel}>Alojamientos en Limpieza</div>
                <div className={styles.statValue}>
                  {stats?.alojamientos_en_limpieza ??
                    alojamientos.filter((a) => a.estado === 'En Limpieza').length}
                </div>
              </div>
              <div className={styles.statIconBox} style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#B45309' }}>
                <Sparkles size={26} />
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
                  <th>Habs · Camas · Stock</th>
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
                    const effEstado =
                      aloj.estado === 'En Limpieza' || currentOverride === 'En Limpieza'
                        ? 'En Limpieza'
                        : currentOverride || aloj.estado || 'Activo';
                    const isCleaningState = effEstado === 'En Limpieza';
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
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            In {formatHoraHHMM(aloj.horaCheckIn, '14:00')} · Out {formatHoraHHMM(aloj.horaCheckOut, '11:00')}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#14406B' }}>
                          {formatUSD(Number(aloj.precioPorNoche) || 95)}
                        </td>
                        <td>
                          {aloj.capacidadAdultos || 2} adultos · {aloj.capacidadNinos || 0} niños
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F1E33' }}>
                            {aloj.numHabitaciones || 1} hab{(aloj.numHabitaciones || 1) === 1 ? '' : 's'}. · {aloj.numCamas || 1} cama{(aloj.numCamas || 1) === 1 ? '' : 's'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                            Cupos disp: {isCleaningState || isReservedNow ? 0 : (aloj.habitaciones_disponibles ?? aloj.habitaciones ?? 1)}
                          </div>
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
                            title={isCleaningState ? 'Confirmar limpieza completada y poner en línea' : 'Haga clic para alternar entre En Línea y Pausado'}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            <Badge variant={effEstado === 'Inactivo' ? 'error' : isCleaningState ? 'gold' : isReservedNow ? 'gold' : 'success'}>
                              {effEstado === 'Inactivo'
                                ? '🔴 Pausado'
                                : isCleaningState
                                  ? '🧹 En Limpieza'
                                  : effEstado === 'En Mantenimiento'
                                    ? '🛠️ Mantenimiento'
                                    : isReservedNow
                                      ? '🟡 Reservado'
                                      : '🟢 En Línea'}
                            </Badge>
                          </button>
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            {isCleaningState ? (
                              <Button
                                variant="gold"
                                size="sm"
                                icon={<Sparkles size={14} />}
                                onClick={() => handleMarkCleanAndOnline(aloj.id, aloj.nombre)}
                                title="Confirmar que la limpieza terminó y habilitar nuevamente en línea"
                              >
                                Marcar Limpio → En Línea
                              </Button>
                            ) : (
                              <>
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
                              </>
                            )}
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
          TAB 3: CHECK-IN, ESTANCIA & CHECK-OUT OPERATIVO
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'recepcion' && (
        <div className={styles.contentCard}>
          <div className={styles.cardHeaderRow}>
            <div>
              <h2 className={styles.cardTitle}>Operación de Check-in y Check-out</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Confirma llegadas con cédula, ajusta el número real de personas, cambia habitaciones o añade consumos extras antes y durante la estancia, y liquida el check-out.
              </p>
            </div>
          </div>

          {/* Resumen Operativo */}
          <div className={styles.miniStatsGrid}>
            <div className={styles.miniStatCard}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Pendientes de Check-in
              </span>
              <strong style={{ fontSize: '1.5rem', color: '#92400E' }}>{receptionStats.pendientes}</strong>
            </div>
            <div className={styles.miniStatCard}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                En Estancia (Listos p/ Check-out)
              </span>
              <strong style={{ fontSize: '1.5rem', color: '#059669' }}>{receptionStats.enEstancia}</strong>
            </div>
            <div className={styles.miniStatCard}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                En Limpieza (Post Check-out)
              </span>
              <strong style={{ fontSize: '1.5rem', color: '#B45309' }}>{receptionStats.enLimpieza}</strong>
            </div>
            <div className={styles.miniStatCard}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Finalizados (Limpios)
              </span>
              <strong style={{ fontSize: '1.5rem', color: '#14406B' }}>{receptionStats.finalizados}</strong>
            </div>
            <div className={styles.miniStatCard}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Cargos Extras Registrados
              </span>
              <strong style={{ fontSize: '1.5rem', color: '#0F1E33' }}>
                {formatUSD(receptionStats.totalExtras)}
              </strong>
            </div>
          </div>

          {/* Filtros de estado y buscador */}
          <div className={styles.filterBarRow}>
            <div className={styles.filterPills}>
              <button
                type="button"
                className={`${styles.filterPill} ${receptionFilter === 'todos' ? styles.filterPillActive : ''}`}
                onClick={() => setReceptionFilter('todos')}
              >
                Todos ({reservas.length})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${receptionFilter === 'pendientes' ? styles.filterPillActive : ''}`}
                onClick={() => setReceptionFilter('pendientes')}
              >
                Pendientes Check-in ({receptionStats.pendientes})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${receptionFilter === 'estancia' ? styles.filterPillActive : ''}`}
                onClick={() => setReceptionFilter('estancia')}
              >
                En Estancia / Check-out ({receptionStats.enEstancia})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${receptionFilter === 'limpieza' ? styles.filterPillActive : ''}`}
                onClick={() => setReceptionFilter('limpieza')}
              >
                🧹 En Limpieza ({receptionStats.enLimpieza})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${receptionFilter === 'finalizados' ? styles.filterPillActive : ''}`}
                onClick={() => setReceptionFilter('finalizados')}
              >
                Finalizados ({receptionStats.finalizados})
              </button>
            </div>

            <div className={styles.searchBox}>
              <Search size={16} color="#64748B" />
              <input
                type="text"
                placeholder="Buscar por cédula, huésped, localizador, habitación u hotel..."
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
                  <th>Código</th>
                  <th>Huésped y Personas</th>
                  <th>Alojamiento y Habitación</th>
                  <th>Check-in / Check-out</th>
                  <th>Folio y Extras</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Operación de Recepción</th>
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
                      No se encontraron reservas con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredReservas.map((res) => {
                    const { isCancelled, isCleaning, isCheckedOut, isCheckedIn } = getReservaLifecycle(res);
                    const estPersonas = Number(res.numeroPersonas || 1);
                    const realPersonas = Number(res.huespedesReales ?? estPersonas);
                    const personasDifieren = realPersonas !== estPersonas;
                    const extrasTotal = Number(res.cargosAdicionalesTotal || 0);
                    const roomWasChanged = Boolean(
                      res.espacioOriginalId && res.espacioId && res.espacioOriginalId !== res.espacioId,
                    );
                    const initialPaid = Number(res.montoPagadoInicial ?? res.precioTotal ?? 0);
                    const totalActual = Number(res.precioTotal || 0);
                    const folioDiff = Number((totalActual - initialPaid).toFixed(2));

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
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                            {res.clienteIdentificacion && (
                              <span style={{ fontSize: '11.5px', color: '#14406B', fontWeight: 600 }}>
                                ID: {res.clienteIdentificacion}
                              </span>
                            )}
                            <Badge variant={personasDifieren ? 'gold' : 'neutral'}>
                              {personasDifieren
                                ? `Pers: ${realPersonas} real (est. ${estPersonas})`
                                : `${estPersonas} pers.`}
                            </Badge>
                          </div>
                        </td>
                        <td>
                          <strong>{res.alojamientoNombre}</strong>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                            {res.habitacionNombre}
                          </div>
                          {roomWasChanged && (
                            <div style={{ marginTop: '4px' }}>
                              <Badge variant="info">Habitación cambiada</Badge>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>
                            In: {toIsoDateOnly(res.fechaEntrada)} ({formatHoraHHMM(res.horaCheckIn, '14:00')})
                          </div>
                          <div style={{ fontWeight: 500 }}>
                            Out: {toIsoDateOnly(res.fechaSalida)} ({formatHoraHHMM(res.horaCheckOut, '11:00')})
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F1E33' }}>
                            {formatUSD(totalActual)}
                          </div>
                          {extrasTotal > 0 && (
                            <div style={{ fontSize: '11.5px', color: '#92400E', fontWeight: 600 }}>
                              Extras: +{formatUSD(extrasTotal)} ({Array.isArray(res.extrasCargos) ? res.extrasCargos.length : 1})
                            </div>
                          )}
                          {Math.abs(folioDiff) >= 0.01 && (
                            <div style={{ fontSize: '11.5px', color: folioDiff > 0 ? '#B42318' : '#059669', fontWeight: 600 }}>
                              Dif: {folioDiff > 0 ? '+' : ''}
                              {formatUSD(folioDiff)}
                            </div>
                          )}
                        </td>
                        <td>
                          <Badge variant={isCleaning ? 'gold' : isCheckedOut ? 'info' : isCheckedIn ? 'success' : isCancelled ? 'error' : 'gold'}>
                            {isCleaning
                              ? '🧹 En Limpieza (Check-out)'
                              : isCheckedOut
                                ? 'Finalizada (Limpia)'
                                : isCheckedIn
                                  ? 'En Estancia'
                                  : isCancelled
                                    ? 'Cancelada'
                                    : 'Pendiente Check-in'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isCheckedOut ? (
                            <div className={styles.actionBtnGroup}>
                              {isCleaning && (
                                <Button
                                  variant="gold"
                                  size="sm"
                                  icon={<Sparkles size={14} />}
                                  onClick={() =>
                                    handleMarkCleanAndOnline(
                                      res.alojamientoId ||
                                        alojamientos.find((a) => a.nombre === res.alojamientoNombre)?.id ||
                                        '',
                                      res.alojamientoNombre,
                                    )
                                  }
                                  title="Confirmar que la limpieza terminó y volver a habilitar en línea"
                                >
                                  Marcar Limpio · En Línea
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Receipt size={14} />}
                                onClick={() => setReceptionModalState({ mode: 'view', reserva: res })}
                              >
                                Ver Folio
                              </Button>
                            </div>
                          ) : isCheckedIn ? (
                            <div className={styles.actionBtnGroup}>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<SlidersHorizontal size={14} />}
                                onClick={() => setReceptionModalState({ mode: 'adjust', reserva: res })}
                                title="Cambiar habitación, ajustar número de huéspedes o añadir consumos/extras"
                              >
                                Hab. / Extras
                              </Button>
                              <Button
                                variant="gold"
                                size="sm"
                                icon={<DoorOpen size={14} />}
                                onClick={() => setReceptionModalState({ mode: 'checkout', reserva: res })}
                                title="Liquidar folio final, registrar salida y liberar habitación"
                              >
                                Check-out
                              </Button>
                            </div>
                          ) : isCancelled ? (
                            <span style={{ fontSize: '13px', color: '#94A3B8' }}>Cancelada</span>
                          ) : (
                            <div className={styles.actionBtnGroup}>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<SlidersHorizontal size={14} />}
                                onClick={() => setReceptionModalState({ mode: 'adjust', reserva: res })}
                                title="Ajustar habitación, personas o añadir extras antes del check-in"
                              >
                                Ajustar
                              </Button>
                              <Button
                                variant="gold"
                                size="sm"
                                icon={<CheckCircle2 size={14} />}
                                onClick={() => setReceptionModalState({ mode: 'checkin', reserva: res })}
                              >
                                Check-in
                              </Button>
                            </div>
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
            <Button variant="gold" icon={<UserPlus size={16} />} onClick={handleOpenCreateUser}>
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
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
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
                              : usr.rol?.toLowerCase().includes('host') || usr.rol?.toLowerCase().includes('anfitr')
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {usr.rol || 'Cliente'}
                        </Badge>
                      </td>
                      <td>{usr.telefono || 'N/A'}</td>
                      <td>{usr.edad ? `${usr.edad} años` : 'N/A'}</td>
                      <td>{usr.creadoEn ? new Date(usr.creadoEn).toLocaleDateString() : 'Activo'}</td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Edit2 size={14} />}
                          onClick={() => handleOpenEditUser(usr)}
                        >
                          Editar
                        </Button>
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
                  <th>Alojamiento</th>
                  <th>Método de Pago</th>
                  <th>Total Pagado</th>
                  <th>Estado Fiscal</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturas.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
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
                      <td>
                        <div style={{ fontWeight: 600 }}>{fac.alojamientoNombre || 'Hospedaje LuxeStays'}</div>
                        {fac.alojamientoDireccion && (
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>{fac.alojamientoDireccion}</div>
                        )}
                      </td>
                      <td>{fac.metodoPago || 'Tarjeta / Transferencia'}</td>
                      <td style={{ fontWeight: 700, color: '#0F1E33' }}>
                        {formatUSD(Number(fac.total || fac.monto) || 0)}
                      </td>
                      <td>
                        <Badge variant="success">Autorizada SRI</Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<FileText size={14} />}
                          onClick={() => {
                            const totalVal = Number(fac.total || fac.monto || 0);
                            const subtotalVal = fac.subtotal !== undefined ? Number(fac.subtotal) : Number((totalVal / 1.18).toFixed(2));
                            const ivaVal = fac.iva !== undefined ? Number(fac.iva) : Number((subtotalVal * 0.15).toFixed(2));
                            const tasaVal = fac.tasaMunicipal !== undefined ? Number(fac.tasaMunicipal) : Math.max(0, Number((totalVal - subtotalVal - ivaVal).toFixed(2)));
                            setSelectedInvoice({
                              numeroFactura: fac.numeroFactura || fac.id,
                              fechaEmision: fac.fechaEmision,
                              razonSocial: fac.nombreRazonSocial || 'Consumidor Final',
                              identificacion: fac.identificacionCliente || '9999999999999',
                              direccionCliente: fac.direccion || fac.alojamientoDireccion || 'Quito, Ecuador',
                              alojamientoNombre: fac.alojamientoNombre || 'Hospedaje LuxeStays',
                              alojamientoDireccion: fac.alojamientoDireccion,
                              alojamientoDestino: fac.alojamientoDestino,
                              habitacionNombre: fac.habitacionNombre,
                              fechaEntrada: fac.fechaEntrada,
                              fechaSalida: fac.fechaSalida,
                              huespedes: fac.huespedesReales ?? fac.numeroPersonas,
                              metodoPago: fac.metodoPago || 'Tarjeta de Crédito / Débito',
                              estadoPago: fac.estadoPago || 'Completado',
                              subtotal: subtotalVal,
                              iva: ivaVal,
                              tasaMunicipal: tasaVal,
                              total: totalVal,
                              extrasCargos: fac.extrasCargos,
                              cargosAdicionalesTotal: Number(fac.cargosAdicionalesTotal || 0),
                              ordenId: fac.ordenId || fac.reservaId,
                            });
                          }}
                        >
                          Ver Factura
                        </Button>
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
                onChange={(e) => {
                  const nextDestino = e.target.value;
                  const cityCoords = getCityCenterCoords(nextDestino);
                  setAlojamientoForm((prev) => ({
                    ...prev,
                    destino: nextDestino,
                    ...(hasCustomPin ? {} : { latitud: cityCoords.lat, longitud: cityCoords.lng }),
                  }));
                }}
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
              <label className={styles.formLabel}>Unidades / Cupos Reservables (Stock) *</label>
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
              <label className={styles.formLabel}>Habitaciones Físicas *</label>
              <input
                type="number"
                min="1"
                max="50"
                required
                className={styles.formInput}
                value={alojamientoForm.numHabitaciones}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, numHabitaciones: parseInt(e.target.value, 10) || 1 })}
              />
            </div>

            <div>
              <label className={styles.formLabel}>Cantidad de Camas *</label>
              <input
                type="number"
                min="1"
                max="60"
                required
                className={styles.formInput}
                value={alojamientoForm.numCamas}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, numCamas: parseInt(e.target.value, 10) || 1 })}
              />
            </div>

            <div>
              <label className={styles.formLabel}>Tipo / Detalle de Camas</label>
              <input
                type="text"
                placeholder="Ej: 1 Cama King + 2 Individuales"
                className={styles.formInput}
                value={alojamientoForm.tipoCamas}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, tipoCamas: e.target.value })}
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
                <option value="En Limpieza">🧹 En Limpieza (Post Check-out / No Reservable)</option>
                <option value="Inactivo">🔴 Pausado (Oculto)</option>
                <option value="En Mantenimiento">🟡 En Revisión / Mantenimiento</option>
              </select>
            </div>

            <div>
              <label className={styles.formLabel}>Hora de Check-in (Entrada) *</label>
              <input
                type="time"
                required
                className={styles.formInput}
                value={alojamientoForm.horaCheckIn}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, horaCheckIn: e.target.value })}
              />
            </div>

            <div>
              <label className={styles.formLabel}>Hora de Check-out (Salida) *</label>
              <input
                type="time"
                required
                className={styles.formInput}
                value={alojamientoForm.horaCheckOut}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, horaCheckOut: e.target.value })}
              />
            </div>

            <div className={styles.fullSpan}>
              <label className={styles.formLabel}>Dirección Exacta / Referencia</label>
              <input
                type="text"
                className={styles.formInput}
                value={alojamientoForm.direccion}
                onChange={(e) => setAlojamientoForm({ ...alojamientoForm, direccion: e.target.value })}
                placeholder="Ej. Calle García Moreno N4-25 y Chile, Centro Histórico"
              />
            </div>

            <div className={styles.fullSpan}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                  Ubicación en Mapa Interactivo (haz clic o arrastra el pin)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const center = getCityCenterCoords(alojamientoForm.destino);
                    setHasCustomPin(false);
                    setAlojamientoForm((prev) => ({
                      ...prev,
                      latitud: center.lat,
                      longitud: center.lng,
                    }));
                  }}
                  style={{
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#14406B',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                  }}
                >
                  Centrar en {alojamientoForm.destino}
                </button>
              </div>
              {alojamientoModalOpen && (
                <InteractiveMap
                  lat={Number(alojamientoForm.latitud) || getCityCenterCoords(alojamientoForm.destino).lat}
                  lng={Number(alojamientoForm.longitud) || getCityCenterCoords(alojamientoForm.destino).lng}
                  zoom={hasCustomPin ? 15 : getCityCenterCoords(alojamientoForm.destino).zoom}
                  height={250}
                  editable
                  onChange={(lat, lng) => {
                    setHasCustomPin(true);
                    setAlojamientoForm((prev) => ({
                      ...prev,
                      latitud: lat,
                      longitud: lng,
                    }));
                  }}
                />
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <div>
                  <label className={styles.formLabel} style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Latitud
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    className={styles.formInput}
                    value={alojamientoForm.latitud}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        setHasCustomPin(true);
                        setAlojamientoForm((prev) => ({ ...prev, latitud: val }));
                      }
                    }}
                  />
                </div>
                <div>
                  <label className={styles.formLabel} style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Longitud
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    className={styles.formInput}
                    value={alojamientoForm.longitud}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        setHasCustomPin(true);
                        setAlojamientoForm((prev) => ({ ...prev, longitud: val }));
                      }
                    }}
                  />
                </div>
              </div>
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
                  <label className={styles.formLabel}>Unidades Reservables (Stock)</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.formInput}
                    value={editingRoom.cantidadDisponible}
                    onChange={(e) => setEditingRoom({ ...editingRoom, cantidadDisponible: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>

                <div>
                  <label className={styles.formLabel}>Habitaciones Físicas</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className={styles.formInput}
                    value={editingRoom.numHabitaciones ?? 1}
                    onChange={(e) => setEditingRoom({ ...editingRoom, numHabitaciones: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>

                <div>
                  <label className={styles.formLabel}>Cantidad de Camas</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className={styles.formInput}
                    value={editingRoom.numCamas ?? 1}
                    onChange={(e) => setEditingRoom({ ...editingRoom, numCamas: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>

                <div>
                  <label className={styles.formLabel}>Detalle / Tipo de Camas</label>
                  <input
                    type="text"
                    placeholder="Ej: 1 Cama King + 1 Queen"
                    className={styles.formInput}
                    value={editingRoom.tipoCamas ?? '1 Cama King / Queen'}
                    onChange={(e) => setEditingRoom({ ...editingRoom, tipoCamas: e.target.value })}
                  />
                </div>

                <div>
                  <label className={styles.formLabel}>Estado</label>
                  <select
                    className={styles.formSelect}
                    value={editingRoom.estado || 'Activo'}
                    onChange={(e) => setEditingRoom({ ...editingRoom, estado: e.target.value })}
                  >
                    <option value="Activo">🟢 Activo</option>
                    <option value="En Limpieza">🧹 En Limpieza</option>
                    <option value="Inactivo">🔴 Inactivo</option>
                    <option value="Mantenimiento">🛠️ Mantenimiento</option>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '15px', color: '#0F1E33' }}>{room.nombre}</strong>
                        <div style={{ marginTop: '4px' }}>
                          <Badge
                            variant={
                              room.estado === 'En Limpieza'
                                ? 'gold'
                                : room.estado === 'Activo' || !room.estado
                                  ? 'success'
                                  : 'error'
                            }
                          >
                            {room.estado === 'En Limpieza'
                              ? '🧹 En Limpieza'
                              : room.estado && room.estado !== 'Activo'
                                ? room.estado
                                : '🟢 Activo'}
                          </Badge>
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: '#14406B' }}>{formatUSD(Number(room.precioPorNoche))}</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '6px' }}>
                      Capacidad: {room.capacidadAdultos} adultos, {room.capacidadNinos} niños
                    </div>
                    <div style={{ fontSize: '12px', color: '#14406B', fontWeight: 600, marginTop: '2px' }}>
                      {room.numHabitaciones || 1} hab{(room.numHabitaciones || 1) === 1 ? '' : 's'}. · {room.numCamas || 1} cama{(room.numCamas || 1) === 1 ? '' : 's'} ({room.tipoCamas || 'Estándar'})
                    </div>
                    <div style={{ fontSize: '12px', color: '#059669', marginTop: '2px' }}>
                      Stock: {room.cantidadDisponible} unidades reservables
                    </div>

                    {room.imagenesUrls && (
                      <div className={styles.roomPhotosList}>
                        {room.imagenesUrls.split(',').filter(Boolean).slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt="" className={styles.roomPhotoThumb} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                    {room.estado === 'En Limpieza' && (
                      <Button
                        variant="gold"
                        size="sm"
                        icon={<Sparkles size={13} />}
                        onClick={() => handleMarkRoomClean(room.id)}
                      >
                        Limpiar → Activo
                      </Button>
                    )}
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
          MODAL: CREAR O EDITAR USUARIO
      ────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUserId(null);
        }}
        title={editingUserId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
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
              <label className={styles.formLabel}>
                {editingUserId ? 'Nueva Contraseña (opcional)' : 'Contraseña Segura *'}
              </label>
              <input
                type="password"
                required={!editingUserId}
                className={styles.formInput}
                value={userForm.contrasena}
                onChange={(e) => setUserForm({ ...userForm, contrasena: e.target.value })}
                placeholder={
                  editingUserId
                    ? 'Dejar vacío para conservar la actual'
                    : 'Mínimo 8 caract., mayús., número y símbolo'
                }
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
                <option value="Anfitrión">Anfitrión / Hotelero</option>
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setUserModalOpen(false);
                setEditingUserId(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="gold" loading={isCreatingUser}>
              {editingUserId ? 'Guardar Cambios' : 'Registrar Usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ────────────────────────────────────────────────────────────
          MODAL: VER / IMPRIMIR FACTURA ELECTRÓNICA SRI
      ────────────────────────────────────────────────────────────── */}
      <InvoiceModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />

      {/* ────────────────────────────────────────────────────────────
          MODAL: CHECK-IN, GESTIÓN DE ESTANCIA Y CHECK-OUT
      ────────────────────────────────────────────────────────────── */}
      <ReceptionStayModal
        isOpen={Boolean(receptionModalState)}
        mode={receptionModalState?.mode || 'checkin'}
        reserva={receptionModalState?.reserva || null}
        fallbackAlojamientoId={
          receptionModalState?.reserva
            ? alojamientos.find((a) => a.nombre === receptionModalState.reserva.alojamientoNombre)?.id
            : undefined
        }
        onClose={() => setReceptionModalState(null)}
        onSuccess={(message) => {
          const closedMode = receptionModalState?.mode;
          const res = receptionModalState?.reserva;
          if (closedMode === 'checkout' && res && (res.alojamientoId || res.alojamientoNombre)) {
            setAlojamientoEnLimpieza(res.alojamientoId || '', res.alojamientoNombre);
          }
          showToast(message);
          refetchReservas();
          refetchAlojamientos();
          queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
          queryClient.invalidateQueries({ queryKey: ['hotelDetail'] });
          queryClient.invalidateQueries({ queryKey: ['reservasActivasPublicas'] });
          queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
        }}
        onError={(message) => showToast(message, 'error')}
      />

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
