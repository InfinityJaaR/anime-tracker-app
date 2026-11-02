import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface SideMenuValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const SideMenuContext = createContext<SideMenuValue | null>(null);

/** Estado compartido del menú lateral para abrirlo desde la cabecera de cualquier pestaña. */
export function SideMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<SideMenuValue>(
    () => ({ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }),
    [isOpen],
  );
  return <SideMenuContext.Provider value={value}>{children}</SideMenuContext.Provider>;
}

export function useSideMenu(): SideMenuValue {
  const value = useContext(SideMenuContext);
  if (!value) throw new Error('useSideMenu debe usarse dentro de SideMenuProvider');
  return value;
}
