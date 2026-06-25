/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Room, SystemSettings } from '../types';
import { formatDate, formatDateTime } from '../lib/formatDate';
import { X, User, CheckCircle2, Group, Sparkles, AlertTriangle, Trash2, Plus, Minus, Wind, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface RoomDrawerProps {
  room: Room | null;
  onClose: () => void;
  onSave: (updatedRoom: Room, createInvoice?: boolean) => void;
  onDelete: (roomId: string) => void;
  settings: SystemSettings;
}

export default function RoomDrawer({ room, onClose, onSave, onDelete, settings }: RoomDrawerProps) {
  // Local editable state
  const [status, setStatus] = useState<Room['status']>('vacant');
  const [guestName, setGuestName] = useState('');
  const [guestId, setGuestId] = useState('');
  const [guestGst, setGuestGst] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(2);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [amountDue, setAmountDue] = useState<number>(0);
  const [extraBedsCount, setExtraBedsCount] = useState<number>(0);
  const [maintenanceIssue, setMaintenanceIssue] = useState('');
  const [priority, setPriority] = useState<Room['maintenancePriority']>('Low');
  const [notes, setNotes] = useState('');
  const [createInvoiceOnSave, setCreateInvoiceOnSave] = useState(false);

  // Expected cleaning time
  const [expectedTime, setExpectedTime] = useState('14:00 PM');

  // Load state when room shifts
  useEffect(() => {
    if (room) {
      setStatus(room.status);
      setGuestName(room.guestName || '');
      setGuestId(room.guestId || '');
      setGuestGst(room.guestGst || '');
      setNumberOfPeople(room.numberOfPeople || 2);
      setCheckInDate(room.checkInDate || '');
      setCheckOutDate(room.checkOutDate || '');
      setAmountDue(room.amountDue || 0);
      setExtraBedsCount(room.extraBedsCount || 0);
      setMaintenanceIssue(room.maintenanceIssue || '');
      setPriority(room.maintenancePriority || 'Low');
      setNotes(room.maintenanceNotes || '');
      setExpectedTime(room.expectedTime || '14:00 PM');
      setCreateInvoiceOnSave(false);
    }
  }, [room]);

  // Clean auto-update of room Stay Amount based on check-in/checkout dates & extra beds
  useEffect(() => {
    if ((status === 'occupied' || status === 'booked') && checkInDate && checkOutDate && room) {
      try {
        const d1 = new Date(checkInDate);
        const d2 = new Date(checkOutDate);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          const diff = d2.getTime() - d1.getTime();
          const nights = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
          const basePrice = room.basePrice || 2500;
          const extraBedsTotal = extraBedsCount * (room.extraBedPrice || settings.extraBedPrice || 500);
          setAmountDue(nights * (basePrice + extraBedsTotal));
        }
      } catch (error) {
        // Safe failover
      }
    }
  }, [checkInDate, checkOutDate, extraBedsCount, status, room, settings]);

  if (!room) return null;

  const handleSave = () => {
    if ((status === 'occupied' || status === 'booked') && !guestName.trim()) {
      toast.error('Guest name is required for occupied/booked rooms.');
      return;
    }
    if ((status === 'occupied' || status === 'booked') && !checkInDate) {
      toast.error('Check-in date is required.');
      return;
    }
    if ((status === 'occupied' || status === 'booked') && !checkOutDate) {
      toast.error('Check-out date is required.');
      return;
    }
    if ((status === 'occupied' || status === 'booked') && checkInDate && checkOutDate && new Date(checkOutDate) <= new Date(checkInDate)) {
      toast.error('Check-out date must be after check-in date.');
      return;
    }
    if (status === 'maintenance' && !maintenanceIssue.trim()) {
      toast.error('Please describe the maintenance issue.');
      return;
    }

    const updatedRoom: Room = {
      ...room,
      status,
      guestName: status === 'occupied' || status === 'booked' ? guestName : '',
      guestId: status === 'occupied' || status === 'booked' ? guestId : '',
      guestGst: status === 'occupied' || status === 'booked' ? guestGst : '',
      numberOfPeople: status === 'occupied' || status === 'booked' ? numberOfPeople : 2,
      checkInDate: status === 'occupied' || status === 'booked' ? checkInDate : '',
      checkOutDate: status === 'occupied' || status === 'booked' ? checkOutDate : '',
      amountDue: status === 'occupied' || status === 'booked' ? amountDue : 0,
      extraBedsCount: status === 'occupied' || status === 'booked' ? extraBedsCount : 0,
      maintenanceIssue: status === 'maintenance' ? maintenanceIssue : '',
      maintenancePriority: priority,
      maintenanceNotes: notes,
      expectedTime: status === 'cleaning' ? expectedTime : '',
    };
    onSave(updatedRoom, createInvoiceOnSave);
  };

  return (
    <>
      {/* Background Overlay */}
      <div 
        className="fixed inset-0 bg-[#020205]/60 backdrop-blur-md z-[60] transition-opacity duration-300" 
        onClick={onClose}
        id="drawer-backdrop"
      />

      {/* Side Content Panel */}
      <div 
        className="fixed inset-y-0 right-0 w-full max-w-md bg-[#050510]/80 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col z-[70] transition-transform duration-300 translate-x-0"
        id="room-details-drawer"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#070715]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white font-display" id="drawer-header-title">Room {room.id}</h2>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                room.isAC 
                  ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20' 
                  : 'bg-zinc-500/10 text-zinc-300 border border-zinc-500/20'
              }`}>
                {room.isAC ? 'AC Room' : 'Non-AC'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{room.roomType}</span>
              <span className="text-white/30 text-xs">&bull;</span>
              <span className="text-[10px] font-bold text-emerald-400">₹{(room.basePrice ?? 0).toLocaleString('en-IN')}/day</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Close Panel"
            id="btn-close-drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          
          {/* Update Status Actions Grid */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Update Status</h4>
            <div className="grid grid-cols-2 gap-3">
              
              {/* Vacant option */}
              <button
                type="button"
                onClick={() => setStatus('vacant')}
                className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all cursor-pointer ${
                  status === 'vacant'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold shadow-md shadow-emerald-500/5'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
                }`}
                id="btn-status-vacant"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-xs font-semibold">Vacant</span>
              </button>

              {/* Booked option */}
              <button
                type="button"
                onClick={() => setStatus('booked')}
                className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all cursor-pointer ${
                  status === 'booked'
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300 font-bold shadow-md shadow-violet-500/5'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
                }`}
                id="btn-status-booked"
              >
                <Calendar className="h-5 w-5 text-indigo-400" />
                <span className="text-xs font-semibold">Booked</span>
              </button>

              {/* Occupied option */}
              <button
                type="button"
                onClick={() => setStatus('occupied')}
                className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all cursor-pointer ${
                  status === 'occupied'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold shadow-md shadow-amber-500/5'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
                }`}
                id="btn-status-occupied"
              >
                <Group className="h-5 w-5" />
                <span className="text-xs font-semibold">Occupied</span>
              </button>

              {/* Cleaning option */}
              <button
                type="button"
                onClick={() => setStatus('cleaning')}
                className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all cursor-pointer ${
                  status === 'cleaning'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-300 font-bold shadow-md shadow-sky-500/5'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
                }`}
                id="btn-status-cleaning"
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-semibold">Cleaning</span>
              </button>

              {/* Maintenance option */}
              <button
                type="button"
                onClick={() => setStatus('maintenance')}
                className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all cursor-pointer col-span-2 ${
                  status === 'maintenance'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-300 font-bold shadow-md shadow-rose-500/5'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
                }`}
                id="btn-status-maintenance"
              >
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs font-semibold">Maintenance</span>
              </button>
            </div>
          </div>

          {/* Conditional inputs based on selected state */}
          {status === 'vacant' && (
            <div className="bg-white/5 p-4 border border-white/10 rounded-2xl text-center text-white/60 text-xs">
              This room is currently empty. Update status to <strong className="text-white">Booked</strong> or <strong className="text-white">Occupied</strong> to configure guest details.
            </div>
          )}

          {(status === 'occupied' || status === 'booked') && (
            <>
              <div className="space-y-4 p-4 border border-white/10 rounded-2xl bg-white/5 font-display">
                <h5 className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/10 pb-2">Guest Check-In Data</h5>
                <div>
                  <label className="block text-xs font-bold text-white/65 mb-1">Guest Full Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/65 mb-1">Guest ID Proof</label>
                    <input
                      type="text"
                      value={guestId}
                      onChange={(e) => setGuestId(e.target.value)}
                      placeholder="e.g. ADHR-4592-XXXX"
                      className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/65 mb-1">Guest GSTIN (Opt.)</label>
                    <input
                      type="text"
                      value={guestGst}
                      onChange={(e) => setGuestGst(e.target.value)}
                      placeholder="e.g. 33ABCDE1234F1Z5"
                      className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/65 mb-1">Number of People</label>
                    <input
                      type="number"
                      min="1"
                      value={numberOfPeople}
                      onChange={(e) => setNumberOfPeople(Number(e.target.value))}
                      className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/65 mb-1">Amount Due (₹)</label>
                    <input
                      type="number"
                      value={amountDue || ''}
                      onChange={(e) => setAmountDue(Number(e.target.value))}
                      placeholder="14500"
                      className="w-full border border-white/10 bg-white/5 text-emerald-400 font-mono font-bold rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/65 mb-1">Check-In Date</label>
                    <div className="relative date-input-wrapper">
                      <input
                        type="datetime-local"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className="w-full border border-white/10 bg-white/5 text-transparent rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      />
                      <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-xs text-white/80 date-input-overlay">
                        {checkInDate ? formatDateTime(checkInDate) : 'dd/mm/yyyy, --:-- --'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/65 mb-1">Check-Out Date</label>
                    <div className="relative date-input-wrapper">
                      <input
                        type="datetime-local"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        className="w-full border border-white/10 bg-white/5 text-transparent rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      />
                      <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-xs text-white/80 date-input-overlay">
                        {checkOutDate ? formatDateTime(checkOutDate) : 'dd/mm/yyyy, --:-- --'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Extra Bed Configuration</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExtraBedsCount(Math.max(0, extraBedsCount - 1))}
                      className="p-1.5 border border-white/10 bg-white/5 hover:bg-white/15 text-white rounded-lg transition-colors cursor-pointer select-none"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-black text-white min-w-[20px] text-center font-mono">{extraBedsCount}</span>
                    <button
                      type="button"
                      onClick={() => setExtraBedsCount(extraBedsCount + 1)}
                      className="p-1.5 border border-white/10 bg-white/5 hover:bg-white/15 text-white rounded-lg transition-colors cursor-pointer select-none"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] text-white/40 italic ml-1">
                      (+₹{(room.extraBedPrice || settings.extraBedPrice || 500)} / night per bed)
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createInvoiceOnSave}
                    onChange={(e) => setCreateInvoiceOnSave(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-white/15 bg-white/5 text-indigo-500 focus:ring-0 cursor-pointer accent-indigo-500"
                    id="checkbox-drawer-create-invoice"
                  />
                  <label htmlFor="checkbox-drawer-create-invoice" className="text-xs text-white/70 select-none cursor-pointer hover:text-white">
                    Create Invoice automatically for this booking on save
                  </label>
                </div>
              </div>

              {/* Guest Summary Card  */}
              <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-lg space-y-4" id="guest-card">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-display tracking-tight" id="active-guest-name">
                      {guestName || 'Unnamed Guest'}
                    </h3>
                    <p className="text-xs text-white/40 font-mono">ID: {guestId || 'ADHR-XXXX-XXXX'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Check-In</p>
                    <p className="font-semibold text-white/95 text-sm mt-1">{formatDate(checkInDate) || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Check-Out</p>
                    <p className="font-semibold text-white/95 text-sm mt-1">{formatDate(checkOutDate) || 'Not specified'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Extra Bed Option</p>
                    <p className="font-semibold text-neutral-300 text-xs mt-1">
                      {extraBedsCount > 0 ? `${extraBedsCount} Bed (+₹${(extraBedsCount * (room.extraBedPrice || settings.extraBedPrice || 500)).toLocaleString('en-IN')})` : 'No extra beds'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-body-sm">Stay Daily Rate</p>
                    <p className="font-semibold text-emerald-400 text-xs mt-1">
                      ₹{((room.basePrice ?? 0) + extraBedsCount * (room.extraBedPrice || settings.extraBedPrice || 500)).toLocaleString('en-IN')}/day
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-sm">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Stay Due</p>
                  <div className="flex items-center font-bold text-indigo-400 text-base font-mono">
                    <span className="text-xs mr-0.5">₹</span> 
                    <span>{(amountDue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {status === 'cleaning' && (
            <div className="space-y-3 p-4 border border-white/10 rounded-2xl bg-white/5">
              <h5 className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/10 pb-2">Cleaning Priority</h5>
              <div>
                <label className="block text-xs font-bold text-white/65 mb-1">Expected Room Ready By</label>
                <input
                  type="text"
                  value={expectedTime}
                  onChange={(e) => setExpectedTime(e.target.value)}
                  placeholder="e.g. 14:00 PM"
                  className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          {status === 'maintenance' && (
            <>
              <div className="space-y-3 p-4 border border-white/10 rounded-2xl bg-white/5">
                <h5 className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/10 pb-2">Maintenance Issue Details</h5>
                <div>
                  <label className="block text-xs font-bold text-white/65 mb-1">Specific Issue</label>
                  <input
                    type="text"
                    value={maintenanceIssue}
                    onChange={(e) => setMaintenanceIssue(e.target.value)}
                    placeholder="e.g. AC Leakage, Plumbing repair"
                    className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              
              {/* Maintenance priorities */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-bold text-white/80 mb-1 font-display">Maintenance Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Low" className="bg-[#12121e]">Low</option>
                    <option value="Medium" className="bg-[#12121e]">Medium</option>
                    <option value="High / Urgent" className="bg-[#12121e]">High / Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white/80 mb-1 font-display">Maintenance Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Type any specific instructions or issues here..."
                    rows={3}
                    className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 resize-none transition-all duration-300"
                  />
                </div>
              </div>
            </>
          )}

        </div>

        {/* Drawer Footer actions */}
        <div className="p-4 border-t border-white/10 flex flex-col gap-3.5 bg-white/5">
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-sm font-semibold text-white/70 hover:bg-white/10 transition-colors text-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold rounded-xl text-sm hover:opacity-95 transition-all text-center cursor-pointer active:scale-95"
            >
              Save Changes
            </button>
          </div>
          
          <button
            type="button"
            onClick={() => {
              if (room.status === 'occupied') {
                toast.error('Warning: This room is currently occupied. Please complete guest check-out or check-out billing before deleting this room.');
                return;
              }
              if (room.status === 'booked') {
                toast.error('Warning: This room has a future booking. Please cancel the booking before deleting this room.');
                return;
              }
              onDelete(room.id);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 active:bg-rose-500 hover:text-white transition-all duration-300 font-semibold text-sm cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Hotel Room</span>
          </button>
        </div>

      </div>
    </>
  );
}
