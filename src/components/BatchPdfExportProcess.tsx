/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FileDown, Loader2 } from 'lucide-react';
import { Invoice, SystemSettings } from '../types';
import PrintableInvoiceContent from './PrintableInvoiceContent';

interface BatchPdfExportProcessProps {
  invoices: Invoice[];
  settings: SystemSettings;
  onComplete: () => void;
}

export default function BatchPdfExportProcess({ invoices, settings, onComplete }: BatchPdfExportProcessProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zip] = useState(() => new JSZip());
  const processingRef = useRef(-1);

  useEffect(() => {
    const captureCurrentInvoice = async () => {
      if (currentIndex >= invoices.length) {
        if (processingRef.current !== currentIndex) {
          processingRef.current = currentIndex;
          // All done, generate zip
          const content = await zip.generateAsync({ type: 'blob' });
          saveAs(content, `Invoices_Export_${new Date().toISOString().split('T')[0]}.zip`);
          onComplete();
        }
        return;
      }

      const element = document.getElementById('hidden-batch-invoice-container');
      if (element) {
        try {
          // Add a small delay to ensure React has fully rendered the DOM updates
          await new Promise(resolve => setTimeout(resolve, 300));

          // Use html-to-image which renders using SVG foreignObject (100% pixel perfect native browser rendering)
          const imgData = await toJpeg(element, { 
            quality: 1.0,
            backgroundColor: '#ffffff',
            pixelRatio: 2 // Equivalent to scale: 2 for high resolution
          });
          
          const imgProps = new Image();
          imgProps.src = imgData;
          await new Promise((resolve) => { imgProps.onload = resolve; });
          
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          
          // Get current invoice
          const currentInvoice = invoices[currentIndex];
          const safeName = (currentInvoice.customerName || 'Guest').replace(/[^a-zA-Z0-9]/g, '_');
          const safeId = (currentInvoice.id || 'INV').replace(/^#?/, 'INV-');
          const fileName = `${safeId}_${safeName}.pdf`;
          
          // Add to zip. output('blob') is recommended for JSZip compatibility
          zip.file(fileName, pdf.output('blob'));

          // Move to next
          setCurrentIndex(prev => prev + 1);
        } catch (err: any) {
          console.error("Error capturing invoice PDF", err);
          zip.file(`ERROR_Invoice_${currentIndex + 1}.txt`, `Failed to generate PDF for invoice index ${currentIndex}.\nError: ${err?.message || err}`);
          // Proceed to next even if one fails
          setCurrentIndex(prev => prev + 1);
        }
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    };

    captureCurrentInvoice();
  }, [currentIndex, invoices, zip, onComplete]);

  if (currentIndex >= invoices.length) {
    return null;
  }

  const currentInvoice = invoices[currentIndex];

  return (
    <>
      {/* Loading Overlay */}
      <div className="fixed inset-0 z-[100] bg-[#020205]/90 backdrop-blur-md flex flex-col justify-center items-center">
        <div className="bg-white/10 p-8 rounded-3xl border border-white/20 flex flex-col items-center max-w-sm w-full shadow-2xl">
          <FileDown className="h-12 w-12 text-indigo-400 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-white mb-2 text-center font-display">Generating PDFs</h3>
          <p className="text-white/60 text-sm text-center mb-6">
            Processing invoice {currentIndex + 1} of {invoices.length}
          </p>
          <div className="w-full bg-black/50 rounded-full h-3 overflow-hidden border border-white/10">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, ((currentIndex) / invoices.length) * 100)}%` }}
            />
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-white/50 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Please wait, do not close this window...</span>
          </div>
        </div>
      </div>

      {/* Hidden Render Container */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '800px',
          zIndex: -1, // Underneath everything so it doesn't block clicks
          pointerEvents: 'none'
        }}
      >
        <style>{`
          #hidden-batch-invoice-container, #hidden-batch-invoice-container * {
            color: #000000 !important;
            border-color: #000000 !important;
            background-color: transparent !important;
          }
          #hidden-batch-invoice-container .bg-\\[\\#c2d69b\\] {
            background-color: #c2d69b !important;
          }
          #hidden-batch-invoice-container .bg-white {
            background-color: #ffffff !important;
          }
          #hidden-batch-invoice-container .text-gray-600 {
            color: #4b5563 !important;
          }
        `}</style>
        <div 
          id="hidden-batch-invoice-container"
          className="w-[800px] p-14 font-sans"
          style={{ backgroundColor: '#ffffff' }}
        >
          <PrintableInvoiceContent invoice={currentInvoice} settings={settings} />
        </div>
      </div>
    </>
  );
}
