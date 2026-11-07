import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building, Sparkles } from 'lucide-react';
import { HeroSearch } from '../../components/catalog/HeroSearch/HeroSearch';
import { FilterBar, FilterState } from '../../components/catalog/FilterBar/FilterBar';
import { AlojamientoCard } from '../../components/catalog/AlojamientoCard/AlojamientoCard';
import { Pagination } from '../../components/catalog/Pagination/Pagination';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { Button } from '../../components/ui/Button/Button';
import { api } from '../../api/client';
import { AlojamientoItem, PaginationMetadata } from '../../api/types';
import styles from './CatalogPage.module.css';

interface AlojamientosApiResponse {
  data: AlojamientoItem[];
  metadata: PaginationMetadata;
}

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const ciudadParam = searchParams.get('ciudad') || '';
  const checkinParam = searchParams.get('checkin') || '';
  const checkoutParam = searchParams.get('checkout') || '';
  const adultsParam = parseInt(searchParams.get('adults') || '2', 10);
  const roomsParam = parseInt(searchParams.get('rooms') || '1', 10);
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [page, setPage] = useState(pageParam);
  const [filters, setFilters] = useState<FilterState>({
    estrellas: searchParams.get('estrellas')
      ? parseInt(searchParams.get('estrellas')!, 10)
      : undefined,
    minPrecio: searchParams.get('minPrecio')
      ? parseFloat(searchParams.get('minPrecio')!)
      : undefined,
    maxPrecio: searchParams.get('maxPrecio')
      ? parseFloat(searchParams.get('maxPrecio')!)
      : undefined,
    tipo: searchParams.get('tipo') || undefined,
  });

  // Query al catálogo paginado
  const { data, isLoading, isError, refetch } = useQuery<AlojamientosApiResponse>({
    queryKey: ['alojamientosCatalog', page, ciudadParam, filters],
    queryFn: () =>
      api.get<AlojamientosApiResponse>('/alojamientos', {
        params: {
          page,
          limit: 9,
          ciudad: ciudadParam || undefined,
          estrellas: filters.estrellas,
          minPrecio: filters.minPrecio,
          maxPrecio: filters.maxPrecio,
        },
      }),
  });

  const handleHeroSearch = (searchData: {
    ciudad: string;
    checkin: string;
    checkout: string;
    adults: number;
    rooms: number;
  }) => {
    setPage(1);
    const newParams = new URLSearchParams();
    if (searchData.ciudad) newParams.set('ciudad', searchData.ciudad);
    if (searchData.checkin) newParams.set('checkin', searchData.checkin);
    if (searchData.checkout) newParams.set('checkout', searchData.checkout);
    newParams.set('adults', String(searchData.adults));
    newParams.set('rooms', String(searchData.rooms));
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({});
    setPage(1);
    const newParams = new URLSearchParams();
    if (checkinParam) newParams.set('checkin', checkinParam);
    if (checkoutParam) newParams.set('checkout', checkoutParam);
    setSearchParams(newParams);
  };

  const items = data?.data || [];
  const metadata = data?.metadata;

  return (
    <div className={styles.catalogWrapper}>
      {/* 1. Hero con Buscador */}
      <HeroSearch
        initialCiudad={ciudadParam}
        initialCheckin={checkinParam}
        initialCheckout={checkoutParam}
        initialAdults={adultsParam}
        initialRooms={roomsParam}
        onSearch={handleHeroSearch}
      />

      {/* 2. Sección de Catálogo y Filtros */}
      <section className={`container ${styles.resultsSection}`}>
        {/* Barra de Filtros */}
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {/* Encabezado de Resultados */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {ciudadParam
              ? `Alojamientos en ${ciudadParam}`
              : 'Todos los Alojamientos en Ecuador'}
          </h2>
          {metadata && (
            <span className={styles.resultsBadge}>
              {metadata.total_results} opciones encontradas
            </span>
          )}
        </div>

        {/* Estados de Carga (Skeletons) */}
        {isLoading && (
          <div className={styles.cardsGrid}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                  padding: 'var(--space-4)',
                }}
              >
                <Skeleton width="100%" height={200} style={{ borderRadius: 'var(--radius-md)', marginBottom: '12px' }} />
                <Skeleton width="70%" height={20} style={{ marginBottom: '8px' }} />
                <Skeleton width="40%" height={14} style={{ marginBottom: '16px' }} />
                <Skeleton width="90%" height={12} style={{ marginBottom: '6px' }} />
                <Skeleton width="80%" height={12} style={{ marginBottom: '16px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Skeleton width="35%" height={24} />
                  <Skeleton width="40%" height={36} style={{ borderRadius: 'var(--radius-md)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Building size={32} />
            </div>
            <h3 className={styles.emptyTitle}>Error al consultar el catálogo</h3>
            <p className={styles.emptyDesc}>
              No se pudo conectar con el servicio de catálogo. Verifica la conexión o reintenta.
            </p>
            <Button variant="primary" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {/* Resultados Reales */}
        {!isLoading && !isError && items.length > 0 && (
          <>
            <div className={styles.cardsGrid}>
              {items.map((hotel) => (
                <AlojamientoCard
                  key={hotel.id}
                  alojamiento={hotel}
                  searchDates={{
                    checkin: checkinParam,
                    checkout: checkoutParam,
                  }}
                />
              ))}
            </div>

            {/* Paginación */}
            {metadata && (
              <Pagination
                metadata={metadata}
                onPageChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}

        {/* Estado Vacío Cuidado */}
        {!isLoading && !isError && items.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Building size={32} />
            </div>
            <h3 className={styles.emptyTitle}>No encontramos alojamientos</h3>
            <p className={styles.emptyDesc}>
              {ciudadParam
                ? `No hay propiedades disponibles con los filtros aplicados en ${ciudadParam}. Intenta ajustar tus criterios de búsqueda o explorar otros destinos.`
                : 'No se encontraron resultados para los filtros seleccionados. Prueba ampliando el rango de precio o eliminando filtros.'}
            </p>
            <Button variant="gold" icon={<Sparkles size={16} />} onClick={handleResetFilters}>
              Ver todos los alojamientos
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

