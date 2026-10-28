import React, { useState, useEffect } from 'react';
import { Sparkles, Compass } from 'lucide-react';
import { DestinationHighlights } from '../components/accommodation/DestinationHighlights';
import { FilterBar } from '../components/accommodation/FilterBar';
import type { FilterState } from '../components/accommodation/FilterBar';
import { AccommodationCard } from '../components/accommodation/AccommodationCard';
import { RoomSelectorModal } from '../components/accommodation/RoomSelectorModal';
import { BookingModal } from '../components/booking/BookingModal';
import { PaymentModal } from '../components/booking/PaymentModal';
import { ContractModal } from '../components/booking/ContractModal';
import { InvoiceReceipt } from '../components/booking/InvoiceReceipt';
import type { Alojamiento, Habitacion, Reserva, FacturaSRI } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtros, setFiltros] = useState<FilterState>({
    busqueda: '',
    ciudad: '',
    tipo: '',
    fechaEntrada: '',
    fechaSalida: '',
    huespedes: 1,
    precioMax: 1000,
  });

  // Modales y Estados de Flujo
  const [selectedAlojamiento, setSelectedAlojamiento] = useState<Alojamiento | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  const [bookingHabitacion, setBookingHabitacion] = useState<Habitacion | null>(null);
  const [bookingFechas, setBookingFechas] = useState<{ fechaEntrada: string; fechaSalida: string }>({
    fechaEntrada: '',
    fechaSalida: '',
  });
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const [activeOrden, setActiveOrden] = useState<Reserva | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [contractReserva, setContractReserva] = useState<Reserva | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  const [receiptFactura, setReceiptFactura] = useState<FacturaSRI | null>(null);

  // Cargar Alojamientos
  const fetchAlojamientos = async () => {
    setLoading(true);
    try {
      const data = await api.get<Alojamiento[]>('/alojamientos');
      setAlojamientos(data || []);
    } catch {
      // Fallback con datos curados de Ecuador en caso de cold-start o sin conexión
      setAlojamientos([
        {
          id: 1,
          titulo: 'Hotel Grand Costa Manta',
          ciudad: 'Manta',
          direccion: 'Av. Malecón y Flavio Reyes',
          tipo: 'Hotel',
          precioBaseNoche: 180,
          calificacion: 4.9,
          fotos: [
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
          ],
          amenities: ['Frente al Mar', 'Piscina Infinita', 'Desayuno Incluido', 'Spa de Lujo'],
          habitaciones: [
            {
              id: 101,
              titulo: 'Master Ocean Suite',
              tipo: 'Suite',
              precioNoche: 180,
              capacidad: 2,
              cantidadDisponible: 4,
              amenities: ['Cama King', 'Balcón Privado', 'Jacuzzi'],
            },
            {
              id: 102,
              titulo: 'Habitación Familiar Premium',
              tipo: 'Familiar',
              precioNoche: 240,
              capacidad: 4,
              cantidadDisponible: 2,
              amenities: ['2 Camas Queen', 'Vista al Mar'],
            },
          ],
        },
        {
          id: 2,
          titulo: 'Villa Ecológica Galápagos Luxury',
          ciudad: 'Galápagos',
          direccion: 'Puerto Ayora, Santa Cruz',
          tipo: 'Villa',
          precioBaseNoche: 350,
          calificacion: 5.0,
          fotos: [
            'https://images.unsplash.com/photo-1544979590-37e9b47eb705?auto=format&fit=crop&w=800&q=80',
          ],
          amenities: ['Energía Solar', 'Piscina Natural', 'Chef Privado', 'Tours Exclusivos'],
          habitaciones: [
            {
              id: 201,
              titulo: 'Villa Entera 3 Dormitorios',
              tipo: 'Villa Completa',
              precioNoche: 350,
              capacidad: 6,
              cantidadDisponible: 1,
              amenities: ['Cocina Gourmet', 'Piscina', 'Servicio Concierge'],
            },
          ],
        },
        {
          id: 3,
          titulo: 'Palacio Colonial Centro Histórico',
          ciudad: 'Quito',
          direccion: 'García Moreno y Sucre',
          tipo: 'Hotel Boutique',
          precioBaseNoche: 140,
          calificacion: 4.9,
          fotos: [
            'https://images.unsplash.com/photo-1594969155368-f19485a9d88c?auto=format&fit=crop&w=800&q=80',
          ],
          amenities: ['Patio Colonial', 'Cava de Vinos', 'Wi-Fi 500Mbps', 'Restaurante de Autor'],
          habitaciones: [
            {
              id: 301,
              titulo: 'Suite Presidencial Colonial',
              tipo: 'Suite',
              precioNoche: 140,
              capacidad: 2,
              cantidadDisponible: 3,
              amenities: ['Chimenea Antigua', 'Techos de Madera', 'Cama King'],
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlojamientos();
  }, []);

  // Filtrado reactivo en cliente
  const alojamientosFiltrados = alojamientos.filter((a) => {
    const q = filtros.busqueda.toLowerCase().trim();
    const coincideTexto =
      !q ||
      a.titulo.toLowerCase().includes(q) ||
      a.ciudad.toLowerCase().includes(q) ||
      a.tipo.toLowerCase().includes(q) ||
      (a.amenities && a.amenities.some((am) => am.toLowerCase().includes(q)));

    const coincideCiudad =
      !filtros.ciudad || a.ciudad.toLowerCase() === filtros.ciudad.toLowerCase();

    const coincideTipo =
      !filtros.tipo || a.tipo.toLowerCase() === filtros.tipo.toLowerCase();

    const precioMin =
      a.habitaciones && a.habitaciones.length > 0
        ? Math.min(...a.habitaciones.map((h) => Number(h.precioNoche) || 0))
        : Number(a.precioBaseNoche || 0);

    const coincidePrecio = precioMin <= filtros.precioMax;

    return coincideTexto && coincideCiudad && coincideTipo && coincidePrecio;
  });

  const handleSelectAlojamiento = (alojamiento: Alojamiento) => {
    setSelectedAlojamiento(alojamiento);
    setIsRoomModalOpen(true);
  };

  const handleSelectHabitacion = (
    habitacion: Habitacion,
    fechas: { fechaEntrada: string; fechaSalida: string }
  ) => {
    setIsRoomModalOpen(false);
    setBookingHabitacion(habitacion);
    setBookingFechas(fechas);
    setIsBookingModalOpen(true);
  };

  const handleOrderCreated = (orden: Reserva) => {
    setIsBookingModalOpen(false);
    setActiveOrden(orden);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (reservaActualizada: Reserva) => {
    setIsPaymentModalOpen(false);
    // Ofrecer inmediatamente firmar el contrato digital
    setContractReserva(reservaActualizada);
    setIsContractModalOpen(true);
  };

  const handleContractSigned = (reservaActualizada: Reserva) => {
    setIsContractModalOpen(false);
    // Si se generó factura SRI, mostrar el comprobante
    if (reservaActualizada.factura) {
      setReceiptFactura(reservaActualizada.factura);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1C2541]/40 via-[#0B132B] to-[#0B132B] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold">
            <Sparkles size={14} />
            <span>Alojamientos Exclusivos de Alta Gama en Ecuador</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Descubre Estancias Extraordinarias, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-amber-200 to-[#D4AF37]">
              Lujo & Confort Inigualable
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-300 font-light">
            Reserva villas privadas, hoteles boutique coloniales y resorts frente al Pacífico con
            facturación electrónica SRI inmediata y contratos digitales de hospedaje.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Destinos Destacados de Ecuador */}
        <DestinationHighlights
          destinoSeleccionado={filtros.ciudad}
          onSelectDestino={(ciudad) => setFiltros((prev) => ({ ...prev, ciudad }))}
        />

        {/* Barra de Filtros */}
        <FilterBar
          filtros={filtros}
          onChange={(nuevos) => setFiltros((prev) => ({ ...prev, ...nuevos }))}
          onReset={() =>
            setFiltros({
              busqueda: '',
              ciudad: '',
              tipo: '',
              fechaEntrada: '',
              fechaSalida: '',
              huespedes: 1,
              precioMax: 1000,
            })
          }
          totalResultados={alojamientosFiltrados.length}
        />

        {/* Grilla de Alojamientos */}
        <section>
          {loading ? (
            <div className="py-20 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Cargando catálogo exclusivo de alojamientos...</p>
            </div>
          ) : alojamientosFiltrados.length === 0 ? (
            <div className="py-16 text-center bg-[#1C2541]/40 border border-white/10 rounded-2xl p-8">
              <Compass size={40} className="mx-auto text-gray-500 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">
                No encontramos propiedades con estos filtros
              </h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                Prueba relajando los criterios de búsqueda, seleccionando otro destino o limpiando
                los filtros.
              </p>
              <button
                onClick={() =>
                  setFiltros({
                    busqueda: '',
                    ciudad: '',
                    tipo: '',
                    fechaEntrada: '',
                    fechaSalida: '',
                    huespedes: 1,
                    precioMax: 1000,
                  })
                }
                className="px-4 py-2 bg-[#D4AF37] text-[#0B132B] font-bold text-xs rounded-lg cursor-pointer"
              >
                Ver todos los alojamientos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alojamientosFiltrados.map((alojamiento) => (
                <AccommodationCard
                  key={alojamiento.id}
                  alojamiento={alojamiento}
                  onSelect={handleSelectAlojamiento}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal: Selector de Habitaciones */}
      <RoomSelectorModal
        alojamiento={selectedAlojamiento}
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        onSelectHabitacion={handleSelectHabitacion}
        fechasIniciales={{
          fechaEntrada: filtros.fechaEntrada,
          fechaSalida: filtros.fechaSalida,
        }}
      />

      {/* Modal: Cotización y Creación de Orden con Idempotencia */}
      {selectedAlojamiento && bookingHabitacion && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          alojamiento={selectedAlojamiento}
          habitacion={bookingHabitacion}
          fechas={bookingFechas}
          onOrderCreated={handleOrderCreated}
          usuarioDefault={user ? { nombre: user.nombre, correo: user.correo } : undefined}
        />
      )}

      {/* Modal: Pasarela de Pagos & SRI */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        orden={activeOrden}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Modal: Contrato Legal de Arrendamiento y Firma Digital */}
      <ContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        reserva={contractReserva}
        onContractSigned={handleContractSigned}
      />

      {/* Modal: Factura Electrónica SRI */}
      <InvoiceReceipt
        isOpen={!!receiptFactura}
        onClose={() => setReceiptFactura(null)}
        factura={receiptFactura}
      />
    </div>
  );
};

export default HomePage;
