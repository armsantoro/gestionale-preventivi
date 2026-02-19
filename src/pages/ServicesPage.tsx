import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getServices,
  createService,
  updateService,
  deleteService,
} from '../database';
import { Service, ServiceCategory, UnitOfMeasure } from '../types';
import { formatCurrency } from '../utils/format';
import { Plus, Edit2, Trash2, X, Package, Tag, Truck } from 'lucide-react';

const UNIT_LABELS: Record<UnitOfMeasure, string> = {
  pezzo: 'Pezzo',
  coppia: 'Coppia',
  tavolo: 'Tavolo',
  metro: 'Metro',
  servizio: 'Servizio',
  evento: 'Evento',
};

const UNITS: UnitOfMeasure[] = ['pezzo', 'coppia', 'tavolo', 'metro', 'servizio', 'evento'];

interface CategoryFormData {
  name: string;
  sortOrder: number;
}

interface ServiceFormData {
  name: string;
  description: string;
  basePrice: number;
  unit: UnitOfMeasure;
  categoryId: number;
  transportIncluded: boolean;
}

const emptyCategoryForm: CategoryFormData = { name: '', sortOrder: 0 };
const emptyServiceForm: ServiceFormData = {
  name: '',
  description: '',
  basePrice: 0,
  unit: 'pezzo',
  categoryId: 0,
  transportIncluded: false,
};

