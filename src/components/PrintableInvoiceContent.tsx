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
  return words ? `Rs. ${words} Only` : "Rs. Only";
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

export const getPlace = (invoice: Invoice) => {
  if (invoice.notes?.toLowerCase()?.includes('place:')) {
    const match = invoice.notes.match(/place:\s*([a-zA-Z\s]+)/i);
    if (match) return match[1].trim();
  }
  return "";
};

export const getSimpleReceiptNo = (invoice: Invoice) => {
  // Strip TAX- prefix for tax copies, then SI- prefix
  const base = invoice.id.replace(/^TAX-/, '').replace(/^SI-/, '');
  // New sequential format: SI-1, SI-2 … → base is "1", "2" …
  if (/^\d+$/.test(base)) return base;
  // Legacy format: SI-2026-5942 → last digit group
  const digitMatch = invoice.id.match(/\d+/g);
  if (digitMatch && digitMatch.length > 0) return digitMatch[digitMatch.length - 1];
  return invoice.id;
};

export const formatStayDateOnly = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('at')) return dateStr.split(' at')[0];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // ignore
  }
  return dateStr;
};

export const formatStayTime = (dateStr: string, isCheckOut = false, settings?: SystemSettings) => {
  if (!dateStr) return '';
  if (dateStr.includes('at')) return dateStr.split(' at')[1].trim();
  
  return isCheckOut ? (settings?.defaultcheckouttime || '11:00') : (settings?.defaultcheckintime || '12:00');
};

export const findRentPerDay = (invoice: Invoice) => {
  if (!invoice.lineItems) return (invoice.subtotal / (invoice.totalNights || 1));
  const stayItem = invoice.lineItems.find(item => 
    item.description?.toLowerCase().includes('stay') || 
    item.description?.toLowerCase().includes('room')
  );
  return stayItem ? stayItem.unitPrice : (invoice.subtotal / (invoice.totalNights || 1));
};

