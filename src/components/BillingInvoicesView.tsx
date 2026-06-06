/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Invoice, Room } from '../types';
import { 
  Plus, Search, ListFilter, MoreVertical, CheckCircle, 
  AlertTriangle, FileText, ChevronLeft, ChevronRight, Eye, Trash, CreditCard, 
  Receipt, Calendar, User, Clock, Check
} from 'lucide-react';

interface BillingInvoicesViewProps {
  rooms: Room[];
  invoices: Invoice[];
  onCreateInvoice: (prefill?: {
    roomId?: string;
    guestName?: string;
    checkInDate?: string;
    checkOutDate?: string;
    extraBedsCount?: number;
  }) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onUpdateInvoiceStatus: (invoiceId: string, newStatus: Invoice['status']) => void;
}

export default function BillingInvoicesView({ 
  rooms,
  invoices, 
  onCreateInvoice, 
  onViewInvoice, 
  onDeleteInvoice,
  onUpdateInvoiceStatus
}: BillingInvoicesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeHistoryFilter, setActiveHistoryFilter] = useState<'All' | 'Active' | 'Completed'>('All');
  const [showHistoryFiltersMenu, setShowHistoryFiltersMenu] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  
  // Local pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Compile unified Booking / Stay entries for history Tab
  // 1. Live stays (currently occupied rooms)
  const activeStays = rooms
    .filter(r => r.status === 'occupied' && r.guestName)
    .map(r => ({
      type: 'Active' as const,
      id: `STAY-LIVE-${r.id}`,
      guestName: r.guestName || 'Anonymous Guest',
      roomNumber: r.id,
      roomType: r.roomType,
      checkIn: r.checkInDate || 'N/A',
      checkOut: r.checkOutDate || 'In Progress',
      totalNights: r.checkInDate && r.checkOutDate ? (() => {
        const d1 = new Date(r.checkInDate);
        const d2 = new Date(r.checkOutDate);
        const diff = d2.getTime() - d1.getTime();
        const days = Math.round(diff / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 1;
      })() : 1,
      amount: r.amountDue || r.basePrice || 0,
      statusLabel: 'Stay Active',
      isAC: r.isAC
    }));

  // 2. Archived historic stays from invoice database
  const archivedStays = invoices.map(inv => ({
    type: 'Completed' as const,
    id: `STAY-ARCH-${inv.id}`,
    invoiceId: inv.id,
    invoiceStatus: inv.status,
    guestName: inv.customerName,
    roomNumber: inv.roomNumber,
    roomType: inv.roomType,
    checkIn: inv.checkInDate,
    checkOut: inv.checkOutDate,
    totalNights: inv.totalNights,
    amount: inv.grandTotal,
    statusLabel: inv.status === 'Paid' ? 'Paid & Checked Out' : 'Pending Settlement',
    isAC: inv.roomType.toLowerCase().includes('ac') || inv.roomNumber.startsWith('1')
  }));

  const combinedBookings = [...activeStays, ...archivedStays];

  // Filters for Booking & Stay History tab
  const filteredHistory = combinedBookings.filter(b => {
    const matchesSearch = 
      b.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.roomType.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeHistoryFilter === 'All') return matchesSearch;
    return matchesSearch && b.type === activeHistoryFilter;
  });

  // Pagination helper bounds (History)
  const totalHistory = filteredHistory.length;
  const historyTotalPages = Math.ceil(totalHistory / itemsPerPage) || 1;
  const historyStartIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHistory = filteredHistory.slice(historyStartIndex, historyStartIndex + itemsPerPage);

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg font-bold border border-emerald-500/25 flex items-center justify-center gap-1.5 w-fit">
            <Check className="h-3 w-3" />
            <span>Paid</span>
          </span>
        );
      case 'Unpaid':
        return (
          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-lg font-bold border border-rose-500/25 flex items-center justify-center gap-1.5 w-fit">
            <AlertTriangle className="h-3 w-3" />
            <span>Unpaid</span>
          </span>
        );
      case 'Draft':
        return (
          <span className="px-2.5 py-1 bg-white/5 text-white/50 text-xs rounded-lg font-bold border border-white/10 flex items-center justify-center gap-1.5 w-fit">
            <FileText className="h-3 w-3" />
            <span>Draft</span>
          </span>
        );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'G';
  };

  return (
    <div className="space-y-6" id="billing-invoices-view">
      
      {/* Financial Overview Header */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display">Billing Ledger & Stay Registry</h1>
          <p className="text-sm text-white/50 mt-1">Access billing checkout invoices, register logs, and record client stay files.</p>
        </div>
        <button 
          onClick={onCreateInvoice}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md hover:shadow-indigo-500/10 cursor-pointer"
          id="btn-create-invoice"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Create New Invoice</span>
        </button>
      </section>

      {/* ==================== SINGLE UNIFIED LEDGER ==================== */}
      <section className="glass-panel rounded-2xl overflow-hidden shadow-lg border border-white/10" id="booking-history-container">
          
          {/* Table Toolbar / Utility Head */}
          <div className="px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/5 backdrop-blur-md">
            <div>
              <h4 className="text-base font-semibold text-white font-display">Stay & Check-In History Log</h4>
              <p className="text-[11px] text-white/40 mt-0.5">Live tracking records of active occupancies combined with historical checkouts.</p>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center w-full sm:w-auto">
              {/* Realtime Search bar */}
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input 
                  type="text"
                  placeholder="Guest / room number..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs focus:outline-none focus:border-indigo-500 w-full sm:w-60"
                />
              </div>

              {/* Status Toggle filter */}
              <div className="relative">
                <button 
                  onClick={() => setShowHistoryFiltersMenu(!showHistoryFiltersMenu)}
                  className="p-2.5 bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 rounded-xl transition-all flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                  title="Filter Stays"
                >
                  <ListFilter className="h-4 w-4 text-white/50" />
                  <span>Stays: {activeHistoryFilter}</span>
                </button>

                {showHistoryFiltersMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-40 bg-[#12121e]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-xl z-50 py-1.5"
                    onMouseLeave={() => setShowHistoryFiltersMenu(false)}
                  >
                    {(['All', 'Active', 'Completed'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => {
                          setActiveHistoryFilter(filter);
                          setShowHistoryFiltersMenu(false);
                          setCurrentPage(1);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:bg-white/10 hover:text-white font-medium cursor-pointer transition-colors"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto overflow-y-visible min-h-[260px]">
            <table className="w-full text-left border-collapse" id="history-table">
              <thead>
                <tr className="bg-white/5 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/5">
                  <th className="px-6 py-4">Guest Profile</th>
                  <th className="px-6 py-4">Allocated Room</th>
                  <th className="px-6 py-4">Check-In</th>
                  <th className="px-6 py-4">Check-Out</th>
                  <th className="px-6 py-4">Stay Length</th>
                  <th className="px-6 py-4">Billing Charge</th>
                  <th className="px-6 py-4">State Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedHistory.map((item) => (
                  <tr 
                    key={item.id}
                    className="hover:bg-white/5 transition-all duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border font-display ${
                          item.type === 'Active' 
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 shadow-sm shadow-emerald-500/5' 
                            : 'bg-indigo-500/10 border-indigo-500/15 text-indigo-300'
                        }`}>
                          {getInitials(item.guestName)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white/95">{item.guestName}</p>
                          <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">{item.type} stay</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-white/5 font-mono text-xs font-bold text-white bg-indigo-500/15 border border-indigo-500/20 px-2 py-1 flex items-center">
                          {item.roomNumber}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-white/80">{item.roomType}</p>
                          <span className={`text-[9px] font-bold uppercase rounded ${
                            item.isAC ? 'text-cyan-400' : 'text-amber-500'
                          }`}>
                            {item.isAC ? 'AC Room' : 'Non-AC'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-white/60">
                      {item.checkIn}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-white/60">
                      {item.checkOut}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-white/80">
                        <Clock className="h-3.5 w-3.5 text-white/30" />
                        <span className="font-semibold">{item.totalNights}</span>
                        <span className="text-white/40">{item.totalNights === 1 ? 'Night' : 'Nights'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-white font-mono">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      {item.type === 'Active' ? (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-lg font-bold border border-emerald-500/25 flex items-center gap-1.5 w-fit animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Checked In</span>
                        </span>
                      ) : (
                        getStatusBadge(item.invoiceStatus!)
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-xs relative">
                      <div className="flex items-center justify-end gap-2.5">
                        {item.type === 'Active' ? (
                          <button
                            type="button"
                            onClick={() => onCreateInvoice({
                              roomId: item.roomNumber,
                              guestName: item.guestName,
                              checkInDate: item.checkIn,
                              checkOutDate: item.checkOut !== 'In Progress' ? item.checkOut : undefined,
                              extraBedsCount: rooms.find(r => r.id === item.roomNumber)?.extraBedsCount || 0
                            })}
                            className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 text-xs font-bold rounded-lg border border-indigo-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Create invoice from this booking"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Create Invoice</span>
                          </button>
                        ) : (() => {
                          const matchInvoice = invoices.find(inv => inv.id === item.invoiceId);
                          return (
                            <>
                              <button 
                                onClick={() => setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id)}
                                className="p-1.5 hover:bg-white/10 border border-transparent hover:border-white/5 rounded-lg transition-all text-white/40 hover:text-white cursor-pointer"
                              >
                                <MoreVertical className="h-4.5 w-4.5" />
                              </button>

                              {/* Popover Action Menu */}
                              {activeActionMenuId === item.id && matchInvoice && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setActiveActionMenuId(null)}
                                  />
                                  <div 
                                    className="absolute right-6 mt-1 w-48 bg-[#12121e]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-xl z-20 py-1 text-left"
                                    onMouseLeave={() => setActiveActionMenuId(null)}
                                  >
                                    <button
                                      onClick={() => {
                                        onViewInvoice(matchInvoice);
                                        setActiveActionMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-xs text-white/75 hover:bg-white/10 hover:text-white flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                    >
                                      <Eye className="h-4 w-4 text-white/40" />
                                      <span>View / Print Invoice</span>
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        onUpdateInvoiceStatus(matchInvoice.id, matchInvoice.status === 'Paid' ? 'Unpaid' : 'Paid');
                                        setActiveActionMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-xs text-white/75 hover:bg-white/10 hover:text-white flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                    >
                                      <CreditCard className="h-4 w-4 text-white/40" />
                                      <span>Mark as {matchInvoice.status === 'Paid' ? 'Unpaid' : 'Paid'}</span>
                                    </button>

                                    <div className="border-t border-white/10 my-1"></div>

                                    <button
                                      onClick={() => {
                                        onDeleteInvoice(matchInvoice.id);
                                        setActiveActionMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                    >
                                      <Trash className="h-4 w-4 text-rose-400/80" />
                                      <span>Delete Record</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}

                {paginatedHistory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-white/30 text-xs">
                      No stayed booking history matching search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5 backdrop-blur-md">
            <span className="text-xs text-white/40 font-semibold">
              Showing {totalHistory > 0 ? historyStartIndex + 1 : 0} to {Math.min(historyStartIndex + itemsPerPage, totalHistory)} of {totalHistory} logs
            </span>
            
            <div className="flex gap-1.5 items-center">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white text-white/60 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 bg-white/5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent'
                      : 'text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button 
                disabled={currentPage === historyTotalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-2 bg-[#12121e] border border-white/10 rounded-xl hover:bg-white/10 hover:text-white text-white/60 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
  );
}
