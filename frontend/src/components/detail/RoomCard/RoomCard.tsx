import React from 'react';
import { Users, BedDouble, AlertTriangle, CheckCircle } from 'lucide-react';
import { HabitacionDetalle } from '../../../api/types';
import { PriceDisplay } from '../../ui/PriceDisplay/PriceDisplay';
import { Button } from '../../ui/Button/Button';
import styles from './RoomCard.module.css';

interface RoomCardProps {
  habitacion: HabitacionDetalle;
  onSelect: (hab: HabitacionDetalle) => void;
  isSelected?: boolean;
}

const DEFAULT_ROOM_IMG = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';

export const RoomCard: React.FC<RoomCardProps> = ({
  habitacion,
  onSelect,
  isSelected = false,
}) => {
  const precio = typeof habitacion.precioPorNoche === 'string'
    ? parseFloat(habitacion.precioPorNoche)
    : habitacion.precioPorNoche || 100;

  const stock = habitacion.cantidadDisponible ?? 3;
  const isLowStock = stock > 0 && stock <= 2;
  const code = habitacion.codigo || 'SUITE_DELUXE';
  const capacity = habitacion.capacidadAdultos ?? habitacion.capacidad ?? 2;

  return (
    <div className={styles.roomCard} style={isSelected ? { borderColor: 'var(--color-gold)', backgroundColor: 'var(--color-gold-light)' } : undefined}>
      <div className={styles.headerRow}>
        <div>
          <h4 className={styles.roomTitle}>{habitacion.nombre}</h4>
          <span className={styles.roomCode}>{code}</span>
        </div>
        {isLowStock && (
          <div className={styles.lowStockWarning}>
            <AlertTriangle size={13} />
            <span>¡Pocas disponibles! Quedan solo {stock}</span>
          </div>
        )}
      </div>

      <div className={styles.detailsGrid}>
        <img
          src={habitacion.imagenUrl || DEFAULT_ROOM_IMG}
          alt={habitacion.nombre}
          className={styles.roomImage}
          loading="lazy"
        />

        <div className={styles.featuresCol}>
          <div className={styles.capacityBadge}>
            <Users size={14} color="#14406B" />
            <span>Capacidad: hasta {capacity} adultos</span>
            <span style={{ margin: '0 4px' }}>·</span>
            <BedDouble size={14} color="#14406B" />
            <span>1 Cama King o 2 Queen</span>
          </div>

          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            {habitacion.descripcion || 'Habitación con acabados de primera, baño privado con tina, minibar y vistas panorámicas.'}
          </p>

          <div className={styles.amenitiesTags}>
            <span className={styles.tag}>Wi-Fi de Alta Velocidad</span>
            <span className={styles.tag}>Aire Acondicionado</span>
            <span className={styles.tag}>Desayuno Buffet</span>
          </div>
        </div>

        <div className={styles.priceCol}>
          <PriceDisplay amount={precio} period="/ noche" size="md" />
          <Button
            variant={isSelected ? 'gold' : 'primary'}
            size="sm"
            icon={isSelected ? <CheckCircle size={15} /> : undefined}
            onClick={() => onSelect(habitacion)}
          >
            {isSelected ? 'Seleccionada' : 'Seleccionar habitación'}
          </Button>
        </div>
      </div>
    </div>
  );
};

