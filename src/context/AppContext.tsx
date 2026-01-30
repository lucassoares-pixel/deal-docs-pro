import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Client, LegalRepresentative, Product, Contract, AuditLog, User } from '@/types';
import { mockClients, mockLegalRepresentatives, mockProducts, mockContracts, mockAuditLogs, mockUsers, currentUser } from '@/data/mockData';

interface AppState {
  clients: Client[];
  legalRepresentatives: LegalRepresentative[];
  products: Product[];
  contracts: Contract[];
  auditLogs: AuditLog[];
  users: User[];
  currentUser: User;
}

type AppAction =
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'ADD_LEGAL_REP'; payload: LegalRepresentative }
  | { type: 'UPDATE_LEGAL_REP'; payload: LegalRepresentative }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_CONTRACT'; payload: Contract }
  | { type: 'UPDATE_CONTRACT'; payload: Contract }
  | { type: 'ADD_AUDIT_LOG'; payload: AuditLog };

const initialState: AppState = {
  clients: mockClients,
  legalRepresentatives: mockLegalRepresentatives,
  products: mockProducts,
  contracts: mockContracts,
  auditLogs: mockAuditLogs,
  users: mockUsers,
  currentUser: currentUser,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter((c) => c.id !== action.payload),
      };
    case 'ADD_LEGAL_REP':
      return {
        ...state,
        legalRepresentatives: [...state.legalRepresentatives, action.payload],
      };
    case 'UPDATE_LEGAL_REP':
      return {
        ...state,
        legalRepresentatives: state.legalRepresentatives.map((lr) =>
          lr.id === action.payload.id ? action.payload : lr
        ),
      };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload),
      };
    case 'ADD_CONTRACT':
      return { ...state, contracts: [...state.contracts, action.payload] };
    case 'UPDATE_CONTRACT':
      return {
        ...state,
        contracts: state.contracts.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'ADD_AUDIT_LOG':
      return { ...state, auditLogs: [action.payload, ...state.auditLogs] };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Helper hooks
export function useClients() {
  const { state, dispatch } = useApp();
  return {
    clients: state.clients,
    addClient: (client: Client) => dispatch({ type: 'ADD_CLIENT', payload: client }),
    updateClient: (client: Client) => dispatch({ type: 'UPDATE_CLIENT', payload: client }),
    deleteClient: (id: string) => dispatch({ type: 'DELETE_CLIENT', payload: id }),
    getClientById: (id: string) => state.clients.find((c) => c.id === id),
    getLegalRepByClientId: (clientId: string) =>
      state.legalRepresentatives.find((lr) => lr.client_id === clientId),
  };
}

export function useProducts() {
  const { state, dispatch } = useApp();
  return {
    products: state.products,
    activeProducts: state.products.filter((p) => p.active),
    addProduct: (product: Product) => dispatch({ type: 'ADD_PRODUCT', payload: product }),
    updateProduct: (product: Product) => dispatch({ type: 'UPDATE_PRODUCT', payload: product }),
    deleteProduct: (id: string) => dispatch({ type: 'DELETE_PRODUCT', payload: id }),
    getProductById: (id: string) => state.products.find((p) => p.id === id),
  };
}

export function useContracts() {
  const { state, dispatch } = useApp();
  return {
    contracts: state.contracts,
    addContract: (contract: Contract) => dispatch({ type: 'ADD_CONTRACT', payload: contract }),
    updateContract: (contract: Contract) => dispatch({ type: 'UPDATE_CONTRACT', payload: contract }),
    getContractById: (id: string) => state.contracts.find((c) => c.id === id),
    getContractsByClientId: (clientId: string) =>
      state.contracts.filter((c) => c.client_id === clientId),
  };
}

export function useAuditLogs() {
  const { state, dispatch } = useApp();
  return {
    auditLogs: state.auditLogs,
    addAuditLog: (log: AuditLog) => dispatch({ type: 'ADD_AUDIT_LOG', payload: log }),
  };
}

export function useCurrentUser() {
  const { state } = useApp();
  return state.currentUser;
}
