import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Sparkles, Waves, AlertCircle, BedDouble, DoorOpen } from 'lucide-react';
import { AlojamientoItem } from '../../../api/types';
import { api } from '../../../api/client';
import { checkIsAlojamientoReserved, isAlojamientoInCleaning, ReservaItemLike } from '../../../utils/accommodationStatus';
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

  const { data: activeReservas = [] } = useQuery<ReservaItemLike[]>({
    queryKey: ['reservasActivasPublicas'],
    queryFn: () => api.get<ReservaItemLike[]>('/reservas'),
    staleTime: 5000,
  });

  const isCleaning = isAlojamientoInCleaning({
    alojamientoId: alojamiento.id,
    alojamientoNombre: alojamiento.nombre,
    estado: alojamiento.estado ?? (alojamiento.activo === false ? 'Inactivo' : 'Activo'),
  });

  const isReserved = checkIsAlojamientoReserved({
    alojamientoId: alojamiento.id,
    alojamientoNombre: alojamiento.nombre,
    alojamientoCodigo: alojamiento.codigo,
    habitacionesDisponibles: alojamiento.habitacionesDisponibles,
    estaReservadoApi: Boolean(
      alojamiento.estaReservado ||
      (alojamiento.habitacionesDisponibles !== undefined && alojamiento.habitacionesDisponibles <= 0),
    ),
    estado: alojamiento.estado ?? (alojamiento.activo === false ? 'Inactivo' : 'Activo'),
    activeReservas,
    checkDates:
      searchDates?.checkin && searchDates.checkout
        ? { checkin: searchDates.checkin, checkout: searchDates.checkout }
        : undefined,
  });

  const numHabitaciones = Number(alojamiento.numHabitaciones ?? 1);
  const numCamas = Number(alojamiento.numCamas ?? 1);

  const price = typeof alojamiento.precioPorNoche === 'string'
    ? parseFloat(alojamiento.precioPorNoche)
    : alojamiento.precioPorNoche || 95;

  const detailUrl = searchDates?.checkin && searchDates.checkout
    ? `/alojamiento/${alojamiento.id}?checkin=${searchDates.checkin}&checkout=${searchDates.checkout}`
    : `/alojamiento/${alojamiento.id}`;

  return (
    <article className={`${styles.card} ${isReserved ? styles.cardReserved : ''}`}>
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
          {isCleaning ? (
            <Badge variant="gold" icon={<Sparkles size={12} />}>
              En Limpieza
            </Badge>
          ) : isReserved ? (
            <Badge variant="error" icon={<AlertCircle size={12} />}>
              Reservado
            </Badge>
          ) : (
            <>
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
            </>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#14406B', fontWeight: 600, marginBottom: '6px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <DoorOpen size={13} color="#C9A227" />
            <span>{numHabitaciones} {numHabitaciones === 1 ? 'habitación' : 'habitaciones'}</span>
          </span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <BedDouble size={13} color="#C9A227" />
            <span>{numCamas} {numCamas === 1 ? 'cama' : 'camas'}</span>
          </span>
        </div>

        {alojamiento.direccion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
            <MapPin size={12} color="#14406B" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {alojamiento.direccion}
            </span>
          </div>
        )}

        <p className={styles.description}>
          {alojamiento.descripcion || 'Experiencia exclusiva de hospedaje con servicios premium y atención personalizada.'}
        </p>

        {/* Desglose de Tarifa y Botón */}
        <div className={styles.footerRow}>
          <div className={styles.priceBlock}>
            <span className={styles.priceLabel}>Desde</span>
            <PriceDisplay amount={price} period="/ noche" size="md" />
          </div>

          {isCleaning ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              style={{
                opacity: 0.9,
                cursor: 'not-allowed',
                color: '#92400E',
                borderColor: '#FDE68A',
                backgroundColor: '#FEF3C7',
                fontWeight: 600,
              }}
            >
              En Limpieza
            </Button>
          ) : isReserved ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              style={{
                opacity: 0.85,
                cursor: 'not-allowed',
                color: '#DC2626',
                borderColor: '#FCA5A5',
                backgroundColor: '#FEF2F2',
                fontWeight: 600,
              }}
            >
              Reservado
            </Button>
          ) : (
            <Link to={detailUrl}>
              <Button variant="primary" size="sm">
                Ver disponibilidad
              </Button>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

