import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    // Carga de variables de entorno globales
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'backend/.env'],
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
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.getOrThrow<string>('DATABASE_URL');
        const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
        return {
          type: 'postgres',
          url: dbUrl,
          autoLoadEntities: true,
          synchronize: false,
          ssl: isLocal ? false : {
            rejectUnauthorized: false,
          },
          extra: {
            max: 10,
            connectionTimeoutMillis: 10000,
          },
          retryAttempts: 3,
          retryDelay: 3000,
        };
      },
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
