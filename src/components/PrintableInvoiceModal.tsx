/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, CSSProperties } from 'react';
import { X, Printer } from 'lucide-react';
import { Invoice, SystemSettings } from '../types';
import PrintableInvoiceContent from './PrintableInvoiceContent';

interface PrintableInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  settings: SystemSettings;
}

const A4_W = 794;   // px at 96dpi
const A4_H = 1123;  // px at 96dpi
const PADDING = 28; // white padding inside sheet

export default function PrintableInvoiceModal({ invoice, onClose, settings }: PrintableInvoiceModalProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth  - 48;  // 24px each side
      const vh = window.innerHeight - 80;  // 40px top/bottom
      const s  = Math.min(1, vw / A4_W, vh / A4_H);
      setScale(parseFloat(s.toFixed(4)));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  if (!invoice) return null;

  // The sheet renders at A4_W × A4_H in DOM space.
  // After scale(), the visual footprint is A4_W*s × A4_H*s.
  // We wrap it in a div of exactly those visual dimensions so the
  // modal container needs no scroll and there is no blank overflow.
  const visW = Math.round(A4_W * scale);
  const visH = Math.round(A4_H * scale);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center"
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

      {/* Clip wrapper — exact visual size so nothing overflows */}
      <div
        className="print-wrapper overflow-hidden rounded-sm"
        style={{ width: visW, height: visH, flexShrink: 0 }}
      >
        {/* A4 sheet scaled to fill the clip wrapper */}
        <div
          className="bg-white text-slate-950 font-sans"
          id="printable-sheet-a4"
          style={{
            '--invoice-scale': scale,
            width:  A4_W,
            height: A4_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            padding: PADDING,
            boxSizing: 'border-box',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          } as CSSProperties}
        >
          <PrintableInvoiceContent invoice={invoice} settings={settings} />
        </div>
      </div>

      {/* Print button */}
      <div className="no-print fixed bottom-8 right-8 z-[110]">
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
