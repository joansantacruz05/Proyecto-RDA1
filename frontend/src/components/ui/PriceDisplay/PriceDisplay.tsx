import React from 'react';
import styles from './PriceDisplay.module.css';

export interface PriceDisplayProps {
  amount: number;
  originalAmount?: number;
  period?: string; // ej. "/ noche", "total"
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const formatUSD = (val: number): string => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  originalAmount,
  period = '/ noche',
  size = 'md',
  className = '',
}) => {
  return (
    <div className={[styles.container, styles[size], className].filter(Boolean).join(' ')}>
      {originalAmount && originalAmount > amount && (
        <span className={styles.originalPrice}>{formatUSD(originalAmount)}</span>
      )}
      <span className={styles.amount}>{formatUSD(amount)}</span>
      {period && <span className={styles.period}>{period}</span>}
    </div>
  );
};

