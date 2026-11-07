import React from 'react';
import styles from './Card.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevated?: boolean;
  goldBorder?: boolean;
  clickable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  elevated = false,
  goldBorder = false,
  clickable = false,
  className = '',
  ...rest
}) => {
  const classes = [
    styles.card,
    padding !== 'none' ? styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`] : '',
    elevated ? styles.elevated : '',
    goldBorder ? styles.goldBorder : '',
    clickable ? styles.clickable : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
};

