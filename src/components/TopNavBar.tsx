import { useState } from 'react';
import { Menu } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';

interface TopNavBarProps {
  activeTab: string;
  userEmail: string;
  userDisplayName: string;
  userAvatarUrl: string;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onLogout: () => void;
  onToggleMobileMenu: () => void;
}

export default function TopNavBar({
  activeTab,
  userEmail,
  userDisplayName,
  userAvatarUrl,
  onUpdateDisplayName,
  onLogout,
  onToggleMobileMenu
}: TopNavBarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
      case 'settings':
        return 'Settings & Configuration';
      default:
        return 'Sekar Inn Portal';
    }
  };

  const getInitial = () => {
    if (userDisplayName && userDisplayName.trim()) return userDisplayName[0].toUpperCase();
    if (userEmail && userEmail.trim()) return userEmail[0].toUpperCase();
    return 'U';
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

      <div className="flex items-center gap-4 relative">
        <div className="flex items-center gap-3 pl-4 border-l border-white/10" id="user-profile-badge">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white/90">{userDisplayName || 'User'}</p>
            <p className="text-xs text-white/40 font-mono">{userEmail}</p>
          </div>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-10 h-10 rounded-full border border-white/20 p-0.5 flex items-center justify-center hover:border-white/40 transition-all cursor-pointer overflow-hidden bg-[#0f1646]"
            title="Profile settings"
          >
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt=""
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 via-emerald-400 to-yellow-200 text-[#0f1646] flex items-center justify-center font-extrabold text-sm select-none">
                {getInitial()}
              </div>
            )}
          </button>
        </div>

        {isProfileOpen && (
          <ProfileDropdown
            userEmail={userEmail}
            userDisplayName={userDisplayName}
            userAvatarUrl={userAvatarUrl}
            onUpdateDisplayName={onUpdateDisplayName}
            onLogout={onLogout}
            onClose={() => setIsProfileOpen(false)}
          />
        )}
      </div>
    </header>
  );
}
