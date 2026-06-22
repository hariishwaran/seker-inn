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

export default function PrintableInvoiceModal({ invoice, onClose, settings }: PrintableInvoiceModalProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const targetWidth = 840;
      const targetHeight = 1160;
      const wScale = (window.innerWidth - 48) / targetWidth;
      const hScale = (window.innerHeight - 80) / targetHeight;
      const computedScale = Math.min(wScale, hScale);
      setScale(Math.max(0.4, Math.min(1, computedScale)));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#020205]/80 backdrop-blur-md flex justify-center items-start overflow-y-auto py-10 px-4"
      id="printable-invoice-modal-overlay"
    >
      {/* A4 Container Wrapper */}
      <div 
        style={{
          width: '100%',
          maxWidth: '800px',
          height: `${1100 * scale}px`,
          position: 'relative',
          display: 'flex',
          justifyContent: 'center'
        }}
        className="flex justify-center transition-all duration-300 print-wrapper"
      >
        <div 
          className="relative bg-white text-slate-950 shadow-2xl rounded-sm w-full p-8 md:p-14 border border-slate-200 print-area animate-[fadeIn_0.3s_ease-out] font-sans"
          id="printable-sheet-a4"
          style={{
            '--invoice-scale': scale,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            position: 'absolute',
            top: 0
          } as CSSProperties}
        >
          {/* Close Button on dialog */}
          <button 
            onClick={onClose}
            className="no-print absolute -right-12 top-0 text-white hover:text-white/80 transition-all p-2 cursor-pointer bg-white/5 border border-white/10 rounded-full backdrop-blur-xl h-10 w-10 flex items-center justify-center shadow-lg"
            title="Close Dialog"
            id="btn-close-printable-invoice"
          >
            <X className="h-5 w-5" />
          </button>

          <PrintableInvoiceContent invoice={invoice} settings={settings} />

        </div>
      </div>

      {/* Floating Action Button: Print */}
      <button 
        onClick={handlePrint}
        className="no-print fixed bottom-12 right-12 z-[99] bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-95 h-16 w-16 rounded-full shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group cursor-pointer border border-white/10"
        title="Print / PDF Invoice"
        id="btn-print-floating"
      >
        <Printer className="h-6 w-6 text-white" />
        <span className="absolute right-20 bg-slate-950/90 border border-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md">
          Print / PDF Preview
        </span>
      </button>
    </div>
  );
}
