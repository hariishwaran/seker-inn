/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CSSProperties } from 'react';
import { X, Printer } from 'lucide-react';
import { Invoice, SystemSettings } from '../types';
import PrintableInvoiceContent from './PrintableInvoiceContent';

interface PrintableInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  settings: SystemSettings;
}

export default function PrintableInvoiceModal({ invoice, onClose, settings }: PrintableInvoiceModalProps) {
  if (!invoice) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-start overflow-y-auto"
      id="printable-invoice-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="no-print fixed top-4 right-4 z-[110] text-white/70 hover:text-white transition-all p-2 cursor-pointer bg-white/10 hover:bg-white/20 border border-white/20 rounded-full h-10 w-10 flex items-center justify-center shadow-lg backdrop-blur-md"
        title="Close"
        id="btn-close-printable-invoice"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Scroll container */}
      <div className="print-wrapper flex justify-center py-10 px-4 min-h-full">
        {/* A4 sheet with white padding — natural height, no transform clipping */}
        <div
          className="relative bg-white text-slate-950 font-sans rounded-sm self-start"
          id="printable-sheet-a4"
          style={{
            '--invoice-scale': 1,
            width: '794px',
            maxWidth: '100%',
            padding: '28px',
            boxSizing: 'border-box',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          } as CSSProperties}
        >
          <PrintableInvoiceContent invoice={invoice} settings={settings} />
        </div>
      </div>

      {/* Floating action button */}
      <div className="no-print fixed bottom-8 right-8 z-[110] flex flex-col items-end gap-3">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-indigo-400/30 text-sm font-semibold"
          title="Print / Save as PDF"
          id="btn-print-floating"
        >
          <Printer className="h-4 w-4" />
          Print Invoice
        </button>
      </div>
    </div>
  );
}
