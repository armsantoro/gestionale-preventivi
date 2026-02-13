import type {
  Client, Service, ServiceCategory, Quote, QuoteItem,
  WeddingDetails, PaymentPlan, CompanySettings
} from '../types';

const DB_PREFIX = 'sf_';

function getStore<T>(key: string): T[] {
  const data = localStorage.getItem(DB_PREFIX + key);
  return data ? JSON.parse(data) : [];
}

function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(DB_PREFIX + key, JSON.stringify(data));
}

function getNextId(key: string): number {
  const items = getStore<{ id: number }>(key);
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
}

// ============ CLIENTS ============
export function getClients(): Client[] {
  return getStore<Client>('clients');
}

export function getClient(id: number): Client | undefined {
  return getClients().find(c => c.id === id);
}

export function createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client {
  const clients = getClients();
  const now = new Date().toISOString();
  const newClient: Client = { ...client, id: getNextId('clients'), createdAt: now, updatedAt: now };
  clients.push(newClient);
  setStore('clients', clients);
  return newClient;
}

export function updateClient(id: number, data: Partial<Client>): Client | undefined {
  const clients = getClients();
  const idx = clients.findIndex(c => c.id === id);
  if (idx === -1) return undefined;
  clients[idx] = { ...clients[idx], ...data, updatedAt: new Date().toISOString() };
  setStore('clients', clients);
  return clients[idx];
}

export function deleteClient(id: number): boolean {
  const clients = getClients();
  const filtered = clients.filter(c => c.id !== id);
  if (filtered.length === clients.length) return false;
  setStore('clients', filtered);
  return true;
}

// ============ SERVICE CATEGORIES ============
export function getCategories(): ServiceCategory[] {
  return getStore<ServiceCategory>('categories');
}

export function createCategory(cat: Omit<ServiceCategory, 'id'>): ServiceCategory {
  const cats = getCategories();
  const newCat: ServiceCategory = { ...cat, id: getNextId('categories') };
  cats.push(newCat);
  setStore('categories', cats);
  return newCat;
}

export function updateCategory(id: number, data: Partial<ServiceCategory>): ServiceCategory | undefined {
  const cats = getCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1) return undefined;
  cats[idx] = { ...cats[idx], ...data };
  setStore('categories', cats);
  return cats[idx];
}

export function deleteCategory(id: number): boolean {
  const cats = getCategories();
  setStore('categories', cats.filter(c => c.id !== id));
  const services = getServices();
  setStore('services', services.filter(s => s.categoryId !== id));
  return true;
}

// ============ SERVICES ============
export function getServices(): Service[] {
  const services = getStore<Service>('services');
  const cats = getCategories();
  return services.map(s => ({
    ...s,
    categoryName: cats.find(c => c.id === s.categoryId)?.name || '',
  }));
}

export function getServicesByCategory(categoryId: number): Service[] {
  return getServices().filter(s => s.categoryId === categoryId);
}

export function createService(service: Omit<Service, 'id' | 'categoryName'>): Service {
  const services = getStore<Service>('services');
  const newService: Service = { ...service, id: getNextId('services') };
  services.push(newService);
  setStore('services', services);
  return newService;
}

export function updateService(id: number, data: Partial<Service>): Service | undefined {
  const services = getStore<Service>('services');
  const idx = services.findIndex(s => s.id === id);
  if (idx === -1) return undefined;
  services[idx] = { ...services[idx], ...data };
  setStore('services', services);
  return services[idx];
}

export function deleteService(id: number): boolean {
  const services = getStore<Service>('services');
  setStore('services', services.filter(s => s.id !== id));
  return true;
}

// ============ QUOTES ============
export function getQuotes(): Quote[] {
  const quotes = getStore<Quote>('quotes');
  const clients = getClients();
  return quotes.map(q => ({
    ...q,
    clientName: clients.find(c => c.id === q.clientId)?.name || 'Cliente eliminato',
  }));
}

