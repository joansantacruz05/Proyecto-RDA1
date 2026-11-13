import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal } from '../ui/Modal/Modal';
import { Button } from '../ui/Button/Button';
import { Textarea } from '../ui/Textarea/Textarea';
import { api, generateUuidV4 } from '../../api/client';
import { ProblemDetailsException } from '../../api/types';
import { markReservaCanceladaLocal } from '../../utils/accommodationStatus';
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
  onSuccess,
}) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(generateUuidV4());

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setMotivo('');
      idempotencyKeyRef.current = generateUuidV4();
    }
  }, [isOpen, reservaId]);

  const handleConfirmCancel = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.post(
        `/reservas/${reservaId}/cancelar`,
        {
          motivo: motivo.trim() || 'Cancelación solicitada por el usuario en el portal',
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKeyRef.current,
          },
        },
      );
      markReservaCanceladaLocal(reservaId, hotelNombre);
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
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
            La cancelación es inmediata. La reserva quedará anulada y la habitación se liberará automáticamente en el inventario del hotel.
          </p>
        </div>

        {/* Información operativa sobre canal de pago y reembolsos */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            margin: '16px 0',
            fontSize: 'var(--font-size-xs)',
            color: '#475569',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            lineHeight: 1.45,
          }}
        >
          <Info size={16} color="#0284C7" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#0F172A', display: 'block', marginBottom: '2px' }}>
              Gestión de pagos y reembolsos
            </strong>
            LuxeStays gestiona la disponibilidad y el inventario del alojamiento. Para reservas originadas o abonadas en plataformas externas (como <strong>Booking Core</strong> o pasarelas de terceros), el procesamiento y eventual reintegro monetario se administra directamente a través del canal donde realizaste el pago.
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
            Conservar reserva
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