export default function PrintableInvoiceContent({ invoice, settings }: PrintableInvoiceContentProps) {
  const cgstRate = invoice.subtotal > 0 ? parseFloat(((invoice.cgst / invoice.subtotal) * 100).toFixed(1)) : settings.cgstPercentage;
  const sgstRate = invoice.subtotal > 0 ? parseFloat(((invoice.sgst / invoice.subtotal) * 100).toFixed(1)) : settings.sgstpercentage;
  const totalTaxRate = (cgstRate + sgstRate).toFixed(2);

  const emptyRows = Array.from({ length: 4 });

  return (
    <div className="border border-black text-xs w-full bg-white text-black" style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.4' }}>
      {/* Header Row */}
      <div className="flex justify-between bg-[#c2d69b] border-b border-black p-2 font-bold">
        <span>Page No. 1 of 1</span>
        <span className="text-sm font-extrabold uppercase mt-0.5">Hotel Bill</span>
        <span>Original Copy</span>
      </div>

      {/* Hotel Info & Invoice Details */}
      <div className="flex border-b border-black">
        <div className="w-[60%] border-r border-black p-2 space-y-2">
           <h2 className="text-lg font-bold">Hotel Name: SEKAR INN</h2>
           <div className="flex gap-2">
             <span className="font-bold">Address - </span>
             <span>{settings.address || "Lakshmimanagaram Middle Street, Arumuganeri, Thoothukudi | Tamil Nadu | 628202"}</span>
           </div>
           <div><b>Phone No:</b> {settings.phone || "+91 8667092950"} | <b>Email:</b> sekarinn@example.com</div>
           <div><b>GSTIN -</b> {settings.gstin || '33KKRPS8566Q1ZK'} | <b>PAN -</b> XXXXXXXXXXXXX</div>
        </div>
        <div className="w-[40%] flex flex-col">
           <div className="flex border-b border-black flex-1">
              <div className="w-1/2 border-r border-black p-1.5 px-2">
                <div className="font-bold">Invoice Number</div>
                <div>{getSimpleReceiptNo(invoice)}</div>
              </div>
              <div className="w-1/2 p-1.5 px-2">
                <div className="font-bold">Invoice Date</div>
                <div>{formatStayDateOnly(invoice.date)}</div>
              </div>
           </div>
           <div className="flex border-b border-black flex-1">
              <div className="w-1/2 border-r border-black p-1.5 px-2">
                <div className="font-bold">Place of Supply</div>
                <div>33 - Tamil Nadu</div>
              </div>
              <div className="w-1/2 p-1.5 px-2">
                 <div className="font-bold">Due date</div>
                 <div>{formatStayDateOnly(invoice.checkOutDate)}</div>
              </div>
           </div>
           <div className="p-1.5 px-2 flex-1">
              <div className="font-bold">Reverse Charge</div>
              <div>No</div>
           </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="border-b border-black p-2 space-y-1">
        <div className="font-bold text-base mb-1">Bill To</div>
        <div><b>Name -</b> {invoice.customerName}</div>
        <div><b>Phone No -</b> {invoice.customerPhone}</div>
        <div><b>Email ID -</b> {invoice.customerEmail}</div>
        <div><b>Aadhar No -</b> {getMaskedAadhar(invoice)}</div>
      </div>

      {/* Table */}
      <table className="w-full text-center border-collapse">
        <thead>
           <tr className="border-b border-black font-bold bg-white">
              <th className="border-r border-black p-1.5 w-[8%]">Room No</th>
              <th className="border-r border-black p-1.5 w-[22%]">Name</th>
              <th className="border-r border-black p-1.5 w-[14%]">Check In</th>
              <th className="border-r border-black p-1.5 w-[14%]">Check Out</th>
              <th className="border-r border-black p-1.5 w-[10%]">No of Days</th>
              <th className="border-r border-black p-1.5 w-[10%]">Price/Day</th>
              <th className="border-r border-black p-1.5 w-[10%]">Tax %</th>
              <th className="p-1.5 w-[12%]">Amount (₹)</th>
           </tr>
        </thead>
        <tbody>
           <tr className="align-top border-b-0">
              <td className="border-r border-black p-1.5">{invoice.roomNumber}</td>
              <td className="border-r border-black p-1.5 text-center">Room Rent</td>
              <td className="border-r border-black p-1.5">
                <div>{formatStayDateOnly(invoice.checkInDate)}</div>
                <div className="text-[10px] text-gray-600">{formatStayTime(invoice.checkInDate, false, settings)}</div>
              </td>
              <td className="border-r border-black p-1.5">
                <div>{formatStayDateOnly(invoice.checkOutDate)}</div>
                <div className="text-[10px] text-gray-600">{formatStayTime(invoice.checkOutDate, true, settings)}</div>
              </td>
              <td className="border-r border-black p-1.5">{invoice.totalNights}</td>
              <td className="border-r border-black p-1.5">{findRentPerDay(invoice).toFixed(2)}</td>
              <td className="border-r border-black p-1.5">{totalTaxRate}</td>
              <td className="p-1.5">{(invoice.subtotal).toFixed(2)}</td>
           </tr>
           {/* Add a few empty rows to simulate the space in the image */}
           {emptyRows.map((_, i) => (
             <tr key={i} className="align-top border-b-0">
               <td className="border-r border-black p-1.5 h-6"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="p-1.5"></td>
             </tr>
           ))}
           <tr className="align-top border-b border-black h-20">
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="border-r border-black p-1.5"></td>
               <td className="p-1.5"></td>
           </tr>

           {/* Rounded Off Row */}
           <tr className="border-b border-black">
              <td colSpan={7} className="border-r border-black p-1.5 text-left pl-2">Rounded Off (+)</td>
              <td className="p-1.5 text-right pr-2">+ 0.00</td>
           </tr>

           {/* Total Row */}
           <tr className="border-b border-black font-bold text-sm">
              <td colSpan={7} className="border-r border-black p-1.5 text-left pl-2">Total</td>
              <td className="p-1.5 text-right pr-2">{invoice.grandTotal.toFixed(2)}</td>
           </tr>
        </tbody>
      </table>

      {/* Amount in Words */}
      <div className="border-b border-black p-1.5 font-bold pl-2 text-sm">
         {convertNumberToWords(invoice.grandTotal)}
      </div>

      {/* Footer Section */}
      <div className="flex">
         <div className="w-1/2 border-r border-black p-2 space-y-1">
            <div className="font-bold text-sm">Terms and Conditions</div>
            <ol className="list-decimal pl-5 space-y-0.5 mt-1 font-semibold text-xs pb-10">
               <li>Deposited your Key card at the receptionist</li>
               <li>A minimum advance payment of 50% of the total booking amount is required for confirmation</li>
               <li>Charges for any property damage will be added to the bill.</li>
            </ol>
         </div>
         <div className="w-1/4 border-r border-black p-2 flex flex-col justify-end font-bold text-sm text-center pb-4">
            <div>Billing Officer's Signature</div>
         </div>
         <div className="w-1/4 p-2 flex flex-col justify-end font-bold text-sm text-center pb-4">
            <div>Guest's Signature</div>
         </div>
      </div>

      {/* Green Footer */}
      <div className="bg-[#c2d69b] text-center font-bold p-2 text-xs uppercase text-black border-t border-black">
         THANK YOU FOR YOUR VISIT, PLEASE VISIT US AGAIN !!!!
      </div>
    </div>
  );
}

