import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo configurable mediante variable de entorno API_PREFIX (por defecto 'api/v1')
  const apiPrefix = process.env.API_PREFIX !== undefined ? process.env.API_PREFIX : 'api/v1';
  if (apiPrefix && apiPrefix.trim() !== '') {
    app.setGlobalPrefix(apiPrefix);
  }

  app.enableCors();

  // Filtro global para respuestas de error estándar application/problem+json
  app.useGlobalFilters(new ProblemDetailsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Microservicio gRPC Híbrido (Escucha en puerto 50051 o GRPC_PORT)
  const grpcPort = process.env.GRPC_PORT || 50051;
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'alojamientos',
      protoPath: join(__dirname, 'modules/alojamientos/contracts/alojamientos.proto'),
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  await app.startAllMicroservices();

  const config = new DocumentBuilder()
    .setTitle('GDS Alojamientos Core API')
    .setDescription('Microservicio centralizado para búsqueda, disponibilidad, reservas (órdenes), postventa de alojamientos y webhooks.')
    .setVersion('1.0')
    .addOAuth2({
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: 'https://auth.booking-hub.com/oauth2/authorize',
          tokenUrl: 'https://auth.booking-hub.com/oauth2/token',
          scopes: {
            'alojamientos:read': 'Leer información de alojamientos, disponibilidades y reservas',
            'alojamientos:book': 'Crear y alterar reservas',
            'alojamientos:cancel': 'Cancelar reservas',
            'alojamientos:webhooks': 'Gestionar webhooks',
          },
        },
      },
    })
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
