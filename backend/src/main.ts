import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

async function bootstrap() {
  // ── Validación de Variables Críticas de Entorno al Inicio ───────────────
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === '') {
    console.error('FATAL: La variable de entorno DATABASE_URL es obligatoria para arrancar.');
    process.exit(1);
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    console.error('FATAL: La variable de entorno JWT_SECRET es obligatoria y debe tener al menos 32 caracteres.');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // ── Seguridad HTTP con Helmet ──────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false, // Permite Swagger UI
    crossOriginEmbedderPolicy: false,
  }));

  // ── Trazabilidad y Logging Estructurado (X-Correlation-ID) ──────────────
  app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const logEntry = {
        timestamp: new Date().toISOString(),
        correlationId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
        userAgent: req.headers['user-agent'] || '',
        ip: req.ip || req.socket.remoteAddress,
      };
      // En modo prueba/integración o desarrollo se emite en JSON estructurado
      console.log(JSON.stringify(logEntry));
    });
    next();
  });

  // ── Enrutamiento y Normalización de Versiones (v1, v2 y rutas directas /alojamientos) ──
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Si la petición viene con prefijo /api/v2/, normalizar internamente a /api/v1/
    if (req.url.startsWith('/api/v2/')) {
      req.url = req.url.replace(/^\/api\/v2\//, '/api/v1/');
    }
    // Si viene directamente con /alojamientos/ (excepto health que está en exclude), normalizar a /api/v1/alojamientos/
    if (req.url.startsWith('/alojamientos/') && !req.url.startsWith('/alojamientos/health')) {
      req.url = '/api/v1' + req.url;
    }
    next();
  });

  // ── Prefijo Global con Exclusión de Health y Raíz ────────────────────────
  const apiPrefix = process.env.API_PREFIX !== undefined ? process.env.API_PREFIX : 'api/v1';
  if (apiPrefix && apiPrefix.trim() !== '') {
    app.setGlobalPrefix(apiPrefix, {
      exclude: [
        '/',
        'health',
        'api/v1',
        'api/v1/health',
        'api/v2',
        'api/v2/health',
        'alojamientos/health',
        'api/v1/alojamientos/health',
        'api/v2/alojamientos/health',
      ],
    });
  }

  // ── Configuración de CORS Dinámico y Multi-origen ────────────────────────
  const configuredFrontends = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const extraOrigins = (process.env.CORS_EXTRA_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const localOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const allowedOrigins = Array.from(
    new Set([...configuredFrontends, ...extraOrigins, ...localOrigins]),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Peticiones server-to-server o sin cabecera origin (curl, Postman, integrador)
      if (!origin) return callback(null, true);
      // Previews de Vercel
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      // Orígenes permitidos en lista blanca
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // En desarrollo permitir cualquier localhost
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,Idempotency-Key,X-Correlation-ID,X-Device-Fingerprint',
  });

  // ── Filtro Global ProblemDetails y Tubería de Validación ─────────────────
  app.useGlobalFilters(new ProblemDetailsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Microservicio gRPC Híbrido Inbound (Opcional por Entorno) ─────────────
  if (process.env.GRPC_ENABLED === 'true') {
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
    console.log(`[gRPC] Microservicio inbound escuchando en 0.0.0.0:${grpcPort}`);
  }

  // ── Documentación OpenAPI / Swagger con Bearer y OAuth2 ──────────────────
  const config = new DocumentBuilder()
    .setTitle('GDS Alojamientos Core API')
    .setDescription(
      'Microservicio centralizado para búsqueda, disponibilidad, reservas (órdenes), postventa de alojamientos y webhooks.',
    )
    .setVersion('1.0')
    .addBearerAuth()
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

  // ── Inicio del Servidor HTTP Escuchando en todas las interfaces ──────────
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`[REST] Servidor HTTP de Alojamientos escuchando en http://${host}:${port}`);
  console.log(`[REST] Health checks disponibles en http://${host}:${port}/health y http://${host}:${port}/api/v1/health`);
}
bootstrap();
