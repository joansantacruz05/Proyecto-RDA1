import React, { useState } from 'react';
import { Mail, Lock, User, AlertCircle, Loader2, Check, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { validatePassword } from '../../lib/password-rules';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const { login, register } = useAuth();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState('Cliente');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const passwordRules = validatePassword(contrasena);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'register' && !passwordRules.isValid) {
      setErrorMsg('La contraseña no cumple con todas las políticas de seguridad.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await login(correo, contrasena);
      } else {
        await register(nombre, correo, contrasena, rol);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error en la autenticación. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Iniciar Sesión en LuxeStays' : 'Crear Cuenta Exclusiva'}
      maxWidth="max-w-md"
    >
      <div>
        {/* Selector de Pestañas */}
        <div className="flex border-b border-white/10 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-semibold cursor-pointer transition ${
              mode === 'login'
                ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-semibold cursor-pointer transition ${
              mode === 'register'
                ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'register' && (
            <div>
              <label className="block text-gray-400 mb-1">Nombre Completo *</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-2.5 text-gray-500" />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Sofía Benalcázar"
                  className="w-full bg-[#0B132B] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-400 mb-1">Correo Electrónico *</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-2.5 text-gray-500" />
              <input
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="usuario@ejemplo.com"
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Contraseña *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-2.5 text-gray-500" />
              <input
                type="password"
                required
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Checklist de Reglas de Contraseña al registrarse */}
          {mode === 'register' && contrasena.length > 0 && (
            <div className="bg-[#0B132B] p-2.5 rounded-lg border border-white/5 space-y-1 text-[11px]">
              <div
                className={`flex items-center gap-1.5 ${
                  passwordRules.hasMinLength ? 'text-emerald-400' : 'text-gray-500'
                }`}
              >
                {passwordRules.hasMinLength ? <Check size={12} /> : <X size={12} />}
                <span>Mínimo 8 caracteres</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  passwordRules.hasUppercase ? 'text-emerald-400' : 'text-gray-500'
                }`}
              >
                {passwordRules.hasUppercase ? <Check size={12} /> : <X size={12} />}
                <span>Al menos una mayúscula</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  passwordRules.hasLowercase ? 'text-emerald-400' : 'text-gray-500'
                }`}
              >
                {passwordRules.hasLowercase ? <Check size={12} /> : <X size={12} />}
                <span>Al menos una minúscula</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  passwordRules.hasNumber ? 'text-emerald-400' : 'text-gray-500'
                }`}
              >
                {passwordRules.hasNumber ? <Check size={12} /> : <X size={12} />}
                <span>Al menos un número</span>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-gray-400 mb-1">Tipo de Cuenta</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRol('Cliente')}
                  className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                    rol === 'Cliente'
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400'
                  }`}
                >
                  <div className="font-semibold">Huésped / Cliente</div>
                  <div className="text-[10px] text-gray-400">Busco reservar estancias</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRol('Anfitrión')}
                  className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                    rol === 'Anfitrión'
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400'
                  }`}
                >
                  <div className="font-semibold">Anfitrión / Host</div>
                  <div className="text-[10px] text-gray-400">Publicar mis propiedades</div>
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            <span>
              {loading
                ? 'Verificando...'
                : mode === 'login'
                ? 'Iniciar Sesión'
                : 'Completar Registro'}
            </span>
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default AuthModal;
