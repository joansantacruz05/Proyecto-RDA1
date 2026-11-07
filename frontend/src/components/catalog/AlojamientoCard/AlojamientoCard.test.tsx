import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AlojamientoCard } from './AlojamientoCard';
import { AlojamientoItem } from '../../../api/types';

const mockHotel: AlojamientoItem = {
  id: 'HTL-UIO-001',
  nombre: 'Palacio San Martín Colonial',
  destino: 'Quito',
  estrellas: 5,
  precioPorNoche: '175.00',
  descripcion: 'Hospedaje de lujo en el Centro Histórico de Quito.',
  tienePiscina: true,
  permitePaquete: true,
};

describe('Componente AlojamientoCard', () => {
  it('debe renderizar el nombre, destino y precio desde por noche', () => {
    render(
      <BrowserRouter>
        <AlojamientoCard alojamiento={mockHotel} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Palacio San Martín Colonial')).toBeInTheDocument();
    expect(screen.getByText('Quito')).toBeInTheDocument();
    expect(screen.getByText(/175/)).toBeInTheDocument();
    expect(screen.getByText(/Ver disponibilidad/i)).toBeInTheDocument();
  });

  it('debe mostrar los badges de Piscina y Exclusivo Luxe', () => {
    render(
      <BrowserRouter>
        <AlojamientoCard alojamiento={mockHotel} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Piscina')).toBeInTheDocument();
    expect(screen.getByText(/Exclusivo Luxe/i)).toBeInTheDocument();
  });
});

