import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async create(crearUsuarioDto: CrearUsuarioDto) {
    const { correo, contrasena, nombre, telefono, edad } = crearUsuarioDto;

    const existe = await this.findOneByEmail(correo);
    if (existe) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const hashedPassword = await bcryptjs.hash(contrasena, 10);
    // Generar un ID aleatorio para mantener el formato USU-XXX
    const randomNum = Math.floor(100 + Math.random() * 900);
    const newId = 'USU-' + randomNum; 

    await this.usuarioRepository.query(`
      INSERT INTO usuarios (id, "nombreCompleto", email, contrasena, telefono, edad) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [newId, nombre, correo, hashedPassword, telefono || null, edad || null]);
    
    // Asignar el rol por defecto: Cliente (ROL-002)
    await this.usuarioRepository.query(`
      INSERT INTO usuarios_roles ("usuarioId", "rolId") 
      VALUES ($1, 'ROL-002')
    `, [newId]);

    return { id: newId, nombre, correo, rol: 'Cliente' };
  }

  async findOneByEmail(correo: string) {
    const result = await this.usuarioRepository.query(`
      SELECT 
        u.id, u."nombreCompleto" as nombre, u.email as correo, u.contrasena, u.telefono, u.edad, u.direccion, u.pais, r.nombre as rol
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur."usuarioId"
      LEFT JOIN roles r ON ur."rolId" = r.id
      WHERE u.email = $1
    `, [correo]);
    
    return result[0];
  }

  async findAll() {
    return await this.usuarioRepository.query(`
      SELECT u.id, u."nombreCompleto" as nombre, u.email as correo, r.nombre as rol
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur."usuarioId"
      LEFT JOIN roles r ON ur."rolId" = r.id
    `);
  }

  async updateProfile(correo: string, data: { nombre: string, telefono?: string, edad?: number, direccion?: string, pais?: string }) {
    await this.usuarioRepository.query(`
      UPDATE usuarios
      SET "nombreCompleto" = $1, telefono = $2, edad = $3, direccion = $4, pais = $5
      WHERE email = $6
    `, [data.nombre, data.telefono || null, data.edad || null, data.direccion || null, data.pais || null, correo]);
    
    return this.findOneByEmail(correo);
  }
}
