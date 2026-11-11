import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Printer,
  FileCheck,
  Star,
  XCircle,
  Building,
  CheckCircle2,
  FileText,
  Hotel,
  MapPin,
} from 'lucide-react';
import { api, getAuthToken } from '../../api/client';
import { ReservaUsuarioItem, UsuarioSession } from '../../api/types';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { formatUSD } from '../../components/ui/PriceDisplay/PriceDisplay';
import { InteractiveMap } from '../../components/map/InteractiveMap';
import { ContractModal } from '../../components/modals/ContractModal';
import { ReviewModal } from '../../components/modals/ReviewModal';
import { CancelModal } from '../../components/modals/CancelModal';
import { InvoiceModal } from '../../components/modals/InvoiceModal';
import { descargarICS } from '../../utils/calendarIcs';
import { formatHoraHHMM, resolveMapCoords } from '../../utils/ecuadorLocations';
import styles from './BookingDetailPage.module.css';

interface BookingDetailPageProps {
  currentUser: UsuarioSession | null;
}

const DEFAULT_HOTEL_IMG = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';

export const BookingDetailPage: React.FC<BookingDetailPageProps> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = getAuthToken();

  const [showContractModal, setShowContractModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const {
    data: reserva,
    isLoading,
    isError,
    refetch,
  } = useQuery<ReservaUsuarioItem>({
    queryKey: ['reservaDetail', id],
    queryFn: () => api.get<ReservaUsuarioItem>(`/reservas/${id}`),
    enabled: Boolean(token && id),
  });

  if (!token || !currentUser) {
    return (
      <div className={`container ${styles.detailContainer}`} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Building size={48} color="#14406B" style={{ margin: '0 auto 16px' }} />
        <h2>Inicia sesión para consultar los detalles de tu reserva</h2>
        <Button
          variant="gold"
          style={{ marginTop: '16px' }}
          onClick={() => navigate(`/login?returnUrl=/mis-reservas/${id}`)}
        >
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`container ${styles.detailContainer}`}>
        <Skeleton width={180} height={24} style={{ marginBottom: '16px' }} />
        <Skeleton width="50%" height={36} style={{ marginBottom: '24px' }} />
        <Skeleton width="100%" height={100} style={{ borderRadius: 'var(--radius-xl)', marginBottom: '32px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
          <Skeleton width="100%" height={380} style={{ borderRadius: 'var(--radius-xl)' }} />
          <Skeleton width="100%" height={380} style={{ borderRadius: 'var(--radius-xl)' }} />
        </div>
      </div>
    );
  }

  if (isError || !reserva) {
    return (
      <div className={`container ${styles.detailContainer}`} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Building size={48} color="#14406B" style={{ margin: '0 auto 16px' }} />
        <h2>Reserva no encontrada</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          No pudimos localizar la reserva solicitada o no tienes autorización para verla.
        </p>
        <Button variant="primary" onClick={() => navigate('/mis-reservas')}>
          Volver a Mis Reservas
        </Button>
      </div>
    );
  }

  const now = new Date();
  const isCancelled = reserva.estadoId === 'EST-003' || reserva.estadoNombre?.toLowerCase().includes('cancel');
  const checkInHora = formatHoraHHMM(reserva.horaCheckIn, '14:00');
  const checkOutHora = formatHoraHHMM(reserva.horaCheckOut, '11:00');
  const dOut = new Date(`${String(reserva.fechaSalida).split('T')[0]}T${checkOutHora}:00-05:00`);
  const isPast =
    !isCancelled &&
    (Boolean(reserva.checkoutRealizado) ||
      reserva.estadoId === 'EST-004' ||
      reserva.estadoId === 'EST-005' ||
      dOut < now);
  const isCheckedIn =
    !isPast &&
    (Boolean(reserva.checkinRealizado) ||
      reserva.estadoNombre?.toUpperCase().includes('CHECKED_IN') ||
      reserva.estadoId === 'EST-002');

  const checkinClean = String(reserva.fechaEntrada).split('T')[0] || '';
  const checkoutClean = String(reserva.fechaSalida).split('T')[0] || '';
  const code = reserva.ordenId || reserva.id;

  const handleDownloadICS = () => {
    descargarICS({
      codigoReserva: code,
      hotelNombre: reserva.alojamientoNombre,
      ciudad: 'Ecuador',
      checkinFecha: checkinClean,
      checkoutFecha: checkoutClean,
      horaCheckIn: checkInHora,
      horaCheckOut: checkOutHora,
      huespedNombre: currentUser.nombre,
      total: Number(reserva.precioTotal),
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleModalSuccess = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['misReservas'] });
    queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
    queryClient.invalidateQueries({ queryKey: ['hotelDetail'] });
    queryClient.invalidateQueries({ queryKey: ['reservasActivasPublicas'] });
  };

  return (
    <div className={`container ${styles.detailContainer}`}>
      {/* Retorno */}
      <Link to="/mis-reservas" className={styles.backLink}>
        <ArrowLeft size={16} />
        <span>Volver al listado de reservas</span>
      </Link>

      {/* Cabecera */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.bookingTitle}>{reserva.alojamientoNombre}</h1>
          <span className={styles.bookingCode}>Localizador: {code}</span>
        </div>
        <div>
          <Badge variant={isCancelled ? 'error' : isPast ? 'neutral' : 'success'}>
            {reserva.estadoNombre || (isCancelled ? 'Cancelada' : 'Confirmada')}
          </Badge>
        </div>
      </div>

      {/* Timeline de Estados */}
      <div className={styles.timelineContainer}>
        <div className={styles.timelineHeading}>Estado del Ciclo de Reserva</div>
        <div className={styles.timelineSteps}>
          {isCancelled ? (
            <div className={styles.timelineStep}>
              <div className={`${styles.stepIconNode} ${styles.stepIconNodeCancelled}`}>
                <XCircle size={20} />
              </div>
              <span className={styles.stepTextActive} style={{ color: 'var(--color-error)' }}>
                Cancelada
              </span>
            </div>
          ) : (
            <>
              {/* Confirmada */}
              <div className={styles.timelineStep}>
                <div className={`${styles.stepIconNode} ${styles.stepIconNodeCompleted}`}>
                  <CheckCircle2 size={20} />
                </div>
                <span className={styles.stepTextActive}>Confirmada</span>
              </div>

              <div className={`${styles.timelineLine} ${isCheckedIn || isPast ? styles.timelineLineFilled : ''}`} />

              {/* Checked-in */}
              <div className={styles.timelineStep}>
                <div
                  className={`${styles.stepIconNode} ${
                    isPast
                      ? styles.stepIconNodeCompleted
                      : isCheckedIn
                      ? styles.stepIconNodeActive
                      : ''
                  }`}
                >
                  <Hotel size={20} />
                </div>
                <span className={isCheckedIn ? styles.stepTextActive : styles.stepText}>
                  Check-in ({checkInHora})
                </span>
              </div>

              <div className={`${styles.timelineLine} ${isPast ? styles.timelineLineFilled : ''}`} />

              {/* Checked-out / Finalizada */}
              <div className={styles.timelineStep}>
                <div className={`${styles.stepIconNode} ${isPast ? styles.stepIconNodeCompleted : ''}`}>
                  <Clock size={20} />
                </div>
                <span className={isPast ? styles.stepTextActive : styles.stepText}>
                  Check-out ({checkOutHora})
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grilla Principal */}
      <div className={styles.mainGrid}>
        {/* Columna Izquierda: Información de Estadía y Factura */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
          {/* Tarjeta de Estadía */}
          <div className={styles.cardBox}>
            <h2 className={styles.cardBoxTitle}>
              <Hotel size={20} color="#14406B" />
              <span>Información del Hospedaje</span>
            </h2>

            <img
              src={reserva.imagenUrl || DEFAULT_HOTEL_IMG}
              alt={reserva.alojamientoNombre}
              style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }}
            />

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Habitación asignada</span>
              <span className={styles.infoValue}>{reserva.habitacionNombre}</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Ubicación del Hotel</span>
              <span className={styles.infoValue} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} color="#14406B" />
                <span>
                  {reserva.alojamientoDireccion
                    ? `${reserva.alojamientoDireccion}${reserva.alojamientoDestino ? ` · ${reserva.alojamientoDestino}` : ''}`
                    : reserva.alojamientoDestino || 'Ecuador'}
                </span>
              </span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Fecha de Entrada (Check-in)</span>
              <span className={styles.infoValue}>{checkinClean} (desde las {checkInHora})</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Fecha de Salida (Check-out)</span>
              <span className={styles.infoValue}>{checkoutClean} (hasta las {checkOutHora})</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Número de Personas</span>
              <span className={styles.infoValue}>
                {reserva.huespedesReales ?? reserva.numeroPersonas} huésped{(reserva.huespedesReales ?? reserva.numeroPersonas) > 1 ? 'es' : ''}
              </span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Estado del Contrato Digital</span>
              <span className={styles.infoValue}>
                {reserva.contratoFirmado ? (
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Firmado</span>
                ) : (
                  <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>Pendiente de Firma</span>
                )}
              </span>
            </div>

            {/* Mapa Interactivo con la ubicación actualizada del hotel */}
            {(() => {
              const mapCoords = resolveMapCoords(
                reserva.alojamientoLatitud,
                reserva.alojamientoLongitud,
                reserva.alojamientoDestino || 'Quito',
              );
              return (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F1E33', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={15} color="#14406B" /> Mapa de Ubicación del Alojamiento
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: '#14406B', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Abrir en Google Maps
                    </a>
                  </div>
                  <InteractiveMap
                    lat={mapCoords.lat}
                    lng={mapCoords.lng}
                    zoom={mapCoords.zoom}
                    height={210}
                    editable={false}
                    isApproximate={mapCoords.isApproximate}
                    markerTitle={reserva.alojamientoNombre}
                    markerSubtitle={reserva.alojamientoDireccion || `${reserva.alojamientoDestino || 'Ecuador'}`}
                  />
                </div>
              );
            })()}
          </div>

          {/* Tarjeta de Factura SRI */}
          <div className={styles.cardBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <h2 className={styles.cardBoxTitle} style={{ margin: 0 }}>
                <FileText size={20} color="#14406B" />
                <span>Factura Electrónica y Desglose SRI</span>
              </h2>
              <Button
                variant="gold"
                size="sm"
                icon={<FileText size={15} />}
                onClick={() => setShowInvoiceModal(true)}
              >
                Ver / Imprimir Factura SRI
              </Button>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>N° de Factura / Autorización SRI</span>
              <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {reserva.numeroFactura || `001-002-${String(reserva.id || '').replace(/\D/g, '').padStart(9, '0').slice(-9)}`}
              </span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Cliente / Razón Social</span>
              <span className={styles.infoValue}>
                {reserva.facturaRazonSocial || reserva.clienteNombre || currentUser.nombre} ({reserva.facturaIdentificacion || reserva.clienteIdentificacion || '9999999999999'})
              </span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Subtotal Gravado (Hospedaje y Consumos)</span>
              <span className={styles.infoValue}>{formatUSD(Number(reserva.subtotal ?? Number(reserva.precioTotal) / 1.18))}</span>
            </div>

            {Number(reserva.cargosAdicionalesTotal || 0) > 0 && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Cargos Extras en Recepción (incluidos en subtotal)</span>
                <span className={styles.infoValue} style={{ color: '#B45309', fontWeight: 600 }}>
                  +{formatUSD(Number(reserva.cargosAdicionalesTotal))}
                </span>
              </div>
            )}

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>IVA Ecuador (15%)</span>
              <span className={styles.infoValue}>{formatUSD(Number(reserva.iva || 0))}</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Tasa Municipal de Turismo</span>
              <span className={styles.infoValue}>{formatUSD(Number(reserva.tasaMunicipal || 0))}</span>
            </div>

            <div className={styles.infoRow} style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '10px', marginTop: '6px' }}>
              <span className={styles.infoLabel} style={{ fontWeight: 700, color: 'var(--color-midnight-blue)' }}>
                Total Facturado
              </span>
              <span className={styles.infoValue} style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-pacific-blue)', fontWeight: 800 }}>
                {formatUSD(Number(reserva.precioTotal))} USD
              </span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Acciones */}
        <div className={styles.actionsCard}>
          <div className={styles.cardBox}>
            <h3 className={styles.cardBoxTitle}>Acciones de la Reserva</h3>

            <Button
              variant="gold"
              icon={<FileText size={16} />}
              fullWidth
              onClick={() => setShowInvoiceModal(true)}
            >
              Ver Factura Electrónica SRI
            </Button>

            {!reserva.contratoFirmado && !isCancelled && (
              <Button
                variant="primary"
                icon={<FileCheck size={16} />}
                fullWidth
                onClick={() => setShowContractModal(true)}
              >
                Firmar Contrato Digital
              </Button>
            )}

            <Button
              variant="secondary"
              icon={<Calendar size={16} />}
              fullWidth
              onClick={handleDownloadICS}
            >
              Descargar Calendario (.ics)
            </Button>

            <Button
              variant="secondary"
              icon={<Printer size={16} />}
              fullWidth
              onClick={handlePrint}
            >
              Imprimir Comprobante
            </Button>

            {isPast && !reserva.calificacion && (
              <Button
                variant="primary"
                icon={<Star size={16} />}
                fullWidth
                onClick={() => setShowReviewModal(true)}
              >
                Calificar Estadía
              </Button>
            )}

            {!isPast && !isCancelled && (
              <Button
                variant="danger"
                icon={<XCircle size={16} />}
                fullWidth
                onClick={() => setShowCancelModal(true)}
              >
                Cancelar Reserva
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {showContractModal && (
        <ContractModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          reservaId={reserva.id}
          hotelNombre={reserva.alojamientoNombre}
          horaCheckIn={checkInHora}
          horaCheckOut={checkOutHora}
          onSuccess={handleModalSuccess}
        />
      )}

      {showReviewModal && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          reservaId={reserva.id}
          hotelNombre={reserva.alojamientoNombre}
          onSuccess={handleModalSuccess}
        />
      )}

      {showCancelModal && (
        <CancelModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          reservaId={reserva.id}
          hotelNombre={reserva.alojamientoNombre}
          fechaEntrada={String(reserva.fechaEntrada)}
          horaCheckIn={checkInHora}
          precioTotal={Number(reserva.precioTotal)}
          onSuccess={handleModalSuccess}
        />
      )}

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        invoice={{
          numeroFactura: reserva.numeroFactura || `001-002-${String(reserva.id || '').replace(/\D/g, '').padStart(9, '0').slice(-9)}`,
          fechaEmision: reserva.facturaFechaEmision || reserva.fechaEntrada,
          razonSocial: reserva.facturaRazonSocial || reserva.clienteNombre || currentUser.nombre,
          identificacion: reserva.facturaIdentificacion || reserva.clienteIdentificacion || '9999999999999',
          clienteEmail: reserva.clienteEmail || currentUser.correo,
          direccionCliente: reserva.facturaDireccion || currentUser.direccion || reserva.alojamientoDireccion || 'Quito, Ecuador',
          alojamientoNombre: reserva.alojamientoNombre,
          alojamientoDireccion: reserva.alojamientoDireccion,
          alojamientoDestino: reserva.alojamientoDestino,
          habitacionNombre: reserva.habitacionNombre,
          fechaEntrada: reserva.fechaEntrada,
          fechaSalida: reserva.fechaSalida,
          huespedes: reserva.huespedesReales ?? reserva.numeroPersonas,
          metodoPago: reserva.metodoPago || 'Tarjeta de Crédito / Débito',
          estadoPago: reserva.estadoPago || 'Completado',
          subtotal: Number(reserva.subtotal ?? Number(reserva.precioTotal) / 1.18),
          iva: Number(reserva.iva ?? 0),
          tasaMunicipal: Number(reserva.tasaMunicipal ?? 0),
          total: Number(reserva.precioTotal || 0),
          extrasCargos: reserva.extrasCargos,
          cargosAdicionalesTotal: Number(reserva.cargosAdicionalesTotal || 0),
          ordenId: reserva.ordenId || reserva.id,
        }}
      />
    </div>
  );
};
