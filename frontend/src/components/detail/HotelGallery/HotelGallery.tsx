import React, { useState } from 'react';
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './HotelGallery.module.css';

interface HotelGalleryProps {
  mainImage?: string | undefined;
  hotelName: string;
}

const DEFAULT_GALLERY = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
];

export const HotelGallery: React.FC<HotelGalleryProps> = ({
  mainImage,
  hotelName,
}) => {
  const images = mainImage ? [mainImage, ...DEFAULT_GALLERY.slice(1)] : DEFAULT_GALLERY;
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const currentImg = images[selectedIdx] || images[0] || DEFAULT_GALLERY[0];

  const handleNext = () => {
    setSelectedIdx((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setSelectedIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={styles.galleryContainer}>
      {/* Imagen Principal */}
      <div
        className={styles.mainImageWrapper}
        onClick={() => setIsLightboxOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Ver galería a pantalla completa"
      >
        <img
          src={currentImg}
          alt={`${hotelName} - Vista ${selectedIdx + 1}`}
          className={styles.mainImage}
        />
        <div className={styles.expandBadge}>
          <Maximize2 size={14} />
          <span>Ver {images.length} fotos</span>
        </div>
      </div>

      {/* Miniaturas */}
      <div className={styles.thumbnailsRow}>
        {images.map((img, i) => (
          <div
            key={i}
            className={[
              styles.thumbWrapper,
              i === selectedIdx ? styles.thumbActive : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setSelectedIdx(i)}
          >
            <img
              src={img}
              alt={`${hotelName} miniatura ${i + 1}`}
              className={styles.thumbImage}
            />
          </div>
        ))}
      </div>

      {/* Lightbox a Pantalla Completa */}
      {isLightboxOpen && (
        <div className={styles.lightbox} onClick={() => setIsLightboxOpen(false)}>
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Cerrar vista completa"
          >
            <X size={20} />
          </button>

          <button
            type="button"
            className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Foto anterior"
          >
            <ChevronLeft size={24} />
          </button>

          <img
            src={currentImg}
            alt={`${hotelName} - Foto ${selectedIdx + 1}`}
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            className={`${styles.lightboxNav} ${styles.lightboxNext}`}
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Foto siguiente"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

