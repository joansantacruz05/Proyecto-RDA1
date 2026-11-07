import React from 'react';
import { SlidersHorizontal, RotateCcw, Star } from 'lucide-react';
import { Button } from '../../ui/Button/Button';
import styles from './FilterBar.module.css';

export interface FilterState {
  estrellas?: number | undefined;
  minPrecio?: number | undefined;
  maxPrecio?: number | undefined;
  tipo?: string | undefined;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
}

const TIPOS_ALOJAMIENTO = [
  'Todos',
  'Hotel',
  'Resort',
  'Hotel Boutique',
  'Hostería',
  'Cabaña',
  'Lodge',
  'Departamento',
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  const hasActiveFilters = Boolean(
    filters.estrellas ||
      filters.minPrecio ||
      filters.maxPrecio ||
      (filters.tipo && filters.tipo !== 'Todos'),
  );

  return (
    <div className={styles.filterContainer}>
      <div className={styles.topRow}>
        <div className={styles.filterHeading}>
          <SlidersHorizontal size={18} color="#14406B" />
          <span>Filtros de Búsqueda</span>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={onReset}>
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className={styles.filterGrid}>
        {/* Rango de Precios */}
        <div className={styles.filterGroup}>
          <span className={styles.groupLabel}>Rango de Precio por Noche (USD)</span>
          <div className={styles.priceInputs}>
            <input
              type="number"
              placeholder="Mín ($)"
              value={filters.minPrecio ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minPrecio: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className={styles.priceInput}
              min={0}
            />
            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
            <input
              type="number"
              placeholder="Máx ($)"
              value={filters.maxPrecio ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  maxPrecio: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className={styles.priceInput}
              min={0}
            />
          </div>
        </div>

        {/* Categoría por Estrellas */}
        <div className={styles.filterGroup}>
          <span className={styles.groupLabel}>Categoría</span>
          <div className={styles.starsRow}>
            {[5, 4, 3].map((starCount) => (
              <button
                key={starCount}
                type="button"
                className={[
                  styles.starBtn,
                  filters.estrellas === starCount ? styles.starBtnActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() =>
                  onChange({
                    ...filters,
                    estrellas: filters.estrellas === starCount ? undefined : starCount,
                  })
                }
              >
                <Star size={13} fill="#C9A227" stroke="#C9A227" />
                <span>{starCount}★</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tipo de Propiedad */}
        <div className={styles.filterGroup}>
          <span className={styles.groupLabel}>Tipo de Propiedad</span>
          <div className={styles.chipsWrapper}>
            {TIPOS_ALOJAMIENTO.slice(0, 5).map((tipo) => {
              const isSelected =
                (tipo === 'Todos' && !filters.tipo) || filters.tipo === tipo;
              return (
                <button
                  key={tipo}
                  type="button"
                  className={[styles.chip, isSelected ? styles.chipActive : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() =>
                    onChange({
                      ...filters,
                      tipo: tipo === 'Todos' ? undefined : tipo,
                    })
                  }
                >
                  {tipo}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

