import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getClients, createClient, updateClient, deleteClient, getQuotesByClient } from '../database';
import { Client, EventType, ClientStatus, EVENT_TYPE_LABELS, CLIENT_STATUS_LABELS } from '../types';
import { Search, Plus, Edit2, Trash2, X, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { formatDate } from '../utils/format';

const STATUS_COLORS: Record<ClientStatus, { bg: string; text: string; darkBg: string; darkText: string }> = {
  prospect: { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'bg-amber-900/30', darkText: 'text-amber-300' },
  attivo: { bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'bg-blue-900/30', darkText: 'text-blue-300' },
  confermato: { bg: 'bg-green-100', text: 'text-green-800', darkBg: 'bg-green-900/30', darkText: 'text-green-300' },
  archiviato: { bg: 'bg-gray-100', text: 'text-gray-800', darkBg: 'bg-gray-700/30', darkText: 'text-gray-400' },
};

const EVENT_TYPE_OPTIONS: EventType[] = ['matrimonio', 'compleanno', 'battesimo', 'comunione', 'altro'];
const STATUS_OPTIONS: ClientStatus[] = ['prospect', 'attivo', 'confermato', 'archiviato'];

type ClientFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  eventType: EventType;
  notes: string;
  status: ClientStatus;
};

const emptyForm: ClientFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  eventType: 'matrimonio',
  notes: '',
  status: 'prospect',
};

