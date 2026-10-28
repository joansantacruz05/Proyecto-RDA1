import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building,
  BedDouble,
  CalendarCheck,
  FileText,
  Server,
  Users,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminStats } from '../components/admin/AdminStats';
import { AdminAccommodations } from '../components/admin/AdminAccommodations';
import { AdminRooms } from '../components/admin/AdminRooms';
import { AdminReservations } from '../components/admin/AdminReservations';
import { AdminInvoices } from '../components/admin/AdminInvoices';
import { AdminInventorySync } from '../components/admin/AdminInventorySync';
import { AdminUsers } from '../components/admin/AdminUsers';
import { InvoiceReceipt } from '../components/booking/InvoiceReceipt';
import type { Alojamiento, Habitacion, Reserva, FacturaSRI, AdminDashboardStats } from '../types';
import { api } from '../lib/api';

type AdminTab =
  | 'stats'
  | 'alojamientos'
  | 'habitaciones'
  | 'reservas'
  | 'facturas'
  | 'grpc'
  | 'usuarios';

export const AdminDashboardPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [facturas, setFacturas] = useState<FacturaSRI[]>([]);
  const [loading, setLoading] = useState(true);

  const [receiptFactura, setReceiptFactura] = useState<FacturaSRI | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [alojamientosRes, reservasRes] = await Promise.all([
        api.get<Alojamiento[]>('/alojamientos').catch(() => []),
        api.get<Reserva[]>('/reservas').catch(() => []),
      ]);

      setAlojamientos(alojamientosRes || []);
      setReservas(reservasRes || []);

      // Derivar o cargar estadísticas
      const todasHabitaciones = (alojamientosRes || []).flatMap((a) => a.habitaciones || []);
      const reservasActivas = (reservasRes || []).filter(
        (r) => r.estado === 'Confirmada' || r.estado === 'Pagada' || r.estado === 'Pendiente'
      ).length;
      const totalIngresos = (reservasRes || [])
        .filter((r) => r.estado === 'Pagada' || r.estado === 'Confirmada' || r.estado === 'Completada')
        .reduce((sum, r) => sum + (Number(r.total) || 0), 0);

      setStats({
        total_alojamientos: alojamientosRes?.length || 0,
        total_habitaciones: todasHabitaciones.length,
        reservas_activas: reservasActivas,
        ingresos_totales: totalIngresos,
      });

      // Extraer facturas asociadas a reservas
      const facturasLista: FacturaSRI[] = (reservasRes || [])
        .map((r) => r.factura)
        .filter(Boolean) as FacturaSRI[];

      setFacturas(facturasLista);
    } catch (err) {
      console.warn('Error al cargar datos del panel admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const todasLasHabitaciones: Habitacion[] = alojamientos.flatMap((a) => a.habitaciones || []);

  const tabs = [
    { id: 'stats', label: 'Métricas Globales', icon: LayoutDashboard },
    { id: 'alojamientos', label: 'Alojamientos', icon: Building },
    { id: 'habitaciones', label: 'Habitaciones', icon: BedDouble },
    { id: 'reservas', label: 'Reservas', icon: CalendarCheck },
    { id: 'facturas', label: 'Facturas SRI', icon: FileText },
    { id: 'grpc', label: 'Sincronización gRPC', icon: Server },
    { id: 'usuarios', label: 'Usuarios & Roles', icon: Users },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            Consola de Control
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
            Panel de Administración LuxeStays
          </h1>
        </div>

        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {!isAdmin && (
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
          <ShieldAlert size={16} className="shrink-0 text-amber-400" />
          <span>
            <strong>Modo Demostración / Supervisor:</strong> Estás accediendo con rol de visualización. Algunas acciones de escritura pueden estar restringidas en el backend para cuentas no administradoras.
          </span>
        </div>
      )}

      {/* Navegación por Pestañas */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-3 mb-6 scrollbar-none">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as AdminTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#D4AF37] text-[#0B132B] shadow-md shadow-[#D4AF37]/20 font-bold'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de la Pestaña Activa */}
      <div>
        {activeTab === 'stats' && (
          <div>
            <AdminStats stats={stats} loading={loading} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminReservations
                reservas={reservas.slice(0, 5)}
                onRefresh={fetchDashboardData}
                onViewInvoice={(f) => setReceiptFactura(f)}
              />
              <AdminInventorySync habitaciones={todasLasHabitaciones} />
            </div>
          </div>
        )}

        {activeTab === 'alojamientos' && (
          <AdminAccommodations alojamientos={alojamientos} onRefresh={fetchDashboardData} />
        )}

        {activeTab === 'habitaciones' && (
          <AdminRooms alojamientos={alojamientos} onRefresh={fetchDashboardData} />
        )}

        {activeTab === 'reservas' && (
          <AdminReservations
            reservas={reservas}
            onRefresh={fetchDashboardData}
            onViewInvoice={(f) => setReceiptFactura(f)}
          />
        )}

        {activeTab === 'facturas' && <AdminInvoices facturas={facturas} />}

        {activeTab === 'grpc' && <AdminInventorySync habitaciones={todasLasHabitaciones} />}

        {activeTab === 'usuarios' && <AdminUsers />}
      </div>

      <InvoiceReceipt
        isOpen={!!receiptFactura}
        onClose={() => setReceiptFactura(null)}
        factura={receiptFactura}
      />
    </div>
  );
};

export default AdminDashboardPage;
