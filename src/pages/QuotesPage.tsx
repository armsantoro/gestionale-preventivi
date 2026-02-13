import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getQuotes, deleteQuote, createQuote, getQuoteItems, setQuoteItems, getNextQuoteNumber, getWeddingDetails, setWeddingDetails, getPaymentPlans, setPaymentPlans } from '../database';
import { Quote, QuoteStatus, EventType, EVENT_TYPE_LABELS, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { Search, Plus, Edit2, Trash2, Copy, Download, Filter, FileText } from 'lucide-react';

type SortField = 'eventDate' | 'total' | 'status';
type SortDir = 'asc' | 'desc';

const ALL_STATUSES: QuoteStatus[] = ['bozza', 'inviato', 'confermato', 'rifiutato', 'scaduto', 'completato'];
const ALL_EVENT_TYPES: EventType[] = ['matrimonio', 'compleanno', 'battesimo', 'comunione', 'altro'];

export default function QuotesPage() {
  const { darkMode, setEditingQuoteId, setPage } = useAppStore();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('eventDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  function loadQuotes() {
    setQuotes(getQuotes());
  }

  // ---- Filtering ----
  const filtered = quotes.filter((q) => {
    // Search by client name or quote number
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = (q.clientName || '').toLowerCase().includes(query);
      const matchesNumber = q.number.toLowerCase().includes(query);
      if (!matchesName && !matchesNumber) return false;
    }

    // Status filter
    if (statusFilter && q.status !== statusFilter) return false;

    // Event type filter
    if (eventTypeFilter && q.eventType !== eventTypeFilter) return false;

    // Date range filter
    if (dateFrom && q.eventDate < dateFrom) return false;
    if (dateTo && q.eventDate > dateTo) return false;

    // Amount range filter
    if (amountMin && q.total < parseFloat(amountMin)) return false;
    if (amountMax && q.total > parseFloat(amountMax)) return false;

    return true;
  });

  // ---- Sorting ----
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'eventDate':
        cmp = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        break;
      case 'total':
        cmp = a.total - b.total;
        break;
      case 'status': {
        const order: Record<QuoteStatus, number> = {
          bozza: 0,
          inviato: 1,
          confermato: 2,
          completato: 3,
          rifiutato: 4,
          scaduto: 5,
        };
        cmp = order[a.status] - order[b.status];
        break;
      }
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  }

  // ---- Actions ----
  function handleEdit(quote: Quote) {
    setEditingQuoteId(quote.id);
  }

  function handleNew() {
    setEditingQuoteId(0);
  }

  function handleDelete(id: number) {
    deleteQuote(id);
    setDeleteConfirmId(null);
    loadQuotes();
  }

  function handleDuplicate(quote: Quote) {
    const newNumber = getNextQuoteNumber();
    const newQuote = createQuote({
      number: newNumber,
      clientId: quote.clientId,
      eventType: quote.eventType,
      eventDate: quote.eventDate,
      eventLocation: quote.eventLocation,
      guestCount: quote.guestCount,
      tableCount: quote.tableCount,
      expiryDate: quote.expiryDate,
      internalNotes: quote.internalNotes,
      clientNotes: quote.clientNotes,
      conditions: quote.conditions,
      status: 'bozza',
      subtotal: quote.subtotal,
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      discountNote: quote.discountNote,
      taxRate: quote.taxRate,
      total: quote.total,
      confirmedDate: null,
    });

    // Duplicate quote items
    const items = getQuoteItems(quote.id);
    if (items.length > 0) {
      setQuoteItems(
        newQuote.id,
        items.map((item) => ({
          quoteId: newQuote.id,
          serviceId: item.serviceId,
          section: item.section,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          isGift: item.isGift,
          sortOrder: item.sortOrder,
        }))
      );
    }

    // Duplicate wedding details
    const wedding = getWeddingDetails(quote.id);
    if (wedding) {
      setWeddingDetails(newQuote.id, {
        quoteId: newQuote.id,
        brideName: wedding.brideName,
        groomName: wedding.groomName,
        ceremonyType: wedding.ceremonyType,
        churchName: wedding.churchName,
        receptionName: wedding.receptionName,
        hasCoordinator: wedding.hasCoordinator,
        palette: wedding.palette,
        paletteColors: wedding.paletteColors,
        style: wedding.style,
        flowers: wedding.flowers,
        greenery: wedding.greenery,
        areas: wedding.areas,
      });
    }

    // Duplicate payment plans
    const plans = getPaymentPlans(quote.id);
    if (plans.length > 0) {
      setPaymentPlans(
        newQuote.id,
        plans.map((p) => ({
          quoteId: newQuote.id,
          description: p.description,
          percentage: p.percentage,
          amount: p.amount,
          dueDate: p.dueDate,
          sortOrder: p.sortOrder,
        }))
      );
    }

    loadQuotes();
  }

  // ---- CSV Export ----
  function handleExportCSV() {
    const headers = ['Numero', 'Cliente', 'Tipo Evento', 'Data Evento', 'Totale', 'Stato'];
    const rows = sorted.map((q) => [
      q.number,
      `"${(q.clientName || '').replace(/"/g, '""')}"`,
      EVENT_TYPE_LABELS[q.eventType],
      formatDate(q.eventDate),
      q.total.toFixed(2).replace('.', ','),
      QUOTE_STATUS_LABELS[q.status],
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `preventivi_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ---- Reset filters ----
  function resetFilters() {
    setSearchQuery('');
    setStatusFilter('');
    setEventTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
  }

  const hasActiveFilters = statusFilter || eventTypeFilter || dateFrom || dateTo || amountMin || amountMax;

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${
    darkMode
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
  }`;

  const selectClass = `rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${
    darkMode
      ? 'bg-gray-700 border-gray-600 text-white'
      : 'bg-white border-gray-300 text-gray-900'
  }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Preventivi
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {sorted.length} preventiv{sorted.length === 1 ? 'o' : 'i'} trovati
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Download size={16} />
            Esporta CSV
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition-colors"
          >
            <Plus size={16} />
            Nuovo Preventivo
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm border border-gray-200'}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            />
            <input
              type="text"
              placeholder="Cerca per nome cliente o numero preventivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | '')}
            className={selectClass}
          >
            <option value="">Tutti gli stati</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {QUOTE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${hasActiveFilters ? 'ring-2 ring-pink-400' : ''}`}
          >
            <Filter size={16} />
            Filtri
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className={`mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Tipo Evento
              </label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value as EventType | '')}
                className={`${selectClass} w-full`}
              >
                <option value="">Tutti i tipi</option>
                {ALL_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EVENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Data Evento Da
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Data Evento A
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Importo Min
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Importo Max
                </label>
                <input
                  type="number"
                  placeholder="99999"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button
                  onClick={resetFilters}
                  className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                >
                  Resetta tutti i filtri
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm border border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Numero
                </th>
                <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Cliente
                </th>
                <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Tipo Evento
                </th>
                <th
                  className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-pink-500 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                  onClick={() => handleSort('eventDate')}
                >
                  Data Evento{sortIndicator('eventDate')}
                </th>
                <th
                  className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-pink-500 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                  onClick={() => handleSort('total')}
                >
                  Totale{sortIndicator('total')}
                </th>
                <th
                  className={`text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-pink-500 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                  onClick={() => handleSort('status')}
                >
                  Stato{sortIndicator('status')}
                </th>
                <th className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <FileText
                      size={48}
                      className={`mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}
                    />
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {quotes.length === 0
                        ? 'Nessun preventivo creato. Inizia creando il primo!'
                        : 'Nessun preventivo trovato con i filtri selezionati.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sorted.map((quote) => (
                  <tr
                    key={quote.id}
                    className={`transition-colors ${
                      darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className={`px-4 py-3 text-sm font-mono font-medium ${
                      darkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}>
                      {quote.number}
                    </td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {quote.clientName}
                    </td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {EVENT_TYPE_LABELS[quote.eventType]}
                    </td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {formatDate(quote.eventDate)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${
                      darkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}>
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: QUOTE_STATUS_COLORS[quote.status] + '20',
                          color: QUOTE_STATUS_COLORS[quote.status],
                        }}
                      >
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(quote)}
                          title="Modifica"
                          className={`p-2 rounded-lg transition-colors ${
                            darkMode
                              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(quote)}
                          title="Duplica"
                          className={`p-2 rounded-lg transition-colors ${
                            darkMode
                              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          <Copy size={16} />
                        </button>
                        {deleteConfirmId === quote.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(quote.id)}
                              className="px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                              Conferma
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                darkMode
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(quote.id)}
                            title="Elimina"
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode
                                ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
