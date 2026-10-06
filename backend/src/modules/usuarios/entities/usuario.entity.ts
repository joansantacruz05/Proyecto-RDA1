import { Column, Entity, PrimaryColumn } from 'typeorm';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'nombreCompleto', type: 'varchar', length: 255 })
  nombre: string;

  @Column({ name: 'email', type: 'varchar', length: 255, unique: true })
  correo: string;

  @Column({ type: 'varchar', length: 255 })
  contrasena: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string;

  @Column({ type: 'int', nullable: true })
  edad: number;
}
