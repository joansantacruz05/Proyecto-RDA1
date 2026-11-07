import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Copy,
  Calendar,
  Printer,
  Hotel,
  FileText,
  Home,
  Check,
} from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { formatUSD } from '../../components/ui/PriceDisplay/PriceDisplay';
import { OrderCreateResponse, PagoResponse, AlojamientoDetalle } from '../../api/types';
import { descargarICS } from '../../utils/calendarIcs';
import styles from './Step3Confirmation.module.css';

interface Step3ConfirmationProps {
  orderResult: OrderCreateResponse;
  pagoResult: PagoResponse;
  hotel: AlojamientoDetalle | null;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  roomName?: string | undefined;
  subtotal: number;
  iva: number;
  tasaMunicipal: number;
  total: number;
}

export const Step3Confirmation: React.FC<Step3ConfirmationProps> = ({
  orderResult,
  pagoResult,
  hotel,
  checkin,
  checkout,
  adults,
  rooms,
  roomName,
  subtotal,
  iva,
  tasaMunicipal,
  total,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const reservationCode =
    orderResult.codigoReserva ||
    orderResult.reservation_code ||
    orderResult.external_order_id ||
    orderResult.externalOrderId ||
    orderResult.orderId ||
    'BK-HOTEL-2026';

  const isCompleted = pagoResult.estado === 'Completado';
  const factura = pagoResult.factura;
  const hotelName = hotel?.nombre || orderResult.alojamientoNombre || 'LuxeStays Alojamiento';
  const guestName =
    orderResult.huespedTitular?.nombreCompleto ||
    orderResult.holder_info?.name ||
    factura?.nombreRazonSocial ||
    'Huésped Principal';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(reservationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadICS = () => {
    descargarICS({
      codigoReserva: reservationCode,
      hotelNombre: hotelName,
      direccion: hotel?.direccion || undefined,
      ciudad: hotel?.ciudad || hotel?.destino || undefined,
      checkinFecha: checkin,
      checkoutFecha: checkout,
      huespedNombre: guestName,
      total,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.confirmationContainer}>
      {/* Cabecera de Éxito */}
      <div className={styles.successHeader}>
        <div className={styles.checkCircle}>
          <CheckCircle size={36} />
        </div>
        <h2 className={styles.successTitle}>¡Reserva Confirmada con Éxito!</h2>
        <p className={styles.successSubtitle}>
          Hemos enviado el comprobante de reserva y la confirmación a tu correo electrónico.
        </p>
      </div>

      {/* Caja de Código de Reserva Destacado */}
      <div className={styles.codeBox}>
        <span className={styles.codeLabel}>Código de Reserva / Localizador</span>
        <div className={styles.codeRow}>
          <span className={styles.codeValue}>{reservationCode}</span>
          <button
            type="button"
            className={styles.copyButton}
            onClick={handleCopyCode}
            aria-label="Copiar código de reserva"
          >
            {copied ? (
              <>
                <Check size={14} color="#1F7A4D" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
        <div>
          <Badge variant={isCompleted ? 'success' : 'gold'}>
            {isCompleted
              ? 'Pago Aprobado · Confirmada'
              : 'Pago en Verificación · Registrada'}
          </Badge>
        </div>
      </div>

      {/* Tarjetas de Detalle: Estadía y Factura SRI */}
      <div className={styles.detailsGrid}>
        {/* Detalle de Estadía */}
        <div className={styles.voucherCard}>
          <h3 className={styles.cardTitle}>
            <Hotel size={18} color="#14406B" />
            <span>Detalles del Hospedaje</span>
          </h3>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Propiedad</span>
            <span className={styles.infoValue}>{hotelName}</span>
          </div>

          {roomName && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Tipo de habitación</span>
              <span className={styles.infoValue}>{roomName}</span>
            </div>
          )}

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Check-in</span>
            <span className={styles.infoValue}>{checkin} (desde las 14:00)</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Check-out</span>
            <span className={styles.infoValue}>{checkout} (hasta las 11:00)</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Huéspedes</span>
            <span className={styles.infoValue}>
              {adults} adulto{adults > 1 ? 's' : ''} · {rooms} hab.
            </span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Titular</span>
            <span className={styles.infoValue}>{guestName}</span>
          </div>
        </div>

        {/* Factura Electrónica SRI */}
        <div className={styles.voucherCard}>
          <h3 className={styles.cardTitle}>
            <FileText size={18} color="#14406B" />
            <span>Factura Electrónica SRI</span>
          </h3>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>N° de Factura</span>
            <span className={styles.infoValue}>
              {factura?.numeroFactura || '001-001-000000001'}
            </span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Subtotal Hospedaje</span>
            <span className={styles.infoValue}>{formatUSD(subtotal)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>IVA Ecuador (15%)</span>
            <span className={styles.infoValue}>{formatUSD(iva)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Tasa Municipal Turismo</span>
            <span className={styles.infoValue}>{formatUSD(tasaMunicipal)}</span>
          </div>

          <div className={styles.infoRow} style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '8px', marginTop: '8px' }}>
            <span className={styles.infoLabel} style={{ fontWeight: 700, color: 'var(--color-midnight-blue)' }}>
              Total Pagado
            </span>
            <span className={styles.infoValue} style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-pacific-blue)' }}>
              {formatUSD(total)} USD
            </span>
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className={styles.actionsContainer}>
        <Button
          variant="outline"
          icon={<Calendar size={16} />}
          onClick={handleDownloadICS}
        >
          Agregar a Calendario (.ics)
        </Button>

        <Button
          variant="outline"
          icon={<Printer size={16} />}
          onClick={handlePrint}
        >
          Imprimir comprobante
        </Button>

        <Button
          variant="primary"
          onClick={() => navigate('/mis-reservas')}
        >
          Ver en Mis Reservas
        </Button>

        <Button
          variant="ghost"
          icon={<Home size={16} />}
          onClick={() => navigate('/')}
        >
          Volver al Inicio
        </Button>
      </div>
    </div>
  );
};
