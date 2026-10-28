import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, CheckCircle, Clock, XCircle, FileCheck, Star, FileText, Ban, CreditCard, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Reserva, FacturaSRI } from '../types';
import { api } from '../lib/api';
import { ContractModal } from '../components/booking/ContractModal';
import { PaymentModal } from '../components/booking/PaymentModal';
import { CancelModal } from '../components/booking/CancelModal';
import { ReviewModal } from '../components/booking/ReviewModal';
import { InvoiceReceipt } from '../components/booking/InvoiceReceipt';

export const MyReservationsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [contractReserva, setContractReserva] = useState<Reserva | null>(null);
  const [paymentReserva, setPaymentReserva] = useState<Reserva | null>(null);
  const [cancelReserva, setCancelReserva] = useState<Reserva | null>(null);
  const [reviewReserva, setReviewReserva] = useState<Reserva | null>(null);
  const [receiptFactura, setReceiptFactura] = useState<FacturaSRI | null>(null);

  const fetchReservas = async () => {
    setLoading(true);
    try {
      const data = await api.get<Reserva[]>('/reservas');
      setReservas(data || []);
    } catch {
      // Si falla o no hay sesión activa, array vacío
      setReservas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReservas();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const updateReservaInList = (updated: Reserva) => {
    setReservas((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-[#1C2541]/70 border border-white/10 rounded-2xl p-10 max-w-md mx-auto">
          <Calendar size={48} className="text-[#D4AF37] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Inicia Sesión para ver tus Reservas</h2>
          <p className="text-xs text-gray-400 mb-6">
            Accede a tu historial de estadías, firma tus contratos digitales y descarga tus
            facturas autorizadas por el SRI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            Portal del Huésped
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-1">Mis Reservas & Estancias</h1>
        </div>
        <button
          onClick={fetchReservas}
          className="text-xs text-[#D4AF37] hover:underline self-start sm:self-auto cursor-pointer"
        >
          Actualizar reservas
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">
          <Loader2 size={32} className="animate-spin text-[#D4AF37] mx-auto mb-3" />
          <p className="text-xs">Cargando tus reservas y contratos...</p>
        </div>
      ) : reservas.length === 0 ? (
        <div className="bg-[#1C2541]/50 border border-white/10 rounded-2xl p-10 text-center">
          <Calendar size={48} className="text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Aún no tienes reservas activas</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
            Explora nuestros destinos en Ecuador y reserva tu próxima experiencia de lujo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservas.map((reserva) => {
            const esPagada = reserva.estado === 'Pagada' || reserva.estado === 'Confirmada';
            const esPendiente = reserva.estado === 'Pendiente';
            const esCancelada = reserva.estado === 'Cancelada';

            // Comprobar si ya pasó la fecha de check-out
            const fechaSalida = new Date(`${reserva.fechaSalida}T11:00:00-05:00`).getTime();
            const yaConcluyoEstancia = Date.now() > fechaSalida;

            return (
              <div
                key={reserva.id}
                className="bg-[#1C2541]/70 border border-white/10 hover:border-[#D4AF37]/30 rounded-2xl p-5 transition flex flex-col lg:flex-row justify-between gap-6"
              >
                {/* Info Izquierda */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                  <img
                    src={
                      reserva.alojamiento?.fotos?.[0] ||
                      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={reserva.alojamiento?.titulo || 'Alojamiento'}
                    className="w-full sm:w-28 h-28 object-cover rounded-xl bg-black"
                  />

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#D4AF37]">
                        #{reserva.codigo || reserva.id}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
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
                        {reserva.estado}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">
                      {reserva.alojamiento?.titulo || 'Alojamiento LuxeStays'}
                    </h3>

                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                      <MapPin size={12} className="text-[#D4AF37]" />
                      <span>{reserva.alojamiento?.ciudad || 'Ecuador'}</span>
                      <span>·</span>
                      <span>{reserva.habitacion?.titulo || 'Suite'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-300 pt-1">
                      <span>
                        Llegada: <strong>{reserva.fechaEntrada}</strong>
                      </span>
                      <span>→</span>
                      <span>
                        Salida: <strong>{reserva.fechaSalida}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Importes y Acciones Derecha */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-white/10 gap-3">
                  <div className="text-left lg:text-right">
                    <div className="text-xs text-gray-400">Importe Total</div>
                    <div className="text-xl font-bold font-mono text-[#D4AF37]">
                      ${Number(reserva.total).toFixed(2)} USD
                    </div>
                    {reserva.metodoPago && (
                      <div className="text-[10px] text-gray-500">{reserva.metodoPago}</div>
                    )}
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Botón Pagar Ahora si está pendiente */}
                    {esPendiente && (
                      <button
                        onClick={() => setPaymentReserva(reserva)}
                        className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#D4AF37]/20"
                      >
                        <CreditCard size={13} />
                        <span>Completar Pago</span>
                      </button>
                    )}

                    {/* Botón Firmar Contrato */}
                    {!reserva.contratoFirmado && !esCancelada && (
                      <button
                        onClick={() => setContractReserva(reserva)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck size={13} />
                        <span>Firmar Contrato</span>
                      </button>
                    )}

                    {reserva.contratoFirmado && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={12} /> Contrato Firmado
                      </span>
                    )}

                    {/* Botón Factura SRI */}
                    {reserva.factura && (
                      <button
                        onClick={() => setReceiptFactura(reserva.factura!)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#D4AF37] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Ver Comprobante SRI"
                      >
                        <FileText size={13} />
                        <span>Factura SRI</span>
                      </button>
                    )}

                    {/* Botón Calificar Estancia (post check-out) */}
                    {yaConcluyoEstancia && !reserva.calificacion && !esCancelada && (
                      <button
                        onClick={() => setReviewReserva(reserva)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Star size={13} className="fill-amber-400" />
                        <span>Calificar</span>
                      </button>
                    )}

                    {reserva.calificacion && (
                      <div className="flex items-center gap-1 text-xs text-[#D4AF37]">
                        <Star size={12} className="fill-[#D4AF37]" />
                        <span>{reserva.calificacion}/5 estrellas</span>
                      </div>
                    )}

                    {/* Botón Cancelar Reserva */}
                    {!esCancelada && !yaConcluyoEstancia && (
                      <button
                        onClick={() => setCancelReserva(reserva)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Cancelar Reserva"
                      >
                        <Ban size={13} />
                        <span>Cancelar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales de Postventa */}
      <ContractModal
        isOpen={!!contractReserva}
        onClose={() => setContractReserva(null)}
        reserva={contractReserva}
        onContractSigned={(updated) => {
          updateReservaInList(updated);
          setContractReserva(null);
        }}
      />

      <PaymentModal
        isOpen={!!paymentReserva}
        onClose={() => setPaymentReserva(null)}
        orden={paymentReserva}
        onPaymentSuccess={(updated) => {
          updateReservaInList(updated);
          setPaymentReserva(null);
        }}
      />

      <CancelModal
        isOpen={!!cancelReserva}
        onClose={() => setCancelReserva(null)}
        reserva={cancelReserva}
        onCancelled={(updated) => {
          updateReservaInList(updated);
          setCancelReserva(null);
        }}
      />

      <ReviewModal
        isOpen={!!reviewReserva}
        onClose={() => setReviewReserva(null)}
        reserva={reviewReserva}
        onReviewSubmitted={(updated) => {
          updateReservaInList(updated);
          setReviewReserva(null);
        }}
      />

      <InvoiceReceipt
        isOpen={!!receiptFactura}
        onClose={() => setReceiptFactura(null)}
        factura={receiptFactura}
      />
    </div>
  );
};

export default MyReservationsPage;
