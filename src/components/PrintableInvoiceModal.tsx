/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, CSSProperties } from 'react';
import { X, Printer, FileDown } from 'lucide-react';
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

  /**
   * Opens a clean new window with just the invoice content and the
   * browser's native print dialog.  Works for both "Print to Printer"
   * and "Save as PDF" (the user picks in the dialog).
   *
   * Key details:
   *  - Collects <style> tags (Vite dev injects these) AND <link> tags
   *    with their ABSOLUTE href (link.href is always absolute in the DOM).
   *  - Adds @page A4 + print-color-adjust: exact so colours render.
   *  - An inline <script> fires window.print() after 'load' so CSS is
   *    definitely applied before the dialog opens.
   */
  const printInvoice = (autoClose = true) => {
    const contentEl = document.getElementById('printable-sheet-a4');
    if (!contentEl) return;

    const popup = window.open('', '_blank', 'width=900,height=750');
    if (!popup) {
      // Fallback: browser blocked the popup — use main-page print
      window.print();
      return;
    }

    // Collect all stylesheets. For <link> elements use .href which is
    // always the absolute URL regardless of how it was written in HTML.
    const styleTags = Array.from(
      document.querySelectorAll<HTMLElement>('style, link[rel="stylesheet"]')
    ).map(el => {
      if (el.tagName === 'LINK') {
        return `<link rel="stylesheet" href="${(el as HTMLLinkElement).href}">`;
      }
      return el.outerHTML;
    }).join('\n');

    popup.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice – ${invoice.id}</title>
  ${styleTags}
  <style>
    /* ── Page layout ── */
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }

    /* ── Force colour rendering in print ── */
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
    }

    /* ── Clean slate ── */
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: Arial, sans-serif;
    }

    /* ── Invoice root ── */
    #invoice-print-root {
      width: 100%;
    }

    /* ── Table rows never split across pages ── */
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <div id="invoice-print-root">${contentEl.innerHTML}</div>
  <script>
    // Wait for all linked CSS to finish loading before opening dialog
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.print();
        ${autoClose ? 'setTimeout(function(){ window.close(); }, 500);' : ''}
      }, 350);
    });
  </script>
</body>
</html>`);

    popup.document.close();
    popup.focus();
  };

  const scaledH = Math.round(1123 * scale);

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
        {/* A4 sheet with white padding */}
        <div
          className="relative bg-white text-slate-950 font-sans rounded-sm"
          id="printable-sheet-a4"
          style={{
            '--invoice-scale': scale,
            width: '794px',
            height: `${scaledH}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            marginBottom: `${scaledH - 1123}px`,
            padding: '28px',
            boxSizing: 'border-box',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          } as CSSProperties}
        >
          <PrintableInvoiceContent invoice={invoice} settings={settings} />
        </div>
      </div>

      {/* Floating action buttons */}
      <div className="no-print fixed bottom-8 right-8 z-[110] flex flex-col items-end gap-3">
        {/* Save as PDF */}
        <button
          onClick={() => printInvoice(true)}
          className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-indigo-400/30 text-sm font-semibold"
          title="Save invoice as PDF"
          id="btn-print-floating"
        >
          <FileDown className="h-4 w-4" />
          Save as PDF
        </button>
      </div>
    </div>
  );
}
