import React, { useState } from 'react';
import { CreditCard, Banknote, Building2, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { Reserva } from '../../types';
import { api } from '../../lib/api';
import { validarRUC, validarCedula } from '../../lib/ecuador-validators';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orden: Reserva | null;
  onPaymentSuccess: (reservaActualizada: Reserva) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  orden,
  onPaymentSuccess,
}) => {
  const [metodoPago, setMetodoPago] = useState<'TARJETA' | 'PAYPAL' | 'TRANSFERENCIA' | 'EFECTIVO'>('TARJETA');
  const [comprobanteTransferencia, setComprobanteTransferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Datos de tarjeta simulada
  const [numTarjeta, setNumTarjeta] = useState('4532 •••• •••• 8890');
  const [expiracion, setExpiracion] = useState('12/28');
  const [cvv, setCvv] = useState('888');

  // Factura Electrónica SRI
  const [solicitarFactura, setSolicitarFactura] = useState(true);
  const [razonSocial, setRazonSocial] = useState('');
  const [tipoIdSRI, setTipoIdSRI] = useState<'CEDULA' | 'RUC'>('CEDULA');
  const [identificacionSRI, setIdentificacionSRI] = useState('');
  const [direccionSRI, setDireccionSRI] = useState('');
  const [sriError, setSriError] = useState<string | null>(null);

  if (!orden) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (solicitarFactura) {
      if (!razonSocial.trim()) {
        setSriError('Ingresa el nombre o razón social para el SRI.');
        return;
      }
      if (tipoIdSRI === 'CEDULA' && !validarCedula(identificacionSRI).valido) {
        setSriError('Cédula inválida para facturación.');
        return;
      }
      if (tipoIdSRI === 'RUC' && !validarRUC(identificacionSRI).valido) {
        setSriError('RUC inválido para facturación (13 dígitos terminado en 001).');
        return;
      }
    }

    if (metodoPago === 'TRANSFERENCIA' && !comprobanteTransferencia.trim()) {
      setErrorMsg('Por favor ingresa el número de referencia del comprobante bancario.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        metodoPago:
          metodoPago === 'TARJETA'
            ? 'Tarjeta de Crédito'
            : metodoPago === 'PAYPAL'
            ? 'PayPal'
            : metodoPago === 'TRANSFERENCIA'
            ? 'Transferencia Bancaria'
            : 'Efectivo',
        comprobanteTransferencia: metodoPago === 'TRANSFERENCIA' ? comprobanteTransferencia : undefined,
        datosFactura: solicitarFactura
          ? {
              razonSocial,
              tipoIdentificacion: tipoIdSRI,
              identificacion: identificacionSRI,
              direccion: direccionSRI || 'Ecuador',
            }
          : undefined,
      };

      const res = await api.post<Reserva>(`/orders/${orden.id}/pay`, payload);
      onPaymentSuccess(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al procesar el pago. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pasarela de Pagos LuxeStays" maxWidth="max-w-xl">
      <form onSubmit={handlePay} className="space-y-5">
        {/* Total a Pagar */}
        <div className="bg-[#0B132B] border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">Total a Cancelar</div>
            <div className="text-2xl font-bold text-[#D4AF37]">${Number(orden.total).toFixed(2)} USD</div>
          </div>
          <div className="text-right text-xs text-gray-400">
            <div>Reserva #{orden.codigo || orden.id}</div>
            <div className="text-emerald-400 font-semibold">Precios incluyen IVA & Tasas</div>
          </div>
        </div>

        {/* Métodos de Pago */}
        <div>
          <label className="block text-xs font-bold uppercase text-white tracking-wider mb-2">
            Selecciona Método de Pago
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMetodoPago('TARJETA')}
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer ${
                metodoPago === 'TARJETA'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <CreditCard size={18} className="text-[#D4AF37]" />
              <div className="text-left font-medium">Tarjeta de Crédito / Débito</div>
            </button>

            <button
              type="button"
              onClick={() => setMetodoPago('PAYPAL')}
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer ${
                metodoPago === 'PAYPAL'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <CheckCircle2 size={18} className="text-[#D4AF37]" />
              <div className="text-left font-medium">PayPal Checkout</div>
            </button>

            <button
              type="button"
              onClick={() => setMetodoPago('TRANSFERENCIA')}
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer ${
                metodoPago === 'TRANSFERENCIA'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <Building2 size={18} className="text-[#D4AF37]" />
              <div className="text-left font-medium">Transferencia Bancaria</div>
            </button>

            <button
              type="button"
              onClick={() => setMetodoPago('EFECTIVO')}
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer ${
                metodoPago === 'EFECTIVO'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <Banknote size={18} className="text-[#D4AF37]" />
              <div className="text-left font-medium">Efectivo al Check-in</div>
            </button>
          </div>
        </div>

        {/* Formulario según Método */}
        {metodoPago === 'TARJETA' && (
          <div className="bg-[#0B132B] p-3.5 rounded-xl border border-white/10 space-y-2.5 text-xs">
            <div>
              <label className="block text-gray-400 mb-1">Número de Tarjeta</label>
              <input
                type="text"
                value={numTarjeta}
                onChange={(e) => setNumTarjeta(e.target.value)}
                className="w-full bg-[#1C2541] border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Vencimiento (MM/AA)</label>
                <input
                  type="text"
                  value={expiracion}
                  onChange={(e) => setExpiracion(e.target.value)}
                  className="w-full bg-[#1C2541] border border-white/10 rounded-lg px-3 py-2 text-white text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">CVV / CVC</label>
                <input
                  type="password"
                  maxLength={4}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className="w-full bg-[#1C2541] border border-white/10 rounded-lg px-3 py-2 text-white text-center font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {metodoPago === 'TRANSFERENCIA' && (
          <div className="bg-[#0B132B] p-3.5 rounded-xl border border-white/10 text-xs space-y-2">
            <div className="text-gray-300">
              <strong className="text-white">Banco Pichincha - Cta Corriente:</strong> 2100894561
              <br />
              <strong className="text-white">Titular:</strong> LuxeStays Ecuador S.A.S. (RUC 1792994832001)
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Número de Comprobante / Referencia *</label>
              <input
                type="text"
                required
                placeholder="Ej. TRANS-984210"
                value={comprobanteTransferencia}
                onChange={(e) => setComprobanteTransferencia(e.target.value)}
                className="w-full bg-[#1C2541] border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* Facturación Electrónica SRI */}
        <div className="border border-white/10 rounded-xl p-3.5 bg-white/5 space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
            <input
              type="checkbox"
              checked={solicitarFactura}
              onChange={(e) => setSolicitarFactura(e.target.checked)}
              className="accent-[#D4AF37] w-4 h-4 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <FileText size={14} className="text-[#D4AF37]" />
              Emitir Factura Electrónica SRI Oficial (001-001-XXXXXXXXX)
            </span>
          </label>

          {solicitarFactura && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-white/10">
              <div className="sm:col-span-2">
                <label className="block text-gray-400 mb-1">Razón Social / Nombre Factura *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez o Inversiones S.A."
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Tipo de Documento SRI</label>
                <select
                  value={tipoIdSRI}
                  onChange={(e) => setTipoIdSRI(e.target.value as any)}
                  className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white"
                >
                  <option value="CEDULA">Cédula</option>
                  <option value="RUC">R.U.C.</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Número Identificación *</label>
                <input
                  type="text"
                  required
                  placeholder={tipoIdSRI === 'RUC' ? '17XXXXXXXX001' : '17XXXXXXXX'}
                  value={identificacionSRI}
                  onChange={(e) => setIdentificacionSRI(e.target.value)}
                  className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-gray-400 mb-1">Dirección Tributaria</label>
                <input
                  type="text"
                  placeholder="Ej. Av. República y Amazonas, Quito"
                  value={direccionSRI}
                  onChange={(e) => setDireccionSRI(e.target.value)}
                  className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              {sriError && <div className="sm:col-span-2 text-[10px] text-red-400">{sriError}</div>}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botones de Envío */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            <span>
              {loading
                ? 'Validando con el banco...'
                : `Confirmar Pago de $${Number(orden.total).toFixed(2)}`}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentModal;
