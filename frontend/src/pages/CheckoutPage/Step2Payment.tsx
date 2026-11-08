import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Building,
  DollarSign,
  ShieldCheck,
  ArrowLeft,
  Lock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { api } from '../../api/client';
import {
  MetodoPagoItem,
  OrderCreateResponse,
  PagoResponse,
  ProblemDetailsException,
} from '../../api/types';
import { markAlojamientoReserved } from '../../utils/accommodationStatus';
import { BillingFormData } from './Step1Billing';
import styles from './Step2Payment.module.css';

interface Step2PaymentProps {
  billingData: BillingFormData;
  clientId: string;
  hotelId: string;
  roomId?: string | undefined;
  roomCode?: string | undefined;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  total: number;
  subtotal: number;
  iva: number;
  tasaMunicipal: number;
  onBack: () => void;
  onSuccess: (data: { orderResult: OrderCreateResponse; pagoResult: PagoResponse }) => void;
}

function detectCardBrand(num: string): string {
  const clean = num.replace(/\s+/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
  if (/^3[47]/.test(clean)) return 'American Express';
  if (/^3(0[0-5]|[68])/.test(clean)) return 'Diners Club';
  return '';
}

export const Step2Payment: React.FC<Step2PaymentProps> = ({
  billingData,
  clientId,
  hotelId,
  roomId,
  roomCode,
  checkin,
  checkout,
  adults,
  rooms,
  total,
  subtotal: _subtotal,
  iva: _iva,
  tasaMunicipal: _tasaMunicipal,
  onBack,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  // 1. Obtener métodos de pago activos de la base de datos
  const { data: metodos = [], isLoading: isLoadingMetodos } = useQuery<MetodoPagoItem[]>({
    queryKey: ['metodosPago'],
    queryFn: () => api.get<MetodoPagoItem[]>('/pagos/metodos'),
  });

  // Método seleccionado (por defecto MET-001 Tarjeta de Crédito si existe, o el primero)
  const [selectedMethodId, setSelectedMethodId] = useState<string>('MET-001');

  // Estado del formulario de tarjeta
  const [cardHolder, setCardHolder] = useState(billingData.nombre);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [transferRef, setTransferRef] = useState('');

  // Errores y validación onBlur
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Idempotency Key generada con UUID v4 persistida para reintentos (RFC4122)
  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }),
  );

  const brand = detectCardBrand(cardNumber);

  const validateCardField = (name: string, value: string): string | null => {
    if (name === 'cardHolder' && (!value || value.trim().length < 3)) {
      return 'Ingrese el nombre tal como figura en la tarjeta.';
    }
    if (name === 'cardNumber') {
      const clean = value.replace(/\s+/g, '');
      if (!clean || clean.length < 13 || clean.length > 19 || !/^\d+$/.test(clean)) {
        return 'Ingrese un número de tarjeta válido (13 a 19 dígitos).';
      }
    }
    if (name === 'cardExpiry') {
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) {
        return 'Formato de expiración debe ser MM/AA.';
      }
    }
    if (name === 'cardCvv') {
      if (!/^\d{3,4}$/.test(value)) {
        return 'El código de seguridad (CVV) debe tener 3 o 4 dígitos.';
      }
    }
    return null;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let val = '';
    if (field === 'cardHolder') val = cardHolder;
    if (field === 'cardNumber') val = cardNumber;
    if (field === 'cardExpiry') val = cardExpiry;
    if (field === 'cardCvv') val = cardCvv;

    const err = validateCardField(field, val);
    setErrors((prev) => {
      const updated = { ...prev };
      if (err) {
        updated[field] = err;
      } else {
        delete updated[field];
      }
      return updated;
    });
  };

  const formatCardNumberInput = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 19);
    const parts = clean.match(/[\s\S]{1,4}/g) || [];
    return parts.join(' ');
  };

  const formatExpiryInput = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) {
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
    }
    return clean;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const isCard = selectedMethodId === 'MET-001' || selectedMethodId === 'MET-002';
    if (isCard) {
      setTouched({
        cardHolder: true,
        cardNumber: true,
        cardExpiry: true,
        cardCvv: true,
      });

      const errHolder = validateCardField('cardHolder', cardHolder);
      const errNumber = validateCardField('cardNumber', cardNumber);
      const errExpiry = validateCardField('cardExpiry', cardExpiry);
      const errCvv = validateCardField('cardCvv', cardCvv);

      if (errHolder || errNumber || errExpiry || errCvv) {
        setErrors({
          cardHolder: errHolder || '',
          cardNumber: errNumber || '',
          cardExpiry: errExpiry || '',
          cardCvv: errCvv || '',
        });
        return;
      }
    }

    try {
      setIsProcessing(true);

      // Paso 1: Enviar POST /orders/create con Idempotency-Key
      const orderPayload = {
        accommodation_id: hotelId,
        alojamientoId: hotelId,
        tipoHabitacionCodigo: roomCode || 'SUITE_DELUXE',
        product_id: roomId || roomCode || 'SUITE_DELUXE',
        fechaInicio: checkin,
        fechaFin: checkout,
        check_in_date: checkin,
        check_out_date: checkout,
        contact_email: billingData.email,
        clientId: clientId || undefined,
        clienteId: clientId || undefined,
        cantidadHabitaciones: rooms,
        rooms,
        guests: {
          number_of_adults: adults,
          adults,
          rooms,
          number_of_rooms: rooms,
        },
        huespedTitular: {
          nombreCompleto: billingData.nombre,
          identificacion: billingData.identificacion,
          email: billingData.email,
          telefono: billingData.telefono,
          tipoDocumento: billingData.tipoDocumento,
        },
        selected_product: {
          product_id: roomId || roomCode || 'SUITE_DELUXE',
          rate_plan_code: 'ESTANDAR',
          currency: 'USD',
          total_price: total,
        },
        totalPagar: total,
      };

      const orderResult = await api.post<OrderCreateResponse>(
        '/alojamientos/orders/create',
        orderPayload,
        {
          headers: {
            'Idempotency-Key': idempotencyKeyRef.current,
          },
        },
      );

      const targetReservaId =
        orderResult?.reservaId ||
        orderResult?.orderId ||
        orderResult?.external_order_id ||
        orderResult?.externalOrderId ||
        '';

      // Paso 2: Procesar el pago con la factura electrónica SRI secuencial
      const pagoPayload = {
        reservaId: targetReservaId,
        metodoPagoId: selectedMethodId,
        requiereFactura: true,
        factura: {
          identificacion: billingData.identificacion,
          nombre: billingData.nombre,
          direccion: billingData.direccion || 'Consumidor Final',
        },
      };

      const pagoResult = await api.post<PagoResponse>('/pagos', pagoPayload);

      // Registrar propiedad como reservada inmediatamente en estado global
      markAlojamientoReserved({
        alojamientoId: hotelId,
        fechaEntrada: checkin,
        fechaSalida: checkout,
        ordenId: targetReservaId,
      });

      // Invalidar queries para que catálogo y detalle se actualicen de inmediato a 'Reservado'
      queryClient.invalidateQueries({ queryKey: ['reservasActivasPublicas'] });
      queryClient.invalidateQueries({ queryKey: ['alojamientosCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['hotelDetail'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });

      // Limpiar borrador de sesión tras éxito
      try {
        sessionStorage.removeItem('luxestays_checkout_draft');
      } catch {
        // Ignorar
      }

      onSuccess({ orderResult, pagoResult });
    } catch (err: unknown) {
      if (err instanceof ProblemDetailsException) {
        if (err.problem.code === 'OUT_OF_STOCK') {
          setErrorMessage(
            'Lo sentimos: Esta habitación se agotó mientras realizabas tu reserva. Por favor regresa al catálogo para ver otras opciones disponibles.',
          );
        } else if (err.problem.code === 'PRICE_MISMATCH') {
          setErrorMessage(
            'La tarifa oficial ha cambiado recientemente. Por favor regresa y actualiza la cotización.',
          );
        } else if (err.problem.code === 'QUOTE_EXPIRED') {
          setErrorMessage('La cotización de tarifa ha expirado. Debe ser renovada.');
        } else {
          setErrorMessage(err.problem.detail || err.problem.title || 'Error al procesar la reserva.');
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Ocurrió un error inesperado al procesar el pago.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isCard = selectedMethodId === 'MET-001' || selectedMethodId === 'MET-002';
  const isTransfer = selectedMethodId === 'MET-003';
  const isPayPal = selectedMethodId === 'MET-004';
  const isCash = selectedMethodId === 'MET-005';

  return (
    <div className={styles.paymentContainer}>
      <div className={styles.stepHeading}>
        <h2 className={styles.stepTitle}>Método de Pago Seguro</h2>
        <p className={styles.stepSubtitle}>
          Selecciona tu método de pago preferido. Todas las transacciones están encriptadas con TLS 1.3.
        </p>
      </div>

      {/* Selector de Métodos de Pago Dinámicos de BD */}
      <div className={styles.methodsGrid}>
        {isLoadingMetodos ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Cargando métodos de pago...</p>
        ) : (
          metodos.map((metodo) => {
            const isActive = selectedMethodId === metodo.id;
            let icon = <CreditCard size={18} />;
            let note = 'Confirmación inmediata';

            if (metodo.id === 'MET-002') {
              icon = <CreditCard size={18} />;
              note = 'Débito bancario local';
            } else if (metodo.id === 'MET-003') {
              icon = <Building size={18} />;
              note = 'Depósito o transferencia';
            } else if (metodo.id === 'MET-004') {
              icon = <DollarSign size={18} />;
              note = 'Cuenta PayPal internacional';
            } else if (metodo.id === 'MET-005') {
              icon = <DollarSign size={18} />;
              note = 'Abonar en el hotel';
            }

            return (
              <div
                key={metodo.id}
                className={`${styles.methodCard} ${isActive ? styles.methodCardActive : ''}`}
                onClick={() => setSelectedMethodId(metodo.id)}
              >
                <div className={styles.methodIcon}>{icon}</div>
                <div className={styles.methodDetails}>
                  <span className={styles.methodName}>{metodo.nombre}</span>
                  <span className={styles.methodNote}>{note}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handlePaymentSubmit}>
        {/* Formulario según el método seleccionado */}
        <div className={styles.paymentDetailsBox}>
          {isCard && (
            <div className={styles.cardFormGrid}>
              <div className={`${styles.fieldGroup} ${styles.fullCol}`}>
                <label className={styles.fieldLabel} htmlFor="cardHolder">
                  Nombre Impreso en la Tarjeta *
                </label>
                <Input
                  id="cardHolder"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  onBlur={() => handleBlur('cardHolder')}
                  placeholder="Ej. MARÍA E PÉREZ"
                  error={touched['cardHolder'] ? errors['cardHolder'] : undefined}
                />
              </div>

              <div className={`${styles.fieldGroup} ${styles.fullCol}`}>
                <label className={styles.fieldLabel} htmlFor="cardNumber">
                  Número de Tarjeta *
                </label>
                <div className={styles.cardNumberWrapper}>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumberInput(e.target.value))}
                    onBlur={() => handleBlur('cardNumber')}
                    placeholder="4000 1234 5678 9010"
                    maxLength={23}
                    icon={<CreditCard size={16} />}
                    error={touched['cardNumber'] ? errors['cardNumber'] : undefined}
                  />
                  {brand && <span className={styles.brandBadge}>{brand}</span>}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="cardExpiry">
                  Fecha de Vencimiento *
                </label>
                <Input
                  id="cardExpiry"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))}
                  onBlur={() => handleBlur('cardExpiry')}
                  placeholder="MM/AA"
                  maxLength={5}
                  error={touched['cardExpiry'] ? errors['cardExpiry'] : undefined}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="cardCvv">
                  Código de Seguridad (CVV) *
                </label>
                <Input
                  id="cardCvv"
                  type="password"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onBlur={() => handleBlur('cardCvv')}
                  placeholder="3 o 4 dígitos"
                  maxLength={4}
                  icon={<Lock size={15} />}
                  error={touched['cardCvv'] ? errors['cardCvv'] : undefined}
                />
              </div>
            </div>
          )}

          {isTransfer && (
            <div className={styles.transferBox}>
              <div className={styles.bankDetailsCard}>
                <strong>Datos de Cuenta para Transferencia o Depósito:</strong>
                <br />
                <strong>Banco:</strong> Banco Pichincha (Ecuador)
                <br />
                <strong>Tipo de Cuenta:</strong> Cuenta Corriente
                <br />
                <strong>Número de Cuenta:</strong> 2100456789
                <br />
                <strong>Beneficiario:</strong> LuxeStays Ecuador S.A.S.
                <br />
                <strong>RUC:</strong> 1793214567001
                <br />
                <strong>Correo para Comprobantes:</strong> pagos@luxestays.ec
              </div>

              <div style={{ marginTop: 'var(--spacing-3)' }}>
                <Input
                  label="Número de Comprobante / Referencia Bancaria (Opcional)"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  placeholder="Ej. TRANS-789012"
                />
              </div>
            </div>
          )}

          {isPayPal && (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-4) 0' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                Al pulsar en confirmar, serás redirigido a la pasarela segura de PayPal para autorizar el cargo en USD.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#FFC439', borderRadius: '4px', fontWeight: 700, color: '#003087' }}>
                <DollarSign size={18} />
                <span>PayPal Checkout</span>
              </div>
            </div>
          )}

          {isCash && (
            <div style={{ padding: 'var(--spacing-3) 0' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Tu reserva quedará registrada de inmediato. El pago total de ${total.toFixed(2)} USD se realizará en efectivo directamente en la recepción del hotel al momento de tu check-in (a partir de las 14:00).
              </p>
            </div>
          )}

          {/* Garantía de Seguridad */}
          <div className={styles.securityNote}>
            <ShieldCheck size={16} />
            <span>
              Certificación SSL 256 bits · Procesamiento seguro conforme a normativas bancarias y tributarias del Ecuador.
            </span>
          </div>
        </div>

        {/* Mensaje de error general si ocurre fallo en API */}
        {errorMessage && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Botones de acción */}
        <div className={styles.actionsRow}>
          <Button
            type="button"
            variant="ghost"
            icon={<ArrowLeft size={16} />}
            onClick={onBack}
            disabled={isProcessing}
          >
            Modificar datos de facturación
          </Button>

          <Button
            type="submit"
            variant="gold"
            size="lg"
            loading={isProcessing}
            icon={<CheckCircle2 size={18} />}
          >
            {isCash
              ? `Confirmar Reserva ($${total.toFixed(2)} USD)`
              : `Pagar y Confirmar ($${total.toFixed(2)} USD)`}
          </Button>
        </div>
      </form>
    </div>
  );
};
