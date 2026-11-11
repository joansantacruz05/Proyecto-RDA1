/**
 * Generador de archivos de calendario iCalendar (.ics - RFC 5545)
 * Permite a los huéspedes sincronizar su estadía en Google Calendar, Apple Calendar o Outlook.
 */

export interface ReservaCalendarioData {
  codigoReserva: string;
  hotelNombre: string;
  direccion?: string | undefined;
  ciudad?: string | undefined;
  checkinFecha: string;  // YYYY-MM-DD
  checkoutFecha: string; // YYYY-MM-DD
  horaCheckIn?: string | undefined;
  horaCheckOut?: string | undefined;
  huespedNombre: string;
  total: number;
}

export function formatearFechaICS(fechaStr: string, hora: string): string {
  // Convierte "2026-11-20" y "14:00" en formato "20261120T140000"
  const cleanDate = fechaStr.replace(/-/g, '');
  const cleanTime = hora.replace(/:/g, '').slice(0, 4) + '00';
  return `${cleanDate}T${cleanTime}`;
}

export function generarArchivoICS(reserva: ReservaCalendarioData): string {
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const checkInHora = (reserva.horaCheckIn || '14:00').slice(0, 5);
  const checkOutHora = (reserva.horaCheckOut || '11:00').slice(0, 5);
  // Check-in y Check-out según horario configurado del alojamiento (hora local de Ecuador)
  const dtStart = formatearFechaICS(reserva.checkinFecha, checkInHora);
  const dtEnd = formatearFechaICS(reserva.checkoutFecha, checkOutHora);
  const ubicacion = [reserva.hotelNombre, reserva.direccion, reserva.ciudad, 'Ecuador']
    .filter(Boolean)
    .join(', ');

  const summary = `Estadía en ${reserva.hotelNombre} · LuxeStays (${reserva.codigoReserva})`;
  const description = [
    `Reserva confirmada en LuxeStays Ecuador`,
    `Localizador: ${reserva.codigoReserva}`,
    `Huésped Titular: ${reserva.huespedNombre}`,
    `Check-in: ${reserva.checkinFecha} a partir de las ${checkInHora}`,
    `Check-out: ${reserva.checkoutFecha} hasta las ${checkOutHora}`,
    `Total pagado: $${reserva.total.toFixed(2)} USD`,
    `Asistencia 24/7: soporte@luxestays.ec`,
  ].join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LuxeStays Ecuador//Reservas y Alojamientos v2//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reserva.codigoReserva}-${Date.now()}@luxestays.ec`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${ubicacion}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Recordatorio: Tu check-in en ${reserva.hotelNombre} es mañana a las ${checkInHora}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function descargarICS(reserva: ReservaCalendarioData): void {
  const icsContent = generarArchivoICS(reserva);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `LuxeStays_${reserva.codigoReserva}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
