import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout';
import { ErrorBoundary } from './components/ui';
import { api, getAuthToken } from './api/client';
import { UsuarioSession } from './api/types';
import { CatalogPage } from './pages/CatalogPage/CatalogPage';
import { HotelDetailPage } from './pages/HotelDetailPage/HotelDetailPage';
import { CheckoutPage } from './pages/CheckoutPage/CheckoutPage';
import { LoginPage } from './pages/AuthPage/LoginPage';
import { RegisterPage } from './pages/AuthPage/RegisterPage';
import { MyBookingsPage } from './pages/MyBookingsPage/MyBookingsPage';
import { BookingDetailPage } from './pages/BookingDetailPage/BookingDetailPage';
import { UserProfilePage } from './pages/UserProfilePage/UserProfilePage';
import { AdminPage } from './pages/AdminPage/AdminPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  const [user, setUser] = useState<UsuarioSession | null>(null);

  useEffect(() => {
    // Si hay un token guardado, consultar perfil /auth/me
    const token = getAuthToken();
    if (token) {
      api
        .get<UsuarioSession>('/auth/me')
        .then((userData) => setUser(userData))
        .catch(() => {
          // Token expirado o inválido
          setUser(null);
        });
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MainLayout currentUser={user} onLogout={() => setUser(null)}>
            <Routes>
              <Route path="/" element={<CatalogPage />} />
              <Route path="/buscar" element={<CatalogPage />} />
              <Route path="/alojamiento/:id" element={<HotelDetailPage />} />
              <Route path="/reservar" element={<CheckoutPage currentUser={user} />} />
              <Route path="/login" element={<LoginPage onLoginSuccess={(u) => setUser(u)} />} />
              <Route path="/registro" element={<RegisterPage onLoginSuccess={(u) => setUser(u)} />} />
              <Route path="/mis-reservas" element={<MyBookingsPage currentUser={user} />} />
              <Route path="/mis-reservas/:id" element={<BookingDetailPage currentUser={user} />} />
              <Route path="/perfil" element={<UserProfilePage currentUser={user} onUserUpdate={(u) => setUser(u)} />} />
              <Route path="/admin" element={<AdminPage currentUser={user} />} />
              <Route path="/admin/recepcion" element={<AdminPage currentUser={user} />} />
              <Route path="*" element={<CatalogPage />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
