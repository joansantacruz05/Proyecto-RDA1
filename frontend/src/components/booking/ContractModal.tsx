import React, { useState } from 'react';
import { FileCheck, PenTool, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { Reserva } from '../../types';
import { api } from '../../lib/api';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: Reserva | null;
  onContractSigned: (reservaActualizada: Reserva) => void;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  reserva,
  onContractSigned,
}) => {
  const [nombreFirmante, setNombreFirmante] = useState('');
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!reserva) return null;

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aceptoTerminos) {
      setErrorMsg('Debes aceptar las cláusulas del contrato de arrendamiento temporal.');
      return;
    }
    if (!nombreFirmante.trim()) {
      setErrorMsg('Ingresa tu nombre y apellido como firma digital.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const updated = await api.post<Reserva>(`/reservas/${reserva.id}/firmar-contrato`, {
        nombreFirmante: nombreFirmante.trim(),
      });
      onContractSigned(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al registrar la firma digital.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contrato de Hospedaje y Arrendamiento Temporal" maxWidth="max-w-2xl">
      <form onSubmit={handleSign} className="space-y-4">
        {/* Encabezado */}
        <div className="bg-[#0B132B] p-3 rounded-lg border border-white/10 flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-400">Reserva:</span>{' '}
            <strong className="text-white">#{reserva.codigo || reserva.id}</strong>
          </div>
          <div>
            <span className="text-gray-400">Estancia:</span>{' '}
            <strong className="text-[#D4AF37]">
              {reserva.fechaEntrada} al {reserva.fechaSalida}
            </strong>
          </div>
        </div>

        {/* Términos y Cláusulas Legales */}
        <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-xs text-gray-300 space-y-3 max-h-60 overflow-y-auto leading-relaxed">
          <p className="font-semibold text-white">
            CONTRATO DE ARRENDAMIENTO TEMPORAL Y PRESTACIÓN DE SERVICIOS TURÍSTICOS
          </p>

          <p>
            <strong>PRIMERA. - PARTES:</strong> De una parte, LuxeStays Ecuador S.A.S. en representación del
            anfitrión del alojamiento, y de otra parte el Huésped Titular registrado en esta plataforma.
          </p>

          <p>
            <strong>SEGUNDA. - HORARIOS Y REGLAS DE CONVIVENCIA:</strong> El horario de Check-in rige a partir de las
            14:00 horas del día de entrada, y el Check-out se efectuará improrrogablemente a las 11:00 horas del día
            de salida. Queda prohibida la reproducción de ruidos molestos a partir de las 22:00 horas.
          </p>

          <p>
            <strong>TERCERA. - POLÍTICA DE CANCELACIÓN:</strong> Toda cancelación debe ser procesada con un mínimo de
            24 horas de antelación respecto a la hora de Check-in del día de llegada (14:00). Cancelaciones posteriores
            están sujetas a retención por costos de reserva de slot según la legislación comercial ecuatoriana.
          </p>

          <p>
            <strong>CUARTA. - RESPONSABILIDAD POR DAÑOS:</strong> El Huésped se compromete a conservar las instalaciones,
            mobiliario y enseres en el mismo estado en que los recibe. Cualquier deterioro comprobado será imputado a su
            cuenta.
          </p>

          <p>
            <strong>QUINTA. - LEY APLICABLE Y JURISDICCIÓN:</strong> El presente contrato se rige por las leyes de la
            República del Ecuador.
          </p>
        </div>

        {/* Checkbox Aceptación */}
        <label className="flex items-start gap-2.5 text-xs text-gray-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={aceptoTerminos}
            onChange={(e) => setAceptoTerminos(e.target.checked)}
            className="accent-[#D4AF37] w-4 h-4 mt-0.5 cursor-pointer"
          />
          <span>
            He leído y acepto íntegramente las cláusulas de este contrato, comprometiéndome al cumplimiento de las
            normas de la propiedad.
          </span>
        </label>

        {/* Firma Digital */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1.5 flex items-center gap-1.5">
            <PenTool size={14} className="text-[#D4AF37]" />
            Firma Digital (Escribe tu Nombre Completo Legal)
          </label>
          <input
            type="text"
            required
            placeholder="Ej. Juan Sebastián Pérez Andrade"
            value={nombreFirmante}
            onChange={(e) => setNombreFirmante(e.target.value)}
            className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37] font-serif"
          />
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-2.5 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Acciones */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="submit"
            disabled={loading || !aceptoTerminos || !nombreFirmante.trim()}
            className="px-6 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-[#D4AF37]/20 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            <FileCheck size={15} />
            <span>{loading ? 'Firmando digitalmente...' : 'Firmar Contrato Oficial'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ContractModal;