export default function ServicesPage() {
  const { darkMode } = useAppStore();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(emptyCategoryForm);

  // Service modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceFormData>(emptyServiceForm);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'service'; id: number; name: string } | null>(null);

  const loadData = () => {
    const cats = getCategories().sort((a, b) => a.sortOrder - b.sortOrder);
    setCategories(cats);
    setServices(getServices());
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---- Category handlers ----
  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', sortOrder: categories.length });
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: ServiceCategory) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, sortOrder: cat.sortOrder });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) return;
    if (editingCategory) {
      updateCategory(editingCategory.id, categoryForm);
    } else {
      createCategory(categoryForm);
    }
    setShowCategoryModal(false);
    loadData();
  };

  const handleDeleteCategory = (id: number) => {
    deleteCategory(id);
    if (selectedCategoryId === id) setSelectedCategoryId(null);
    setDeleteTarget(null);
    loadData();
  };

  // ---- Service handlers ----
  const openNewService = () => {
    setEditingService(null);
    setServiceForm({
      ...emptyServiceForm,
      categoryId: selectedCategoryId ?? (categories.length > 0 ? categories[0].id : 0),
    });
    setShowServiceModal(true);
  };

  const openEditService = (svc: Service) => {
    setEditingService(svc);
    setServiceForm({
      name: svc.name,
      description: svc.description,
      basePrice: svc.basePrice,
      unit: svc.unit,
      categoryId: svc.categoryId,
      transportIncluded: svc.transportIncluded,
    });
    setShowServiceModal(true);
  };

  const handleSaveService = () => {
    if (!serviceForm.name.trim() || !serviceForm.categoryId) return;
    if (editingService) {
      updateService(editingService.id, serviceForm);
    } else {
      createService({ ...serviceForm, imagePath: null, sortOrder: services.length });
    }
    setShowServiceModal(false);
    loadData();
  };

  const handleDeleteService = (id: number) => {
    deleteService(id);
    setDeleteTarget(null);
    loadData();
  };

  // ---- Filtered / grouped services ----
  const filteredServices = selectedCategoryId
    ? services.filter((s) => s.categoryId === selectedCategoryId)
    : services;

  const groupedServices: { category: ServiceCategory; items: Service[] }[] = [];
  if (selectedCategoryId) {
    const cat = categories.find((c) => c.id === selectedCategoryId);
    if (cat) groupedServices.push({ category: cat, items: filteredServices });
  } else {
    categories.forEach((cat) => {
      const items = filteredServices.filter((s) => s.categoryId === cat.id);
      if (items.length > 0) groupedServices.push({ category: cat, items });
    });
    // Services with no matching category
    const orphans = filteredServices.filter((s) => !categories.find((c) => c.id === s.categoryId));
    if (orphans.length > 0) {
      groupedServices.push({ category: { id: 0, name: 'Senza categoria', sortOrder: 9999 }, items: orphans });
    }
  }

  const cardClass = darkMode ? 'bg-surface-dark border-border-dark' : 'bg-surface border-border';
  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
    darkMode
      ? 'bg-surface-dark border-border-dark text-white placeholder-gray-500'
      : 'bg-white border-border text-gray-900 placeholder-gray-400'
  }`;
  const labelClass = `block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Catalogo Servizi
          </h1>
          <p className="text-sm mt-0.5 text-text-muted">Gestisci categorie e servizi</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openNewCategory}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <Tag size={16} />
            Nuova Categoria
          </button>
          <button
            onClick={openNewService}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Nuovo Servizio
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left panel: categories */}
        <div className={`w-64 shrink-0 rounded-xl border p-4 ${cardClass} overflow-y-auto`}>
          <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Categorie
          </h2>
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
              selectedCategoryId === null
                ? 'bg-primary/10 text-primary font-medium'
                : darkMode
                  ? 'text-gray-300 hover:bg-white/5'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tutti i servizi
          </button>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-1 transition-colors cursor-pointer ${
                selectedCategoryId === cat.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : darkMode
                    ? 'text-gray-300 hover:bg-white/5'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              <span className="truncate">{cat.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditCategory(cat);
                  }}
                  className="p-1 rounded hover:bg-primary/10 text-primary"
                  title="Modifica"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ type: 'category', id: cat.id, name: cat.name });
                  }}
                  className="p-1 rounded hover:bg-red-500/10 text-red-500"
                  title="Elimina"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Nessuna categoria presente. Creane una per iniziare.
            </p>
          )}
        </div>

        {/* Main area: services */}
        <div className="flex-1 overflow-y-auto">
          {groupedServices.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-64 rounded-xl border ${cardClass}`}>
              <Package size={48} className={darkMode ? 'text-gray-600' : 'text-gray-300'} />
              <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Nessun servizio trovato.
              </p>
              <button
                onClick={openNewService}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                Aggiungi servizio
              </button>
            </div>
          ) : (
            groupedServices.map(({ category, items }) => (
              <div key={category.id} className="mb-6">
                <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Tag size={14} />
                  {category.name}
                  <span className="text-xs font-normal">({items.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((svc) => (
                    <div
                      key={svc.id}
                      className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${cardClass}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {svc.name}
                        </h4>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <button
                            onClick={() => openEditService(svc)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                            title="Modifica"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'service', id: svc.id, name: svc.name })}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {svc.description && (
                        <p className={`text-xs mb-3 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {svc.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-auto">
                        <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatCurrency(svc.basePrice)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            darkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {UNIT_LABELS[svc.unit]}
                          </span>
                          {svc.transportIncluded && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                              <Truck size={12} />
                              Trasporto incluso
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-xl ${cardClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}
              </h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Nome</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Nome della categoria"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Ordine</label>
                <input
                  type="number"
                  className={inputClass}
                  value={categoryForm.sortOrder}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  darkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Annulla
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!categoryForm.name.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingCategory ? 'Salva' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-xl ${cardClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingService ? 'Modifica Servizio' : 'Nuovo Servizio'}
              </h2>
              <button
                onClick={() => setShowServiceModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Nome</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Nome del servizio"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Descrizione</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Descrizione del servizio"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Prezzo base</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputClass}
                    placeholder="0,00"
                    value={serviceForm.basePrice || ''}
                    onChange={(e) => setServiceForm({ ...serviceForm, basePrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Unità di misura</label>
                  <select
                    className={inputClass}
                    value={serviceForm.unit}
                    onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value as UnitOfMeasure })}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {UNIT_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Categoria</label>
                <select
                  className={inputClass}
                  value={serviceForm.categoryId}
                  onChange={(e) => setServiceForm({ ...serviceForm, categoryId: parseInt(e.target.value) })}
                >
                  <option value={0} disabled>
                    Seleziona una categoria
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Trasporto incluso
                </label>
                <button
                  type="button"
                  onClick={() => setServiceForm({ ...serviceForm, transportIncluded: !serviceForm.transportIncluded })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    serviceForm.transportIncluded ? 'bg-primary' : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      serviceForm.transportIncluded ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowServiceModal(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  darkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Annulla
              </button>
              <button
                onClick={handleSaveService}
                disabled={!serviceForm.name.trim() || !serviceForm.categoryId}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingService ? 'Salva' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-xl ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Conferma eliminazione
            </h2>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Sei sicuro di voler eliminare {deleteTarget.type === 'category' ? 'la categoria' : 'il servizio'}{' '}
              <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{deleteTarget.name}</strong>?
              {deleteTarget.type === 'category' && ' I servizi associati non verranno eliminati.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  darkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (deleteTarget.type === 'category') handleDeleteCategory(deleteTarget.id);
                  else handleDeleteService(deleteTarget.id);
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
