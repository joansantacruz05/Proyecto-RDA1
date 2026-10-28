import React, { useState, useEffect } from 'react';
import { onColdStartChange } from '../../lib/api';
import { Loader2, Server } from 'lucide-react';

export const ColdStartBanner: React.FC = () => {
  const [isSlow, setIsSlow] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const unsub = onColdStartChange((slow) => {
      setIsSlow(slow);
      if (slow) setSeconds(0);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let timer: any;
    if (isSlow) {
      timer = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSlow]);

  if (!isSlow) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2500,
        backgroundColor: '#0B132B',
        color: '#FFFFFF',
        border: '1.5px solid #D4AF37',
        borderRadius: '12px',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.3s ease',
      }}
    >
      <Loader2 size={22} className="animate-spin text-yellow-500" style={{ color: '#D4AF37' }} />
      <Server size={20} style={{ color: '#D4AF37' }} />
      <div>
        <p style={{ fontWeight: 600, fontSize: '0.92rem', margin: 0 }}>
          Conectando con el servidor en Render...
        </p>
        <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: 0 }}>
          El servidor se está reactivando tras inactividad ({seconds}s). Por favor espera unos instantes.
        </p>
      </div>
    </div>
  );
};

export default ColdStartBanner;
