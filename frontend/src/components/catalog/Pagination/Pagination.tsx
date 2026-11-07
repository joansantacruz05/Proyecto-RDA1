import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaginationMetadata } from '../../../api/types';
import styles from './Pagination.module.css';

interface PaginationProps {
  metadata: PaginationMetadata;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  metadata,
  onPageChange,
}) => {
  const { page, total_pages, total_results, limit } = metadata;

  if (total_pages <= 1) {
    return (
      <div className={styles.paginationContainer}>
        <span className={styles.resultsCount}>
          Mostrando <span className={styles.resultsBold}>{total_results}</span> alojamientos disponibles
        </span>
      </div>
    );
  }

  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total_results);

  return (
    <nav className={styles.paginationContainer} aria-label="Navegación de páginas">
      <span className={styles.resultsCount}>
        Mostrando <span className={styles.resultsBold}>{startIdx}</span> -{' '}
        <span className={styles.resultsBold}>{endIdx}</span> de{' '}
        <span className={styles.resultsBold}>{total_results}</span> alojamientos
      </span>

      <div className={styles.controlsGroup}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        {Array.from({ length: total_pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            className={[styles.pageNumber, p === page ? styles.pageNumberActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className={styles.navBtn}
          onClick={() => onPageChange(page + 1)}
          disabled={!metadata.has_next}
          aria-label="Página siguiente"
        >
          <span>Siguiente</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
};

