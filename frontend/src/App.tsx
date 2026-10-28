import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ColdStartBanner } from './components/common/ColdStartBanner';
import { AuthModal } from './components/auth/AuthModal';
import { HomePage } from './pages/HomePage';
import { MyReservationsPage } from './pages/MyReservationsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

type ViewType = 'explore' | 'my-reservations' | 'admin';

const MainLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('explore');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const { isAuthenticated } = useAuth();

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleNavigate = (view: ViewType) => {
    if (view === 'my-reservations' && !isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B132B] text-gray-100 font-sans selection:bg-[#D4AF37] selection:text-[#0B132B]">
      {/* Banner de Latencia / Cold Start de Render */}
      <ColdStartBanner />

      {/* Barra de Navegación Principal */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
      />

      {/* Contenido Dinámico de la Vista */}
      <div className="flex-1">
        {currentView === 'explore' && <HomePage />}
        {currentView === 'my-reservations' && <MyReservationsPage />}
        {currentView === 'admin' && <AdminDashboardPage />}
      </div>

      {/* Pie de Página */}
      <Footer />

      {/* Modal de Autenticación Centralizado */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
