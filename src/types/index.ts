export type ClientStatus = 'prospect' | 'attivo' | 'confermato' | 'archiviato';
export type EventType = 'matrimonio' | 'compleanno' | 'battesimo' | 'comunione' | 'altro';
export type QuoteStatus = 'bozza' | 'inviato' | 'confermato' | 'rifiutato' | 'scaduto' | 'completato';
export type CeremonyType = 'religiosa' | 'civile' | 'simbolica';
export type TaxRegime = 'forfettario' | 'ordinario';
export type PdfTemplate = 'elegante' | 'minimal';
export type UnitOfMeasure = 'pezzo' | 'coppia' | 'tavolo' | 'metro' | 'servizio' | 'evento';

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  eventType: EventType;
  notes: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  sortOrder: number;
}

export interface Service {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  description: string;
  basePrice: number;
  unit: UnitOfMeasure;
  transportIncluded: boolean;
  imagePath: string | null;
  sortOrder: number;
}

export interface Quote {
  id: number;
  number: string;
  clientId: number;
  clientName?: string;
  eventType: EventType;
  eventDate: string;
  eventLocation: string;
  guestCount: number;
  tableCount: number;
  expiryDate: string;
  internalNotes: string;
  clientNotes: string;
  conditions: string;
  status: QuoteStatus;
  subtotal: number;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number;
  discountNote: string;
  taxRate: number;
  total: number;
  confirmedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItem {
  id: number;
  quoteId: number;
  serviceId: number | null;
  section: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isGift: boolean;
  sortOrder: number;
}

export interface WeddingDetails {
  id: number;
  quoteId: number;
  brideName: string;
  groomName: string;
  ceremonyType: CeremonyType;
  churchName: string;
  receptionName: string;
  hasCoordinator: boolean;
  palette: string;
  paletteColors: string;
  style: string;
  flowers: string;
  greenery: string;
  areas: string;
}

export interface PaymentPlan {
  id: number;
  quoteId: number;
  description: string;
  percentage: number;
  amount: number;
  dueDate: string;
  sortOrder: number;
}

export interface CompanySettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  vatNumber: string;
  logoPath: string;
  taxRegime: TaxRegime;
  vatRate: number;
  defaultTemplate: PdfTemplate;
  defaultPaymentDeposit: number;
  defaultPaymentSecond: number;
  defaultPaymentBalance: number;
  defaultNotes: string;
  defaultConditions: string;
  quotePrefix: string;
  quoteStartNumber: number;
}

export interface DashboardStats {
  expiringQuotes: Quote[];
  upcomingEvents: Quote[];
  monthlyQuotes: number;
  monthlyValue: number;
  conversionRate: number;
  monthlyRevenue: { month: string; value: number }[];
}

export const WEDDING_PALETTES = [
  { name: 'Avorio & Bianco', colors: ['#FFFFF0', '#FFFFFF', '#F5F5DC'] },
  { name: 'Blush & Oro', colors: ['#FFB6C1', '#FFD700', '#FFF8DC'] },
  { name: 'Verde Salvia & Champagne', colors: ['#9CAF88', '#F7E7CE', '#E8DCC8'] },
  { name: 'Bordeaux & Grigio', colors: ['#722F37', '#808080', '#D3D3D3'] },
  { name: 'Navy & Oro', colors: ['#000080', '#FFD700', '#FFFFF0'] },
  { name: 'Tutto Bianco Romantico', colors: ['#FFFFFF', '#FFFAFA', '#FFF5EE'] },
  { name: 'Boho Naturale', colors: ['#C4A484', '#8B7355', '#F5DEB3'] },
  { name: 'Moderno Nero & Bianco', colors: ['#000000', '#FFFFFF', '#C0C0C0'] },
];

