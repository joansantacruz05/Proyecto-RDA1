import React from 'react';
import { Clock, ShieldCheck, AlertCircle, Ban } from 'lucide-react';
import styles from './CancellationTimeline.module.css';

interface CancellationTimelineProps {
  checkinHour?: string;
  checkoutHour?: string;
}

export const CancellationTimeline: React.FC<CancellationTimelineProps> = ({
  checkinHour = '14:00',
  checkoutHour = '11:00',
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <h3 className={styles.heading}>Políticas de Cancelación y Estancia</h3>
        <div className={styles.scheduleTags}>
          <div className={styles.scheduleItem}>
            <Clock size={13} color="#C9A227" />
            <span>Check-in: desde las {checkinHour}</span>
          </div>
          <div className={styles.scheduleItem}>
            <Clock size={13} color="#14406B" />
            <span>Check-out: hasta las {checkoutHour}</span>
          </div>
        </div>
      </div>

      {/* Barra visual de tres tramos */}
      <div className={styles.timelineTrack}>
        <div className={`${styles.trackSegment} ${styles.segGreen}`} title="Devolución del 100%" />
        <div className={`${styles.trackSegment} ${styles.segAmber}`} title="Devolución del 50%" />
        <div className={`${styles.trackSegment} ${styles.segRed}`} title="Sin reembolso" />
      </div>

      {/* Tarjetas explicativas de los 3 tramos */}
      <div className={styles.cardsRow}>
        {/* Tramo 1 */}
        <div className={`${styles.tierCard} ${styles.tierGreen}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="var(--color-success)" />
            <span className={styles.tierBadge}>Hasta 48h antes</span>
          </div>
          <div className={styles.tierTitle}>Reembolso Total (100%)</div>
          <p className={styles.tierDesc}>
            Cancela gratis y sin preguntas. El monto pagado se reintegra íntegramente a tu método de pago original.
          </p>
        </div>

        {/* Tramo 2 */}
        <div className={`${styles.tierCard} ${styles.tierAmber}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} color="var(--color-warning)" />
            <span className={styles.tierBadge}>Entre 48h y 24h</span>
          </div>
          <div className={styles.tierTitle}>Reembolso Parcial (50%)</div>
          <p className={styles.tierDesc}>
            Se aplica una retención del 50 % por costos de gestión y bloqueo de habitación.
          </p>
        </div>

        {/* Tramo 3 */}
        <div className={`${styles.tierCard} ${styles.tierRed}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Ban size={16} color="var(--color-error)" />
            <span className={styles.tierBadge}>Menos de 24h</span>
          </div>
          <div className={styles.tierTitle}>Sin Devolución (0%)</div>
          <p className={styles.tierDesc}>
            Cancelaciones de última hora o no presentación en el hotel (no-show) no son reembolsables.
          </p>
        </div>
      </div>
    </div>
  );
};

