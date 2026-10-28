import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { CommonModule } from './common/common.module';
import { AlojamientosModule } from './modules/alojamientos/alojamientos.module';
import { ReservasModule } from './modules/reservas/reservas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Carga de variables de entorno globales
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Throttler para control de tasa general (100 reqs/min por defecto)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        ssl: {
          rejectUnauthorized: false,
        },
        extra: {
          max: 10,
          connectionTimeoutMillis: 10000,
        },
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),

    // Módulos Compartidos
    CommonModule,

    // Módulos del Dominio Alojamientos
    AlojamientosModule,
    ReservasModule,
    UsuariosModule,
    AuthModule,
    PagosModule,
    InventarioModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