export const WEDDING_STYLES = [
  { id: 'rustico', name: 'Rustico / Boho', icon: '🌿' },
  { id: 'romantico', name: 'Romantico / Provenzale', icon: '🌸' },
  { id: 'luxury', name: 'Luxury / Glamour', icon: '✨' },
  { id: 'garden', name: 'Garden Party', icon: '🌿' },
  { id: 'classico', name: 'Classico / Elegante', icon: '🏛️' },
  { id: 'seaside', name: 'Seaside / Mediterraneo', icon: '🌊' },
  { id: 'autunnale', name: 'Autunnale / Caldo', icon: '🍂' },
  { id: 'invernale', name: 'Invernale / Minimalista', icon: '❄️' },
];

export const FLOWERS = [
  { id: 'rose-vendela', name: 'Rosa Vendela', category: 'Rose' },
  { id: 'rose-colombiana', name: 'Rosa Colombiana', category: 'Rose' },
  { id: 'rose-avalanche', name: 'Rosa Avalanche', category: 'Rose' },
  { id: 'rose-explorer', name: 'Rosa Explorer', category: 'Rose' },
  { id: 'ortensia-bianca', name: 'Ortensia Bianca', category: 'Ortensie' },
  { id: 'ortensia-verde', name: 'Ortensia Verde Lime', category: 'Ortensie' },
  { id: 'ortensia-rosa', name: 'Ortensia Rosa', category: 'Ortensie' },
  { id: 'ortensia-azzurra', name: 'Ortensia Azzurra', category: 'Ortensie' },
  { id: 'peonia', name: 'Peonia', category: 'Fiori Principali' },
  { id: 'ranuncolo', name: 'Ranuncolo', category: 'Fiori Principali' },
  { id: 'tulipano', name: 'Tulipano', category: 'Fiori Principali' },
  { id: 'lilium', name: 'Lilium', category: 'Fiori Principali' },
  { id: 'iris', name: 'Iris', category: 'Fiori Principali' },
  { id: 'gypsophila', name: 'Gypsophila / Nebbiolina', category: 'Fiori Principali' },
  { id: 'lisianthus', name: 'Lisianthus', category: 'Fiori Principali' },
  { id: 'fresia', name: 'Fresia', category: 'Fiori Principali' },
  { id: 'gerbera', name: 'Gerbera', category: 'Fiori Principali' },
  { id: 'dalia', name: 'Dalia', category: 'Fiori Principali' },
  { id: 'anemone', name: 'Anemone', category: 'Fiori Principali' },
  { id: 'calla', name: 'Calla', category: 'Fiori Principali' },
  { id: 'wax-flower', name: 'Wax Flower', category: 'Fiori Principali' },
];

export const GREENERY = [
  { id: 'eucalipto', name: 'Eucalipto' },
  { id: 'ruscus', name: 'Ruscus' },
  { id: 'asparagina', name: 'Asparagina' },
  { id: 'hedera', name: 'Hedera' },
  { id: 'smilax', name: 'Smilax' },
  { id: 'salal', name: 'Salal' },
  { id: 'fern', name: 'Felce' },
];

export const WEDDING_AREAS = [
  { id: 'chiesa', name: 'Chiesa / Cerimonia civile' },
  { id: 'location', name: 'Location ricevimento' },
  { id: 'casa-sposa', name: 'Casa sposa' },
  { id: 'casa-sposo', name: 'Casa sposo' },
  { id: 'auto', name: 'Auto degli sposi' },
  { id: 'welcome', name: 'Welcome table' },
  { id: 'photobooth', name: 'Photo booth floreale' },
];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  matrimonio: 'Matrimonio',
  compleanno: 'Compleanno',
  battesimo: 'Battesimo',
  comunione: 'Comunione',
  altro: 'Altro',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: 'Prospect',
  attivo: 'Attivo',
  confermato: 'Confermato',
  archiviato: 'Archiviato',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  bozza: 'Bozza',
  inviato: 'Inviato',
  confermato: 'Confermato',
  rifiutato: 'Rifiutato',
  scaduto: 'Scaduto',
  completato: 'Completato',
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  bozza: '#EAB308',
  inviato: '#3B82F6',
  confermato: '#22C55E',
  rifiutato: '#EF4444',
  scaduto: '#6B7280',
  completato: '#10B981',
};
