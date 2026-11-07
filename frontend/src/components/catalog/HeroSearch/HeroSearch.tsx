import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Calendar, Users, Search, Sparkles } from 'lucide-react';
import { Button } from '../../ui/Button/Button';
import { api } from '../../../api/client';
import styles from './HeroSearch.module.css';

interface HeroSearchProps {
  initialCiudad?: string;
  initialCheckin?: string;
  initialCheckout?: string;
  initialAdults?: number;
  initialRooms?: number;
  onSearch: (params: {
    ciudad: string;
    checkin: string;
    checkout: string;
    adults: number;
    rooms: number;
  }) => void;
}

export const HeroSearch: React.FC<HeroSearchProps> = ({
  initialCiudad = '',
  initialCheckin,
  initialCheckout,
  initialAdults = 2,
  initialRooms = 1,
  onSearch,
}) => {
  // Fechas por defecto: mañana y pasado mañana
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const defaultCheckin = initialCheckin || tomorrow.toISOString().split('T')[0] || '';
  const defaultCheckout = initialCheckout || dayAfter.toISOString().split('T')[0] || '';

  const [ciudad, setCiudad] = useState(initialCiudad);
  const [checkin, setCheckin] = useState(defaultCheckin);
  const [checkout, setCheckout] = useState(defaultCheckout);
  const [adults, setAdults] = useState(initialAdults);
  const [rooms, setRooms] = useState(initialRooms);
  const [showOccupancy, setShowOccupancy] = useState(false);
  const [dateError, setDateError] = useState('');

  // 100% dinámico: Ciudades desde la API (puede ser objeto { id, nombre } o string)
  interface CiudadObj {
    id?: string;
    nombre?: string;
  }

  const { data: rawCiudades = [] } = useQuery<Array<CiudadObj | string>>({
    queryKey: ['ciudades'],
    queryFn: () => api.get<Array<CiudadObj | string>>('/ciudades'),
  });

  const ciudades = React.useMemo(() => {
    return rawCiudades
      .map((c) => {
        if (typeof c === 'string') return { id: c, nombre: c };
        if (c && typeof c === 'object') {
          return {
            id: c.id || c.nombre || '',
            nombre: c.nombre || c.id || '',
          };
        }
        return null;
      })
      .filter((c): c is { id: string; nombre: string } => Boolean(c && c.nombre));
  }, [rawCiudades]);

  const handleCheckinChange = (val: string) => {
    setCheckin(val);
    if (checkout && val >= checkout) {
      const nextDay = new Date(val);
      nextDay.setDate(nextDay.getDate() + 1);
      setCheckout(nextDay.toISOString().split('T')[0] || '');
      setDateError('');
    }
  };

  const handleCheckoutChange = (val: string) => {
    if (val <= checkin) {
      setDateError('La fecha de salida debe ser posterior a la de llegada');
    } else {
      setDateError('');
      setCheckout(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkout <= checkin) {
      setDateError('Verifica las fechas seleccionadas');
      return;
    }
    onSearch({
      ciudad,
      checkin,
      checkout,
      adults,
      rooms,
    });
  };

  const todayStr = today.toISOString().split('T')[0] || '';

  return (
    <section className={styles.heroSection}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroTag}>
            <Sparkles size={14} />
            <span>Colección Exclusiva de Hospedajes</span>
          </div>
          <h1 className={styles.heroTitle}>Descubre el Lujo Auténtico en Ecuador</h1>
          <p className={styles.heroSubtitle}>
            Hoteles boutique coloniales, resorts frente al océano Pacífico y villas privadas en Galápagos. Tarifas transparentes con garantía de reserva inmediata.
          </p>
        </div>

        {/* Buscador Integrado */}
        <div className={styles.searchBarCard}>
          <form onSubmit={handleSubmit} className={styles.searchGrid}>
            {/* Destino */}
            <div className={styles.searchField}>
              <label className={styles.fieldLabel} htmlFor="hero-destino">
                <MapPin size={13} color="#C9A227" />
                <span>Destino en Ecuador</span>
              </label>
              <select
                id="hero-destino"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className={styles.selectInput}
              >
                <option value="">Todos los destinos del país</option>
                {ciudades.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Check-in */}
            <div className={styles.searchField}>
              <label className={styles.fieldLabel} htmlFor="hero-checkin">
                <Calendar size={13} color="#14406B" />
                <span>Llegada (Check-in)</span>
              </label>
              <input
                id="hero-checkin"
                type="date"
                min={todayStr}
                value={checkin}
                onChange={(e) => handleCheckinChange(e.target.value)}
                className={styles.dateInput}
                required
              />
            </div>

            {/* Check-out */}
            <div className={styles.searchField}>
              <label className={styles.fieldLabel} htmlFor="hero-checkout">
                <Calendar size={13} color="#14406B" />
                <span>Salida (Check-out)</span>
              </label>
              <input
                id="hero-checkout"
                type="date"
                min={checkin || todayStr}
                value={checkout}
                onChange={(e) => handleCheckoutChange(e.target.value)}
                className={styles.dateInput}
                required
              />
            </div>

            {/* Huéspedes y Habitaciones Popover */}
            <div className={styles.searchField} style={{ position: 'relative' }}>
              <span className={styles.fieldLabel}>
                <Users size={13} color="#14406B" />
                <span>Huéspedes y Habitaciones</span>
              </span>
              <button
                type="button"
                className={styles.popoverTrigger}
                onClick={() => setShowOccupancy(!showOccupancy)}
              >
                {adults} {adults === 1 ? 'huésped' : 'huéspedes'} · {rooms} {rooms === 1 ? 'hab.' : 'habs.'}
              </button>

              {showOccupancy && (
                <div className={styles.occupancyMenu}>
                  {/* Adultos */}
                  <div className={styles.counterRow}>
                    <div>
                      <div className={styles.counterTitle}>Adultos</div>
                      <div className={styles.counterSubtitle}>Mayores de 13 años</div>
                    </div>
                    <div className={styles.counterControls}>
                      <button
                        type="button"
                        className={styles.counterBtn}
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        disabled={adults <= 1}
                      >
                        -
                      </button>
                      <span className={styles.counterValue}>{adults}</span>
                      <button
                        type="button"
                        className={styles.counterBtn}
                        onClick={() => setAdults(Math.min(10, adults + 1))}
                        disabled={adults >= 10}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Habitaciones */}
                  <div className={styles.counterRow}>
                    <div>
                      <div className={styles.counterTitle}>Habitaciones</div>
                      <div className={styles.counterSubtitle}>Espacios rentables</div>
                    </div>
                    <div className={styles.counterControls}>
                      <button
                        type="button"
                        className={styles.counterBtn}
                        onClick={() => setRooms(Math.max(1, rooms - 1))}
                        disabled={rooms <= 1}
                      >
                        -
                      </button>
                      <span className={styles.counterValue}>{rooms}</span>
                      <button
                        type="button"
                        className={styles.counterBtn}
                        onClick={() => setRooms(Math.min(5, rooms + 1))}
                        disabled={rooms >= 5}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => setShowOccupancy(false)}
                  >
                    Listo
                  </Button>
                </div>
              )}
            </div>

            {/* Botón Buscar */}
            <div>
              <Button
                type="submit"
                variant="gold"
                size="lg"
                icon={<Search size={18} />}
                fullWidth
              >
                Buscar
              </Button>
            </div>
          </form>

          {dateError && (
            <div
              style={{
                color: 'var(--color-error)',
                fontSize: 'var(--font-size-xs)',
                marginTop: 'var(--space-2)',
                textAlign: 'left',
              }}
            >
              {dateError}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

