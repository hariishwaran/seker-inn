/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Room {
  id: string; // e.g., "101"
  floor: number; // 1, 2
  roomType: string; // e.g., "Triple Room", "Double Room", "Four Sharing", "Queen Suite (5 sharing)", "King Suite (6 sharing)", "10 Sharing", "Driver Room (triple)"
  status: 'vacant' | 'occupied' | 'booked' | 'cleaning' | 'maintenance';
  isAC: boolean;
  basePrice: number;
  extraBedPrice?: number; // always 500
  extraBedsCount?: number; // 0, 1, 2 etc
  numberOfPeople?: number;
  guestName?: string;
  guestId?: string; // ADHR id Card
  guestGst?: string; // Optional GST input

  checkInDate?: string;
  checkOutDate?: string;
  expectedTime?: string; // e.g., "14:00 PM"
  maintenanceIssue?: string; // e.g., "AC Leakage"
  maintenancePriority?: 'Low' | 'Medium' | 'High / Urgent';
  maintenanceNotes?: string;
  amountDue?: number;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string; // e.g., "SI-2023-8942" for billing, "TAX-SI-2023-8942" for tax copy
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerGst?: string;
  numberOfPeople?: number;
  roomNumber: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  date: string; // e.g., "Oct 24, 2023"
  totalNights: number;
  lineItems: InvoiceLineItem[];
  notes: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  status: 'Paid' | 'Unpaid' | 'Draft';
}

export interface SystemSettings {
  address: string;
  phone: string;
  gstin: string;
  cgstPercentage: number;
  sgstpercentage: number;
  defaultcheckintime: string; // e.g., "12:00"
  defaultcheckouttime: string; // e.g., "11:00"
  bedsheetSmallPrice: number;
  bedsheetLargePrice: number;
  extraBedPrice: number;
  towelPrice: number;
  pillowCoverPrice: number;
}
