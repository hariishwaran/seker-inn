/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, Invoice } from '../types';
import { Bed, CheckCircle, RefreshCw, AlertTriangle, Building, Calendar } from 'lucide-react';

interface DashboardViewProps {
  rooms: Room[];
  invoices: Invoice[];
  setActiveTab: (tab: string) => void;
  onSelectRoom: (roomId: string) => void;
}

export default function DashboardView({ rooms, invoices, setActiveTab, onSelectRoom }: DashboardViewProps) {
  // Compute metrics
  const totalRoomsCount = rooms.length;
  const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
  const bookedCount = rooms.filter(r => r.status === 'booked').length;
  const vacantCount = rooms.filter(r => r.status === 'vacant').length;
  const cleaningCount = rooms.filter(r => r.status === 'cleaning').length;
  const maintenanceCount = rooms.filter(r => r.status === 'maintenance').length;
  const occupancyRate = totalRoomsCount > 0 ? Math.round((occupiedCount / totalRoomsCount) * 100) : 0;

  // Revenue metrics from paid invoice histories
  const paidInvoicesTotal = invoices.filter(inv => inv.status === 'Paid').reduce((acc, current) => acc + current.grandTotal, 0);

  // Active maintenance list
  const activeMaintenanceRooms = rooms.filter(r => r.status === 'maintenance');

  // Today's date logic for checkouts
  const today = new Date().toISOString().split('T')[0];
  const upcomingCheckouts = rooms.filter(
    r => r.status === 'occupied' && r.checkOutDate && r.checkOutDate.startsWith(today)
  );

  const draftInvoices = invoices.filter(inv => inv.status === 'Draft');

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Welcome Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display">Welcome back, Desk Manager!</h1>
          <p className="text-sm text-white/50 mt-1">Here is a quick snapshot of Sekar Inn operations for today.</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white/5 text-indigo-300 px-3 py-1.5 rounded-full font-mono border border-white/10 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
          <span>System Sync: OK</span>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Occupancy card */}
        <div className="glass-panel p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Occupancy Rate</span>
            <Building className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-semibold text-white font-display">{occupancyRate}%</span>
          </div>
          <p className="text-xs text-white/50 mt-2">{occupiedCount} rooms currently occupied</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 mt-4">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-300" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>

        {/* Upcoming Bookings card */}
        <div className="glass-panel p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Upcoming Bookings</span>
            <Calendar className="h-5 w-5 text-violet-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-semibold text-white font-display">{bookedCount}</span>
            <span className="text-xs text-white/40">/ {totalRoomsCount} Total</span>
          </div>
          <p className="text-xs text-white/50 mt-2">Future check-ins reserved</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
            <div className="bg-violet-500 h-full" style={{ width: `${(bookedCount / totalRoomsCount) * 100}%` }}></div>
          </div>
        </div>

        {/* Available Rooms card */}
        <div className="glass-panel p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Available Rooms</span>
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-semibold text-white font-display">{vacantCount}</span>
            <span className="text-xs text-white/40">/ {totalRoomsCount} Total</span>
          </div>
          <p className="text-xs text-white/50 mt-2">Ready for instant guest check-in</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
            <div className="bg-emerald-400 h-full" style={{ width: `${(vacantCount / totalRoomsCount) * 100}%` }}></div>
          </div>
        </div>

        {/* Cleaning Queue card */}
        <div className="glass-panel p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Cleaning Queue</span>
            <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-semibold text-white font-display">{cleaningCount}</span>
            <span className="text-xs text-white/40">rooms currently dirty</span>
          </div>
          <p className="text-xs text-white/50 mt-2">Priority cleaning assignments active</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
            <div className="bg-blue-400 h-full" style={{ width: `${(cleaningCount / totalRoomsCount) * 100}%` }}></div>
          </div>
        </div>

        {/* Maintenance Alerts card */}
        <div className="glass-panel p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Maintenance Holds</span>
            <AlertTriangle className="h-5 w-5 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-semibold text-white font-display">{maintenanceCount}</span>
            <span className="text-xs text-white/40">rooms out of order</span>
          </div>
          <p className="text-xs text-white/50 mt-2">Issues needing urgent attention</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
            <div className="bg-rose-500 h-full" style={{ width: `${(maintenanceCount / totalRoomsCount) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Operations Quick Map/Links */}
        <div className="glass-panel p-6 rounded-2xl shadow-lg lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 className="font-semibold text-white text-base font-display">Quick Room Overview By Status</h3>
            <button 
              onClick={() => setActiveTab('rooms')}
              className="text-indigo-400 hover:text-indigo-300 text-xs font-bold hover:underline transition-colors"
            >
              Configure Grid View
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex flex-col items-center text-center">
              <span className="text-lg font-bold text-emerald-400">{vacantCount}</span>
              <span className="text-xs text-emerald-300/80 font-medium font-display">Ready Rooms</span>
            </div>
            <div className="bg-[#ffa200]/10 p-4 rounded-xl border border-[#ffa200]/20 flex flex-col items-center text-center">
              <span className="text-lg font-bold text-[#ffa200]">{occupiedCount}</span>
              <span className="text-xs text-[#ffa200]/80 font-medium font-display">Occupied Rooms</span>
            </div>
            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex flex-col items-center text-center">
              <span className="text-lg font-bold text-blue-400">{cleaningCount}</span>
              <span className="text-xs text-blue-300/80 font-medium font-display">In Cleaning</span>
            </div>
            <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 flex flex-col items-center text-center">
              <span className="text-lg font-bold text-rose-400">{maintenanceCount}</span>
              <span className="text-xs text-rose-300/80 font-medium font-display">On Hold</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between text-sm text-white/70">
            <div>
              <span className="font-semibold text-white text-base">Need to generate a billing receipt?</span>
              <p className="text-xs text-white/50 mt-1">Quickly select a room to check-out or create manually in the Billing page.</p>
            </div>
            <button 
              onClick={() => setActiveTab('billing')}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
            >
              Go to Invoices
            </button>
          </div>

          {/* Upcoming Checkouts & Auto-Drafts */}
          {(upcomingCheckouts.length > 0 || draftInvoices.length > 0) && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="font-semibold text-white text-base font-display flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Action Required: Checkouts & Drafts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {upcomingCheckouts.map(room => (
                  <div key={`checkout-${room.id}`} className="bg-white/5 border border-amber-500/30 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white/10" onClick={() => onSelectRoom(room.id)}>
                    <div>
                      <p className="text-xs font-bold text-white">Room {room.id} <span className="text-[10px] text-white/50 font-normal ml-1">({room.guestName})</span></p>
                      <p className="text-[10px] text-amber-300 mt-0.5">Scheduled for checkout today</p>
                    </div>
                    <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Due</span>
                  </div>
                ))}
                
                {draftInvoices.map(inv => (
                  <div key={`draft-${inv.id}`} className="bg-white/5 border border-indigo-500/30 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white/10" onClick={() => setActiveTab('billing')}>
                    <div>
                      <p className="text-xs font-bold text-white">Room {inv.roomNumber} <span className="text-[10px] text-white/50 font-normal ml-1">({inv.customerName})</span></p>
                      <p className="text-[10px] text-indigo-300 mt-0.5">Auto-drafted Invoice</p>
                    </div>
                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Draft</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>

        {/* Maintenance holds checklist list */}
        <div className="glass-panel p-6 rounded-2xl shadow-lg lg:col-span-4 flex flex-col">
          <div className="border-b border-white/10 pb-3 flex justify-between items-center">
            <h3 className="font-semibold text-white text-base font-display">Service Holds</h3>
            <span className="text-xs font-mono bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded-full font-bold">
              {activeMaintenanceRooms.length} Active
            </span>
          </div>

          {activeMaintenanceRooms.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white/30">
              <CheckCircle className="h-10 w-10 text-emerald-400 mb-2" />
              <p className="text-xs font-semibold text-white/80 font-display">All Rooms Operational!</p>
              <p className="text-[11px] text-white/40 mt-1">No rooms are currently flagged for maintenance repair.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-[220px] pr-1">
              {activeMaintenanceRooms.map((room) => (
                <div 
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className="p-3 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all rounded-xl cursor-pointer flex justify-between items-start"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white/90">Room {room.id} - <span className="font-mono text-[10px] text-white/40">{room.roomType}</span></h4>
                    <p className="text-xs font-medium text-rose-300 mt-1">{room.maintenanceIssue || 'Service required'}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    room.maintenancePriority === 'High / Urgent' 
                      ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300' 
                      : room.maintenancePriority === 'Medium' 
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' 
                      : 'bg-white/5 border border-white/10 text-white/60'
                  }`}>
                    {room.maintenancePriority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
