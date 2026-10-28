import pg from 'pg';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL no encontrada en backend/.env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log('--- Iniciando Semilla de Usuarios y Catálogo Normalizado ---');
  await client.connect();

  const rawPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!*';
  const validHash = bcryptjs.hashSync(rawPassword, 10);
  console.log(`✓ Hash bcrypt generado correctamente (Longitud: ${validHash.length} caracteres)`);

  if (validHash.length !== 60) {
    throw new Error(`El hash generado no tiene 60 caracteres (tiene ${validHash.length})`);
  }

  // 1. Roles
  await client.query(`
    INSERT INTO roles (id, nombre) VALUES
      ('ROL-001', 'Anfitrión'),
      ('ROL-002', 'Cliente'),
      ('ROL-003', 'Admin')
    ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
  `);
  console.log('✓ Roles normalizados (Admin, Cliente, Anfitrión)');

  // 2. Estados de Reserva
  await client.query(`
    INSERT INTO estados_reserva (id, nombre) VALUES
      ('EST-001', 'Pendiente'),
      ('EST-002', 'Confirmada'),
      ('EST-003', 'Cancelada')
    ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
  `);

  // 3. Métodos de Pago
  await client.query(`
    INSERT INTO metodos_pago (id, nombre, estado) VALUES
      ('MET-001', 'Tarjeta de Crédito', 'Activo'),
      ('MET-002', 'Tarjeta de Débito', 'Activo'),
      ('MET-003', 'Transferencia Bancaria', 'Activo'),
      ('MET-004', 'PayPal', 'Activo'),
      ('MET-005', 'Efectivo', 'Activo')
    ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, estado = 'Activo';
  `);

  // 4. Usuarios Semilla
  const seedUsers = [
    {
      id: 'USU-001',
      nombre: 'Sebastian Admin',
      email: 'admin@rda.com',
      telefono: '0999999999',
      edad: 30,
      direccion: 'Av. Amazonas y Colón, Quito',
      pais: 'Ecuador',
      rolId: 'ROL-003',
    },
    {
      id: 'USU-002',
      nombre: 'Host Ecuador',
      email: 'host@ecuador.com',
      telefono: '0988888888',
      edad: 35,
      direccion: 'Malecón 2000, Guayaquil',
      pais: 'Ecuador',
      rolId: 'ROL-001',
    },
    {
      id: 'USU-003',
      nombre: 'Cliente Demo',
      email: 'cliente@rda.com',
      telefono: '0977777777',
      edad: 28,
      direccion: 'Calle Larga y Huayna Cápac, Cuenca',
      pais: 'Ecuador',
      rolId: 'ROL-002',
    },
  ];

  for (const u of seedUsers) {
    await client.query(
      `
      INSERT INTO usuarios (id, "nombreCompleto", email, telefono, contrasena, edad, direccion, pais)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO UPDATE SET
        contrasena = EXCLUDED.contrasena,
        "nombreCompleto" = EXCLUDED."nombreCompleto",
        edad = EXCLUDED.edad,
        direccion = EXCLUDED.direccion,
        pais = EXCLUDED.pais;
    `,
      [u.id, u.nombre, u.email, u.telefono, validHash, u.edad, u.direccion, u.pais],
    );

    // Obtener ID real del usuario (por si ya existía con otro ID)
    const userRes = await client.query('SELECT id FROM usuarios WHERE email = $1', [u.email]);
    const realUserId = userRes.rows[0].id;

    await client.query(
      `
      INSERT INTO usuarios_roles ("usuarioId", "rolId")
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `,
      [realUserId, u.rolId],
    );
    console.log(`✓ Usuario listo: ${u.email} (${u.nombre}) con rol ${u.rolId}`);
  }

  // 5. Países y Ciudades de Ecuador
  await client.query(`
    INSERT INTO paises (id, nombre) VALUES ('PAI-001', 'Ecuador') ON CONFLICT (id) DO NOTHING;
    INSERT INTO ciudades (id, "paisId", nombre) VALUES
      ('CIU-001', 'PAI-001', 'Quito'),
      ('CIU-002', 'PAI-001', 'Guayaquil'),
      ('CIU-003', 'PAI-001', 'Cuenca'),
      ('CIU-004', 'PAI-001', 'Manta'),
      ('CIU-005', 'PAI-001', 'Baños'),
      ('CIU-006', 'PAI-001', 'Galápagos')
    ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
  `);

  // 6. Tipos de Alojamiento
  await client.query(`
    INSERT INTO tipos_alojamiento (id, nombre) VALUES
      ('TIP-001', 'Hotel'),
      ('TIP-002', 'Hostal'),
      ('TIP-003', 'Airbnb (Casa)'),
      ('TIP-004', 'Airbnb (Departamento)'),
      ('TIP-005', 'Resort')
    ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
  `);

  // 7. Servicios
  await client.query(`
    INSERT INTO servicios (id, nombre, icono) VALUES
      ('SER-001', 'Piscina', 'pool'),
      ('SER-002', 'Wi-Fi de Alta Velocidad', 'wifi'),
      ('SER-003', 'Parqueadero Privado', 'car'),
      ('SER-004', 'Aire Acondicionado', 'wind'),
      ('SER-005', 'Pet Friendly', 'dog'),
      ('SER-006', 'Desayuno Incluido', 'coffee'),
      ('SER-007', 'Spa & Jacuzzi', 'sparkles')
    ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
  `);

  // 8. Alojamientos Destacados con Fotos Reales y Códigos Estables
  const alojamientosData = [
    {
      id: 'ALO-001',
      codigo: 'HTL-UIO-001',
      nombre: 'Gran Hotel Plaza Grande · Centro Histórico',
      descripcion: 'Hospédese con vista a la Plaza Mayor en el corazón patrimonial de Quito. Arquitectura colonial con amenidades de primer nivel y restaurante gourmet.',
      tipoId: 'TIP-001',
      ciudadId: 'CIU-001',
      direccion: 'García Moreno y Chile, Centro Histórico, Quito',
      lat: -0.2198,
      lng: -78.5126,
      imagenUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      servicios: ['SER-001', 'SER-002', 'SER-003', 'SER-006'],
      habitaciones: [
        {
          id: 'HAB-001-A',
          codigo: 'SUITE_PRESIDENCIAL',
          nombre: 'Suite Presidencial con Balcón a la Plaza',
          precio: '145.00',
          adultos: 2,
          ninos: 2,
          unidades: 3,
          imagenes: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'HAB-001-B',
          codigo: 'HAB_DELUXE_COLONIAL',
          nombre: 'Habitación Deluxe Doble Colonial',
          precio: '85.00',
          adultos: 2,
          ninos: 1,
          unidades: 5,
          imagenes: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      id: 'ALO-002',
      codigo: 'VIL-CUE-002',
      nombre: 'Villa Colonial Río Tomebamba',
      descripcion: 'Hermosa villa frente al barranco del río Tomebamba en Cuenca. Chimenea, jardín interior, tranquilidad absoluta y acabados rústicos en madera.',
      tipoId: 'TIP-003',
      ciudadId: 'CIU-003',
      direccion: 'Paseo 3 de Noviembre 12-45, El Barranco, Cuenca',
      lat: -2.9015,
      lng: -79.0062,
      imagenUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
      servicios: ['SER-002', 'SER-003', 'SER-005', 'SER-007'],
      habitaciones: [
        {
          id: 'HAB-002-A',
          codigo: 'CASA_COMPLETA_RUSTICA',
          nombre: 'Villa Completa 3 Dormitorios con Chimenea',
          precio: '120.00',
          adultos: 6,
          ninos: 3,
          unidades: 2,
          imagenes: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'HAB-002-B',
          codigo: 'MASTER_SUITE_RIO',
          nombre: 'Master Suite con Terraza al Río',
          precio: '75.00',
          adultos: 2,
          ninos: 0,
          unidades: 3,
          imagenes: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      id: 'ALO-003',
      codigo: 'DEP-MEC-003',
      nombre: 'Ocean View Penthouse · Manta Beach',
      descripcion: 'Moderno departamento de lujo frente al mar en la playa Murciélago. Piscina infinita comunal, acceso privado a la playa y vista panorámica al atardecer.',
      tipoId: 'TIP-004',
      ciudadId: 'CIU-004',
      direccion: 'Av. Malecón Jaime Chávez, Playa Murciélago, Manta',
      lat: -0.9431,
      lng: -80.7382,
      imagenUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      servicios: ['SER-001', 'SER-002', 'SER-003', 'SER-004'],
      habitaciones: [
        {
          id: 'HAB-003-A',
          codigo: 'PENTHOUSE_OCEAN_FRONT',
          nombre: 'Penthouse Panorámico Frente al Mar',
          precio: '160.00',
          adultos: 4,
          ninos: 2,
          unidades: 2,
          imagenes: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'HAB-003-B',
          codigo: 'SUITE_EJECUTIVA_PLAYA',
          nombre: 'Suite Ejecutiva 1 Habitación Vista Playa',
          precio: '90.00',
          adultos: 2,
          ninos: 1,
          unidades: 4,
          imagenes: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      id: 'ALO-004',
      codigo: 'RST-BAN-004',
      nombre: 'Luna Volcán & Spa Resort Baños',
      descripcion: 'Resort de montaña y spa termal ubicado en las laderas del Volcán Tungurahua. Piscinas de agua termal, senderos ecológicos y masajes relajantes.',
      tipoId: 'TIP-005',
      ciudadId: 'CIU-005',
      direccion: 'Vía a Runtún Km 6, Baños de Agua Santa',
      lat: -1.3981,
      lng: -78.4239,
      imagenUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80',
      servicios: ['SER-001', 'SER-002', 'SER-006', 'SER-007'],
      habitaciones: [
        {
          id: 'HAB-004-A',
          codigo: 'CHALET_TERMAL_VISTA',
          nombre: 'Chalet Termal con Jacuzzi Panorámico',
          precio: '185.00',
          adultos: 2,
          ninos: 2,
          unidades: 4,
          imagenes: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'HAB-004-B',
          codigo: 'CABANA_DEL_VOLCAN',
          nombre: 'Cabaña Estándar del Volcán',
          precio: '95.00',
          adultos: 2,
          ninos: 1,
          unidades: 6,
          imagenes: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
    {
      id: 'ALO-005',
      codigo: 'HTL-GAL-005',
      nombre: 'Galápagos Eco Safari Camp · Santa Cruz',
      descripcion: 'Campamento de lujo ecológico en las tierras altas de Santa Cruz. Encuentro con tortugas gigantes en su hábitat natural y excursiones en catamarán.',
      tipoId: 'TIP-005',
      ciudadId: 'CIU-006',
      direccion: 'Vía a Baltra Km 12, Isla Santa Cruz, Galápagos',
      lat: -0.6321,
      lng: -90.3541,
      imagenUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      servicios: ['SER-001', 'SER-002', 'SER-003', 'SER-006', 'SER-007'],
      habitaciones: [
        {
          id: 'HAB-005-A',
          codigo: 'SAFARI_TENT_DELUXE',
          nombre: 'Carpa Safari Luxury con Deck Privado',
          precio: '250.00',
          adultos: 2,
          ninos: 2,
          unidades: 3,
          imagenes: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80',
        },
        {
          id: 'HAB-005-B',
          codigo: 'FAMILY_LODGE_GALAPAGOS',
          nombre: 'Lodge Familiar Eco-Friendly',
          precio: '320.00',
          adultos: 4,
          ninos: 2,
          unidades: 2,
          imagenes: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
        },
      ],
    },
  ];

  for (const a of alojamientosData) {
    const ubiId = `UBI-${a.id.replace('ALO-', '')}`;
    await client.query(
      `
      INSERT INTO ubicaciones (id, "ciudadId", direccion_detallada, latitud, longitud)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        "ciudadId" = EXCLUDED."ciudadId",
        direccion_detallada = EXCLUDED.direccion_detallada,
        latitud = EXCLUDED.latitud,
        longitud = EXCLUDED.longitud;
    `,
      [ubiId, a.ciudadId, a.direccion, a.lat, a.lng],
    );

    await client.query(
      `
      INSERT INTO alojamientos (id, codigo, "anfitrionId", "tipoId", "ubicacionId", nombre, descripcion, estado, "imagenUrl", "horaCheckIn", "horaCheckOut")
      VALUES ($1, $2, 'USU-002', $3, $4, $5, $6, 'Activo', $7, '14:00', '11:00')
      ON CONFLICT (id) DO UPDATE SET
        codigo = EXCLUDED.codigo,
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        "imagenUrl" = EXCLUDED."imagenUrl",
        "tipoId" = EXCLUDED."tipoId",
        "ubicacionId" = EXCLUDED."ubicacionId",
        estado = 'Activo';
    `,
      [a.id, a.codigo, a.tipoId, ubiId, a.nombre, a.descripcion, a.imagenUrl],
    );

    // Servicios del alojamiento
    for (const serId of a.servicios) {
      await client.query(
        `
        INSERT INTO alojamientos_servicios ("alojamientoId", "servicioId")
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `,
        [a.id, serId],
      );
    }

    // Habitaciones (espacios rentables)
    for (const hab of a.habitaciones) {
      await client.query(
        `
        INSERT INTO espacios_rentables (id, codigo, "alojamientoId", nombre, "capacidadAdultos", "capacidadNinos", "precioPorNoche", "cantidadDisponible", estado, "imagenesUrls")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Activo', $9)
        ON CONFLICT (id) DO UPDATE SET
          codigo = EXCLUDED.codigo,
          nombre = EXCLUDED.nombre,
          "capacidadAdultos" = EXCLUDED."capacidadAdultos",
          "capacidadNinos" = EXCLUDED."capacidadNinos",
          "precioPorNoche" = EXCLUDED."precioPorNoche",
          "cantidadDisponible" = EXCLUDED."cantidadDisponible",
          "imagenesUrls" = EXCLUDED."imagenesUrls",
          estado = 'Activo';
      `,
        [hab.id, hab.codigo, a.id, hab.nombre, hab.adultos, hab.ninos, hab.precio, hab.unidades, hab.imagenes],
      );
    }
    console.log(`✓ Alojamiento listo: ${a.codigo} - ${a.nombre} (${a.habitaciones.length} habitaciones)`);
  }

  console.log('\n--- Semilla completada exitosamente ---');
  await client.end();
}

main().catch((err) => {
  console.error('Error durante la semilla:', err);
  process.exit(1);
});
