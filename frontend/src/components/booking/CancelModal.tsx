import React, { useState } from 'react';
import { AlertTriangle, Clock, XCircle, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { Reserva } from '../../types';
import { api } from '../../lib/api';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: Reserva | null;
  onCancelled: (reservaActualizada: Reserva) => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  isOpen,
  onClose,
  reserva,
  onCancelled,
}) => {
  const [motivo, setMotivo] = useState('Cambio de planes');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!reserva) return null;

  // Cálculo preliminar de horas antes del check-in (14:00)
  const checkinTime = new Date(`${reserva.fechaEntrada}T14:00:00-05:00`).getTime();
  const diffHours = (checkinTime - Date.now()) / (1000 * 60 * 60);
  const esMenor24h = diffHours < 24;

  const handleConfirmCancel = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const updated = await api.post<Reserva>(`/orders/${reserva.id}/cancel`, { motivo });
      onCancelled(updated);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'No se pudo cancelar la reserva. Recuerda que no es posible cancelar con menos de 24 horas de antelación.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmación de Cancelación" maxWidth="max-w-md">
      <div className="space-y-4 text-xs">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <AlertTriangle size={20} className="shrink-0 text-amber-400" />
          <div>
            <div className="font-semibold text-white">Política de Cancelación LuxeStays</div>
            <div>Solo se admiten cancelaciones con al menos 24 horas de antelación a las 14:00 del día de llegada.</div>
          </div>
        </div>

        {esMenor24h && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200">
            <Clock size={16} className="shrink-0 text-red-400" />
            <div>
              <strong>Aviso de Ventana Crítica:</strong> Faltan menos de 24 horas para el check-in programado. Es
              posible que el servidor rechace esta solicitud con error 400/409.
            </div>
          </div>
        )}

        <div className="bg-[#0B132B] p-3 rounded-lg border border-white/10 space-y-1">
          <div className="text-gray-400">
            Reserva: <strong className="text-white">#{reserva.codigo || reserva.id}</strong>
          </div>
          <div className="text-gray-400">
            Fecha de Llegada: <strong className="text-white">{reserva.fechaEntrada}</strong>
          </div>
          <div className="text-gray-400">
            Monto a Liberar: <strong className="text-[#D4AF37]">${Number(reserva.total).toFixed(2)} USD</strong>
          </div>
        </div>

        <div>
          <label className="block text-gray-400 mb-1">Motivo de Cancelación</label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="Cambio de planes personales">Cambio de planes personales</option>
            <option value="Motivos de fuerza mayor / salud">Motivos de fuerza mayor o salud</option>
            <option value="Reprogramación de viaje de negocios">Reprogramación de viaje de negocios</option>
            <option value="Otro motivo">Otro motivo</option>
          </select>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg flex items-center gap-2">
            <XCircle size={16} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
          >
            Mantener Reserva
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            <span>Confirmar Cancelación</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelModal;
