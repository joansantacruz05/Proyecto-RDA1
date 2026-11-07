import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2 } from 'lucide-react';
import { api } from '../../api/client';
import {
  AlojamientoDetalle,
  HabitacionDetalle,
  OrderCreateResponse,
  PagoResponse,
  UsuarioSession,
} from '../../api/types';
import { CheckoutStepper } from './CheckoutStepper';
import { ReservationSummary } from './ReservationSummary';
import { Step1Billing, BillingFormData } from './Step1Billing';
import { Step2Payment } from './Step2Payment';
import { Step3Confirmation } from './Step3Confirmation';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { Button } from '../../components/ui/Button/Button';
import styles from './CheckoutPage.module.css';

interface CheckoutPageProps {
  currentUser: UsuarioSession | null;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ currentUser }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Paso actual (1: Facturación, 2: Pago, 3: Confirmación)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Parámetros de la URL
  const hotelId = searchParams.get('hotelId') || '';
  const roomId = searchParams.get('roomId') || undefined;
  const roomCode = searchParams.get('roomCode') || 'SUITE_DELUXE';

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const checkin = searchParams.get('checkin') || tomorrow.toISOString().split('T')[0] || '';
  const checkout = searchParams.get('checkout') || dayAfter.toISOString().split('T')[0] || '';
  const adults = searchParams.get('adults') ? parseInt(searchParams.get('adults')!, 10) : 2;
  const rooms = searchParams.get('rooms') ? parseInt(searchParams.get('rooms')!, 10) : 1;

  // 1. Consultar información de la propiedad
  const { data: hotel, isLoading: isHotelLoading } = useQuery<AlojamientoDetalle>({
    queryKey: ['hotelDetail', hotelId],
    queryFn: () => api.get<AlojamientoDetalle>(`/alojamientos/${hotelId}`),
    enabled: Boolean(hotelId),
  });

  // 2. Consultar habitaciones para obtener nombre de la seleccionada
  const { data: hotelRooms = [] } = useQuery<HabitacionDetalle[]>({
    queryKey: ['hotelRooms', hotelId],
    queryFn: () => api.get<HabitacionDetalle[]>(`/alojamientos/${hotelId}/habitaciones`),
    enabled: Boolean(hotelId),
  });

  const selectedRoom = hotelRooms.find((r) => r.id === roomId || r.codigo === roomCode);
  const roomName = selectedRoom?.nombre || (roomCode ? `Habitación ${roomCode}` : 'Suite Estándar');

  // Cálculos de noches y montos
  const dIn = new Date(checkin);
  const dOut = new Date(checkout);
  const diffTime = Math.abs(dOut.getTime() - dIn.getTime());
  const noches = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const basePricePerNight = selectedRoom?.precioPorNoche
    ? Number(selectedRoom.precioPorNoche)
    : 120;

  const urlSubtotal = searchParams.get('subtotal') ? parseFloat(searchParams.get('subtotal')!) : null;
  const urlTotal = searchParams.get('total') ? parseFloat(searchParams.get('total')!) : null;

  const subtotal = urlSubtotal ?? Math.round(basePricePerNight * noches * rooms * 100) / 100;
  const iva = Math.round(subtotal * 0.15 * 100) / 100; // IVA Ecuador 15%
  const tasaMunicipal = 2 * noches * rooms; // USD 2 por noche por habitación
  const total = urlTotal ?? Math.round((subtotal + iva + tasaMunicipal) * 100) / 100;

  // Estados acumulativos entre pasos
  const [billingData, setBillingData] = useState<BillingFormData | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const [orderResult, setOrderResult] = useState<OrderCreateResponse | null>(null);
  const [pagoResult, setPagoResult] = useState<PagoResponse | null>(null);

  // Manejo de avance al Paso 2
  const handleProceedToPayment = (data: { billingData: BillingFormData; clientId: string }) => {
    setBillingData(data.billingData);
    setClientId(data.clientId);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Manejo de éxito en Paso 2 y pase al Paso 3
  const handlePaymentSuccess = (data: {
    orderResult: OrderCreateResponse;
    pagoResult: PagoResponse;
  }) => {
    setOrderResult(data.orderResult);
    setPagoResult(data.pagoResult);
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!hotelId) {
    return (
      <div className={`container ${styles.checkoutPage}`} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Building2 size={48} color="#14406B" style={{ margin: '0 auto 16px' }} />
        <h2>No has seleccionado ningún alojamiento para reservar</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          Por favor explora nuestro catálogo y selecciona una propiedad para iniciar tu reserva.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Explorar catálogo
        </Button>
      </div>
    );
  }

  if (isHotelLoading) {
    return (
      <div className={`container ${styles.checkoutPage}`}>
        <Skeleton width="100%" height={60} style={{ borderRadius: 'var(--radius-lg)', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          <Skeleton width="100%" height={450} style={{ borderRadius: 'var(--radius-xl)' }} />
          <Skeleton width="100%" height={450} style={{ borderRadius: 'var(--radius-xl)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.checkoutPage}`}>
      {/* Encabezado y Retorno */}
      <div className={styles.checkoutHeader}>
        {step < 3 && (
          <Link to={`/alojamiento/${hotelId}`} className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Volver al detalle del alojamiento</span>
          </Link>
        )}
        <h1 className={styles.pageTitle}>
          {step === 3 ? 'Confirmación de Reserva' : 'Proceso de Reserva'}
        </h1>
      </div>

      {/* Stepper Superior */}
      <CheckoutStepper currentStep={step} />

      {/* Layout de Checkout */}
      {step < 3 ? (
        <div className={styles.checkoutLayout}>
          {/* Columna Izquierda: Formulario de Paso */}
          <main className={styles.mainStepCol}>
            {step === 1 && (
              <Step1Billing
                currentUser={currentUser}
                initialData={billingData || undefined}
                onProceed={handleProceedToPayment}
              />
            )}

            {step === 2 && billingData && (
              <Step2Payment
                billingData={billingData}
                clientId={clientId}
                hotelId={hotelId}
                roomId={roomId}
                roomCode={roomCode}
                checkin={checkin}
                checkout={checkout}
                adults={adults}
                rooms={rooms}
                subtotal={subtotal}
                iva={iva}
                tasaMunicipal={tasaMunicipal}
                total={total}
                onBack={() => setStep(1)}
                onSuccess={handlePaymentSuccess}
              />
            )}
          </main>

          {/* Columna Derecha: Resumen de Reserva Fijo */}
          <aside className={styles.sidebarCol}>
            <ReservationSummary
              hotel={hotel || null}
              checkin={checkin}
              checkout={checkout}
              adults={adults}
              rooms={rooms}
              roomName={roomName}
              subtotal={subtotal}
              iva={iva}
              tasaMunicipal={tasaMunicipal}
              total={total}
              onRefreshQuote={() => {
                // Refrescar cotización
              }}
            />
          </aside>
        </div>
      ) : (
        /* Paso 3: Confirmación en ancho completo */
        <div className={styles.checkoutLayoutFull}>
          {orderResult && pagoResult && (
            <Step3Confirmation
              orderResult={orderResult}
              pagoResult={pagoResult}
              hotel={hotel || null}
              checkin={checkin}
              checkout={checkout}
              adults={adults}
              rooms={rooms}
              roomName={roomName}
              subtotal={subtotal}
              iva={iva}
              tasaMunicipal={tasaMunicipal}
              total={total}
            />
          )}
        </div>
      )}
    </div>
  );
};

