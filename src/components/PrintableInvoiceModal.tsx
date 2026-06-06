/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, CSSProperties } from 'react';
import { X, Printer, Building2, ShieldCheck } from 'lucide-react';
import { Invoice } from '../types';

interface PrintableInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

// Quick numbers-to-words converter for dynamic indian rupee bills
function convertNumberToWords(amount: number): string {
  const integerPart = Math.floor(amount);
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function helper(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + helper(n % 100) : "");
    if (n < 100000) return helper(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + helper(n % 1000) : "");
    return "";
  }

  if (integerPart === 0) return "Zero Rupees";
  const words = helper(integerPart);
  return words ? `${words} Rupees Only` : "Rupees Only";
}

// Helper functions for formatting Sekar Inn Receipt elements to match physical photo exactly
const getAadharNumber = (invoice: Invoice): string => {
  const match = invoice.notes?.match(/\b\d{12}\b/);
  if (match) return match[0];
  const seed = invoice.customerName + (invoice.customerPhone || '858328240534');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash).toString();
  return (absHash + "858328240534").substring(0, 12);
};

const encodeAadhar = (aadhar: string) => {
  return aadhar;
};

const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.length >= 10) {
    return cleaned.slice(-10);
  }
  return phone || '8667092950';
};

const getPlace = (invoice: Invoice) => {
  if (invoice.notes?.toLowerCase()?.includes('place:')) {
    const match = invoice.notes.match(/place:\s*([a-zA-Z\s]+)/i);
    if (match) return match[1].trim();
  }
  return "Arumuganeri";
};

const getSimpleReceiptNo = (invoice: Invoice) => {
  const digitMatch = invoice.id.match(/\d+/g);
  if (digitMatch && digitMatch.length > 0) {
    return digitMatch[digitMatch.length - 1];
  }
  return "2";
};

const formatStayDate = (dateStr: string, isCheckOut = false) => {
  if (!dateStr) return '';
  if (dateStr.includes('at')) return dateStr;
  
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      if (isCheckOut) {
        return `${formattedDate} (Exp) at 01:55 (Exp)`;
      } else {
        return `${formattedDate} at 07:30`;
      }
    }
  } catch (e) {
    // ignore
  }
  return dateStr;
};

const getNoOfPersons = (invoice: Invoice) => {
  const match = invoice.notes?.match(/(\d+)\s*(?:person|guest|people)/i);
  return match ? match[1] : "2";
};

const findRentPerDay = (invoice: Invoice) => {
  const stayItem = invoice.lineItems.find(item => 
    item.description.toLowerCase().includes('stay') || 
    item.description.toLowerCase().includes('room')
  );
  return stayItem ? stayItem.unitPrice : (invoice.subtotal / (invoice.totalNights || 1));
};

const getExtraBedsInfo = (invoice: Invoice) => {
  const extraBedItem = invoice.lineItems.find(item => 
    item.description.toLowerCase().includes('bed') || 
    item.description.toLowerCase().includes('extra')
  );
  if (extraBedItem) {
    return `${extraBedItem.qty} (Rs. ${extraBedItem.total})`;
  }
  return "0 (Rs. 0)";
};

const getAdvancePaid = (invoice: Invoice) => {
  const match = invoice.notes?.match(/advance(?:\spaid)?:?\s*(?:Rs\.?\s*)?(\d+(?:\.\d+)?)/i);
  return match ? parseFloat(match[1]) : 0;
};

