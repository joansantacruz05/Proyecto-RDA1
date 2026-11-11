import React, { useState } from 'react';
import { Modal } from '../ui/Modal/Modal';
import { Button } from '../ui/Button/Button';
import { FileCheck, ShieldAlert } from 'lucide-react';
import { api } from '../../api/client';
import { ProblemDetailsException } from '../../api/types';
import styles from './Modals.module.css';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservaId: string;
  hotelNombre: string;
  horaCheckIn?: string | undefined;
  horaCheckOut?: string | undefined;
  onSuccess: () => void;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  reservaId,
  hotelNombre,
  horaCheckIn,
  horaCheckOut,
  onSuccess,
}) => {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSign = async () => {
    if (!accepted) return;
    try {
      setLoading(true);
      setError(null);
      await api.post(`/reservas/${reservaId}/firmar-contrato`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProblemDetailsException) {
        setError(err.problem.detail || 'Error al firmar el contrato.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado al procesar la firma.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contrato Digital de Hospedaje"
      size="md"
    >
      <div className={styles.contractContent}>
        <div className={styles.legalBox}>
          <div className={styles.legalTitle}>Términos y Condiciones de Estancia · {hotelNombre}</div>
          <p>
            1. <strong>Horarios de Recepción y Salida:</strong> El check-in oficial está habilitado a partir de las {(horaCheckIn || '14:00').slice(0, 5)} (hora local de Guayaquil/Ecuador) y el check-out se realizará hasta las {(horaCheckOut || '11:00').slice(0, 5)} del día estipulado en la reserva.
          </p>
          <p>
            2. <strong>Reglas de la Propiedad:</strong> Queda estrictamente prohibido fumar en habitaciones y áreas cerradas conforme a la Ley Orgánica para la Regulación y Control del Tabaco del Ecuador. Se exige respeto al descanso de los demás huéspedes entre las 22:00 y las 08:00.
          </p>
          <p>
            3. <strong>Responsabilidad y Daños:</strong> El titular de la reserva responderá solidariamente por deterioros causados a las instalaciones o bienes durante su estadía.
          </p>
          <p>
            4. <strong>Jurisdicción:</strong> Para cualquier controversia, las partes se someten a la mediación ante la Cámara de Comercio y legislación de la República del Ecuador.
          </p>
        </div>

        <label className={styles.termsCheckbox}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--color-pacific-blue)' }}
          />
          <span>
            Declaro haber leído y acepto expresamente los términos del contrato de hospedaje para mi estadía.
          </span>
        </label>

        {error && (
          <div style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="gold"
            icon={<FileCheck size={16} />}
            onClick={handleSign}
            loading={loading}
            disabled={!accepted}
          >
            Firmar Electrónicamente
          </Button>
        </div>
      </div>
    </Modal>
  );
};

