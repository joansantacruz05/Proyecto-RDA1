import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Crown, User, LogOut, ShieldCheck, Calendar } from 'lucide-react';
import { Button } from '../ui/Button/Button';
import { getAuthToken, removeAuthToken } from '../../api/client';
import { UsuarioSession } from '../../api/types';
import styles from './Navbar.module.css';

interface NavbarProps {
  currentUser?: UsuarioSession | null | undefined;
  onOpenLoginModal?: (() => void) | undefined;
  onLogout?: (() => void) | undefined;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenLoginModal,
  onLogout,
}) => {
  const navigate = useNavigate();
  const token = getAuthToken();
  const isAuthenticated = Boolean(token && currentUser);
  const isAdmin = currentUser?.rol?.toLowerCase().includes('admin');

  const handleLogoutClick = () => {
    removeAuthToken();
    if (onLogout) {
      onLogout();
    }
    navigate('/');
  };

  return (
    <header className={styles.navbar}>
      <div className={`container ${styles.inner}`}>
        {/* Brand Logo */}
        <Link to="/" className={styles.logoGroup}>
          <div className={styles.logoIcon}>
            <Crown size={22} />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>LuxeStays</span>
            <span className={styles.brandSubtitle}>Ecuador Hospitality</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className={styles.navLinks}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
            }
          >
            Alojamientos
          </NavLink>
          {isAuthenticated && (
            <NavLink
              to="/mis-reservas"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={15} />
                Mis Reservas
              </span>
            </NavLink>
          )}
          {isAuthenticated && isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={15} color="#C9A227" />
                Panel Admin
              </span>
            </NavLink>
          )}
        </nav>

        {/* Right Group: Currency & Auth */}
        <div className={styles.rightGroup}>
          <div className={styles.currencyPill} title="Moneda oficial de curso legal en Ecuador">
            <span className={styles.flag}>🇪🇨</span>
            <span>USD</span>
          </div>

          {currentUser ? (
            <div className={styles.userMenu}>
              <Link to="/perfil" className={styles.avatar} title={`Perfil de ${currentUser.nombre}`}>
                {currentUser.nombre.charAt(0).toUpperCase()}
              </Link>
              <span className={styles.userName}>{currentUser.nombre.split(' ')[0]}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogoutClick}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </Button>
            </div>
          ) : (
            <Button
              variant="gold"
              size="sm"
              icon={<User size={16} />}
              onClick={onOpenLoginModal ? onOpenLoginModal : () => navigate('/login')}
            >
              Iniciar Sesión
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
