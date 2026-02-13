import { useAppStore } from './store';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/ClientsPage';
import ServicesPage from './pages/ServicesPage';
import QuotesPage from './pages/QuotesPage';
import QuoteEditor from './pages/QuoteEditor';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { currentPage, darkMode } = useAppStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'clients': return <ClientsPage />;
      case 'services': return <ServicesPage />;
      case 'quotes': return <QuotesPage />;
      case 'quote-editor': return <QuoteEditor />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      <Sidebar />
      <main className={`flex-1 overflow-auto ${darkMode ? 'bg-bg-dark text-text-dark' : 'bg-bg text-text'}`}>
        {renderPage()}
      </main>
    </div>
  );
}
