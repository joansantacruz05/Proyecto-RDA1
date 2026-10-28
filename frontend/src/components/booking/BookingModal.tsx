import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { Alojamiento, Habitacion, OrdenPreview, Reserva } from '../../types';
import { api, ApiError } from '../../lib/api';
import { validarCedula, validarRUC } from '../../lib/ecuador-validators';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  alojamiento: Alojamiento;
  habitacion: Habitacion;
  fechas: { fechaEntrada: string; fechaSalida: string };
  onOrderCreated: (orden: Reserva) => void;
  usuarioDefault?: { nombre?: string; correo?: string; telefono?: string };
}

// Generador seguro de UUID v4 para Idempotency-Key
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  alojamiento,
  habitacion,
  fechas,
  onOrderCreated,
  usuarioDefault,
}) => {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [preview, setPreview] = useState<OrdenPreview | null>(null);

  // Formulario de Huésped
  const [nombre, setNombre] = useState(usuarioDefault?.nombre || '');
  const [correo, setCorreo] = useState(usuarioDefault?.correo || '');
  const [telefono, setTelefono] = useState(usuarioDefault?.telefono || '');
  const [tipoDocumento, setTipoDocumento] = useState<'CEDULA' | 'RUC' | 'PASAPORTE'>('CEDULA');
  const [identificacion, setIdentificacion] = useState('');
  const [docError, setDocError] = useState<string | null>(null);

  // Idempotency Key fija por intento de orden en este modal
  const [idempotencyKey] = useState<string>(() => generateUUID());

  // Cargar cotización exacta desde el backend (/orders/preview)
  useEffect(() => {
    if (!isOpen || !habitacion.id) return;

    let isMounted = true;
    setLoadingPreview(true);
    setErrorMsg(null);

    api
      .post<OrdenPreview>('/orders/preview', {
        habitacionId: habitacion.id,
        fechaEntrada: fechas.fechaEntrada,
        fechaSalida: fechas.fechaSalida,
      })
      .then((data) => {
        if (isMounted) setPreview(data);
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(err.message || 'No se pudo cotizar la estancia con el servidor.');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, habitacion.id, fechas.fechaEntrada, fechas.fechaSalida]);

  const validateDoc = (value: string, type: 'CEDULA' | 'RUC' | 'PASAPORTE') => {
    if (!value.trim()) {
      setDocError('El documento es obligatorio.');
      return false;
    }
    if (type === 'CEDULA') {
      const res = validarCedula(value);
      if (!res.valido) {
        setDocError(res.mensaje || 'Cédula ecuatoriana inválida (debe tener 10 dígitos y cumplir Módulo 10).');
        return false;
      }
    } else if (type === 'RUC') {
      const res = validarRUC(value);
      if (!res.valido) {
        setDocError(res.mensaje || 'RUC inválido (13 dígitos y terminar en 001).');
        return false;
      }
    }
    setDocError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDoc(identificacion, tipoDocumento)) return;

    if (!nombre.trim() || !correo.trim()) {
      setErrorMsg('Por favor completa todos los campos del huésped.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        habitacionId: habitacion.id,
        fechaEntrada: fechas.fechaEntrada,
        fechaSalida: fechas.fechaSalida,
        nombreHuesped: nombre,
        correoHuesped: correo,
        telefonoHuesped: telefono,
        identificacionHuesped: identificacion,
        tipoDocumento,
      };

      const orden = await api.post<Reserva>('/orders/create', payload, {
        idempotencyKey,
      });

      onOrderCreated(orden);
    } catch (err: any) {
      if (err instanceof ApiError && err.problem?.code === 'OUT_OF_STOCK') {
        setErrorMsg('Lo sentimos: Ya no hay disponibilidad para estas fechas (Agotado).');
      } else {
        setErrorMsg(err?.message || 'Error al procesar la reserva. Intenta nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reserva de Alojamiento" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Resumen de Propiedad & Fechas */}
        <div className="bg-[#0B132B] p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs uppercase text-[#D4AF37] font-semibold">{alojamiento.ciudad}</div>
            <div className="text-base font-bold text-white">{alojamiento.titulo}</div>
            <div className="text-xs text-gray-400 mt-0.5">{habitacion.titulo}</div>
          </div>
          <div className="text-right text-xs text-gray-300 bg-white/5 px-3 py-2 rounded-lg border border-white/5">
            <div>
              Entrada: <strong>{fechas.fechaEntrada}</strong>
            </div>
            <div>
              Salida: <strong>{fechas.fechaSalida}</strong>
            </div>
          </div>
        </div>

        {/* Desglose de Precios (desde backend) */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase text-[#D4AF37] tracking-wider">
              Cotización Oficial (USD)
            </h4>
            {loadingPreview && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin text-[#D4AF37]" /> Calculando impuestos...
              </span>
            )}
          </div>

          {preview ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>
                  Hospedaje ({preview.noches} {preview.noches === 1 ? 'noche' : 'noches'} × $
                  {preview.precioBaseNoche})
                </span>
                <span>${preview.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>IVA 15% (Ecuador SRI)</span>
                <span>${preview.iva}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Tasa Municipal ($2.00 por noche)</span>
                <span>${preview.tasaMunicipal}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                <span>Total a Pagar</span>
                <span className="text-[#D4AF37] text-base">${preview.total} USD</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 py-2">
              {errorMsg ? 'Error al obtener la cotización.' : 'Calculando tarifa en vivo...'}
            </div>
          )}
        </div>

        {/* Datos del Huésped */}
        <div>
          <h4 className="text-xs font-bold uppercase text-white tracking-wider mb-3">
            Datos del Huésped Titular
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-gray-400 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Correo Electrónico *</label>
              <input
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="juan@ejemplo.com"
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Tipo de Identificación *</label>
              <select
                value={tipoDocumento}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setTipoDocumento(val);
                  validateDoc(identificacion, val);
                }}
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="CEDULA">Cédula de Identidad (Ecuador)</option>
                <option value="RUC">R.U.C. (Persona Natural / Jurídica)</option>
                <option value="PASAPORTE">Pasaporte Extranjero</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Número de Documento *</label>
              <input
                type="text"
                required
                value={identificacion}
                onChange={(e) => {
                  setIdentificacion(e.target.value);
                  validateDoc(e.target.value, tipoDocumento);
                }}
                placeholder={tipoDocumento === 'CEDULA' ? '17XXXXXXXX' : '17XXXXXXXX001'}
                className={`w-full bg-[#0B132B] border rounded-lg px-3 py-2 text-white focus:outline-none ${
                  docError ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'
                }`}
              />
              {docError && <p className="text-[10px] text-red-400 mt-1">{docError}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-400 mb-1">Teléfono Móvil (WhatsApp)</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+593 99 123 4567"
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#D4AF37]" />
            Transacción Idempotente & Segura
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || loadingPreview || !!docError}
              className="px-5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              <span>{submitting ? 'Creando orden...' : 'Continuar al Pago'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default BookingModal;
