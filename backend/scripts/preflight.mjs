import { execSync } from 'child_process';
import os from 'os';
import net from 'net';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno del backend
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('================================================================');
console.log('    LUXESTAYS · VERIFICACIÓN PRE-VUELO (MODO INTEGRACIÓN)       ');
console.log('================================================================');

// 1. Detección de IP de Tailscale y Red Local
let tailscaleIp = null;
try {
  tailscaleIp = execSync('tailscale ip -4', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
} catch (e) {
  // Tailscale no instalado o apagado
}

let localNetworkIp = null;
const interfaces = os.networkInterfaces();
for (const name of Object.keys(interfaces)) {
  for (const netInterface of interfaces[name] || []) {
    if (netInterface.family === 'IPv4' && !netInterface.internal) {
      if (!localNetworkIp) localNetworkIp = netInterface.address;
    }
  }
}

const chosenIp = tailscaleIp || localNetworkIp || '127.0.0.1';
const port = process.env.PORT || '3000';
const apiPrefix = process.env.API_PREFIX !== undefined ? process.env.API_PREFIX : 'api/v1';
const baseUrlTailscale = `http://${chosenIp}:${port}`;
const baseUrlApi = `${baseUrlTailscale}/${apiPrefix}`.replace(/\/+$/, '');

console.log(`\n[RED & CONECTIVIDAD]`);
console.log(`• IP Tailscale detectada: ${tailscaleIp ? `✓ ${tailscaleIp}` : '✗ No detectada (usando IP de red local)'}`);
console.log(`• IP Red Local:          ${localNetworkIp || '127.0.0.1'}`);
console.log(`• Puerto HTTP:           ${port}`);
console.log(`• URL Base de Pruebas:   ${baseUrlTailscale}`);
console.log(`• URL API para Booking:  ${baseUrlApi}`);
console.log(`• Swagger Docs:          ${baseUrlTailscale}/api/docs`);

// 2. Verificación de Base de Datos PostgreSQL
console.log(`\n[BASE DE DATOS]`);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log('✗ ERROR: Variable DATABASE_URL no encontrada en backend/.env');
} else {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT 1 as ping, current_database() as db_name, version()');
    console.log(`✓ Conexión exitosa a Supabase PostgreSQL: ${res.rows[0].db_name}`);
    await client.end();
  } catch (err) {
    console.log(`✗ Error al conectar a la BD: ${err.message}`);
  }
}

// 3. Verificación de Salud HTTP Local
console.log(`\n[ESTADO DEL SERVIDOR LOCAL HTTP]`);
try {
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  if (res.ok) {
    const data = await res.json();
    console.log(`✓ Servidor REST respondiendo en /health: status = ${data.status}`);
  } else {
    console.log(`✗ Servidor REST respondió con código HTTP ${res.status}`);
  }
} catch (e) {
  console.log(`! El servidor local en puerto ${port} no parece estar encendido (ejecuta npm run start:dev)`);
}

// 4. Verificación de Booking gRPC
console.log(`\n[INTEGRACIÓN BOOKING gRPC]`);
const bookingGrpcUrl = process.env.BOOKING_GRPC_URL || '127.0.0.1:50051';
const [grpcHost, grpcPortStr] = bookingGrpcUrl.split(':');
const grpcPort = parseInt(grpcPortStr || '50051', 10);

const testSocket = new net.Socket();
let socketDone = false;
testSocket.setTimeout(2500);

await new Promise((resolve) => {
  testSocket.connect(grpcPort, grpcHost, () => {
    if (!socketDone) {
      socketDone = true;
      console.log(`✓ Servidor gRPC de Booking accesible en ${bookingGrpcUrl}`);
      testSocket.destroy();
      resolve();
    }
  });

  testSocket.on('error', (err) => {
    if (!socketDone) {
      socketDone = true;
      console.log(`! No se pudo conectar al puerto gRPC ${bookingGrpcUrl} (${err.code}). Asegúrate de correr el mock (npm run mock:booking) si estás en pruebas locales.`);
      resolve();
    }
  });

  testSocket.on('timeout', () => {
    if (!socketDone) {
      socketDone = true;
      console.log(`! Tiempo de espera agotado al conectar a ${bookingGrpcUrl}`);
      testSocket.destroy();
      resolve();
    }
  });
});

console.log('\n================================================================\n');
