import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import * as db from '../database';
import {
  Client, EventType, Quote, QuoteItem, WeddingDetails, PaymentPlan, Service, ServiceCategory,
  WEDDING_PALETTES, WEDDING_STYLES, FLOWERS, GREENERY, WEDDING_AREAS,
  EVENT_TYPE_LABELS, CeremonyType, CompanySettings
} from '../types';
import { formatCurrency, formatDate, formatDateInput } from '../utils/format';
import {
  ChevronLeft, ChevronRight, Save, FileText, Copy, Plus, Trash2, X, Check, Gift
} from 'lucide-react';

// ─── Helper types ───────────────────────────────────────────────────────────

interface GeneralData {
  clientId: number;
  newClientName: string;
  eventType: EventType;
  eventDate: string;
  eventLocation: string;
  guestCount: number;
  tableCount: number;
  expiryDate: string;
  internalNotes: string;
}

interface WeddingConfig {
  palette: string;
  customColors: [string, string, string];
  style: string;
  flowers: string[];
  greenery: string[];
  areas: string[];
  brideName: string;
  groomName: string;
  ceremonyType: CeremonyType;
  churchName: string;
  receptionName: string;
  hasCoordinator: boolean;
}

interface FinancialData {
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number;
  discountNote: string;
  clientNotes: string;
  conditions: string;
}

interface PaymentRow {
  description: string;
  percentage: number;
  amount: number;
  dueDate: string;
}

interface ItemRow {
  tempId: number;
  serviceId: number | null;
  section: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isGift: boolean;
}