export function getQuote(id: number): Quote | undefined {
  return getQuotes().find(q => q.id === id);
}

export function getQuotesByClient(clientId: number): Quote[] {
  return getQuotes().filter(q => q.clientId === clientId);
}

export function createQuote(quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>): Quote {
  const quotes = getStore<Quote>('quotes');
  const now = new Date().toISOString();
  const newQuote: Quote = { ...quote, id: getNextId('quotes'), createdAt: now, updatedAt: now };
  quotes.push(newQuote);
  setStore('quotes', quotes);
  return newQuote;
}

export function updateQuote(id: number, data: Partial<Quote>): Quote | undefined {
  const quotes = getStore<Quote>('quotes');
  const idx = quotes.findIndex(q => q.id === id);
  if (idx === -1) return undefined;
  quotes[idx] = { ...quotes[idx], ...data, updatedAt: new Date().toISOString() };
  setStore('quotes', quotes);
  return quotes[idx];
}

export function deleteQuote(id: number): boolean {
  const quotes = getStore<Quote>('quotes');
  setStore('quotes', quotes.filter(q => q.id !== id));
  setStore('quote_items', getStore<QuoteItem>('quote_items').filter(i => i.quoteId !== id));
  setStore('wedding_details', getStore<WeddingDetails>('wedding_details').filter(w => w.quoteId !== id));
  setStore('payment_plans', getStore<PaymentPlan>('payment_plans').filter(p => p.quoteId !== id));
  return true;
}

