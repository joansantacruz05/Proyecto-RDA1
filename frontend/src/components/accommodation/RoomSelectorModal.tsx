import React, { useState } from 'react';
import { Users, BedDouble, Check, Calendar, ArrowRight, ShieldCheck, Star, MapPin } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { Alojamiento, Habitacion } from '../../types';

interface RoomSelectorModalProps {
  alojamiento: Alojamiento | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectHabitacion: (habitacion: Habitacion, fechas: { fechaEntrada: string; fechaSalida: string }) => void;
  fechasIniciales?: { fechaEntrada: string; fechaSalida: string };
}

export const RoomSelectorModal: React.FC<RoomSelectorModalProps> = ({
  alojamiento,
  isOpen,
  onClose,
  onSelectHabitacion,
  fechasIniciales,
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [fechaEntrada, setFechaEntrada] = useState<string>(
    fechasIniciales?.fechaEntrada || tomorrow.toISOString().split('T')[0]
  );
  const [fechaSalida, setFechaSalida] = useState<string>(
    fechasIniciales?.fechaSalida || dayAfter.toISOString().split('T')[0]
  );

  if (!alojamiento) return null;

  const habitaciones = alojamiento.habitaciones && alojamiento.habitaciones.length > 0
    ? alojamiento.habitaciones
    : [
        {
          id: `${alojamiento.id}-default`,
          titulo: 'Suite Ejecutiva Principal',
          tipo: 'Suite',
          precioNoche: Number(alojamiento.precioBaseNoche) || 150,
          capacidad: 2,
          cantidadDisponible: 5,
          amenities: ['Cama King', 'Wi-Fi 500Mbps', 'Jacuzzi', 'Desayuno Continental'],
          fotos: alojamiento.fotos,
        },
      ];

  const handleBook = (habitacion: Habitacion) => {
    onSelectHabitacion(habitacion, { fechaEntrada, fechaSalida });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl" title="">
      <div className="space-y-6">
        {/* Encabezado del Alojamiento */}
        <div className="relative -mt-6 -mx-6 mb-6 h-56 overflow-hidden rounded-t-2xl">
          <img
            src={
              alojamiento.fotos?.[0] ||
              'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
            }
            alt={alojamiento.titulo}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1C2541] via-[#1C2541]/60 to-transparent" />

          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#D4AF37] text-[#0B132B] text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {alojamiento.tipo}
              </span>
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-0.5 rounded-full">
                <Star size={12} className="text-[#D4AF37] fill-[#D4AF37]" />
                <span>{alojamiento.calificacion ? Number(alojamiento.calificacion).toFixed(1) : '4.9'}</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{alojamiento.titulo}</h2>
            <div className="flex items-center gap-1.5 text-xs text-gray-300">
              <MapPin size={13} className="text-[#D4AF37]" />
              <span>{alojamiento.direccion || `${alojamiento.ciudad}, Ecuador`}</span>
            </div>
          </div>
        </div>

        {/* Descripción y Amenidades Generales */}
        <div>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            {alojamiento.descripcion ||
              'Alojamiento selecto con acabados de primera clase y atención personalizada para una estadía inolvidable en Ecuador.'}
          </p>

          {alojamiento.amenities && alojamiento.amenities.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider text-[#D4AF37] font-semibold mb-2">
                Amenidades de la Propiedad
              </h4>
              <div className="flex flex-wrap gap-2">
                {alojamiento.amenities.map((amenity, idx) => (
                  <span
                    key={idx}
                    className="bg-white/5 border border-white/10 text-gray-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                  >
                    <Check size={12} className="text-[#D4AF37]" />
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selector de Fechas para la Cotización */}
        <div className="bg-[#0B132B] border border-white/10 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar size={14} className="text-[#D4AF37]" />
            Selecciona tus fechas de viaje
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fecha de Entrada (Check-in 14:00)</label>
              <input
                type="date"
                value={fechaEntrada}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFechaEntrada(e.target.value)}
                className="w-full bg-[#1C2541] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fecha de Salida (Check-out 11:00)</label>
              <input
                type="date"
                value={fechaSalida}
                min={fechaEntrada || new Date().toISOString().split('T')[0]}
                onChange={(e) => setFechaSalida(e.target.value)}
                className="w-full bg-[#1C2541] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {/* Lista de Habitaciones Disponibles */}
        <div>
          <h3 className="text-lg font-bold text-white mb-3 flex items-center justify-between">
            <span>Habitaciones y Suites Disponibles</span>
            <span className="text-xs font-normal text-gray-400">
              {habitaciones.length} opciones
            </span>
          </h3>

          <div className="space-y-3">
            {habitaciones.map((hab) => {
              const precio = Number(hab.precioNoche) || 100;
              const disponible = hab.cantidadDisponible > 0;

              return (
                <div
                  key={hab.id}
                  className="bg-[#0B132B]/60 border border-white/10 hover:border-[#D4AF37]/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-base font-bold text-white">{hab.titulo}</h4>
                      <span className="bg-white/10 text-gray-300 text-[10px] px-2 py-0.5 rounded">
                        {hab.tipo}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                      <span className="flex items-center gap-1">
                        <Users size={13} className="text-[#D4AF37]" />
                        Hasta {hab.capacidad} huéspedes
                      </span>
                      <span className="flex items-center gap-1">
                        <BedDouble size={13} className="text-[#D4AF37]" />
                        {hab.cantidadDisponible > 0
                          ? `${hab.cantidadDisponible} disponibles`
                          : 'Agotado'}
                      </span>
                    </div>

                    {hab.amenities && hab.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {hab.amenities.map((am, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-white/5 text-gray-300 px-2 py-0.5 rounded"
                          >
                            {am}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center sm:flex-col items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <div className="text-left sm:text-right">
                      <div className="text-lg font-bold text-[#D4AF37]">${precio.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-400">por noche + imp.</div>
                    </div>

                    <button
                      disabled={!disponible}
                      onClick={() => handleBook(hab)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                        disponible
                          ? 'bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] shadow-md shadow-[#D4AF37]/20'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <span>{disponible ? 'Reservar' : 'Agotado'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Garantías LuxeStays */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#D4AF37]" />
            <span>Garantía de Mejor Tarifa & Cancelación flexible hasta 24h previas</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RoomSelectorModal;
