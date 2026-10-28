import React, { useState } from 'react';
import { CheckCircle, Clock, XCircle, FileText, Check, Loader2 } from 'lucide-react';
import type { Reserva, FacturaSRI } from '../../types';
import { api } from '../../lib/api';

interface AdminReservationsProps {
  reservas: Reserva[];
  onRefresh: () => void;
  onViewInvoice?: (factura: FacturaSRI) => void;
}

export const AdminReservations: React.FC<AdminReservationsProps> = ({
  reservas,
  onRefresh,
  onViewInvoice,
}) => {
  const [approvingId, setApprovingId] = useState<string | number | null>(null);

  const handleApprove = async (id: string | number) => {
    setApprovingId(id);
    try {
      await api.post(`/reservas/${id}/aprobar`);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Error al aprobar la reserva.');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="bg-[#1C2541]/70 border border-white/10 rounded-xl p-5 mb-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-white">Auditoría y Gestión de Reservas</h3>
        <p className="text-xs text-gray-400">
          Supervisa transacciones, aprueba transferencias bancarias y verifica contratos firmados.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B132B] text-gray-400 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Huésped</th>
              <th className="p-3">Alojamiento</th>
              <th className="p-3">Estancia</th>
              <th className="p-3">Total (USD)</th>
              <th className="p-3">Método / Estado</th>
              <th className="p-3">Contrato</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300">
            {reservas.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No hay reservas registradas en el sistema.
                </td>
              </tr>
            ) : (
              reservas.map((r) => {
                const esPendiente = r.estado === 'Pendiente';
                const esPagada = r.estado === 'Pagada' || r.estado === 'Confirmada';
                const esCancelada = r.estado === 'Cancelada';

                return (
                  <tr key={r.id} className="hover:bg-white/5 transition">
                    <td className="p-3 font-mono font-bold text-white">
                      #{r.codigo || r.id}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-white">
                        {r.usuario?.nombre || 'Huésped Registrado'}
                      </div>
                      <div className="text-[10px] text-gray-400">{r.usuario?.correo}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-white">
                        {r.alojamiento?.titulo || 'Alojamiento LuxeStays'}
                      </div>
                      <div className="text-[10px] text-gray-400">{r.habitacion?.titulo}</div>
                    </td>
                    <td className="p-3 text-gray-300 font-mono text-[11px]">
                      {r.fechaEntrada} <br />
                      <span className="text-gray-500">al {r.fechaSalida}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#D4AF37]">
                      ${Number(r.total).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <div className="text-[10px] text-gray-400 mb-1">{r.metodoPago || 'Tarjeta'}</div>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          esPagada
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : esPendiente
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {esPagada && <CheckCircle size={10} />}
                        {esPendiente && <Clock size={10} />}
                        {esCancelada && <XCircle size={10} />}
                        {r.estado}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.contratoFirmado ? (
                        <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                          <Check size={12} /> Firmado
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[11px]">Pendiente</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {esPendiente && (
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={approvingId === r.id}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow"
                          >
                            {approvingId === r.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Check size={11} />
                            )}
                            <span>Aprobar Pago</span>
                          </button>
                        )}

                        {r.factura && onViewInvoice && (
                          <button
                            onClick={() => onViewInvoice(r.factura!)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#D4AF37] cursor-pointer"
                            title="Ver Factura SRI"
                          >
                            <FileText size={14} />
                          </button>
                        )}
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
  );
};

export default AdminReservations;
