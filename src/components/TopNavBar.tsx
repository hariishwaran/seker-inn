import { Menu } from 'lucide-react';

interface TopNavBarProps {
  activeTab: string;
  onToggleMobileMenu: () => void;
}

export default function TopNavBar({
  activeTab,
  onToggleMobileMenu
}: TopNavBarProps) {
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Hotel Operations Dashboard';
      case 'rooms':
        return 'Room Management';
      case 'billing':
        return 'Invoices Dashboard';
      case 'new-invoice':
        return 'New Invoice';
      case 'tax-filing':
        return 'Tax Filing Register';
      case 'settings':
        return 'Settings & Configuration';
      default:
        return 'Sekar Inn Portal';
    }
  };

  return (
    <header
      className="sticky top-0 z-40 bg-white/5 backdrop-blur-2xl border-b border-white/10 h-20 flex justify-between items-center px-4 md:px-10 w-full"
      id="top-nav-bar"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 -ml-1 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-200 cursor-pointer flex items-center justify-center"
          id="mobile-sidebar-toggle-btn"
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation menu overlay"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-medium text-white/90 tracking-tight font-display" id="top-bar-title">
          {getHeaderTitle()}
        </h2>
      </div>
    </header>
  );
}
