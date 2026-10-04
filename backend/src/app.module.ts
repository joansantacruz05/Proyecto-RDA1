import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CommonModule } from './common/common.module';
import { AlojamientosModule } from './modules/alojamientos/alojamientos.module';
import { ReservasModule } from './modules/reservas/reservas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
// import { AutosModule } from './modules/autos/autos.module';
// import { AtraccionesModule } from './modules/atracciones/atracciones.module';
// import { VuelosModule } from './modules/vuelos/vuelos.module';

@Module({
  imports: [
    // Carga de variables de entorno globales
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configuración centralizada de TypeORM (Usando SQLite temporalmente por bloqueo de red)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: 'booking.sqlite',
        autoLoadEntities: true,
        synchronize: true, // Útil para desarrollo, en prod se suelen usar migraciones
      }),
    }),

    // Módulos Compartidos
    CommonModule,

    // =========================================================================
    // ATENCIÓN ALUMNO: Descomenta solo el módulo que corresponde a tu grupo
    // =========================================================================
    AlojamientosModule,
    ReservasModule,
    UsuariosModule,
    AuthModule,
    // AutosModule,
    // AtraccionesModule,
    // VuelosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