// ============ QUOTE ITEMS ============
export function getQuoteItems(quoteId: number): QuoteItem[] {
  return getStore<QuoteItem>('quote_items')
    .filter(i => i.quoteId === quoteId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function setQuoteItems(quoteId: number, items: Omit<QuoteItem, 'id'>[]): QuoteItem[] {
  const allItems = getStore<QuoteItem>('quote_items').filter(i => i.quoteId !== quoteId);
  let nextId = allItems.length > 0 ? Math.max(...allItems.map(i => i.id)) + 1 : 1;
  const newItems = items.map((item, idx) => ({
    ...item,
    id: nextId++,
    quoteId,
    sortOrder: idx,
  }));
  setStore('quote_items', [...allItems, ...newItems]);
  return newItems;
}

// ============ WEDDING DETAILS ============
export function getWeddingDetails(quoteId: number): WeddingDetails | undefined {
  return getStore<WeddingDetails>('wedding_details').find(w => w.quoteId === quoteId);
}

export function setWeddingDetails(quoteId: number, details: Omit<WeddingDetails, 'id'>): WeddingDetails {
  const all = getStore<WeddingDetails>('wedding_details').filter(w => w.quoteId !== quoteId);
  const newDetails: WeddingDetails = { ...details, id: getNextId('wedding_details'), quoteId };
  all.push(newDetails);
  setStore('wedding_details', all);
  return newDetails;
}

// ============ PAYMENT PLANS ============
export function getPaymentPlans(quoteId: number): PaymentPlan[] {
  return getStore<PaymentPlan>('payment_plans')
    .filter(p => p.quoteId === quoteId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function setPaymentPlans(quoteId: number, plans: Omit<PaymentPlan, 'id'>[]): PaymentPlan[] {
  const all = getStore<PaymentPlan>('payment_plans').filter(p => p.quoteId !== quoteId);
  let nextId = all.length > 0 ? Math.max(...all.map(p => p.id)) + 1 : 1;
  const newPlans = plans.map((plan, idx) => ({
    ...plan,
    id: nextId++,
    quoteId,
    sortOrder: idx,
  }));
  setStore('payment_plans', [...all, ...newPlans]);
  return newPlans;
}

// ============ SETTINGS ============
const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'Stella Filella Wedding & Events',
  address: '',
  phone: '',
  email: '',
  vatNumber: '',
  logoPath: '',
  taxRegime: 'forfettario',
  vatRate: 22,
  defaultTemplate: 'elegante',
  defaultPaymentDeposit: 30,
  defaultPaymentSecond: 30,
  defaultPaymentBalance: 40,
  defaultNotes: 'Eventuali danni agli accessori saranno addebitati al costo corrente di mercato.',
  defaultConditions: 'Il presente preventivo ha validità 30 giorni dalla data di emissione. I prezzi indicati si intendono IVA esclusa salvo diversa indicazione. Eventuali variazioni richieste dopo la conferma potranno comportare adeguamenti di prezzo.',
  quotePrefix: 'PRV',
  quoteStartNumber: 1,
};

export function getSettings(): CompanySettings {
  const data = localStorage.getItem(DB_PREFIX + 'settings');
  return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
}

export function updateSettings(settings: Partial<CompanySettings>): CompanySettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(DB_PREFIX + 'settings', JSON.stringify(updated));
  return updated;
}

// ============ SEED DATA ============
export function seedDatabase(): void {
  if (localStorage.getItem(DB_PREFIX + 'seeded')) return;

  const categories: Omit<ServiceCategory, 'id'>[] = [
    { name: 'Allestimento Chiesa', sortOrder: 1 },
    { name: 'Allestimento Location', sortOrder: 2 },
    { name: 'Casa Sposa', sortOrder: 3 },
    { name: 'Casa Sposo', sortOrder: 4 },
    { name: 'Servizi Extra', sortOrder: 5 },
    { name: 'Pacchetti Compleanno', sortOrder: 6 },
    { name: 'Pacchetti Battesimo / Comunione', sortOrder: 7 },
  ];

  const createdCats = categories.map(c => createCategory(c));

  const churchCat = createdCats[0].id;
  const locationCat = createdCats[1].id;
  const casaSposaCat = createdCats[2].id;
  const casaSposoCat = createdCats[3].id;
  const extraCat = createdCats[4].id;
  const complCat = createdCats[5].id;
  const battCat = createdCats[6].id;

  const services: Omit<Service, 'id' | 'categoryName'>[] = [
    // Allestimento Chiesa
    { categoryId: churchCat, name: 'Broken Arch grande (esterno)', description: 'Struttura ad arco spezzato grande per esterno chiesa con composizioni floreali', basePrice: 450, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 1 },
    { categoryId: churchCat, name: 'Broken Arch piccolo (interno)', description: 'Struttura ad arco spezzato piccolo per interno chiesa', basePrice: 350, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 2 },
    { categoryId: churchCat, name: 'Composizione tavolo celebrativo', description: 'Composizione floreale per il tavolo della cerimonia', basePrice: 120, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 3 },
    { categoryId: churchCat, name: 'Composizioni a festoni per balaustre (x2)', description: 'Coppia di festoni floreali per balaustre della chiesa', basePrice: 280, unit: 'coppia', transportIncluded: false, imagePath: null, sortOrder: 4 },
    { categoryId: churchCat, name: 'Composizione floreale crocefisso', description: 'Composizione floreale decorativa per il crocefisso', basePrice: 90, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 5 },
    { categoryId: churchCat, name: 'Composizioni altare maggiore (x2)', description: 'Coppia di composizioni floreali per altare maggiore', basePrice: 320, unit: 'coppia', transportIncluded: false, imagePath: null, sortOrder: 6 },
    { categoryId: churchCat, name: 'Bottoniere', description: 'Bottoniera floreale per giacca', basePrice: 15, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 7 },
    { categoryId: churchCat, name: 'Bouquet sposa', description: 'Bouquet da sposa con fiori selezionati', basePrice: 180, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 8 },
    { categoryId: churchCat, name: 'Bouquet lancio', description: 'Bouquet per il lancio della sposa', basePrice: 80, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 9 },
    { categoryId: churchCat, name: 'Corner riso con accessori', description: 'Angolo riso completo con cesti e accessori', basePrice: 150, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 10 },
    { categoryId: churchCat, name: 'Decorazione floreale auto con nastri', description: 'Decorazione floreale per auto sposi con nastri coordinati', basePrice: 120, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 11 },

    // Allestimento Location
    { categoryId: locationCat, name: 'Centrotavola con candelieri e composizione su alzatina', description: 'Centrotavola elegante con candelieri e composizione su alzatina', basePrice: 45, unit: 'tavolo', transportIncluded: false, imagePath: null, sortOrder: 1 },
    { categoryId: locationCat, name: 'Tableau de mariage personalizzato', description: 'Tableau de mariage con grafica personalizzata e decorazione floreale', basePrice: 200, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 2 },
    { categoryId: locationCat, name: 'Runner in tessuto per tavoli aperitivo', description: 'Runner decorativo in tessuto per tavolo aperitivo', basePrice: 25, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 3 },
    { categoryId: locationCat, name: 'Tavolo sposi completo', description: 'Allestimento completo tavolo degli sposi con composizioni floreali', basePrice: 350, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 4 },
    { categoryId: locationCat, name: 'Tavolo torta completo', description: 'Allestimento completo del tavolo torta nuziale', basePrice: 200, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 5 },
    { categoryId: locationCat, name: 'Tavolo confetti completo con accessori', description: 'Tavolo confettata con sacchettini, nastri e accessori', basePrice: 250, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 6 },
    { categoryId: locationCat, name: 'Tavolo rum e sigari con accessori', description: 'Angolo rum e sigari con decorazione e accessori', basePrice: 300, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 7 },
    { categoryId: locationCat, name: 'Sistemazione bomboniere', description: 'Disposizione e allestimento bomboniere', basePrice: 100, unit: 'servizio', transportIncluded: false, imagePath: null, sortOrder: 8 },

    // Casa Sposa
    { categoryId: casaSposaCat, name: 'Composizioni floreali ingresso principale (su struttura)', description: 'Composizioni floreali decorative su struttura per ingresso', basePrice: 250, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 1 },
    { categoryId: casaSposaCat, name: 'Tavolo dolci completo', description: 'Allestimento tavolo dolci con decorazioni floreali', basePrice: 200, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 2 },
    { categoryId: casaSposaCat, name: 'Decorazione scala con bouquet di nebbia e nastri', description: 'Decorazione della scala con composizioni di nebbiolina e nastri', basePrice: 180, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 3 },

    // Casa Sposo
    { categoryId: casaSposoCat, name: 'Composizioni floreali ingresso principale', description: 'Composizioni floreali per ingresso casa sposo', basePrice: 180, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 1 },
    { categoryId: casaSposoCat, name: 'Tavolo dolci completo', description: 'Allestimento tavolo dolci casa sposo', basePrice: 180, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 2 },

    // Servizi Extra
    { categoryId: extraCat, name: 'Wedding Coordinator', description: 'Servizio di coordinamento dalla firma del contratto al giorno dell\'evento', basePrice: 1500, unit: 'evento', transportIncluded: true, imagePath: null, sortOrder: 1 },
    { categoryId: extraCat, name: 'Trasporto e montaggio', description: 'Servizio di trasporto materiali e montaggio allestimenti', basePrice: 400, unit: 'servizio', transportIncluded: true, imagePath: null, sortOrder: 2 },
    { categoryId: extraCat, name: 'Smontaggio post-evento', description: 'Servizio di smontaggio e ritiro materiali post-evento', basePrice: 250, unit: 'servizio', transportIncluded: true, imagePath: null, sortOrder: 3 },

    // Pacchetti Compleanno
    { categoryId: complCat, name: 'Allestimento tavolo torta', description: 'Decorazione completa tavolo torta per compleanno', basePrice: 150, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 1 },
    { categoryId: complCat, name: 'Palloncini e strutture', description: 'Archi e strutture con palloncini', basePrice: 200, unit: 'servizio', transportIncluded: false, imagePath: null, sortOrder: 2 },
    { categoryId: complCat, name: 'Centrotavola tematici', description: 'Centrotavola a tema per festa di compleanno', basePrice: 30, unit: 'tavolo', transportIncluded: false, imagePath: null, sortOrder: 3 },
    { categoryId: complCat, name: 'Backdrop personalizzato', description: 'Fondale fotografico personalizzato con tema', basePrice: 350, unit: 'pezzo', transportIncluded: false, imagePath: null, sortOrder: 4 },

    // Battesimo/Comunione
    { categoryId: battCat, name: 'Allestimento chiesa (piccolo)', description: 'Allestimento floreale chiesa formato ridotto', basePrice: 200, unit: 'servizio', transportIncluded: false, imagePath: null, sortOrder: 1 },
    { categoryId: battCat, name: 'Centrotavola bimbi', description: 'Centrotavola delicato per battesimo/comunione', basePrice: 25, unit: 'tavolo', transportIncluded: false, imagePath: null, sortOrder: 2 },
    { categoryId: battCat, name: 'Confettata completa', description: 'Tavolo confettata con accessori e sacchettini', basePrice: 200, unit: 'servizio', transportIncluded: false, imagePath: null, sortOrder: 3 },
  ];

  services.forEach(s => createService(s));
  localStorage.setItem(DB_PREFIX + 'seeded', 'true');
}

// ============ QUOTE NUMBER GENERATION ============
export function getNextQuoteNumber(): string {
  const settings = getSettings();
  const quotes = getStore<Quote>('quotes');
  const year = new Date().getFullYear();
  const yearQuotes = quotes.filter(q => q.number.includes(`-${year}-`));
  const nextNum = yearQuotes.length > 0
    ? Math.max(...yearQuotes.map(q => parseInt(q.number.split('-').pop() || '0'))) + 1
    : settings.quoteStartNumber;
  return `${settings.quotePrefix}-${year}-${String(nextNum).padStart(4, '0')}`;
}

// ============ DASHBOARD STATS ============
export function getDashboardStats(): {
  expiringQuotes: Quote[];
  upcomingEvents: Quote[];
  monthlyQuotes: number;
  monthlyValue: number;
  conversionRate: number;
  monthlyRevenue: { month: string; value: number }[];
} {
  const quotes = getQuotes();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringQuotes = quotes.filter(q => {
    const expiry = new Date(q.expiryDate);
    return (q.status === 'inviato' || q.status === 'bozza') && expiry <= thirtyDaysFromNow && expiry >= now;
  });

  const upcomingEvents = quotes
    .filter(q => q.status === 'confermato' && new Date(q.eventDate) >= now)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 5);

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthQuotes = quotes.filter(q => {
    const d = new Date(q.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const confirmedThisMonth = monthQuotes.filter(q => q.status === 'confermato' || q.status === 'completato');

  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const monthlyRevenue = months.map((month, idx) => {
    const monthQuotesAll = quotes.filter(q => {
      const d = new Date(q.eventDate);
      return d.getMonth() === idx && d.getFullYear() === currentYear &&
        (q.status === 'confermato' || q.status === 'completato');
    });
    return { month, value: monthQuotesAll.reduce((sum, q) => sum + q.total, 0) };
  });

  return {
    expiringQuotes,
    upcomingEvents,
    monthlyQuotes: monthQuotes.length,
    monthlyValue: monthQuotes.reduce((sum, q) => sum + q.total, 0),
    conversionRate: monthQuotes.length > 0 ? (confirmedThisMonth.length / monthQuotes.length) * 100 : 0,
    monthlyRevenue,
  };
}

// ============ EXPORT ============
export function exportAllData(): string {
  const data: Record<string, unknown> = {};
  const keys = ['clients', 'categories', 'services', 'quotes', 'quote_items', 'wedding_details', 'payment_plans', 'settings'];
  keys.forEach(key => {
    const val = localStorage.getItem(DB_PREFIX + key);
    data[key] = val ? JSON.parse(val) : null;
  });
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null) {
        localStorage.setItem(DB_PREFIX + key, JSON.stringify(value));
      }
    });
    return true;
  } catch {
    return false;
  }
}
