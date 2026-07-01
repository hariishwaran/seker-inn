/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent, Suspense, lazy } from 'react';
import { Room, Invoice, SystemSettings } from './types';
import { initialRooms, initialInvoices } from './data';
import SideNavBar from './components/SideNavBar';
import TopNavBar from './components/TopNavBar';
import RoomDrawer from './components/RoomDrawer';
import PrintableInvoiceModal from './components/PrintableInvoiceModal';
import { Settings, Save, HelpCircle, Building, AlertCircle, ExternalLink, Key, X } from 'lucide-react';
import { Toaster, toast } from 'sonner';

const DashboardView = lazy(() => import('./components/DashboardView'));
const RoomManagementView = lazy(() => import('./components/RoomManagementView'));
const BillingInvoicesView = lazy(() => import('./components/BillingInvoicesView'));
const NewInvoiceFormView = lazy(() => import('./components/NewInvoiceFormView'));
const TaxFilingView = lazy(() => import('./components/TaxFilingView'));

// Real backend imports (Supabase Auth and Postgres)
import { supabase, OperationType } from './lib/supabase';

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
  
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);

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

  // Sync to database on mount
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthChecked(true);
      if (session?.user) {
        setIsLoggedIn(true);
        setIsLoading(true);
        setUserEmail(session.user.email || '');
        const metadata = session.user.user_metadata || {};
        setUserDisplayName(metadata.display_name || '');
        setUserAvatarUrl(metadata.avatar_url || '');
        const userId = session.user.id;
        
        // Sync Rooms Collection
        const fetchRooms = async () => {
          try {
            // Fetch rooms for this user OR orphaned rooms (user_id is null)
            const { data: fetchedRooms, error } = await supabase
              .from('rooms')
              .select('*')
              .or(`user_id.eq.${userId},user_id.is.null`);

            if (error) throw error;

            const allFound = fetchedRooms || [];

            // Claim any orphaned (null user_id) rooms permanently
            const orphanIds = allFound
              .filter((r: any) => !r.user_id)
              .map((r: any) => r.id);

            if (orphanIds.length > 0) {
              await supabase
                .from('rooms')
                .update({ user_id: userId })
                .in('id', orphanIds);
            }

            const existingRoomIds = new Set(allFound.map((r: any) => r.id));
            const missingRooms = initialRooms.filter(r => !existingRoomIds.has(r.id));

            // Seed any default rooms that are still missing
            if (missingRooms.length > 0) {
              for (const room of missingRooms) {
                const { error: seedErr } = await supabase.from('rooms').insert({
                  ...room,
                  user_id: userId
                });
                if (seedErr) {
                  console.error(`[SekarInn] Failed to seed room ${room.id}:`, seedErr);
                }
              }
              // Re-fetch everything after seeding
              const { data: reFetched } = await supabase
                .from('rooms')
                .select('*')
                .eq('user_id', userId);

              const rooms = (reFetched || []).map((r: any) => {
                const { user_id: _uid, ...rest } = r;
                return rest as Room;
              });
              rooms.sort((a: Room, b: Room) => a.id.localeCompare(b.id));
              setRooms(rooms);
            } else {
              const rooms = allFound.map((r: any) => {
                const { user_id: _uid, ...rest } = r;
                return rest as Room;
              });
              rooms.sort((a: Room, b: Room) => a.id.localeCompare(b.id));
              setRooms(rooms);
            }

            setDbError(null);
          } catch (error: any) {
            console.error("[SekarInn] Rooms snapshot error:", error);
            setDbError(error.message || String(error));
            setRooms(initialRooms.map(r => ({ ...r })));
          }
        };

        // Sync Invoices Collection
        const fetchInvoices = async () => {
          try {
            const { data: fetchedInvoices, error } = await supabase
              .from('invoices')
              .select('*')
              .eq('user_id', userId);
            
            if (error) throw error;
            
            if (fetchedInvoices) {
              const formattedInvoices = fetchedInvoices.map((i: any) => {
                const { user_id: _uid, ...rest } = i;
                return rest as Invoice;
              });
              formattedInvoices.sort((a, b) => b.id.localeCompare(a.id));
              setInvoices(formattedInvoices);
            }
          } catch (error) {
            console.error("Invoices fetch error:", error);
          }
        };

        // Sync Settings Document
        const fetchSettings = async () => {
          try {
            const { data: docSnap, error } = await supabase
              .from('settings')
              .select('*')
              .eq('id', 'default')
              .maybeSingle();

            if (error) {
              console.error("[SekarInn] Settings fetch error:", error);
              setSettings(DEFAULT_SETTINGS);
              return;
            }

            if (docSnap) {
              const { user_id, id: _id, ...rest } = docSnap;
              const loadedSettings = rest as SystemSettings;
              
              const decodePercentage = (val: number) => {
                if (val === 0) return 0;
                if (val >= 100) return val / 10000;
                return val;
              };

              loadedSettings.cgstPercentage = decodePercentage(loadedSettings.cgstPercentage || 0);
              loadedSettings.sgstpercentage = decodePercentage(loadedSettings.sgstpercentage || 0);
              setSettings(loadedSettings);
            } else {
              // Seed settings
              const { error: seedErr } = await supabase.from('settings').insert({
                id: 'default',
                user_id: userId,
                ...DEFAULT_SETTINGS
              });
              if (seedErr) {
                console.error("[SekarInn] Settings seed error:", seedErr);
              }
              setSettings(DEFAULT_SETTINGS);
            }
          } catch (error) {
            console.error("Settings fetch error:", error);
            setSettings(DEFAULT_SETTINGS);
          }
        };

        await Promise.all([fetchRooms(), fetchInvoices(), fetchSettings()]);
        setIsLoading(false);

        const channel = supabase.channel('sekarinn-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchRooms())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchInvoices())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchSettings())
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      } else {
        setIsLoggedIn(false);
        setUserEmail('');
        setUserDisplayName('');
        setUserAvatarUrl('');
        setRooms([]);
        setInvoices([]);
        setSettings(DEFAULT_SETTINGS);
        setIsLoading(false);
        setIsAuthChecked(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Automated Checkout Monitor
  useEffect(() => {
    if (!isLoggedIn || !rooms.length || !settings) return;

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
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('rooms').update(updatedRoom).eq('id', room.id).eq('user_id', user.id);
                updatedRooms[i] = updatedRoom;
                hasChanges = true;
              }
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
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                   const taxCopy = { ...newInvoice, id: `TAX-${generatedId}` };
                   await supabase.from('invoices').insert({ ...newInvoice, user_id: user.id });
                   await supabase.from('invoices').insert({ ...taxCopy, user_id: user.id });
                   setInvoices(prev => [newInvoice, taxCopy, ...prev]);
                   toast.warning(`Room ${room.id} checkout time reached! Draft invoice auto-generated.`, { duration: 8000 });
                }
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
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                   await supabase.from('rooms').update(updatedRoom).eq('id', room.id).eq('user_id', user.id);
                   updatedRooms[i] = updatedRoom;
                   hasChanges = true;
                }
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
  }, [rooms, settings, isLoggedIn]);


  const handleLogin = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      console.error("Supabase Login Error:", err);
      throw err;
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } catch (err: any) {
      console.error("Supabase SignUp Error:", err);
      throw err;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      throw err;
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out from the Manager Portal?")) {
      try {
        setIsLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        toast.success("Logged out successfully");
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdateDisplayName = async (name: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
      if (error) throw error;
      setUserDisplayName(name);
      toast.success('Display name updated');
    } catch (err: any) {
      toast.error('Failed to update display name: ' + (err.message || String(err)));
      throw err;
    }
  };

  // Selectors
  const selectedRoomObj = rooms.find(r => r.id === selectedRoomId) || null;

  // Handles Saving a Room change from Side Drawer
  const handleSaveRoomStatus = async (updatedRoom: Room, createInvoice?: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { error } = await supabase.from('rooms').upsert({ ...updatedRoom, user_id: user.id });
      if (error) throw error;

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (rooms.some(r => r.id === newRoom.id)) {
      toast.error(`Room ${newRoom.id} already exists!`);
      return;
    }
    try {
      const { error } = await supabase.from('rooms').insert({ ...newRoom, user_id: user.id });
      if (error) throw error;
      setRooms(prev => [...prev, newRoom].sort((a, b) => a.id.localeCompare(b.id)));
    } catch (error: any) {
      console.error("Add Room Error:", error);
      toast.error("Failed to add room: " + error.message);
    }
  };

  // Handles Deleting a Room
  const handleDeleteRoom = async (roomId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId).eq('user_id', user.id);
      if (error) throw error;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (confirm("Are you sure you want to completely WIPE all data? This clears all invoices and resets the hotel rooms inventory to standard vacant rooms for fresh setup.")) {
      try {
        setIsLoading(true);
        // Wipe rooms
        await supabase.from('rooms').delete().eq('user_id', user.id);
        // Wipe invoices
        await supabase.from('invoices').delete().eq('user_id', user.id);

        for (const room of initialRooms) {
          await supabase.from('rooms').insert({ ...room, user_id: user.id });
        }
        
        setSelectedRoomId(null);
        toast.success("Database wiped successfully! System is running fresh with standard vacant parameters.");
        // We could trigger a refetch here if we aren't relying entirely on local state
        window.location.reload(); 
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    try {
      const dbSettings = {
        ...updatedSettings,
        id: 'default',
        user_id: user.id
      };
      const { error } = await supabase.from('settings').upsert(dbSettings);
      if (error) throw error;
      setSettings(updatedSettings);
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      console.error("Settings Update Error:", error);
      toast.error("Failed to save settings: " + (error.message || String(error)));
      throw error;
    }
  };

  // Handles Saving a New Invoice generated from form
  const handleSaveInvoice = async (newInvoice: Invoice) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const cleanId = newInvoice.id.replace(/^#/, '');
      const isExisting = invoices.some(i => i.id === cleanId);

      if (isExisting) {
        // Editing an existing record (billing or tax) — update only that one
        const { error } = await supabase.from('invoices').upsert({ ...newInvoice, id: cleanId, user_id: user.id });
        if (error) throw error;
        setInvoices(prev => prev.map(i => i.id === cleanId ? { ...newInvoice, id: cleanId } : i));
      } else {
        // Brand-new invoice — create billing copy + independent tax copy
        const taxId = `TAX-${cleanId}`;
        const billingRecord = { ...newInvoice, id: cleanId, user_id: user.id };
        const taxRecord = { ...newInvoice, id: taxId, user_id: user.id };
        const [r1, r2] = await Promise.all([
          supabase.from('invoices').insert(billingRecord),
          supabase.from('invoices').insert(taxRecord),
        ]);
        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (confirm(`Are you sure you want to delete Invoice ${invoiceId}? This is irreversible.`)) {
      try {
        const cleanId = invoiceId.replace(/^#/, '');
        const { error } = await supabase.from('invoices').delete().eq('id', cleanId).eq('user_id', user.id);
        if (error) throw error;
        setInvoices(prev => prev.filter(i => i.id !== cleanId));
      } catch (error: any) {
        console.error("Invoice Delete Error:", error);
        toast.error("Failed to delete invoice: " + error.message);
      }
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const cleanId = invoiceId.replace(/^#/, '');
      const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', cleanId).eq('user_id', user.id);
      if (error) throw error;
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
                billingInvoices={invoices.filter(i => !i.id.startsWith('TAX-'))}
                taxInvoices={invoices.filter(i => i.id.startsWith('TAX-'))}
                settings={settings}
                onEditTaxInvoice={(invoice) => {
                  setEditingInvoice(invoice);
                  setPrefillInvoice(null);
                  setActiveTab('new-invoice');
                }}
                onViewInvoice={(invoice) => setPreviewingInvoice(invoice)}
              />
            )}
            
            {activeTab === 'new-invoice' && (
              <NewInvoiceFormView
                rooms={rooms}
                prefillData={prefillInvoice}
                editingInvoice={editingInvoice}
                nextInvoiceNumber={invoices.filter(i => !i.id.startsWith('TAX-')).length + 1}
                onSaveInvoice={(invoice) => {
                  handleSaveInvoice(invoice);
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

  if (!isAuthChecked || isLoading) {
    return (
      <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center font-sans overflow-hidden">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-t-indigo-500 border-indigo-500/10 animate-spin"></div>
          <p className="text-sm text-white/40 font-mono">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginView 
        onLogin={handleLogin} 
        onSignUp={handleSignUp}
        onGoogleLogin={handleGoogleLogin} 
        userEmail={userEmail} 
      />
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

      {/* DB Error Banner */}
      {dbError && (
        <div className="absolute top-0 left-0 right-0 bg-red-500/90 text-white p-4 z-50 text-center flex items-center justify-center gap-3 shadow-lg backdrop-blur-md">
          <AlertCircle size={20} />
          <div>
            <span className="font-semibold">Database Connection Error:</span> {dbError === 'PERMISSION_DENIED' ? 'Missing or insufficient permissions. Please check your Supabase RLS Policies.' : dbError}
          </div>
          <button 
            onClick={() => setDbError(null)} 
            className="ml-auto p-1 hover:bg-red-600/50 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Collapsible SideNavBar */}
      <SideNavBar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
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
          userEmail={userEmail}
          userDisplayName={userDisplayName}
          userAvatarUrl={userAvatarUrl}
          onUpdateDisplayName={handleUpdateDisplayName}
          onLogout={handleLogout}
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

// Simple dynamic hotel authentication form
function LoginView({ 
  onLogin, 
  onSignUp,
  onGoogleLogin, 
  userEmail 
}: { 
  onLogin: (email: string, password: string) => Promise<void>; 
  onSignUp: (email: string, password: string) => Promise<void>; 
  onGoogleLogin: () => Promise<void>; 
  userEmail: string; 
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeAuthTab, setActiveAuthTab] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please specify a valid account email.');
      return;
    }
    if (!password) {
      setError('Please specify a password.');
      return;
    }
    if (activeAuthTab === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (activeAuthTab === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      if (activeAuthTab === 'login') {
        await onLogin(email, password);
      } else {
        await onSignUp(email, password);
      }
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('email not confirmed')) {
        setError('Please confirm your email address before logging in.');
      } else if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials') || msg.includes('wrong password')) {
        setError('Invalid email or password. Please try again.');
      } else if (msg.includes('user already registered') || msg.includes('already been registered')) {
        setError('This email is already registered. Try logging in instead.');
      } else if (msg.includes('password should be')) {
        setError('Password must be at least 6 characters long.');
      } else if (msg.includes('unable to validate email address') || msg.includes('invalid email')) {
        setError('Please enter a valid email address.');
      } else if (msg.includes('signups not allowed') || msg.includes('not allowed')) {
        setError('OPERATION_NOT_ALLOWED');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    setIsGoogleSubmitting(true);
    setError('');
    try {
      await onGoogleLogin();
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center p-4 relative font-sans overflow-hidden">
      {/* Dynamic blurred meshes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/4 w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[120px] -translate-y-1/2"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[45%] h-[45%] bg-emerald-500/10 rounded-full blur-[130px]"></div>
      </div>

      <div className="glass-panel max-w-sm w-full p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10 space-y-5">
        <div className="text-center space-y-2">
          <div className="flex justify-center flex-col items-center gap-3">
            <img
              src="/logo.png"
              alt="Sekar Inn"
              className="h-20 w-20 rounded-2xl object-cover shadow-lg border border-white/10"
            />
            <h1 className="text-2xl font-black text-white tracking-tight font-display">Sekar Inn</h1>
          </div>
          <p className="text-xs text-white/50">Desk Management System Authentication Terminal</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 relative z-10 select-none">
          <button
            type="button"
            onClick={() => { setActiveAuthTab('login'); setError(''); setPassword(''); setConfirmPassword(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeAuthTab === 'login' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'text-white/40 hover:text-white/70'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveAuthTab('signup'); setError(''); setPassword(''); setConfirmPassword(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeAuthTab === 'signup' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'text-white/40 hover:text-white/70'}`}
          >
            Sign Up
          </button>
        </div>

        {error === 'OPERATION_NOT_ALLOWED' ? (
          <div className="bg-[#1f0f15] border border-rose-500/35 text-rose-200 rounded-2xl p-4 text-xs font-sans space-y-3 shadow-lg select-text">
            <div className="flex items-start gap-2.5">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 mt-6">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-red-300 font-semibold mb-1">Configuration Needed</p>
                    <p className="text-red-200/80 mb-3">
                      The "Email/Password" provider is not yet enabled in your Supabase project console.
                    </p>
                    <div className="bg-[#020205]/50 p-3 rounded-lg border border-white/5 space-y-2 text-white/70 text-xs">
                      <p>1. Open <a href="https://supabase.com/dashboard/project/_/auth/providers" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-sans font-bold inline-flex items-center gap-0.5">Supabase Console <ExternalLink className="h-2.5 w-2.5 inline" /></a></p>
                      <p>2. Go to Authentication &gt; Providers</p>
                      <p>3. Enable Email/Password authentication</p>
                    </div>
                  </div>
                </div>
            </div>
            <div className="flex flex-col gap-1.5 text-center text-white/40 pt-1">
              <p className="text-[10px]">Alternatively, sign in instantly using Google below!</p>
              <button 
                type="button" 
                onClick={() => setError('')} 
                className="text-indigo-400 hover:underline font-bold text-[10px] mt-1 select-none cursor-pointer"
              >
                &larr; Clear error &amp; retry email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 text-xs font-semibold select-text">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Staff Email Address</label>
              <input 
                type="email"
                required
                disabled={isSubmitting || isGoogleSubmitting}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="e.g. manager@sekarinn.com"
                className="w-full border border-white/10 bg-white/5 text-white placeholder-white/20 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 font-sans font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Password</label>
              <input 
                type="password"
                required
                disabled={isSubmitting || isGoogleSubmitting}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="w-full border border-white/10 bg-white/5 text-slate-100 placeholder-white/20 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 font-mono font-bold"
              />
            </div>

            {activeAuthTab === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Confirm Password</label>
                <input 
                  type="password"
                  required
                  disabled={isSubmitting || isGoogleSubmitting}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full border border-white/10 bg-white/5 text-slate-100 placeholder-white/20 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 font-mono font-bold"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full py-3 mt-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-95 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-indigo-500/10 transition-all select-none cursor-pointer active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && (
                <div className="w-4 h-4 rounded-full border-2 border-t-white border-white/10 animate-spin"></div>
              )}
              {activeAuthTab === 'login' ? 'Authenticate Profile & Login' : 'Register & Create Account'}
            </button>
          </form>
        )}



        <div className="text-center text-[10px] text-white/30 pt-4 border-t border-white/5 select-none">
          Sekar Inn Hospitality Ltd. Secure Ledger Gateway &copy; 2026
        </div>
      </div>
    </div>
  );
}
