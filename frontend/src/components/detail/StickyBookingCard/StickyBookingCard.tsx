import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../../ui/Button/Button';
import { Badge } from '../../ui/Badge/Badge';
import { formatUSD } from '../../ui/PriceDisplay/PriceDisplay';
import { api, getAuthToken } from '../../../api/client';
import { AvailabilityResponse } from '../../../api/types';
import { checkIsAlojamientoReserved, checkIsRoomReserved, ReservaItemLike } from '../../../utils/accommodationStatus';
import styles from './StickyBookingCard.module.css';

interface StickyBookingCardProps {
  alojamientoId: string;
  defaultPrice?: number | undefined;
  initialCheckin?: string | undefined;
  initialCheckout?: string | undefined;
  initialAdults?: number | undefined;
  initialRooms?: number | undefined;
  selectedRoomId?: string | undefined;
  selectedRoomCode?: string | undefined;
  isHotelReserved?: boolean | undefined;
}

export const StickyBookingCard: React.FC<StickyBookingCardProps> = ({
  alojamientoId,
  defaultPrice = 120,
  initialCheckin,
  initialCheckout,
  initialAdults = 2,
  initialRooms = 1,
  selectedRoomId,
  selectedRoomCode,
  isHotelReserved = false,
}) => {
  const navigate = useNavigate();

  // Fechas por defecto
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [checkin, setCheckin] = useState(
    initialCheckin || tomorrow.toISOString().split('T')[0] || '',
  );
  const [checkout, setCheckout] = useState(
    initialCheckout || dayAfter.toISOString().split('T')[0] || '',
  );
  const [adults, setAdults] = useState(initialAdults);
  const [rooms, setRooms] = useState(initialRooms);

  // Consulta de Disponibilidad en tiempo real desde la API
  const { data: availabilityData, isLoading: isCheckingAvail } = useQuery<AvailabilityResponse>({
    queryKey: ['availability', alojamientoId, checkin, checkout, adults, rooms],
    queryFn: () =>
      api.get<AvailabilityResponse>(`/alojamientos/${alojamientoId}/availability`, {
        params: {
          checkin,
          checkout,
          adults,
          rooms,
        },
      }),
    enabled: Boolean(checkin && checkout && checkout > checkin),
  });

  // 3. Consulta de Reservas Activas para validar superposición de fechas
  const { data: activeReservas = [] } = useQuery<ReservaItemLike[]>({
    queryKey: ['reservasActivasPublicas'],
    queryFn: () => api.get<ReservaItemLike[]>('/reservas'),
    staleTime: 5000,
  });

  const isSelectedRoomReserved = selectedRoomId
    ? checkIsRoomReserved({
        roomId: selectedRoomId,
        roomCodigo: selectedRoomCode,
        alojamientoId,
        activeReservas,
        checkDates: checkin && checkout ? { checkin, checkout } : undefined,
      })
    : false;

  const isReservedForDates = checkIsAlojamientoReserved({
    alojamientoId,
    activeReservas,
    checkDates: checkin && checkout ? { checkin, checkout } : undefined,
  });

  const dIn = new Date(checkin);
  const dOut = new Date(checkout);
  const noches = Math.max(1, Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24)));

  const matchingOption = selectedRoomCode
    ? availabilityData?.opciones?.find((o) => o.tipoHabitacionCodigo === selectedRoomCode)
    : availabilityData?.opciones?.[0];

  const estaDisponible = selectedRoomId
    ? !isSelectedRoomReserved && (matchingOption ? Boolean(matchingOption.estaDisponible) : true)
    : !isHotelReserved &&
      !isReservedForDates &&
      (availabilityData ? Boolean(matchingOption && matchingOption.estaDisponible) : true);

  const precioNoche = matchingOption ? parseFloat(String(matchingOption.precioNoche)) : defaultPrice;

  // Cálculo tributario oficial Ecuador
  const subtotal = Math.round(precioNoche * noches * rooms * 100) / 100;
  const iva = Math.round(subtotal * 0.15 * 100) / 100; // IVA 15%
  const tasaMunicipal = 2 * noches * rooms; // Tasa turística USD 2/noche
  const total = Math.round((subtotal + iva + tasaMunicipal) * 100) / 100;

  const handleCheckoutClick = () => {
    if (isSelectedRoomReserved || (!selectedRoomId && (isHotelReserved || isReservedForDates)) || !estaDisponible) {
      alert('La habitación o propiedad seleccionada ya se encuentra reservada para las fechas indicadas.');
      return;
    }

    const roomParam = selectedRoomId
      ? `&roomId=${selectedRoomId}&roomCode=${selectedRoomCode || ''}`
      : matchingOption?.tipoHabitacionCodigo
      ? `&roomCode=${matchingOption.tipoHabitacionCodigo}`
      : '';
    const targetUrl = `/reservar?hotelId=${alojamientoId}&checkin=${checkin}&checkout=${checkout}&adults=${adults}&rooms=${rooms}&subtotal=${subtotal}&total=${total}${roomParam}`;

    const token = getAuthToken();
    if (!token) {
      // Requerir inicio de sesión antes de reservar
      navigate(`/login?returnUrl=${encodeURIComponent(targetUrl)}`);
      return;
    }

    navigate(targetUrl);
  };

  const todayStr = today.toISOString().split('T')[0] || '';

  return (
    <div className={styles.stickyCard}>
      {/* Encabezado con Precio Principal */}
      <div className={styles.priceHeader}>
        <div>
          <span className={styles.priceNumber}>{formatUSD(precioNoche)}</span>
          <span className={styles.priceSubtitle}> / noche</span>
        </div>
        <Badge variant={estaDisponible ? 'gold' : 'error'}>
          {isCheckingAvail
            ? 'Verificando...'
            : isHotelReserved || isReservedForDates
            ? 'Reservado'
            : estaDisponible
            ? 'Disponible'
            : 'Agotado en fechas'}
        </Badge>
      </div>

      {/* Selectores de Fechas y Capacidad */}
      <div className={styles.inputsBox}>
        <div className={styles.dateRow}>
          <div className={styles.inputCell}>
            <label className={styles.cellLabel} htmlFor="sticky-in">
              Check-in
            </label>
            <input
              id="sticky-in"
              type="date"
              min={todayStr}
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
              className={styles.cellInput}
            />
          </div>
          <div className={styles.inputCell}>
            <label className={styles.cellLabel} htmlFor="sticky-out">
              Check-out
            </label>
            <input
              id="sticky-out"
              type="date"
              min={checkin || todayStr}
              value={checkout}
              onChange={(e) => setCheckout(e.target.value)}
              className={styles.cellInput}
            />
          </div>
        </div>

        <div className={styles.guestsCell}>
          <div>
            <div className={styles.cellLabel}>Adultos</div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
              {adults} adultos
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFF' }}
              onClick={() => setAdults(Math.max(1, adults - 1))}
            >
              -
            </button>
            <button
              type="button"
              style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFF' }}
              onClick={() => setAdults(Math.min(10, adults + 1))}
            >
              +
            </button>
          </div>
        </div>

        <div className={styles.guestsCell} style={{ borderTop: '1px solid var(--color-border)' }}>
          <div>
            <div className={styles.cellLabel}>Habitaciones</div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
              {rooms} {rooms === 1 ? 'habitación' : 'habitaciones'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFF' }}
              onClick={() => setRooms(Math.max(1, rooms - 1))}
            >
              -
            </button>
            <button
              type="button"
              style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFF' }}
              onClick={() => setRooms(Math.min(5, rooms + 1))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Desglose Tributario de Precios */}
      <div className={styles.breakdownTable}>
        <div className={styles.breakdownRow}>
          <span>
            {formatUSD(precioNoche)} × {noches} {noches === 1 ? 'noche' : 'noches'} ({rooms} hab.)
          </span>
          <span>{formatUSD(subtotal)}</span>
        </div>
        <div className={styles.breakdownRow}>
          <span>IVA Ecuador (15%)</span>
          <span>{formatUSD(iva)}</span>
        </div>
        <div className={styles.breakdownRow}>
          <span>Tasa Municipal ($2/noche)</span>
          <span>{formatUSD(tasaMunicipal)}</span>
        </div>
        <div className={styles.breakdownTotal}>
          <span>Total a pagar (USD)</span>
          <span>{formatUSD(total)}</span>
        </div>
      </div>

      {/* Botón Principal de Reserva */}
      <Button
        variant="gold"
        size="lg"
        fullWidth
        disabled={!estaDisponible || isCheckingAvail || isHotelReserved || isReservedForDates}
        loading={isCheckingAvail}
        icon={estaDisponible ? <Sparkles size={18} /> : undefined}
        onClick={handleCheckoutClick}
      >
        {isHotelReserved || isReservedForDates
          ? 'Propiedad reservada'
          : estaDisponible
          ? 'Reservar ahora'
          : 'No disponible en fechas'}
      </Button>

      {/* Aviso de Garantía */}
      <div className={styles.guaranteeBadge}>
        <ShieldCheck size={16} />
        <span>Precio garantizado con reserva inmediata</span>
      </div>

      {(!estaDisponible || isHotelReserved || isReservedForDates) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>
          <AlertCircle size={14} />
          <span>
            {isHotelReserved || isReservedForDates
              ? 'Esta propiedad ya cuenta con una reserva activa confirmada para estas fechas.'
              : 'Sin habitaciones suficientes para las fechas seleccionadas.'}
          </span>
        </div>
      )}
    </div>
  );
};
