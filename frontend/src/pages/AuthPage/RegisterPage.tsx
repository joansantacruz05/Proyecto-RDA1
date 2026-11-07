import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Phone, UserPlus, AlertCircle, Crown } from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { api, setAuthToken } from '../../api/client';
import { LoginResponse, UsuarioSession, ProblemDetailsException } from '../../api/types';
import styles from './Auth.module.css';

interface RegisterPageProps {
  onLoginSuccess: (user: UsuarioSession) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onLoginSuccess }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!nombre || nombre.trim().length < 3) {
      setErrorMessage('Ingrese su nombre completo (mínimo 3 caracteres).');
      return;
    }
    if (!correo || !correo.includes('@')) {
      setErrorMessage('Ingrese un correo electrónico válido.');
      return;
    }
    if (!contrasena || contrasena.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setIsLoading(true);
      // 1. Registrar usuario
      await api.post('/auth/register', {
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim() || undefined,
        contrasena,
      });

      // 2. Iniciar sesión automáticamente
      const loginRes = await api.post<LoginResponse>('/auth/login', {
        correo: correo.trim().toLowerCase(),
        contrasena,
      });

      if (loginRes?.access_token) {
        setAuthToken(loginRes.access_token);
        onLoginSuccess(loginRes.usuario);
        navigate(returnUrl, { replace: true });
      } else {
        navigate('/login');
      }
    } catch (err: unknown) {
      if (err instanceof ProblemDetailsException) {
        setErrorMessage(err.problem.detail || 'Error al registrar usuario. Es posible que el correo ya esté en uso.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Ocurrió un error al registrar su cuenta.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <div className={styles.authBadge}>
            <Crown size={14} color="#C9A227" />
            <span>LuxeStays Ecuador</span>
          </div>
          <h1 className={styles.authTitle}>Crear Cuenta</h1>
          <p className={styles.authSubtitle}>
            Únete para gestionar tus reservas y acceder a tarifas preferenciales en Ecuador.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="nombre">
              Nombre Completo
            </label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Roberto Zambrano"
              icon={<User size={16} />}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="correo">
              Correo Electrónico
            </label>
            <Input
              id="correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
              icon={<Mail size={16} />}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="telefono">
              Teléfono Celular (Opcional)
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
            <label className={styles.fieldLabel} htmlFor="contrasena">
              Contraseña
            </label>
            <Input
              id="contrasena"
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              icon={<Lock size={16} />}
              required
            />
          </div>

          <div style={{ marginTop: 'var(--spacing-2)' }}>
            <Button
              type="submit"
              variant="gold"
              size="lg"
              fullWidth
              loading={isLoading}
              icon={<UserPlus size={18} />}
            >
              Registrarme
            </Button>
          </div>
        </form>

        <div className={styles.authFooter}>
          <span>¿Ya tienes una cuenta registrada?</span>
          <Link
            to={returnUrl !== '/' ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'}
            className={styles.authLink}
          >
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
};
