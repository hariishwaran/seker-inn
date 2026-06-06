/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, LogIn, Menu } from 'lucide-react';

interface TopNavBarProps {
  activeTab: string;
  userEmail: string;
  onToggleMobileMenu: () => void;
}

export default function TopNavBar({ activeTab, userEmail, onToggleMobileMenu }: TopNavBarProps) {
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

  return (
    <header 
      className="sticky top-0 z-40 bg-white/5 backdrop-blur-2xl border-b border-white/10 h-20 flex justify-between items-center px-4 md:px-10 w-full"
      id="top-nav-bar"
    >
      <div className="flex items-center gap-3">
        {/* Hamburger Mobile Toggle */}
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

      <div className="flex items-center gap-4">
        {/* Profile Details */}
        <div className="flex items-center gap-3 pl-4 border-l border-white/10" id="user-profile-badge">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white/90">Manager User</p>
            <p className="text-xs text-white/40 font-mono">{userEmail || 'admin@sekarinn.com'}</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/20 p-0.5 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 via-emerald-400 to-yellow-200 text-[#0f1646] flex items-center justify-center font-extrabold text-sm select-none">
              M
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
