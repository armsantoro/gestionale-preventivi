import { create } from 'zustand';

type Page = 'dashboard' | 'clients' | 'services' | 'quotes' | 'settings' | 'quote-editor';

interface AppState {
  currentPage: Page;
  darkMode: boolean;
  editingQuoteId: number | null;
  editingClientId: number | null;
  setPage: (page: Page) => void;
  toggleDarkMode: () => void;
  setEditingQuoteId: (id: number | null) => void;
  setEditingClientId: (id: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  darkMode: localStorage.getItem('sf_darkMode') === 'true',
  editingQuoteId: null,
  editingClientId: null,
  setPage: (page) => set({ currentPage: page, editingQuoteId: null, editingClientId: null }),
  toggleDarkMode: () => set((state) => {
    const newMode = !state.darkMode;
    localStorage.setItem('sf_darkMode', String(newMode));
    return { darkMode: newMode };
  }),
  setEditingQuoteId: (id) => set({ editingQuoteId: id, currentPage: 'quote-editor' }),
  setEditingClientId: (id) => set({ editingClientId: id }),
}));
