/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, Invoice } from './types';

export const initialRooms: Room[] = [
  // First Floor - 10 AC Rooms
  {
    id: "101",
    floor: 1,
    roomType: "Triple Room (AC)",
    status: "vacant",
    isAC: true,
    basePrice: 2500,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "102",
    floor: 1,
    roomType: "Triple Room (AC)",
    status: "vacant",
    isAC: true,
    basePrice: 2500,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "103",
    floor: 1,
    roomType: "Triple Room (AC)",
    status: "vacant",
    isAC: true,
    basePrice: 2500,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "104",
    floor: 1,
    roomType: "Double Room (AC)",
    status: "vacant",
    isAC: true,
    basePrice: 2000,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "105",
    floor: 1,
    roomType: "Triple Room (AC)",
    status: "vacant",
    isAC: true,
    basePrice: 2500,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "106",
    floor: 1,
    roomType: "Double Room (AC)",
    status: "vacant",
    isAC: true,
    basePrice: 2000,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "107",
    floor: 1,
    roomType: "Four Sharing (AC)",
    status: "vacant",
    isAC: true,
    basePrice: 3000,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "108",
    floor: 1,
    roomType: "Triple Room (AC)",
    status: "vacant",
    isAC: true,
    basePrice: 2500,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "109",
    floor: 1,
    roomType: "Queen Suite (5 sharing) (AC)",
    status: "vacant",
    isAC: true,
    basePrice: 3500,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "110",
    floor: 1,
    roomType: "King Suite (6 sharing) (AC)",
    status: "vacant",
    isAC: true,
    basePrice: 4000,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },

  // Second Floor - 3 Non-AC Rooms
  {
    id: "201",
    floor: 2,
    roomType: "10 Sharing (Non-AC)",
    status: "vacant",
    isAC: false,
    basePrice: 6000,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "202",
    floor: 2,
    roomType: "Triple Room (Non-AC)",
    status: "vacant",
    isAC: false,
    basePrice: 1500,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  },
  {
    id: "203",
    floor: 2,
    roomType: "Driver Room (triple) (Non-AC)",
    status: "vacant",
    isAC: false,
    basePrice: 1500,
    extraBedPrice: 500,
    extraBedsCount: 0,
    guestName: "",
    guestId: "",
    amountDue: 0,
    maintenancePriority: "Low",
    maintenanceNotes: ""
  }
];

export const initialInvoices: Invoice[] = [];
