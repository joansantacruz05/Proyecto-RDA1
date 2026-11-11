import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BedDouble,
  CheckCircle2,
  CreditCard,
  DoorOpen,
  Plus,
  Receipt,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import { api } from '../../api/client';
import type { ExtraCargoItem, HabitacionAdmin, ReservaAdminItem } from '../../api/types';
import {
  computeReceptionFolioPreview,
  computeRoomBaseSubtotal,
  normalizeExtraItems,
  RECEPTION_EXTRA_PRESETS,
  toIsoDateOnly,
} from '../../utils/receptionFolio';
import { formatHoraHHMM } from '../../utils/ecuadorLocations';
import { Modal } from '../ui/Modal/Modal';
import { Button } from '../ui/Button/Button';
import { Badge } from '../ui/Badge/Badge';
import { formatUSD } from '../ui/PriceDisplay/PriceDisplay';
import styles from './ReceptionStayModal.module.css';

export type ReceptionModalMode = 'checkin' | 'adjust' | 'checkout' | 'view';

interface ReceptionStayModalProps {
  isOpen: boolean;
  mode: ReceptionModalMode;
  reserva: ReservaAdminItem | null;
  fallbackAlojamientoId?: string | undefined;
  onClose: () => void;
  onSuccess: (message: string, updatedReserva?: ReservaAdminItem) => void;
  onError: (message: string) => void;
}

