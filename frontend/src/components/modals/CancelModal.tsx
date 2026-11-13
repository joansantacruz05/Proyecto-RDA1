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
  isBooking?: boolean | undefined;
  onSuccess: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  isOpen,
  onClose,
  reservaId,
  hotelNombre,
  isBooking,
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
    if (isBooking) {
      setError('Las reservas originadas en Booking.com no pueden cancelarse desde este sistema.');
      return;
    }
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
        {isBooking ? (
          <div>
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                color: '#1E40AF',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                lineHeight: 1.5,
                marginBottom: '16px',
              }}
            >
              <Info size={20} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#1E3A8A', display: 'block', marginBottom: '6px', fontSize: '14px' }}>
                  Reserva externa de Booking.com
                </strong>
                <p style={{ margin: '0 0 6px 0', fontSize: 'var(--font-size-xs)' }}>
                  Esta reserva en <strong>{hotelNombre}</strong> fue creada y abonada a través del canal oficial de <strong>Booking.com</strong>.
                </p>
                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                  Por políticas de integración y sincronización de canales, <strong>las cancelaciones de Booking no se pueden realizar desde este sistema</strong>. Debes ingresar directamente a la aplicación o portal de Booking.com para gestionar la cancelación.
                </p>
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button variant="primary" onClick={onClose}>
                Entendido / Regresar
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </Modal>
  );
};

