import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/column-numeric.transformer';
import { Alojamiento } from '../../alojamientos/entities/alojamiento.entity';

@Entity('reservas')
export class Reserva {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombreCliente: string;

  @Column({ type: 'varchar', length: 255 })
  emailCliente: string;

  @Column({ type: 'date' })
  fechaInicio: Date;

  @Column({ type: 'date' })
  fechaFin: Date;

  @Column({ type: 'int', default: 1 })
  numeroPersonas: number;

  @Column('numeric', {
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  totalPagar: number;

  @Column({ type: 'varchar', length: 50, default: 'PENDIENTE' })
  estado: string;

  @Column({ type: 'int', nullable: true })
  calificacion: number;

  @Column({ type: 'text', nullable: true })
  comentario: string;

  // Relación Muchos a Uno con Alojamiento
  @ManyToOne(() => Alojamiento)
  @JoinColumn({ name: 'alojamiento_id' })
  alojamiento: Alojamiento;
}
