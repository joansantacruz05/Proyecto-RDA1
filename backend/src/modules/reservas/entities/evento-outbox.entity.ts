import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'evento_outbox', schema: 'booking' })
export class EventoOutbox {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar' })
  tipo: string;

  @Column({ type: 'varchar' })
  agregado: string;

  @Column({ name: 'agregado_id', type: 'uuid' })
  agregadoId: string;

  @Column({ name: 'correlacion_id', type: 'uuid' })
  correlacionId: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'publicado_en', type: 'timestamptz', nullable: true })
  publicadoEn: Date;
}
