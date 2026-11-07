import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { UsuarioSession } from '../../api/types';

interface MainLayoutProps {
  children: React.ReactNode;
  currentUser?: UsuarioSession | null | undefined;
  onOpenLoginModal?: (() => void) | undefined;
  onLogout?: (() => void) | undefined;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentUser,
  onOpenLoginModal,
  onLogout,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        currentUser={currentUser}
        onOpenLoginModal={onOpenLoginModal}
        onLogout={onLogout}
      />
      <main style={{ flex: 1, paddingBottom: 'var(--space-12)' }}>{children}</main>
      <Footer />
    </div>
  );
};
