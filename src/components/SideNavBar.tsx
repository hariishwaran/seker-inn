/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutDashboard, BedDouble, ReceiptText, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface SideNavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function SideNavBar({ 
  activeTab, 
  setActiveTab, 
  onLogout,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile
}: SideNavBarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'rooms', name: 'Room Management', icon: BedDouble },
    { id: 'billing', name: 'Billing/Invoices', icon: ReceiptText },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <button 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden transition-all duration-300 animate-[fadeIn_0.2s_ease-out] cursor-default w-full h-full text-left border-0 p-0"
          id="side-nav-bar-backdrop"
          aria-label="Close mobile sidebar overlay"
        />
      )}

      <aside 
        className={`fixed left-0 top-0 h-full bg-[#050510]/95 backdrop-blur-2xl text-white flex flex-col py-8 border-r border-white/10 transition-all duration-300 z-55 ${
          isCollapsed ? 'md:w-[80px]' : 'md:w-[260px]'
        } ${
          isMobileOpen ? 'w-[260px] translate-x-0' : 'w-[260px] -translate-x-full md:translate-x-0'
        }`}
        id="side-nav-bar"
      >
        {/* Floating Toggle Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute top-7 -right-3.5 z-[100] w-7 h-7 bg-[#12121e] hover:bg-indigo-600/20 border border-white/15 text-white/70 hover:text-white rounded-full hidden md:flex items-center justify-center transition-all hover:scale-105 shadow-md cursor-pointer group"
          id="sidebar-toggle-btn"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 group-hover:text-indigo-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 group-hover:text-indigo-400" />
          )}
        </button>

        {/* Branding Header */}
        <div className={`flex items-center mb-10 transition-all duration-300 ${
          isCollapsed ? 'md:justify-center md:px-0 gap-0' : 'gap-3 px-6'
        } px-6`}>
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <div className="w-4 h-4 bg-white/20 rounded-sm rotate-45"></div>
          </div>
          {!isCollapsed ? (
            <div className="animate-[fadeIn_0.2s_ease-out] whitespace-nowrap overflow-hidden ml-3">
              <span className="text-xl font-bold tracking-tight text-white font-display">SEKAR INN</span>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Manager Hub</p>
            </div>
          ) : (
            <div className="animate-[fadeIn_0.2s_ease-out] whitespace-nowrap overflow-hidden ml-3 md:hidden">
              <span className="text-xl font-bold tracking-tight text-white font-display">SEKAR INN</span>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Manager Hub</p>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className={`flex-1 space-y-1.5 ${isCollapsed ? 'px-2 md:px-2' : 'px-3'} px-3`}>
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id || (item.id === 'billing' && activeTab === 'new-invoice');
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center transition-all duration-300 ${
                  isCollapsed ? 'md:justify-center md:p-3 p-3 gap-3' : 'gap-3 px-4 py-3'
                } rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-white/10 border border-white/10 text-white font-bold shadow-sm'
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`}
                id={`nav-item-${item.id}`}
                title={isCollapsed ? item.name : undefined}
              >
                <IconComponent className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-white/40'}`} />
                {!isCollapsed ? (
                  <span className="animate-[fadeIn_0.2s_ease-out] whitespace-nowrap overflow-hidden">
                    {item.name}
                  </span>
                ) : (
                  <span className="animate-[fadeIn_0.2s_ease-out] whitespace-nowrap overflow-hidden md:hidden">
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout button */}
        <div className={`mt-auto ${isCollapsed ? 'px-2 md:px-2' : 'px-4'} px-4`}>
          <button
            onClick={onLogout}
            className={`w-full flex items-center transition-all duration-200 ${
              isCollapsed ? 'md:justify-center md:p-3 p-3 gap-3' : 'gap-3 px-4 py-3.5'
            } rounded-xl text-sm font-medium text-white/40 hover:bg-red-500/10 hover:text-red-400`}
            id="logout-btn"
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className="h-5 w-5 text-red-450 opacity-70 flex-shrink-0" />
            {!isCollapsed ? (
              <span className="animate-[fadeIn_0.2s_ease-out] whitespace-nowrap overflow-hidden">
                Logout
              </span>
            ) : (
              <span className="animate-[fadeIn_0.2s_ease-out] whitespace-nowrap overflow-hidden md:hidden">
                Logout
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
