import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Crown, Compass, CalendarCheck, ShieldCheck, User, LogOut, LogIn } from 'lucide-react';

interface NavbarProps {
  currentView: 'explore' | 'my-reservations' | 'admin';
  onNavigate: (view: 'explore' | 'my-reservations' | 'admin') => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenAuth }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <nav className="navbar">
      {/* Brand Logo */}
      <div
        onClick={() => onNavigate('explore')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #0B132B 0%, #1C2541 100%)',
            color: '#D4AF37',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            border: '1px solid #D4AF37',
          }}
        >
          <Crown size={22} />
        </div>
        <div>
          <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '0.04em', color: '#0B132B' }}>
            LUXE<span style={{ color: '#D4AF37' }}>STAYS</span>
          </span>
          <span
            style={{
              display: 'block',
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#8C731A',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Ecuador Hospitality
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onNavigate('explore')}
          className={`tab-btn ${currentView === 'explore' ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontSize: '0.9rem' }}
        >
          <Compass size={17} />
          Explorar
        </button>

        {isAuthenticated && (
          <button
            onClick={() => onNavigate('my-reservations')}
            className={`tab-btn ${currentView === 'my-reservations' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontSize: '0.9rem' }}
          >
            <CalendarCheck size={17} />
            Mis Reservas
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className={`tab-btn ${currentView === 'admin' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontSize: '0.9rem' }}
          >
            <ShieldCheck size={17} />
            Administración
          </button>
        )}
      </div>

      {/* User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0B132B' }}>{user?.nombre}</div>
              <span
                className={`badge ${
                  isAdmin ? 'badge-gold' : 'badge-confirmed'
                }`}
                style={{ fontSize: '0.7rem', padding: '2px 8px' }}
              >
                {user?.rol || 'Cliente'}
              </span>
            </div>

            <button
              onClick={logout}
              title="Cerrar Sesión"
              className="btn-outline btn-sm"
              style={{ padding: '8px 12px', borderColor: '#E5E7EB' }}
            >
              <LogOut size={16} />
              <span style={{ fontSize: '0.85rem' }}>Salir</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onOpenAuth('login')}
              className="btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <LogIn size={16} />
              Iniciar Sesión
            </button>

            <button
              onClick={() => onOpenAuth('register')}
              className="btn-gold btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <User size={16} />
              Registrarse
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
