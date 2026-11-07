import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyBookingsPage } from './MyBookingsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Fase 4: Portal del Huésped - Mis Reservas', () => {
  it('debe solicitar inicio de sesión si el usuario no está autenticado', () => {
    render(<MyBookingsPage currentUser={null} />, { wrapper: createWrapper() });
    expect(screen.getByText(/Inicia sesión para ver tus reservas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
  });

  it('debe renderizar las 3 pestañas cuando el usuario está autenticado', () => {
    // Simular token guardado
    localStorage.setItem('luxestays_auth_token', 'mock_jwt_token');

    const mockUser = {
      id: 'usr-1',
      nombre: 'Juan Pérez',
      correo: 'juan@luxestays.ec',
      rol: 'CLIENTE',
    };

    render(<MyBookingsPage currentUser={mockUser} />, { wrapper: createWrapper() });

    expect(screen.getByRole('tab', { name: /Próximas y en Curso/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Estadías Pasadas/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Canceladas/i })).toBeInTheDocument();
  });
});