export const ReceptionStayModal: React.FC<ReceptionStayModalProps> = ({
  isOpen,
  mode,
  reserva,
  fallbackAlojamientoId,
  onClose,
  onSuccess,
  onError,
}) => {
  const isReadOnly = mode === 'view';
  const [cedula, setCedula] = useState('');
  const [huespedesReales, setHuespedesReales] = useState(1);
  const [selectedEspacioId, setSelectedEspacioId] = useState('');
  const [extras, setExtras] = useState<ExtraCargoItem[]>([]);
  const [customConcepto, setCustomConcepto] = useState('');
  const [customCantidad, setCustomCantidad] = useState(1);
  const [customPrecio, setCustomPrecio] = useState('15.00');
  const [notasRecepcion, setNotasRecepcion] = useState('');
  const [rooms, setRooms] = useState<HabitacionAdmin[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alojamientoId = reserva?.alojamientoId || fallbackAlojamientoId || '';

  useEffect(() => {
    if (!isOpen || !reserva) return;
    const registeredId = (reserva.clienteIdentificacion || '').trim();
    const isGeneric =
      !registeredId || registeredId === '1710034065' || registeredId === '9999999999999';
    setCedula(isGeneric ? '' : registeredId);
    setHuespedesReales(Number(reserva.huespedesReales ?? reserva.numeroPersonas ?? 1));
    setSelectedEspacioId(reserva.espacioId || '');
    setExtras(normalizeExtraItems(reserva.extrasCargos));
    setNotasRecepcion(reserva.notasRecepcion || '');
    setCustomConcepto('');
    setCustomCantidad(1);
    setCustomPrecio('15.00');
    setFormError(null);
  }, [isOpen, reserva, mode]);

  useEffect(() => {
    if (!isOpen || !alojamientoId) {
      setRooms([]);
      return;
    }
    let cancelled = false;
    setLoadingRooms(true);
    api
      .get<HabitacionAdmin[]>(`/admin/alojamientos/${alojamientoId}/habitaciones`)
      .then((list) => {
        if (!cancelled) setRooms(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setRooms([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRooms(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, alojamientoId]);

  const estimatedGuests = Number(reserva?.numeroPersonas || 1);
  const guestDiff = huespedesReales - estimatedGuests;

  const activeRooms = useMemo(
    () => rooms.filter((r) => !r.estado || r.estado === 'Activo' || r.id === reserva?.espacioId),
    [rooms, reserva?.espacioId],
  );

  const selectedRoom = useMemo(
    () => activeRooms.find((r) => r.id === selectedEspacioId) || null,
    [activeRooms, selectedEspacioId],
  );

  const maxRoomCapacity = selectedRoom
    ? Number(selectedRoom.capacidadAdultos || 2) + Number(selectedRoom.capacidadNinos || 0)
    : Number(reserva?.capacidadAdultos || 2) + Number(reserva?.capacidadNinos || 0);

  const folio = useMemo(() => {
    if (!reserva) return null;
    return computeReceptionFolioPreview({
      currentSubtotal: reserva.subtotal,
      currentTasaMunicipal: reserva.tasaMunicipal,
      currentCargosAdicionalesTotal: reserva.cargosAdicionalesTotal,
      montoPagadoInicial: reserva.montoPagadoInicial,
      precioTotal: reserva.precioTotal,
      currentEspacioId: reserva.espacioId,
      targetRoom: selectedRoom,
      fechaEntrada: reserva.fechaEntrada,
      fechaSalida: reserva.fechaSalida,
      cantidadHabitaciones: reserva.cantidadHabitaciones || 1,
      extras,
      estadoPago: reserva.estadoPago,
    });
  }, [reserva, selectedRoom, extras]);

  if (!reserva || !folio) return null;

  const currentRoomBaseSubtotal = folio.previousRoomSubtotal;

  const addOrIncrementExtra = (concepto: string, precioUnitario: number, cantidad: number = 1) => {
    const cleanConcepto = concepto.trim();
    if (!cleanConcepto) return;
    const cleanPrice = Math.max(0, Number(Number(precioUnitario).toFixed(2)) || 0);
    const cleanQty = Math.max(1, Math.round(Number(cantidad) || 1));

    setExtras((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.concepto.toLowerCase() === cleanConcepto.toLowerCase() &&
          Number(item.precioUnitario) === cleanPrice,
      );
      if (existingIdx >= 0) {
        return prev.map((item, idx) => {
          if (idx !== existingIdx) return item;
          const nextQty = item.cantidad + cleanQty;
          return {
            ...item,
            cantidad: nextQty,
            subtotal: Number((nextQty * item.precioUnitario).toFixed(2)),
          };
        });
      }
      return [
        ...prev,
        {
          id: `EXT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          concepto: cleanConcepto,
          cantidad: cleanQty,
          precioUnitario: cleanPrice,
          subtotal: Number((cleanQty * cleanPrice).toFixed(2)),
        },
      ];
    });
  };

  const updateExtraQty = (id: string, delta: number) => {
    setExtras((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const nextQty = item.cantidad + delta;
          if (nextQty <= 0) return null;
          return {
            ...item,
            cantidad: nextQty,
            subtotal: Number((nextQty * item.precioUnitario).toFixed(2)),
          };
        })
        .filter((item): item is ExtraCargoItem => item !== null),
    );
  };

  const removeExtra = (id: string) => {
    setExtras((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCustomExtra = () => {
    const price = parseFloat(customPrecio);
    if (!customConcepto.trim()) {
      setFormError('Escribe un concepto para añadir el cargo adicional.');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setFormError('Ingresa un precio unitario válido (mayor o igual a $0.00).');
      return;
    }
    setFormError(null);
    addOrIncrementExtra(customConcepto, price, customCantidad);
    setCustomConcepto('');
    setCustomCantidad(1);
  };

  const modalTitle =
    mode === 'checkin'
      ? 'Confirmar Check-in · Recepción y Ajustes'
      : mode === 'checkout'
        ? 'Confirmar Check-out · Liquidación Final'
        : mode === 'view'
          ? 'Detalle de Folio · Estancia Cerrada'
          : 'Gestionar Estancia en Curso';

  const handleSubmit = async () => {
    if (isReadOnly) {
      onClose();
      return;
    }

    const orderIdentifier = reserva.ordenId || reserva.id;
    const targetId = reserva.id;
    const sanitizedExtras = extras.map((e) => ({
      id: e.id,
      concepto: e.concepto,
      cantidad: e.cantidad,
      precioUnitario: e.precioUnitario,
    }));
    const spaceToSend =
      selectedEspacioId && selectedEspacioId !== reserva.espacioId ? selectedEspacioId : undefined;

    if (mode === 'checkin') {
      const cedulaLimpia = cedula.trim();
      if (!cedulaLimpia || cedulaLimpia.length < 5) {
        setFormError('Debes ingresar el número de cédula o identificación del titular.');
        return;
      }
      const cedulaTitular = (reserva.clienteIdentificacion || '').trim();
      const esGenerica =
        !cedulaTitular || cedulaTitular === '1710034065' || cedulaTitular === '9999999999999';
      if (!esGenerica && cedulaLimpia !== cedulaTitular) {
        setFormError(
          `La cédula ingresada (${cedulaLimpia}) no coincide con la identificación registrada (${cedulaTitular}).`,
        );
        return;
      }
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'checkin') {
        await api.post(`/orders/${orderIdentifier}/check-in`, {
          cedula: cedula.trim(),
          identificacion: cedula.trim(),
          earlyCheckinAutorizado: true,
          huespedesReales,
          numero_personas_reales: huespedesReales,
          espacioId: spaceToSend,
          extras: sanitizedExtras,
          notasRecepcion: notasRecepcion.trim(),
          observaciones: notasRecepcion.trim() || `Cédula verificada: ${cedula.trim()}`,
          external_order_id: reserva.external_order_id || undefined,
        });
        onSuccess(
          `Check-in confirmado para ${reserva.clienteNombre || reserva.usuarioNombre || 'huésped'}${spaceToSend ? ' con cambio de habitación' : ''}.`,
        );
      } else if (mode === 'adjust') {
        await api.patch(`/reservas/${targetId}/recepcion`, {
          huespedesReales,
          espacioId: spaceToSend,
          extras: sanitizedExtras,
          notasRecepcion: notasRecepcion.trim(),
        });
        onSuccess('Cambios de estancia, habitación y cargos adicionales guardados.');
      } else if (mode === 'checkout') {
        await api.post(`/orders/${orderIdentifier}/check-out`, {
          huespedesReales,
          espacioId: spaceToSend,
          extras: sanitizedExtras,
          notasRecepcion: notasRecepcion.trim(),
        });
        onSuccess(
          `Check-out completado para ${reserva.clienteNombre || reserva.usuarioNombre || 'huésped'}. El alojamiento pasó automáticamente a estado En Limpieza.`,
        );
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar operación de recepción';
      setFormError(msg);
      onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className={styles.wrapper}>
        {/* Resumen de la Reserva */}
        <div className={styles.summaryCard}>
          <div>
            <span className={styles.summaryLabel}>Huésped Titular:</span>
            <strong>{reserva.clienteNombre || reserva.usuarioNombre || 'Huésped Registrado'}</strong>
          </div>
          <div>
            <span className={styles.summaryLabel}>Localizador:</span>
            <span className={styles.mono}>{reserva.ordenId || reserva.id}</span>
          </div>
          <div>
            <span className={styles.summaryLabel}>Cédula / ID:</span>
            <span className={styles.mono}>{reserva.clienteIdentificacion || 'Por registrar'}</span>
          </div>
          <div>
            <span className={styles.summaryLabel}>Alojamiento:</span>
            <strong>{reserva.alojamientoNombre}</strong>
          </div>
          <div>
            <span className={styles.summaryLabel}>Habitación Reservada:</span>
            <span>{reserva.habitacionNombre}</span>
            {reserva.espacioOriginalId && reserva.espacioOriginalId !== reserva.espacioId && (
              <Badge variant="gold" style={{ marginLeft: '6px' }}>
                Cambiada
              </Badge>
            )}
          </div>
          <div>
            <span className={styles.summaryLabel}>Estancia ({folio.nights} noche{folio.nights > 1 ? 's' : ''}):</span>
            <span>
              In {toIsoDateOnly(reserva.fechaEntrada)} ({formatHoraHHMM(reserva.horaCheckIn, '14:00')}) · Out{' '}
              {toIsoDateOnly(reserva.fechaSalida)} ({formatHoraHHMM(reserva.horaCheckOut, '11:00')})
            </span>
          </div>
        </div>

        {formError && (
          <div className={`${styles.alertBox} ${styles.alertError}`}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {formError}
            </span>
          </div>
        )}

        {/* Verificación de Cédula (Check-in) */}
        {mode === 'checkin' && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>
                <CheckCircle2 size={16} color="#14406B" /> Confirmación de Identidad (Cédula / Pasaporte) *
              </h4>
              {reserva.clienteIdentificacion &&
                reserva.clienteIdentificacion !== '1710034065' &&
                reserva.clienteIdentificacion !== '9999999999999' &&
                cedula !== reserva.clienteIdentificacion && (
                  <button
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => setCedula(reserva.clienteIdentificacion || '')}
                  >
                    Completar con registrada
                  </button>
                )}
            </div>
            <input
              type="text"
              placeholder="Ingrese o confirme el número de cédula (ej. 1712345678)"
              className={styles.input}
              value={cedula}
              onChange={(e) => {
                setCedula(e.target.value);
                if (formError) setFormError(null);
              }}
            />
          </div>
        )}

        {/* Personas Reales + Cambio de Habitación */}
        {!isReadOnly && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>
                <Users size={16} color="#14406B" /> Personas y Asignación de Habitación
              </h4>
              <Badge variant={guestDiff === 0 ? 'neutral' : guestDiff > 0 ? 'gold' : 'info'}>
                Estimadas en reserva: {estimatedGuests}
              </Badge>
            </div>

            <div className={styles.inlineRow}>
              <div>
                <label className={styles.label}>Personas reales en hotel</label>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    disabled={huespedesReales <= 1}
                    onClick={() => setHuespedesReales((prev) => Math.max(1, prev - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className={styles.stepValue}
                    value={huespedesReales}
                    onChange={(e) => setHuespedesReales(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => setHuespedesReales((prev) => Math.min(20, prev + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '240px' }}>
                <label className={styles.label}>
                  <BedDouble size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                  Habitación asignada ({loadingRooms ? 'cargando...' : `${activeRooms.length} opciones`})
                </label>
                <select
                  className={styles.select}
                  value={selectedEspacioId}
                  onChange={(e) => setSelectedEspacioId(e.target.value)}
                  disabled={loadingRooms || activeRooms.length === 0}
                >
                  {activeRooms.length === 0 ? (
                    <option value={selectedEspacioId}>
                      {reserva.habitacionNombre} ({formatUSD(Number(reserva.precioPorNoche || 0))}/noche)
                    </option>
                  ) : (
                    activeRooms.map((room) => {
                      const roomCalc = computeRoomBaseSubtotal(
                        Number(room.precioPorNoche || 0),
                        reserva.fechaEntrada,
                        reserva.fechaSalida,
                        reserva.cantidadHabitaciones || 1,
                      );
                      const diff = Number((roomCalc.baseSubtotal - currentRoomBaseSubtotal).toFixed(2));
                      const isCurrent = room.id === reserva.espacioId;
                      const cap = Number(room.capacidadAdultos || 2) + Number(room.capacidadNinos || 0);
                      const diffLabel = isCurrent
                        ? 'Actual'
                        : diff > 0
                          ? `+${formatUSD(diff)} base`
                          : diff < 0
                            ? `${formatUSD(diff)} base`
                            : 'Misma tarifa';
                      return (
                        <option key={room.id} value={room.id}>
                          {room.nombre} · Cap {cap} pers. · {formatUSD(Number(room.precioPorNoche || 0))}/noche ({diffLabel})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            {guestDiff > 0 && (
              <div className={`${styles.alertBox} ${styles.alertAmber}`}>
                <span>
                  Llegan <strong>+{guestDiff} persona(s) adicional(es)</strong> respecto a las {estimatedGuests}{' '}
                  estimadas.
                  {huespedesReales > maxRoomCapacity &&
                    ` Supera la capacidad estándar de la habitación (${maxRoomCapacity} máx.): considera cambiar de habitación o añadir cargo por persona extra.`}
                </span>
                <button
                  type="button"
                  className={styles.quickBtn}
                  onClick={() => addOrIncrementExtra('Huésped adicional', 15, guestDiff * folio.nights)}
                >
                  + Cobrar {guestDiff} extra ({guestDiff * folio.nights} u. × $15)
                </button>
              </div>
            )}

            {guestDiff < 0 && (
              <div className={`${styles.alertBox} ${styles.alertBlue}`}>
                <span>
                  Llegaron <strong>{huespedesReales} de {estimatedGuests}</strong> personas estimadas (
                  {Math.abs(guestDiff)} menos). Si el cliente desea una habitación de menor tarifa, puedes
                  seleccionarla arriba para ajustar el saldo automáticamente.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Extras / Servicios Adicionales */}
        <div className={styles.sectionBox}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>
              <Receipt size={16} color="#14406B" />
              {mode === 'checkout'
                ? 'Consumos y Cargos Adicionales de Salida'
                : 'Servicios Extras y Consumos Adicionales'}
            </h4>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#14406B' }}>
              Subtotal extras: {formatUSD(folio.extrasSubtotal)}
            </span>
          </div>

          {!isReadOnly && (
            <>
              <div className={styles.presetChips}>
                {RECEPTION_EXTRA_PRESETS.map((preset) => (
                  <button
                    key={preset.concepto}
                    type="button"
                    className={styles.presetChip}
                    onClick={() => addOrIncrementExtra(preset.concepto, preset.precioUnitario, 1)}
                  >
                    <Plus size={12} /> {preset.concepto} (${preset.precioUnitario})
                  </button>
                ))}
              </div>

              <div className={styles.customExtraGrid}>
                <div>
                  <label className={styles.label}>Concepto personalizado</label>
                  <input
                    type="text"
                    placeholder="Ej. Cena room service, Transfer aeropuerto, Daño..."
                    className={styles.input}
                    value={customConcepto}
                    onChange={(e) => setCustomConcepto(e.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.label}>Cant.</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className={styles.input}
                    value={customCantidad}
                    onChange={(e) => setCustomCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
                <div>
                  <label className={styles.label}>Precio u. ($)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={styles.input}
                    value={customPrecio}
                    onChange={(e) => setCustomPrecio(e.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" size="sm" icon={<Plus size={14} />} onClick={handleAddCustomExtra}>
                  Añadir
                </Button>
              </div>
            </>
          )}

          {extras.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: '#64748B', padding: '4px 0' }}>
              No hay consumos o cargos adicionales registrados todavía.
            </div>
          ) : (
            <div className={styles.extrasList}>
              {extras.map((item) => (
                <div key={item.id} className={styles.extraRow}>
                  <div>
                    <strong>{item.concepto}</strong>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      {formatUSD(item.precioUnitario)} c/u
                    </div>
                  </div>
                  {!isReadOnly ? (
                    <div className={styles.stepper} style={{ transform: 'scale(0.88)' }}>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => updateExtraQty(item.id, -1)}
                      >
                        −
                      </button>
                      <span style={{ padding: '0 10px', fontWeight: 700 }}>{item.cantidad}</span>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => updateExtraQty(item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span>× {item.cantidad}</span>
                  )}
                  <strong>{formatUSD(item.subtotal)}</strong>
                  {!isReadOnly && (
                    <button
                      type="button"
                      className={styles.removeExtraBtn}
                      title="Eliminar cargo"
                      onClick={() => removeExtra(item.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notas */}
        {!isReadOnly ? (
          <div>
            <label className={styles.label}>Notas / Observaciones de Recepción</label>
            <textarea
              rows={2}
              placeholder="Ej. Llegaron 3 huéspedes, cambio autorizado a Suite Vista al Mar, pago adicional en recepción..."
              className={styles.textarea}
              value={notasRecepcion}
              onChange={(e) => setNotasRecepcion(e.target.value)}
            />
          </div>
        ) : (
          notasRecepcion && (
            <div className={styles.sectionBox}>
              <div className={styles.label}>Notas de Recepción</div>
              <div style={{ fontSize: '13.5px', color: '#334155' }}>{notasRecepcion}</div>
            </div>
          )
        )}

        {/* Resumen Financiero en Vivo */}
        <div className={styles.folioCard}>
          <div className={styles.sectionHeader} style={{ marginBottom: '4px' }}>
            <span className={styles.sectionTitle}>
              <CreditCard size={16} color="#14406B" /> Desglose y Liquidación de Estancia
            </span>
            <Badge variant={String(reserva.estadoPago || '').toUpperCase() === 'COMPLETADO' ? 'success' : 'gold'}>
              Pago inicial:{' '}
              {String(reserva.estadoPago || '').toUpperCase() === 'COMPLETADO'
                ? 'Pagado Online'
                : 'Pendiente / Efectivo en Hotel'}
            </Badge>
          </div>

          <div className={styles.folioRow}>
            <span>Hospedaje base ({folio.nights} noche{folio.nights > 1 ? 's' : ''})</span>
            <span>{formatUSD(folio.previousRoomSubtotal)}</span>
          </div>
          {folio.roomChanged && (
            <div className={styles.folioRow} style={{ color: folio.roomDifference >= 0 ? '#92400E' : '#059669', fontWeight: 600 }}>
              <span>Ajuste por cambio de habitación</span>
              <span>
                {folio.roomDifference >= 0 ? '+' : ''}
                {formatUSD(folio.roomDifference)}
              </span>
            </div>
          )}
          <div className={styles.folioRow}>
            <span>Extras y consumos adicionales ({extras.length} ítem(s))</span>
            <span>{formatUSD(folio.extrasSubtotal)}</span>
          </div>
          <div className={styles.folioRow}>
            <span>IVA (15%) + Tasa Municipal (${folio.tasaMunicipal.toFixed(2)})</span>
            <span>{formatUSD(folio.newIva + folio.tasaMunicipal)}</span>
          </div>

          <div className={styles.folioDivider} />

          <div className={styles.folioTotalRow}>
            <span>Total Neto Estancia</span>
            <span>{formatUSD(folio.newTotal)}</span>
          </div>
          <div className={styles.folioRow} style={{ fontWeight: 700, color: '#14406B' }}>
            <span>
              {String(reserva.estadoPago || '').toUpperCase() === 'COMPLETADO'
                ? `Diferencia adicional a cobrar en recepción (pagado: ${formatUSD(folio.montoInicial)})`
                : 'Total a cobrar en recepción'}
            </span>
            <span>
              {folio.diferenciaTotal < 0 && String(reserva.estadoPago || '').toUpperCase() === 'COMPLETADO'
                ? `Saldo a favor ${formatUSD(Math.abs(folio.diferenciaTotal))}`
                : formatUSD(folio.saldoACobrarEnHotel)}
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className={styles.footerActions}>
          <Button type="button" variant="ghost" onClick={onClose}>
            {isReadOnly ? 'Cerrar' : 'Cancelar'}
          </Button>
          {mode === 'checkin' && (
            <Button
              type="button"
              variant="gold"
              icon={<CheckCircle2 size={16} />}
              loading={isSubmitting}
              onClick={handleSubmit}
            >
              Confirmar Llegada (Check-in)
            </Button>
          )}
          {mode === 'adjust' && (
            <Button
              type="button"
              variant="primary"
              icon={<SlidersHorizontal size={16} />}
              loading={isSubmitting}
              onClick={handleSubmit}
            >
              Guardar Ajustes de Estancia
            </Button>
          )}
          {mode === 'checkout' && (
            <Button
              type="button"
              variant="gold"
              icon={<DoorOpen size={16} />}
              loading={isSubmitting}
              onClick={handleSubmit}
            >
              Confirmar Check-out y Enviar a Limpieza
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
