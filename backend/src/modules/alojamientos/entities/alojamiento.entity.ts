import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('alojamientos')
export class Alojamiento {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'anfitrionId', type: 'varchar', length: 50, nullable: true })
  anfitrionId: string;

  @Column({ name: 'tipoId', type: 'varchar', length: 50, nullable: true })
  tipoId: string;

  @Column({ name: 'ubicacionId', type: 'varchar', length: 50, nullable: true })
  ubicacionId: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'text', nullable: true, name: 'politicaCancelacion' })
  politicaCancelacion: string;
}
