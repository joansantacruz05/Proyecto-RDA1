import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Componente Button de LuxeStays', () => {
  it('debe renderizar el texto del botón correctamente', () => {
    render(<Button variant="primary">Reservar Ahora</Button>);
    expect(screen.getByRole('button', { name: /reservar ahora/i })).toBeInTheDocument();
  });

  it('debe mostrar estado de carga y deshabilitarse cuando loading=true', () => {
    render(<Button loading variant="gold">Confirmar</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(screen.getByText(/cargando.../i)).toBeInTheDocument();
  });
});

