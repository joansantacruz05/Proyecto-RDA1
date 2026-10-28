import React from 'react';
import { Search, Calendar, Users, DollarSign, RotateCcw, Filter } from 'lucide-react';

export interface FilterState {
  busqueda: string;
  ciudad: string;
  tipo: string;
  fechaEntrada: string;
  fechaSalida: string;
  huespedes: number;
  precioMax: number;
}

interface FilterBarProps {
  filtros: FilterState;
  onChange: (nuevosFiltros: Partial<FilterState>) => void;
  onReset: () => void;
  totalResultados: number;
}

export const TIPOS_ALOJAMIENTO = [
  'Todos',
  'Hotel',
  'Airbnb',
  'Resort',
  'Hostería',
  'Villa',
  'Hotel Boutique',
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filtros,
  onChange,
  onReset,
  totalResultados,
}) => {
  return (
    <div className="bg-[#1C2541]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 mb-8 shadow-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Búsqueda por texto / destino */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Search size={14} className="text-[#D4AF37]" />
            Destino o propiedad
          </label>
          <input
            type="text"
            placeholder="Ej. Quito, Manta, Villa..."
            value={filtros.busqueda}
            onChange={(e) => onChange({ busqueda: e.target.value })}
            className="w-full bg-[#0B132B]/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Fechas de estancia */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1">
              <Calendar size={13} className="text-[#D4AF37]" />
              Check-in
            </label>
            <input
              type="date"
              value={filtros.fechaEntrada}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => onChange({ fechaEntrada: e.target.value })}
              className="w-full bg-[#0B132B]/80 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1">
              <Calendar size={13} className="text-[#D4AF37]" />
              Check-out
            </label>
            <input
              type="date"
              value={filtros.fechaSalida}
              min={filtros.fechaEntrada || new Date().toISOString().split('T')[0]}
              onChange={(e) => onChange({ fechaSalida: e.target.value })}
              className="w-full bg-[#0B132B]/80 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Huéspedes */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Users size={14} className="text-[#D4AF37]" />
            Huéspedes
          </label>
          <select
            value={filtros.huespedes}
            onChange={(e) => onChange({ huespedes: Number(e.target.value) })}
            className="w-full bg-[#0B132B]/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
          >
            <option value={1}>1 Huésped</option>
            <option value={2}>2 Huéspedes</option>
            <option value={3}>3 Huéspedes</option>
            <option value={4}>4 Huéspedes</option>
            <option value={6}>6+ Huéspedes</option>
          </select>
        </div>

        {/* Tipo de alojamiento */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Filter size={14} className="text-[#D4AF37]" />
            Tipo de propiedad
          </label>
          <select
            value={filtros.tipo}
            onChange={(e) => onChange({ tipo: e.target.value })}
            className="w-full bg-[#0B132B]/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
          >
            {TIPOS_ALOJAMIENTO.map((t) => (
              <option key={t} value={t === 'Todos' ? '' : t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Barra inferior: Precio Slider, Contador de Resultados y Reset */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-gray-400 flex items-center gap-1">
            <DollarSign size={13} className="text-[#D4AF37]" />
            Precio máx / noche:
          </span>
          <input
            type="range"
            min="30"
            max="1000"
            step="10"
            value={filtros.precioMax}
            onChange={(e) => onChange({ precioMax: Number(e.target.value) })}
            className="w-32 accent-[#D4AF37] cursor-pointer"
          />
          <span className="font-semibold text-[#D4AF37] min-w-[60px]">
            ${filtros.precioMax} USD
          </span>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-gray-400">
            Mostrando <strong className="text-white">{totalResultados}</strong> alojamientos disponibles
          </span>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Limpiar filtros</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
