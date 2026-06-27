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

  const handleSystemPrint = () => {
    // Opens the native OS system print dialog (bypasses Chrome's Save as PDF default)
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { window.print(); return; }
    const contentEl = document.getElementById('printable-sheet-a4');
    if (!contentEl) { w.close(); window.print(); return; }
    // Collect all <style> and <link rel="stylesheet"> from current page
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice</title>${styles}<style>body{margin:0;padding:12mm 10mm;background:#fff;font-family:Arial,sans-serif;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}@page{size:A4 portrait;margin:10mm 12mm;}</style></head><body>${contentEl.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 600);
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
        className="transition-all duration-300 print-wrapper"
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

      {/* Floating Action Buttons */}
      <div className="no-print fixed bottom-10 right-10 z-[99] flex flex-col items-end gap-3">
        {/* System Print Dialog — sends straight to printer */}
        <button
          onClick={handleSystemPrint}
          className="flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/10 text-sm font-semibold"
          title="Print directly to your printer"
          id="btn-system-print"
        >
          <Printer className="h-4 w-4" />
          Print to Printer
        </button>

        {/* Browser Print / Save as PDF */}
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
