import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEmail,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Obtiene la fecha actual en America/Guayaquil en formato YYYY-MM-DD
 * Sin usar new Date('YYYY-MM-DD') que desfasa un día por UTC.
 */
export function getTodayGuayaquil(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const pMap: Record<string, string> = {};
  for (const p of parts) {
    pMap[p.type] = p.value;
  }
  return `${pMap.year}-${pMap.month}-${pMap.day}`;
}

/**
 * Valida que una fecha YYYY-MM-DD no sea pasada con respecto a America/Guayaquil.
 * Realiza comparación directa lexicográfica de cadenas ISO YYYY-MM-DD.
 */
export function IsNonPastDateGuayaquil(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNonPastDateGuayaquil',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          const clean = value.split('T')[0];
          if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return false;
          const today = getTodayGuayaquil();
          return clean >= today;
        },
        defaultMessage(args: ValidationArguments) {
          const today = getTodayGuayaquil();
          return `${args.property} (${args.value}) no puede ser una fecha pasada (fecha actual en America/Guayaquil: ${today}).`;
        },
      },
    });
  };
}

/**
 * Valida que la fecha sea estrictamente posterior a otra fecha dada.
 */
export function IsAfterDate(targetProperty: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAfterDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [targetProperty],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedName] = args.constraints;
          const relatedValue = (args.object as any)[relatedName] || (args.object as any)['checkin'];
          if (typeof value !== 'string' || typeof relatedValue !== 'string') return false;
          const cleanVal = value.split('T')[0];
          const cleanRelated = relatedValue.split('T')[0];
          return cleanVal > cleanRelated;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedName] = args.constraints;
          return `${args.property} (${args.value}) debe ser estrictamente posterior a la fecha de entrada (${relatedName}).`;
        },
      },
    });
  };
}

export class OcupantesDto {
  @IsInt({ message: 'El número de adultos debe ser un número entero' })
  @Min(1, { message: 'El número de adultos debe ser mayor o igual a 1' })
  adultos: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ninos?: number;
}

export class HuespedTitularDto {
  @IsOptional()
  @IsString()
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  tipoDocumento?: string;

  @IsOptional()
  @IsString()
  identificacion?: string;

  @IsNotEmpty({ message: 'El correo electrónico del huésped titular es obligatorio' })
  @IsEmail({}, { message: 'El correo electrónico del huésped debe tener un formato válido' })
  email: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  nacionalidad?: string;
}

export class CustomerContactDto {
  @IsNotEmpty({ message: 'El correo de contacto es obligatorio' })
  @IsEmail({}, { message: 'El correo de contacto debe tener un formato válido' })
  email: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  identificacion?: string;

  @IsOptional()
  @IsString()
  document_type?: string;

  @IsOptional()
  @IsString()
  document_id?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  alojamientoId?: string;

  @IsOptional()
  @IsString()
  accommodation_id?: string;

  @IsOptional()
  @IsString()
  accommodationId?: string;

  @IsOptional()
  @IsString()
  tipoHabitacionCodigo?: string;

  @IsOptional()
  @IsString()
  tipoHabitacion?: string;

  @IsOptional()
  @IsString()
  room_type?: string;

  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  espacioId?: string;

  @IsOptional()
  @IsNonPastDateGuayaquil()
  fechaInicio?: string;

  @IsOptional()
  @IsNonPastDateGuayaquil()
  checkin?: string;

  @IsOptional()
  @IsAfterDate('fechaInicio')
  fechaFin?: string;

  @IsOptional()
  @IsAfterDate('checkin')
  checkout?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  cantidadHabitaciones?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  rooms?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => OcupantesDto)
  ocupantes?: OcupantesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OcupantesDto)
  guests?: any;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'numeroPersonas debe ser mayor o igual a 1' })
  numeroPersonas?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => HuespedTitularDto)
  huespedTitular?: HuespedTitularDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerContactDto)
  customer_contact?: CustomerContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerContactDto)
  customer?: CustomerContactDto;

  @IsOptional()
  totalPagar?: number | string;

  @IsOptional()
  total?: number | string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  regimenSeleccionado?: string;

  @IsOptional()
  @IsString()
  cotizacionId?: string;

  @IsOptional()
  @IsString()
  quote_id?: string;

  @IsOptional()
  @IsString()
  saga_id?: string;

  @IsOptional()
  @IsString()
  sagaId?: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  payment_reference?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  peticionesEspeciales?: string;

  @IsOptional()
  @IsString()
  planTarifaCodigo?: string;

  @IsOptional()
  @IsString()
  order_preview_id?: string;

  @IsOptional()
  @IsString()
  orderPreviewId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  paquete?: any;

  @IsOptional()
  huespedesAdicionales?: any[];

  @IsOptional()
  dates?: {
    checkin?: string;
    checkout?: string;
  };
}

