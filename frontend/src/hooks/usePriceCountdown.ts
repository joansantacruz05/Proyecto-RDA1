import { useState, useEffect, useCallback } from 'react';

interface UsePriceCountdownOptions {
  tarifaValidaHasta?: string | undefined;
  duracionMinutos?: number;
  onExpire?: () => void;
}

export interface UsePriceCountdownReturn {
  formattedTime: string;
  secondsRemaining: number;
  isExpired: boolean;
  percentageRemaining: number;
  resetCountdown: () => void;
}

export function usePriceCountdown({
  tarifaValidaHasta,
  duracionMinutos = 15,
  onExpire,
}: UsePriceCountdownOptions = {}): UsePriceCountdownReturn {
  const computeInitialSeconds = useCallback(() => {
    if (tarifaValidaHasta) {
      const expireDate = new Date(tarifaValidaHasta).getTime();
      const now = Date.now();
      const diffSec = Math.floor((expireDate - now) / 1000);
      return diffSec > 0 ? diffSec : 0;
    }
    return duracionMinutos * 60;
  }, [tarifaValidaHasta, duracionMinutos]);

  const totalSeconds = duracionMinutos * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(computeInitialSeconds);
  const [isExpired, setIsExpired] = useState<boolean>(secondsRemaining <= 0);

  const resetCountdown = useCallback(() => {
    const freshSeconds = computeInitialSeconds();
    setSecondsRemaining(freshSeconds);
    setIsExpired(freshSeconds <= 0);
  }, [computeInitialSeconds]);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      setIsExpired(true);
      if (onExpire) {
        onExpire();
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, onExpire]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const percentageRemaining = Math.max(0, Math.min(100, Math.round((secondsRemaining / totalSeconds) * 100)));

  return {
    formattedTime,
    secondsRemaining,
    isExpired,
    percentageRemaining,
    resetCountdown,
  };
}

