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
      // A4 at 96dpi: 794×1123px
      const a4W = 794;
      const a4H = 1123;
      const wScale = window.innerWidth / a4W;
      const hScale = window.innerHeight / a4H;
      setScale(Math.max(0.3, Math.min(wScale, hScale)));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSystemPrint = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { window.print(); return; }
    const contentEl = document.getElementById('printable-sheet-a4');
    if (!contentEl) { w.close(); window.print(); return; }
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice</title>${styles}<style>body{margin:0;padding:12mm 10mm;background:#fff;font-family:Arial,sans-serif;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}@page{size:A4 portrait;margin:10mm 12mm;}</style></head><body>${contentEl.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 600);
  };

  const scaledH = Math.round(1123 * scale);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#020205]/90 backdrop-blur-md flex justify-center items-center overflow-hidden"
      id="printable-invoice-modal-overlay"
    >
      {/* Close button — top-right corner */}
      <button
        onClick={onClose}
        className="no-print absolute top-4 right-4 z-[110] text-white/70 hover:text-white transition-all p-2 cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-full h-10 w-10 flex items-center justify-center shadow-lg"
        title="Close"
        id="btn-close-printable-invoice"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Scroll container so content is reachable on very small screens */}
      <div className="print-wrapper w-full h-full overflow-auto flex justify-center items-start">
        {/* A4 sheet scaled to fill the viewport */}
        <div
          className="relative bg-white text-slate-950 shadow-2xl font-sans"
          id="printable-sheet-a4"
          style={{
            '--invoice-scale': scale,
            width: '794px',
            height: `${scaledH}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            marginBottom: `${scaledH - 1123}px`,
          } as CSSProperties}
        >
          <PrintableInvoiceContent invoice={invoice} settings={settings} />
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="no-print fixed bottom-8 right-8 z-[99] flex flex-col items-end gap-3">
        <button
          onClick={handleSystemPrint}
          className="flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/10 text-sm font-semibold"
          title="Print directly to your printer"
          id="btn-system-print"
        >
          <Printer className="h-4 w-4" />
          Print to Printer
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/10 text-sm font-semibold"
          title="Save as PDF or print via browser dialog"
          id="btn-print-floating"
        >
          <Printer className="h-4 w-4" />
          Save as PDF
        </button>
      </div>
    </div>
  );
}