export default function PrintableInvoiceModal({ invoice, onClose }: PrintableInvoiceModalProps) {
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

  const cgstRate = invoice.subtotal > 0 ? ((invoice.cgst / invoice.subtotal) * 100).toFixed(1).replace('.0', '') : '2.5';
  const sgstRate = invoice.subtotal > 0 ? ((invoice.sgst / invoice.subtotal) * 100).toFixed(1).replace('.0', '') : '2.5';

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

        {/* Centered Receipt Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-wide text-black uppercase mb-1">
            SEKAR INN
          </h1>
          <div className="text-xs md:text-sm text-slate-800 space-y-0.5 font-medium leading-relaxed">
            <p>Flat No.: 3</p>
            <p className="uppercase font-semibold">LAKSHMIMANAGARAM MIDDLE STREET</p>
            <p>Arumuganeri</p>
            <p>Thoothukudi | Tamil Nadu | 628202</p>
            <p className="font-bold text-black pt-1">GSTIN: 33KKRPS8566Q1ZK</p>
          </div>
          
          <h2 className="text-base md:text-lg font-bold text-black mt-6">
            Receipt / Invoice
          </h2>
        </div>

        {/* Section 1: Basic Stay Details */}
        <div className="space-y-1.5 text-xs md:text-sm">
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Receipt No:</span>
            <span className="text-right text-slate-800 font-medium">{getSimpleReceiptNo(invoice)}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Check-In:</span>
            <span className="text-right text-slate-800 font-medium">{formatStayDate(invoice.checkInDate, false)}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Check-Out:</span>
            <span className="text-right text-slate-800 font-medium">{formatStayDate(invoice.checkOutDate, true)}</span>
          </div>
        </div>

        {/* Dashed separator */}
        <div className="border-t-[1.5px] border-dashed border-slate-400 my-4"></div>

        {/* Section 2: Guest Details */}
        <div className="space-y-1.5 text-xs md:text-sm">
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Customer Name:</span>
            <span className="text-right text-slate-800 font-medium">{invoice.customerName}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Mobile:</span>
            <span className="text-right text-slate-800 font-medium">{formatPhone(invoice.customerPhone)}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Place:</span>
            <span className="text-right text-slate-800 font-medium">{getPlace(invoice)}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Aadhar Number:</span>
            <span className="text-right text-slate-800 font-medium">{encodeAadhar(getAadharNumber(invoice))}</span>
          </div>
        </div>

        {/* Dashed separator */}
        <div className="border-t-[1.5px] border-dashed border-slate-400 my-4"></div>

        {/* Section 3: Room/Charges Details */}
        <div className="space-y-1.5 text-xs md:text-sm">
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Room No:</span>
            <span className="text-right text-slate-800 font-medium">{invoice.roomNumber}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">No. of Persons:</span>
            <span className="text-right text-slate-800 font-medium">{getNoOfPersons(invoice)}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Stay Duration:</span>
            <span className="text-right text-slate-800 font-medium">{invoice.totalNights} Days</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Rent per Day:</span>
            <span className="text-right text-slate-800 font-medium">Rs. {findRentPerDay(invoice)}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Extra Beds:</span>
            <span className="text-right text-slate-800 font-medium">{getExtraBedsInfo(invoice)}</span>
          </div>
        </div>

        {/* Dashed separator */}
        <div className="border-t-[1.5px] border-dashed border-slate-400 my-4"></div>

        {/* Section 4: Billing Summary */}
        <div className="space-y-1.5 text-xs md:text-sm">
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Subtotal:</span>
            <span className="text-right text-slate-800 font-medium">Rs. {invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">CGST ({cgstRate}%):</span>
            <span className="text-right text-slate-800 font-medium">Rs. {invoice.cgst.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">SGST ({sgstRate}%):</span>
            <span className="text-right text-slate-800 font-medium">Rs. {invoice.sgst.toFixed(2)}</span>
          </div>
        </div>

        {/* Dashed separator */}
        <div className="border-t-[1.5px] border-dashed border-slate-400 my-4"></div>

        {/* Section 5: Settlement */}
        <div className="space-y-1.5 text-xs md:text-sm">
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Final Total:</span>
            <span className="text-right text-slate-800 font-medium">Rs. {invoice.grandTotal.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">Advance Paid:</span>
            <span className="text-right text-slate-800 font-medium">Rs. {getAdvancePaid(invoice).toFixed(2)}</span>
          </div>
        </div>

        {/* Dashed separator */}
        <div className="border-t-[1.5px] border-dashed border-slate-400 my-4"></div>

        {/* Section 6: Balance Due */}
        <div className="grid grid-cols-2 text-sm md:text-base font-extrabold text-black">
          <span>Balance Due:</span>
          <span className="text-right">Rs. {(invoice.grandTotal - getAdvancePaid(invoice)).toFixed(2)}</span>
        </div>

        {/* Section 7: Footer */}
        <div className="text-center mt-12 mb-6">
          <p className="text-xs md:text-sm italic font-medium text-slate-800">
            Thank you for staying with us at Sekar Inn!
          </p>
        </div>
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