// ─── Stepper labels ─────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Dati Generali',
  'Configuratore Matrimonio',
  'Selezione Servizi',
  'Riepilogo Finanziario',
  'Anteprima',
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function QuoteEditor() {
  const { editingQuoteId, setPage, darkMode } = useAppStore();

  // ─── Data from DB ───────────────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(db.getSettings());
  const [quoteNumber, setQuoteNumber] = useState('');

  // ─── Wizard state ───────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<number | null>(null);

  // ─── STEP 1 ─────────────────────────────────────────────────────────
  const [general, setGeneral] = useState<GeneralData>({
    clientId: 0,
    newClientName: '',
    eventType: 'matrimonio',
    eventDate: '',
    eventLocation: '',
    guestCount: 0,
    tableCount: 0,
    expiryDate: '',
    internalNotes: '',
  });
  const [showNewClient, setShowNewClient] = useState(false);

  // ─── STEP 2 ─────────────────────────────────────────────────────────
  const [wedding, setWedding] = useState<WeddingConfig>({
    palette: '',
    customColors: ['#FFFFFF', '#FFFFFF', '#FFFFFF'],
    style: '',
    flowers: [],
    greenery: [],
    areas: [],
    brideName: '',
    groomName: '',
    ceremonyType: 'religiosa',
    churchName: '',
    receptionName: '',
    hasCoordinator: false,
  });

  // ─── STEP 3 ─────────────────────────────────────────────────────────
  const [items, setItems] = useState<ItemRow[]>([]);
  let _nextTempId = 1;
  const nextTempId = () => {
    const maxId = items.length > 0 ? Math.max(...items.map(i => i.tempId)) : 0;
    return maxId + 1;
  };

  // ─── STEP 4 ─────────────────────────────────────────────────────────
  const [financial, setFinancial] = useState<FinancialData>({
    discountType: null,
    discountValue: 0,
    discountNote: '',
    clientNotes: '',
    conditions: '',
  });
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  // ─── Derived values ─────────────────────────────────────────────────
  const isWedding = general.eventType === 'matrimonio';

  const effectiveSteps = isWedding ? [0, 1, 2, 3, 4] : [0, 2, 3, 4];
  const currentEffectiveIndex = effectiveSteps.indexOf(currentStep);
  const canGoNext = currentEffectiveIndex < effectiveSteps.length - 1;
  const canGoPrev = currentEffectiveIndex > 0;

  const subtotal = items.reduce((sum, it) => sum + (it.isGift ? 0 : it.amount), 0);

  const discountAmount = (() => {
    if (!financial.discountType || financial.discountValue <= 0) return 0;
    if (financial.discountType === 'percentage') return subtotal * (financial.discountValue / 100);
    return financial.discountValue;
  })();

  const afterDiscount = subtotal - discountAmount;

  const taxAmount = (() => {
    if (settings.taxRegime === 'forfettario') return 0;
    return afterDiscount * (settings.vatRate / 100);
  })();

  const total = afterDiscount + taxAmount;

  // ─── Styling helpers ────────────────────────────────────────────────
  const cardCls = darkMode
    ? 'bg-surface-dark border-border-dark'
    : 'bg-surface border-border';
  const inputCls = darkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-300 text-gray-900';
  const labelCls = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';

  // ─── Load data on mount ─────────────────────────────────────────────
  useEffect(() => {
    setClients(db.getClients());
    setServices(db.getServices());
    setCategories(db.getCategories());
    const s = db.getSettings();
    setSettings(s);
    setFinancial(prev => ({ ...prev, conditions: s.defaultConditions, clientNotes: s.defaultNotes }));
    setPayments([
      { description: 'Acconto alla firma', percentage: s.defaultPaymentDeposit, amount: 0, dueDate: '' },
      { description: 'Seconda rata', percentage: s.defaultPaymentSecond, amount: 0, dueDate: '' },
      { description: 'Saldo', percentage: s.defaultPaymentBalance, amount: 0, dueDate: '' },
    ]);

    if (editingQuoteId && editingQuoteId > 0) {
      loadExistingQuote(editingQuoteId);
    } else {
      setQuoteNumber(db.getNextQuoteNumber());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate payment amounts when total changes
  useEffect(() => {
    setPayments(prev =>
      prev.map(p => ({ ...p, amount: Math.round((total * p.percentage) / 100 * 100) / 100 }))
    );
  }, [total]);

  // ─── Load existing quote ────────────────────────────────────────────
  const loadExistingQuote = (id: number) => {
    const quote = db.getQuote(id);
    if (!quote) return;

    setQuoteNumber(quote.number);
    setSavedQuoteId(id);

    setGeneral({
      clientId: quote.clientId,
      newClientName: '',
      eventType: quote.eventType,
      eventDate: formatDateInput(quote.eventDate),
      eventLocation: quote.eventLocation,
      guestCount: quote.guestCount,
      tableCount: quote.tableCount,
      expiryDate: formatDateInput(quote.expiryDate),
      internalNotes: quote.internalNotes,
    });

    setFinancial({
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      discountNote: quote.discountNote,
      clientNotes: quote.clientNotes,
      conditions: quote.conditions,
    });

    // Load items
    const existingItems = db.getQuoteItems(id);
    setItems(
      existingItems.map((it, idx) => ({
        tempId: idx + 1,
        serviceId: it.serviceId,
        section: it.section,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.amount,
        isGift: it.isGift,
      }))
    );

    // Load wedding details
    if (quote.eventType === 'matrimonio') {
      const wd = db.getWeddingDetails(id);
      if (wd) {
        setWedding({
          palette: wd.palette,
          customColors: wd.paletteColors ? (JSON.parse(wd.paletteColors) as [string, string, string]) : ['#FFFFFF', '#FFFFFF', '#FFFFFF'],
          style: wd.style,
          flowers: wd.flowers ? JSON.parse(wd.flowers) : [],
          greenery: wd.greenery ? JSON.parse(wd.greenery) : [],
          areas: wd.areas ? JSON.parse(wd.areas) : [],
          brideName: wd.brideName,
          groomName: wd.groomName,
          ceremonyType: wd.ceremonyType,
          churchName: wd.churchName,
          receptionName: wd.receptionName,
          hasCoordinator: wd.hasCoordinator,
        });
      }
    }

    // Load payment plans
    const existingPayments = db.getPaymentPlans(id);
    if (existingPayments.length > 0) {
      setPayments(
        existingPayments.map(p => ({
          description: p.description,
          percentage: p.percentage,
          amount: p.amount,
          dueDate: formatDateInput(p.dueDate),
        }))
      );
    }
  };

  // ─── Navigation ─────────────────────────────────────────────────────
  const goNext = () => {
    if (canGoNext) {
      setCurrentStep(effectiveSteps[currentEffectiveIndex + 1]);
    }
  };
  const goPrev = () => {
    if (canGoPrev) {
      setCurrentStep(effectiveSteps[currentEffectiveIndex - 1]);
    }
  };

  // ─── Save ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Resolve client
      let clientId = general.clientId;
      if (showNewClient && general.newClientName.trim()) {
        const newClient = db.createClient({
          name: general.newClientName.trim(),
          email: '',
          phone: '',
          address: '',
          eventType: general.eventType,
          notes: '',
          status: 'prospect',
        });
        clientId = newClient.id;
        setGeneral(prev => ({ ...prev, clientId: newClient.id }));
        setClients(db.getClients());
        setShowNewClient(false);
      }

      const quoteData = {
        number: quoteNumber,
        clientId,
        eventType: general.eventType,
        eventDate: general.eventDate,
        eventLocation: general.eventLocation,
        guestCount: general.guestCount,
        tableCount: general.tableCount,
        expiryDate: general.expiryDate,
        internalNotes: general.internalNotes,
        clientNotes: financial.clientNotes,
        conditions: financial.conditions,
        status: 'bozza' as const,
        subtotal,
        discountType: financial.discountType,
        discountValue: financial.discountValue,
        discountNote: financial.discountNote,
        taxRate: settings.taxRegime === 'forfettario' ? 0 : settings.vatRate,
        total,
        confirmedDate: null,
      };

      let qId: number;
      if (savedQuoteId) {
        db.updateQuote(savedQuoteId, quoteData);
        qId = savedQuoteId;
      } else {
        const created = db.createQuote(quoteData);
        qId = created.id;
        setSavedQuoteId(qId);
      }

      // Save items
      db.setQuoteItems(
        qId,
        items.map((it, idx) => ({
          quoteId: qId,
          serviceId: it.serviceId,
          section: it.section,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: it.amount,
          isGift: it.isGift,
          sortOrder: idx,
        }))
      );

      // Save wedding details
      if (isWedding) {
        db.setWeddingDetails(qId, {
          quoteId: qId,
          brideName: wedding.brideName,
          groomName: wedding.groomName,
          ceremonyType: wedding.ceremonyType,
          churchName: wedding.churchName,
          receptionName: wedding.receptionName,
          hasCoordinator: wedding.hasCoordinator,
          palette: wedding.palette,
          paletteColors: JSON.stringify(wedding.customColors),
          style: wedding.style,
          flowers: JSON.stringify(wedding.flowers),
          greenery: JSON.stringify(wedding.greenery),
          areas: JSON.stringify(wedding.areas),
        });
      }

      // Save payment plans
      db.setPaymentPlans(
        qId,
        payments.map((p, idx) => ({
          quoteId: qId,
          description: p.description,
          percentage: p.percentage,
          amount: p.amount,
          dueDate: p.dueDate,
          sortOrder: idx,
        }))
      );
    } finally {
      setSaving(false);
    }
  }, [general, financial, items, wedding, payments, quoteNumber, savedQuoteId, settings, subtotal, total, isWedding, showNewClient]);

  const handleDuplicate = () => {
    setSavedQuoteId(null);
    setQuoteNumber(db.getNextQuoteNumber());
  };

  // ─── Item helpers ───────────────────────────────────────────────────
  const addServiceToItems = (svc: Service) => {
    setItems(prev => [
      ...prev,
      {
        tempId: nextTempId(),
        serviceId: svc.id,
        section: svc.categoryName || '',
        description: svc.name,
        quantity: 1,
        unitPrice: svc.basePrice,
        amount: svc.basePrice,
        isGift: false,
      },
    ]);
  };

  const addCustomRow = () => {
    setItems(prev => [
      ...prev,
      {
        tempId: nextTempId(),
        serviceId: null,
        section: 'Personalizzato',
        description: '',
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        isGift: false,
      },
    ]);
  };

  const removeItem = (tempId: number) => {
    setItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const updateItem = (tempId: number, field: keyof ItemRow, value: string | number | boolean) => {
    setItems(prev =>
      prev.map(it => {
        if (it.tempId !== tempId) return it;
        const updated = { ...it, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.amount = Math.round(updated.quantity * updated.unitPrice * 100) / 100;
        }
        return updated;
      })
    );
  };

  // ─── Payment helpers ────────────────────────────────────────────────
  const updatePayment = (idx: number, field: keyof PaymentRow, value: string | number) => {
    setPayments(prev =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const updated = { ...p, [field]: value };
        if (field === 'percentage') {
          updated.amount = Math.round((total * (value as number)) / 100 * 100) / 100;
        }
        return updated;
      })
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  // ─── Stepper ────────────────────────────────────────────────────────
  const renderStepper = () => (
    <div className="flex items-center justify-center mb-8 overflow-x-auto">
      {effectiveSteps.map((stepIdx, i) => {
        const isActive = stepIdx === currentStep;
        const isCompleted = effectiveSteps.indexOf(currentStep) > i;
        return (
          <div key={stepIdx} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-8 sm:w-16 h-0.5 ${
                  isCompleted ? 'bg-rose-500' : darkMode ? 'bg-gray-700' : 'bg-gray-300'
                }`}
              />
            )}
            <button
              onClick={() => setCurrentStep(stepIdx)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-rose-500 text-white'
                  : isCompleted
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                  : darkMode
                  ? 'bg-gray-800 text-gray-400'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive
                    ? 'bg-white text-rose-500'
                    : isCompleted
                    ? 'bg-rose-500 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {isCompleted ? <Check size={12} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[stepIdx]}</span>
            </button>
          </div>
        );
      })}
    </div>
  );

  // ─── STEP 1: Dati Generali ─────────────────────────────────────────
  const renderStep1 = () => (
    <div className={`rounded-xl border p-6 ${cardCls}`}>
      <h2 className={`text-xl font-bold mb-6 ${textPrimary}`}>Dati Generali</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Client */}
        <div className="md:col-span-2">
          <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Cliente</label>
          {!showNewClient ? (
            <div className="flex gap-2">
              <select
                value={general.clientId}
                onChange={e => setGeneral(prev => ({ ...prev, clientId: Number(e.target.value) }))}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
              >
                <option value={0}>-- Seleziona cliente --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewClient(true)}
                className="px-3 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition flex items-center gap-1"
              >
                <Plus size={14} /> Nuovo
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={general.newClientName}
                onChange={e => setGeneral(prev => ({ ...prev, newClientName: e.target.value }))}
                placeholder="Nome nuovo cliente..."
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
              />
              <button
                type="button"
                onClick={() => {
                  setShowNewClient(false);
                  setGeneral(prev => ({ ...prev, newClientName: '' }));
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                  darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Event type */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Tipo Evento</label>
          <select
            value={general.eventType}
            onChange={e => setGeneral(prev => ({ ...prev, eventType: e.target.value as EventType }))}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
          >
            {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Event date */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Data Evento</label>
          <input
            type="date"
            value={general.eventDate}
            onChange={e => setGeneral(prev => ({ ...prev, eventDate: e.target.value }))}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
          />
        </div>

        {/* Event location */}
        <div className="md:col-span-2">
          <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Luogo Evento</label>
          <input
            type="text"
            value={general.eventLocation}
            onChange={e => setGeneral(prev => ({ ...prev, eventLocation: e.target.value }))}
            placeholder="Location / indirizzo..."
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
          />
        </div>

        {/* Guest count */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Numero Invitati</label>
          <input
            type="number"
            min={0}
            value={general.guestCount || ''}
            onChange={e => setGeneral(prev => ({ ...prev, guestCount: Number(e.target.value) }))}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
          />
        </div>

        {/* Table count */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Numero Tavoli</label>
          <input
            type="number"
            min={0}
            value={general.tableCount || ''}
            onChange={e => setGeneral(prev => ({ ...prev, tableCount: Number(e.target.value) }))}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
          />
        </div>

        {/* Expiry date */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Validita Preventivo</label>
          <input
            type="date"
            value={general.expiryDate}
            onChange={e => setGeneral(prev => ({ ...prev, expiryDate: e.target.value }))}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
          />
        </div>

        {/* Internal notes */}
        <div className="md:col-span-2">
          <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Note Interne</label>
          <textarea
            value={general.internalNotes}
            onChange={e => setGeneral(prev => ({ ...prev, internalNotes: e.target.value }))}
            rows={3}
            placeholder="Note visibili solo internamente..."
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
          />
        </div>
      </div>
    </div>
  );

  // ─── STEP 2: Configuratore Matrimonio ──────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-6">
      {/* 2A — Palette Colori */}
      <div className={`rounded-xl border p-6 ${cardCls}`}>
        <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>Palette Colori</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {WEDDING_PALETTES.map(p => {
            const selected = wedding.palette === p.name;
            return (
              <button
                key={p.name}
                onClick={() => setWedding(prev => ({ ...prev, palette: p.name }))}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  selected
                    ? 'border-rose-500 ring-2 ring-rose-200'
                    : darkMode
                    ? 'border-gray-700 hover:border-gray-500'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {p.colors.map((c, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border border-gray-300"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium ${textPrimary}`}>{p.name}</p>
                {selected && (
                  <div className="mt-1">
                    <Check size={14} className="text-rose-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom palette */}
        <div>
          <button
            onClick={() => setWedding(prev => ({ ...prev, palette: '__custom__' }))}
            className={`text-sm font-medium mb-2 ${
              wedding.palette === '__custom__' ? 'text-rose-500' : darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Palette personalizzata
          </button>
          {wedding.palette === '__custom__' && (
            <div className="flex gap-3 mt-2">
              {wedding.customColors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={c}
                    onChange={e => {
                      const newColors = [...wedding.customColors] as [string, string, string];
                      newColors[i] = e.target.value;
                      setWedding(prev => ({ ...prev, customColors: newColors }));
                    }}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <span className={`text-xs ${textMuted}`}>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2B — Stile Matrimonio */}
      <div className={`rounded-xl border p-6 ${cardCls}`}>
        <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>Stile Matrimonio</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {WEDDING_STYLES.map(s => {
            const selected = wedding.style === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setWedding(prev => ({ ...prev, style: s.id }))}
                className={`rounded-xl border-2 p-4 text-center transition ${
                  selected
                    ? 'border-rose-500 ring-2 ring-rose-200'
                    : darkMode
                    ? 'border-gray-700 hover:border-gray-500'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">{s.icon}</div>
                <p className={`text-sm font-medium ${textPrimary}`}>{s.name}</p>
                {selected && <Check size={14} className="text-rose-500 mx-auto mt-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2C — Fiori Principali */}
      <div className={`rounded-xl border p-6 ${cardCls}`}>
        <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>Fiori Principali</h2>

        {/* Flowers grouped by category */}
        {(() => {
          const flowerCategories = [...new Set(FLOWERS.map(f => f.category))];
          return flowerCategories.map(cat => (
            <div key={cat} className="mb-4">
              <h3 className={`text-sm font-semibold mb-2 ${textMuted}`}>{cat}</h3>
              <div className="flex flex-wrap gap-2">
                {FLOWERS.filter(f => f.category === cat).map(f => {
                  const selected = wedding.flowers.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setWedding(prev => ({
                          ...prev,
                          flowers: selected
                            ? prev.flowers.filter(id => id !== f.id)
                            : [...prev.flowers, f.id],
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition flex items-center gap-1 ${
                        selected
                          ? 'bg-rose-500 text-white border-rose-500'
                          : darkMode
                          ? 'border-gray-600 text-gray-300 hover:border-rose-400'
                          : 'border-gray-300 text-gray-700 hover:border-rose-400'
                      }`}
                    >
                      {selected && <Check size={12} />}
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ));
        })()}

        {/* Greenery */}
        <h3 className={`text-sm font-semibold mb-2 mt-6 ${textMuted}`}>Verdi / Fogliame</h3>
        <div className="flex flex-wrap gap-2">
          {GREENERY.map(g => {
            const selected = wedding.greenery.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => {
                  setWedding(prev => ({
                    ...prev,
                    greenery: selected
                      ? prev.greenery.filter(id => id !== g.id)
                      : [...prev.greenery, g.id],
                  }));
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition flex items-center gap-1 ${
                  selected
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : darkMode
                    ? 'border-gray-600 text-gray-300 hover:border-emerald-400'
                    : 'border-gray-300 text-gray-700 hover:border-emerald-400'
                }`}
              >
                {selected && <Check size={12} />}
                {g.name}
              </button>
            );
          })}
        </div>

        {/* Selected summary */}
        {(wedding.flowers.length > 0 || wedding.greenery.length > 0) && (
          <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-xs font-semibold mb-1 ${textMuted}`}>Selezione corrente:</p>
            <div className="flex flex-wrap gap-1">
              {wedding.flowers.map(id => {
                const f = FLOWERS.find(fl => fl.id === id);
                return f ? (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                  >
                    {f.name}
                    <button
                      onClick={() =>
                        setWedding(prev => ({ ...prev, flowers: prev.flowers.filter(x => x !== id) }))
                      }
                    >
                      <X size={10} />
                    </button>
                  </span>
                ) : null;
              })}
              {wedding.greenery.map(id => {
                const g = GREENERY.find(gr => gr.id === id);
                return g ? (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    {g.name}
                    <button
                      onClick={() =>
                        setWedding(prev => ({ ...prev, greenery: prev.greenery.filter(x => x !== id) }))
                      }
                    >
                      <X size={10} />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2D — Aree da Allestire */}
      <div className={`rounded-xl border p-6 ${cardCls}`}>
        <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>Aree da Allestire</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WEDDING_AREAS.map(area => {
            const selected = wedding.areas.includes(area.id);
            return (
              <label
                key={area.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  selected
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                    : darkMode
                    ? 'border-gray-700 hover:border-gray-500'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    setWedding(prev => ({
                      ...prev,
                      areas: selected
                        ? prev.areas.filter(id => id !== area.id)
                        : [...prev.areas, area.id],
                    }));
                  }}
                  className="w-4 h-4 text-rose-500 rounded border-gray-300 focus:ring-rose-500"
                />
                <span className={`text-sm font-medium ${textPrimary}`}>{area.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2E — Dettagli Matrimonio */}
      <div className={`rounded-xl border p-6 ${cardCls}`}>
        <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>Dettagli Matrimonio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Nome Sposa</label>
            <input
              type="text"
              value={wedding.brideName}
              onChange={e => setWedding(prev => ({ ...prev, brideName: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Nome Sposo</label>
            <input
              type="text"
              value={wedding.groomName}
              onChange={e => setWedding(prev => ({ ...prev, groomName: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
            />
          </div>

          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${labelCls}`}>Tipo Cerimonia</label>
            <div className="flex gap-4">
              {(['religiosa', 'civile', 'simbolica'] as CeremonyType[]).map(ct => (
                <label key={ct} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ceremonyType"
                    checked={wedding.ceremonyType === ct}
                    onChange={() => setWedding(prev => ({ ...prev, ceremonyType: ct }))}
                    className="w-4 h-4 text-rose-500 focus:ring-rose-500"
                  />
                  <span className={`text-sm ${textPrimary}`}>
                    {ct.charAt(0).toUpperCase() + ct.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Chiesa / Luogo Cerimonia</label>
            <input
              type="text"
              value={wedding.churchName}
              onChange={e => setWedding(prev => ({ ...prev, churchName: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Location Ricevimento</label>
            <input
              type="text"
              value={wedding.receptionName}
              onChange={e => setWedding(prev => ({ ...prev, receptionName: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setWedding(prev => ({ ...prev, hasCoordinator: !prev.hasCoordinator }))}
                className={`relative w-11 h-6 rounded-full transition cursor-pointer ${
                  wedding.hasCoordinator ? 'bg-rose-500' : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    wedding.hasCoordinator ? 'translate-x-5' : ''
                  }`}
                />
              </div>
              <span className={`text-sm font-medium ${textPrimary}`}>Wedding Coordinator incluso</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── STEP 3: Selezione Servizi ─────────────────────────────────────
  const renderStep3 = () => {
    const groupedServices: Record<string, Service[]> = {};
    categories
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(cat => {
        const catServices = services.filter(s => s.categoryId === cat.id).sort((a, b) => a.sortOrder - b.sortOrder);
        if (catServices.length > 0) {
          groupedServices[cat.name] = catServices;
        }
      });

    const groupedItems: Record<string, ItemRow[]> = {};
    items.forEach(it => {
      const section = it.section || 'Altro';
      if (!groupedItems[section]) groupedItems[section] = [];
      groupedItems[section].push(it);
    });

    return (
      <div className="space-y-6">
        {/* Service catalog */}
        <div className={`rounded-xl border p-6 ${cardCls}`}>
          <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>Catalogo Servizi</h2>
          <div className="space-y-4">
            {Object.entries(groupedServices).map(([catName, svcs]) => (
              <div key={catName}>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${textMuted}`}>
                  {catName}
                </h3>
                <div className="space-y-1">
                  {svcs.map(svc => (
                    <div
                      key={svc.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition ${
                        darkMode
                          ? 'border-gray-700 hover:bg-gray-800'
                          : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${textPrimary}`}>{svc.name}</p>
                        <p className={`text-xs ${textMuted} truncate`}>{svc.description}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-3">
                        <span className={`text-sm font-semibold whitespace-nowrap ${textPrimary}`}>
                          {formatCurrency(svc.basePrice)}
                        </span>
                        <button
                          onClick={() => addServiceToItems(svc)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition flex items-center gap-1"
                        >
                          <Plus size={12} /> Aggiungi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Items in quote */}
        <div className={`rounded-xl border p-6 ${cardCls}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${textPrimary}`}>
              Voci Preventivo ({items.length})
            </h2>
            <button
              onClick={addCustomRow}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition flex items-center gap-1 ${
                darkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Plus size={14} /> Riga personalizzata
            </button>
          </div>

          {items.length === 0 ? (
            <p className={`text-sm text-center py-8 ${textMuted}`}>
              Nessuna voce aggiunta. Seleziona i servizi dal catalogo sopra.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([section, sectionItems]) => (
                <div key={section}>
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${textMuted}`}
                  >
                    {section}
                  </h3>
                  <div className="space-y-2">
                    {sectionItems.map(it => (
                      <div
                        key={it.tempId}
                        className={`flex flex-wrap items-center gap-2 p-3 rounded-lg border ${
                          it.isGift
                            ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                            : darkMode
                            ? 'border-gray-700'
                            : 'border-gray-200'
                        }`}
                      >
                        {/* Description */}
                        <input
                          type="text"
                          value={it.description}
                          onChange={e => updateItem(it.tempId, 'description', e.target.value)}
                          placeholder="Descrizione..."
                          className={`flex-1 min-w-[200px] rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
                        />
                        {/* Quantity */}
                        <div className="flex items-center gap-1">
                          <label className={`text-xs ${textMuted}`}>Qty:</label>
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={e => updateItem(it.tempId, 'quantity', Number(e.target.value))}
                            className={`w-16 rounded-lg border px-2 py-1.5 text-sm text-center ${inputCls}`}
                          />
                        </div>
                        {/* Unit price */}
                        <div className="flex items-center gap-1">
                          <label className={`text-xs ${textMuted}`}>Prezzo:</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={it.unitPrice}
                            onChange={e => updateItem(it.tempId, 'unitPrice', Number(e.target.value))}
                            className={`w-24 rounded-lg border px-2 py-1.5 text-sm text-right ${inputCls}`}
                          />
                        </div>
                        {/* Amount */}
                        <span className={`text-sm font-bold w-24 text-right ${textPrimary}`}>
                          {formatCurrency(it.amount)}
                        </span>
                        {/* Gift toggle */}
                        <button
                          onClick={() => updateItem(it.tempId, 'isGift', !it.isGift)}
                          title={it.isGift ? 'Omaggio attivo' : 'Segna come omaggio'}
                          className={`p-1.5 rounded-lg transition ${
                            it.isGift
                              ? 'bg-amber-500 text-white'
                              : darkMode
                              ? 'text-gray-500 hover:text-amber-400'
                              : 'text-gray-400 hover:text-amber-500'
                          }`}
                        >
                          <Gift size={14} />
                        </button>
                        {/* Remove */}
                        <button
                          onClick={() => removeItem(it.tempId)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Subtotal preview */}
              <div className={`flex justify-end pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <span className={`text-sm font-bold ${textPrimary}`}>
                  Subtotale: {formatCurrency(subtotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── STEP 4: Riepilogo Finanziario ─────────────────────────────────
  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Totals */}
      <div className={`rounded-xl border p-6 ${cardCls}`}>
        <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>Riepilogo Importi</h2>

        {/* Subtotal */}
        <div className={`flex justify-between items-center py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <span className={`text-sm ${textPrimary}`}>Subtotale</span>
          <span className={`text-lg font-bold ${textPrimary}`}>{formatCurrency(subtotal)}</span>
        </div>

        {/* Discount */}
        <div className={`py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <label className={`block text-sm font-medium mb-2 ${labelCls}`}>Sconto</label>
          <div className="flex flex-wrap gap-3 items-end">
            <select
              value={financial.discountType || 'none'}
              onChange={e => {
                const val = e.target.value;
                setFinancial(prev => ({
                  ...prev,
                  discountType: val === 'none' ? null : (val as 'percentage' | 'fixed'),
                  discountValue: val === 'none' ? 0 : prev.discountValue,
                }));
              }}
              className={`rounded-lg border px-3 py-2 text-sm ${inputCls}`}
            >
              <option value="none">Nessuno</option>
              <option value="percentage">Percentuale (%)</option>
              <option value="fixed">Fisso (&euro;)</option>
            </select>
            {financial.discountType && (
              <>
                <input
                  type="number"
                  min={0}
                  step={financial.discountType === 'percentage' ? 1 : 0.01}
                  value={financial.discountValue || ''}
                  onChange={e =>
                    setFinancial(prev => ({ ...prev, discountValue: Number(e.target.value) }))
                  }
                  placeholder={financial.discountType === 'percentage' ? '%' : 'EUR'}
                  className={`w-28 rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                />
                <input
                  type="text"
                  value={financial.discountNote}
                  onChange={e =>
                    setFinancial(prev => ({ ...prev, discountNote: e.target.value }))
                  }
                  placeholder="Nota sconto..."
                  className={`flex-1 min-w-[150px] rounded-lg border px-3 py-2 text-sm ${inputCls}`}
                />
              </>
            )}
          </div>
          {discountAmount > 0 && (
            <p className="text-sm text-rose-500 font-medium mt-2">
              - {formatCurrency(discountAmount)}
            </p>
          )}
        </div>

        {/* Tax */}
        <div className={`flex justify-between items-center py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <span className={`text-sm ${textPrimary}`}>IVA</span>
            {settings.taxRegime === 'forfettario' ? (
              <p className={`text-xs ${textMuted}`}>
                IVA non dovuta ex art.1 c.54-89 L.190/2014
              </p>
            ) : (
              <p className={`text-xs ${textMuted}`}>Aliquota {settings.vatRate}%</p>
            )}
          </div>
          <span className={`text-sm font-semibold ${textPrimary}`}>{formatCurrency(taxAmount)}</span>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center py-4">
          <span className={`text-lg font-bold ${textPrimary}`}>TOTALE</span>
          <span className="text-2xl font-black text-rose-500">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Payment plan */}
      <div className={`rounded-xl border p-6 ${cardCls}`}>
        <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>Piano di Pagamento</h2>
        <div className="space-y-3">
          {payments.map((p, idx) => (
            <div
              key={idx}
              className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <input
                type="text"
                value={p.description}
                onChange={e => updatePayment(idx, 'description', e.target.value)}
                className={`flex-1 min-w-[150px] rounded-lg border px-3 py-2 text-sm ${inputCls}`}
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={p.percentage}
                  onChange={e => updatePayment(idx, 'percentage', Number(e.target.value))}
                  className={`w-16 rounded-lg border px-2 py-2 text-sm text-center ${inputCls}`}
                />
                <span className={`text-sm ${textMuted}`}>%</span>
              </div>
              <span className={`text-sm font-bold w-28 text-right ${textPrimary}`}>
                {formatCurrency(p.amount)}
              </span>
              <input
                type="date"
                value={p.dueDate}
                onChange={e => updatePayment(idx, 'dueDate', e.target.value)}
                className={`rounded-lg border px-3 py-2 text-sm ${inputCls}`}
              />
            </div>
          ))}
        </div>
        {(() => {
          const totalPct = payments.reduce((s, p) => s + p.percentage, 0);
          if (totalPct !== 100) {
            return (
              <p className="text-xs text-amber-500 mt-2">
                Attenzione: le percentuali sommano {totalPct}% (dovrebbero essere 100%)
              </p>
            );
          }
          return null;
        })()}
      </div>

      {/* Notes & conditions */}
      <div className={`rounded-xl border p-6 ${cardCls}`}>
        <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>Note e Condizioni</h2>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Note per il Cliente</label>
            <textarea
              value={financial.clientNotes}
              onChange={e => setFinancial(prev => ({ ...prev, clientNotes: e.target.value }))}
              rows={3}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${labelCls}`}>Condizioni</label>
            <textarea
              value={financial.conditions}
              onChange={e => setFinancial(prev => ({ ...prev, conditions: e.target.value }))}
              rows={4}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ─── STEP 5: Anteprima ─────────────────────────────────────────────
  const renderStep5 = () => {
    const client = clients.find(c => c.id === general.clientId);
    const clientName = showNewClient ? general.newClientName : client?.name || 'Non selezionato';

    const groupedItems: Record<string, ItemRow[]> = {};
    items.forEach(it => {
      const section = it.section || 'Altro';
      if (!groupedItems[section]) groupedItems[section] = [];
      groupedItems[section].push(it);
    });

    const selectedFlowers = wedding.flowers
      .map(id => FLOWERS.find(f => f.id === id)?.name)
      .filter(Boolean);
    const selectedGreenery = wedding.greenery
      .map(id => GREENERY.find(g => g.id === id)?.name)
      .filter(Boolean);
    const selectedAreas = wedding.areas
      .map(id => WEDDING_AREAS.find(a => a.id === id)?.name)
      .filter(Boolean);
    const selectedStyle = WEDDING_STYLES.find(s => s.id === wedding.style);
    const selectedPalette =
      wedding.palette === '__custom__'
        ? 'Personalizzata'
        : wedding.palette || 'Non selezionata';

    return (
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-medium hover:bg-rose-600 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Bozza'}
          </button>
          <button
            onClick={async () => {
              await handleSave();
              // PDF generation placeholder
              alert('PDF generato con successo! (funzionalita in sviluppo)');
            }}
            className={`px-5 py-2.5 rounded-xl font-medium border transition flex items-center gap-2 ${
              darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText size={16} /> Genera PDF
          </button>
          <button
            onClick={handleDuplicate}
            className={`px-5 py-2.5 rounded-xl font-medium border transition flex items-center gap-2 ${
              darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Copy size={16} /> Duplica
          </button>
        </div>

        {/* General info */}
        <div className={`rounded-xl border p-6 ${cardCls}`}>
          <div className="flex justify-between items-start mb-4">
            <h2 className={`text-xl font-bold ${textPrimary}`}>Preventivo {quoteNumber}</h2>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              Bozza
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className={`text-xs ${textMuted}`}>Cliente</p>
              <p className={`text-sm font-medium ${textPrimary}`}>{clientName}</p>
            </div>
            <div>
              <p className={`text-xs ${textMuted}`}>Tipo Evento</p>
              <p className={`text-sm font-medium ${textPrimary}`}>{EVENT_TYPE_LABELS[general.eventType]}</p>
            </div>
            <div>
              <p className={`text-xs ${textMuted}`}>Data Evento</p>
              <p className={`text-sm font-medium ${textPrimary}`}>
                {general.eventDate ? formatDate(general.eventDate) : '-'}
              </p>
            </div>
            <div>
              <p className={`text-xs ${textMuted}`}>Luogo</p>
              <p className={`text-sm font-medium ${textPrimary}`}>{general.eventLocation || '-'}</p>
            </div>
            <div>
              <p className={`text-xs ${textMuted}`}>Invitati / Tavoli</p>
              <p className={`text-sm font-medium ${textPrimary}`}>
                {general.guestCount} invitati, {general.tableCount} tavoli
              </p>
            </div>
            <div>
              <p className={`text-xs ${textMuted}`}>Validita</p>
              <p className={`text-sm font-medium ${textPrimary}`}>
                {general.expiryDate ? formatDate(general.expiryDate) : '-'}
              </p>
            </div>
          </div>

          {general.internalNotes && (
            <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-amber-50'}`}>
              <p className={`text-xs font-semibold mb-1 ${textMuted}`}>Note interne</p>
              <p className={`text-sm ${textPrimary}`}>{general.internalNotes}</p>
            </div>
          )}
        </div>

        {/* Wedding details preview */}
        {isWedding && (
          <div className={`rounded-xl border p-6 ${cardCls}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Dettagli Matrimonio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wedding.brideName && (
                <div>
                  <p className={`text-xs ${textMuted}`}>Sposi</p>
                  <p className={`text-sm font-medium ${textPrimary}`}>
                    {wedding.brideName} & {wedding.groomName}
                  </p>
                </div>
              )}
              <div>
                <p className={`text-xs ${textMuted}`}>Cerimonia</p>
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {wedding.ceremonyType.charAt(0).toUpperCase() + wedding.ceremonyType.slice(1)}
                </p>
              </div>
              {wedding.churchName && (
                <div>
                  <p className={`text-xs ${textMuted}`}>Luogo Cerimonia</p>
                  <p className={`text-sm font-medium ${textPrimary}`}>{wedding.churchName}</p>
                </div>
              )}
              {wedding.receptionName && (
                <div>
                  <p className={`text-xs ${textMuted}`}>Location Ricevimento</p>
                  <p className={`text-sm font-medium ${textPrimary}`}>{wedding.receptionName}</p>
                </div>
              )}
              <div>
                <p className={`text-xs ${textMuted}`}>Palette</p>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${textPrimary}`}>{selectedPalette}</p>
                  {wedding.palette && wedding.palette !== '__custom__' && (
                    <div className="flex gap-0.5">
                      {WEDDING_PALETTES.find(p => p.name === wedding.palette)?.colors.map((c, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  )}
                  {wedding.palette === '__custom__' && (
                    <div className="flex gap-0.5">
                      {wedding.customColors.map((c, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {selectedStyle && (
                <div>
                  <p className={`text-xs ${textMuted}`}>Stile</p>
                  <p className={`text-sm font-medium ${textPrimary}`}>
                    {selectedStyle.icon} {selectedStyle.name}
                  </p>
                </div>
              )}
              <div>
                <p className={`text-xs ${textMuted}`}>Coordinator</p>
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {wedding.hasCoordinator ? 'Si' : 'No'}
                </p>
              </div>
            </div>
            {selectedFlowers.length > 0 && (
              <div className="mt-3">
                <p className={`text-xs ${textMuted} mb-1`}>Fiori selezionati</p>
                <div className="flex flex-wrap gap-1">
                  {selectedFlowers.map((name, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedGreenery.length > 0 && (
              <div className="mt-2">
                <p className={`text-xs ${textMuted} mb-1`}>Verdi selezionati</p>
                <div className="flex flex-wrap gap-1">
                  {selectedGreenery.map((name, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedAreas.length > 0 && (
              <div className="mt-2">
                <p className={`text-xs ${textMuted} mb-1`}>Aree da allestire</p>
                <div className="flex flex-wrap gap-1">
                  {selectedAreas.map((name, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items preview */}
        <div className={`rounded-xl border p-6 ${cardCls}`}>
          <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Voci Preventivo</h2>
          {items.length === 0 ? (
            <p className={`text-sm ${textMuted}`}>Nessuna voce aggiunta.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedItems).map(([section, sectionItems]) => (
                <div key={section}>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${textMuted}`}>
                    {section}
                  </h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {sectionItems.map(it => (
                        <tr
                          key={it.tempId}
                          className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}
                        >
                          <td className={`py-2 ${textPrimary}`}>
                            {it.description}
                            {it.isGift && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                OMAGGIO
                              </span>
                            )}
                          </td>
                          <td className={`py-2 text-right ${textMuted}`}>x{it.quantity}</td>
                          <td className={`py-2 text-right ${textMuted}`}>
                            {formatCurrency(it.unitPrice)}
                          </td>
                          <td className={`py-2 text-right font-medium ${it.isGift ? 'line-through text-gray-400' : textPrimary}`}>
                            {formatCurrency(it.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial summary */}
        <div className={`rounded-xl border p-6 ${cardCls}`}>
          <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Riepilogo Finanziario</h2>
          <div className="space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between">
              <span className={`text-sm ${textMuted}`}>Subtotale</span>
              <span className={`text-sm font-medium ${textPrimary}`}>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className={`text-sm ${textMuted}`}>
                  Sconto
                  {financial.discountType === 'percentage' && ` (${financial.discountValue}%)`}
                  {financial.discountNote && ` - ${financial.discountNote}`}
                </span>
                <span className="text-sm font-medium text-rose-500">
                  -{formatCurrency(discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className={`text-sm ${textMuted}`}>
                IVA
                {settings.taxRegime === 'forfettario'
                  ? ' (non dovuta)'
                  : ` (${settings.vatRate}%)`}
              </span>
              <span className={`text-sm font-medium ${textPrimary}`}>{formatCurrency(taxAmount)}</span>
            </div>
            <div className={`flex justify-between pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <span className={`text-base font-bold ${textPrimary}`}>TOTALE</span>
              <span className="text-xl font-black text-rose-500">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment plan preview */}
        {payments.length > 0 && (
          <div className={`rounded-xl border p-6 ${cardCls}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Piano di Pagamento</h2>
            <div className="space-y-2">
              {payments.map((p, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center py-2 border-b ${
                    darkMode ? 'border-gray-700' : 'border-gray-100'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{p.description}</p>
                    <p className={`text-xs ${textMuted}`}>
                      {p.percentage}% {p.dueDate ? `- Scadenza: ${formatDate(p.dueDate)}` : ''}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${textPrimary}`}>{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes preview */}
        {(financial.clientNotes || financial.conditions) && (
          <div className={`rounded-xl border p-6 ${cardCls}`}>
            {financial.clientNotes && (
              <div className="mb-4">
                <h3 className={`text-sm font-bold mb-1 ${textPrimary}`}>Note per il Cliente</h3>
                <p className={`text-sm whitespace-pre-wrap ${textMuted}`}>{financial.clientNotes}</p>
              </div>
            )}
            {financial.conditions && (
              <div>
                <h3 className={`text-sm font-bold mb-1 ${textPrimary}`}>Condizioni</h3>
                <p className={`text-sm whitespace-pre-wrap ${textMuted}`}>{financial.conditions}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage('quotes')}
            className={`p-2 rounded-lg transition ${
              darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>
              {savedQuoteId ? `Modifica ${quoteNumber}` : 'Nuovo Preventivo'}
            </h1>
            <p className={`text-sm ${textMuted}`}>
              {quoteNumber}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-rose-500 text-white font-medium text-sm hover:bg-rose-600 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>

      {/* Stepper */}
      {renderStepper()}

      {/* Step content */}
      <div className="mb-8">
        {currentStep === 0 && renderStep1()}
        {currentStep === 1 && renderStep2()}
        {currentStep === 2 && renderStep3()}
        {currentStep === 3 && renderStep4()}
        {currentStep === 4 && renderStep5()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pb-8">
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed ${
            darkMode
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ChevronLeft size={16} /> Indietro
        </button>

        <div className={`text-sm ${textMuted}`}>
          Passo {currentEffectiveIndex + 1} di {effectiveSteps.length}
        </div>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-medium text-sm hover:bg-rose-600 transition flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Avanti <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
