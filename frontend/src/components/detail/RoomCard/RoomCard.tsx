import React from 'react';
import { Users, BedDouble, DoorOpen, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { HabitacionDetalle } from '../../../api/types';
import { PriceDisplay } from '../../ui/PriceDisplay/PriceDisplay';
import { Button } from '../../ui/Button/Button';
import styles from './RoomCard.module.css';

interface RoomCardProps {
  habitacion: HabitacionDetalle;
  onSelect: (hab: HabitacionDetalle) => void;
  isSelected?: boolean;
  isHotelReserved?: boolean;
  isHotelCleaning?: boolean;
}

const DEFAULT_ROOM_IMG = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';

export const RoomCard: React.FC<RoomCardProps> = ({
  habitacion,
  onSelect,
  isSelected = false,
  isHotelReserved = false,
  isHotelCleaning = false,
}) => {
  const precio = typeof habitacion.precioPorNoche === 'string'
    ? parseFloat(habitacion.precioPorNoche)
    : habitacion.precioPorNoche || 100;

  const stock = habitacion.cantidadDisponible ?? 3;
  const isCleaning = Boolean(isHotelCleaning) || habitacion.estado === 'En Limpieza';
  const isOutOfStock = isCleaning || Boolean(isHotelReserved) || stock <= 0 || habitacion.estado === 'Inactivo';
  const isLowStock = !isOutOfStock && stock > 0 && stock <= 2;
  const code = habitacion.codigo || 'SUITE_DELUXE';
  const capacity = habitacion.capacidadAdultos ?? habitacion.capacidad ?? 2;
  const numHabitaciones = Number(habitacion.numHabitaciones ?? 1);
  const numCamas = Number(habitacion.numCamas ?? 1);
  const tipoCamas = habitacion.tipoCamas || (numCamas === 1 ? '1 Cama Doble / Queen' : `${numCamas} Camas`);

  return (
    <div className={styles.roomCard} style={isSelected ? { borderColor: 'var(--color-gold)', backgroundColor: 'var(--color-gold-light)' } : undefined}>
      <div className={styles.headerRow}>
        <div>
          <h4 className={styles.roomTitle}>{habitacion.nombre}</h4>
          <span className={styles.roomCode}>{code}</span>
        </div>
        {isCleaning ? (
          <div className={styles.lowStockWarning} style={{ color: '#92400E', backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}>
            <Sparkles size={13} />
            <span>En Limpieza · No disponible</span>
          </div>
        ) : isOutOfStock ? (
          <div className={styles.lowStockWarning} style={{ color: '#DC2626', backgroundColor: '#FEF2F2' }}>
            <AlertTriangle size={13} />
            <span>Agotada / Reservada</span>
          </div>
        ) : isLowStock ? (
          <div className={styles.lowStockWarning}>
            <AlertTriangle size={13} />
            <span>¡Pocas disponibles! Quedan solo {stock}</span>
          </div>
        ) : null}
      </div>

      <div className={styles.detailsGrid}>
        <img
          src={habitacion.imagenUrl || DEFAULT_ROOM_IMG}
          alt={habitacion.nombre}
          className={styles.roomImage}
          loading="lazy"
        />

        <div className={styles.featuresCol}>
          <div className={styles.capacityBadge} style={{ flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Users size={14} color="#14406B" />
              <span>Hasta {capacity} adultos{habitacion.capacidadNinos ? ` · ${habitacion.capacidadNinos} niños` : ''}</span>
            </span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <DoorOpen size={14} color="#14406B" />
              <span>{numHabitaciones} {numHabitaciones === 1 ? 'hab.' : 'habs.'}</span>
            </span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <BedDouble size={14} color="#14406B" />
              <span>{numCamas} {numCamas === 1 ? 'cama' : 'camas'} ({tipoCamas})</span>
            </span>
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
          {isOutOfStock ? (
            <Button variant="outline" size="sm" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}>
              {isCleaning ? 'En Limpieza' : 'Agotada'}
            </Button>
          ) : (
            <Button
              variant={isSelected ? 'gold' : 'primary'}
              size="sm"
              icon={isSelected ? <CheckCircle size={15} /> : undefined}
              onClick={() => onSelect(habitacion)}
            >
              {isSelected ? 'Seleccionada' : 'Seleccionar habitación'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

