import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getSettings, updateSettings, exportAllData, importAllData } from '../database';
import { CompanySettings } from '../types';
import { Save, Download, Upload, Building, Receipt, FileText, CreditCard, StickyNote, Hash } from 'lucide-react';

export default function SettingsPage() {
  const { darkMode } = useAppStore();
  const [settings, setSettings] = useState<CompanySettings>(getSettings());
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToastType(type);
    setToast(message);
  }

  function handleChange(field: keyof CompanySettings, value: string | number) {
    setSettings(prev => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const paymentSum = settings.defaultPaymentDeposit + settings.defaultPaymentSecond + settings.defaultPaymentBalance;
    if (paymentSum !== 100) {
      showToast(`Le percentuali di pagamento devono sommare a 100% (attualmente ${paymentSum}%)`, 'error');
      return;
    }
    updateSettings(settings);
    showToast('Impostazioni salvate con successo!');
  }

  function handleExport() {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-gestionale-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup esportato con successo!');
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importAllData(content);
      if (success) {
        setSettings(getSettings());
        showToast('Dati importati con successo! La pagina si aggiornerà.', 'success');
      } else {
        showToast('Errore durante l\'importazione. File non valido.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const cardClass = `rounded-xl border p-6 ${
    darkMode
      ? 'bg-surface-dark border-border-dark'
      : 'bg-surface border-border'
  }`;

  const labelClass = `block text-sm font-medium mb-1 ${
    darkMode ? 'text-gray-300' : 'text-gray-700'
  }`;

  const inputClass = `w-full rounded-lg border px-3 py-2.5 text-sm ${
    darkMode
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
  }`;

  const textareaClass = `w-full rounded-lg border px-3 py-2.5 text-sm resize-vertical ${
    darkMode
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
  }`;

  const sectionTitleClass = `text-lg font-semibold mb-4 flex items-center gap-2 ${
    darkMode ? 'text-white' : 'text-gray-900'
  }`;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
            toastType === 'success' ? 'bg-success' : 'bg-danger'
          }`}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Impostazioni
        </h1>
        <p className="text-sm mt-0.5 text-text-muted">
          Configura i parametri della tua attivita
        </p>
      </div>

      <div className="max-w-4xl space-y-5">
        {/* Dati Aziendali */}
        <div className={cardClass}>
          <h2 className={sectionTitleClass}>
            <Building className="w-5 h-5 text-blue-500" />
            Dati Aziendali
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome Azienda</label>
              <input
                type="text"
                className={inputClass}
                value={settings.companyName}
                onChange={e => handleChange('companyName', e.target.value)}
                placeholder="Nome della tua azienda"
              />
            </div>
            <div>
              <label className={labelClass}>Partita IVA</label>
              <input
                type="text"
                className={inputClass}
                value={settings.vatNumber}
                onChange={e => handleChange('vatNumber', e.target.value)}
                placeholder="IT00000000000"
              />
            </div>
            <div>
              <label className={labelClass}>Indirizzo</label>
              <input
                type="text"
                className={inputClass}
                value={settings.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="Via Roma 1, 00100 Roma"
              />
            </div>
            <div>
              <label className={labelClass}>Telefono</label>
              <input
                type="text"
                className={inputClass}
                value={settings.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="+39 000 000 0000"
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={inputClass}
                value={settings.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="info@azienda.it"
              />
            </div>
            <div>
              <label className={labelClass}>Percorso Logo</label>
              <input
                type="text"
                className={inputClass}
                value={settings.logoPath}
                onChange={e => handleChange('logoPath', e.target.value)}
                placeholder="/images/logo.png"
              />
            </div>
          </div>
        </div>

        {/* Regime Fiscale */}
        <div className={cardClass}>
          <h2 className={sectionTitleClass}>
            <Receipt className="w-5 h-5 text-green-500" />
            Regime Fiscale
          </h2>
          <div className="space-y-4">
            <div className="flex gap-6">
              <label className={`flex items-center gap-2 cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="radio"
                  name="taxRegime"
                  value="forfettario"
                  checked={settings.taxRegime === 'forfettario'}
                  onChange={() => handleChange('taxRegime', 'forfettario')}
                  className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm">Forfettario</span>
              </label>
              <label className={`flex items-center gap-2 cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="radio"
                  name="taxRegime"
                  value="ordinario"
                  checked={settings.taxRegime === 'ordinario'}
                  onChange={() => handleChange('taxRegime', 'ordinario')}
                  className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm">Ordinario</span>
              </label>
            </div>
            {settings.taxRegime === 'ordinario' && (
              <div className="max-w-xs">
                <label className={labelClass}>Aliquota IVA (%)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={settings.vatRate}
                  onChange={e => handleChange('vatRate', parseFloat(e.target.value) || 0)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            )}
          </div>
        </div>

        {/* Template PDF */}
        <div className={cardClass}>
          <h2 className={sectionTitleClass}>
            <FileText className="w-5 h-5 text-purple-500" />
            Template PDF
          </h2>
          <div className="flex gap-6">
            <label className={`flex items-center gap-2 cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="radio"
                name="pdfTemplate"
                value="elegante"
                checked={settings.defaultTemplate === 'elegante'}
                onChange={() => handleChange('defaultTemplate', 'elegante')}
                className="w-4 h-4 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Elegante</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="radio"
                name="pdfTemplate"
                value="minimal"
                checked={settings.defaultTemplate === 'minimal'}
                onChange={() => handleChange('defaultTemplate', 'minimal')}
                className="w-4 h-4 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Minimal</span>
            </label>
          </div>
        </div>

        {/* Schema Pagamento Default */}
        <div className={cardClass}>
          <h2 className={sectionTitleClass}>
            <CreditCard className="w-5 h-5 text-amber-500" />
            Schema Pagamento Default
          </h2>
          <p className={`text-xs mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Le tre percentuali devono sommare a 100%
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Acconto (%)</label>
              <input
                type="number"
                className={inputClass}
                value={settings.defaultPaymentDeposit}
                onChange={e => handleChange('defaultPaymentDeposit', parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className={labelClass}>Seconda Rata (%)</label>
              <input
                type="number"
                className={inputClass}
                value={settings.defaultPaymentSecond}
                onChange={e => handleChange('defaultPaymentSecond', parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className={labelClass}>Saldo (%)</label>
              <input
                type="number"
                className={inputClass}
                value={settings.defaultPaymentBalance}
                onChange={e => handleChange('defaultPaymentBalance', parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
              />
            </div>
          </div>
          {(() => {
            const sum = settings.defaultPaymentDeposit + settings.defaultPaymentSecond + settings.defaultPaymentBalance;
            if (sum !== 100) {
              return (
                <p className="text-xs text-red-500 mt-2">
                  Totale attuale: {sum}% — deve essere 100%
                </p>
              );
            }
            return (
              <p className="text-xs text-green-500 mt-2">
                Totale: 100%
              </p>
            );
          })()}
        </div>

        {/* Note e Condizioni */}
        <div className={cardClass}>
          <h2 className={sectionTitleClass}>
            <StickyNote className="w-5 h-5 text-yellow-500" />
            Note e Condizioni
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Note Default per Preventivi</label>
              <textarea
                className={textareaClass}
                rows={3}
                value={settings.defaultNotes}
                onChange={e => handleChange('defaultNotes', e.target.value)}
                placeholder="Note da includere automaticamente nei preventivi..."
              />
            </div>
            <div>
              <label className={labelClass}>Condizioni Default per Preventivi</label>
              <textarea
                className={textareaClass}
                rows={4}
                value={settings.defaultConditions}
                onChange={e => handleChange('defaultConditions', e.target.value)}
                placeholder="Condizioni contrattuali standard..."
              />
            </div>
          </div>
        </div>

        {/* Numerazione Preventivi */}
        <div className={cardClass}>
          <h2 className={sectionTitleClass}>
            <Hash className="w-5 h-5 text-indigo-500" />
            Numerazione Preventivi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prefisso Preventivo</label>
              <input
                type="text"
                className={inputClass}
                value={settings.quotePrefix}
                onChange={e => handleChange('quotePrefix', e.target.value)}
                placeholder="PRV"
              />
            </div>
            <div>
              <label className={labelClass}>Numero di Partenza</label>
              <input
                type="number"
                className={inputClass}
                value={settings.quoteStartNumber}
                onChange={e => handleChange('quoteStartNumber', parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>
          </div>
          <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Formato risultante: {settings.quotePrefix}-{new Date().getFullYear()}-{String(settings.quoteStartNumber).padStart(4, '0')}
          </p>
        </div>

        {/* Backup Database */}
        <div className={cardClass}>
          <h2 className={sectionTitleClass}>
            <Download className="w-5 h-5 text-cyan-500" />
            Backup Database
          </h2>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Esporta tutti i dati in un file JSON o importa un backup precedente.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Download className="w-4 h-4" />
              Esporta Backup
            </button>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2">
              <Upload className="w-4 h-4" />
              Importa Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
          >
            <Save className="w-5 h-5" />
            Salva Impostazioni
          </button>
        </div>
      </div>
    </div>
  );
}
