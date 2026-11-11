import React, { useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Building, Sparkles, AlertCircle } from 'lucide-react';
import { HotelGallery } from '../../components/detail/HotelGallery/HotelGallery';
import { StickyBookingCard } from '../../components/detail/StickyBookingCard/StickyBookingCard';
import { RoomCard } from '../../components/detail/RoomCard/RoomCard';
import { CancellationTimeline } from '../../components/detail/CancellationTimeline/CancellationTimeline';
import { ReviewsSection } from '../../components/detail/ReviewsSection/ReviewsSection';
import { RatingStars } from '../../components/ui/RatingStars/RatingStars';
import { Badge } from '../../components/ui/Badge/Badge';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { Button } from '../../components/ui/Button/Button';
import { api } from '../../api/client';
import { AlojamientoDetalle, HabitacionDetalle } from '../../api/types';
import { checkIsAlojamientoReserved, isAlojamientoInCleaning, ReservaItemLike } from '../../utils/accommodationStatus';
import { InteractiveMap } from '../../components/map/InteractiveMap';
import {
  buildGoogleMapsUrl,
  formatHoraHHMM,
  hasValidCoordinates,
  resolveMapCoords,
} from '../../utils/ecuadorLocations';
import styles from './HotelDetailPage.module.css';

export const HotelDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const checkinParam = searchParams.get('checkin') || undefined;
  const checkoutParam = searchParams.get('checkout') || undefined;
  const adultsParam = searchParams.get('adults') ? parseInt(searchParams.get('adults')!, 10) : 2;
  const roomsParam = searchParams.get('rooms') ? parseInt(searchParams.get('rooms')!, 10) : 1;

  const [selectedHabitacion, setSelectedHabitacion] = useState<HabitacionDetalle | null>(null);

  // 1. Detalle del Alojamiento
  const {
    data: hotel,
    isLoading: isHotelLoading,
    isError: isHotelError,
  } = useQuery<AlojamientoDetalle>({
    queryKey: ['hotelDetail', id],
    queryFn: () => api.get<AlojamientoDetalle>(`/alojamientos/${id}`),
    enabled: Boolean(id),
  });

  // 2. Habitaciones del Alojamiento
  const { data: rooms = [], isLoading: isRoomsLoading } = useQuery<HabitacionDetalle[]>({
    queryKey: ['hotelRooms', id],
    queryFn: () => api.get<HabitacionDetalle[]>(`/alojamientos/${id}/habitaciones`),
    enabled: Boolean(id),
  });

  // 3. Reservas Activas (cruce con Azure para detectar si ya está reservado)
  const { data: activeReservas = [] } = useQuery<ReservaItemLike[]>({
    queryKey: ['reservasActivasPublicas'],
    queryFn: () => api.get<ReservaItemLike[]>('/reservas'),
    staleTime: 5000,
  });

  const hotelRooms = rooms.length > 0 ? rooms : hotel?.habitaciones || [];

  if (isHotelLoading) {
    return (
      <div className={`container ${styles.detailContainer}`}>
        <Skeleton width={180} height={24} style={{ marginBottom: '16px' }} />
        <Skeleton width="60%" height={40} style={{ marginBottom: '8px' }} />
        <Skeleton width="40%" height={20} style={{ marginBottom: '24px' }} />
        <Skeleton width="100%" height={420} style={{ borderRadius: 'var(--radius-xl)', marginBottom: '32px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Skeleton width="100%" height={160} style={{ borderRadius: 'var(--radius-lg)' }} />
            <Skeleton width="100%" height={200} style={{ borderRadius: 'var(--radius-lg)' }} />
          </div>
          <Skeleton width="100%" height={400} style={{ borderRadius: 'var(--radius-xl)' }} />
        </div>
      </div>
    );
  }

  if (isHotelError || !hotel) {
    return (
      <div className={`container ${styles.detailContainer}`} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Building size={48} color="#14406B" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '12px' }}>Alojamiento no encontrado</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          No se pudo encontrar la propiedad solicitada en el catálogo. Puede que el enlace esté desactualizado.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Volver al catálogo
        </Button>
      </div>
    );
  }

  const destination = typeof hotel.destino === 'string'
    ? hotel.destino
    : typeof hotel.ciudad === 'string'
    ? hotel.ciudad
    : (hotel.ciudad as { nombre?: string } | undefined)?.nombre || 'Ecuador';
  const defaultPrice = hotelRooms[0]?.precioPorNoche
    ? Number(hotelRooms[0].precioPorNoche)
    : 120;
  const isHotelCleaning = isAlojamientoInCleaning({
    alojamientoId: hotel.id,
    alojamientoNombre: hotel.nombre,
    estado: hotel.estado,
  });

  const isHotelReserved = checkIsAlojamientoReserved({
    alojamientoId: hotel.id,
    alojamientoNombre: hotel.nombre,
    alojamientoCodigo: hotel.codigo,
    estaReservadoApi: hotel.estaReservado,
    estado: hotel.estado,
    activeReservas,
    checkDates: checkinParam && checkoutParam ? { checkin: checkinParam, checkout: checkoutParam } : undefined,
  });

  return (
    <div className={`container ${styles.detailContainer}`}>
      {/* Enlace de regreso */}
      <Link to="/" className={styles.backLink}>
        <ArrowLeft size={16} />
        <span>Volver a todos los alojamientos</span>
      </Link>

      {/* Alerta de Limpieza o Alojamiento Reservado */}
      {isHotelCleaning ? (
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#92400E',
          }}
        >
          <Sparkles size={22} color="#D97706" />
          <div>
            <strong style={{ fontSize: '15px' }}>En Proceso de Limpieza y Acondicionamiento</strong>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#B45309' }}>
              Este alojamiento concluyó su último check-out y está siendo preparado por nuestro equipo de limpieza antes de volver a estar en línea.
            </p>
          </div>
        </div>
      ) : isHotelReserved ? (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#991B1B',
          }}
        >
          <AlertCircle size={22} color="#DC2626" />
          <div>
            <strong style={{ fontSize: '15px' }}>Propiedad Reservada</strong>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#B91C1C' }}>
              Este alojamiento ya cuenta con una reserva activa confirmada y no se encuentra disponible para nuevas fechas inmediatas.
            </p>
          </div>
        </div>
      ) : null}

      {/* Cabecera del Alojamiento */}
      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.hotelTitle}>{hotel.nombre}</h1>
            <div style={{ marginTop: 'var(--space-2)' }}>
              <RatingStars rating={hotel.estrellas || 5} size={18} reviewsCount={24} />
            </div>
          </div>
          <Badge variant="gold" icon={<Sparkles size={14} />}>
            Colección LuxeStays
          </Badge>
        </div>

        <div className={styles.addressRow}>
          <MapPin size={15} color="#C9A227" />
          <span>{hotel.direccion || `Centro y zona turística de ${destination}, Ecuador`}</span>
          <a
            href={buildGoogleMapsUrl({
              lat: hotel.latitud,
              lng: hotel.longitud,
              nombre: hotel.nombre,
              direccion: hotel.direccion,
              destino: destination,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mapLink}
          >
            Ver en mapa
          </a>
        </div>
      </div>

      {/* Galería Principal */}
      <HotelGallery mainImage={hotel.imagenUrl} hotelName={hotel.nombre} />

      {/* Grid Principal: Contenido a la Izquierda, Tarjeta Fija a la Derecha */}
      <div className={styles.mainLayoutGrid}>
        {/* Columna Izquierda */}
        <div className={styles.leftColumn}>
          {/* Descripción de la Propiedad */}
          <div className={styles.descriptionBox}>
            <h3 className={styles.subHeading}>Sobre esta estancia</h3>
            <p>
              {hotel.descripcion ||
                `${hotel.nombre} ofrece una atmósfera inigualable en ${destination}. Sus instalaciones combinan la calidez del servicio ecuatoriano con amenidades de nivel internacional, diseñadas tanto para el descanso placentero como para estadías ejecutivas de primer orden.`}
            </p>
          </div>

          {/* Sección de Habitaciones y Espacios Rentables */}
          <div>
            <h3 className={styles.subHeading}>Habitaciones Disponibles</h3>
            {isRoomsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Skeleton width="100%" height={120} style={{ borderRadius: 'var(--radius-lg)' }} />
                <Skeleton width="100%" height={120} style={{ borderRadius: 'var(--radius-lg)' }} />
              </div>
            ) : hotelRooms.length > 0 ? (
              <div className={styles.roomsList}>
                {hotelRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    habitacion={room}
                    isSelected={selectedHabitacion?.id === room.id}
                    isHotelReserved={isHotelReserved}
                    isHotelCleaning={isHotelCleaning}
                    onSelect={(hab) => setSelectedHabitacion(hab)}
                  />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>
                No hay habitaciones registradas para esta propiedad en este momento.
              </p>
            )}
          </div>

          {/* Ubicación interactiva en mapa */}
          {(() => {
            const mapCoords = resolveMapCoords(hotel.latitud, hotel.longitud, destination);
            const googleMapsHref = buildGoogleMapsUrl({
              lat: hotel.latitud,
              lng: hotel.longitud,
              nombre: hotel.nombre,
              direccion: hotel.direccion,
              destino: destination,
            });
            const hasExactCoords = hasValidCoordinates(hotel.latitud, hotel.longitud);
            return (
              <div className={styles.mapSectionBox}>
                <div className={styles.mapSectionHeader}>
                  <div>
                    <h3 className={styles.subHeading} style={{ marginBottom: '4px' }}>
                      Ubicación en el Mapa
                    </h3>
                    <p className={styles.mapAddressText}>
                      <MapPin size={14} color="#C9A227" />
                      <span>
                        {hotel.direccion || `Zona turística de ${destination}, Ecuador`}
                        {hasExactCoords && (
                          <span className={styles.coordsTag}>
                            {' '}· ({Number(hotel.latitud).toFixed(5)}, {Number(hotel.longitud).toFixed(5)})
                          </span>
                        )}
                      </span>
                    </p>
                  </div>
                  <a
                    href={googleMapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.mapExternalBtn}
                  >
                    Abrir en Google Maps
                  </a>
                </div>
                <InteractiveMap
                  lat={mapCoords.lat}
                  lng={mapCoords.lng}
                  zoom={mapCoords.zoom}
                  height={290}
                  editable={false}
                  isApproximate={mapCoords.isApproximate}
                  markerTitle={hotel.nombre}
                  markerSubtitle={hotel.direccion || `${destination}, Ecuador`}
                />
              </div>
            );
          })()}

          {/* Línea de Tiempo de Política de Cancelación */}
          <CancellationTimeline
            checkinHour={formatHoraHHMM(hotel.horaCheckIn, '14:00')}
            checkoutHour={formatHoraHHMM(hotel.horaCheckOut, '11:00')}
          />

          {/* Sección de Reseñas Verificadas */}
          <ReviewsSection alojamientoId={id!} />
        </div>

        {/* Columna Derecha: Tarjeta Fija de Reserva */}
        <aside className={styles.rightColumn}>
          <StickyBookingCard
            alojamientoId={id!}
            defaultPrice={defaultPrice}
            initialCheckin={checkinParam}
            initialCheckout={checkoutParam}
            initialAdults={adultsParam}
            initialRooms={roomsParam}
            selectedRoomId={selectedHabitacion?.id}
            selectedRoomCode={selectedHabitacion?.codigo}
            isHotelReserved={isHotelReserved}
          />
        </aside>
      </div>
    </div>
  );
};

