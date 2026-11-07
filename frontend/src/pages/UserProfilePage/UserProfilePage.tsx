import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Mail, Phone, MapPin, Globe, FileText, CheckCircle2, ShieldCheck, LogIn } from 'lucide-react';
import { api, getAuthToken } from '../../api/client';
import { UsuarioSession, FacturaSRI } from '../../api/types';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { formatUSD } from '../../components/ui/PriceDisplay/PriceDisplay';
import styles from './UserProfilePage.module.css';

interface UserProfilePageProps {
  currentUser: UsuarioSession | null;
  onUserUpdate?: (updated: UsuarioSession) => void;
}

interface PerfilCompleto {
  id: string;
  nombre: string;
  correo: string;
  telefono?: string;
  edad?: number;
  direccion?: string;
  pais?: string;
  rol: string;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ currentUser, onUserUpdate }) => {
  const navigate = useNavigate();
  const token = getAuthToken();

  // 1. Consultar perfil actualizado
  const {
    data: perfil,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery<PerfilCompleto>({
    queryKey: ['userProfile', currentUser?.id],
    queryFn: () => api.get<PerfilCompleto>('/auth/me'),
    enabled: Boolean(token && currentUser),
  });

  // 2. Consultar facturas electrónicas SRI emitidas
  const {
    data: facturas = [],
    isLoading: isInvoicesLoading,
  } = useQuery<FacturaSRI[]>({
    queryKey: ['misFacturas', currentUser?.id],
    queryFn: () => api.get<FacturaSRI[]>('/pagos/mis-facturas'),
    enabled: Boolean(token && currentUser),
  });

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [edad, setEdad] = useState<string>('');
  const [direccion, setDireccion] = useState('');
  const [pais, setPais] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (perfil) {
      setNombre(perfil.nombre || '');
      setTelefono(perfil.telefono || '');
      setEdad(perfil.edad ? String(perfil.edad) : '');
      setDireccion(perfil.direccion || '');
      setPais(perfil.pais || 'Ecuador');
    }
  }, [perfil]);

  if (!token || !currentUser) {
    return (
      <div className={`container ${styles.profileContainer}`} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <User size={48} color="#14406B" style={{ margin: '0 auto 16px' }} />
        <h2>Inicia sesión para gestionar tu perfil</h2>
        <Button
          variant="gold"
          icon={<LogIn size={16} />}
          style={{ marginTop: '16px' }}
          onClick={() => navigate('/login?returnUrl=/perfil')}
        >
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSuccessMsg(false);

      const parsedEdad = edad ? parseInt(edad, 10) : undefined;
      const res = await api.patch<PerfilCompleto>('/auth/me', {
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
        edad: parsedEdad,
        direccion: direccion.trim() || undefined,
        pais: pais.trim() || undefined,
      });

      setSuccessMsg(true);
      refetchProfile();
      if (onUserUpdate && res) {
        onUserUpdate({
          id: res.id,
          nombre: res.nombre,
          correo: res.correo,
          rol: res.rol,
        });
      }
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`container ${styles.profileContainer}`}>
      <div className={styles.profileHeader}>
        <h1 className={styles.profileTitle}>Mi Perfil de Usuario</h1>
        <p className={styles.profileSubtitle}>
          Gestiona tus datos de contacto, facturación y consulta tus comprobantes electrónicos emitidos ante el SRI.
        </p>
      </div>

      <div className={styles.layoutGrid}>
        {/* Formulario de Datos Personales */}
        <div className={styles.cardSection}>
          <h2 className={styles.sectionTitle}>
            <User size={20} color="#14406B" />
            <span>Información Personal</span>
          </h2>

          {successMsg && (
            <div className={styles.successAlert}>
              <CheckCircle2 size={16} />
              <span>Perfil actualizado correctamente.</span>
            </div>
          )}

          {errorMsg && (
            <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', marginBottom: '12px' }}>
              {errorMsg}
            </p>
          )}

          {isProfileLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Skeleton width="100%" height={40} />
              <Skeleton width="100%" height={40} />
              <Skeleton width="100%" height={40} />
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="nombre">
                  Nombre Completo
                </label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  icon={<User size={16} />}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="correo">
                  Correo Electrónico (No modificable)
                </label>
                <Input
                  id="correo"
                  value={perfil?.correo || currentUser.correo}
                  disabled
                  icon={<Mail size={16} />}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="telefono">
                  Teléfono Móvil
                </label>
                <Input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 0991234567"
                  icon={<Phone size={16} />}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="direccion">
                  Dirección Fiscal
                </label>
                <Input
                  id="direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej. Av. Amazonas y República, Quito"
                  icon={<MapPin size={16} />}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="pais">
                  País
                </label>
                <Input
                  id="pais"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  placeholder="Ecuador"
                  icon={<Globe size={16} />}
                />
              </div>

              <div style={{ marginTop: 'var(--spacing-2)' }}>
                <Button
                  type="submit"
                  variant="gold"
                  loading={isSaving}
                  icon={<ShieldCheck size={16} />}
                >
                  Guardar Cambios
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Sección de Facturas Electrónicas SRI */}
        <div className={styles.cardSection}>
          <h2 className={styles.sectionTitle}>
            <FileText size={20} color="#14406B" />
            <span>Mis Facturas Electrónicas SRI</span>
          </h2>

          {isInvoicesLoading ? (
            <Skeleton width="100%" height={200} />
          ) : facturas.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              No registras facturas emitidas aún. Las facturas se generan automáticamente al confirmar tus pagos.
            </p>
          ) : (
            <div className={styles.invoicesTableWrapper}>
              <table className={styles.invoicesTable}>
                <thead>
                  <tr>
                    <th>N° Factura</th>
                    <th>Subtotal</th>
                    <th>IVA 15%</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((factura) => (
                    <tr key={factura.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {factura.numeroFactura}
                      </td>
                      <td>{formatUSD(Number(factura.subtotal))}</td>
                      <td>{formatUSD(Number(factura.iva))}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-pacific-blue)' }}>
                        {formatUSD(Number(factura.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
