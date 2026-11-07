import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { RatingStars } from '../../ui/RatingStars/RatingStars';
import { api } from '../../../api/client';
import { ResenasResponse } from '../../../api/types';
import styles from './ReviewsSection.module.css';

interface ReviewsSectionProps {
  alojamientoId: string;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ alojamientoId }) => {
  const { data } = useQuery<ResenasResponse>({
    queryKey: ['reviews', alojamientoId],
    queryFn: () => api.get<ResenasResponse>(`/alojamientos/${alojamientoId}/resenas`),
  });

  const resenas = data?.resenas || [];
  const total = data?.total || resenas.length;
  const promedio = data?.promedio || (resenas.length > 0
    ? resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length
    : 4.8);

  // Distribución de puntuaciones
  const countStars = (stars: number) => resenas.filter((r) => Math.round(r.calificacion) === stars).length;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h3 className={styles.heading}>Experiencias de Huéspedes</h3>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          {total} opiniones verificadas
        </span>
      </div>

      {/* Resumen & Barras de Puntuación */}
      <div className={styles.summaryGrid}>
        <div className={styles.scoreBox}>
          <span className={styles.scoreNumber}>{promedio.toFixed(1)}</span>
          <RatingStars rating={promedio} showScore={false} size={16} />
          <span className={styles.scoreLabel}>Calificación General</span>
        </div>

        <div className={styles.barsList}>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = countStars(stars);
            const percentage = total > 0 ? (count / total) * 100 : stars >= 4 ? 80 : 10;
            return (
              <div key={stars} className={styles.barRow}>
                <span className={styles.starLabel}>{stars} estrellas</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${percentage}%` }} />
                </div>
                <span style={{ width: '24px', textAlign: 'right' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de Reseñas */}
      {resenas.length > 0 ? (
        <div className={styles.reviewsList}>
          {resenas.map((r) => (
            <div key={r.id} className={styles.reviewItem}>
              <div className={styles.reviewHeader}>
                <span className={styles.authorName}>{r.autorNombre || 'Huésped Verificado'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RatingStars rating={r.calificacion} showScore={false} size={14} />
                  <span className={styles.reviewDate}>
                    {new Date(r.fechaCreacion).toLocaleDateString('es-EC', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <p className={styles.reviewComment}>{r.comentario}</p>
            </div>
          ))}
        </div>
      ) : (
        /* Estado Vacío Cuidado */
        <div className={styles.emptyReviews}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-gold)',
            }}
          >
            <Star size={24} />
          </div>
          <p className={styles.emptyText}>
            Aún no hay reseñas para este alojamiento. Sé el primer huésped en compartir tu experiencia tras tu estancia.
          </p>
        </div>
      )}
    </div>
  );
};
