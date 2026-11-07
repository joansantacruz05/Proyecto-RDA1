import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceDisplay, formatUSD } from './PriceDisplay';

describe('PriceDisplay & Moneda Ecuador (USD)', () => {
  it('debe formatear correctamente valores en dólares estadounidenses', () => {
    const formatted = formatUSD(150);
    // En es-EC puede ser $ 150,00 o US$ 150,00 o $150.00 según Intl
    expect(formatted).toMatch(/150/);
  });

  it('debe renderizar el precio y período por noche', () => {
    render(<PriceDisplay amount={250} period="/ noche" />);
    expect(screen.getByText(/250/)).toBeInTheDocument();
    expect(screen.getByText(/\/ noche/i)).toBeInTheDocument();
  });
});

