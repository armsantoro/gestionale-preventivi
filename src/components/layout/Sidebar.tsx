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
    <aside className="w-60 bg-sidebar text-white flex flex-col h-screen shrink-0">
      <div className="px-5 py-5 border-b border-white/10">
        <h1 className="text-base font-semibold tracking-wide">Stella Filella</h1>
        <p className="text-[11px] text-white/40 mt-0.5">Wedding & Events</p>
      </div>

      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => { setEditingQuoteId(0); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors text-sm font-medium"
        >
          <PlusCircle size={16} />
          Nuovo Preventivo
        </button>
      </div>

      <nav className="flex-1 px-3 py-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg mb-0.5 transition-colors text-[13px] ${
                isActive
                  ? 'bg-sidebar-hover text-white font-medium'
                  : 'text-white/55 hover:text-white/90 hover:bg-sidebar-hover/50'
              }`}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-3.5 py-2 text-white/50 hover:text-white/80 rounded-lg transition-colors text-[13px]"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {darkMode ? 'Modalita chiara' : 'Modalita scura'}
        </button>
      </div>
    </aside>
  );
}
