import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, MapPin, AlertCircle, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Textarea } from '../../components/ui/Textarea/Textarea';
import { api, setAuthToken } from '../../api/client';
import { UsuarioSession, ClienteHuesped, LoginResponse } from '../../api/types';
import { TipoDocumento, validarDocumento } from '../../utils/ecuadorValidators';
import styles from './Step1Billing.module.css';

export interface BillingFormData {
  tipoDocumento: TipoDocumento;
  identificacion: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  peticionesEspeciales?: string | undefined;
  crearCuenta?: boolean | undefined;
  password?: string | undefined;
}

interface Step1BillingProps {
  currentUser: UsuarioSession | null;
  onProceed: (data: { billingData: BillingFormData; clientId: string }) => void;
  initialData?: BillingFormData | undefined;
}

const STORAGE_KEY = 'luxestays_checkout_draft';

export const Step1Billing: React.FC<Step1BillingProps> = ({
  currentUser,
  onProceed,
  initialData,
}) => {
  // Inicialización de estado recuperado de sesión o props
  const [formData, setFormData] = useState<BillingFormData>(() => {
    if (initialData) return initialData;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BillingFormData;
        return parsed;
      }
    } catch {
      // Ignorar error de JSON parse
    }

    return {
      tipoDocumento: 'CEDULA',
      identificacion: '',
      nombre: currentUser?.nombre || '',
      email: currentUser?.correo || '',
      telefono: currentUser?.telefono || '',
      direccion: '',
      peticionesEspeciales: '',
      crearCuenta: false,
      password: '',
    };
  });

  // Si el usuario inicia sesión durante la vista, autocompletar
  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        nombre: prev.nombre || currentUser.nombre,
        email: prev.email || currentUser.correo,
        telefono: prev.telefono || currentUser.telefono || '',
      }));
    }
  }, [currentUser]);

  // Guardar borrador en sessionStorage cada vez que cambia (nunca datos sensibles de tarjeta)
  useEffect(() => {
    try {
      const draftToSave = { ...formData, password: '' };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draftToSave));
    } catch {
      // Ignorar error de storage
    }
  }, [formData]);

  // Estado de errores y campos tocados (para validar solo onBlur o onSubmit)
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para login rápido si el usuario ya tiene cuenta
  const [showQuickLogin, setShowQuickLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Referencias a los campos para autofocus en el primer error
  const fieldRefs = {
    identificacion: useRef<HTMLInputElement>(null),
    nombre: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    telefono: useRef<HTMLInputElement>(null),
    direccion: useRef<HTMLInputElement>(null),
  };

  const handleDocTypeSelect = (tipo: TipoDocumento) => {
    setFormData((prev) => {
      let identificacion = prev.identificacion;
      let nombre = prev.nombre;
      if (tipo === 'CONSUMIDOR_FINAL') {
        identificacion = '9999999999999';
        nombre = prev.nombre || 'Consumidor Final';
      } else if (prev.tipoDocumento === 'CONSUMIDOR_FINAL') {
        identificacion = '';
      }
      return {
        ...prev,
        tipoDocumento: tipo,
        identificacion,
        nombre,
      };
    });
    // Limpiar error del campo al cambiar tipo
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated['identificacion'];
      return updated;
    });
  };

  const validateField = (name: keyof BillingFormData, value: string): string | null => {
    if (name === 'nombre') {
      if (!value || value.trim().length < 3) {
        return 'Ingrese el nombre completo o razón social (mínimo 3 caracteres).';
      }
    }
    if (name === 'email') {
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        return 'Ingrese un correo electrónico válido.';
      }
    }
    if (name === 'telefono') {
      const cleanPhone = value.replace(/[\s-]/g, '');
      if (!cleanPhone || cleanPhone.length < 9) {
        return 'Ingrese un número telefónico de contacto válido (mínimo 9 dígitos).';
      }
    }
    if (name === 'identificacion') {
      const docResult = validarDocumento(formData.tipoDocumento, value);
      if (!docResult.valido) {
        return docResult.mensaje || 'Documento no válido.';
      }
    }
    if (name === 'direccion') {
      if (formData.tipoDocumento === 'RUC' && (!value || value.trim().length < 5)) {
        return 'Para emisión de factura con RUC se requiere la dirección fiscal completa.';
      }
    }
    return null;
  };

  const handleBlur = (field: keyof BillingFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = String(formData[field] || '');
    const err = validateField(field, val);
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

  const handleChange = (field: keyof BillingFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Si el campo ya fue tocado, revalidar suavemente
    if (touched[field]) {
      const err = validateField(field, String(value));
      setErrors((prev) => {
        const updated = { ...prev };
        if (err) {
          updated[field] = err;
        } else {
          delete updated[field];
        }
        return updated;
      });
    }
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Complete su correo y contraseña.');
      return;
    }
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      const res = await api.post<LoginResponse>('/auth/login', {
        correo: loginEmail,
        contrasena: loginPassword,
      });
      if (res?.access_token) {
        setAuthToken(res.access_token);
        setShowQuickLogin(false);
        setFormData((prev) => ({
          ...prev,
          nombre: res.usuario.nombre,
          email: res.usuario.correo,
        }));
      }
    } catch (err: unknown) {
      setLoginError('Credenciales incorrectas o usuario no registrado.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Marcar todos los campos principales como tocados
    setTouched({
      identificacion: true,
      nombre: true,
      email: true,
      telefono: true,
      direccion: true,
    });

    const newErrors: Record<string, string> = {};
    const errMessages: string[] = [];

    const docErr = validateField('identificacion', formData.identificacion);
    if (docErr) {
      newErrors['identificacion'] = docErr;
      errMessages.push(docErr);
    }

    const nameErr = validateField('nombre', formData.nombre);
    if (nameErr) {
      newErrors['nombre'] = nameErr;
      errMessages.push(nameErr);
    }

    const emailErr = validateField('email', formData.email);
    if (emailErr) {
      newErrors['email'] = emailErr;
      errMessages.push(emailErr);
    }

    const phoneErr = validateField('telefono', formData.telefono);
    if (phoneErr) {
      newErrors['telefono'] = phoneErr;
      errMessages.push(phoneErr);
    }

    const dirErr = validateField('direccion', formData.direccion);
    if (dirErr) {
      newErrors['direccion'] = dirErr;
      errMessages.push(dirErr);
    }

    setErrors(newErrors);
    setErrorList(errMessages);

    if (errMessages.length > 0) {
      // Llevar el foco automáticamente al primer campo con error
      if (docErr && fieldRefs.identificacion.current) {
        fieldRefs.identificacion.current.focus();
      } else if (nameErr && fieldRefs.nombre.current) {
        fieldRefs.nombre.current.focus();
      } else if (emailErr && fieldRefs.email.current) {
        fieldRefs.email.current.focus();
      } else if (phoneErr && fieldRefs.telefono.current) {
        fieldRefs.telefono.current.focus();
      } else if (dirErr && fieldRefs.direccion.current) {
        fieldRefs.direccion.current.focus();
      }
      return;
    }

    try {
      setIsSubmitting(true);

      // Si el usuario no está logueado pero ingresó contraseña para crear cuenta
      if (!currentUser && formData.crearCuenta && formData.password) {
        try {
          const regRes = await api.post<LoginResponse>('/auth/register', {
            nombre: formData.nombre,
            correo: formData.email,
            contrasena: formData.password,
            telefono: formData.telefono,
          });
          if (regRes?.access_token) {
            setAuthToken(regRes.access_token);
          }
        } catch {
          // Si el usuario ya existía, intentar login
          try {
            const logRes = await api.post<LoginResponse>('/auth/login', {
              correo: formData.email,
              contrasena: formData.password,
            });
            if (logRes?.access_token) {
              setAuthToken(logRes.access_token);
            }
          } catch {
            // Continúa como huésped
          }
        }
      }

      // 1. Consultar si el cliente ya existe en el Hub
      let resolvedClientId = '';
      try {
        const clientFound = await api.get<ClienteHuesped>('/clientes', {
          params: {
            email: formData.email,
            identificacion: formData.identificacion,
          },
        });
        if (clientFound?.client_id) {
          resolvedClientId = clientFound.client_id;
        }
      } catch {
        // No encontrado (404), se registrará a continuación
      }

      // 2. Si no existe, registrar cliente mediante POST /clientes
      if (!resolvedClientId) {
        try {
          const createdClient = await api.post<{ client_id: string }>('/clientes', {
            nombre: formData.nombre,
            email: formData.email,
            identificacion: formData.identificacion,
            telefono: formData.telefono,
          });
          if (createdClient?.client_id) {
            resolvedClientId = createdClient.client_id;
          }
        } catch {
          // Fallback a UUID cliente local
          resolvedClientId = `CLI-${Date.now()}`;
        }
      }

      onProceed({
        billingData: formData,
        clientId: resolvedClientId || currentUser?.id || `CLI-${Date.now()}`,
      });
    } catch (generalErr: unknown) {
      setErrorList([
        generalErr instanceof Error
          ? generalErr.message
          : 'Ocurrió un error al preparar los datos de facturación.',
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.billingContainer}>
      <div className={styles.stepHeading}>
        <h2 className={styles.stepTitle}>Datos de Facturación y Titular de la Reserva</h2>
        <p className={styles.stepSubtitle}>
          La factura electrónica autorizada por el SRI se emitirá con estos datos al confirmar tu pago.
        </p>
      </div>

      {/* Aviso de usuario no autenticado con opción de login rápido */}
      {!currentUser && (
        <div className={styles.authNoticeBox}>
          <div className={styles.authNoticeText}>
            <strong>¿Ya tienes una cuenta en LuxeStays?</strong>
            <br />
            Inicia sesión para prellenar tus datos y vincular tu reserva a tu perfil.
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<LogIn size={14} />}
            onClick={() => setShowQuickLogin(!showQuickLogin)}
          >
            {showQuickLogin ? 'Cerrar acceso' : 'Iniciar sesión'}
          </Button>
        </div>
      )}

      {showQuickLogin && (
        <form onSubmit={handleQuickLogin} className={styles.loginInlineBox}>
          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
            Acceso Rápido de Usuario
          </span>
          <div className={styles.formGrid}>
            <Input
              label="Correo electrónico"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="tu@email.com"
            />
            <Input
              label="Contraseña"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {loginError && <p className={styles.errorText}>{loginError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isLoggingIn}
            >
              Entrar
            </Button>
          </div>
        </form>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Selector de Tipo de Documento */}
        <div className={styles.docTypeSection}>
          <label className={styles.sectionLabel}>
            Tipo de Documento para Facturación <span className={styles.fieldRequired}>*</span>
          </label>
          <div className={styles.docGrid}>
            <div
              className={`${styles.docCard} ${
                formData.tipoDocumento === 'CEDULA' ? styles.docCardActive : ''
              }`}
              onClick={() => handleDocTypeSelect('CEDULA')}
            >
              <span className={styles.docCardIcon}>🇪🇨</span>
              <span className={styles.docCardTitle}>Cédula</span>
              <span className={styles.docCardDesc}>Ciudadanos y residentes de Ecuador</span>
            </div>

            <div
              className={`${styles.docCard} ${
                formData.tipoDocumento === 'RUC' ? styles.docCardActive : ''
              }`}
              onClick={() => handleDocTypeSelect('RUC')}
            >
              <span className={styles.docCardIcon}>🏢</span>
              <span className={styles.docCardTitle}>RUC</span>
              <span className={styles.docCardDesc}>Empresas y personas con RUC SRI</span>
            </div>

            <div
              className={`${styles.docCard} ${
                formData.tipoDocumento === 'PASAPORTE' ? styles.docCardActive : ''
              }`}
              onClick={() => handleDocTypeSelect('PASAPORTE')}
            >
              <span className={styles.docCardIcon}>✈️</span>
              <span className={styles.docCardTitle}>Pasaporte</span>
              <span className={styles.docCardDesc}>Turistas internacionales</span>
            </div>

            <div
              className={`${styles.docCard} ${
                formData.tipoDocumento === 'CONSUMIDOR_FINAL' ? styles.docCardActive : ''
              }`}
              onClick={() => handleDocTypeSelect('CONSUMIDOR_FINAL')}
            >
              <span className={styles.docCardIcon}>🧾</span>
              <span className={styles.docCardTitle}>Consumidor Final</span>
              <span className={styles.docCardDesc}>Sin datos fiscales específicos</span>
            </div>
          </div>
        </div>

        {/* Campos del Formulario */}
        <div className={styles.formGrid} style={{ marginTop: 'var(--spacing-5)' }}>
          {/* Número de Documento */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="identificacion">
              Número de Identificación <span className={styles.fieldRequired}>*</span>
            </label>
            <Input
              id="identificacion"
              ref={fieldRefs.identificacion}
              value={formData.identificacion}
              onChange={(e) => handleChange('identificacion', e.target.value)}
              onBlur={() => handleBlur('identificacion')}
              placeholder={
                formData.tipoDocumento === 'CEDULA'
                  ? 'Ej. 1710034065'
                  : formData.tipoDocumento === 'RUC'
                  ? 'Ej. 1792345678001'
                  : formData.tipoDocumento === 'PASAPORTE'
                  ? 'Ej. A12345678'
                  : '9999999999999'
              }
              readOnly={formData.tipoDocumento === 'CONSUMIDOR_FINAL'}
              error={touched['identificacion'] ? errors['identificacion'] : undefined}
            />
          </div>

          {/* Nombre Completo / Razón Social */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="nombre">
              {formData.tipoDocumento === 'RUC' ? 'Razón Social' : 'Nombre Completo Titular'}{' '}
              <span className={styles.fieldRequired}>*</span>
            </label>
            <Input
              id="nombre"
              ref={fieldRefs.nombre}
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              onBlur={() => handleBlur('nombre')}
              placeholder="Ej. María Elena Pérez"
              icon={<User size={16} />}
              error={touched['nombre'] ? errors['nombre'] : undefined}
            />
          </div>

          {/* Correo Electrónico */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="email">
              Correo Electrónico (Recepción de Factura y Voucher){' '}
              <span className={styles.fieldRequired}>*</span>
            </label>
            <Input
              id="email"
              type="email"
              ref={fieldRefs.email}
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="tu@correo.com"
              icon={<Mail size={16} />}
              error={touched['email'] ? errors['email'] : undefined}
            />
          </div>

          {/* Teléfono Móvil */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="telefono">
              Teléfono Celular <span className={styles.fieldRequired}>*</span>
            </label>
            <Input
              id="telefono"
              type="tel"
              ref={fieldRefs.telefono}
              value={formData.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              onBlur={() => handleBlur('telefono')}
              placeholder="Ej. 0991234567 o +593991234567"
              icon={<Phone size={16} />}
              error={touched['telefono'] ? errors['telefono'] : undefined}
            />
          </div>

          {/* Dirección Fiscal */}
          <div className={`${styles.fieldGroup} ${styles.fullCol}`}>
            <label className={styles.fieldLabel} htmlFor="direccion">
              Dirección Fiscal {formData.tipoDocumento === 'RUC' && <span className={styles.fieldRequired}>*</span>}
            </label>
            <Input
              id="direccion"
              ref={fieldRefs.direccion}
              value={formData.direccion}
              onChange={(e) => handleChange('direccion', e.target.value)}
              onBlur={() => handleBlur('direccion')}
              placeholder="Ej. Av. República del Salvador 1084 y Naciones Unidas, Quito"
              icon={<MapPin size={16} />}
              error={touched['direccion'] ? errors['direccion'] : undefined}
            />
          </div>

          {/* Peticiones Especiales */}
          <div className={`${styles.fieldGroup} ${styles.fullCol}`}>
            <label className={styles.fieldLabel} htmlFor="peticiones">
              Peticiones Especiales al Alojamiento (Opcional)
            </label>
            <Textarea
              id="peticiones"
              value={formData.peticionesEspeciales || ''}
              onChange={(e) => handleChange('peticionesEspeciales', e.target.value)}
              placeholder="Ej. Cama adicional, piso alto, horario aproximado de llegada..."
              rows={2}
            />
          </div>

          {/* Opción de crear cuenta si no está autenticado */}
          {!currentUser && (
            <div className={`${styles.fieldGroup} ${styles.fullCol}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  id="crearCuenta"
                  checked={Boolean(formData.crearCuenta)}
                  onChange={(e) => handleChange('crearCuenta', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-pacific-blue)' }}
                />
                <label htmlFor="crearCuenta" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                  Crear una cuenta en LuxeStays para consultar mis reservas en cualquier momento
                </label>
              </div>

              {formData.crearCuenta && (
                <div style={{ marginTop: '12px', maxWidth: '360px' }}>
                  <Input
                    label="Contraseña para tu nueva cuenta"
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resumen de errores si se intenta enviar con campos incompletos */}
        {errorList.length > 0 && (
          <div className={styles.errorSummaryBox} role="alert">
            <div className={styles.errorSummaryTitle}>
              <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Por favor revisa los siguientes campos antes de continuar:
            </div>
            <ul className={styles.errorSummaryList}>
              {errorList.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Botón de acción */}
        <div className={styles.actionsRow}>
          <Button
            type="submit"
            variant="gold"
            size="lg"
            loading={isSubmitting}
            icon={<ArrowRight size={18} />}
          >
            Continuar al Pago Seguro
          </Button>
        </div>
      </form>
    </div>
  );
};
