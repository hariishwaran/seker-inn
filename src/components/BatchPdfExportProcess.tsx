/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { Invoice, SystemSettings } from '../types';
import PrintableInvoiceContent from './PrintableInvoiceContent';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FileDown, Loader2 } from 'lucide-react';

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
    if (invoices.length === 0) {
      onComplete();
      return;
    }

    if (currentIndex >= invoices.length) {
      if (processingRef.current !== currentIndex) {
        processingRef.current = currentIndex;
        // All PDFs generated, trigger zip download
        zip.generateAsync({ type: 'blob' }).then((content) => {
          saveAs(content, `Invoices_Export_${new Date().toISOString().split('T')[0]}.zip`);
          onComplete();
        });
      }
      return;
    }

    if (processingRef.current === currentIndex) return;
    processingRef.current = currentIndex;

    const captureCurrentInvoice = async () => {
      // Small timeout to allow DOM to paint the current invoice
      await new Promise((resolve) => setTimeout(resolve, 300));

      const element = document.getElementById('hidden-batch-invoice-container');
      if (element) {
        try {
          const canvas = await html2canvas(element, { 
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          
          // Get current invoice
          const currentInvoice = invoices[currentIndex];
          const fileName = `${currentInvoice.id.replace(/^#?/, 'INV-')}_${currentInvoice.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          
          // Add to zip. output('arraybuffer') is sometimes safer for JSZip
          zip.file(fileName, pdf.output('arraybuffer'));

          // Move to next
          setCurrentIndex(prev => prev + 1);
        } catch (err) {
          console.error("Error capturing invoice PDF", err);
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
          top: '-9999px',
          left: '-9999px',
          width: '800px',
          zIndex: -1000
        }}
      >
        <div 
          id="hidden-batch-invoice-container"
          className="bg-white text-slate-950 w-[800px] p-14 font-sans"
        >
          <PrintableInvoiceContent invoice={currentInvoice} settings={settings} />
        </div>
      </div>
    </>
  );
}
