'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Entitlements } from './types';

const developmentEntitlements: Entitlements = {
  has: () => true,
};

const EntitlementContext = createContext<Entitlements>(developmentEntitlements);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  return (
    <EntitlementContext.Provider value={developmentEntitlements}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlements(): Entitlements {
  return useContext(EntitlementContext);
}

