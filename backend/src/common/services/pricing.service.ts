import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PriceBreakdownResult {
  nights: number;
  subtotal: number;
  iva: number;
  tasaMunicipal: number;
  total: number;
  subtotalStr: string;
  ivaStr: string;
  tasaMunicipalStr: string;
  totalStr: string;
  nightlyRates: Array<{
    date: string;
    basePrice: number;
    multiplier: number;
    rate: number;
  }>;
}

@Injectable()
export class PricingService {
  private readonly defaultIvaRate: number;
  private readonly defaultTasaMunicipal: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultIvaRate = parseFloat(this.configService.get('IVA_RATE') || '0.15');
    this.defaultTasaMunicipal = parseFloat(this.configService.get('TASA_MUNICIPAL') || '2.00');
  }

  /**
   * Valida rango de fechas para estancia hotelera
   */
  validateDates(checkinStr: string, checkoutStr: string): { checkin: Date; checkout: Date; nights: number } {
    if (!checkinStr || !checkoutStr) {
      throw new BadRequestException('Las fechas de entrada y salida son requeridas.');
    }

    const checkin = new Date(`${checkinStr}T14:00:00-05:00`);
    const checkout = new Date(`${checkoutStr}T11:00:00-05:00`);

    if (isNaN(checkin.getTime()) || isNaN(checkout.getTime())) {
      throw new BadRequestException('Formato de fecha inválido. Utilice formato YYYY-MM-DD.');
    }

    if (checkout.getTime() <= checkin.getTime()) {
      throw new BadRequestException('La fecha de salida debe ser estrictamente posterior a la fecha de entrada.');
    }

    // Calcular noches
    const diffMs = checkout.getTime() - checkin.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      throw new BadRequestException('La estancia debe ser de al menos 1 noche.');
    }

    if (nights > 90) {
      throw new BadRequestException('La estancia no puede exceder los 90 días.');
    }

    return { checkin, checkout, nights };
  }

  /**
   * Calcula desglose exacto de precio con recargos de temporada y feriados ecuatorianos
   */
  calculatePrice(
    basePricePerNight: number,
    checkinStr: string,
    checkoutStr: string,
    numRooms: number = 1,
  ): PriceBreakdownResult {
    const { checkin, checkout, nights } = this.validateDates(checkinStr, checkoutStr);

    const nightlyRates: Array<{ date: string; basePrice: number; multiplier: number; rate: number }> = [];
    let subtotalCents = 0;

    const curr = new Date(checkin);
    // Cada noche (exceptuando el día de check-out)
    for (let i = 0; i < nights; i++) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const month = curr.getMonth(); // 6=Julio, 7=Agosto, 11=Diciembre

      let multiplier = 1.0;
      // Feriados nacionales: 1 Ene, 1 May, 25 Dic (+50%)
      if ((mm === '01' && dd === '01') || (mm === '05' && dd === '01') || (mm === '12' && dd === '25')) {
        multiplier = 1.5;
      } else if (month === 6 || month === 7 || month === 11) {
        // Temporada alta (+30%)
        multiplier = 1.3;
      }

      const nightRate = basePricePerNight * multiplier * numRooms;
      const nightCents = Math.round(nightRate * 100);
      subtotalCents += nightCents;

      nightlyRates.push({
        date: dateStr,
        basePrice: basePricePerNight,
        multiplier,
        rate: Number((nightCents / 100).toFixed(2)),
      });

      curr.setDate(curr.getDate() + 1);
    }

    const subtotal = Number((subtotalCents / 100).toFixed(2));
    const iva = Number((subtotal * this.defaultIvaRate).toFixed(2));
    const tasaMunicipal = Number((nights * this.defaultTasaMunicipal * numRooms).toFixed(2));
    const total = Number((subtotal + iva + tasaMunicipal).toFixed(2));

    return {
      nights,
      subtotal,
      iva,
      tasaMunicipal,
      total,
      subtotalStr: subtotal.toFixed(2),
      ivaStr: iva.toFixed(2),
      tasaMunicipalStr: tasaMunicipal.toFixed(2),
      totalStr: total.toFixed(2),
      nightlyRates,
    };
  }
}
