import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AlojamientoBooking } from './alojamiento-booking.entity';

@Entity({ name: 'unidad_alojamiento', schema: 'booking' })
export class UnidadAlojamiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alojamiento_id', type: 'uuid' })
  alojamientoId: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ name: 'capacidad_huespedes', type: 'smallint' })
  capacidadHuespedes: number;

  @Column({ name: 'num_habitaciones', type: 'smallint', default: 1 })
  numHabitaciones: number;

  @Column({ name: 'num_camas', type: 'smallint', default: 1 })
  numCamas: number;

  @Column({ name: 'num_banos', type: 'smallint', default: 1 })
  numBanos: number;

  @Column({ type: 'smallint', default: 1 })
  cantidad: number;

  @Column({ name: 'precio_noche_base', type: 'numeric' })
  precioNocheBase: number;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @ManyToOne(() => AlojamientoBooking, (a) => a.unidades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alojamiento_id' })
  alojamiento: AlojamientoBooking;
}
