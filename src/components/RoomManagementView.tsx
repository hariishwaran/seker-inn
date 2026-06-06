/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Room } from '../types';
import { Plus, X, Search, Calendar, User, Minus } from 'lucide-react';

interface RoomManagementViewProps {
  rooms: Room[];
  onSelectRoom: (roomId: string) => void;
  onAddRoom: (newRoom: Room) => void;
  onUpdateRoom?: (updatedRoom: Room, createInvoice?: boolean) => void;
}

export default function RoomManagementView({ 
  rooms, 
  onSelectRoom, 
  onAddRoom,
  onUpdateRoom 
}: RoomManagementViewProps) {
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState<number>(1);
  const [newRoomType, setNewRoomType] = useState('Triple Room');
  const [newRoomIsAC, setNewRoomIsAC] = useState(true);
  const [newRoomPrice, setNewRoomPrice] = useState(2500);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Check-in State
  const [quickCheckInRoom, setQuickCheckInRoom] = useState<Room | null>(null);
  const [quickGuestName, setQuickGuestName] = useState('');
  const [quickGuestId, setQuickGuestId] = useState('');
  const [quickCheckInDate, setQuickCheckInDate] = useState('');
  const [quickCheckOutDate, setQuickCheckOutDate] = useState('');
  const [quickExtraBedsCount, setQuickExtraBedsCount] = useState(0);
  const [quickCreateInvoice, setQuickCreateInvoice] = useState(false);

  const handleOpenQuickCheckIn = (room: Room) => {
    setQuickCheckInRoom(room);
    setQuickGuestName('');
    setQuickGuestId('');
    setQuickCreateInvoice(false);
    
    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = String(today.getMonth() + 1).padStart(2, '0');
    const tDay = String(today.getDate()).padStart(2, '0');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tmYear = tomorrow.getFullYear();
    const tmMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tmDay = String(tomorrow.getDate()).padStart(2, '0');
    
    setQuickCheckInDate(`${tYear}-${tMonth}-${tDay}`);
    setQuickCheckOutDate(`${tmYear}-${tmMonth}-${tmDay}`);
    setQuickExtraBedsCount(0);
  };

  const handleSaveQuickCheckIn = (e: FormEvent) => {
    e.preventDefault();
    if (!quickCheckInRoom || !onUpdateRoom) return;

    if (!quickGuestName.trim()) {
      alert("Please provide a valid guest name.");
      return;
    }

    // Compute stay amount (1 night minimum)
    let amount = quickCheckInRoom.basePrice || 2500;
    try {
      const d1 = new Date(quickCheckInDate);
      const d2 = new Date(quickCheckOutDate);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diff = d2.getTime() - d1.getTime();
        const nights = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
        const extraBedsTotal = quickExtraBedsCount * (quickCheckInRoom.extraBedPrice || 500);
        amount = nights * (quickCheckInRoom.basePrice + extraBedsTotal);
      }
    } catch (_) {
      // Safe failover
    }

    const updatedRoom: Room = {
      ...quickCheckInRoom,
      status: 'occupied',
      guestName: quickGuestName.trim(),
      guestId: quickGuestId.trim(),
      checkInDate: quickCheckInDate,
      checkOutDate: quickCheckOutDate,
      extraBedsCount: quickExtraBedsCount,
      amountDue: amount,
    };

    onUpdateRoom(updatedRoom, quickCreateInvoice);
    setQuickCheckInRoom(null);
  };

  // Counts computed dynamically
  const vacantCount = rooms.filter(r => r.status === 'vacant').length;
  const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
  const cleaningCount = rooms.filter(r => r.status === 'cleaning').length;
  const maintenanceCount = rooms.filter(r => r.status === 'maintenance').length;

  const floors = [
    { value: 'all', label: 'All Floors' },
    { value: 1, label: 'First Floor' },
    { value: 2, label: 'Second Floor' },
  ];

  // Group rooms by floornum
  const groupRoomsByFloor = () => {
    const floorsMap: Record<number, Room[]> = {};
    
    // Filter rooms by state floor and search query (ID or guest name)
    const filtered = rooms.filter((room) => {
      if (selectedFloor !== 'all' && room.floor !== selectedFloor) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = room.id.toLowerCase().includes(query);
        const matchesGuest = room.guestName ? room.guestName.toLowerCase().includes(query) : false;
        return matchesId || matchesGuest;
      }
      return true;
    });

    filtered.forEach((room) => {
      if (!floorsMap[room.floor]) {
        floorsMap[room.floor] = [];
      }
      floorsMap[room.floor].push(room);
    });

    return Object.entries(floorsMap).sort(([f1], [f2]) => Number(f1) - Number(f2));
  };

  const getStatusBadge = (status: Room['status']) => {
    switch (status) {
      case 'vacant':
        return (
          <span className="bg-emerald-500/10 text-emerald-300 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/25">
            Vacant
          </span>
        );
      case 'occupied':
        return (
          <span className="bg-amber-500/10 text-amber-300 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-[#ffa200]/25">
            Occupied
          </span>
        );
      case 'cleaning':
        return (
          <span className="bg-blue-500/10 text-blue-300 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-blue-500/25">
            Cleaning
          </span>
        );
      case 'maintenance':
        return (
          <span className="bg-rose-500/10 text-rose-300 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-rose-500/25">
            Hold
          </span>
        );
    }
  };

  const getStatusBgColor = (status: Room['status']) => {
    switch (status) {
      case 'vacant':
        return 'bg-emerald-400';
      case 'occupied':
        return 'bg-[#ffa200]';
      case 'cleaning':
        return 'bg-blue-450';
      case 'maintenance':
        return 'bg-rose-500';
    }
  };

  return (
    <div className="space-y-6" id="room-management-view">
      {/* Header Filters & Stats */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
        {/* Floor selector buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          {floors.map((floor) => (
            <button
              key={floor.value}
              onClick={() => setSelectedFloor(floor.value as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer ${
                (floor.value === 'all' && selectedFloor === 'all') || selectedFloor === floor.value
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
              id={`floor-filter-${floor.value}`}
            >
              {floor.label}
            </button>
          ))}
          
          <button
            onClick={() => setIsAddingRoom(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            id="btn-add-room-header"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Custom Room</span>
          </button>
        </div>

        {/* Dynamic counts */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 px-3.5 py-1.5 rounded-xl border border-emerald-500/20 shadow-sm text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Available ({vacantCount})</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#ffa200]/10 text-amber-300 px-3.5 py-1.5 rounded-xl border border-[#ffa200]/25 shadow-sm text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffa200]"></span>
            <span>Occupied ({occupiedCount})</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-300 px-3.5 py-1.5 rounded-xl border border-blue-500/20 shadow-sm text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            <span>Cleaning ({cleaningCount})</span>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-300 px-3.5 py-1.5 rounded-xl border border-rose-500/20 shadow-sm text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Maintenance ({maintenanceCount})</span>
          </div>
        </div>
      </section>

      {/* Live search input panel */}
      <div className="relative w-full max-w-md" id="room-search-bar-container">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          placeholder="Search rooms by ID or guest name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#12121e]/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/80 transition-all focus:bg-[#12121e] shadow-md"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white transition-colors cursor-pointer"
            id="clear-search-btn"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Grid view of floors */}
      <div className="space-y-10">
        {groupRoomsByFloor().map(([floorNum, floorRooms]) => {
          const floorLabel = floorNum === '1' ? 'First Floor (AC)' : floorNum === '2' ? 'Second Floor (Non-AC)' : `Floor ${floorNum}`;
          return (
            <section key={floorNum} className="space-y-4 font-display">
              {/* Floor Titles */}
              <div className="flex items-center gap-3 pb-2 border-b border-white/10">
                <h3 className="text-lg font-bold text-white tracking-tight">{floorLabel}</h3>
                <span className="text-xs text-white/60 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-medium">
                  {floorRooms.length} Rooms Total
                </span>
              </div>

              {/* Grid lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {floorRooms.map((room) => {
                  const pulseClass = 
                    room.status === 'vacant' ? 'pulse-vacant' :
                    room.status === 'occupied' ? 'pulse-occupied' :
                    room.status === 'cleaning' ? 'pulse-cleaning' :
                    room.status === 'maintenance' ? 'pulse-maintenance' : '';

                  return (
                    <div
                      key={room.id}
                      onClick={() => onSelectRoom(room.id)}
                      className={`glass-panel p-5 rounded-2xl shadow-lg hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 cursor-pointer relative overflow-hidden group hover:scale-[1.03] ${pulseClass}`}
                      id={`room-card-${room.id}`}
                    >
                      {/* Status side indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusBgColor(room.status)}`}></div>

                    {/* Room title & badge */}
                    <div className="flex justify-between items-start mb-2 pl-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white tracking-tight font-display">{room.id}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          room.isAC 
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/10' 
                            : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/10'
                        }`}>
                          {room.isAC ? 'AC' : 'Non-AC'}
                        </span>
                      </div>
                      {getStatusBadge(room.status)}
                    </div>

                    <div className="flex justify-between items-center pl-1.5 mb-6">
                      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider line-clamp-1">
                        {(room.roomType || '').replace(' (AC)', '').replace(' (Non-AC)', '')}
                      </p>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                        ₹{(room.basePrice ?? 0).toLocaleString('en-IN')}/d
                      </span>
                    </div>

                    {/* Footer operational summaries */}
                    <div className="mt-4 pl-1.5 border-t border-white/5 pt-3">
                      {room.status === 'occupied' && (
                        <div>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Guest</p>
                          <p className="text-sm font-semibold text-white/95 line-clamp-1">{room.guestName}</p>
                          {room.extraBedsCount && room.extraBedsCount > 0 ? (
                            <span className="text-[9px] bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-semibold mt-1 inline-block">
                              +{room.extraBedsCount} Extra Bed
                            </span>
                          ) : null}
                        </div>
                      )}
                      
                      {room.status === 'vacant' && (
                        <div className="flex justify-between items-end">
                          <div className="opacity-40">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Guest</p>
                            <p className="text-sm font-semibold text-white/95">Vacant</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenQuickCheckIn(room);
                            }}
                            className="text-[10px] font-bold bg-indigo-500/10 hover:bg-indigo-500 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-indigo-500/20 hover:border-indigo-500 transition-all cursor-pointer md:opacity-0 group-hover:opacity-100 focus:opacity-100 opacity-100 flex items-center gap-1"
                            id={`btn-quick-check-in-${room.id}`}
                          >
                            <span>Quick Check-in</span>
                          </button>
                        </div>
                      )}

                      {room.status === 'cleaning' && (
                        <div>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Expected by</p>
                          <p className="text-sm font-semibold text-white/95">{room.expectedTime || '14:00 PM'}</p>
                        </div>
                      )}

                      {room.status === 'maintenance' && (
                        <div>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Issue</p>
                          <p className="text-sm font-semibold text-rose-300 line-clamp-1">{room.maintenanceIssue || 'Service holding'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </section>
          );
        })}

        {groupRoomsByFloor().length === 0 && (
          <div className="text-center py-12 text-white/40 bg-white/5 border border-white/10 rounded-2xl font-display">
            No rooms matched the current filter.
          </div>
        )}
      </div>

      {/* Add Custom Room Modal */}
      {isAddingRoom && (
        <div className="fixed inset-0 bg-[#020205]/80 backdrop-blur-md flex items-center justify-center p-4 z-[90]">
          <div className="glass-panel max-w-sm w-full p-6 rounded-2xl border border-white/10 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setIsAddingRoom(false)}
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-bold text-white font-display">Add Custom Room</h3>
            <p className="text-xs text-white/50">Configure a brand new room in the hotel inventory ledger.</p>
            
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Room Number / ID</label>
                <input
                  type="text"
                  placeholder="e.g. 111, 204"
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value.trim())}
                  className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Floor Level</label>
                  <select
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(Number(e.target.value))}
                    className="w-full border border-white/10 bg-[#12121e] text-white rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                  >
                    <option value={1}>1st Floor</option>
                    <option value={2}>2nd Floor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">AC Preference</label>
                  <select
                    value={newRoomIsAC ? "true" : "false"}
                    onChange={(e) => {
                      const isAcVal = e.target.value === "true";
                      setNewRoomIsAC(isAcVal);
                      // Suggest smart base prices based on AC/Non-AC selection for Sekar Inn standard lists
                      if (isAcVal) {
                        setNewRoomPrice(2500);
                      } else {
                        setNewRoomPrice(1500);
                      }
                    }}
                    className="w-full border border-white/10 bg-[#12121e] text-white rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                  >
                    <option value="true">Air Conditioned (AC)</option>
                    <option value="false">Non-AC Room</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Room Type Category</label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  className="w-full border border-white/10 bg-[#12121e] text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="Triple Room">Triple Room</option>
                  <option value="Double Room">Double Room</option>
                  <option value="Four Sharing">Four Sharing</option>
                  <option value="Queen Suite (5 sharing)">Queen Suite (5 sharing)</option>
                  <option value="King Suite (6 sharing)">King Suite (6 sharing)</option>
                  <option value="10 Sharing">10 Sharing</option>
                  <option value="Driver Room (triple)">Driver Room (triple)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Base Price / Night (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="2500"
                  value={newRoomPrice}
                  onChange={(e) => setNewRoomPrice(Number(e.target.value))}
                  className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAddingRoom(false)}
                className="flex-1 py-2.5 border border-white/10 text-white/60 hover:bg-white/10 rounded-xl text-xs font-semibold select-none cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newRoomId) {
                    alert('Please specify a valid Room ID.');
                    return;
                  }
                  if (rooms.some(r => r.id === newRoomId)) {
                    alert(`Room ${newRoomId} already exists!`);
                    return;
                  }
                  
                  const suffixedType = `${newRoomType} (${newRoomIsAC ? 'AC' : 'Non-AC'})`;
                  onAddRoom({
                    id: newRoomId,
                    floor: newRoomFloor,
                    roomType: suffixedType,
                    status: 'vacant',
                    isAC: newRoomIsAC,
                    basePrice: newRoomPrice,
                    extraBedPrice: 500,
                    extraBedsCount: 0
                  });
                  setNewRoomId('');
                  setIsAddingRoom(false);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-xl text-xs select-none cursor-pointer shadow-md shadow-indigo-500/10 active:scale-95 transition-all"
              >
                Add Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Check-In Modal */}
      {quickCheckInRoom && (
        <div className="fixed inset-0 bg-[#020205]/80 backdrop-blur-md flex items-center justify-center p-4 z-[90]">
          <div className="glass-panel max-w-sm w-full p-6 rounded-2xl border border-white/10 shadow-2xl relative space-y-4 font-display">
            <button 
              onClick={() => setQuickCheckInRoom(null)}
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
              title="Close Modal"
              id="btn-close-quick-check-in"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="text-lg font-bold text-white font-display">Quick Check-in</h3>
            </div>
            <p className="text-xs text-white/50">Immediately assign a guest name and book Room <strong className="text-indigo-400">{quickCheckInRoom.id}</strong>.</p>
            
            <form onSubmit={handleSaveQuickCheckIn} className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <User className="h-3 w-3 text-indigo-400" /> Guest Name <span className="text-indigo-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={quickGuestName}
                  onChange={(e) => setQuickGuestName(e.target.value)}
                  className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  id="input-quick-guest-name"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">
                  Guest ID (Aadhaar / Passport)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ADHR-1234-5678-9012"
                  value={quickGuestId}
                  onChange={(e) => setQuickGuestId(e.target.value)}
                  className="w-full border border-white/10 bg-white/5 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  id="input-quick-guest-id"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-indigo-400" /> Check-In
                  </label>
                  <input
                    type="date"
                    required
                    value={quickCheckInDate}
                    onChange={(e) => setQuickCheckInDate(e.target.value)}
                    className="w-full border border-white/10 bg-[#12121e] text-white rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    id="input-quick-check-in-date"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-indigo-400" /> Check-Out
                  </label>
                  <input
                    type="date"
                    required
                    value={quickCheckOutDate}
                    onChange={(e) => setQuickCheckOutDate(e.target.value)}
                    className="w-full border border-white/10 bg-[#12121e] text-white rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    id="input-quick-check-out-date"
                  />
                </div>
              </div>

              <div className="border-t border-white/10 pt-3">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
                  Extra Beds Configuration (₹500/day)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuickExtraBedsCount(Math.max(0, quickExtraBedsCount - 1))}
                    className="p-1.5 border border-white/10 bg-white/5 hover:bg-white/15 text-white rounded-lg transition-colors cursor-pointer select-none"
                    id="btn-quick-minus-beds"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-black text-white min-w-[20px] text-center font-mono">{quickExtraBedsCount}</span>
                  <button
                    type="button"
                    onClick={() => setQuickExtraBedsCount(quickExtraBedsCount + 1)}
                    className="p-1.5 border border-white/10 bg-white/5 hover:bg-white/15 text-white rounded-lg transition-colors cursor-pointer select-none"
                    id="btn-quick-plus-beds"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 py-0.5 border-t border-white/10 pt-3">
                <input
                  type="checkbox"
                  checked={quickCreateInvoice}
                  onChange={(e) => setQuickCreateInvoice(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-white/15 bg-white/5 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                  id="checkbox-quick-create-invoice"
                />
                <label htmlFor="checkbox-quick-create-invoice" className="text-xs text-white/70 select-none cursor-pointer hover:text-white">
                  Create Invoice automatically for this stay
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setQuickCheckInRoom(null)}
                  className="flex-1 py-2.5 border border-white/10 text-white/60 hover:bg-white/10 rounded-xl text-xs font-semibold select-none cursor-pointer transition-all"
                  id="btn-cancel-quick-check-in"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl text-xs select-none cursor-pointer shadow-md shadow-emerald-500/10 active:scale-95 transition-all"
                  id="btn-save-quick-check-in"
                >
                  Assign Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
