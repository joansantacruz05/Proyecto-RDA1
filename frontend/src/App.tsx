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
              <Route path="*" element={<CatalogPage />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
