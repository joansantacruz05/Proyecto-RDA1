import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CancellationTimeline } from './CancellationTimeline';

describe('Componente CancellationTimeline (Línea de Tiempo en 3 Tramos)', () => {
  it('debe renderizar los tres tramos de política de cancelación', () => {
    render(<CancellationTimeline checkinHour="15:00" checkoutHour="11:00" />);

    expect(screen.getByText(/Políticas de Cancelación y Estancia/i)).toBeInTheDocument();
    expect(screen.getByText(/Hasta 48h antes/i)).toBeInTheDocument();
    expect(screen.getByText(/Reembolso Total \(100%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Entre 48h y 24h/i)).toBeInTheDocument();
    expect(screen.getByText(/Reembolso Parcial \(50%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Menos de 24h/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin Devolución \(0%\)/i)).toBeInTheDocument();
  });

  it('debe mostrar 14:00 check-in y 11:00 check-out por defecto', () => {
    render(<CancellationTimeline />);

    expect(screen.getByText(/Check-in: desde las 14:00/i)).toBeInTheDocument();
    expect(screen.getByText(/Check-out: hasta las 11:00/i)).toBeInTheDocument();
  });

  it('debe mostrar los horarios configurados de check-in y check-out', () => {
    render(<CancellationTimeline checkinHour="16:00" checkoutHour="12:00" />);

    expect(screen.getByText(/Check-in: desde las 16:00/i)).toBeInTheDocument();
    expect(screen.getByText(/Check-out: hasta las 12:00/i)).toBeInTheDocument();
  });
});

