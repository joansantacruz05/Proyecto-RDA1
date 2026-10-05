import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, User, LogIn, MapPin, Star, ArrowLeft, Search, Users, DollarSign, Building, BedDouble, LayoutGrid, Info, CheckCircle2, Heart, Plus, Edit2, Trash2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getTokenData = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

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
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ImageCarousel = ({ images, title }: { images: string[], title: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  if (!images || images.length === 0) {
    return <img src="/villa.jpg" alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  }

  if (images.length === 1) {
    return <img src={images[0]} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.src = '/villa.jpg'} />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }} className="carousel-container">
      <AnimatePresence initial={false}>
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`${title} - ${currentIndex + 1}`}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
          style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => e.currentTarget.src = '/villa.jpg'}
        />
      </AnimatePresence>
      <button 
        onClick={prevImage}
        className="carousel-btn"
        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
      >
        <ChevronLeft size={20} />
      </button>
      <button 
        onClick={nextImage}
        className="carousel-btn"
        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
      >
        <ChevronRight size={20} />
      </button>
      <div style={{ position: 'absolute', bottom: '10px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '6px', zIndex: 10 }}>
        {images.map((_, idx) => (
          <div key={idx} style={{ width: '6px', height: '6px', borderRadius: '50%', background: idx === currentIndex ? 'white' : 'rgba(255,255,255,0.5)' }} />
        ))}
      </div>
    </div>
  );
};

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
          img: item.imagenUrl || (item.tienePiscina ? '/pool.jpg' : '/villa.jpg'),
          type: 'alojamiento',
          subtype: 'Hotel', // Valor por defecto
          description: item.descripcion || `Alojamiento con ${item.habitaciones} habitaciones.`,
          amenities: item.tienePiscina ? ['Piscina', 'Wi-Fi'] : ['Wi-Fi'],
          habitaciones: [
            {
              id: item.id + '-hab',
              title: 'Habitación Estándar',
              price: item.precioPorNoche,
              capacity: Number(item.capacidadAdultos) + Number(item.capacidadNinos),
              img: item.imagenUrl || '/room.jpg',
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
          <ImageCarousel images={item.images || [item.img]} title={item.title} />
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

const NavBar = () => {
  const user = getTokenData();
  const isAdmin = user && user.rol === 'Admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <Link to="/" onClick={() => window.scrollTo(0,0)} style={{ color: 'inherit' }}>LuxeStays</Link>
      </div>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Link to="/" onClick={() => window.scrollTo(0,0)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
          <Home size={18} /> Inicio
        </Link>
        <a href="/#nosotros" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', cursor: 'pointer' }}>
          <Info size={18} /> Nosotros
        </a>
        
        {isAdmin && (
          <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: 'var(--accent-color)' }}>
            <Settings size={18} /> Panel Admin
          </Link>
        )}

        {user ? (
          <button className="btn-outline" onClick={handleLogout} style={{ padding: '8px 20px', background: 'transparent' }}>
            <User size={18} /> Salir
          </button>
        ) : (
          <Link to="/login" className="btn-primary" style={{ padding: '8px 20px' }}>
            <User size={18} /> Acceder
          </Link>
        )}
      </div>
    </nav>
  );
};

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

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ nombre: '', correo: '', contrasena: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';
    const payload = isLogin ? { correo: formData.correo, contrasena: formData.contrasena } : formData;

    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.access_token);
          alert(`¡Bienvenido ${data.usuario.rol}!`);
          window.location.href = '/'; 
        } else {
          alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
          setIsLogin(true);
        }
      } else {
        alert(`Error: ${data.message || 'Credenciales incorrectas'}`);
      }
    } catch (err) {
      alert('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '16px 20px',
    marginBottom: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    background: 'rgba(0, 0, 0, 0.25)',
    color: '#ffffff',
    fontSize: '1.05rem',
    backdropFilter: 'blur(10px)',
    outline: 'none',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundImage: 'url("/pool.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      {/* Overlay oscuro para resaltar el panel */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)' }}></div>
      
      {/* CSS inyectado para mejorar los inputs de este formulario específico */}
      <style>{`
        .login-input::placeholder { color: rgba(255, 255, 255, 0.6); }
        .login-input:focus { 
          border-color: var(--accent-color) !important; 
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.4); 
          background: rgba(0, 0, 0, 0.4) !important;
        }
        .login-btn {
          background: linear-gradient(135deg, var(--accent-color), #E8B923);
          box-shadow: 0 10px 20px -5px rgba(212, 175, 55, 0.5);
        }
        .login-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 25px -5px rgba(212, 175, 55, 0.7);
        }
      `}</style>

      <div className="animate-in" style={{
        position: 'relative',
        background: 'rgba(17, 24, 39, 0.75)', // Glassmorphism oscuro
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '24px',
        padding: '50px 40px',
        width: '90%',
        maxWidth: '460px',
        textAlign: 'center',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.7)',
        color: 'white'
      }}>
        {/* Botón de cerrar */}
        <div style={{ position: 'absolute', top: '20px', right: '25px' }}>
          <a href="/" style={{ color: 'white', opacity: 0.6, fontSize: '1.5rem', textDecoration: 'none' }}>&times;</a>
        </div>

        <h2 style={{ marginBottom: '10px', fontSize: '2.2rem', fontWeight: '700', color: '#fff', letterSpacing: '1px' }}>
          LuxeStays
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '35px', fontSize: '1.1rem' }}>
          {isLogin ? 'Bienvenido a la exclusividad.' : 'Comienza tu viaje premium.'}
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Nombre Completo"
              required
              className="login-input"
              style={inputStyle}
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            />
          )}
          <input
            type="email"
            placeholder="Correo Electrónico"
            required
            className="login-input"
            style={inputStyle}
            value={formData.correo}
            onChange={(e) => setFormData({...formData, correo: e.target.value})}
          />
          <input
            type="password"
            placeholder="Contraseña"
            required
            className="login-input"
            style={inputStyle}
            value={formData.contrasena}
            onChange={(e) => setFormData({...formData, contrasena: e.target.value})}
          />
          
          <button type="submit" className="btn-primary login-btn" style={{ 
            width: '100%', 
            padding: '16px', 
            fontSize: '1.1rem',
            fontWeight: '600',
            marginTop: '10px',
            borderRadius: '12px',
            color: '#000'
          }} disabled={loading}>
            {loading ? 'Validando...' : (isLogin ? 'Entrar a LuxeStays' : 'Crear Cuenta')}
          </button>
        </form>

        <p style={{ marginTop: '30px', color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
          {isLogin ? '¿Aún no tienes acceso?' : '¿Ya eres miembro?'}
          <span 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ 
              color: 'var(--accent-color)', 
              marginLeft: '8px', 
              cursor: 'pointer', 
              fontWeight: '600',
              textDecoration: 'underline',
              textUnderlineOffset: '4px'
            }}>
            {isLogin ? 'Regístrate' : 'Inicia Sesión'}
          </span>
        </p>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const user = getTokenData();
  const [alojamientos, setAlojamientos] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '', descripcion: '', imagenUrl: '', ubicacionId: 'UBI-001',
    precioPorNoche: 0, capacidadAdultos: 0, capacidadNinos: 0, habitaciones: 0
  });
  const [saving, setSaving] = useState(false);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);

  // Estado para Gestor de Habitaciones Individuales
  const [roomsModalAlojamiento, setRoomsModalAlojamiento] = useState<any>(null);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [newRoomImageUrl, setNewRoomImageUrl] = useState('');

  useEffect(() => {
    const savedLogs = localStorage.getItem('adminLogs');
    if (savedLogs) {
      setAdminLogs(JSON.parse(savedLogs));
    }
    
    fetch('/api/v1/admin/alojamientos')
      .then(res => res.json())
      .then(data => setAlojamientos(data))
      .catch(err => console.error(err));
  }, []);

  const addLog = (action: string, detail: string) => {
    const newLog = { id: Date.now(), time: new Date().toLocaleTimeString(), action, detail };
    const newLogs = [newLog, ...adminLogs].slice(0, 10); // Keep last 10
    setAdminLogs(newLogs);
    localStorage.setItem('adminLogs', JSON.stringify(newLogs));
  };

  // ===== FUNCIONES DEL GESTOR DE HABITACIONES =====
  const openRoomsManager = async (alojamiento: any) => {
    setRoomsModalAlojamiento(alojamiento);
    setLoadingRooms(true);
    try {
      const response = await fetch(`http://localhost:3000/api/v1/admin/alojamientos/${alojamiento.id}/habitaciones`);
      const data = await response.json();
      setRoomsList(data);
    } catch (e) {
      alert('Error cargando habitaciones.');
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSaveRoom = async (roomData: any) => {
    try {
      if (roomData.id === 'Nueva') {
        const res = await fetch(`http://localhost:3000/api/v1/admin/alojamientos/${roomsModalAlojamiento.id}/habitaciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roomData)
        });
        if (res.ok) {
          const newData = await res.json();
          setRoomsList([...roomsList, { ...roomData, id: newData.id }]);
          addLog('Habitación Creada', `Nueva habitación en ${roomsModalAlojamiento.nombre}`);
          setEditingRoom(null);
        }
      } else {
        const res = await fetch(`http://localhost:3000/api/v1/admin/habitaciones/${roomData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roomData)
        });
        if (res.ok) {
          setRoomsList(roomsList.map(r => r.id === roomData.id ? roomData : r));
          addLog('Habitación Editada', `Actualizada habitación ID: ${roomData.id}`);
          setEditingRoom(null);
        }
      }
    } catch(e) {
      alert('Error guardando habitación.');
    }
  };

  const handleDeleteRoom = async (habId: string) => {
    if (window.confirm('¿Eliminar habitación permanentemente?')) {
      const res = await fetch(`http://localhost:3000/api/v1/admin/habitaciones/${habId}`, { method: 'DELETE' });
      if (res.ok) {
        setRoomsList(roomsList.filter(r => r.id !== habId));
        addLog('Habitación Eliminada', `Eliminada habitación ID: ${habId}`);
      }
    }
  };

  const handleEditClick = (alojamiento: any) => {
    setIsCreating(false);
    setEditingItem(alojamiento);
    setEditForm({
      nombre: alojamiento.nombre || '',
      descripcion: alojamiento.descripcion || '',
      imagenUrl: alojamiento.imagenUrl || '',
      ubicacionId: alojamiento.ubicacionId || 'UBI-001',
      precioPorNoche: alojamiento.precioPorNoche || 0,
      capacidadAdultos: alojamiento.capacidadAdultos || 0,
      capacidadNinos: alojamiento.capacidadNinos || 0,
      habitaciones: alojamiento.habitaciones || 0
    });
  };

  const handleCreateClick = () => {
    setIsCreating(true);
    setEditingItem({ id: 'Nuevo' });
    setEditForm({
      nombre: '', descripcion: '', imagenUrl: '', ubicacionId: 'UBI-001',
      precioPorNoche: 0, capacidadAdultos: 1, capacidadNinos: 0, habitaciones: 1
    });
  };

  const handleDeleteClick = async (id: string, nombre: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${nombre}"? Esta acción no se puede deshacer.`)) {
      try {
        const response = await fetch(`http://localhost:3000/api/v1/admin/alojamientos/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setAlojamientos(alojamientos.filter(al => al.id !== id));
          addLog('Eliminación', `Se eliminó permanentemente el alojamiento: ${nombre}`);
          alert('🗑️ Alojamiento eliminado correctamente.');
        } else {
          alert('Error al intentar eliminar.');
        }
      } catch (e) {
        alert('Error de conexión.');
      }
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      if (isCreating) {
        const response = await fetch(`http://localhost:3000/api/v1/admin/alojamientos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
        if (response.ok) {
          const newItem = await response.json();
          const cityMap: any = { 'UBI-001': 'Quito', 'UBI-002': 'Guayaquil', 'UBI-003': 'Cuenca', 'UBI-004': 'Manta', 'UBI-005': 'Baños' };
          setAlojamientos([...alojamientos, { ...newItem, ...editForm, destino: cityMap[editForm.ubicacionId] || 'Quito', propietario: user.nombre }]);
          setEditingItem(null);
          addLog('Creación', `Se creó el nuevo alojamiento: ${editForm.nombre}`);
          alert('✨ Alojamiento y Habitaciones creados exitosamente.');
        }
      } else {
        const response = await fetch(`http://localhost:3000/api/v1/admin/alojamientos/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
        if (response.ok) {
          const cityMap: any = { 'UBI-001': 'Quito', 'UBI-002': 'Guayaquil', 'UBI-003': 'Cuenca', 'UBI-004': 'Manta', 'UBI-005': 'Baños' };
          setAlojamientos(alojamientos.map(al => al.id === editingItem.id ? { ...al, ...editForm, destino: cityMap[editForm.ubicacionId] || al.destino } : al));
          setEditingItem(null);
          addLog('Modificación', `Se actualizaron los datos del alojamiento ID: ${editingItem.id}`);
          alert('✏️ Datos actualizados en todas las tablas correctamente.');
        }
      }
    } catch (e) {
      alert('Error de conexión con el backend.');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.rol !== 'Admin') {
    return (
      <div style={{ textAlign: 'center', marginTop: '150px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>Acceso Denegado</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No tienes permisos para ver esta página.</p>
        <Link to="/" className="btn-primary" style={{ marginTop: '20px' }}>Volver al Inicio</Link>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Panel de Administración</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Gestiona los alojamientos, reservas y usuarios de LuxeStays.</p>
        </div>
        <div style={{ background: 'var(--accent-color)', color: 'white', padding: '15px 25px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 10px 20px -5px rgba(212, 175, 55, 0.4)' }}>
           <img src="https://ui-avatars.com/api/?name=Admin&background=fff&color=d4af37&bold=true" style={{ borderRadius: '50%', width: '50px' }} alt="Admin" />
           <div>
             <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{user.nombre}</h3>
             <p style={{ margin: 0, opacity: 0.9, fontSize: '0.85rem' }}>Administrador Principal</p>
           </div>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
         <div className="card" style={{ padding: '25px', borderLeft: '4px solid var(--accent-color)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '10px' }}>Alojamientos Activos</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{alojamientos.length}</p>
         </div>
         <div className="card" style={{ padding: '25px', borderLeft: '4px solid #3B82F6' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '10px' }}>Reservas Hoy</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>12</p>
         </div>
         <div className="card" style={{ padding: '25px', borderLeft: '4px solid #10B981' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '10px' }}>Ingresos Mensuales</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>$8,450</p>
         </div>
      </div>

      {/* Tabla de Alojamientos */}
      <div className="card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Gestión de Alojamientos</h2>
          <button className="btn-primary" onClick={handleCreateClick}>
            <Plus size={18} /> Nuevo Alojamiento
          </button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '15px 10px' }}>ID</th>
                <th style={{ padding: '15px 10px' }}>Nombre</th>
                <th style={{ padding: '15px 10px' }}>Destino</th>
                <th style={{ padding: '15px 10px' }}>Propietario</th>
                <th style={{ padding: '15px 10px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alojamientos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Cargando alojamientos...</td>
                </tr>
              ) : (
                alojamientos.map((al: any) => (
                  <tr key={al.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '15px 10px', fontWeight: '600', color: 'var(--text-secondary)' }}>{al.id}</td>
                    <td style={{ padding: '15px 10px', fontWeight: '500' }}>{al.nombre}</td>
                    <td style={{ padding: '15px 10px' }}>{al.destino}</td>
                    <td style={{ padding: '15px 10px' }}>{al.propietario}</td>
                    <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                      <button onClick={() => handleEditClick(al)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3B82F6', marginRight: '15px', padding: '5px' }} title="Editar Alojamiento Completo">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => openRoomsManager(al)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#10B981', marginRight: '15px', padding: '5px' }} title="Gestor de Habitaciones Específicas">
                        <BedDouble size={18} />
                      </button>
                      <button onClick={() => handleDeleteClick(al.id, al.nombre)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '5px' }} title="Eliminar Permanentemente">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Actividad */}
      <div className="card" style={{ padding: '30px', marginTop: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🕒 Registro de Cambios Recientes
        </h2>
        {adminLogs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No hay actividad reciente registrada en esta sesión.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {adminLogs.map(log => (
              <li key={log.id} style={{ display: 'flex', gap: '15px', borderBottom: '1px solid var(--border-color)', padding: '12px 0' }}>
                <span style={{ color: 'var(--text-secondary)', minWidth: '80px' }}>{log.time}</span>
                <span style={{ fontWeight: 'bold', color: log.action === 'Eliminación' ? '#EF4444' : log.action === 'Creación' ? '#10B981' : '#3B82F6' }}>
                  [{log.action}]
                </span>
                <span>{log.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MODAL DE EDICIÓN COMPLETO (Glassmorphism) */}
      <AnimatePresence>
        {editingItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
              padding: '20px', overflowY: 'auto'
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: 'var(--card-bg)', borderRadius: '20px', padding: '40px', width: '95%', maxWidth: '1200px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative',
                maxHeight: '90vh', overflowY: 'auto'
              }}
            >
              <button 
                onClick={() => setEditingItem(null)} 
                style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >&times;</button>
              
              <h2 style={{ marginBottom: '5px', fontSize: '1.8rem', color: 'var(--accent-color)' }}>
                {isCreating ? 'Crear Alojamiento Total' : 'Editor Avanzado de Alojamiento'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                {isCreating ? 'Configura todos los parámetros del nuevo establecimiento.' : `ID: ${editingItem.id} | Modifica alojamiento y habitaciones en un solo lugar.`}
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Nombre del Alojamiento</label>
                  <input type="text" value={editForm.nombre} onChange={(e) => setEditForm({...editForm, nombre: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }} placeholder="Ej. Hotel Paraíso" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Ubicación (Destino)</label>
                  <select value={editForm.ubicacionId} onChange={(e) => setEditForm({...editForm, ubicacionId: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', backgroundColor: 'transparent' }}>
                    <option value="UBI-001">Quito</option>
                    <option value="UBI-002">Guayaquil</option>
                    <option value="UBI-003">Cuenca</option>
                    <option value="UBI-004">Manta</option>
                    <option value="UBI-005">Baños</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '25px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-color)' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>Portada del Alojamiento</label>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: '200px', height: '130px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                     <img src={editForm.imagenUrl || '/villa.jpg'} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.src = '/villa.jpg'} />
                  </div>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                     <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Ingresa el enlace web de la foto principal que verán los usuarios al buscar alojamientos.</p>
                     <input type="text" value={editForm.imagenUrl} onChange={(e) => setEditForm({...editForm, imagenUrl: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', background: 'var(--card-bg)' }} placeholder="Pega aquí el enlace de tu foto (https://...)" />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Descripción</label>
                <textarea value={editForm.descripcion} onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', minHeight: '80px', resize: 'vertical' }} placeholder="Descripción completa..." />
              </div>

              <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>Configuración de Habitaciones / Espacios</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Precio x Noche ($)</label>
                  <input type="number" value={editForm.precioPorNoche} onChange={(e) => setEditForm({...editForm, precioPorNoche: Number(e.target.value)})} style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Cantidad Habitaciones</label>
                  <input type="number" value={editForm.habitaciones} onChange={(e) => setEditForm({...editForm, habitaciones: Number(e.target.value)})} style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Capacidad Adultos</label>
                  <input type="number" value={editForm.capacidadAdultos} onChange={(e) => setEditForm({...editForm, capacidadAdultos: Number(e.target.value)})} style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Capacidad Niños</label>
                  <input type="number" value={editForm.capacidadNinos} onChange={(e) => setEditForm({...editForm, capacidadNinos: Number(e.target.value)})} style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <button className="btn-outline" onClick={() => setEditingItem(null)} disabled={saving} style={{ padding: '12px 25px' }}>Cancelar</button>
                <button className="btn-primary" onClick={handleSaveEdit} disabled={saving} style={{ padding: '12px 30px', background: 'var(--accent-color)', fontSize: '1.05rem' }}>
                  {saving ? 'Guardando en BD...' : (isCreating ? 'Crear Alojamiento' : 'Guardar Todo')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    {/* MODAL GESTOR DE HABITACIONES */}
      <AnimatePresence>
        {roomsModalAlojamiento && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000,
              padding: '20px', overflowY: 'auto'
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: 'var(--card-bg)', borderRadius: '20px', padding: '40px', width: '95%', maxWidth: '1200px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative',
                maxHeight: '90vh', overflowY: 'auto'
              }}
            >
              <button onClick={() => { setRoomsModalAlojamiento(null); setEditingRoom(null); }} style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
              
              <h2 style={{ marginBottom: '5px', fontSize: '1.8rem', color: '#10B981' }}>
                Habitaciones de {roomsModalAlojamiento.nombre}
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Gestor específico de espacios y tarifas.</p>

              {!editingRoom ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <button className="btn-primary" style={{ background: '#10B981' }} onClick={() => setEditingRoom({ id: 'Nueva', nombre: '', precioPorNoche: 50, capacidadAdultos: 2, capacidadNinos: 0, cantidadDisponible: 1 })}>
                      <Plus size={18} /> Nueva Habitación
                    </button>
                  </div>
                  
                  {loadingRooms ? <p>Cargando habitaciones...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '10px' }}>Nombre</th>
                          <th style={{ padding: '10px' }}>Capacidad</th>
                          <th style={{ padding: '10px' }}>Precio</th>
                          <th style={{ padding: '10px' }}>Stock</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roomsList.length === 0 && <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>No hay habitaciones.</td></tr>}
                        {roomsList.map((room) => (
                          <tr key={room.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '15px 10px', fontWeight: '500' }}>{room.nombre}</td>
                            <td style={{ padding: '15px 10px' }}>{room.capacidadAdultos} Adul. / {room.capacidadNinos} Niños</td>
                            <td style={{ padding: '15px 10px', fontWeight: 'bold' }}>${Number(room.precioPorNoche).toFixed(2)}</td>
                            <td style={{ padding: '15px 10px' }}>{room.cantidadDisponible} dispo.</td>
                            <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                              <button onClick={() => setEditingRoom({...room})} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3B82F6', marginRight: '15px' }}><Edit2 size={18} /></button>
                              <button onClick={() => handleDeleteRoom(room.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={18} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              ) : (
                <div style={{ background: 'var(--bg-color)', padding: '20px', borderRadius: '12px' }}>
                  <h3 style={{ marginBottom: '20px' }}>{editingRoom.id === 'Nueva' ? 'Agregar Nueva Habitación' : `Editando ${editingRoom.nombre}`}</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>Nombre de la Habitación</label>
                      <input type="text" value={editingRoom.nombre} onChange={(e) => setEditingRoom({...editingRoom, nombre: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} placeholder="Ej. Suite Presidencial" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>Precio x Noche ($)</label>
                      <input type="number" value={editingRoom.precioPorNoche} onChange={(e) => setEditingRoom({...editingRoom, precioPorNoche: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>Stock (Cantidad)</label>
                      <input type="number" value={editingRoom.cantidadDisponible} onChange={(e) => setEditingRoom({...editingRoom, cantidadDisponible: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>Adultos Max</label>
                      <input type="number" value={editingRoom.capacidadAdultos} onChange={(e) => setEditingRoom({...editingRoom, capacidadAdultos: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>Niños Max</label>
                      <input type="number" value={editingRoom.capacidadNinos} onChange={(e) => setEditingRoom({...editingRoom, capacidadNinos: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>Galería de Fotos de la Habitación</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <input 
                        type="text" 
                        value={newRoomImageUrl} 
                        onChange={(e) => setNewRoomImageUrl(e.target.value)} 
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} 
                        placeholder="Pega aquí el enlace web de la foto (Ej. https://...)" 
                        onKeyDown={(e) => {
                          if(e.key === 'Enter') {
                            e.preventDefault();
                            if(newRoomImageUrl.trim()) {
                              const arr = editingRoom.imagenesUrls ? editingRoom.imagenesUrls.split(',').filter(Boolean) : [];
                              setEditingRoom({...editingRoom, imagenesUrls: [...arr, newRoomImageUrl.trim()].join(',')});
                              setNewRoomImageUrl('');
                            }
                          }
                        }}
                      />
                      <button 
                        className="btn-primary" 
                        style={{ background: '#3B82F6', whiteSpace: 'nowrap' }}
                        onClick={(e) => {
                          e.preventDefault();
                          if(newRoomImageUrl.trim()) {
                            const arr = editingRoom.imagenesUrls ? editingRoom.imagenesUrls.split(',').filter(Boolean) : [];
                            setEditingRoom({...editingRoom, imagenesUrls: [...arr, newRoomImageUrl.trim()].join(',')});
                            setNewRoomImageUrl('');
                          }
                        }}
                      >
                        <Plus size={18} /> Agregar Foto
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px' }}>
                      {(editingRoom.imagenesUrls ? editingRoom.imagenesUrls.split(',').filter(Boolean) : []).map((url: string, idx: number) => (
                        <div key={idx} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', height: '100px', border: '1px solid var(--border-color)' }}>
                          <img src={url} alt={`Room foto ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.src = '/villa.jpg'} />
                          <button 
                            style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            onClick={(e) => {
                               e.preventDefault();
                               const arr = editingRoom.imagenesUrls.split(',').filter(Boolean);
                               arr.splice(idx, 1);
                               setEditingRoom({...editingRoom, imagenesUrls: arr.join(',')});
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button className="btn-outline" onClick={() => setEditingRoom(null)}>Cancelar Edición</button>
                    <button className="btn-primary" onClick={() => handleSaveRoom(editingRoom)} style={{ background: '#10B981' }}>Guardar Habitación</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
