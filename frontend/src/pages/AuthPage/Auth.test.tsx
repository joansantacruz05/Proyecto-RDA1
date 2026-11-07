import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { MemoryRouter } from 'react-router-dom';

describe('Fase 4: Autenticación de Huésped (Login y Registro)', () => {
  it('LoginPage debe renderizar campos de correo, contraseña y enlace a registro', () => {
    render(
      <MemoryRouter>
        <LoginPage onLoginSuccess={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    expect(screen.getByText(/Regístrate aquí/i)).toBeInTheDocument();
  });

  it('LoginPage debe mostrar error si se envía vacío', () => {
    render(
      <MemoryRouter>
        <LoginPage onLoginSuccess={vi.fn()} />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByRole('button', { name: /Iniciar Sesión/i });
    fireEvent.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/Por favor ingrese un correo/i);
  });

  it('RegisterPage debe renderizar campos de nombre, correo, teléfono y contraseña', () => {
    render(
      <MemoryRouter>
        <RegisterPage onLoginSuccess={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Crear Cuenta' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrarme/i })).toBeInTheDocument();
  });
});
