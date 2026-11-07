import React from 'react';
import { Star } from 'lucide-react';
import styles from './RatingStars.module.css';

export interface RatingStarsProps {
  rating: number; // 0 a 5
  maxStars?: number;
  showScore?: boolean;
  reviewsCount?: number;
  size?: number;
  className?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxStars = 5,
  showScore = true,
  reviewsCount,
  size = 16,
  className = '',
}) => {
  const normalizedRating = Math.max(0, Math.min(maxStars, rating));

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <div className={styles.stars} aria-label={`Calificación ${normalizedRating} de ${maxStars}`}>
        {Array.from({ length: maxStars }, (_, i) => {
          const filled = i + 1 <= Math.round(normalizedRating);
          return (
            <Star
              key={i}
              size={size}
              className={filled ? styles.star : styles.emptyStar}
              strokeWidth={1.5}
            />
          );
        })}
      </div>
      {showScore && <span className={styles.scoreText}>{normalizedRating.toFixed(1)}</span>}
      {reviewsCount !== undefined && (
        <span className={styles.reviewsCount}>({reviewsCount} reseñas)</span>
      )}
    </div>
  );
};

