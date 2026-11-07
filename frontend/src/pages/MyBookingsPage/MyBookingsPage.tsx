import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  User,
  FileCheck,
  Star,
  XCircle,
  Building,
  LogIn,
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
import styles from './MyBookingsPage.module.css';

interface MyBookingsPageProps {
  currentUser: UsuarioSession | null;
}

const DEFAULT_HOTEL_IMG = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = getAuthToken();

  const [activeTab, setActiveTab] = useState<'proximas' | 'pasadas' | 'canceladas'>('proximas');

  // Estados de modales interactivos
  const [contractReserva, setContractReserva] = useState<ReservaUsuarioItem | null>(null);
  const [reviewReserva, setReviewReserva] = useState<ReservaUsuarioItem | null>(null);
  const [cancelReserva, setCancelReserva] = useState<ReservaUsuarioItem | null>(null);

  // Consulta de reservas del usuario
  const {
    data: reservas = [],
    isLoading,
    refetch,
  } = useQuery<ReservaUsuarioItem[]>({
    queryKey: ['misReservas', currentUser?.id],
    queryFn: () => api.get<ReservaUsuarioItem[]>('/reservas/mias'),
    enabled: Boolean(token && currentUser),
  });

  if (!token || !currentUser) {
    return (
      <div className={`container ${styles.pageContainer}`}>
        <div className={styles.emptyState}>
          <Building size={48} color="#14406B" style={{ margin: '0 auto 16px' }} />
          <h2 className={styles.emptyTitle}>Inicia sesión para ver tus reservas</h2>
          <p className={styles.emptyText}>
            Debes acceder con tu cuenta de LuxeStays para consultar tus estadías, descargar contratos y facturas.
          </p>
          <Button
            variant="gold"
            icon={<LogIn size={16} />}
            onClick={() => navigate('/login?returnUrl=/mis-reservas')}
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  const now = new Date();

  // Filtrado de reservas por pestaña
  const canceladas = reservas.filter((r) => r.estadoId === 'EST-003' || r.estadoNombre?.toLowerCase().includes('cancel'));
  const noCanceladas = reservas.filter((r) => r.estadoId !== 'EST-003' && !r.estadoNombre?.toLowerCase().includes('cancel'));

  const proximas = noCanceladas.filter((r) => {
    const dOut = new Date(`${String(r.fechaSalida).split('T')[0]}T11:00:00-05:00`);
    return dOut >= now;
  });

  const pasadas = noCanceladas.filter((r) => {
    const dOut = new Date(`${String(r.fechaSalida).split('T')[0]}T11:00:00-05:00`);
    return dOut < now;
  });

  let currentList: ReservaUsuarioItem[] = [];
  if (activeTab === 'proximas') currentList = proximas;
  else if (activeTab === 'pasadas') currentList = pasadas;
  else currentList = canceladas;

  const handleModalSuccess = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['misReservas'] });
  };

  return (
    <div className={`container ${styles.pageContainer}`}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Mis Reservas de Alojamiento</h1>
        <p className={styles.pageSubtitle}>
          Administra tus estadías en Ecuador, firma contratos digitales, califica alojamientos y descarga tus facturas SRI.
        </p>
      </div>

      {/* Pestañas de Navegación */}
      <div className={styles.tabsRow} role="tablist">
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'proximas' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('proximas')}
          role="tab"
          aria-selected={activeTab === 'proximas'}
        >
          <span>Próximas y en Curso</span>
          <span className={styles.tabCount}>{proximas.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'pasadas' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('pasadas')}
          role="tab"
          aria-selected={activeTab === 'pasadas'}
        >
          <span>Estadías Pasadas</span>
          <span className={styles.tabCount}>{pasadas.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'canceladas' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('canceladas')}
          role="tab"
          aria-selected={activeTab === 'canceladas'}
        >
          <span>Canceladas</span>
          <span className={styles.tabCount}>{canceladas.length}</span>
        </button>
      </div>

      {/* Listado de Reservas */}
      {isLoading ? (
        <div className={styles.bookingsList}>
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} width="100%" height={160} style={{ borderRadius: 'var(--radius-xl)' }} />
          ))}
        </div>
      ) : currentList.length === 0 ? (
        <div className={styles.emptyState}>
          <Calendar size={40} color="#14406B" style={{ margin: '0 auto 12px' }} />
          <h3 className={styles.emptyTitle}>
            {activeTab === 'proximas'
              ? 'No tienes viajes próximos programados'
              : activeTab === 'pasadas'
              ? 'Aún no registras estadías anteriores'
              : 'No cuentas con reservas canceladas'}
          </h3>
          <p className={styles.emptyText}>
            Encuentra villas, suites y hoteles boutique con hospitalidad de primer nivel en todo el Ecuador.
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>
            Explorar Alojamientos
          </Button>
        </div>
      ) : (
        <div className={styles.bookingsList}>
          {currentList.map((reserva) => {
            const isCancelled = reserva.estadoId === 'EST-003' || reserva.estadoNombre?.toLowerCase().includes('cancel');
            const dOut = new Date(`${String(reserva.fechaSalida).split('T')[0]}T11:00:00-05:00`);
            const isPast = dOut < now && !isCancelled;
            const canReview = isPast && !reserva.calificacion;
            const canSign = !reserva.contratoFirmado && !isCancelled;
            const canCancel = !isPast && !isCancelled;

            const checkinClean = String(reserva.fechaEntrada).split('T')[0] || '';
            const checkoutClean = String(reserva.fechaSalida).split('T')[0] || '';
            const code = reserva.ordenId || reserva.id;

            return (
              <div key={reserva.id} className={styles.bookingCard}>
                {/* Imagen del Hotel */}
                <img
                  src={reserva.imagenUrl || DEFAULT_HOTEL_IMG}
                  alt={reserva.alojamientoNombre}
                  className={styles.cardImage}
                  loading="lazy"
                />

                {/* Detalles del Hospedaje */}
                <div className={styles.cardDetails}>
                  <div className={styles.hotelTitleRow}>
                    <Link to={`/alojamiento/${reserva.alojamientoId}`} className={styles.hotelName}>
                      {reserva.alojamientoNombre}
                    </Link>
                    <Badge variant={isCancelled ? 'error' : isPast ? 'neutral' : 'success'}>
                      {reserva.estadoNombre || (isCancelled ? 'Cancelada' : 'Confirmada')}
                    </Badge>
                    {reserva.contratoFirmado ? (
                      <Badge variant="success">Contrato Firmado</Badge>
                    ) : !isCancelled ? (
                      <Badge variant="gold">Firma Pendiente</Badge>
                    ) : null}
                  </div>

                  <div className={styles.infoMeta}>
                    <div className={styles.metaItem}>
                      <span style={{ fontWeight: 600 }}>Habitación:</span>
                      <span>{reserva.habitacionNombre}</span>
                    </div>

                    <div className={styles.metaItem}>
                      <Clock size={13} color="#14406B" />
                      <span>
                        {checkinClean} (14:00) a {checkoutClean} (11:00)
                      </span>
                    </div>

                    <div className={styles.metaItem}>
                      <User size={13} color="#14406B" />
                      <span>{reserva.numeroPersonas} huésped{reserva.numeroPersonas > 1 ? 'es' : ''}</span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.codePill}>{code}</span>
                    </div>
                  </div>

                  {/* Detalle de Factura SRI si existe */}
                  {reserva.numeroFactura && (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      🧾 <strong>Factura SRI:</strong> {reserva.numeroFactura}
                    </div>
                  )}

                  {/* Reseña previa si ya calificó */}
                  {reserva.calificacion && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--color-gold)' }}>
                      <Star size={13} fill="currentColor" />
                      <span>Tu calificación: {reserva.calificacion}/5 estrellas</span>
                    </div>
                  )}
                </div>

                {/* Precio y Acciones */}
                <div className={styles.priceActionsCol}>
                  <div className={styles.totalPrice}>
                    {formatUSD(Number(reserva.precioTotal))}
                  </div>

                  <div className={styles.actionsButtons}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/mis-reservas/${reserva.id}`)}
                    >
                      Ver Detalle
                    </Button>

                    {canSign && (
                      <Button
                        variant="gold"
                        size="sm"
                        icon={<FileCheck size={14} />}
                        onClick={() => setContractReserva(reserva)}
                      >
                        Firmar Contrato
                      </Button>
                    )}

                    {canReview && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Star size={14} />}
                        onClick={() => setReviewReserva(reserva)}
                      >
                        Calificar Estancia
                      </Button>
                    )}

                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<XCircle size={14} color="#B42318" />}
                        onClick={() => setCancelReserva(reserva)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales Interactivos */}
      {contractReserva && (
        <ContractModal
          isOpen={Boolean(contractReserva)}
          onClose={() => setContractReserva(null)}
          reservaId={contractReserva.id}
          hotelNombre={contractReserva.alojamientoNombre}
          onSuccess={handleModalSuccess}
        />
      )}

      {reviewReserva && (
        <ReviewModal
          isOpen={Boolean(reviewReserva)}
          onClose={() => setReviewReserva(null)}
          reservaId={reviewReserva.id}
          hotelNombre={reviewReserva.alojamientoNombre}
          onSuccess={handleModalSuccess}
        />
      )}

      {cancelReserva && (
        <CancelModal
          isOpen={Boolean(cancelReserva)}
          onClose={() => setCancelReserva(null)}
          reservaId={cancelReserva.id}
          hotelNombre={cancelReserva.alojamientoNombre}
          fechaEntrada={String(cancelReserva.fechaEntrada)}
          precioTotal={Number(cancelReserva.precioTotal)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};
