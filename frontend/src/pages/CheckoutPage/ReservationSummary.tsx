import React, { useEffect } from 'react';
import { Clock, ShieldCheck, MapPin } from 'lucide-react';
import { AlojamientoDetalle } from '../../api/types';
import { RatingStars } from '../../components/ui/RatingStars/RatingStars';
import { formatUSD } from '../../components/ui/PriceDisplay/PriceDisplay';
import { usePriceCountdown } from '../../hooks/usePriceCountdown';
import { formatHoraHHMM } from '../../utils/ecuadorLocations';
import styles from './ReservationSummary.module.css';

interface ReservationSummaryProps {
  hotel: AlojamientoDetalle | null;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  roomName?: string | undefined;
  subtotal: number;
  iva: number;
  tasaMunicipal: number;
  total: number;
  tarifaValidaHasta?: string | undefined;
  onRefreshQuote?: () => void;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';

export const ReservationSummary: React.FC<ReservationSummaryProps> = ({
  hotel,
  checkin,
  checkout,
  adults,
  rooms,
  roomName,
  subtotal,
  iva,
  tasaMunicipal,
  total,
  tarifaValidaHasta,
  onRefreshQuote,
}) => {
  const { formattedTime, percentageRemaining, isExpired, resetCountdown } = usePriceCountdown({
    tarifaValidaHasta,
    duracionMinutos: 15,
  });

  const dIn = new Date(checkin);
  const dOut = new Date(checkout);
  const diffTime = Math.abs(dOut.getTime() - dIn.getTime());
  const noches = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  useEffect(() => {
    if (isExpired) {
      resetCountdown();
      if (onRefreshQuote) {
        onRefreshQuote();
      }
    }
  }, [isExpired, resetCountdown, onRefreshQuote]);

  const hotelName = hotel?.nombre || 'Alojamiento LuxeStays';
  const location = typeof hotel?.destino === 'string'
    ? hotel.destino
    : typeof hotel?.ciudad === 'string'
    ? hotel.ciudad
    : (hotel?.ciudad as { nombre?: string } | undefined)?.nombre || 'Ecuador';
  const stars = hotel?.estrellas || 4;

  return (
    <div className={styles.summaryCard}>
      {/* Cabecera del Hotel */}
      <div className={styles.hotelHeader}>
        <img
          src={hotel?.imagenUrl || DEFAULT_IMAGE}
          alt={hotelName}
          className={styles.hotelThumb}
          loading="lazy"
        />
        <div className={styles.hotelInfo}>
          <h3 className={styles.hotelName} title={hotelName}>
            {hotelName}
          </h3>
          <div className={styles.hotelLocation}>
            <MapPin size={12} color="#14406B" />
            <span>{location}</span>
          </div>
          <div style={{ marginTop: '4px' }}>
            <RatingStars rating={stars} size={13} showScore={false} />
          </div>
        </div>
      </div>

      {/* Barra de Cuenta Regresiva de Tarifa Garantizada */}
      {!isExpired ? (
        <div className={styles.countdownBox}>
          <div className={styles.countdownHeader}>
            <span className={styles.countdownLabel}>
              <Clock size={14} />
              <span>Precio garantizado por:</span>
            </span>
            <span className={styles.countdownClock}>{formattedTime}</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${percentageRemaining}%` }}
            />
          </div>
        </div>
      ) : (
        <div className={styles.timerAlert} style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div className={styles.timerHeader}>
            <span className={styles.timerLabel}>
              <Clock size={13} color="#059669" />
              <span style={{ color: '#065F46' }}>Cotización en vivo:</span>
            </span>
            <span className={styles.timerValue} style={{ color: '#059669', fontSize: '11.5px', fontWeight: 600 }}>
              ● Actualizada automáticamente
            </span>
          </div>
        </div>
      )}

      {/* Detalles de la Estadía */}
      <div className={styles.stayDetails}>
        {roomName && (
          <div className={styles.stayRow}>
            <span className={styles.stayLabel}>Habitación</span>
            <span className={styles.stayValue}>{roomName}</span>
          </div>
        )}

        <div className={styles.stayRow}>
          <span className={styles.stayLabel}>Check-in</span>
          <div className={styles.stayValue}>
            <span>{checkin}</span>
            <span className={styles.timeSubtext}>Desde las {formatHoraHHMM(hotel?.horaCheckIn, '14:00')} (Guayaquil)</span>
          </div>
        </div>

        <div className={styles.stayRow}>
          <span className={styles.stayLabel}>Check-out</span>
          <div className={styles.stayValue}>
            <span>{checkout}</span>
            <span className={styles.timeSubtext}>Hasta las {formatHoraHHMM(hotel?.horaCheckOut, '11:00')} (Guayaquil)</span>
          </div>
        </div>

        <div className={styles.stayRow}>
          <span className={styles.stayLabel}>Duración</span>
          <span className={styles.stayValue}>{noches} noche{noches > 1 ? 's' : ''}</span>
        </div>

        <div className={styles.stayRow}>
          <span className={styles.stayLabel}>Huéspedes y habitaciones</span>
          <span className={styles.stayValue}>
            {adults} adulto{adults > 1 ? 's' : ''} · {rooms} hab.
          </span>
        </div>
      </div>

      {/* Desglose Fiscal Oficial de Ecuador */}
      <div className={styles.priceBreakdown}>
        <div className={styles.breakdownRow}>
          <span>Hospedaje ({noches} noche{noches > 1 ? 's' : ''})</span>
          <span>{formatUSD(subtotal)}</span>
        </div>

        <div className={styles.breakdownRow}>
          <span>
            IVA Ecuador
            <span className={styles.taxPill}>15%</span>
          </span>
          <span>{formatUSD(iva)}</span>
        </div>

        <div className={styles.breakdownRow}>
          <span>
            Tasa municipal de turismo
            <span className={styles.taxPill}>USD 2/noche</span>
          </span>
          <span>{formatUSD(tasaMunicipal)}</span>
        </div>

        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total a pagar</span>
          <div>
            <span className={styles.totalAmount}>{formatUSD(total)}</span>
            <span className={styles.currencyPill}>USD</span>
          </div>
        </div>
      </div>

      {/* Garantía y Política */}
      <div className={styles.guaranteeBadge}>
        <ShieldCheck size={18} color="#1F7A4D" style={{ flexShrink: 0 }} />
        <span>Cancelación 100% gratuita hasta 48 horas antes de la llegada.</span>
      </div>
    </div>
  );
};

