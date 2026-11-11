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
} from 'lucide-react';
import { api, getAuthToken } from '../../api/client';
import { ReservaUsuarioItem, UsuarioSession } from '../../api/types';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { formatUSD } from '../../components/ui/PriceDisplay/PriceDisplay';
import { ContractModal } from '../../components/modals/ContractModal';
import { ReviewModal } from '../../components/modals/ReviewModal';
import { CancelModal } from '../../components/modals/CancelModal';
import { descargarICS } from '../../utils/calendarIcs';
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
  const dOut = new Date(`${String(reserva.fechaSalida).split('T')[0]}T11:00:00-05:00`);
  const isPast = dOut < now && !isCancelled;
  const isCheckedIn = reserva.estadoNombre?.toUpperCase().includes('CHECKED_IN') || reserva.estadoId === 'EST-002';

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
                  Check-in (11:00)
                </span>
              </div>

              <div className={`${styles.timelineLine} ${isPast ? styles.timelineLineFilled : ''}`} />

              {/* Checked-out / Finalizada */}
              <div className={styles.timelineStep}>
                <div className={`${styles.stepIconNode} ${isPast ? styles.stepIconNodeCompleted : ''}`}>
                  <Clock size={20} />
                </div>
                <span className={isPast ? styles.stepTextActive : styles.stepText}>
                  Check-out (15:00)
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
              <span className={styles.infoLabel}>Fecha de Entrada (Check-in)</span>
              <span className={styles.infoValue}>{checkinClean} (desde las 11:00)</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Fecha de Salida (Check-out)</span>
              <span className={styles.infoValue}>{checkoutClean} (hasta las 15:00)</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Número de Personas</span>
              <span className={styles.infoValue}>
                {reserva.numeroPersonas} huésped{reserva.numeroPersonas > 1 ? 'es' : ''}
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
          </div>

          {/* Tarjeta de Factura SRI */}
          <div className={styles.cardBox}>
            <h2 className={styles.cardBoxTitle}>
              <FileText size={20} color="#14406B" />
              <span>Factura Electrónica y Desglose SRI</span>
            </h2>

            {reserva.numeroFactura ? (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>N° de Autorización SRI</span>
                  <span className={styles.infoValue}>{reserva.numeroFactura}</span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Subtotal Hospedaje</span>
                  <span className={styles.infoValue}>{formatUSD(Number(reserva.subtotal || reserva.precioTotal))}</span>
                </div>

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
                    Total Pagado
                  </span>
                  <span className={styles.infoValue} style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-pacific-blue)' }}>
                    {formatUSD(Number(reserva.precioTotal))} USD
                  </span>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                Esta reserva tiene un pago de {formatUSD(Number(reserva.precioTotal))} USD registrado.
              </p>
            )}
          </div>
        </div>

        {/* Columna Derecha: Acciones */}
        <div className={styles.actionsCard}>
          <div className={styles.cardBox}>
            <h3 className={styles.cardBoxTitle}>Acciones de la Reserva</h3>

            {!reserva.contratoFirmado && !isCancelled && (
              <Button
                variant="gold"
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
          precioTotal={Number(reserva.precioTotal)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};
