import React from 'react';
import { Building, BedDouble, CalendarCheck, DollarSign } from 'lucide-react';
import type { AdminDashboardStats } from '../../types';

interface AdminStatsProps {
  stats: AdminDashboardStats | null;
  loading: boolean;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ stats, loading }) => {
  const cards = [
    {
      titulo: 'Alojamientos Registrados',
      valor: stats?.total_alojamientos ?? '--',
      icono: Building,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
    },
    {
      titulo: 'Habitaciones en Inventario',
      valor: stats?.total_habitaciones ?? '--',
      icono: BedDouble,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      titulo: 'Reservas Activas',
      valor: stats?.reservas_activas ?? '--',
      icono: CalendarCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
    },
    {
      titulo: 'Ingresos Totales (USD)',
      valor: stats?.ingresos_totales ? `$${Number(stats.ingresos_totales).toFixed(2)}` : '$0.00',
      icono: DollarSign,
      color: 'text-[#D4AF37]',
      bg: 'bg-[#D4AF37]/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icono;
        return (
          <div
            key={i}
            className="bg-[#1C2541]/70 border border-white/10 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <div className="text-xs text-gray-400 mb-1">{c.titulo}</div>
              <div className="text-2xl font-bold text-white font-mono">
                {loading ? '...' : c.valor}
              </div>
            </div>
            <div className={`p-3 rounded-xl ${c.bg} ${c.color}`}>
              <Icon size={22} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminStats;
