import React, { useState } from 'react';
import { AlertTriangle, XCircle, CheckCircle, Clock } from 'lucide-react';
import { Modal } from '../ui/Modal/Modal';
import { Button } from '../ui/Button/Button';
import { Textarea } from '../ui/Textarea/Textarea';
import { api } from '../../api/client';
import { formatUSD } from '../ui/PriceDisplay/PriceDisplay';
import { ProblemDetailsException } from '../../api/types';
import styles from './Modals.module.css';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservaId: string;
  hotelNombre: string;
  fechaEntrada: string;
  horaCheckIn?: string | undefined;
  precioTotal: number;
  onSuccess: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  isOpen,
  onClose,
  reservaId,
  hotelNombre,
  fechaEntrada,
  horaCheckIn,
  precioTotal,
  onSuccess,
}) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inHora = (horaCheckIn || '14:00').slice(0, 5);
  // Cálculo del tramo de penalidad según la hora de check-in del alojamiento (hora de Guayaquil)
  const dEntrada = new Date(`${fechaEntrada.split('T')[0]}T${inHora}:00-05:00`).getTime();
  const ahora = Date.now();
  const horasRestantes = (dEntrada - ahora) / (1000 * 60 * 60);

  let porcentajeReembolso = 100;
  let porcentajePenalidad = 0;

  if (horasRestantes > 48) {
    porcentajeReembolso = 100;
    porcentajePenalidad = 0;
  } else if (horasRestantes >= 24) {
    porcentajeReembolso = 50;
    porcentajePenalidad = 50;
  } else {
    porcentajeReembolso = 0;
    porcentajePenalidad = 100;
  }

  const montoReembolso = (precioTotal * porcentajeReembolso) / 100;
  const montoPenalidad = (precioTotal * porcentajePenalidad) / 100;

  const handleConfirmCancel = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.post(`/reservas/${reservaId}/cancelar`, {
        motivo: motivo.trim() || 'Cancelación solicitada por el usuario en el portal',
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProblemDetailsException) {
        setError(err.problem.detail || 'No se pudo cancelar la reserva.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado al procesar la cancelación.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar Reserva de Alojamiento"
      size="md"
    >
      <div>
        <div className={styles.cancelNotice}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)', fontWeight: 700, marginBottom: '6px' }}>
            <AlertTriangle size={18} />
            <span>¿Estás seguro de cancelar tu reserva en {hotelNombre}?</span>
          </div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
            La cancelación es inmediata e irreversible. Conforme a las políticas de LuxeStays, se aplicará el tramo de reembolso correspondiente a las horas previas al check-in.
          </p>
        </div>

        {/* Detalle de los 3 Tramos */}
        <div className={styles.cancelTiers}>
          <div className={`${styles.tierRow} ${horasRestantes > 48 ? styles.tierActive : ''}`}>
            <span>
              <CheckCircle size={14} color="#1F7A4D" style={{ display: 'inline', marginRight: '6px' }} />
              Más de 48 horas antes del check-in
            </span>
            <span style={{ fontWeight: 700, color: '#1F7A4D' }}>Reembolso del 100%</span>
          </div>

          <div className={`${styles.tierRow} ${horasRestantes >= 24 && horasRestantes <= 48 ? styles.tierActive : ''}`}>
            <span>
              <Clock size={14} color="#9A6700" style={{ display: 'inline', marginRight: '6px' }} />
              Entre 48 y 24 horas antes del check-in
            </span>
            <span style={{ fontWeight: 700, color: '#9A6700' }}>Reembolso del 50%</span>
          </div>

          <div className={`${styles.tierRow} ${horasRestantes < 24 ? styles.tierActive : ''}`}>
            <span>
              <XCircle size={14} color="#B42318" style={{ display: 'inline', marginRight: '6px' }} />
              Menos de 24 horas antes del check-in
            </span>
            <span style={{ fontWeight: 700, color: '#B42318' }}>Sin reembolso (100% penalidad)</span>
          </div>
        </div>

        {/* Resumen Financiero de la Cancelación */}
        <div style={{ backgroundColor: 'var(--color-background)', padding: '12px', borderRadius: 'var(--radius-md)', margin: '16px 0', fontSize: 'var(--font-size-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Total abonado de la reserva:</span>
            <span style={{ fontWeight: 600 }}>{formatUSD(precioTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Penalidad aplicada ({porcentajePenalidad}%):</span>
            <span style={{ color: 'var(--color-error)' }}>-{formatUSD(montoPenalidad)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '6px', fontWeight: 700 }}>
            <span>Monto neto a reembolsar:</span>
            <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-base)' }}>
              {formatUSD(montoReembolso)} USD
            </span>
          </div>
        </div>

        <div style={{ marginTop: 'var(--spacing-3)' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: '4px' }}>
            Motivo de cancelación (Opcional)
          </label>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Indícanos la razón de tu cancelación (cambio de planes, fuerza mayor, etc.)..."
            rows={2}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', marginTop: '8px' }}>
            {error}
          </p>
        )}

        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            No cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmCancel}
            loading={loading}
          >
            Confirmar Cancelación
          </Button>
        </div>
      </div>
    </Modal>
  );
};

