import React, { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Modal } from '../ui/Modal/Modal';
import { Button } from '../ui/Button/Button';
import { Textarea } from '../ui/Textarea/Textarea';
import { api } from '../../api/client';
import { ProblemDetailsException } from '../../api/types';
import styles from './Modals.module.css';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservaId: string;
  hotelNombre: string;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  reservaId,
  hotelNombre,
  onSuccess,
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) {
      setError('Por favor escribe un breve comentario sobre tu estadía.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post(`/reservas/${reservaId}/calificar`, {
        calificacion: rating,
        comentario: comentario.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProblemDetailsException) {
        setError(err.problem.detail || 'No se pudo registrar la reseña.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al enviar tu calificación.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Calificar estancia en ${hotelNombre}`}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.ratingCenter}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            ¿Cómo calificarías tu experiencia general en este alojamiento?
          </span>

          {/* Selector interactivo de estrellas */}
          <div className={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating ?? rating) >= star;
              return (
                <button
                  type="button"
                  key={star}
                  className={`${styles.starBtn} ${active ? styles.starBtnActive : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
                >
                  <Star size={32} fill={active ? 'currentColor' : 'none'} />
                </button>
              );
            })}
          </div>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-pacific-blue)' }}>
            {rating === 5
              ? 'Excelente estancia (5/5)'
              : rating === 4
              ? 'Muy buena estancia (4/5)'
              : rating === 3
              ? 'Estancia regular (3/5)'
              : rating === 2
              ? 'Pudo ser mejor (2/5)'
              : 'Experiencia insatisfactoria (1/5)'}
          </span>
        </div>

        <div style={{ marginTop: 'var(--spacing-3)' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px' }}>
            Tu comentario verificado
          </label>
          <Textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Comparte detalles sobre la limpieza, atención, ubicación y comodidades..."
            rows={4}
            required
          />
        </div>

        {error && (
          <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', marginTop: '8px' }}>
            {error}
          </p>
        )}

        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="gold"
            icon={<MessageSquare size={16} />}
            loading={loading}
          >
            Publicar Reseña
          </Button>
        </div>
      </form>
    </Modal>
  );
};
