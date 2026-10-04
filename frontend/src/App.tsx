import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, User, LogIn, MapPin, Star, ArrowLeft, Search, Users, DollarSign, Building, BedDouble, LayoutGrid, Info, CheckCircle2, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const alojamientosData = [
  { 
    id: 1, title: 'Hotel Grand Costa', location: 'Manta, Ecuador', rating: 4.9, img: '/villa.jpg', type: 'alojamiento', subtype: 'Hotel',
    description: 'Un lujoso hotel frente al mar con servicio todo incluido. Perfecto para desconectar de la rutina.',
    amenities: ['Piscina', 'Wi-Fi Gratis', 'Desayuno Incluido', 'Acceso directo a la playa'],
    habitaciones: [
      { id: 101, title: 'Suite Vista al Mar', price: 150, capacity: 2, img: '/room.jpg', type: 'habitacion', hotelName: 'Hotel Grand Costa' },
      { id: 102, title: 'Habitación Familiar', price: 200, capacity: 4, img: '/room.jpg', type: 'habitacion', hotelName: 'Hotel Grand Costa' },
    ]
  },
  { 
    id: 2, title: 'Villa Tropical Airbnb', location: 'Galápagos, Ecuador', rating: 4.8, img: '/pool.jpg', type: 'alojamiento', subtype: 'Airbnb',
    description: 'Hermosa villa privada alquilada entera. Rodeada de naturaleza, privacidad absoluta.',
    amenities: ['Cocina equipada', 'Piscina Privada', 'Pet Friendly', 'Parrilla BBQ'],
    habitaciones: [
      { id: 201, title: 'Casa Completa (Villa)', price: 340, capacity: 6, img: '/villa.jpg', type: 'habitacion', hotelName: 'Villa Tropical Airbnb' },
    ]
  },
  { 
    id: 3, title: 'Boutique Hotel Oro', location: 'Cuenca, Ecuador', rating: 4.9, img: '/villa.jpg', type: 'alojamiento', subtype: 'Hotel Boutique',
    description: 'Ubicado en el centro histórico, este hotel boutique combina arquitectura colonial con lujo moderno.',
    amenities: ['Spa', 'Restaurante Gourmet', 'Tour Histórico', 'Transporte al Aeropuerto'],
    habitaciones: [
      { id: 301, title: 'Habitación Estándar', price: 90, capacity: 2, img: '/room.jpg', type: 'habitacion', hotelName: 'Boutique Hotel Oro' },
      { id: 302, title: 'Suite Panorámica', price: 120, capacity: 2, img: '/room.jpg', type: 'habitacion', hotelName: 'Boutique Hotel Oro' },
    ]
  }
];