export default function ClientsPage() {
  const { darkMode, setEditingQuoteId } = useAppStore();

  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ClientStatus | ''>('');
  const [filterEventType, setFilterEventType] = useState<EventType | ''>('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyForm);

  // Detail panel state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientQuotes, setClientQuotes] = useState<ReturnType<typeof getQuotesByClient>>([]);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      setClientQuotes(getQuotesByClient(selectedClient.id));
    }
  }, [selectedClient]);

  function loadClients() {
    setClients(getClients());
  }

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.phone.toLowerCase().includes(query);
    const matchesStatus = !filterStatus || client.status === filterStatus;
    const matchesEventType = !filterEventType || client.eventType === filterEventType;
    return matchesSearch && matchesStatus && matchesEventType;
  });

  function openCreateModal() {
    setEditingClient(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      eventType: client.eventType,
      notes: client.notes,
      status: client.status,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;

    if (editingClient) {
      updateClient(editingClient.id, form);
    } else {
      createClient(form);
    }

    setShowModal(false);
    setEditingClient(null);
    setForm(emptyForm);
    loadClients();

    // Refresh selected client if it was the one edited
    if (selectedClient && editingClient && selectedClient.id === editingClient.id) {
      const updated = getClients().find(c => c.id === selectedClient.id);
      if (updated) setSelectedClient(updated);
    }
  }

  function handleDelete(id: number) {
    deleteClient(id);
    setDeleteConfirmId(null);
    if (selectedClient?.id === id) {
      setSelectedClient(null);
    }
    loadClients();
  }

  function handleRowClick(client: Client) {
    setSelectedClient(prev => (prev?.id === client.id ? null : client));
  }

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
    darkMode
      ? 'bg-bg-dark border-border-dark text-text-dark focus:border-accent'
      : 'bg-white border-border text-text focus:border-accent'
  } outline-none`;

  const QUOTE_STATUS_PILL: Record<string, string> = {
    bozza: 'bg-yellow-100 text-yellow-800',
    inviato: 'bg-blue-100 text-blue-800',
    confermato: 'bg-green-100 text-green-800',
    rifiutato: 'bg-red-100 text-red-800',
    scaduto: 'bg-gray-100 text-gray-600',
    completato: 'bg-emerald-100 text-emerald-800',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clienti</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-text-muted' : 'text-text-muted'}`}>
            Gestisci la tua rubrica clienti
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Nuovo Cliente
        </button>
      </div>

      {/* Search & Filters */}
      <div className={`rounded-xl p-4 mb-6 ${darkMode ? 'bg-surface-dark' : 'bg-surface'} shadow-sm`}>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cerca per nome, email o telefono..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${
                darkMode
                  ? 'bg-bg-dark border-border-dark text-text-dark'
                  : 'bg-bg border-border text-text'
              } outline-none focus:border-accent transition-colors`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as ClientStatus | '')}
            className={`px-3 py-2 rounded-lg border text-sm ${
              darkMode
                ? 'bg-bg-dark border-border-dark text-text-dark'
                : 'bg-bg border-border text-text'
            } outline-none focus:border-accent transition-colors`}
          >
            <option value="">Tutti gli stati</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{CLIENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={filterEventType}
            onChange={e => setFilterEventType(e.target.value as EventType | '')}
            className={`px-3 py-2 rounded-lg border text-sm ${
              darkMode
                ? 'bg-bg-dark border-border-dark text-text-dark'
                : 'bg-bg border-border text-text'
            } outline-none focus:border-accent transition-colors`}
          >
            <option value="">Tutti gli eventi</option>
            {EVENT_TYPE_OPTIONS.map(t => (
              <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Client Table */}
        <div className={`flex-1 rounded-xl overflow-hidden shadow-sm ${darkMode ? 'bg-surface-dark' : 'bg-surface'}`}>
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center text-text-muted">
              <p className="text-lg mb-1">Nessun cliente trovato</p>
              <p className="text-sm">
                {clients.length === 0
                  ? 'Inizia aggiungendo il tuo primo cliente.'
                  : 'Prova a modificare i filtri di ricerca.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-border-dark' : 'border-border'}`}>
                  <th className="text-left px-4 py-3 font-semibold">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Telefono</th>
                  <th className="text-left px-4 py-3 font-semibold">Evento</th>
                  <th className="text-left px-4 py-3 font-semibold">Stato</th>
                  <th className="text-right px-4 py-3 font-semibold">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => {
                  const statusColor = STATUS_COLORS[client.status];
                  const isSelected = selectedClient?.id === client.id;
                  return (
                    <tr
                      key={client.id}
                      onClick={() => handleRowClick(client)}
                      className={`border-b cursor-pointer transition-colors ${
                        darkMode ? 'border-border-dark' : 'border-border'
                      } ${
                        isSelected
                          ? darkMode
                            ? 'bg-accent/10'
                            : 'bg-accent/5'
                          : darkMode
                            ? 'hover:bg-white/5'
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">{client.name}</td>
                      <td className="px-4 py-3 text-text-muted">{client.email || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{client.phone || '-'}</td>
                      <td className="px-4 py-3">{EVENT_TYPE_LABELS[client.eventType]}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            darkMode
                              ? `${statusColor.darkBg} ${statusColor.darkText}`
                              : `${statusColor.bg} ${statusColor.text}`
                          }`}
                        >
                          {CLIENT_STATUS_LABELS[client.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); openEditModal(client); }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                            }`}
                            title="Modifica"
                          >
                            <Edit2 size={15} />
                          </button>
                          {deleteConfirmId === client.id ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleDelete(client.id)}
                                className="px-2 py-1 text-xs bg-danger text-white rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Conferma
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                  darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteConfirmId(client.id); }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                darkMode ? 'hover:bg-white/10 text-red-400' : 'hover:bg-red-50 text-danger'
                              }`}
                              title="Elimina"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className={`px-4 py-3 text-xs ${darkMode ? 'text-text-muted border-t border-border-dark' : 'text-text-muted border-t border-border'}`}>
            {filteredClients.length} client{filteredClients.length !== 1 ? 'i' : 'e'} trovati
          </div>
        </div>

        {/* Client Detail Panel */}
        {selectedClient && (
          <div className={`w-80 shrink-0 rounded-xl p-5 shadow-sm ${darkMode ? 'bg-surface-dark' : 'bg-surface'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Dettagli Cliente</h2>
              <button
                onClick={() => setSelectedClient(null)}
                className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <h3 className="font-semibold text-base">{selectedClient.name}</h3>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  darkMode
                    ? `${STATUS_COLORS[selectedClient.status].darkBg} ${STATUS_COLORS[selectedClient.status].darkText}`
                    : `${STATUS_COLORS[selectedClient.status].bg} ${STATUS_COLORS[selectedClient.status].text}`
                }`}
              >
                {CLIENT_STATUS_LABELS[selectedClient.status]}
              </span>

              {selectedClient.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-text-muted shrink-0" />
                  <span className="truncate">{selectedClient.email}</span>
                </div>
              )}
              {selectedClient.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-text-muted shrink-0" />
                  <span>{selectedClient.phone}</span>
                </div>
              )}
              {selectedClient.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-text-muted shrink-0" />
                  <span>{selectedClient.address}</span>
                </div>
              )}

              <div className="text-sm">
                <span className="text-text-muted">Tipo evento: </span>
                {EVENT_TYPE_LABELS[selectedClient.eventType]}
              </div>

              {selectedClient.notes && (
                <div className="text-sm">
                  <span className="text-text-muted">Note: </span>
                  <p className={`mt-1 text-xs ${darkMode ? 'text-text-dark/70' : 'text-text/70'}`}>
                    {selectedClient.notes}
                  </p>
                </div>
              )}

              <div className="text-xs text-text-muted pt-2">
                Creato il {formatDate(selectedClient.createdAt)}
              </div>
            </div>

            {/* Associated Quotes */}
            <div className={`border-t pt-4 ${darkMode ? 'border-border-dark' : 'border-border'}`}>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-text-muted" />
                <h4 className="font-medium text-sm">Preventivi ({clientQuotes.length})</h4>
              </div>
              {clientQuotes.length === 0 ? (
                <p className="text-xs text-text-muted">Nessun preventivo associato.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {clientQuotes.map(quote => (
                    <button
                      key={quote.id}
                      onClick={() => setEditingQuoteId(quote.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors ${
                        darkMode ? 'hover:bg-white/5 bg-bg-dark' : 'hover:bg-gray-50 bg-bg'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{quote.number}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          QUOTE_STATUS_PILL[quote.status] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-text-muted">
                        {formatDate(quote.eventDate)} &middot; {EVENT_TYPE_LABELS[quote.eventType]}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 w-full max-w-lg ${darkMode ? 'bg-surface-dark' : 'bg-surface'}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">
                {editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingClient(null); }}
                className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-text-muted">
                  Nome *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nome e cognome del cliente"
                  className={inputClass}
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-text-muted">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@esempio.it"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-text-muted">Telefono</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+39 333 1234567"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-text-muted">Indirizzo</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Via, Citta, CAP"
                  className={inputClass}
                />
              </div>

              {/* Event Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-text-muted">Tipo Evento</label>
                  <select
                    value={form.eventType}
                    onChange={e => setForm(f => ({ ...f, eventType: e.target.value as EventType }))}
                    className={inputClass}
                  >
                    {EVENT_TYPE_OPTIONS.map(t => (
                      <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-text-muted">Stato</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as ClientStatus }))}
                    className={inputClass}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{CLIENT_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-text-muted">Note</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Note aggiuntive sul cliente..."
                  rows={3}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowModal(false); setEditingClient(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingClient ? 'Salva Modifiche' : 'Crea Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
