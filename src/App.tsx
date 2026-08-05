/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, Suspense, lazy } from 'react';
import { Room, Invoice, SystemSettings } from './types';
import SideNavBar from './components/SideNavBar';
import TopNavBar from './components/TopNavBar';
import RoomDrawer from './components/RoomDrawer';
import PrintableInvoiceModal from './components/PrintableInvoiceModal';
import { Settings, Save, HelpCircle, Building } from 'lucide-react';
import { Toaster, toast } from 'sonner';

const DashboardView = lazy(() => import('./components/DashboardView'));
const RoomManagementView = lazy(() => import('./components/RoomManagementView'));
const BillingInvoicesView = lazy(() => import('./components/BillingInvoicesView'));
const NewInvoiceFormView = lazy(() => import('./components/NewInvoiceFormView'));
const TaxFilingView = lazy(() => import('./components/TaxFilingView'));

// Local SQLite backend, accessed via IPC (see electron/db.cjs, electron/preload.cjs)
import { db } from './lib/db';

const DEFAULT_SETTINGS: SystemSettings = {
  address: 'Flat No.: 3, LAKSHMIMANAGARAM MIDDLE STREET, Arumuganeri, Thoothukudi, Tamil Nadu - 628202',
  phone: '+91 86670 92950',
  gstin: '33KKRPS8566Q1ZK',
  cgstPercentage: 9,
  sgstpercentage: 9,
  defaultcheckintime: '12:00',
  defaultcheckouttime: '11:00',
  bedsheetSmallPrice: 150,
  bedsheetLargePrice: 250,
  extraBedPrice: 500,
  towelPrice: 50,
  pillowCoverPrice: 30
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('rooms');

  // Collapsible Sidebar State - default is expanded
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Mobile navigation overlay/drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Persistence state Core
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // System Settings State
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Overlay indicators
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [previewingInvoice, setPreviewingInvoice] = useState<Invoice | null>(null);

  // Prefill Invoice Data for navigation pre-population
  const [prefillInvoice, setPrefillInvoice] = useState<{
    roomId?: string;
    guestName?: string;
    guestGst?: string;
    numberOfPeople?: number;
    checkInDate?: string;
    checkOutDate?: string;
    extraBedsCount?: number;
  } | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Load everything from the local database on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [loadedRooms, loadedInvoices, loadedSettings] = await Promise.all([
          db.getRooms(),
          db.getInvoices(),
          db.getSettings(),
        ]);
        setRooms(loadedRooms);
        setInvoices(loadedInvoices);
        const { id: _id, ...settingsRest } = loadedSettings;
        setSettings(settingsRest as SystemSettings);
        setLoadError(null);
      } catch (error: any) {
        console.error('[SekarInn] Failed to load local database:', error);
        setLoadError(error.message || String(error));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Automated Checkout Monitor
  useEffect(() => {
    if (!rooms.length || !settings) return;

    const checkOverdueRooms = async () => {
      const now = new Date();
      let hasChanges = false;
      const updatedRooms = [...rooms];

      for (let i = 0; i < updatedRooms.length; i++) {
        const room = updatedRooms[i];

        // Auto-transition booked → occupied when check-in date arrives
        if (room.status === 'booked' && room.checkInDate) {
          const checkinDate = new Date(room.checkInDate);
          if (!isNaN(checkinDate.getTime()) && now >= checkinDate) {
            const updatedRoom = { ...room, status: 'occupied' as const };
            try {
              await db.saveRoom(updatedRoom);
              updatedRooms[i] = updatedRoom;
              hasChanges = true;
            } catch (err) {
              console.error("Auto-booking transition failed", err);
            }
          }
        }

        if (room.status === 'occupied' && room.checkOutDate) {
          const checkoutDate = new Date(room.checkOutDate);

          if (!isNaN(checkoutDate.getTime()) && now > checkoutDate) {
             // AUTO DRAFT INVOICE
             const generatedId = `SI-${invoices.filter(i => !i.id.startsWith('TAX-')).length + 1}`;

             // Safely calculate nights
             const inDate = new Date(room.checkInDate || '');
             const diff = checkoutDate.getTime() - (isNaN(inDate.getTime()) ? checkoutDate.getTime() : inDate.getTime());
             const totalNights = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));

             // Build line items first so totals are correct
             const autoLineItems = [
               {
                 id: 'li-1',
                 description: `Room Charges - ${room.roomType}`,
                 qty: totalNights,
                 unitPrice: room.basePrice,
                 total: totalNights * room.basePrice
               }
             ];
             if (room.extraBedsCount && room.extraBedsCount > 0) {
               autoLineItems.push({
                 id: 'li-2',
                 description: 'Extra Bed Charges',
                 qty: totalNights * room.extraBedsCount,
                 unitPrice: room.extraBedPrice || 500,
                 total: totalNights * room.extraBedsCount * (room.extraBedPrice || 500)
               });
             }
             const autoSubtotal = autoLineItems.reduce((sum, li) => sum + li.total, 0);
             const autoCgst = autoSubtotal * (settings.cgstPercentage / 100);
             const autoSgst = autoSubtotal * (settings.sgstpercentage / 100);

             const newInvoice: Invoice = {
               id: generatedId,
               customerName: room.guestName || 'Unknown Guest',
               customerEmail: '',
               customerPhone: '',
               customerGst: undefined,
               roomNumber: room.id,
               roomType: room.roomType,
               checkInDate: room.checkInDate || '',
               checkOutDate: room.checkOutDate || '',
               date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
               totalNights,
               lineItems: autoLineItems,
               notes: 'Auto-drafted by system due to late checkout.',
               subtotal: autoSubtotal,
               cgst: autoCgst,
               sgst: autoSgst,
               grandTotal: autoSubtotal + autoCgst + autoSgst,
               status: 'Draft'
             };

             try {
                const taxCopy = { ...newInvoice, id: `TAX-${generatedId}` };
                await db.saveInvoice(newInvoice);
                await db.saveInvoice(taxCopy);
                setInvoices(prev => [newInvoice, taxCopy, ...prev]);
                toast.warning(`Room ${room.id} checkout time reached! Draft invoice auto-generated.`, { duration: 8000 });
             } catch (err) {
                console.error("Auto invoice failed", err);
             }

             // CHANGE ROOM STATUS TO CLEANING
             const updatedRoom = {
               ...room,
               status: 'cleaning' as const,
               guestName: '',
               guestId: '',
               checkInDate: '',
               checkOutDate: '',
               amountDue: 0,
               extraBedsCount: 0,
               expectedTime: '14:00 PM'
             };
             try {
                await db.saveRoom(updatedRoom);
                updatedRooms[i] = updatedRoom;
                hasChanges = true;
             } catch (err) {
                console.error("Auto update room failed", err);
             }
          }
        }
      }

      if (hasChanges) {
        setRooms(updatedRooms);
      }
    };

    const interval = setInterval(checkOverdueRooms, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [rooms, settings]);

  // Selectors
  const selectedRoomObj = rooms.find(r => r.id === selectedRoomId) || null;

  // Handles Saving a Room change from Side Drawer
  const handleSaveRoomStatus = async (updatedRoom: Room, createInvoice?: boolean) => {
    try {
      await db.saveRoom(updatedRoom);

      setSelectedRoomId(null);
      // Trigger a local state update immediately for snappy UI
      setRooms(prev => prev.map(r => r.id === updatedRoom.id ? updatedRoom : r));

      if (createInvoice) {
        setPrefillInvoice({
          roomId: updatedRoom.id,
          guestName: updatedRoom.guestName,
          guestGst: updatedRoom.guestGst,
          numberOfPeople: updatedRoom.numberOfPeople,
          checkInDate: updatedRoom.checkInDate,
          checkOutDate: updatedRoom.checkOutDate,
          extraBedsCount: updatedRoom.extraBedsCount,
        });
        setActiveTab('new-invoice');
      }
    } catch (error: any) {
      console.error("Room Update Error:", error);
      toast.error("Failed to update room: " + error.message);
    }
  };

  // Handles Adding a Custom Room
  const handleAddRoom = async (newRoom: Room) => {
    if (rooms.some(r => r.id === newRoom.id)) {
      toast.error(`Room ${newRoom.id} already exists!`);
      return;
    }
    try {
      await db.saveRoom(newRoom);
      setRooms(prev => [...prev, newRoom].sort((a, b) => a.id.localeCompare(b.id)));
    } catch (error: any) {
      console.error("Add Room Error:", error);
      toast.error("Failed to add room: " + error.message);
    }
  };

  // Handles Deleting a Room
  const handleDeleteRoom = async (roomId: string) => {
    try {
      await db.deleteRoom(roomId);
      setSelectedRoomId(null);
      setRooms(prev => prev.filter(r => r.id !== roomId));
      toast.success(`Room ${roomId} was deactivated and removed from the register.`);
    } catch (error: any) {
      console.error("Delete Room Error:", error);
      toast.error("Failed to delete room: " + error.message);
    }
  };

  // Handles Database Wiping
  const handleResetDatabase = async () => {
    if (confirm("Are you sure you want to completely WIPE all data? This clears all invoices and resets the hotel rooms inventory to standard vacant rooms for fresh setup.")) {
      try {
        setIsLoading(true);
        const { rooms: freshRooms, invoices: freshInvoices } = await db.resetDatabase();
        setRooms(freshRooms);
        setInvoices(freshInvoices);
        setSelectedRoomId(null);
        toast.success("Database wiped successfully! System is running fresh with standard vacant parameters.");
      } catch (error: any) {
        console.error("Database Wipe Error:", error);
        toast.error("Failed to wipe database: " + error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handles saving system configurations
  const handleSaveSettings = async (updatedSettings: SystemSettings) => {
    try {
      await db.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      console.error("Settings Update Error:", error);
      toast.error("Failed to save settings: " + (error.message || String(error)));
      throw error;
    }
  };

  // Handles Saving a New Invoice generated from form
  const handleSaveInvoice = async (newInvoice: Invoice, originalId?: string) => {
    try {
      const cleanId = newInvoice.id.replace(/^#/, '');
      const pairIdFor = (id: string) => (id.startsWith('TAX-') ? id.slice(4) : `TAX-${id}`);

      if (originalId && originalId !== cleanId) {
        // Renaming an existing invoice — move both the record being edited
        // and its billing/tax counterpart to the new id, deleting the old
        // pair so we don't leave orphaned duplicates behind.
        const oldPairId = pairIdFor(originalId);
        const newPairId = pairIdFor(cleanId);

        await Promise.all([
          db.deleteInvoice(originalId),
          db.deleteInvoice(oldPairId),
        ]);
        await Promise.all([
          db.saveInvoice({ ...newInvoice, id: cleanId }),
          db.saveInvoice({ ...newInvoice, id: newPairId }),
        ]);

        setInvoices(prev => [
          { ...newInvoice, id: cleanId },
          { ...newInvoice, id: newPairId },
          ...prev.filter(i => i.id !== originalId && i.id !== oldPairId),
        ]);
      } else if (originalId) {
        // Editing an existing record (billing or tax) in place — update only that one
        await db.saveInvoice({ ...newInvoice, id: cleanId });
        setInvoices(prev => prev.map(i => i.id === cleanId ? { ...newInvoice, id: cleanId } : i));
      } else {
        // Brand-new invoice — create billing copy + independent tax copy
        const taxId = `TAX-${cleanId}`;
        const billingRecord = { ...newInvoice, id: cleanId };
        const taxRecord = { ...newInvoice, id: taxId };
        await Promise.all([
          db.saveInvoice(billingRecord),
          db.saveInvoice(taxRecord),
        ]);
        setInvoices(prev => [
          { ...newInvoice, id: cleanId },
          { ...newInvoice, id: taxId },
          ...prev,
        ]);
      }

      // Return to Tax Filing if we were editing a tax copy
      setActiveTab(cleanId.startsWith('TAX-') ? 'tax-filing' : 'billing');
      setPreviewingInvoice({ ...newInvoice, id: cleanId });
    } catch (error: any) {
      console.error("Invoice Save Error:", error);
      toast.error("Failed to save invoice: " + error.message);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (confirm(`Are you sure you want to delete Invoice ${invoiceId}? This is irreversible.`)) {
      try {
        const cleanId = invoiceId.replace(/^#/, '');
        await db.deleteInvoice(cleanId);
        setInvoices(prev => prev.filter(i => i.id !== cleanId));
      } catch (error: any) {
        console.error("Invoice Delete Error:", error);
        toast.error("Failed to delete invoice: " + error.message);
      }
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      const cleanId = invoiceId.replace(/^#/, '');
      await db.updateInvoiceStatus(cleanId, newStatus);
      setInvoices(prev => prev.map(i => i.id === cleanId ? { ...i, status: newStatus } : i));
    } catch (error: any) {
      console.error("Invoice Update Error:", error);
      toast.error("Failed to update invoice status: " + error.message);
    }
  };

  // Render view router
  const renderActiveView = () => {
    return (
        <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-white/50"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
            {activeTab === 'dashboard' && (
              <DashboardView
                rooms={rooms}
                invoices={invoices}
                setActiveTab={setActiveTab}
                onSelectRoom={(id) => setSelectedRoomId(id)}
              />
            )}

            {activeTab === 'rooms' && (
              <RoomManagementView
                rooms={rooms}
                onSelectRoom={(roomId) => setSelectedRoomId(roomId)}
                onAddRoom={handleAddRoom}
                onUpdateRoom={handleSaveRoomStatus}
                settings={settings}
              />
            )}

            {activeTab === 'billing' && (
              <BillingInvoicesView
                rooms={rooms}
                invoices={invoices.filter(i => !i.id.startsWith('TAX-'))}
                taxInvoices={[]}
                settings={settings}
                onCreateInvoice={(prefill) => {
                  setPrefillInvoice(prefill || null);
                  setEditingInvoice(null);
                  setActiveTab('new-invoice');
                }}
                onEditInvoice={(invoice) => {
                  setEditingInvoice(invoice);
                  setPrefillInvoice(null);
                  setActiveTab('new-invoice');
                }}
                onEditTaxInvoice={() => {}}
                onViewInvoice={(invoice) => setPreviewingInvoice(invoice)}
                onDeleteInvoice={handleDeleteInvoice}
                onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
              />
            )}

            {activeTab === 'tax-filing' && (
              <TaxFilingView
                taxInvoices={invoices.filter(i => i.id.startsWith('TAX-'))}
                settings={settings}
                onEditTaxInvoice={(invoice) => {
                  setEditingInvoice(invoice);
                  setPrefillInvoice(null);
                  setActiveTab('new-invoice');
                }}
                onViewInvoice={(invoice) => setPreviewingInvoice(invoice)}
                onDeleteTaxInvoice={handleDeleteInvoice}
              />
            )}

            {activeTab === 'new-invoice' && (
              <NewInvoiceFormView
                rooms={rooms}
                invoices={invoices}
                prefillData={prefillInvoice}
                editingInvoice={editingInvoice}
                nextInvoiceNumber={invoices.filter(i => !i.id.startsWith('TAX-')).length + 1}
                onSaveInvoice={(invoice, originalId) => {
                  handleSaveInvoice(invoice, originalId);
                  setEditingInvoice(null);
                }}
                onCancel={() => {
                  setPrefillInvoice(null);
                  setEditingInvoice(null);
                  setActiveTab('billing');
                }}
                settings={settings}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                onResetDatabase={handleResetDatabase}
                roomsCount={rooms.length}
                invoicesCount={invoices.length}
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}
          </Suspense>
        </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center font-sans overflow-hidden">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-t-indigo-500 border-indigo-500/10 animate-spin"></div>
          <p className="text-sm text-white/40 font-mono">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center font-sans overflow-hidden p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <p className="text-sm text-white/70 font-mono">Couldn't open the local database.</p>
          <p className="text-xs text-white/40">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 font-semibold rounded-xl text-sm transition-all cursor-pointer active:scale-95"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden relative select-none" id="app-canvas-container">

      {/* Ambient Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[140px]"></div>
        <div className="absolute top-1/4 right-1/4 w-[40%] h-[40%] bg-purple-600/8 rounded-full blur-[100px] rotate-45"></div>
        <div className="absolute bottom-1/4 left-1/3 w-[30%] h-[30%] bg-blue-500/15 rounded-full blur-[80px]"></div>
      </div>

      {/* Collapsible SideNavBar */}
      <SideNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <Toaster position="top-right" richColors />

      {/* Primary Layout Segment */}
      <div
        className={`flex-1 transition-all duration-300 ml-0 ${
          isSidebarCollapsed ? 'md:ml-[80px]' : 'md:ml-[260px]'
        } flex flex-col min-h-screen relative z-10 overflow-x-hidden`}
        id="app-main-layout"
      >

        {/* Sticky Top Bar Header */}
        <TopNavBar
          activeTab={activeTab}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Major Content Canvas */}
        <main className="p-8 max-w-[1300px] w-full flex-1 overflow-x-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Drawer: Room Details Trigger Overlay */}
      {selectedRoomId && (
        <RoomDrawer
          room={selectedRoomObj}
          onClose={() => setSelectedRoomId(null)}
          onSave={handleSaveRoomStatus}
          onDelete={handleDeleteRoom}
          settings={settings}
        />
      )}

      {/* Modal: Printable Invoice A4 Trigger Overlay */}
      {previewingInvoice && (
        <PrintableInvoiceModal
          invoice={previewingInvoice}
          onClose={() => setPreviewingInvoice(null)}
          settings={settings}
        />
      )}

    </div>
  );
}

// Inline settings layouts to avoid adding unnecessary extra files
interface SettingsViewProps {
  onResetDatabase: () => void;
  roomsCount: number;
  invoicesCount: number;
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => Promise<void>;
}

function SettingsView({ onResetDatabase, roomsCount, invoicesCount, settings, onSaveSettings }: SettingsViewProps) {
  const [address, setAddress] = useState(settings.address);
  const [gstin, setGstin] = useState(settings.gstin);
  const [phone, setPhone] = useState(settings.phone);
  const [cgstPercentage, setCgstPercentage] = useState(settings.cgstPercentage.toString());
  const [sgstpercentage, setSgstPercentage] = useState(settings.sgstpercentage.toString());
  const [defaultcheckintime, setDefaultCheckInTime] = useState(settings.defaultcheckintime || '12:00');
  const [defaultcheckouttime, setDefaultCheckOutTime] = useState(settings.defaultcheckouttime || '11:00');
  const [bedsheetSmallPrice, setBedsheetSmallPrice] = useState((settings.bedsheetSmallPrice ?? 150).toString());
  const [bedsheetLargePrice, setBedsheetLargePrice] = useState((settings.bedsheetLargePrice ?? 250).toString());
  const [extraBedPrice, setExtraBedPrice] = useState((settings.extraBedPrice ?? 500).toString());
  const [towelPrice, setTowelPrice] = useState((settings.towelPrice ?? 50).toString());
  const [pillowCoverPrice, setPillowCoverPrice] = useState((settings.pillowCoverPrice ?? 30).toString());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAddress(settings.address);
    setGstin(settings.gstin);
    setPhone(settings.phone);
    setCgstPercentage(settings.cgstPercentage.toString());
    setSgstPercentage(settings.sgstpercentage.toString());
    setDefaultCheckInTime(settings.defaultcheckintime || '12:00');
    setDefaultCheckOutTime(settings.defaultcheckouttime || '11:00');
    setBedsheetSmallPrice((settings.bedsheetSmallPrice ?? 150).toString());
    setBedsheetLargePrice((settings.bedsheetLargePrice ?? 250).toString());
    setExtraBedPrice((settings.extraBedPrice ?? 500).toString());
    setTowelPrice((settings.towelPrice ?? 50).toString());
    setPillowCoverPrice((settings.pillowCoverPrice ?? 30).toString());
  }, [settings]);

  const handleSaveSettings = async () => {
    const cgst = parseFloat(cgstPercentage);
    const sgst = parseFloat(sgstpercentage);
    const bSmall = parseFloat(bedsheetSmallPrice);
    const bLarge = parseFloat(bedsheetLargePrice);
    const eBed = parseFloat(extraBedPrice);
    const towelVal = parseFloat(towelPrice);
    const pillowVal = parseFloat(pillowCoverPrice);

    if (isNaN(cgst) || cgst < 0 || cgst > 100) {
      toast.error("Please enter a valid CGST percentage between 0 and 100.");
      return;
    }
    if (isNaN(sgst) || sgst < 0 || sgst > 100) {
      toast.error("Please enter a valid SGST percentage between 0 and 100.");
      return;
    }
    if (isNaN(bSmall) || bSmall < 0) {
      toast.error("Please enter a valid Bedsheet (Small) price.");
      return;
    }
    if (isNaN(bLarge) || bLarge < 0) {
      toast.error("Please enter a valid Bedsheet (Large) price.");
      return;
    }
    if (isNaN(eBed) || eBed < 0) {
      toast.error("Please enter a valid Extra Bed price.");
      return;
    }
    if (isNaN(towelVal) || towelVal < 0) {
      toast.error("Please enter a valid Towel price.");
      return;
    }
    if (isNaN(pillowVal) || pillowVal < 0) {
      toast.error("Please enter a valid Pillow cover price.");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveSettings({
        address,
        phone,
        gstin,
        cgstPercentage: cgst,
        sgstpercentage: sgst,
        defaultcheckintime,
        defaultcheckouttime,
        bedsheetSmallPrice: bSmall,
        bedsheetLargePrice: bLarge,
        extraBedPrice: eBed,
        towelPrice: towelVal,
        pillowCoverPrice: pillowVal
      });
    } catch (error) {
      // error toast already shown by parent handler
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="settings-view">
      <div>
        <h3 className="text-2xl font-bold text-white tracking-tight font-display">System Settings</h3>
        <p className="text-sm text-white/50 mt-1">Manage branch parameters, billing values, and general configurations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Core settings form */}
        <div className="glass-panel p-6 rounded-2xl shadow-lg md:col-span-8 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Settings className="h-5 w-5 text-indigo-400" />
            <h4 className="text-base font-bold text-white font-display">General Information</h4>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Company Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1 font-body-md">Contact Landline</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">GSTIN Registration</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">CGST Rate (%)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={cgstPercentage}
                  onChange={(e) => setCgstPercentage(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">SGST Rate (%)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={sgstpercentage}
                  onChange={(e) => setSgstPercentage(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-white/10 pb-3 mt-6">
              <Settings className="h-5 w-5 text-indigo-400" />
              <h4 className="text-base font-bold text-white font-display">Service & Amenities Pricing</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Bedsheet (Small) Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={bedsheetSmallPrice}
                  onChange={(e) => setBedsheetSmallPrice(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Bedsheet (Large) Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={bedsheetLargePrice}
                  onChange={(e) => setBedsheetLargePrice(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Extra Bed Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={extraBedPrice}
                  onChange={(e) => setExtraBedPrice(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Towel Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={towelPrice}
                  onChange={(e) => setTowelPrice(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Pillow Cover Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={pillowCoverPrice}
                  onChange={(e) => setPillowCoverPrice(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-white/10 pb-3 mt-6">
              <Settings className="h-5 w-5 text-emerald-400" />
              <h4 className="text-base font-bold text-white font-display">Workflow Settings</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Standard Check-In Time</label>
                <input
                  type="time"
                  value={defaultcheckintime}
                  onChange={(e) => setDefaultCheckInTime(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Standard Check-Out Time</label>
                <input
                  type="time"
                  value={defaultcheckouttime}
                  onChange={(e) => setDefaultCheckOutTime(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveSettings}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 font-semibold rounded-xl text-sm flex items-center gap-2 mt-2 transition-all cursor-pointer shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 rounded-full border-2 border-t-white border-white/10 animate-spin"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

        {/* General Guidelines Callout box */}
        <div className="glass-panel p-6 rounded-2xl shadow-lg md:col-span-4 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 border-b border-white/10 pb-3 text-white font-bold font-display">
              <Building className="h-5 w-5 text-indigo-400" />
              <span>Sekar Inn Branch info</span>
            </div>

            <p className="text-xs text-white/60 mt-3 leading-relaxed">
              These properties are automatically added to check-out sheets and printed invoice summaries when generated by desk staff.
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-start gap-2.5 text-xs text-white/70">
            <HelpCircle className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span>Tax properties are set to standard Indian GST ({cgstPercentage}% CGST + {sgstpercentage}% SGST).</span>
          </div>
        </div>

      </div>


    </div>
  );
}
