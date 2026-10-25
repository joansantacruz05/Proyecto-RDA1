import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';

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
