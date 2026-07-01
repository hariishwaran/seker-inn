/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Invoice, InvoiceLineItem, Room, SystemSettings } from '../types';
import { User, Bed, PlusCircle, Trash, Printer, FileDown, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

export interface PrefillInvoiceData {
  roomId?: string;
  guestName?: string;
  guestGst?: string;
  numberOfPeople?: number;
  checkInDate?: string;
  checkOutDate?: string;
  extraBedsCount?: number;
}

interface NewInvoiceFormViewProps {
  rooms: Room[];
  onSaveInvoice: (newInvoice: Invoice) => void;
  onCancel: () => void;
  prefillData?: PrefillInvoiceData | null;
  editingInvoice?: Invoice | null;
  settings: SystemSettings;
  nextInvoiceNumber?: number;
}

export default function NewInvoiceFormView({ rooms, onSaveInvoice, onCancel, prefillData, editingInvoice, settings, nextInvoiceNumber }: NewInvoiceFormViewProps) {
  const itemsCatalog = [
    { label: 'Bedsheet(Small)', defaultPrice: settings.bedsheetSmallPrice ?? 150 },
    { label: 'Bedsheet(Large)', defaultPrice: settings.bedsheetLargePrice ?? 250 },
    { label: 'Extra Bed', defaultPrice: settings.extraBedPrice ?? 500 },
    { label: 'Towel', defaultPrice: settings.towelPrice ?? 50 },
    { label: 'Pillow cover', defaultPrice: settings.pillowCoverPrice ?? 30 },
  ];

  // Guest Details state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(2);

  // Stay Details state
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [roomType, setRoomType] = useState('Triple Room (AC)');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');

  // Extra Bed Selection State
  const [hasExtraBed, setHasExtraBed] = useState(false);
  const [extraBedQty, setExtraBedQty] = useState(1);

  // Charges line items state
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(editingInvoice ? editingInvoice.lineItems : [
    {
      id: 'init-room',
      description: 'Room Rent',
      qty: 1,
      unitPrice: 0,
      total: 0,
    }
  ]);

  // Invoice notes
  const [notes, setNotes] = useState(editingInvoice?.notes || '');

  // Helper date calculation
  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 1;
    const d1 = new Date(checkInDate);
    const d2 = new Date(checkOutDate);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
    const diff = d2.getTime() - d1.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  };

  // Prefill occupant details on room shift (skip if editing an existing invoice on mount)
  useEffect(() => {
    if (editingInvoice) return;
    if (selectedRoomId) {
      const matchRoom = rooms.find(r => r.id === selectedRoomId);
      if (matchRoom) {
        setRoomType(matchRoom.roomType);
        if (matchRoom.guestName) {
          setCustomerName(matchRoom.guestName);
        }
        if (matchRoom.guestGst) {
          setCustomerGst(matchRoom.guestGst);
        }
        if (matchRoom.numberOfPeople) {
          setNumberOfPeople(matchRoom.numberOfPeople);
        }
        if (matchRoom.checkInDate) {
          setCheckInDate(matchRoom.checkInDate);
        }
        if (matchRoom.checkOutDate) {
          setCheckOutDate(matchRoom.checkOutDate);
        }
        if (matchRoom.extraBedsCount && matchRoom.extraBedsCount > 0) {
          setHasExtraBed(true);
          setExtraBedQty(matchRoom.extraBedsCount);
        } else {
          setHasExtraBed(false);
          setExtraBedQty(1);
        }
      }
    }
  }, [selectedRoomId, rooms, editingInvoice]);

  // Set initial fields from prefillData on mount
  useEffect(() => {
    if (editingInvoice) {
      setCustomerName(editingInvoice.customerName || '');
      setCustomerEmail(editingInvoice.customerEmail || '');
      setCustomerPhone(editingInvoice.customerPhone || '');
      setCustomerGst(editingInvoice.customerGst || '');
      setNumberOfPeople(editingInvoice.numberOfPeople || 2);
      setSelectedRoomId(editingInvoice.roomNumber || '');
      setRoomType(editingInvoice.roomType || '');
      setCheckInDate(editingInvoice.checkInDate || '');
      setCheckOutDate(editingInvoice.checkOutDate || '');
      
      const extraBedItem = editingInvoice.lineItems.find(item => item.description.includes('Extra Bed'));
      if (extraBedItem) {
        setHasExtraBed(true);
        // Approximation: if it exists, extra bed qty could be inferred, but we trust line items total.
        // We'll set it to at least 1 so UI shows extra bed is active.
        setExtraBedQty(1); 
      }
      return;
    }

    if (prefillData) {
      if (prefillData.roomId) {
        setSelectedRoomId(prefillData.roomId);
      }
      if (prefillData.guestName) {
        setCustomerName(prefillData.guestName);
      }
      if (prefillData.guestGst) {
        setCustomerGst(prefillData.guestGst);
      }
      if (prefillData.numberOfPeople) {
        setNumberOfPeople(prefillData.numberOfPeople);
      }
      if (prefillData.checkInDate) {
        setCheckInDate(prefillData.checkInDate);
      }
      if (prefillData.checkOutDate) {
        setCheckOutDate(prefillData.checkOutDate);
      }
      if (prefillData.extraBedsCount && prefillData.extraBedsCount > 0) {
        setHasExtraBed(true);
        setExtraBedQty(prefillData.extraBedsCount);
      } else {
        setHasExtraBed(false);
        setExtraBedQty(1);
      }
    }
  }, [prefillData, editingInvoice]);

  // Auto update stay row charges & extra bed additions
  useEffect(() => {
    if (editingInvoice) return; // Skip dynamic calculation if we're editing
    if (!selectedRoomId) return;
    const matchRoom = rooms.find(r => r.id === selectedRoomId);
    if (!matchRoom) return;

    const nights = calculateNights();
    const basePrice = matchRoom.basePrice || 2500;
    const roomStayDesc = 'Room Rent';

    // Filter out any prior room stay or extra bed entries to keep catalog items unaffected
    const otherItems = lineItems.filter(
      item => item.description !== 'Room Rent' && !item.description.includes('Extra Bed')
    );

    const roomStayItem: InvoiceLineItem = {
      id: 'stay-charge',
      description: roomStayDesc,
      qty: nights,
      unitPrice: basePrice,
      total: nights * basePrice
    };

    const newItems: InvoiceLineItem[] = [roomStayItem];

    if (hasExtraBed && extraBedQty > 0) {
      const bedPrice = matchRoom.extraBedPrice || 500;
      newItems.push({
        id: 'extra-bed-charge',
        description: `Extra Bed Charges (${extraBedQty} Bed${extraBedQty > 1 ? 's' : ''})`,
        qty: nights,
        unitPrice: bedPrice * extraBedQty,
        total: nights * bedPrice * extraBedQty
      });
    }

    setLineItems([...newItems, ...otherItems]);
  }, [selectedRoomId, checkInDate, checkOutDate, hasExtraBed, extraBedQty]);

  // Handle adding a custom line item
  const handleAddItemRow = () => {
    const defaultSelection = itemsCatalog[0];
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      description: defaultSelection.label,
      qty: 1,
      unitPrice: defaultSelection.defaultPrice,
      total: defaultSelection.defaultPrice,
    };
    setLineItems([...lineItems, newItem]);
  };

  // Handle removing raw line item
  const handleRemoveRow = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  // Handle changing cell values
  const handleCellChange = (id: string, field: 'description' | 'qty' | 'unitPrice', value: any) => {
    setLineItems(lineItems.map((item) => {
      if (item.id === id) {
        let updated = { ...item };
        if (field === 'description') {
          updated.description = value;
          // Auto patch default price if description matches standard catalog labels
          const matchCatalog = itemsCatalog.find(cat => cat.label === value);
          if (matchCatalog) {
            updated.unitPrice = matchCatalog.defaultPrice;
            updated.total = updated.qty * matchCatalog.defaultPrice;
          }
        } else if (field === 'qty') {
          const numeric = Math.max(1, Number(value));
          updated.qty = numeric;
          updated.total = numeric * updated.unitPrice;
        } else if (field === 'unitPrice') {
          const numeric = Math.max(0, Number(value));
          updated.unitPrice = numeric;
          updated.total = updated.qty * numeric;
        }
        return updated;
      }
      return item;
    }));
  };

  // Calculations
  const subtotal = lineItems.reduce((acc, curr) => acc + curr.total, 0);
  const cgst = subtotal * (settings.cgstPercentage / 100);
  const sgst = subtotal * (settings.sgstpercentage / 100);
  const grandTotal = subtotal + cgst + sgst;

  const handleSubmitForm = (status: Invoice['status']) => {
    if (!customerName) {
      toast.error('Please fill out the guest name.');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      toast.error('Please provide both check-in and check-out dates.');
      return;
    }

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      toast.error('Check-out date must be after check-in date.');
      return;
    }

    if (!selectedRoomId) {
      toast.error('Please select a room.');
      return;
    }

    const newInvoiceRecord: Invoice = {
      id: editingInvoice ? editingInvoice.id : `SI-${nextInvoiceNumber ?? 1}`,
      customerName,
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      customerGst: customerGst || undefined,
      numberOfPeople,
      roomNumber: selectedRoomId || '101',
      roomType,
      checkInDate,
      checkOutDate,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      totalNights: calculateNights(),
      lineItems,
      notes: notes || 'Standard stay package.',
      subtotal,
      cgst,
      sgst,
      grandTotal,
      status,
    };

    onSaveInvoice(newInvoiceRecord);
  };

  return (
    <div className="space-y-6" id="new-invoice-form-view">
      
      {/* Outer grid details */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        
        {/* Guest Details and Stay Details card split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Guest Card */}
          <section className="glass-panel p-5 rounded-2xl shadow-lg lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <User className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white font-display">Guest Details</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border border-white/10 bg-white/5 text-white placeholder-white/30 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Phone Number</label>
                  <input 
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full border border-white/10 bg-white/5 text-white placeholder-white/30 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Email Address</label>
                  <input 
                    type="email"
                    placeholder="rahul.s@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full border border-white/10 bg-white/5 text-white placeholder-white/30 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Number of People</label>
                  <input 
                    type="number"
                    min="1"
                    value={numberOfPeople}
                    onChange={(e) => setNumberOfPeople(Number(e.target.value))}
                    className="w-full border border-white/10 bg-white/5 text-white placeholder-white/30 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">GST Number (optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. 33ABCDE1234F1Z5"
                    value={customerGst}
                    onChange={(e) => setCustomerGst(e.target.value)}
                    className="w-full border border-white/10 bg-white/5 text-white placeholder-white/30 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Right Stay Card */}
          <section className="glass-panel p-5 rounded-2xl shadow-lg lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-indigo-400" />
                <h2 className="text-xl font-bold text-white font-display">
                {editingInvoice ? `Editing Invoice #${editingInvoice.id}` : 'Create New Invoice'}
              </h2>
              </div>
              {selectedRoomId && (
                <span className="text-[10px] font-bold text-emerald-400 font-mono">
                  Stay Nights: {calculateNights()}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Room Number</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full border border-white/10 bg-[#070715] text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                  >
                    <option value="" className="bg-[#12121e]">Select Room</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id} className="bg-[#12121e]">
                        Room {room.id} - {room.roomType}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Room Type</label>
                  <input 
                    type="text"
                    value={roomType}
                    readOnly
                    className="w-full border border-white/10 bg-white/5 text-white/60 rounded-xl p-2.5 text-sm focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Check-In Date</label>
                  <input 
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Check-Out Date</label>
                  <input 
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {selectedRoomId && (
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cb-extra-bed"
                      checked={hasExtraBed}
                      onChange={(e) => setHasExtraBed(e.target.checked)}
                      className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-0 focus:outline-none cursor-pointer h-4 w-4"
                    />
                    <label htmlFor="cb-extra-bed" className="text-xs font-semibold text-white/85 cursor-pointer select-none">
                      Add Extra Bed (+₹500/night per bed)
                    </label>
                  </div>

                  {hasExtraBed && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Bed Count:</span>
                      <button
                        type="button"
                        onClick={() => setExtraBedQty(Math.max(1, extraBedQty - 1))}
                        className="p-1 border border-white/15 bg-white/5 text-white rounded hover:bg-white/15 cursor-pointer selection:none"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-sm font-black text-indigo-300 w-4 text-center font-mono">{extraBedQty}</span>
                      <button
                        type="button"
                        onClick={() => setExtraBedQty(extraBedQty + 1)}
                        className="p-1 border border-white/15 bg-white/5 text-white rounded hover:bg-white/15 cursor-pointer selection:none"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Charges & Line Items section list */}
        <section className="glass-panel rounded-2xl overflow-hidden shadow-lg border border-white/10">
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-white text-sm sm:text-base font-display">Charges &amp; Line Items</h3>
            </div>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="flex items-center gap-1.5 text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-95 px-4 py-2 rounded-xl font-bold shadow-sm cursor-pointer transition-all active:scale-95"
              id="btn-add-item-row"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="invoice-items-builder">
              <thead>
                <tr className="bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  <th className="px-6 py-4 border-b border-white/10">Description</th>
                  <th className="px-6 py-4 border-b border-white/10 w-32">Qty</th>
                  <th className="px-6 py-4 border-b border-white/10 w-48">Unit Price (₹)</th>
                  <th className="px-6 py-4 border-b border-white/10 w-48 text-right">Total (₹)</th>
                  <th className="px-6 py-4 border-b border-white/10 w-16 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-3">
                      <select
                        value={item.description}
                        onChange={(e) => handleCellChange(item.id, 'description', e.target.value)}
                        className="w-full border-none bg-transparent hover:bg-white/5 text-white/90 focus:bg-white/10 rounded-xl p-1 text-sm font-medium focus:ring-0 focus:outline-none cursor-pointer"
                      >
                        {itemsCatalog.map((cat) => (
                          <option key={cat.label} value={cat.label} className="bg-[#12121e]">
                            {cat.label}
                          </option>
                        ))}
                        <option value="Room Rent" className="bg-[#12121e]">Room Rent</option>
                        <option value="Custom Room Service" className="bg-[#12121e]">Custom Room Service</option>
                        <option value="Damages Replacement" className="bg-[#12121e]">Damages Replacement / Repairs</option>
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <input 
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleCellChange(item.id, 'qty', e.target.value)}
                        className="w-20 border border-white/10 bg-white/5 text-white px-2.5 py-1 text-sm rounded-lg focus:outline-none focus:border-indigo-500 font-semibold"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input 
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleCellChange(item.id, 'unitPrice', e.target.value)}
                        className="w-32 border border-white/10 bg-white/5 text-white px-2.5 py-1 text-sm rounded-lg focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                      />
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-white/90 text-sm">
                      ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(item.id)}
                        className="text-rose-450 opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-white/10 transition-opacity cursor-pointer text-rose-400"
                        title="Remove row item"
                      >
                        <Trash className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Notes & Summary layout */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
              <label className="block text-sm font-semibold text-white/70 mb-2 font-display">Invoice Notes</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special requests, corporate discounts, payment instructions, or guest feedback notes here..."
                rows={4}
                className="w-full border border-white/10 bg-white/5 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
              />
            </div>
          </div>

          <div className="lg:col-span-5 bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex justify-between items-center text-sm text-white/60 font-medium">
              <span>Subtotal</span>
              <span className="font-bold text-white font-mono">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm text-white/60 font-medium">
              <span>CGST ({settings.cgstPercentage}%)</span>
              <span className="font-bold text-white font-mono">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm text-white/60 font-medium pb-4 border-b border-white/10">
              <span>SGST ({settings.sgstpercentage}%)</span>
              <span className="font-bold text-white font-mono">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center text-indigo-400">
              <span className="text-base font-bold font-display">Grand Total</span>
              <span className="text-2xl font-black font-mono">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </section>

        {/* Form control actions at bottom */}
        <footer className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-5 py-2.5 text-white/50 font-semibold hover:text-rose-455 text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button 
            type="button"
            onClick={() => handleSubmitForm('Draft')}
            className="px-5 py-2.5 border border-white/10 rounded-xl font-semibold text-white/80 bg-white/5 hover:bg-white/10 text-sm shadow-xs transition-transform active:scale-95 cursor-pointer"
            id="btn-save-as-draft"
          >
            {editingInvoice ? 'Update Draft' : 'Save as Draft'}
          </button>

          <button 
            type="button"
            onClick={() => handleSubmitForm('Paid')} // Marks as Paid and saves
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm rounded-xl shadow-lg hover:opacity-95 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            id="btn-generate-invoice"
          >
            <Printer className="h-4.5 w-4.5" />
            <span>{editingInvoice ? 'Update & Preview Invoice' : 'Generate & Preview Invoice'}</span>
          </button>
        </footer>

      </form>



    </div>
  );
}
