import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { getDashboardStats } from '../database';
import { formatCurrency, formatDate } from '../utils/format';
import { FileText, TrendingUp, Calendar, AlertTriangle, PlusCircle } from 'lucide-react';
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

  const cardCls = darkMode
    ? 'bg-surface-dark border-border-dark'
    : 'bg-surface border-border';
  const textPrimary = darkMode ? 'text-text-dark' : 'text-text';
  const textMuted = 'text-text-muted';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Dashboard</h1>
          <p className={`text-sm mt-0.5 ${textMuted}`}>Panoramica della tua attivita</p>
        </div>
        <button
          onClick={() => {
            setEditingQuoteId(null);
            setPage('quote-editor' as never);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
        >
          <PlusCircle size={16} />
          Nuovo Preventivo
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-5 ${cardCls}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textMuted}`}>Preventivi del mese</p>
              <p className={`text-3xl font-bold mt-1 ${textPrimary}`}>{stats.monthlyQuotes}</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-info/10 flex items-center justify-center">
              <FileText size={20} className="text-info" />
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-5 ${cardCls}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textMuted}`}>Valore del mese</p>
              <p className={`text-3xl font-bold mt-1 ${textPrimary}`}>
                {formatCurrency(stats.monthlyValue)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-success" />
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-5 ${cardCls}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textMuted}`}>Tasso di conversione</p>
              <p className={`text-3xl font-bold mt-1 ${textPrimary}`}>
                {stats.conversionRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-warning/10 flex items-center justify-center">
              <Calendar size={20} className="text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Preventivi in Scadenza */}
        <div className={`rounded-xl border ${cardCls}`}>
          <div className="flex items-center gap-2 px-5 py-4 border-b border-inherit">
            <AlertTriangle size={18} className="text-warning" />
            <h2 className={`text-sm font-semibold ${textPrimary}`}>Preventivi in Scadenza</h2>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${
              darkMode ? 'bg-warning/20 text-warning' : 'bg-warning/10 text-warning'
            }`}>
              30 giorni
            </span>
          </div>
          <div className="p-5">
            {stats.expiringQuotes.length === 0 ? (
              <p className={`text-sm ${textMuted} py-4 text-center`}>
                Nessun preventivo in scadenza
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.expiringQuotes.map((quote) => (
                  <li
                    key={quote.id}
                    onClick={() => setEditingQuoteId(quote.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${textPrimary}`}>
                          {quote.number}
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
                          style={{ backgroundColor: QUOTE_STATUS_COLORS[quote.status] }}
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

        {/* Prossimi Eventi */}
        <div className={`rounded-xl border ${cardCls}`}>
          <div className="flex items-center gap-2 px-5 py-4 border-b border-inherit">
            <Calendar size={18} className="text-success" />
            <h2 className={`text-sm font-semibold ${textPrimary}`}>Prossimi Eventi</h2>
          </div>
          <div className="p-5">
            {stats.upcomingEvents.length === 0 ? (
              <p className={`text-sm ${textMuted} py-4 text-center`}>
                Nessun evento confermato
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.upcomingEvents.map((quote) => (
                  <li
                    key={quote.id}
                    onClick={() => setEditingQuoteId(quote.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
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
      <div className={`rounded-xl border ${cardCls}`}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-inherit">
          <TrendingUp size={18} className="text-primary" />
          <h2 className={`text-sm font-semibold ${textPrimary}`}>
            Fatturato {new Date().getFullYear()}
          </h2>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-2 h-44">
            {stats.monthlyRevenue.map((item) => {
              const heightPercent =
                maxRevenue > 0 ? (item.value / maxRevenue) * 100 : 0;
              const isCurrentMonth =
                new Date().getMonth() === stats.monthlyRevenue.indexOf(item);
              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end group"
                >
                  <div
                    className={`text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity ${textPrimary}`}
                  >
                    {formatCurrency(item.value)}
                  </div>
                  <div
                    className={`w-full max-w-[36px] rounded-t transition-all ${
                      isCurrentMonth
                        ? 'bg-primary'
                        : item.value > 0
                          ? darkMode ? 'bg-primary/40' : 'bg-primary/25'
                          : darkMode ? 'bg-border-dark' : 'bg-gray-100'
                    }`}
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  />
                  <span
                    className={`text-[10px] mt-1 ${
                      isCurrentMonth ? 'font-bold text-primary' : textMuted
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
