import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
    const { correo, contrasena, ...rest } = crearUsuarioDto;

    const existe = await this.usuarioRepository.findOne({ where: { correo } });
    if (existe) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const hashedPassword = await bcryptjs.hash(contrasena, 10);
    const usuario = this.usuarioRepository.create({
      correo,
      contrasena: hashedPassword,
      ...rest,
    });

    await this.usuarioRepository.save(usuario);
    delete usuario.contrasena;
    return usuario;
  }

  async findOneByEmail(correo: string) {
    return await this.usuarioRepository.findOne({ where: { correo } });
  }

  async findAll() {
    return await this.usuarioRepository.find({
      select: ['id', 'nombre', 'correo', 'rol', 'activo'],
    });
  }
}
