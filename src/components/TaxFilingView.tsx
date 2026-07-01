/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Invoice, SystemSettings } from '../types';
import { formatDate } from '../lib/formatDate';
import {
  Eye, Pencil, Search, Check, AlertTriangle, FileText,
  ChevronLeft, ChevronRight, Download, CheckSquare, Square
} from 'lucide-react';
import BatchPdfExportProcess from './BatchPdfExportProcess';

interface TaxFilingViewProps {
  billingInvoices: Invoice[];
  taxInvoices: Invoice[];
  settings: SystemSettings;
  onEditTaxInvoice: (invoice: Invoice) => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export default function TaxFilingView({
  billingInvoices,
  taxInvoices,
  settings,
  onEditTaxInvoice,
  onViewInvoice,
}: TaxFilingViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const itemsPerPage = 10;

  // For every billing invoice, show the real TAX- copy if it exists,
  // otherwise derive one from the billing record so all invoices appear here.
  const taxRows = useMemo(() => {
    return billingInvoices.map((billing) => {
      const real = taxInvoices.find(t => t.id === `TAX-${billing.id}`);
      return real ?? { ...billing, id: `TAX-${billing.id}` };
    });
  }, [billingInvoices, taxInvoices]);

  const filtered = taxRows.filter(inv =>
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    const allIds = paginated.map(i => i.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      const next = new Set(selectedIds);
      allIds.forEach(id => next.delete(id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      allIds.forEach(id => next.add(id));
      setSelectedIds(next);
    }
  };

  const isPageAllSelected = paginated.length > 0 && paginated.every(i => selectedIds.has(i.id));

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'G';

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg font-bold border border-emerald-500/25 flex items-center gap-1.5 w-fit">
            <Check className="h-3 w-3" /><span>Paid</span>
          </span>
        );
      case 'Unpaid':
        return (
          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-lg font-bold border border-rose-500/25 flex items-center gap-1.5 w-fit">
            <AlertTriangle className="h-3 w-3" /><span>Unpaid</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-white/5 text-white/50 text-xs rounded-lg font-bold border border-white/10 flex items-center gap-1.5 w-fit">
            <FileText className="h-3 w-3" /><span>Draft</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="tax-filing-view">

      {isExporting && (
        <BatchPdfExportProcess
          invoices={taxRows.filter(i => selectedIds.has(i.id))}
          settings={settings}
          onComplete={() => { setIsExporting(false); setSelectedIds(new Set()); }}
        />
      )}

      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display">Tax Filing Register</h1>
          <p className="text-sm text-white/50 mt-1">
            Editable tax copies of all invoices — changes here never affect the Billing Ledger.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setIsExporting(true)}
            disabled={selectedIds.size === 0}
            className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            title="Export selected as PDF ZIP"
          >
            <Download className="h-4 w-4" />
            Export {selectedIds.size > 0 ? selectedIds.size : ''} PDFs
          </button>
          <span className="text-[11px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-2 rounded-xl">
            {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      </section>

      {/* Table card */}
      <section className="glass-panel rounded-2xl shadow-lg border border-white/10 overflow-hidden">

        {/* Search bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3 bg-white/5 backdrop-blur-md">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Search guest, room, invoice #..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs focus:outline-none focus:border-violet-500 w-full"
            />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/5">
                <th className="px-4 py-3 whitespace-nowrap">
                  <button onClick={toggleSelectAll} className="p-1 hover:text-white transition-colors cursor-pointer">
                    {isPageAllSelected ? <CheckSquare className="h-4 w-4 text-indigo-400" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-5 py-3 whitespace-nowrap">Invoice #</th>
                <th className="px-5 py-3 whitespace-nowrap">Guest</th>
                <th className="px-5 py-3 whitespace-nowrap">Room</th>
                <th className="px-5 py-3 whitespace-nowrap">Check-In</th>
                <th className="px-5 py-3 whitespace-nowrap">Check-Out</th>
                <th className="px-5 py-3 whitespace-nowrap">Nights</th>
                <th className="px-5 py-3 whitespace-nowrap">Total</th>
                <th className="px-5 py-3 whitespace-nowrap">Status</th>
                <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-white/30 text-xs">
                    {billingInvoices.length === 0
                      ? 'No invoices yet. Create one from the Billing/Invoices tab.'
                      : 'No records match your search.'}
                  </td>
                </tr>
              )}
              {paginated.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/5 transition-all duration-150 group">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => toggleSelect(inv.id)} className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer">
                      {selectedIds.has(inv.id) ? <CheckSquare className="h-4 w-4 text-indigo-400" /> : <Square className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="font-mono text-[11px] text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-lg">
                      {inv.id}
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-black flex-shrink-0">
                        {getInitials(inv.customerName)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/90">{inv.customerName}</p>
                        {inv.customerPhone && (
                          <p className="text-[10px] text-white/40 font-mono">{inv.customerPhone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 font-mono text-xs font-bold text-white">
                        {inv.roomNumber}
                      </span>
                      <span className="text-xs text-white/50">{inv.roomType}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-white/60 whitespace-nowrap">{formatDate(inv.checkInDate)}</td>
                  <td className="px-5 py-3 text-xs font-mono text-white/60 whitespace-nowrap">{formatDate(inv.checkOutDate)}</td>
                  <td className="px-5 py-3 text-xs text-white/70 whitespace-nowrap">{inv.totalNights} {inv.totalNights === 1 ? 'Night' : 'Nights'}</td>
                  <td className="px-5 py-3 text-xs font-bold text-white font-mono whitespace-nowrap">
                    ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">{getStatusBadge(inv.status)}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="p-1.5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-lg transition-all text-white/40 hover:text-white cursor-pointer"
                        title="View / Print"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEditTaxInvoice(inv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500 text-violet-400 hover:text-white text-xs font-bold rounded-lg border border-violet-500/25 transition-all cursor-pointer"
                        title="Edit tax invoice"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y divide-white/5">
          {paginated.length === 0 && (
            <div className="text-center py-16 text-white/30 text-xs">
              {billingInvoices.length === 0 ? 'No invoices yet.' : 'No records match your search.'}
            </div>
          )}
          {paginated.map((inv) => (
            <div key={inv.id} className="p-4 space-y-3 hover:bg-white/5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-lg truncate">
                  {inv.id}
                </span>
                {getStatusBadge(inv.status)}
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-black flex-shrink-0">
                  {getInitials(inv.customerName)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">{inv.customerName}</p>
                  <p className="text-[10px] text-white/40 font-mono">{inv.roomNumber} · {formatDate(inv.checkInDate)} → {formatDate(inv.checkOutDate)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white font-mono">
                  ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => onViewInvoice(inv)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white cursor-pointer">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEditTaxInvoice(inv)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500 text-violet-400 hover:text-white text-xs font-bold rounded-lg border border-violet-500/25 transition-all cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {filtered.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-white/5">
            <span className="text-xs text-white/40 font-semibold">
              {startIdx + 1}–{Math.min(startIdx + itemsPerPage, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1.5 items-center">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white/60 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    currentPage === p
                      ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white border-transparent'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white/60 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
