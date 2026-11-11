import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckoutStepper } from './CheckoutStepper';
import { ReservationSummary } from './ReservationSummary';
import { Step1Billing } from './Step1Billing';
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

describe('Fase 3: Asistente de Checkout y Pasos de Reserva', () => {
  describe('CheckoutStepper', () => {
    it('debe renderizar los 3 pasos con los textos oficiales', () => {
      render(<CheckoutStepper currentStep={1} />);
      expect(screen.getByText('Paso 1')).toBeInTheDocument();
      expect(screen.getByText('Facturación')).toBeInTheDocument();
      expect(screen.getByText('Paso 2')).toBeInTheDocument();
      expect(screen.getByText('Pago seguro')).toBeInTheDocument();
      expect(screen.getByText('Paso 3')).toBeInTheDocument();
      expect(screen.getByText('Confirmación')).toBeInTheDocument();
    });

    it('debe marcar el paso actual con aria-current="step"', () => {
      const { container } = render(<CheckoutStepper currentStep={2} />);
      const activeStep = container.querySelector('[aria-current="step"]');
      expect(activeStep).toBeInTheDocument();
      expect(activeStep).toHaveTextContent('Pago seguro');
    });
  });

  describe('ReservationSummary', () => {
    it('debe mostrar el desglose tributario oficial de Ecuador (Hospedaje, IVA 15%, Tasa municipal)', () => {
      const mockHotel = {
        id: 'htl-1',
        nombre: 'Hotel Oro Verde Guayaquil',
        ciudad: 'Guayaquil',
        estrellas: 5,
      };

      render(
        <ReservationSummary
          hotel={mockHotel}
          checkin="2026-11-20"
          checkout="2026-11-22"
          adults={2}
          rooms={1}
          roomName="Suite Ejecutiva"
          subtotal={200}
          iva={30}
          tasaMunicipal={4}
          total={234}
        />,
      );

      expect(screen.getByText('Hotel Oro Verde Guayaquil')).toBeInTheDocument();
      expect(screen.getByText('Suite Ejecutiva')).toBeInTheDocument();
      expect(screen.getByText('2026-11-20')).toBeInTheDocument();
      expect(screen.getByText('2026-11-22')).toBeInTheDocument();
      expect(screen.getByText('Desde las 14:00 (Guayaquil)')).toBeInTheDocument();
      expect(screen.getByText('Hasta las 11:00 (Guayaquil)')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
      expect(screen.getByText('USD 2/noche')).toBeInTheDocument();
      expect(screen.getByText(/234/)).toBeInTheDocument();
    });
  });

  describe('Step1Billing (Facturación e Identificación)', () => {
    it('debe renderizar las 4 tarjetas de tipo de documento', () => {
      render(
        <Step1Billing
          currentUser={null}
          onProceed={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText('Cédula')).toBeInTheDocument();
      expect(screen.getByText('RUC')).toBeInTheDocument();
      expect(screen.getByText('Pasaporte')).toBeInTheDocument();
      expect(screen.getByText('Consumidor Final')).toBeInTheDocument();
    });

    it('al seleccionar Consumidor Final autocompleta con 9999999999999', () => {
      const { container } = render(
        <Step1Billing
          currentUser={null}
          onProceed={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const cfCard = screen.getByText('Consumidor Final').closest('div');
      if (cfCard) {
        fireEvent.click(cfCard);
      }

      const idInput = container.querySelector('#identificacion') as HTMLInputElement;
      expect(idInput.value).toBe('9999999999999');
    });

    it('no muestra errores antes de que los campos sean tocados', () => {
      render(
        <Step1Billing
          currentUser={null}
          onProceed={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText(/Cédula ecuatoriana no válida/i)).not.toBeInTheDocument();
    });
  });
});
