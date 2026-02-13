import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { getDashboardStats } from '../database';
import { formatCurrency, formatDate } from '../utils/format';
import { FileText, Users, TrendingUp, Calendar, AlertTriangle, PlusCircle } from 'lucide-react';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '../types';
import type { DashboardStats } from '../types';

export default function Dashboard() {
  const { setPage, setEditingQuoteId, darkMode } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const data = getDashboardStats();
    setStats(data);
  }, []);

  const maxRevenue = useMemo(() => {
    if (!stats) return 0;
    return Math.max(...stats.monthlyRevenue.map((m) => m.value), 1);
  }, [stats]);

  if (!stats) return null;

  const cardClass = darkMode
    ? 'bg-surface-dark border-border-dark'
    : 'bg-surface border-border';

  const textPrimary = darkMode ? 'text-text-dark' : 'text-text';
  const textMuted = 'text-text-muted';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingQuoteId(null);
              setPage('quote-editor' as never);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
          >
            <PlusCircle size={18} />
            Nuovo Preventivo
          </button>
          <button
            onClick={() => setPage('clients')}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors shadow-sm"
          >
            <Users size={18} />
            Nuovo Cliente
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Preventivi Emessi */}
        <div className={`rounded-xl border p-5 shadow-sm ${cardClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textMuted}`}>Preventivi Emessi (mese)</p>
              <p className={`text-3xl font-bold mt-1 ${textPrimary}`}>{stats.monthlyQuotes}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
              <FileText size={24} className="text-info" />
            </div>
          </div>
        </div>

        {/* Valore Totale */}
        <div className={`rounded-xl border p-5 shadow-sm ${cardClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textMuted}`}>Valore Totale (mese)</p>
              <p className={`text-3xl font-bold mt-1 ${textPrimary}`}>
                {formatCurrency(stats.monthlyValue)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp size={24} className="text-success" />
            </div>
          </div>
        </div>

        {/* Tasso di Conversione */}
        <div className={`rounded-xl border p-5 shadow-sm ${cardClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textMuted}`}>Tasso di Conversione</p>
              <p className={`text-3xl font-bold mt-1 ${textPrimary}`}>
                {stats.conversionRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <Calendar size={24} className="text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Expiring Quotes + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Preventivi in Scadenza */}
        <div className={`rounded-xl border shadow-sm ${cardClass}`}>
          <div className="flex items-center gap-2 p-5 pb-3 border-b border-inherit">
            <AlertTriangle size={20} className="text-warning" />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>
              Preventivi in Scadenza
            </h2>
            <span
              className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                darkMode ? 'bg-warning/20 text-warning' : 'bg-warning/10 text-warning'
              }`}
            >
              Prossimi 30 giorni
            </span>
          </div>
          <div className="p-5 pt-3">
            {stats.expiringQuotes.length === 0 ? (
              <p className={`text-sm ${textMuted} py-4 text-center`}>
                Nessun preventivo in scadenza
              </p>
            ) : (
              <ul className="space-y-3">
                {stats.expiringQuotes.map((quote) => (
                  <li
                    key={quote.id}
                    onClick={() => setEditingQuoteId(quote.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      darkMode
                        ? 'hover:bg-white/5'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${textPrimary}`}>
                          {quote.number}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                          style={{
                            backgroundColor: QUOTE_STATUS_COLORS[quote.status],
                          }}
                        >
                          {QUOTE_STATUS_LABELS[quote.status]}
                        </span>
                      </div>
                      <p className={`text-sm ${textMuted} truncate mt-0.5`}>
                        {quote.clientName}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className={`font-semibold text-sm ${textPrimary}`}>
                        {formatCurrency(quote.total)}
                      </p>
                      <p className="text-xs text-danger font-medium">
                        Scade: {formatDate(quote.expiryDate)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Prossimi Eventi Confermati */}
        <div className={`rounded-xl border shadow-sm ${cardClass}`}>
          <div className="flex items-center gap-2 p-5 pb-3 border-b border-inherit">
            <Calendar size={20} className="text-success" />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>
              Prossimi Eventi Confermati
            </h2>
          </div>
          <div className="p-5 pt-3">
            {stats.upcomingEvents.length === 0 ? (
              <p className={`text-sm ${textMuted} py-4 text-center`}>
                Nessun evento confermato in programma
              </p>
            ) : (
              <ul className="space-y-3">
                {stats.upcomingEvents.map((quote) => (
                  <li
                    key={quote.id}
                    onClick={() => setEditingQuoteId(quote.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      darkMode
                        ? 'hover:bg-white/5'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-sm ${textPrimary}`}>
                        {quote.clientName}
                      </p>
                      <p className={`text-sm ${textMuted} truncate mt-0.5`}>
                        {quote.eventLocation || 'Luogo non specificato'}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className={`font-semibold text-sm ${textPrimary}`}>
                        {formatCurrency(quote.total)}
                      </p>
                      <p className={`text-xs ${textMuted}`}>
                        {formatDate(quote.eventDate)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className={`rounded-xl border shadow-sm ${cardClass}`}>
        <div className="flex items-center gap-2 p-5 pb-3 border-b border-inherit">
          <TrendingUp size={20} className="text-primary" />
          <h2 className={`text-lg font-semibold ${textPrimary}`}>
            Fatturato Mensile {new Date().getFullYear()}
          </h2>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-2 h-48">
            {stats.monthlyRevenue.map((item) => {
              const heightPercent =
                maxRevenue > 0 ? (item.value / maxRevenue) * 100 : 0;
              const isCurrentMonth =
                new Date().getMonth() ===
                stats.monthlyRevenue.indexOf(item);

              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end group"
                >
                  {/* Tooltip on hover */}
                  <div
                    className={`text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity ${textPrimary}`}
                  >
                    {formatCurrency(item.value)}
                  </div>
                  {/* Bar */}
                  <div
                    className={`w-full max-w-[40px] rounded-t-md transition-all ${
                      isCurrentMonth
                        ? 'bg-primary'
                        : item.value > 0
                          ? darkMode
                            ? 'bg-primary/40'
                            : 'bg-primary/30'
                          : darkMode
                            ? 'bg-border-dark'
                            : 'bg-gray-100'
                    }`}
                    style={{
                      height: `${Math.max(heightPercent, 2)}%`,
                    }}
                  />
                  {/* Month label */}
                  <span
                    className={`text-xs mt-1 ${
                      isCurrentMonth
                        ? 'font-bold text-primary'
                        : textMuted
                    }`}
                  >
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
