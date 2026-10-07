import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, User, MapPin, Star, ArrowLeft, Search, Users, DollarSign, Building, BedDouble, LayoutGrid, Info, CheckCircle2, Heart, Plus, Edit2, Trash2, Settings, CreditCard, X, Calendar, XCircle, Clock, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getTokenData = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export const alojamientosData = [
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

const ToastNotification = ({ message, type = 'success', onClose }: { message: string, type?: string, onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
      background: type === 'success' ? '#10B981' : '#EF4444', color: 'white',
      padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: '12px',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <span style={{ fontWeight: '600' }}>{message}</span>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0 0 10px' }}>&times;</button>
    </div>
  );
};

const MiPerfil = () => {
  const [perfil, setPerfil] = useState({ nombre: '', telefono: '', edad: '', correo: '', direccion: '', pais: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = getTokenData();
    if (!user) return;
    fetch(`${API_URL}/api/v1/auth/me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: user.correo })
    })
    .then(r => r.json())
    .then(data => {
      setPerfil({ 
        nombre: data.nombre || '', 
        telefono: data.telefono || '', 
        edad: data.edad || '', 
        correo: data.correo || '',
        direccion: data.direccion || '',
        pais: data.pais || ''
      });
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...perfil, edad: Number(perfil.edad) })
      });
      if (res.ok) {
        setMessage('¡Perfil actualizado con éxito!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Error al actualizar el perfil.');
      }
    } catch {
      setMessage('Error de red.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{textAlign:'center', padding:'50px'}}>Cargando perfil...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', animation: 'fadeIn 0.3s' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <User size={32} color="var(--accent-color)" /> Mi Perfil
      </h2>
      
      {message && <div style={{ background: message.includes('Error') ? '#EF4444' : 'var(--accent-color)', color: message.includes('Error') ? 'white' : 'black', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>{message}</div>}
      
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {/* Columna Izquierda: Resumen / Avatar */}
        <div style={{ flex: '1', minWidth: '250px', background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center', height: 'fit-content' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), #8B5CF6)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: 'black', fontWeight: 'bold' }}>
            {perfil.nombre ? perfil.nombre.charAt(0).toUpperCase() : 'U'}
          </div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.5rem' }}>{perfil.nombre || 'Usuario'}</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 5px 0' }}>{perfil.correo}</p>
          <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'left' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}><strong>Estado:</strong> Activo</p>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}><strong>Rol:</strong> {getTokenData()?.rol || 'Cliente'}</p>
            <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}><strong>Miembro desde:</strong> 2026</p>
          </div>
        </div>

        {/* Columna Derecha: Formulario */}
        <div style={{ flex: '2', minWidth: '300px' }}>
          <form onSubmit={handleSave} style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ marginTop: '0', marginBottom: '20px', fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Información Personal</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Nombre Completo</label>
                <input required type="text" value={perfil.nombre} onChange={e => setPerfil({...perfil, nombre: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', background: 'white', color: 'black' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Teléfono (Celular)</label>
                <input type="tel" placeholder="Ej: 0999999999" value={perfil.telefono} onChange={e => setPerfil({...perfil, telefono: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', background: 'white', color: 'black' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Edad</label>
                <input type="number" min="18" placeholder="18+" value={perfil.edad} onChange={e => setPerfil({...perfil, edad: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', background: 'white', color: 'black' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>País de Residencia</label>
                <input type="text" placeholder="Ej: Ecuador" value={perfil.pais} onChange={e => setPerfil({...perfil, pais: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', background: 'white', color: 'black' }} />
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Dirección Completa</label>
              <input type="text" placeholder="Calle principal, ciudad..." value={perfil.direccion} onChange={e => setPerfil({...perfil, direccion: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', background: 'white', color: 'black' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '12px 30px', fontSize: '1rem' }}>
                {saving ? 'Guardando cambios...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const FacturaModal = ({ reserva, onClose }: { reserva: any, onClose: () => void }) => {
  const usuario = getTokenData();
  const [datosFactura, setDatosFactura] = useState({
    nombre: usuario?.nombre || 'Consumidor Final',
    identificacion: '9999999999',
    direccion: usuario?.direccion || 'S/N'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div className="printable-invoice" style={{ background: 'white', color: 'black', width: '100%', maxWidth: '700px', borderRadius: '8px', padding: '40px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', border: '1px solid #e5e7eb' }}>
        <style>{`
          @media print {
            html, body { height: auto !important; overflow: visible !important; }
            body * { visibility: hidden; }
            .print-modal-overlay { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; padding: 0 !important; display: block !important; background: none !important; align-items: flex-start !important; }
            .print-modal-overlay, .print-modal-overlay * { visibility: visible; }
            .printable-invoice { position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; transform: none !important; }
            .no-print { display: none !important; }
            @page { margin: 1cm; }
          }
        `}</style>
        
        {/* Formulario previo (no se imprime) */}
        <div className="no-print" style={{ background: '#f3f4f6', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #d1d5db' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#111827' }}>⚙️ Personalizar datos para la factura</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#4b5563' }}>Nombre / Razón Social</label>
              <input type="text" value={datosFactura.nombre} onChange={(e) => setDatosFactura({...datosFactura, nombre: e.target.value.replace(/[0-9]/g, '')})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#4b5563' }}>Cédula / RUC</label>
              <input type="text" maxLength={13} value={datosFactura.identificacion} onChange={(e) => setDatosFactura({...datosFactura, identificacion: e.target.value.replace(/[^0-9]/g, '').slice(0, 13)})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="10 o 13 dígitos numéricos" />
              {datosFactura.identificacion && datosFactura.identificacion.length !== 10 && datosFactura.identificacion.length !== 13 && (
                <span style={{ color: 'red', fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>Debe tener exactamente 10 o 13 dígitos numéricos</span>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#4b5563' }}>Dirección</label>
              <input type="text" value={datosFactura.direccion} onChange={(e) => setDatosFactura({...datosFactura, direccion: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Ej. Av. Principal 123" />
              {datosFactura.direccion && datosFactura.direccion.trim().length < 5 && (
                <span style={{ color: 'red', fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>Ingrese una dirección válida (mín. 5 caracteres)</span>
              )}
            </div>
          </div>
        </div>

        {/* Cabecera de la factura */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #D4AF37', paddingBottom: '20px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ color: '#D4AF37', margin: 0, fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building size={32} /> RDA1
            </h1>
            <p style={{ margin: '5px 0', color: '#6B7280' }}>Plataforma de Alojamientos Premium</p>
            <p style={{ margin: '0', color: '#6B7280' }}>RUC: 0999999999001</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, color: '#111827', fontSize: '1.8rem' }}>FACTURA ELECTRÓNICA</h2>
            <p style={{ margin: '5px 0', color: '#6B7280', fontWeight: 'bold' }}>Nº FAC-{reserva.id.slice(-6).toUpperCase()}</p>
            <p style={{ margin: '0', color: '#6B7280' }}>Fecha de emisión: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Datos del Cliente */}
        <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#111827' }}>Datos del Cliente</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.95rem' }}>
            <p style={{ margin: 0 }}><strong>Nombre:</strong> {datosFactura.nombre}</p>
            <p style={{ margin: 0 }}><strong>Cédula/RUC:</strong> {datosFactura.identificacion}</p>
            <p style={{ margin: 0 }}><strong>Dirección:</strong> {datosFactura.direccion}</p>
            <p style={{ margin: 0 }}><strong>Email:</strong> {usuario?.correo || 'correo@ejemplo.com'}</p>
          </div>
        </div>

        {/* Detalles de la Reserva */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ background: '#D4AF37', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Descripción</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Fechas</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Precio Neto</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '15px 12px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Servicio de alojamiento</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#6B7280' }}>{reserva.alojamiento?.nombre || 'Alojamiento'}</p>
                {reserva.alojamiento?.destino && (
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#9CA3AF' }}><MapPin size={12} style={{ display: 'inline', marginRight: '4px' }}/>{reserva.alojamiento.destino}</p>
                )}
              </td>
              <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                {reserva.fechaInicio}<br/>al<br/>{reserva.fechaFin}
              </td>
              <td style={{ padding: '15px 12px', textAlign: 'right' }}>
                ${(Number(reserva.totalPagar) / 1.15).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Totales */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
          <div style={{ width: '250px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#6B7280' }}>Subtotal:</span>
              <span>${(Number(reserva.totalPagar) / 1.15).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#6B7280' }}>IVA (15%):</span>
              <span>${(Number(reserva.totalPagar) - (Number(reserva.totalPagar) / 1.15)).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #D4AF37', paddingTop: '10px', fontWeight: 'bold', fontSize: '1.2rem' }}>
              <span>Total:</span>
              <span>${Number(reserva.totalPagar).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
          <button onClick={handlePrint} className="btn-primary" style={{ padding: '10px 30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🖨️ Imprimir Factura
          </button>
          <button onClick={onClose} style={{ padding: '10px 30px', background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', borderRadius: '8px', cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const MisReservas = () => {
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagandoReserva, setPagandoReserva] = useState<any>(null);
  const [verFactura, setVerFactura] = useState<any>(null);
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  const [pagoForm, setPagoForm] = useState({ metodoId: 'MET-001', requiereFactura: false, identificacion: '', nombre: '', direccion: '' });
  const [metodosPago, setMetodosPago] = useState<any[]>([]);
  const [procesandoPago, setProcesandoPago] = useState(false);
  
  useEffect(() => {
    fetch(`${API_URL}/api/v1/pagos/metodos`)
      .then(r => r.json())
      .then(data => {
        let methods = Array.isArray(data) ? data : [];
        if (!methods.find(m => m.nombre === 'Transferencia Bancaria')) methods.push({id: 'MET-003', nombre: 'Transferencia Bancaria', estado: 'Activo'});
        if (!methods.find(m => m.nombre === 'Efectivo')) methods.push({id: 'MET-004', nombre: 'Efectivo', estado: 'Activo'});
        setMetodosPago(methods);
      })
      .catch(console.error);
    const user = getTokenData();
    if (!user) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/api/v1/reservas/usuario/${user.correo}`)
      .then(r => r.json())
      .then(data => {
        setReservas(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Cargando reservas...</div>;

  const rateReserva = async (id: string) => {
    const calificacion = prompt('Del 1 al 5, ¿cómo calificarías tu estancia?');
    if (!calificacion || isNaN(Number(calificacion)) || Number(calificacion) < 1 || Number(calificacion) > 5) {
      setToast({ message: 'Ingresa un número válido del 1 al 5', type: 'error' });
      return;
    }
    const comentario = prompt('Deja un breve comentario sobre el sitio:');
    
    try {
      const res = await fetch(`${API_URL}/api/v1/reservas/${id}/calificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calificacion: Number(calificacion), comentario: comentario || '' })
      });
      if (res.ok) {
        setToast({ message: '¡Gracias por tu calificación!', type: 'success' });
        setReservas(prev => prev.map(r => r.id === id ? {...r, calificacion: Number(calificacion), comentario} : r));
      } else {
        setToast({ message: 'Error al guardar la calificación', type: 'error' });
      }
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' });
    }
  };

  const firmarContrato = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/reservas/${id}/firmar-contrato`, {
        method: 'POST',
      });
      if (res.ok) {
        setToast({ message: '¡Contrato firmado exitosamente!', type: 'success' });
        setReservas(prev => prev.map(r => r.id === id ? {...r, contratoFirmado: true} : r));
      } else {
        setToast({ message: 'Error al firmar el contrato', type: 'error' });
      }
    } catch {
      setToast({ message: 'Error de conexión al firmar', type: 'error' });
    }
  };

  const cancelarReserva = async (id: string) => {
    if(!confirm('¿Estás seguro que deseas cancelar esta reserva? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/reservas/${id}/cancelar`, { method: 'POST' });
      if (res.ok) {
        setToast({ message: 'Reserva cancelada correctamente.', type: 'success' });
        setReservas(prev => prev.map(r => r.id === id ? {...r, estado: 'Cancelada'} : r));
      } else {
        setToast({ message: 'Error al cancelar la reserva', type: 'error' });
      }
    } catch {
      setToast({ message: 'Error de conexión al cancelar', type: 'error' });
    }
  };

  const realizarPago = async (e: any) => {
    e.preventDefault();
    setProcesandoPago(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservaId: pagandoReserva.id,
          metodoPagoId: pagoForm.metodoId,
          monto: pagandoReserva.totalPagar,
          requiereFactura: pagoForm.requiereFactura,
          factura: pagoForm.requiereFactura ? { identificacion: pagoForm.identificacion, nombre: pagoForm.nombre, direccion: pagoForm.direccion } : null
        })
      });
      if (res.ok) {
        setToast({ message: 'Pago procesado correctamente.', type: 'success' });
        setReservas(prev => prev.map(r => r.id === pagandoReserva.id ? {...r, estado: 'Confirmada', pagoCompletado: true} : r));
        setPagandoReserva(null);
      } else {
        setToast({ message: 'Error al procesar el pago.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' });
    } finally {
      setProcesandoPago(false);
    }
  };

  if (loading) return <div style={{textAlign:'center', padding:'50px'}}>Cargando reservas...</div>;
  if (!getTokenData()) return <div style={{textAlign:'center', padding:'50px', color: 'var(--text-secondary)'}}>Inicia sesión para ver tus reservas.</div>;
  if (reservas.length === 0) return <div style={{textAlign:'center', padding:'50px', color: 'var(--text-secondary)'}}>No tienes reservas en tu historial aún.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', animation: 'fadeIn 0.3s' }}>
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h2 style={{ marginBottom: '20px', fontSize: '2rem' }}>Historial de Reservas</h2>
      {reservas.map(res => {
        const canRate = new Date(res.fechaFin) < new Date() && !res.calificacion;
        
        // Regla: Cancelación hasta 24h antes del check-in. Si ya pasaron o faltan menos, no se puede cancelar.
        const checkInDate = new Date(res.fechaInicio).getTime();
        const now = new Date().getTime();
        const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);
        const canCancel = hoursUntilCheckIn > 24 && res.estado !== 'Cancelada';
        
        // Mostrar factura siempre que esté Confirmada (independientemente del tiempo de cancelación)
        const showInvoice = res.estado === 'Confirmada';

        return (
          <div key={res.id} style={{ padding: '24px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{res.alojamiento?.nombre || 'Alojamiento Eliminado'}</h3>
              <span style={{ 
                padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
                background: res.estado === 'Cancelada' ? 'rgba(239, 68, 68, 0.1)' : res.estado === 'Confirmada' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: res.estado === 'Cancelada' ? '#EF4444' : res.estado === 'Confirmada' ? '#10B981' : '#F59E0B'
              }}>
                {res.estado}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <p style={{ color: 'var(--text-secondary)' }}><strong>Llegada:</strong> <br/>{res.fechaInicio}</p>
              <p style={{ color: 'var(--text-secondary)' }}><strong>Salida:</strong> <br/>{res.fechaFin}</p>
            </div>
            <p style={{ fontWeight: 'bold', marginBottom: '20px', fontSize: '1.2rem', color: 'var(--accent-color)' }}>Total pagado: ${res.totalPagar}</p>
            
            {res.calificacion ? (
              <div style={{ background: 'rgba(212, 175, 55, 0.05)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--accent-color)', marginBottom: '15px' }}>
                <p style={{ marginBottom: '5px' }}><strong>Tu calificación:</strong> <Star size={16} fill="var(--accent-color)" color="var(--accent-color)" style={{ display:'inline', marginBottom:'-2px' }}/> {res.calificacion} / 5</p>
                <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{res.comentario}"</p>
              </div>
            ) : canRate ? (
              <div style={{ marginBottom: '15px' }}>
                <button className="btn-primary" onClick={() => rateReserva(res.id)} style={{ padding: '8px 20px' }}>Calificar sitio</button>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '15px' }}><Info size={16} /> Podrás calificar después de tu fecha de salida.</p>
            )}

            {/* Contrato y Políticas */}
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>Política de Cancelación</h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {res.politicaCancelacion || 'Cancelación gratuita hasta 24 horas antes del check-in.'}
              </p>
              
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>Contrato de Arrendamiento</h4>
              {res.contratoTerminos ? (
                <>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#999', whiteSpace: 'pre-wrap', maxHeight: '60px', overflowY: 'auto', background: '#111', padding: '10px', borderRadius: '6px' }}>
                    {res.contratoTerminos}
                  </p>
                  {res.contratoFirmado ? (
                    <p style={{ color: '#10B981', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={18} />
                      Contrato firmado digitalmente
                    </p>
                  ) : (
                    <button className="btn-secondary" onClick={() => firmarContrato(res.id)} style={{ padding: '6px 16px', fontSize: '0.9rem' }}>
                      Firmar Contrato
                    </button>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No hay contrato generado para esta reserva.</p>
              )}

              {/* Botón de Pagar */}
              {res.estado === 'Pendiente' && res.contratoFirmado && !res.pagoCompletado && (
                <div style={{ marginTop: '15px' }}>
                  <button className="btn-primary" onClick={() => setPagandoReserva(res)} style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={18} /> Pagar Reserva (${res.totalPagar})
                  </button>
                </div>
              )}
            </div>

            {/* Acciones de Cancelación y Factura */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              {showInvoice && (
                <button 
                  onClick={() => setVerFactura(res)}
                  style={{ background: '#D4AF37', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                >
                  📄 Ver Factura
                </button>
              )}
              {canCancel && (
                <button 
                  onClick={() => cancelarReserva(res.id)} 
                  style={{ background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Cancelar Reserva
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal de Pago */}
      <AnimatePresence>
        {pagandoReserva && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" style={{ zIndex: 10000 }}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="modal-content glass-panel" style={{ maxWidth: '500px', width: '90%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard color="var(--accent-color)" /> Pasarela de Pago
                </h3>
                <button onClick={() => setPagandoReserva(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={24} /></button>
              </div>

              <form onSubmit={realizarPago}>
                <div style={{ background: 'rgba(212, 175, 55, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--accent-color)', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)' }}>A pagar por la reserva:</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>${pagandoReserva.totalPagar}</p>
                </div>

                <div className="form-group">
                  <label>Método de Pago</label>
                  <select 
                    value={pagoForm.metodoId} 
                    onChange={e => setPagoForm({...pagoForm, metodoId: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                  >
                    {metodosPago.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Simulador de Tarjeta si eligen tarjeta (MET-001 o MET-002) */}
                {(pagoForm.metodoId === 'MET-001' || pagoForm.metodoId === 'MET-002') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Número de Tarjeta</label>
                      <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} required onInput={(e: any) => { e.target.value = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '); }} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Expiración</label>
                      <input type="text" placeholder="MM/YY" maxLength={5} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>CVV</label>
                      <input type="text" placeholder="123" maxLength={4} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                )}

                {/* Detalles de Facturación SIEMPRE visibles */}
                <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <h4 style={{ marginBottom: '15px' }}>Datos para Facturación Electrónica</h4>

                <div>
                      <div className="form-group">
                        <label>RUC / Cédula de Identidad</label>
                        <input type="text" value={pagoForm.identificacion} onChange={e => setPagoForm({...pagoForm, identificacion: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
                      </div>
                      <div className="form-group">
                        <label>Nombre / Razón Social</label>
                        <input type="text" value={pagoForm.nombre} onChange={e => setPagoForm({...pagoForm, nombre: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
                      </div>
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label>Dirección (Opcional)</label>
                        <input type="text" value={pagoForm.direccion} onChange={e => setPagoForm({...pagoForm, direccion: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
                      </div>
                </div>
                </div>

                <button type="submit" disabled={procesandoPago} className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1.1rem', marginTop: '10px' }}>
                  {procesandoPago ? 'Procesando pago seguro...' : 'Pagar Ahora'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {verFactura && <FacturaModal reserva={verFactura} onClose={() => setVerFactura(null)} />}
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

  // Estados para Modal de Reserva
  const [bookingItem, setBookingItem] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState<{ nombreCliente: string, emailCliente: string, fechaInicio: string, fechaFin: string, numeroPersonas: number | string }>({ nombreCliente: '', emailCliente: '', fechaInicio: '', fechaFin: '', numeroPersonas: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);

  // Generar imágenes hermosas para el carrusel basadas en el ID para que no cambien en cada render
  const getBeautifulImages = (id: string | number) => {
    const sum = String(id).split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const pool = [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1582719478250-c89404bb8a0e?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=1000'
    ];
    return [
      pool[sum % pool.length],
      pool[(sum + 1) % pool.length],
      pool[(sum + 2) % pool.length],
      pool[(sum + 3) % pool.length]
    ];
  };

  // Obtener datos del backend al cargar la página
  useEffect(() => {
    fetch(`${API_URL}/api/v1/admin/alojamientos`)
      .then(res => res.json())
      .then(data => {
        const alojamientos = Array.isArray(data) ? data.map((item: any, index: number) => ({
          id: item.id || index + 1,
          title: item.nombre ? item.nombre.replace(/ RDA \d+ - /gi, ' - ') : '',
          location: item.destino,
          rating: 4.8, // Valor por defecto
          img: item.imagenUrl || (item.tienePiscina ? '/pool.jpg' : '/villa.jpg'),
          images: getBeautifulImages(item.id),
          type: 'alojamiento',
          subtype: 'Hotel', // Valor por defecto
          description: item.descripcion || `Alojamiento con ${item.habitaciones} habitaciones.`,
          amenities: item.tienePiscina ? ['Piscina', 'Wi-Fi'] : ['Wi-Fi'],
          estado: item.estado || 'Activo',
          habitaciones_disponibles: item.habitaciones_disponibles,
          habitaciones: [
            {
              id: item.id + '-hab',
              alojamientoId: item.id,
              title: 'Habitación Estándar',
              price: item.precioPorNoche,
              capacity: Number(item.capacidadAdultos) + Number(item.capacidadNinos),
              img: item.imagenUrl || '/room.jpg',
              images: getBeautifulImages(item.id + '-hab'),
              type: 'habitacion',
              hotelName: item.nombre ? item.nombre.replace(/ RDA \d+ - /gi, ' - ') : '',
              estado: item.estado || 'Activo'
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

  if (loading) return <div style={{ textAlign: 'center', padding: '50px', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando datos...</div>;

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
          
          {(isAlojamiento ? (item.habitaciones_disponibles === 0 || item.estado !== 'Activo') : item.estado !== 'Activo') && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
              <span style={{ background: '#EF4444', color: 'white', padding: '8px 24px', borderRadius: '4px', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px', transform: 'rotate(-15deg)', border: '2px solid white' }}>
                {item.estado === 'Inactivo' ? 'INACTIVO' : 'LLENO'}
              </span>
            </div>
          )}

          <div style={{ position: 'absolute', top: '15px', left: '15px', background: 'var(--nav-bg)', backdropFilter: 'blur(5px)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 11 }}>
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
                  <button 
                    className="btn-primary" 
                    style={{ padding: '8px 20px', fontSize: '0.9rem', opacity: item.estado !== 'Activo' ? 0.5 : 1, cursor: item.estado !== 'Activo' ? 'not-allowed' : 'pointer' }} 
                    disabled={item.estado !== 'Activo'}
                    onClick={(e) => { 
                   e.stopPropagation(); 
                   if (item.estado !== 'Activo') return;
                   const user = getTokenData();
                   if (!user) {
                     setToast({ message: 'Debe iniciar sesión primero para poder reservar.', type: 'error' });
                     setTimeout(() => window.location.href = '/login', 2500);
                     return;
                   }
                   setBookingItem(item); 
                   setBookingForm(prev => ({...prev, nombreCliente: user.nombre || '', emailCliente: user.correo || ''}));
                 }}>
                   {item.estado !== 'Activo' ? 'No Disponible' : 'Reservar'}
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
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
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
            {getTokenData() && (
              <>
                <button className={`tab-btn ${activeTab === 'mis-reservas' ? 'active' : ''}`} onClick={() => handleTabChange('mis-reservas')} style={{ marginLeft: '10px' }}>
                  Mis Reservas
                </button>
                <button className={`tab-btn ${activeTab === 'mi-perfil' ? 'active' : ''}`} onClick={() => handleTabChange('mi-perfil')}>
                  <User size={18} style={{ display: 'inline', marginBottom: '-4px', marginRight: '6px' }}/> Mi Perfil
                </button>
              </>
            )}
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

      {!selectedHotel && activeTab === 'mis-reservas' && (
        <MisReservas />
      )}

      {!selectedHotel && activeTab === 'mi-perfil' && (
        <MiPerfil />
      )}

      {!selectedHotel && activeTab !== 'mis-reservas' && activeTab !== 'mi-perfil' && (
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

      {/* Modal de Reserva */}
      <AnimatePresence>
        {bookingItem && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px', color: 'black', textAlign: 'left' }}
            >
              <h2 style={{ marginBottom: '10px', fontSize: '1.5rem', fontWeight: 'bold' }}>Reservar {bookingItem.title}</h2>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
                <img src={bookingItem.img} alt={bookingItem.title} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                <div>
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 5px 0', fontSize: '0.95rem' }}>
                    <strong>{bookingItem.hotelName || bookingItem.subtype || 'Alojamiento'}</strong> en {bookingItem.location || 'Destino'}
                  </p>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Tarifa base: ${bookingItem.price} / noche</p>
                </div>
              </div>
              <p style={{ color: '#10B981', fontSize: '0.85rem', marginBottom: '20px', background: 'rgba(16,185,129,0.1)', padding: '8px', borderRadius: '4px' }}>* Precios dinámicos: +30% en temporada alta (Jul, Ago, Dic) y +50% en festivos.</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setBookingLoading(true);
                
                const start = new Date(bookingForm.fechaInicio);
                const end = new Date(bookingForm.fechaFin);
                if (end <= start) {
                  setToast({ message: 'La fecha de fin debe ser mayor a la fecha de inicio', type: 'warning' });
                  setBookingLoading(false);
                  return;
                }

                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                
                let calculatedTotal = 0;
                for (let i = 0; i < diffDays; i++) {
                  const currentDate = new Date(start.getTime() + i * (1000 * 60 * 60 * 24));
                  const month = currentDate.getMonth();
                  const date = currentDate.getDate();
                  let dailyPrice = bookingItem.price;
                  
                  // Festivos: 1 Ene, 1 May, 25 Dic (+50%)
                  if ((month === 0 && date === 1) || (month === 4 && date === 1) || (month === 11 && date === 25)) {
                    dailyPrice *= 1.5;
                  } 
                  // Temporada alta: Jul, Ago, Dic (+30%)
                  else if (month === 6 || month === 7 || month === 11) {
                    dailyPrice *= 1.3;
                  }
                  calculatedTotal += dailyPrice;
                }
                const totalPagar = Math.round(calculatedTotal * 100) / 100;

                try {
                  const res = await fetch(`${API_URL}/api/v1/reservas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...bookingForm,
                      totalPagar,
                      alojamientoId: bookingItem.alojamientoId || bookingItem.id
                    })
                  });
                  
                  if (res.ok) {
                    setToast({ message: '¡Reserva confirmada con éxito! Te contactaremos pronto.', type: 'success' });
                    setBookingItem(null);
                    setBookingForm({ nombreCliente: '', emailCliente: '', fechaInicio: '', fechaFin: '', numeroPersonas: '' });
                  } else {
                    const errorData = await res.json();
                    setToast({ message: `Error: ${errorData.message || 'No se pudo realizar la reserva'}`, type: 'error' });
                  }
                } catch {
                  setToast({ message: 'Error de conexión al servidor.', type: 'error' });
                } finally {
                  setBookingLoading(false);
                }
              }}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                  <input required type="text" placeholder="Nombre completo" value={bookingForm.nombreCliente} onChange={e => setBookingForm({...bookingForm, nombreCliente: e.target.value})} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} />
                  <input required type="number" min="1" max={bookingItem.capacity || 10} placeholder="Personas" value={bookingForm.numeroPersonas} onChange={e => setBookingForm({...bookingForm, numeroPersonas: e.target.value === '' ? '' : Number(e.target.value)})} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} title="Número de personas" />
                </div>
                <input required type="email" placeholder="Correo electrónico" value={bookingForm.emailCliente} onChange={e => setBookingForm({...bookingForm, emailCliente: e.target.value})} style={{ width: '100%', marginBottom: '15px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '6px' }}>Fecha Llegada</label>
                    <input required type="date" value={bookingForm.fechaInicio} onChange={e => setBookingForm({...bookingForm, fechaInicio: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '6px' }}>Fecha Salida</label>
                    <input required type="date" value={bookingForm.fechaFin} onChange={e => setBookingForm({...bookingForm, fechaFin: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }} />
                  </div>
                </div>
                
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '15px', marginBottom: '20px', border: '1px solid #e5e7eb', color: '#374151' }}>
                  {(() => {
                    const s = new Date(bookingForm.fechaInicio);
                    const e = new Date(bookingForm.fechaFin);
                    if (!bookingForm.fechaInicio || !bookingForm.fechaFin || e <= s) {
                      return <div style={{ fontWeight: 'bold' }}>Total aprox: ${bookingItem.price} / noche</div>;
                    }
                    const d = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
                    let t = 0;
                    for(let i=0; i<d; i++){
                      const cur = new Date(s.getTime() + i*86400000);
                      let p = Number(bookingItem.price) || 0;
                      if((cur.getMonth()===0&&cur.getDate()===1)||(cur.getMonth()===4&&cur.getDate()===1)||(cur.getMonth()===11&&cur.getDate()===25)) p*=1.5;
                      else if(cur.getMonth()===6||cur.getMonth()===7||cur.getMonth()===11) p*=1.3;
                      t+=p;
                    }
                    const total = Math.round(t*100)/100;
                    const subtotal = Math.round((total / 1.15)*100)/100;
                    const iva = Math.round((total - subtotal)*100)/100;
                    return (
                      <>
                        <h4 style={{ marginBottom: '10px', color: '#111827' }}>Desglose de la reserva</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                          <span>${bookingItem.price} x {d} {d===1?'noche':'noches'} {total !== bookingItem.price*d ? '(Precios Dinámicos)' : ''}</span>
                          <span>${subtotal}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #d1d5db', paddingBottom: '10px', fontSize: '0.95rem' }}>
                          <span>IVA (15%)</span>
                          <span>${iva}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', color: '#111827' }}>
                          <span>Total</span>
                          <span>${total}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" className="btn-outline" onClick={() => setBookingItem(null)} style={{ padding: '10px 20px', borderRadius: '8px' }}>Cancelar</button>
                    <button type="submit" className="btn-primary" disabled={bookingLoading} style={{ padding: '10px 20px', borderRadius: '8px' }}>
                      {bookingLoading ? 'Procesando...' : 'Confirmar'}
                    </button>
                  </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
  const [formData, setFormData] = useState({ nombre: '', correo: '', contrasena: '', telefono: '', edad: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);

  const pwd = formData.contrasena;
  const hasUpperCase = /[A-Z]/.test(pwd);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
  const hasValidLength = pwd.length >= 8 && pwd.length <= 16;
  const isPasswordValid = hasUpperCase && hasSpecialChar && hasValidLength;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !isPasswordValid) {
      setToast({ message: 'La contraseña no cumple con los requisitos de seguridad.', type: 'error' });
      return;
    }
    setLoading(true);

    const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';
    const payload = isLogin ? { correo: formData.correo, contrasena: formData.contrasena } : { ...formData, edad: formData.edad ? Number(formData.edad) : undefined };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.access_token);
          setToast({ message: `¡Bienvenido ${data.usuario.rol}!`, type: 'success' });
          setTimeout(() => { window.location.href = '/'; }, 1000);
        } else {
          setToast({ message: '¡Registro exitoso! Ahora puedes iniciar sesión.', type: 'success' });
          setIsLogin(true);
        }
      } else {
        setToast({ message: `Error: ${data.message || 'Credenciales incorrectas'}`, type: 'error' });
      }
    } catch {
      setToast({ message: 'Error de conexión con el servidor.', type: 'error' });
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
        {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
            <>
              <input
                type="text"
                placeholder="Nombre Completo"
                required
                className="login-input"
                style={inputStyle}
                value={formData.nombre}
                onChange={(e) => {
                  const val = e.target.value;
                  // Permitir solo letras y espacios
                  if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(val)) {
                    setFormData({...formData, nombre: val});
                  }
                }}
              />
              <div style={{ display: 'flex', gap: '15px' }}>
                <input
                  type="tel"
                  placeholder="Teléfono (10 dígitos)"
                  className="login-input"
                  style={{...inputStyle, flex: 2}}
                  maxLength={10}
                  onInput={(e: any) => { e.target.value = e.target.value.replace(/\D/g, ''); }}
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                />
                <input
                  type="number"
                  placeholder="Edad"
                  className="login-input"
                  style={{...inputStyle, flex: 1}}
                  min="18"
                  value={formData.edad}
                  onChange={(e) => setFormData({...formData, edad: e.target.value})}
                />
              </div>
            </>
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
            style={{...inputStyle, marginBottom: !isLogin ? '10px' : '20px'}}
            value={formData.contrasena}
            onChange={(e) => setFormData({...formData, contrasena: e.target.value})}
            maxLength={16}
          />

          {!isLogin && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Requisitos de la contraseña:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ color: hasUpperCase ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {hasUpperCase ? <CheckCircle2 size={14} /> : <XCircle size={14} />} Al menos 1 mayúscula
                </span>
                <span style={{ color: hasSpecialChar ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {hasSpecialChar ? <CheckCircle2 size={14} /> : <XCircle size={14} />} Al menos 1 carácter especial
                </span>
                <span style={{ color: hasValidLength ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {hasValidLength ? <CheckCircle2 size={14} /> : <XCircle size={14} />} De 8 a 16 caracteres
                </span>
              </div>
            </div>
          )}
          
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
  const [stats, setStats] = useState({ total_alojamientos: 0, reservas_activas: 0, ingresos_totales: 0 });
  const [cancelaciones, setCancelaciones] = useState<any[]>([]);
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);

  // Estado para Gestor de Habitaciones Individuales
  const [roomsModalAlojamiento, setRoomsModalAlojamiento] = useState<any>(null);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [newRoomImageUrl, setNewRoomImageUrl] = useState('');
  const [facturas, setFacturas] = useState<any[]>([]);
  const [todasReservas, setTodasReservas] = useState<any[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState('alojamientos');

  const refreshStats = () => {
    fetch(`${API_URL}/api/v1/admin/dashboard-stats`)
      .then(res => res.json())
      .then(data => {
        if(data) setStats(data);
      })
      .catch(err => console.error(err));
  };

  const handleAprobarReserva = (id: string) => {
    fetch(`${API_URL}/api/v1/reservas/${id}/aprobar`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setToast({ message: data.message, type: 'success' });
        // Recargar datos
        fetch(`${API_URL}/api/v1/reservas/admin/todas`).then(r => r.json()).then(setTodasReservas);
        refreshStats();
        addLog('Reserva Aprobada', `Se aprobó la reserva ${id}`);
      });
  };

  useEffect(() => {
    const savedLogs = localStorage.getItem('adminLogs');
    if (savedLogs) {
      setAdminLogs(JSON.parse(savedLogs));
    }
    
    fetch(`${API_URL}/api/v1/admin/alojamientos`)
      .then(res => res.json())
      .then(data => {
         const cleanData = data.map((item: any) => ({...item, nombre: item.nombre?.replace(/ RDA \d+ - /gi, ' - ')}));
         setAlojamientos(cleanData);
      })
      .catch(err => console.error(err));

    refreshStats();

    fetch(`${API_URL}/api/v1/reservas/admin/todas`)
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) {
          const canceladas = data.filter(r => r.estado === 'Cancelada');
          setCancelaciones(canceladas.map(c => ({
            reservaId: c.id,
            cliente: c.cliente,
            alojamiento: c.alojamiento,
            fechaCancelacion: c.fechaInicio,
            montoPerdido: c.totalPagar,
            politicaCancelacion: 'Flexible (Reembolso Completo)'
          })));

          const pagadas = data.filter(r => r.pagoCompletado || r.estado === 'Confirmada');
          setFacturas(pagadas.map(p => ({
            id: 'FAC-' + p.id.slice(-6).toUpperCase(),
            fechaEmision: p.fechaInicio,
            nombreRazonSocial: p.cliente,
            identificacionCliente: 'N/A',
            reservaId: p.id,
            metodoPago: 'N/A',
            total: p.totalPagar
          })));
        }
      })
      .catch(err => console.error(err));

    fetch(`${API_URL}/api/v1/reservas/admin/todas`)
      .then(res => res.json())
      .then(data => {
         const cleanData = Array.isArray(data) ? data.map((reserva: any) => {
            if(reserva.alojamiento) reserva.alojamiento.nombre = reserva.alojamiento.nombre.replace(/ RDA \d+ - /gi, ' - ');
            return reserva;
         }) : [];
         setTodasReservas(cleanData);
      })
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
      const response = await fetch(`${API_URL}/api/v1/admin/alojamientos/${alojamiento.id}/habitaciones`);
      const data = await response.json();
      setRoomsList(data);
    } catch {
      setToast({ message: 'Error cargando habitaciones', type: 'error' });
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSaveRoom = async (roomData: any) => {
    try {
      if (roomData.id === 'Nueva') {
        const res = await fetch(`${API_URL}/api/v1/admin/alojamientos/${roomsModalAlojamiento.id}/habitaciones`, {
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
        const res = await fetch(`${API_URL}/api/v1/admin/habitaciones/${roomData.id}`, {
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
    } catch {
      setToast({ message: 'Error guardando habitación.', type: 'error' });
    }
  };

  const handleDeleteRoom = async (habId: string) => {
    if (window.confirm('¿Eliminar habitación permanentemente?')) {
      const res = await fetch(`${API_URL}/api/v1/admin/habitaciones/${habId}`, { method: 'DELETE' });
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
        const response = await fetch(`${API_URL}/api/v1/admin/alojamientos/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setAlojamientos(alojamientos.filter(al => al.id !== id));
          addLog('Eliminación', `Se eliminó permanentemente el alojamiento: ${nombre}`);
          setToast({ message: 'Alojamiento eliminado correctamente', type: 'success' });
          refreshStats();
        } else {
          setToast({ message: 'Error al intentar eliminar', type: 'error' });
        }
      } catch {
        setToast({ message: 'Error de conexión', type: 'error' });
      }
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      if (isCreating) {
        const response = await fetch(`${API_URL}/api/v1/admin/alojamientos`, {
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
          setToast({ message: '✨ Alojamiento y Habitaciones creados exitosamente.', type: 'error' });
        }
      } else {
        const response = await fetch(`${API_URL}/api/v1/admin/alojamientos/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
        if (response.ok) {
          const cityMap: any = { 'UBI-001': 'Quito', 'UBI-002': 'Guayaquil', 'UBI-003': 'Cuenca', 'UBI-004': 'Manta', 'UBI-005': 'Baños' };
          setAlojamientos(alojamientos.map(al => al.id === editingItem.id ? { ...al, ...editForm, destino: cityMap[editForm.ubicacionId] || al.destino } : al));
          setEditingItem(null);
          addLog('Modificación', `Se actualizaron los datos del alojamiento ID: ${editingItem.id}`);
          setToast({ message: '✏️ Datos actualizados en todas las tablas correctamente.', type: 'success' });
        }
      }
    } catch {
      setToast({ message: 'Error de conexión con el backend.', type: 'error' });
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
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', background: 'var(--bg-color)', margin: '-40px' }}>
      {/* Sidebar Profesional */}
      <aside style={{ 
        width: '280px', 
        background: 'var(--card-bg)', 
        borderRight: '1px solid var(--border-color)', 
        padding: '30px 20px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        position: 'sticky', top: '80px', height: 'calc(100vh - 80px)', overflowY: 'auto'
      }}>
        <div style={{ marginBottom: '40px', padding: '0 10px' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Admin Panel</h2>
        </div>

        {[
          { id: 'alojamientos', label: 'Alojamientos', icon: <Building size={20} /> },
          { id: 'reservas', label: 'Reservas', icon: <Calendar size={20} /> },
          { id: 'facturacion', label: 'Facturación', icon: <CreditCard size={20} /> },
          { id: 'cancelaciones', label: 'Cancelaciones', icon: <XCircle size={20} /> },
          { id: 'actividad', label: 'Actividad', icon: <Clock size={20} /> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '15px',
              width: '100%', padding: '15px 20px', borderRadius: '12px',
              background: activeAdminTab === tab.id ? 'var(--accent-color)' : 'transparent',
              color: activeAdminTab === tab.id ? 'white' : 'var(--text-secondary)',
              border: 'none', cursor: 'pointer', fontSize: '1.05rem', fontWeight: '500',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', textAlign: 'left',
              boxShadow: activeAdminTab === tab.id ? '0 10px 20px -5px rgba(212,175,55,0.4)' : 'none'
            }}
            onMouseEnter={(e) => { if(activeAdminTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={(e) => { if(activeAdminTab !== tab.id) e.currentTarget.style.background = 'transparent' }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '30px 20px', overflowX: 'hidden' }}>
        {/* Header Dashboard */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '50px', flexWrap: 'wrap', gap: '20px' }}>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 style={{ fontSize: '2.5rem', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
              Bienvenido, {user.nombre} <span style={{ fontSize: '1.5rem', animation: 'wave 2s infinite' }}>👋</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>Aquí está un resumen de lo que pasa en LuxeStays hoy.</p>
          </motion.div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <a href={`${API_URL}/api/docs`} target="_blank" rel="noreferrer" className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', textDecoration: 'none', borderRadius: '12px' }}>
              <Terminal size={18} /> API Swagger
            </a>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '8px 20px 8px 8px', borderRadius: '40px', display: 'flex', alignItems: 'center', gap: '15px' }}>
               <img src={`https://ui-avatars.com/api/?name=${user.nombre}&background=d4af37&color=fff&bold=true`} style={{ borderRadius: '50%', width: '40px' }} alt="Admin" />
               <div>
                 <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>Admin</p>
               </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de Estadísticas (Rediseñadas) */}
        {activeAdminTab === 'alojamientos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '50px' }}>
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgba(212,175,55,0.1)' }} className="card" style={{ padding: '30px', background: 'linear-gradient(145deg, var(--card-bg) 0%, rgba(212,175,55,0.05) 100%)', border: '1px solid var(--border-color)', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>Alojamientos</h3>
                  <p style={{ fontSize: '3.5rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.total_alojamientos}</p>
                </div>
                <div style={{ background: 'rgba(212,175,55,0.1)', padding: '15px', borderRadius: '16px' }}>
                  <Building size={32} color="var(--accent-color)" />
                </div>
              </div>
           </motion.div>

           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgba(59,130,246,0.1)' }} className="card" style={{ padding: '30px', background: 'linear-gradient(145deg, var(--card-bg) 0%, rgba(59,130,246,0.05) 100%)', border: '1px solid var(--border-color)', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>Reservas Activas</h3>
                  <p style={{ fontSize: '3.5rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.reservas_activas}</p>
                </div>
                <div style={{ background: 'rgba(59,130,246,0.1)', padding: '15px', borderRadius: '16px' }}>
                  <Calendar size={32} color="#3B82F6" />
                </div>
              </div>
           </motion.div>

           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgba(16,185,129,0.1)' }} className="card" style={{ padding: '30px', background: 'linear-gradient(145deg, var(--card-bg) 0%, rgba(16,185,129,0.05) 100%)', border: '1px solid var(--border-color)', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>Ingresos Mensuales</h3>
                  <p style={{ fontSize: '3.5rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', lineHeight: 1 }}>${Number(stats.ingresos_totales).toLocaleString()}</p>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.1)', padding: '15px', borderRadius: '16px' }}>
                  <DollarSign size={32} color="#10B981" />
                </div>
              </div>
           </motion.div>
        </div>
        )}

        {/* CONTENIDO PRINCIPAL SEGUN TAB */}
        <AnimatePresence mode="wait">
      {activeAdminTab === 'alojamientos' && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Gestión de Alojamientos</h2>
          <button className="btn-primary" onClick={handleCreateClick}>
            <Plus size={18} /> Nuevo Alojamiento
          </button>
        </div>
        
        <div style={{ overflowX: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '15px 10px' }}>ID</th>
                <th style={{ padding: '15px 10px' }}>Nombre</th>
                <th style={{ padding: '15px 10px' }}>Destino</th>
                <th style={{ padding: '15px 10px' }}>Propietario</th>
                <th style={{ padding: '15px 10px' }}>Estado</th>
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
                    <td style={{ padding: '15px 10px' }}>
                      <select 
                        value={al.estado || 'Activo'}
                        onChange={(e) => {
                          const newEstado = e.target.value;
                          fetch(`${API_URL}/api/v1/admin/alojamientos/${al.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ estado: newEstado })
                          }).then(res => {
                            if(res.ok) {
                              setAlojamientos(prev => prev.map((a: any) => a.id === al.id ? {...a, estado: newEstado} : a));
                              setToast({ message: 'Estado del alojamiento actualizado', type: 'success' });
                              addLog('Actualización', `Alojamiento ${al.nombre} cambió a estado ${newEstado}`);
                              refreshStats();
                            } else setToast({ message: 'Error actualizando estado', type: 'error' });
                          });
                        }}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: al.estado === 'Inactivo' ? '#FEE2E2' : '#D1FAE5', color: al.estado === 'Inactivo' ? '#991B1B' : '#065F46' }}
                      >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                    </td>
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
      </motion.div>
      )}

      {/* Reporte de Cancelaciones */}
      {activeAdminTab === 'cancelaciones' && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '30px', marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#EF4444' }}>Reporte de Cancelaciones</h2>
        </div>
        <div style={{ overflowX: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '15px 10px' }}>Reserva ID</th>
                <th style={{ padding: '15px 10px' }}>Cliente</th>
                <th style={{ padding: '15px 10px' }}>Alojamiento</th>
                <th style={{ padding: '15px 10px' }}>Fechas</th>
                <th style={{ padding: '15px 10px' }}>Monto Perdido</th>
                <th style={{ padding: '15px 10px' }}>Política</th>
              </tr>
            </thead>
            <tbody>
              {cancelaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No hay reservas canceladas.</td>
                </tr>
              ) : (
                cancelaciones.map((c: any) => (
                  <tr key={c.reservaId} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '15px 10px', fontWeight: '600', color: 'var(--text-secondary)' }}>{c.reservaId}</td>
                    <td style={{ padding: '15px 10px', fontWeight: '500' }}>{c.cliente}</td>
                    <td style={{ padding: '15px 10px' }}>{c.alojamiento}</td>
                    <td style={{ padding: '15px 10px' }}>{c.fechaEntrada} a {c.fechaSalida}</td>
                    <td style={{ padding: '15px 10px', color: '#EF4444', fontWeight: 'bold' }}>${c.precioTotal}</td>
                    <td style={{ padding: '15px 10px' }}>
                      <span style={{ fontSize: '0.85rem', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '4px' }}>
                        {c.politicaCancelacion}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      )}

      {/* Tabla de Facturación y Pagos */}
      {activeAdminTab === 'facturacion' && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '30px', marginTop: '10px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#10B981' }}>Facturación y Pagos</h2>
        </div>
        <div style={{ overflowX: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '15px 10px' }}>Factura Nº</th>
                <th style={{ padding: '15px 10px' }}>Fecha</th>
                <th style={{ padding: '15px 10px' }}>Cliente</th>
                <th style={{ padding: '15px 10px' }}>RUC / CI</th>
                <th style={{ padding: '15px 10px' }}>Reserva</th>
                <th style={{ padding: '15px 10px' }}>Método</th>
                <th style={{ padding: '15px 10px' }}>Total Pagado</th>
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No hay facturas emitidas aún.</td>
                </tr>
              ) : (
                facturas.map((fac: any) => (
                  <tr key={fac.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '15px 10px', fontWeight: 'bold' }}>{fac.numeroFactura}</td>
                    <td style={{ padding: '15px 10px' }}>{new Date(fac.fechaEmision).toLocaleString()}</td>
                    <td style={{ padding: '15px 10px' }}>{fac.nombreRazonSocial}</td>
                    <td style={{ padding: '15px 10px' }}>{fac.identificacionCliente}</td>
                    <td style={{ padding: '15px 10px', color: '#3B82F6', fontWeight: 'bold' }}>{fac.reservaId}</td>
                    <td style={{ padding: '15px 10px' }}>{fac.metodoPago}</td>
                    <td style={{ padding: '15px 10px', fontWeight: 'bold', color: '#10B981' }}>${Number(fac.total).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      )}

      {/* Gestión de Todas las Reservas */}
      {activeAdminTab === 'reservas' && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '30px', marginTop: '10px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-color)' }}>Gestión de Reservas</h2>
        </div>
        <div style={{ overflowX: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '15px 10px' }}>ID Reserva</th>
                <th style={{ padding: '15px 10px' }}>Cliente</th>
                <th style={{ padding: '15px 10px' }}>Alojamiento</th>
                <th style={{ padding: '15px 10px' }}>Fechas</th>
                <th style={{ padding: '15px 10px' }}>Total</th>
                <th style={{ padding: '15px 10px' }}>Estado</th>
                <th style={{ padding: '15px 10px' }}>Pago/Contrato</th>
                <th style={{ padding: '15px 10px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {todasReservas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No hay reservas registradas aún.</td>
                </tr>
              ) : (
                todasReservas.map((res: any) => (
                  <tr key={res.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '15px 10px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{res.id}</td>
                    <td style={{ padding: '15px 10px' }}>{res.cliente || 'Desconocido'}</td>
                    <td style={{ padding: '15px 10px', fontWeight: '500' }}>{res.alojamiento}</td>
                    <td style={{ padding: '15px 10px' }}>{new Date(res.fechaInicio).toLocaleDateString()} a {new Date(res.fechaFin).toLocaleDateString()}</td>
                    <td style={{ padding: '15px 10px', fontWeight: 'bold', color: '#10B981' }}>${Number(res.totalPagar).toFixed(2)}</td>
                    <td style={{ padding: '15px 10px' }}>
                      <span style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', 
                        background: res.estado === 'Confirmada' ? 'rgba(16, 185, 129, 0.1)' : res.estado === 'Cancelada' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: res.estado === 'Confirmada' ? '#10B981' : res.estado === 'Cancelada' ? '#EF4444' : '#F59E0B'
                      }}>
                        {res.estado}
                      </span>
                    </td>
                    <td style={{ padding: '15px 10px', fontSize: '0.9rem' }}>
                      {res.pagoCompletado ? <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓ Pagado</span> : res.contratoFirmado ? <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>✎ Contrato Firmado</span> : <span style={{ color: '#EF4444', fontWeight: 'bold' }}>⏳ Pendiente</span>}
                    </td>
                    <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                      {res.estado !== 'Confirmada' && res.estado !== 'Cancelada' && (
                        <button 
                          onClick={() => handleAprobarReserva(res.id)}
                          style={{
                            background: '#10B981', color: 'white', border: 'none', borderRadius: '6px',
                            padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold'
                          }}>
                          Aprobar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      )}

      {/* Historial de Actividad */}
      {activeAdminTab === 'actividad' && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '30px', marginTop: '10px' }}>
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
      </motion.div>
      )}
      </AnimatePresence>

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
                          <th style={{ padding: '10px' }}>Estado</th>
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
                            <td style={{ padding: '15px 10px' }}>
                              <select 
                                value={room.estado || 'Activo'}
                                onChange={(e) => {
                                  const newEstado = e.target.value;
                                  fetch(`${API_URL}/api/v1/admin/habitaciones/${room.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ estado: newEstado })
                                  }).then(res => {
                                    if(res.ok) {
                                      setRoomsList(prev => prev.map((r: any) => r.id === room.id ? {...r, estado: newEstado} : r));
                                      setToast({ message: 'Estado de habitación actualizado', type: 'success' });
                                      addLog('Actualización', `Habitación ${room.nombre} cambió a estado ${newEstado}`);
                                    } else setToast({ message: 'Error actualizando estado', type: 'error' });
                                  });
                                }}
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: room.estado === 'Inactivo' ? '#FEE2E2' : room.estado === 'Reservado' ? '#FEF3C7' : '#D1FAE5', color: room.estado === 'Inactivo' ? '#991B1B' : room.estado === 'Reservado' ? '#92400E' : '#065F46' }}
                              >
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                                <option value="Reservado">Reservado</option>
                              </select>
                            </td>
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

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
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
