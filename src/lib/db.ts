import { Room, Invoice, SystemSettings } from '../types';

declare global {
  interface Window {
    db: {
      getRooms: () => Promise<Room[]>;
      saveRoom: (room: Room) => Promise<Room[]>;
      deleteRoom: (id: string) => Promise<Room[]>;
      getInvoices: () => Promise<Invoice[]>;
      saveInvoice: (invoice: Invoice) => Promise<Invoice[]>;
      deleteInvoice: (id: string) => Promise<Invoice[]>;
      updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<Invoice[]>;
      getSettings: () => Promise<SystemSettings & { id: string }>;
      saveSettings: (settings: SystemSettings) => Promise<SystemSettings & { id: string }>;
      resetDatabase: () => Promise<{ rooms: Room[]; invoices: Invoice[] }>;
    };
  }
}

export const db = window.db;
