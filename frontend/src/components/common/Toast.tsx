import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const isError = t.type === 'error';
        const isSuccess = t.type === 'success' || !t.type;
        const isWarning = t.type === 'warning';

        return (
          <div
            key={t.id}
            className={`toast ${isError ? 'toast-error' : isSuccess ? 'toast-success' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isSuccess && <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />}
              {isError && <XCircle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />}
              {isWarning && <AlertTriangle size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />}
              <span style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{t.message}</span>
            </div>
            <button
              onClick={() => onRemove(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;
