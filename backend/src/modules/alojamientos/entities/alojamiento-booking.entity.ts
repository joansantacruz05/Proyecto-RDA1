import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UnidadAlojamiento } from './unidad-alojamiento.entity';

@Entity({ name: 'alojamiento', schema: 'booking' })
export class AlojamientoBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'anfitrion_id', type: 'uuid' })
  anfitrionId: string;

  @Column({ name: 'tipo_id', type: 'smallint' })
  tipoId: number;

  @Column({ name: 'ciudad_id', type: 'smallint' })
  ciudadId: number;

  @Column({ name: 'politica_id', type: 'smallint' })
  politicaId: number;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'varchar' })
  direccion: string;

  @Column({ type: 'numeric' })
  latitud: number;

  @Column({ type: 'numeric' })
  longitud: number;

  @Column({ name: 'tarifa_limpieza', type: 'numeric', default: 0 })
  tarifaLimpieza: number;

  @Column({ type: 'varchar', default: 'ACTIVO' })
  estado: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => UnidadAlojamiento, (u) => u.alojamiento)
  unidades: UnidadAlojamiento[];
}
