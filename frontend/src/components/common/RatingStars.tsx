import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  size?: number;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxStars = 5,
  interactive = false,
  onRatingChange,
  size = 18,
}) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      {Array.from({ length: maxStars }).map((_, idx) => {
        const starValue = idx + 1;
        const isFilled = starValue <= rating;

        return (
          <button
            key={idx}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRatingChange && onRatingChange(starValue)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: interactive ? 'pointer' : 'default',
              color: isFilled ? '#D4AF37' : '#D1D5DB',
              display: 'inline-flex',
              transition: 'transform 0.15s ease',
            }}
          >
            <Star
              size={size}
              fill={isFilled ? '#D4AF37' : 'none'}
              stroke={isFilled ? '#D4AF37' : '#9CA3AF'}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
};

export default RatingStars;
