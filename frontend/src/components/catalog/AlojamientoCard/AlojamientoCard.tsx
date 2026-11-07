import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Sparkles, Waves } from 'lucide-react';
import { AlojamientoItem } from '../../../api/types';
import { RatingStars } from '../../ui/RatingStars/RatingStars';
import { PriceDisplay } from '../../ui/PriceDisplay/PriceDisplay';
import { Badge } from '../../ui/Badge/Badge';
import { Button } from '../../ui/Button/Button';
import styles from './AlojamientoCard.module.css';

interface AlojamientoCardProps {
  alojamiento: AlojamientoItem;
  searchDates?: {
    checkin?: string;
    checkout?: string;
  };
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';

export const AlojamientoCard: React.FC<AlojamientoCardProps> = ({
  alojamiento,
  searchDates,
}) => {
  const [imgSrc, setImgSrc] = useState(alojamiento.imagenUrl || FALLBACK_IMAGE);

  const price = typeof alojamiento.precioPorNoche === 'string'
    ? parseFloat(alojamiento.precioPorNoche)
    : alojamiento.precioPorNoche || 95;

  const detailUrl = searchDates?.checkin && searchDates.checkout
    ? `/alojamiento/${alojamiento.id}?checkin=${searchDates.checkin}&checkout=${searchDates.checkout}`
    : `/alojamiento/${alojamiento.id}`;

  return (
    <article className={styles.card}>
      {/* Imagen & Badges Superpuestos */}
      <div className={styles.imageWrapper}>
        <img
          src={imgSrc}
          alt={alojamiento.nombre}
          className={styles.image}
          onError={() => setImgSrc(FALLBACK_IMAGE)}
          loading="lazy"
        />
        <div className={styles.badgeOverlay}>
          {alojamiento.tienePiscina && (
            <Badge variant="info" icon={<Waves size={12} />}>
              Piscina
            </Badge>
          )}
          {alojamiento.permitePaquete && (
            <Badge variant="gold" icon={<Sparkles size={12} />}>
              Exclusivo Luxe
            </Badge>
          )}
        </div>
        <div className={styles.cityBadge}>
          <MapPin size={12} color="#C9A227" />
          <span>
            {typeof alojamiento.destino === 'string'
              ? alojamiento.destino
              : typeof alojamiento.ciudad === 'string'
              ? alojamiento.ciudad
              : (alojamiento.ciudad as { nombre?: string } | undefined)?.nombre || 'Ecuador'}
          </span>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className={styles.content}>
        <div className={styles.headerRow}>
          <h3 className={styles.title}>{alojamiento.nombre}</h3>
        </div>

        <div style={{ marginBottom: 'var(--space-2)' }}>
          <RatingStars rating={alojamiento.estrellas || 5} />
        </div>

        <p className={styles.description}>
          {alojamiento.descripcion || 'Experiencia exclusiva de hospedaje con servicios premium y atención personalizada.'}
        </p>

        {/* Desglose de Tarifa y Botón */}
        <div className={styles.footerRow}>
          <div className={styles.priceBlock}>
            <span className={styles.priceLabel}>Desde</span>
            <PriceDisplay amount={price} period="/ noche" size="md" />
          </div>

          <Link to={detailUrl}>
            <Button variant="primary" size="sm">
              Ver disponibilidad
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
};

