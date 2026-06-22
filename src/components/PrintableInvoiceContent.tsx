/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Invoice, SystemSettings } from '../types';

interface PrintableInvoiceContentProps {
  invoice: Invoice;
  settings: SystemSettings;
}

// Quick numbers-to-words converter for Indian rupee bills (lakhs/crores)
export function convertNumberToWords(amount: number): string {
  const integerPart = Math.floor(amount);
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function helper(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + helper(n % 100) : "");
    if (n < 100000) return helper(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + helper(n % 1000) : "");
    if (n < 10000000) return helper(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + helper(n % 100000) : "");
    return helper(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + helper(n % 10000000) : "");
  }

  if (integerPart === 0) return "Zero Rupees";
  const words = helper(integerPart);
  return words ? `${words} Rupees Only` : "Rupees Only";
}

// Mask Aadhar - show only last 4 digits if present
export const getMaskedAadhar = (invoice: Invoice): string => {
  const match = invoice.notes?.match(/\b\d{12}\b/);
  if (match) {
    const aadhar = match[0];
    return `XXXX XXXX ${aadhar.slice(-4)}`;
  }
  return '-';
};

export const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.length >= 10) {
    return cleaned.slice(-10);
  }
  return phone || '8667092950';
};

export const getPlace = (invoice: Invoice) => {
  if (invoice.notes?.toLowerCase()?.includes('place:')) {
    const match = invoice.notes.match(/place:\s*([a-zA-Z\s]+)/i);
    if (match) return match[1].trim();
  }
  return "Arumuganeri";
};

export const getSimpleReceiptNo = (invoice: Invoice) => {
  const digitMatch = invoice.id.match(/\d+/g);
  if (digitMatch && digitMatch.length > 0) {
    return digitMatch[digitMatch.length - 1];
  }
  return "2";
};

export const formatStayDate = (dateStr: string, isCheckOut = false, settings?: SystemSettings) => {
  if (!dateStr) return '';
  if (dateStr.includes('at')) return dateStr;
  
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${day}/${month}/${year}`;
      
      if (isCheckOut) {
        return `${formattedDate} at ${settings?.defaultcheckouttime || '11:00'}`;
      } else {
        return `${formattedDate} at ${settings?.defaultcheckintime || '12:00'}`;
      }
    }
  } catch (e) {
    // ignore
  }
  return dateStr;
};

export const getNoOfPersons = (invoice: Invoice) => {
  if (invoice.numberOfPeople) {
    return invoice.numberOfPeople.toString();
  }
  const match = invoice.notes?.match(/(\d+)\s*(?:person|guest|people)/i);
  return match ? match[1] : "2";
};

export const findRentPerDay = (invoice: Invoice) => {
  const stayItem = invoice.lineItems.find(item => 
    item.description.toLowerCase().includes('stay') || 
    item.description.toLowerCase().includes('room')
  );
  return stayItem ? stayItem.unitPrice : (invoice.subtotal / (invoice.totalNights || 1));
};

export const getExtraBedsInfo = (invoice: Invoice) => {
  const extraBedItem = invoice.lineItems.find(item => 
    item.description.toLowerCase().includes('bed') || 
    item.description.toLowerCase().includes('extra')
  );
  if (extraBedItem) {
    return `${extraBedItem.qty} (Rs. ${extraBedItem.total})`;
  }
  return "0 (Rs. 0)";
};

export const getAdvancePaid = (invoice: Invoice) => {
  const match = invoice.notes?.match(/advance(?:\spaid)?:?\s*(?:Rs\.?\s*)?(\d+(?:\.\d+)?)/i);
  return match ? parseFloat(match[1]) : 0;
};

export default function PrintableInvoiceContent({ invoice, settings }: PrintableInvoiceContentProps) {
  const cgstRate = invoice.subtotal > 0 ? ((invoice.cgst / invoice.subtotal) * 100).toFixed(1).replace('.0', '') : settings.cgstPercentage.toString();
  const sgstRate = invoice.subtotal > 0 ? ((invoice.sgst / invoice.subtotal) * 100).toFixed(1).replace('.0', '') : settings.sgstpercentage.toString();

  return (
    <>
      {/* Centered Receipt Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-wide text-black uppercase mb-1">
          SEKAR INN
        </h1>
        <div className="text-xs md:text-sm text-slate-800 space-y-0.5 font-medium leading-relaxed">
          {settings.address ? (
            settings.address.split(',').map((part, index) => (
              <p key={index} className={index === 1 ? "uppercase font-semibold" : ""}>{part.trim()}</p>
            ))
          ) : (
            <>
              <p>Flat No.: 3</p>
              <p className="uppercase font-semibold">LAKSHMIMANAGARAM MIDDLE STREET</p>
              <p>Arumuganeri</p>
              <p>Thoothukudi | Tamil Nadu | 628202</p>
            </>
          )}
          {settings.phone && <p>Phone: {settings.phone}</p>}
          <p className="font-bold text-black pt-1">GSTIN: {settings.gstin || '33KKRPS8566Q1ZK'}</p>
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
          <span className="text-right text-slate-800 font-medium">{formatStayDate(invoice.checkInDate, false, settings)}</span>
        </div>
        <div className="grid grid-cols-2">
          <span className="font-bold text-black">Check-Out:</span>
          <span className="text-right text-slate-800 font-medium">{formatStayDate(invoice.checkOutDate, true, settings)}</span>
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
          <span className="text-right text-slate-800 font-medium">{getMaskedAadhar(invoice)}</span>
        </div>
        {invoice.customerGst && (
          <div className="grid grid-cols-2">
            <span className="font-bold text-black">GSTIN:</span>
            <span className="text-right text-slate-800 font-medium">{invoice.customerGst}</span>
          </div>
        )}
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
    </>
  );
}
