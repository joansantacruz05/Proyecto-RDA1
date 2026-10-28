import React from 'react';
import { MapPin } from 'lucide-react';

export interface Destination {
  id: string;
  nombre: string;
  provincia: string;
  descripcion: string;
  imagen: string;
}

export const DESTINOS_ECUADOR: Destination[] = [
  {
    id: 'quito',
    nombre: 'Quito',
    provincia: 'Pichincha',
    descripcion: 'Centro Histórico Patrimonio de la Humanidad & vistas al Pichincha',
    imagen: 'https://images.unsplash.com/photo-1594969155368-f19485a9d88c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cuenca',
    nombre: 'Cuenca',
    provincia: 'Azuay',
    descripcion: 'Arquitectura colonial, ríos cristalinos y calidez andina',
    imagen: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'galapagos',
    nombre: 'Galápagos',
    provincia: 'Galápagos',
    descripcion: 'Reserva marina única y villas ecológicas de máximo lujo',
    imagen: 'https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'manta',
    nombre: 'Manta',
    provincia: 'Manabí',
    descripcion: 'Costas del Pacífico, gastronomía marina y resorts frente al mar',
    imagen: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'banos',
    nombre: 'Baños de Agua Santa',
    provincia: 'Tungurahua',
    descripcion: 'Naturaleza andina, cascadas y refugios de relajación termal',
    imagen: 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'guayaquil',
    nombre: 'Guayaquil',
    provincia: 'Guayas',
    descripcion: 'Vibrante malecón, gastronomía moderna y suites de negocios',
    imagen: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80',
  },
];

interface DestinationHighlightsProps {
  destinoSeleccionado: string;
  onSelectDestino: (destino: string) => void;
}

export const DestinationHighlights: React.FC<DestinationHighlightsProps> = ({
  destinoSeleccionado,
  onSelectDestino,
}) => {
  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            Destinos Exclusivos
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">Explora el Encanto de Ecuador</h2>
        </div>
        {destinoSeleccionado && (
          <button
            onClick={() => onSelectDestino('')}
            className="text-xs text-[#D4AF37] hover:underline cursor-pointer"
          >
            Ver todos los destinos
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {DESTINOS_ECUADOR.map((dest) => {
          const isSelected =
            destinoSeleccionado.toLowerCase() === dest.nombre.toLowerCase();

          return (
            <div
              key={dest.id}
              onClick={() => onSelectDestino(isSelected ? '' : dest.nombre)}
              className={`group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 ${
                isSelected
                  ? 'ring-2 ring-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 scale-[1.02]'
                  : 'border border-white/10 hover:border-[#D4AF37]/50'
              }`}
              style={{ height: '170px' }}
            >
              <img
                src={dest.imagen}
                alt={dest.nombre}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-[#0B132B]/40 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-1 text-[#D4AF37] text-xs font-medium mb-0.5">
                  <MapPin size={12} />
                  <span>{dest.provincia}</span>
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">{dest.nombre}</h3>
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 bg-[#D4AF37] text-[#0B132B] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  Activo
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default DestinationHighlights;
