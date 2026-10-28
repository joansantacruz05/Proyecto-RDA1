import React, { useState } from 'react';
import { MapPin, Star, BedDouble, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { Alojamiento } from '../../types';

interface AccommodationCardProps {
  alojamiento: Alojamiento;
  onSelect: (alojamiento: Alojamiento) => void;
}

export const AccommodationCard: React.FC<AccommodationCardProps> = ({ alojamiento, onSelect }) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const fotos = alojamiento.fotos && alojamiento.fotos.length > 0
    ? alojamiento.fotos
    : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'];

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === 0 ? fotos.length - 1 : prev - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === fotos.length - 1 ? 0 : prev + 1));
  };

  const precioMinimo = alojamiento.habitaciones && alojamiento.habitaciones.length > 0
    ? Math.min(...alojamiento.habitaciones.map((h) => Number(h.precioNoche) || 999))
    : Number(alojamiento.precioBaseNoche) || 120;

  return (
    <div
      onClick={() => onSelect(alojamiento)}
      className="group bg-[#1C2541]/70 border border-white/10 hover:border-[#D4AF37]/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[#D4AF37]/10 flex flex-col cursor-pointer transform hover:-translate-y-1"
    >
      {/* Carrusel de Imágenes */}
      <div className="relative h-60 w-full overflow-hidden bg-[#0B132B]">
        <img
          src={fotos[currentImgIndex]}
          alt={alojamiento.titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B]/80 via-transparent to-black/30" />

        {/* Controles de Carrusel */}
        {fotos.length > 1 && (
          <>
            <button
              onClick={prevImage}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextImage}
              aria-label="Siguiente foto"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {fotos.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentImgIndex ? 'w-4 bg-[#D4AF37]' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Badges superiores */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="bg-[#0B132B]/90 backdrop-blur-md text-[#D4AF37] text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[#D4AF37]/30">
            {alojamiento.tipo || 'Alojamiento'}
          </span>
        </div>

        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1 border border-white/10">
          <Star size={13} className="text-[#D4AF37] fill-[#D4AF37]" />
          <span>{alojamiento.calificacion ? Number(alojamiento.calificacion).toFixed(1) : '4.9'}</span>
        </div>
      </div>

      {/* Contenido de la Tarjeta */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1.5">
            <MapPin size={13} className="text-[#D4AF37]" />
            <span>{alojamiento.ciudad}, Ecuador</span>
          </div>

          <h3 className="text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1 mb-2">
            {alojamiento.titulo}
          </h3>

          <p className="text-gray-400 text-xs line-clamp-2 mb-4 leading-relaxed">
            {alojamiento.descripcion || 'Experiencia exclusiva con amenidades premium y confort inigualable.'}
          </p>

          {/* Amenidades destacadas */}
          {alojamiento.amenities && alojamiento.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {alojamiento.amenities.slice(0, 3).map((amenity, idx) => (
                <span
                  key={idx}
                  className="bg-white/5 text-gray-300 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/5"
                >
                  <Check size={10} className="text-[#D4AF37]" />
                  {amenity}
                </span>
              ))}
              {alojamiento.amenities.length > 3 && (
                <span className="text-[10px] text-gray-400 self-center">
                  +{alojamiento.amenities.length - 3} más
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer: Habitaciones disponibles & Precio */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <BedDouble size={14} className="text-[#D4AF37]" />
            <span>
              {alojamiento.habitaciones ? `${alojamiento.habitaciones.length} cuartos` : 'Disponible'}
            </span>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-gray-400">Desde</div>
            <div className="text-base font-bold text-white">
              <span className="text-[#D4AF37]">${precioMinimo}</span>
              <span className="text-xs font-normal text-gray-400"> / noche</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccommodationCard;