const LandingPage = () => {
  const [activeTab, setActiveTab] = useState('todos');
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [showHotelInfo, setShowHotelInfo] = useState(false);
  
  const [searchDestino, setSearchDestino] = useState('');
  const [searchPersonas, setSearchPersonas] = useState('');
  const [searchPresupuesto, setSearchPresupuesto] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Estados para datos reales del backend
  const [alojamientosData, setAlojamientosData] = useState<any[]>([]);
  const [todasLasHabitaciones, setTodasLasHabitaciones] = useState<any[]>([]);
  const [todosLosItems, setTodosLosItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Obtener datos del backend al cargar la página
  useEffect(() => {
    fetch('/api/v1/admin/alojamientos')
      .then(res => res.json())
      .then(data => {
        const alojamientos = Array.isArray(data) ? data.map((item: any, index: number) => ({
          id: item.id || index + 1,
          title: item.nombre,
          location: item.destino,
          rating: 4.8, // Valor por defecto
          img: item.tienePiscina ? '/pool.jpg' : '/villa.jpg', // Asignación de imagen de prueba
          type: 'alojamiento',
          subtype: 'Hotel', // Valor por defecto
          description: `Alojamiento con ${item.habitaciones} habitaciones.`,
          amenities: item.tienePiscina ? ['Piscina', 'Wi-Fi'] : ['Wi-Fi'],
          habitaciones: [
            {
              id: item.id + '-hab',
              title: 'Habitación Estándar',
              price: item.precioPorNoche,
              capacity: item.capacidadAdultos + item.capacidadNinos,
              img: '/room.jpg',
              type: 'habitacion',
              hotelName: item.nombre
            }
          ]
        })) : [];
        setAlojamientosData(alojamientos);
        
        const habitaciones = alojamientos.flatMap((h: any) => h.habitaciones || []);
        setTodasLasHabitaciones(habitaciones);
        setTodosLosItems([...alojamientos, ...habitaciones]);
        
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching alojamientos:", err);
        setLoading(false);
      });
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedHotel(null);
    setShowHotelInfo(false);
    if (tab !== 'buscar') {
      setHasSearched(false);
    }
  };

  const executeSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
  };

  const renderCard = (item: any) => {
    const isAlojamiento = item.type === 'alojamiento';

    return (
      <motion.div 
        key={item.id + (isAlojamiento ? 'h' : 'r')}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="card"
        style={{ cursor: isAlojamiento ? 'pointer' : 'default', display: 'flex', flexDirection: 'column' }}
        onClick={() => {
          if (isAlojamiento) {
            setSelectedHotel(item);
            setShowHotelInfo(false);
            window.scrollTo(0, 0); // Sube al hacer clic en un hotel
          }
        }}
      >
        <div className="card-img-container" style={{ position: 'relative' }}>
          <img src={item.img} alt={item.title} />
          <div style={{ position: 'absolute', top: '15px', left: '15px', background: 'var(--nav-bg)', backdropFilter: 'blur(5px)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {isAlojamiento ? item.subtype : 'Habitación'}
          </div>
        </div>
        <div className="card-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1.3rem' }}>{item.title}</h3>
            {isAlojamiento && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.95rem', color: 'var(--accent-color)', fontWeight: '600' }}>
                <Star size={16} fill="currentColor" /> {item.rating}
              </div>
            )}
          </div>
          
          <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', marginBottom: '16px' }}>
            {isAlojamiento ? <MapPin size={16} /> : <Building size={16} />}
            {isAlojamiento ? item.location : item.hotelName}
          </p>

          {!isAlojamiento && (
            <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', marginBottom: '16px' }}>
              <Users size={16} /> Capacidad: {item.capacity} pers.
            </p>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {isAlojamiento ? (
               <button className="btn-outline" style={{ width: '100%' }}>Ver Opciones</button>
            ) : (
               <>
                 <div>
                    <span style={{ fontWeight: '700', fontSize: '1.4rem' }}>${item.price}</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>/noche</span>
                 </div>
                 <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.9rem' }} onClick={() => alert(`Iniciando reserva para ${item.title}...`)}>
                   Reservar
                 </button>
               </>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  let itemsToShow: any[] = [];
  if (activeTab === 'todos') itemsToShow = todosLosItems;
  else if (activeTab === 'alojamiento') itemsToShow = alojamientosData;
  else if (activeTab === 'habitacion') itemsToShow = todasLasHabitaciones;
  else if (activeTab === 'buscar' && hasSearched) {
    itemsToShow = todasLasHabitaciones.filter(hab => {
      const matchDestino = hab.hotelName.toLowerCase().includes(searchDestino.toLowerCase());
      const matchPersonas = searchPersonas ? hab.capacity >= parseInt(searchPersonas) : true;
      const matchPresupuesto = searchPresupuesto ? hab.price <= parseInt(searchPresupuesto) : true;
      return matchDestino && matchPersonas && matchPresupuesto;
    });
  }

  return (
    <div className="animate-in" style={{ textAlign: 'center', marginTop: '5vh', paddingBottom: '40px' }}>
      
      {!selectedHotel && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '20px', letterSpacing: '-1px' }}>
            Encuentra tu refugio <span style={{ color: 'var(--accent-color)' }}>perfecto.</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '10px', maxWidth: '600px', margin: '0 auto 10px auto', lineHeight: '1.6' }}>
            Descubre hoteles, Airbnbs y villas exclusivas en los mejores destinos.
          </p>

          <div className="tabs-container">
            <button className={`tab-btn ${activeTab === 'todos' ? 'active' : ''}`} onClick={() => handleTabChange('todos')}>
              <LayoutGrid size={18} style={{ display: 'inline', marginBottom: '-4px', marginRight: '6px' }}/> Todos
            </button>
            <button className={`tab-btn ${activeTab === 'alojamiento' ? 'active' : ''}`} onClick={() => handleTabChange('alojamiento')}>
              <Building size={18} style={{ display: 'inline', marginBottom: '-4px', marginRight: '6px' }}/> Alojamientos
            </button>
            <button className={`tab-btn ${activeTab === 'habitacion' ? 'active' : ''}`} onClick={() => handleTabChange('habitacion')}>
              <BedDouble size={18} style={{ display: 'inline', marginBottom: '-4px', marginRight: '6px' }}/> Habitaciones
            </button>
            <button className={`tab-btn ${activeTab === 'buscar' ? 'active' : ''}`} onClick={() => handleTabChange('buscar')} style={{ borderColor: 'var(--accent-color)' }}>
              <Search size={18} style={{ display: 'inline', marginBottom: '-4px', marginRight: '6px' }}/> Búsqueda
            </button>
          </div>

          <AnimatePresence>
            {activeTab === 'buscar' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <form onSubmit={executeSearch} className="search-bar glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', maxWidth: '900px', margin: '0 auto 40px auto', alignItems: 'center', padding: '16px', background: 'white' }}>
                  <div style={{ flex: '1', minWidth: '200px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 16px' }}>
                    <Search size={18} color="var(--text-secondary)" style={{ marginRight: '10px' }}/>
                    <input type="text" placeholder="Nombre del alojamiento/destino" value={searchDestino} onChange={(e) => setSearchDestino(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem' }} />
                  </div>
                  <div style={{ flex: '1', minWidth: '150px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 16px' }}>
                    <Users size={18} color="var(--text-secondary)" style={{ marginRight: '10px' }}/>
                    <input type="number" placeholder="Personas" value={searchPersonas} onChange={(e) => setSearchPersonas(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem' }} min="1" />
                  </div>
                  <div style={{ flex: '1', minWidth: '150px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 16px' }}>
                    <DollarSign size={18} color="var(--text-secondary)" style={{ marginRight: '10px' }}/>
                    <input type="number" placeholder="Presupuesto Max" value={searchPresupuesto} onChange={(e) => setSearchPresupuesto(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem' }} min="1" />
                  </div>
                  <button type="submit" className="btn-primary" style={{ flex: '1', minWidth: '150px', padding: '12px' }}>
                    Buscar
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {!selectedHotel && (
        <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', textAlign: 'left' }}>
          <AnimatePresence>
            {activeTab === 'buscar' && !hasSearched ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0 }}
                style={{ gridColumn: '1 / -1', background: 'var(--card-bg)', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', border: '1px dashed var(--border-color)' }}
              >
                <Search size={48} color="var(--text-secondary)" style={{ margin: '0 auto 16px auto', opacity: 0.4 }} />
                <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>¿Qué estás buscando?</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Ingresa tus preferencias arriba y presiona "Buscar" para encontrar tu alojamiento ideal.</p>
              </motion.div>
            ) : itemsToShow.length === 0 ? (
              <motion.p initial={{opacity:0}} animate={{opacity:1}} style={{ textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-secondary)' }}>No se encontraron resultados para tu búsqueda.</motion.p>
            ) : (
              itemsToShow.map((item) => renderCard(item))
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {selectedHotel && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            style={{ textAlign: 'left' }}
          >
            <button className="btn-outline" onClick={() => setSelectedHotel(null)} style={{ marginBottom: '30px', padding: '8px 16px' }}>
              <ArrowLeft size={18} /> Volver
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ display: 'inline-block', background: 'var(--accent-color)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '10px' }}>
                  {selectedHotel.subtype}
                </div>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Opciones en {selectedHotel.title}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '1.1rem' }}><MapPin size={18} style={{ display: 'inline', marginBottom: '-4px'}} /> {selectedHotel.location}</p>
              </div>
              
              <button 
                className="btn-outline" 
                onClick={() => setShowHotelInfo(!showHotelInfo)}
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Info size={18} /> {showHotelInfo ? 'Ocultar detalles' : 'Ver detalles del alojamiento'}
              </button>
            </div>

            <AnimatePresence>
              {showHotelInfo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="info-box">
                    <h4 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Sobre este alojamiento</h4>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>{selectedHotel.description}</p>
                    
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Servicios destacados</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                      {selectedHotel.amenities.map((amenity: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          <CheckCircle2 size={16} color="var(--accent-color)" /> {amenity}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '20px' }}>
              {selectedHotel.habitaciones.map((hab: any) => renderCard(hab))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* SECCIÓN SOBRE NOSOTROS (Visible solo en la vista principal y con un ID para anclaje) */}
      {!selectedHotel && (
        <div id="nosotros" style={{ marginTop: '100px', textAlign: 'left', padding: '60px', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(255,255,255,1) 100%)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Heart size={32} color="var(--accent-color)" />
            <h2 style={{ fontSize: '2.2rem' }}>Acerca de LuxeStays</h2>
          </div>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '20px' }}>
            <strong>LuxeStays</strong> nació con una misión sencilla pero poderosa: conectar a viajeros exigentes con los espacios más extraordinarios del mundo, sin las complicaciones de las grandes plataformas masivas. Creemos que una escapada no solo es cambiar de escenario, sino encontrar un lugar que se sienta como un segundo hogar.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            Ayudamos a la gente a evitar la frustración de buscar horas interminables por internet. Nuestro algoritmo de búsqueda avanzado y nuestra selección curada de hoteles y Airbnbs garantizan que tu próxima aventura esté a un clic de distancia, siempre al precio justo y con transparencia total.
          </p>
        </div>
      )}

    </div>
  );
};

// Hook simple para scroll top al montar
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const NavBar = () => (
  <nav className="navbar">
    <div className="nav-logo">
      <Link to="/" onClick={() => window.scrollTo(0,0)} style={{ color: 'inherit' }}>LuxeStays</Link>
    </div>
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
      {/* Modificado para que siempre te lleve arriba si estás en inicio, o navegue a inicio si no lo estás */}
      <Link to="/" onClick={() => window.scrollTo(0,0)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
        <Home size={18} /> Inicio
      </Link>
      <a href="#nosotros" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', cursor: 'pointer' }}>
        <Info size={18} /> Nosotros
      </a>
      <Link to="/login" className="btn-primary" style={{ padding: '8px 20px' }}>
        <User size={18} /> Acceder
      </Link>
    </div>
  </nav>
);

const Footer = () => (
  <footer className="footer">
    <div className="footer-content">
      <h3 style={{ color: 'var(--accent-color)', fontSize: '1.8rem', marginBottom: '20px' }}>LuxeStays</h3>
      <p style={{ color: '#9CA3AF', lineHeight: '1.6', fontSize: '1.1rem', marginBottom: '30px' }}>
        Tu portal exclusivo para encontrar las mejores estadías alrededor del mundo. 
        Ya sea que busques el lujo de un resort 5 estrellas, la comodidad de un hotel boutique 
        o la privacidad absoluta de un Airbnb entero, LuxeStays te conecta con tu destino soñado.
      </p>
      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '30px 0' }}></div>
      <div style={{ color: '#6B7280', fontSize: '0.9rem' }}>
        &copy; {new Date().getFullYear()} LuxeStays Inc. Todos los derechos reservados.
      </div>
    </div>
  </footer>
);

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      {/* Estructura Flexbox para que el Footer SIEMPRE baje y sea visible */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
        <NavBar />
        <main className="main-content" style={{ flex: 1, width: '100%', maxWidth: '1200px', margin: '100px auto 0 auto' }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={
              <div className="animate-in card" style={{ textAlign: 'center', maxWidth: '400px', margin: '80px auto', padding: '40px' }}>
                <h2 style={{ marginBottom: '20px' }}>Iniciar Sesión</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Bienvenido de nuevo a LuxeStays.</p>
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => alert('¡Formulario de inicio de sesión próximamente!')}>
                  Entrar
                </button>
              </div>
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
