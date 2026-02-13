import { useAppStore } from '../../store';
import {
  LayoutDashboard, Users, FileText, BookOpen, Settings, Sun, Moon, PlusCircle
} from 'lucide-react';

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients' as const, label: 'Clienti', icon: Users },
  { id: 'quotes' as const, label: 'Preventivi', icon: FileText },
  { id: 'services' as const, label: 'Catalogo Servizi', icon: BookOpen },
  { id: 'settings' as const, label: 'Impostazioni', icon: Settings },
];

export default function Sidebar() {
  const { currentPage, setPage, darkMode, toggleDarkMode, setEditingQuoteId } = useAppStore();

  return (
    <aside className="w-64 bg-sidebar text-white flex flex-col h-screen shrink-0">
      <div className="p-5 border-b border-white/10">
        <h1 className="text-lg font-semibold tracking-wide">Stella Filella</h1>
        <p className="text-xs text-white/50 mt-1">Wedding & Events</p>
      </div>

      <div className="p-3">
        <button
          onClick={() => { setEditingQuoteId(0); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors text-sm font-medium"
        >
          <PlusCircle size={18} />
          Nuovo Preventivo
        </button>
      </div>

      <nav className="flex-1 px-3 py-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-colors text-sm ${
                isActive
                  ? 'bg-sidebar-hover text-white'
                  : 'text-white/60 hover:text-white hover:bg-sidebar-hover/50'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-white/60 hover:text-white rounded-lg transition-colors text-sm"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {darkMode ? 'Modalità chiara' : 'Modalità scura'}
        </button>
      </div>
    </aside>
  );
}
