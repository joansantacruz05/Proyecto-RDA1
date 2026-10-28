import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario, Role } from './entities/usuario.entity';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import * as bcryptjs from 'bcryptjs';
import { generateEntityId } from '../../common/utils/password-rules';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async create(crearUsuarioDto: CrearUsuarioDto) {
    const { correo, contrasena, nombre, telefono, edad, rol } = crearUsuarioDto;
    const cleanEmail = correo.trim().toLowerCase();

    const existe = await this.findOneByEmail(cleanEmail);
    if (existe) {
      throw new BadRequestException('El correo ya está registrado en el sistema.');
    }

    const hashedPassword = await bcryptjs.hash(contrasena, 10);
    const newId = generateEntityId('USU');

    await this.usuarioRepository.query(
      `
      INSERT INTO usuarios (id, "nombreCompleto", email, contrasena, telefono, edad) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [newId, nombre.trim(), cleanEmail, hashedPassword, telefono || null, edad || null],
    );

    // Mapeo de rol solicitado a ID de rol
    let rolId = 'ROL-002'; // Cliente por defecto
    let rolNombre = 'Cliente';

    if (rol === Role.ADMIN || (typeof rol === 'string' && rol.toLowerCase().includes('admin'))) {
      rolId = 'ROL-003';
      rolNombre = 'Admin';
    } else if (rol === Role.ANFITRION || (typeof rol === 'string' && rol.toLowerCase().includes('anfitr'))) {
      rolId = 'ROL-001';
      rolNombre = 'Anfitrión';
    }

    await this.usuarioRepository.query(
      `
      INSERT INTO usuarios_roles ("usuarioId", "rolId") 
      VALUES ($1, $2)
    `,
      [newId, rolId],
    );

    return { id: newId, nombre, correo: cleanEmail, rol: rolNombre };
  }

  // Uso interno para autenticación (incluye hash de contraseña)
  async findOneByEmail(correo: string) {
    const cleanEmail = correo.trim().toLowerCase();
    const result = await this.usuarioRepository.query(
      `
      SELECT 
        u.id, u."nombreCompleto" as nombre, u.email as correo, u.contrasena, u.telefono, u.edad, u.direccion, u.pais, r.nombre as rol
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur."usuarioId"
      LEFT JOIN roles r ON ur."rolId" = r.id
      WHERE LOWER(u.email) = $1
    `,
      [cleanEmail],
    );

    return result[0];
  }

  // Uso seguro para endpoint /auth/me (NUNCA expone el hash de contraseña)
  async getProfile(userId: string) {
    const result = await this.usuarioRepository.query(
      `
      SELECT 
        u.id, u."nombreCompleto" as nombre, u.email as correo, u.telefono, u.edad, u.direccion, u.pais, r.nombre as rol
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur."usuarioId"
      LEFT JOIN roles r ON ur."rolId" = r.id
      WHERE u.id = $1
    `,
      [userId],
    );

    if (!result || result.length === 0) {
      throw new NotFoundException('Perfil de usuario no encontrado.');
    }

    return result[0];
  }

  // Actualiza el perfil del usuario autenticado
  async updateProfile(userId: string, data: { nombre?: string; telefono?: string; edad?: number; direccion?: string; pais?: string }) {
    const user = await this.getProfile(userId);

    const updateNombre = data.nombre !== undefined ? data.nombre.trim() : user.nombre;
    const updateTelefono = data.telefono !== undefined ? data.telefono : user.telefono;
    // Si la edad viene como 0 o vacía, se ignora o se mantiene
    const updateEdad = data.edad && data.edad >= 18 && data.edad <= 120 ? data.edad : user.edad;
    const updateDireccion = data.direccion !== undefined ? data.direccion : user.direccion;
    const updatePais = data.pais !== undefined ? data.pais : user.pais;

    await this.usuarioRepository.query(
      `
      UPDATE usuarios
      SET "nombreCompleto" = $1, telefono = $2, edad = $3, direccion = $4, pais = $5
      WHERE id = $6
    `,
      [updateNombre, updateTelefono, updateEdad, updateDireccion, updatePais, userId],
    );

    return this.getProfile(userId);
  }

  // Listado para panel Admin (sin contraseñas)
  async findAll() {
    return await this.usuarioRepository.query(`
      SELECT u.id, u."nombreCompleto" as nombre, u.email as correo, u.telefono, u.edad, u.direccion, u.pais, r.nombre as rol
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur."usuarioId"
      LEFT JOIN roles r ON ur."rolId" = r.id
      ORDER BY u."nombreCompleto" ASC
    `);
  }
}
