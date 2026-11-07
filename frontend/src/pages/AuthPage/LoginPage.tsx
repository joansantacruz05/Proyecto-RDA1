import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, Crown } from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { api, setAuthToken } from '../../api/client';
import { LoginResponse, UsuarioSession, ProblemDetailsException } from '../../api/types';
import styles from './Auth.module.css';

interface LoginPageProps {
  onLoginSuccess: (user: UsuarioSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!correo || !correo.includes('@')) {
      setErrorMessage('Por favor ingrese un correo electrónico válido.');
      return;
    }
    if (!contrasena) {
      setErrorMessage('Por favor ingrese su contraseña.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post<LoginResponse>('/auth/login', {
        correo: correo.trim().toLowerCase(),
        contrasena,
      });

      if (res?.access_token) {
        setAuthToken(res.access_token);
        onLoginSuccess(res.usuario);
        navigate(returnUrl, { replace: true });
      } else {
        setErrorMessage('Respuesta inesperada del servidor de autenticación.');
      }
    } catch (err: unknown) {
      if (err instanceof ProblemDetailsException) {
        setErrorMessage(err.problem.detail || 'Credenciales inválidas. Verifique su correo y contraseña.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo iniciar sesión. Verifique sus credenciales.');
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
          <h1 className={styles.authTitle}>Iniciar Sesión</h1>
          <p className={styles.authSubtitle}>
            Accede a tus reservas, facturas electrónicas SRI y beneficios exclusivos.
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
            <label className={styles.fieldLabel} htmlFor="contrasena">
              Contraseña
            </label>
            <Input
              id="contrasena"
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
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
              icon={<LogIn size={18} />}
            >
              Iniciar Sesión
            </Button>
          </div>
        </form>

        <div className={styles.authFooter}>
          <span>¿Aún no tienes una cuenta?</span>
          <Link
            to={returnUrl !== '/' ? `/registro?returnUrl=${encodeURIComponent(returnUrl)}` : '/registro'}
            className={styles.authLink}
          >
            Regístrate aquí
          </Link>
        </div>
      </div>
    </div>
  );
};

