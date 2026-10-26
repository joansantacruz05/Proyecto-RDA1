import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'orden_preview', schema: 'booking' })
export class OrdenPreview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ name: 'unidad_id', type: 'uuid' })
  unidadId: string;

  @Column({ name: 'fecha_entrada', type: 'date' })
  fechaEntrada: string;

  @Column({ name: 'fecha_salida', type: 'date' })
  fechaSalida: string;

  @Column({ name: 'num_huespedes', type: 'smallint' })
  numHuespedes: number;

  @Column({ type: 'smallint', default: 1 })
  cantidad: number;

  @Column({ name: 'total_cotizado', type: 'numeric' })
  totalCotizado: number;

  @Column({ type: 'char', length: 3, default: 'USD' })
  moneda: string;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn: Date;

  @Column({ name: 'reserva_id', type: 'uuid', nullable: true })
  reservaId: string;
}
