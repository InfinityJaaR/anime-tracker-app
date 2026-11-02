import { useEffect, useState } from 'react';

/** Reloj en ms que se refresca cada `intervalMs`, para cuentas atrás compartidas. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
