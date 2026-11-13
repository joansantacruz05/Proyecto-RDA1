import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Hotel,
  Search,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  LogIn,
  AlertCircle,
} from 'lucide-react';
import { api, getAuthToken } from '../../api/client';
import { UsuarioSession, ProblemDetailsException, ReservaAdminItem } from '../../api/types';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { Textarea } from '../../components/ui/Textarea/Textarea';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { formatUSD } from '../../components/ui/PriceDisplay/PriceDisplay';
import styles from './AdminReceptionPage.module.css';

interface AdminReceptionPageProps {
  currentUser: UsuarioSession | null;
}

export const AdminReceptionPage: React.FC<AdminReceptionPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = getAuthToken();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReserva, setSelectedReserva] = useState<ReservaAdminItem | null>(null);
  const [cedulaCheckin, setCedulaCheckin] = useState('');
  const [huespedesReales, setHuespedesReales] = useState(1);
  const [observaciones, setObservaciones] = useState('Huésped presentado en recepción');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const isAdmin = currentUser?.rol?.toLowerCase().includes('admin');

  // Consulta de todas las reservas para recepción (en vivo cada 3 s)
  const {
    data: reservas = [],
    isLoading,
    refetch,
  } = useQuery<ReservaAdminItem[]>({
    queryKey: ['adminReservasTodas'],
    queryFn: () => api.get<ReservaAdminItem[]>('/reservas/admin/todas'),
    enabled: Boolean(token && isAdmin),
    refetchInterval: 3000,
    staleTime: 1000,
  });

  if (!token || !currentUser) {
    return (
      <div className={`container ${styles.receptionContainer}`} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Hotel size={48} color="#14406B" style={{ margin: '0 auto 16px' }} />
        <h2>Acceso al Panel de Recepción</h2>
        <Button
          variant="gold"
          icon={<LogIn size={16} />}
          style={{ marginTop: '16px' }}
          onClick={() => navigate('/login?returnUrl=/admin/recepcion')}
        >
          Iniciar Sesión como Administrador
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={`container ${styles.receptionContainer}`} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <ShieldAlert size={48} color="#B42318" style={{ margin: '0 auto 16px' }} />
        <h2>Acceso Restringido a Recepción</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
          Tu cuenta actual ({currentUser.correo}) no cuenta con privilegios administrativos para operar la recepción.
        </p>
        <Button variant="primary" style={{ marginTop: '16px' }} onClick={() => navigate('/')}>
          Volver al Inicio
        </Button>
      </div>
    );
  }

  const filteredReservas = reservas.filter((r) => {
    const term = String(searchTerm || '').toLowerCase();
    const guest = String(r.usuarioNombre || r.clienteNombre || '').toLowerCase();
    const cedula = String(r.clienteIdentificacion || '').toLowerCase();
    const hotel = String(r.alojamientoNombre || '').toLowerCase();
    const code = String(r.ordenId || r.external_order_id || r.id || '').toLowerCase();
    return guest.includes(term) || cedula.includes(term) || hotel.includes(term) || code.includes(term);
  });

  const handleOpenCheckinModal = (reserva: ReservaAdminItem) => {
    setSelectedReserva(reserva);
    setCedulaCheckin(
      reserva.clienteIdentificacion &&
        reserva.clienteIdentificacion !== '1710034065' &&
        reserva.clienteIdentificacion !== '9999999999999'
        ? reserva.clienteIdentificacion
        : '',
    );
    setHuespedesReales(reserva.numeroPersonas || 1);
    setObservaciones('Huésped presentado en recepción');
    setModalError(null);
  };

  const handleConfirmCheckin = async () => {
    if (!selectedReserva) return;
    const cedulaLimpia = cedulaCheckin.trim();
    if (!cedulaLimpia || cedulaLimpia.length < 5) {
      setModalError('Debes ingresar el número de cédula o identificación del huésped para confirmar el check-in.');
      return;
    }
    const cedulaTitular = (selectedReserva.clienteIdentificacion || '').trim();
    const esGenerica = !cedulaTitular || cedulaTitular === '1710034065' || cedulaTitular === '9999999999999';
    if (!esGenerica && cedulaLimpia !== cedulaTitular) {
      setModalError(`La cédula ingresada (${cedulaLimpia}) no coincide con la cédula registrada del titular (${cedulaTitular}).`);
      return;
    }
    try {
      setIsCheckingIn(true);
      setModalError(null);

      const targetOrderId =
        selectedReserva.external_order_id || selectedReserva.ordenId || selectedReserva.id;

      // Dispara POST /orders/:orderId/check-in (con outbox automático hacia Booking Core API)
      await api.post(`/orders/${encodeURIComponent(targetOrderId)}/check-in`, {
        cedula: cedulaLimpia,
        identificacion: cedulaLimpia,
        earlyCheckinAutorizado: true,
        huespedes_reales: huespedesReales,
        observaciones: `${observaciones.trim()} (Cédula verificada: ${cedulaLimpia})`,
        admin_id: currentUser.id,
      });

      setToastMessage(
        `¡Llegada confirmada! La reserva ${targetOrderId} pasó a CHECKED_IN y el evento outbox fue notificado a Booking Core API.`,
      );
      setSelectedReserva(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['adminReservasTodas'] });

      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: unknown) {
      if (err instanceof ProblemDetailsException) {
        setModalError(err.problem.detail || 'Error al confirmar la llegada.');
      } else if (err instanceof Error) {
        setModalError(err.message);
      } else {
        setModalError('No se pudo completar el check-in.');
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className={`container ${styles.receptionContainer}`}>
      <div className={styles.receptionHeader}>
        <div>
          <h1 className={styles.receptionTitle}>Panel de Recepción y Control de Llegadas</h1>
          <p className={styles.receptionSubtitle}>
            Registro de check-in en tiempo real sincronizado mediante tabla outbox con Booking Core API.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="gold">Recepcionista: {currentUser.nombre}</Badge>
        </div>
      </div>

      {toastMessage && (
        <div className={styles.successToast} role="status">
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Buscador Rápido */}
      <div className={styles.searchBar}>
        <Input
          placeholder="Buscar por número de cédula, nombre de huésped, código u hotel..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search size={16} />}
        />
      </div>

      {/* Tabla de Reservas de Recepción */}
      {isLoading ? (
        <Skeleton width="100%" height={300} style={{ borderRadius: 'var(--radius-xl)' }} />
      ) : filteredReservas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>No se encontraron reservas con los criterios de búsqueda.</p>
        </div>
      ) : (
        <div className={styles.reservationsTableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código / Localizador</th>
                <th>Huésped Titular</th>
                <th>Alojamiento y Habitación</th>
                <th>Check-in / Check-out</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acción de Recepción</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservas.map((res) => {
                const isCancelled = res.estadoId === 'EST-003' || res.estadoNombre?.toLowerCase().includes('cancel');
                const isCleaning =
                  !isCancelled &&
                  (res.estadoId === 'EST-004' ||
                    res.estadoNombre === 'En Limpieza' ||
                    (Boolean(res.checkoutRealizado) &&
                      res.limpiezaCompletada === false &&
                      res.estadoId !== 'EST-005'));
                const isCheckedOut =
                  !isCancelled &&
                  (isCleaning ||
                    Boolean(res.checkoutRealizado) ||
                    res.estadoId === 'EST-005' ||
                    res.estadoNombre === 'Finalizada' ||
                    res.estadoNombre === 'Checked-Out');
                const isCheckedIn =
                  !isCancelled &&
                  !isCheckedOut &&
                  (Boolean(res.checkinRealizado) ||
                    res.estadoNombre?.toUpperCase().includes('CHECKED_IN') ||
                    res.estadoNombre?.toUpperCase().includes('ASISTIDO') ||
                    res.estadoNombre === 'Checked-In');
                const canCheckin = !isCancelled && !isCheckedIn && !isCheckedOut;

                const code = res.external_order_id || res.ordenId || res.id;
                const guestName = res.usuarioNombre || res.clienteNombre || 'Huésped Booking';
                const guestEmail = res.usuarioEmail || res.clienteEmail || '';
                const inDate = String(res.fechaEntrada).split('T')[0] || '';
                const outDate = String(res.fechaSalida).split('T')[0] || '';

                return (
                  <tr key={res.id}>
                    <td>
                      <span className={styles.codeBadge}>{code}</span>
                    </td>
                    <td>
                      <div className={styles.guestCol}>
                        <span className={styles.guestName}>{guestName}</span>
                        {guestEmail && <span className={styles.guestEmail}>{guestEmail}</span>}
                        {res.clienteIdentificacion && (
                          <span style={{ fontSize: '11.5px', color: '#14406B', fontWeight: 600 }}>
                            Cédula/ID: {res.clienteIdentificacion}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{res.alojamientoNombre}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {res.habitacionNombre}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 'var(--font-size-xs)' }}>
                        <div>In: {inDate} ({String(res.horaCheckIn || '14:00').slice(0, 5)})</div>
                        <div>Out: {outDate} ({String(res.horaCheckOut || '11:00').slice(0, 5)})</div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-pacific-blue)' }}>
                      {formatUSD(Number(res.precioTotal))}
                    </td>
                    <td>
                      <Badge variant={isCancelled ? 'error' : isCleaning ? 'gold' : isCheckedOut ? 'info' : isCheckedIn ? 'success' : 'gold'}>
                        {isCleaning
                          ? '🧹 En Limpieza'
                          : isCheckedOut
                            ? 'Finalizada'
                            : res.estadoNombre || (isCancelled ? 'Cancelada' : 'Confirmada')}
                      </Badge>
                    </td>
                    <td>
                      {canCheckin ? (
                        <Button
                          variant="gold"
                          size="sm"
                          icon={<UserCheck size={14} />}
                          onClick={() => handleOpenCheckinModal(res)}
                        >
                          Confirmar llegada
                        </Button>
                      ) : isCleaning ? (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: '#B45309', fontWeight: 600 }}>
                          🧹 En Limpieza
                        </span>
                      ) : isCheckedOut ? (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: '#14406B', fontWeight: 600 }}>
                          ✓ Estancia Finalizada
                        </span>
                      ) : isCheckedIn ? (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', fontWeight: 600 }}>
                          ✓ Asistido
                        </span>
                      ) : (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          Cancelada
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Confirmar Llegada */}
      {selectedReserva && (
        <Modal
          isOpen={Boolean(selectedReserva)}
          onClose={() => setSelectedReserva(null)}
          title="Confirmar Llegada de Huésped (Check-in)"
          size="md"
        >
          <div>
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
              <div>
                <strong>Huésped:</strong> {selectedReserva.usuarioNombre || selectedReserva.clienteNombre || 'Huésped Booking'}
              </div>
              <div>
                <strong>Cédula / ID Registrado:</strong>{' '}
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#14406B' }}>
                  {selectedReserva.clienteIdentificacion || 'Por registrar en recepción'}
                </span>
              </div>
              <div>
                <strong>Alojamiento:</strong> {selectedReserva.alojamientoNombre} · {selectedReserva.habitacionNombre}
              </div>
              <div>
                <strong>Código:</strong> {selectedReserva.external_order_id || selectedReserva.ordenId}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: '4px' }}>
                  Número de Cédula / Identificación del Huésped *
                </label>
                <Input
                  type="text"
                  placeholder="Ingrese o confirme el número de cédula (ej. 1712345678)"
                  value={cedulaCheckin}
                  onChange={(e) => {
                    setCedulaCheckin(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: '4px' }}>
                  Huéspedes reales presentes en recepción
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={huespedesReales}
                  onChange={(e) => setHuespedesReales(parseInt(e.target.value, 10) || 1)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: '4px' }}>
                  Observaciones de recepción (Entrega de llaves, depósito)
                </label>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {modalError && (
              <div style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} />
                <span>{modalError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <Button variant="ghost" onClick={() => setSelectedReserva(null)} disabled={isCheckingIn}>
                Cancelar
              </Button>
              <Button
                variant="gold"
                icon={<UserCheck size={16} />}
                loading={isCheckingIn}
                onClick={handleConfirmCheckin}
              >
                Confirmar Check-in y Notificar Booking
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
