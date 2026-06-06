/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { Room, Invoice, SystemSettings } from './types';
import { initialRooms, initialInvoices } from './data';
import SideNavBar from './components/SideNavBar';
import TopNavBar from './components/TopNavBar';
import DashboardView from './components/DashboardView';
import RoomManagementView from './components/RoomManagementView';
import RoomDrawer from './components/RoomDrawer';
import BillingInvoicesView from './components/BillingInvoicesView';
import NewInvoiceFormView from './components/NewInvoiceFormView';
import PrintableInvoiceModal from './components/PrintableInvoiceModal';
import { Settings, Save, HelpCircle, Building, AlertCircle, ExternalLink, Key } from 'lucide-react';

// Real backend imports (Firebase Auth and Firestore)
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  getDocFromServer
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase.ts';

const DEFAULT_SETTINGS: SystemSettings = {
  address: 'Flat No.: 3, LAKSHMIMANAGARAM MIDDLE STREET, Arumuganeri, Thoothukudi, Tamil Nadu - 628202',
  phone: '+91 86670 92950',
  gstin: '33KKRPS8566Q1ZK',
  cgstPercentage: 9,
  sgstPercentage: 9
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('rooms');

  // Collapsible Sidebar State - default is expanded
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Mobile navigation overlay/drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('waranhariish@gmail.com');
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
    checkInDate?: string;
    checkOutDate?: string;
    extraBedsCount?: number;
  } | null>(null);

  // Sync to database on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email || 'waranhariish@gmail.com');
        
        // Validate connection to Firestore
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
          if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration.");
          }
        }

        // Sync Rooms Collection
        const roomsQuery = query(collection(db, 'rooms'), where('userId', '==', user.uid));
        const unsubscribeRooms = onSnapshot(roomsQuery, async (snapshot) => {
          const fetchedRooms: Room[] = [];
          snapshot.forEach((docSnap) => {
            const raw = docSnap.data();
            const { userId, ...roomData } = raw;
            fetchedRooms.push(roomData as Room);
          });

          if (fetchedRooms.length === 0) {
            // Seed base rooms on-the-fly for newly authenticated profile
            try {
              for (const room of initialRooms) {
                await setDoc(doc(db, 'rooms', room.id), { ...room, userId: user.uid });
              }
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, 'rooms');
            }
          } else {
            // If any old dummy guest detail exists in rooms, auto-clean them to pristine vacant state
            const hasDummyGuest = fetchedRooms.some(r => 
              r.guestName === "Anita Sharma" || 
              r.guestName === "Arun Nair" || 
              r.guestName === "Sanya Gupta"
            );
            if (hasDummyGuest) {
              try {
                for (const room of initialRooms) {
                  await setDoc(doc(db, 'rooms', room.id), { ...room, userId: user.uid });
                }
              } catch (err) {
                console.error("Auto rooms clean-up error:", err);
              }
            } else {
              fetchedRooms.sort((a, b) => a.id.localeCompare(b.id));
              setRooms(fetchedRooms);
            }
          }
          setIsLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'rooms');
        });

        // Sync Invoices Collection
        const invoicesQuery = query(collection(db, 'invoices'), where('userId', '==', user.uid));
        const unsubscribeInvoices = onSnapshot(invoicesQuery, async (snapshot) => {
          const fetchedInvoices: Invoice[] = [];
          snapshot.forEach((docSnap) => {
            const raw = docSnap.data();
            const { userId, ...invoiceData } = raw;
            fetchedInvoices.push({ ...invoiceData, id: raw.id || docSnap.id } as Invoice);
          });

          // Check for dummy invoices left over from previous database versions to clean up automatically first
          const dummyInvs = fetchedInvoices.filter(inv => 
            inv.id === "INV-1001" || 
            inv.id === "INV-1002" || 
            inv.customerName === "Anita Sharma" || 
            inv.customerName === "Sanya Gupta"
          );
          if (dummyInvs.length > 0) {
            try {
              for (const inv of dummyInvs) {
                await deleteDoc(doc(db, 'invoices', inv.id));
              }
            } catch (err) {
              console.error("Auto invoices clean-up error:", err);
            }
          }

          const remainingInvoices = fetchedInvoices.filter(inv => 
            inv.id !== "INV-1001" && 
            inv.id !== "INV-1002" && 
            inv.customerName !== "Anita Sharma" && 
            inv.customerName !== "Sanya Gupta"
          );

          remainingInvoices.sort((a, b) => b.id.localeCompare(a.id));
          setInvoices(remainingInvoices);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'invoices');
        });

        // Sync Settings Document
        const settingsRef = doc(db, 'settings', user.uid);
        const unsubscribeSettings = onSnapshot(settingsRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as SystemSettings;
            setSettings(data);
          } else {
            // Seed settings on-the-fly for newly authenticated profile
            try {
              await setDoc(settingsRef, DEFAULT_SETTINGS);
              setSettings(DEFAULT_SETTINGS);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, 'settings');
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'settings');
        });

        return () => {
          unsubscribeRooms();
          unsubscribeInvoices();
          unsubscribeSettings();
        };
      } else {
        setIsLoggedIn(false);
        setRooms([]);
        setInvoices([]);
        setSettings(DEFAULT_SETTINGS);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string) => {
    try {
      setIsLoading(true);
      const password = "1234_sekarinn";
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error("Firebase Login Error:", err);
      setIsLoading(false);
      throw err;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setIsLoading(false);
      throw err;
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out from the Manager Portal?")) {
      try {
        setIsLoading(true);
        await signOut(auth);
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    }
  };

  // Selectors
  const selectedRoomObj = rooms.find(r => r.id === selectedRoomId) || null;

  // Handles Saving a Room change from Side Drawer
  const handleSaveRoomStatus = async (updatedRoom: Room, createInvoice?: boolean) => {
    if (!auth.currentUser) return;
    try {
      const roomRef = doc(db, 'rooms', updatedRoom.id);
      await setDoc(roomRef, { ...updatedRoom, userId: auth.currentUser.uid });
      setSelectedRoomId(null);

      if (createInvoice) {
        setPrefillInvoice({
          roomId: updatedRoom.id,
          guestName: updatedRoom.guestName,
          checkInDate: updatedRoom.checkInDate,
          checkOutDate: updatedRoom.checkOutDate,
          extraBedsCount: updatedRoom.extraBedsCount,
        });
        setActiveTab('new-invoice');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${updatedRoom.id}`);
    }
  };

  // Handles Adding a Custom Room
  const handleAddRoom = async (newRoom: Room) => {
    if (!auth.currentUser) return;
    if (rooms.some(r => r.id === newRoom.id)) {
      alert(`Room ${newRoom.id} already exists!`);
      return;
    }
    try {
      const roomRef = doc(db, 'rooms', newRoom.id);
      await setDoc(roomRef, { ...newRoom, userId: auth.currentUser.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${newRoom.id}`);
    }
  };

  // Handles Deleting a Room
  const handleDeleteRoom = async (roomId: string) => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await deleteDoc(roomRef);
      setSelectedRoomId(null);
      alert(`Room ${roomId} was deactivated and removed from the register.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rooms/${roomId}`);
    }
  };

  // Handles Database Wiping
  const handleResetDatabase = async () => {
    if (!auth.currentUser) return;
    if (confirm("Are you sure you want to completely WIPE all data? This clears all invoices and resets the hotel rooms inventory to standard vacant rooms for fresh setup.")) {
      try {
        setIsLoading(true);
        // Wipe rooms
        for (const r of rooms) {
          await deleteDoc(doc(db, 'rooms', r.id));
        }
        // Wipe invoices
        for (const inv of invoices) {
          const cleanId = inv.id.replace('#', 'INV-');
          await deleteDoc(doc(db, 'invoices', cleanId));
        }

        for (const room of initialRooms) {
          await setDoc(doc(db, 'rooms', room.id), { ...room, userId: auth.currentUser.uid });
        }
        
        setSelectedRoomId(null);
        alert("Database wiped successfully! System is running fresh with standard vacant parameters.");
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'rooms');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handles saving system configurations
  const handleSaveSettings = async (updatedSettings: SystemSettings) => {
    if (!auth.currentUser) return;
    try {
      const settingsRef = doc(db, 'settings', auth.currentUser.uid);
      await setDoc(settingsRef, updatedSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    }
  };

  // Handles Saving a New Invoice generated from form
  const handleSaveInvoice = async (newInvoice: Invoice) => {
    if (!auth.currentUser) return;
    try {
      const cleanId = newInvoice.id.replace('#', 'INV-');
      await setDoc(doc(db, 'invoices', cleanId), { ...newInvoice, id: cleanId, userId: auth.currentUser.uid });
      setActiveTab('billing');
      setPreviewingInvoice(newInvoice);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `invoices/${newInvoice.id}`);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (confirm(`Are you sure you want to delete Invoice ${invoiceId}? This is irreversible.`)) {
      try {
        const cleanId = invoiceId.replace('#', 'INV-');
        await deleteDoc(doc(db, 'invoices', cleanId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `invoices/${invoiceId}`);
      }
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
    if (!auth.currentUser) return;
    try {
      const cleanId = invoiceId.replace('#', 'INV-');
      const invRef = doc(db, 'invoices', cleanId);
      await updateDoc(invRef, { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `invoices/${invoiceId}`);
    }
  };

  // Render view router
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            rooms={rooms} 
            invoices={invoices} 
            setActiveTab={setActiveTab}
            onSelectRoom={(id) => setSelectedRoomId(id)}
          />
        );
      case 'rooms':
        return (
          <RoomManagementView 
            rooms={rooms} 
            onSelectRoom={(id) => setSelectedRoomId(id)} 
            onAddRoom={handleAddRoom}
            onUpdateRoom={handleSaveRoomStatus}
          />
        );
      case 'billing':
        return (
          <BillingInvoicesView 
            rooms={rooms}
            invoices={invoices}
            onCreateInvoice={(prefill) => {
              setPrefillInvoice(prefill || null);
              setActiveTab('new-invoice');
            }}
            onViewInvoice={(invoice) => setPreviewingInvoice(invoice)}
            onDeleteInvoice={handleDeleteInvoice}
            onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
          />
        );
      case 'new-invoice':
        return (
          <NewInvoiceFormView 
            rooms={rooms}
            onSaveInvoice={handleSaveInvoice}
            onCancel={() => {
              setPrefillInvoice(null);
              setActiveTab('billing');
            }}
            prefillData={prefillInvoice}
            settings={settings}
          />
        );
      case 'settings':
        return (
          <SettingsView 
            onResetDatabase={handleResetDatabase}
            roomsCount={rooms.length}
            invoicesCount={invoices.length}
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        );
      default:
        return (
          <RoomManagementView 
            rooms={rooms} 
            onSelectRoom={(id) => setSelectedRoomId(id)} 
            onAddRoom={handleAddRoom} 
            onUpdateRoom={handleSaveRoomStatus}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center font-sans overflow-hidden">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-t-indigo-500 border-indigo-500/10 animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} userEmail={userEmail} />;
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
        onLogout={handleLogout} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Primary Layout Segment */}
      <div 
        className={`flex-1 transition-all duration-300 ml-0 ${
          isSidebarCollapsed ? 'md:ml-[80px]' : 'md:ml-[260px]'
        } flex flex-col min-h-screen relative z-10`} 
        id="app-main-layout"
      >
        
        {/* Sticky Top Bar Header */}
        <TopNavBar 
          activeTab={activeTab} 
          userEmail={userEmail} 
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} 
        />

        {/* Major Content Canvas */}
        <main className="p-8 max-w-[1300px] w-full flex-1">
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
  const [sgstPercentage, setSgstPercentage] = useState(settings.sgstPercentage.toString());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAddress(settings.address);
    setGstin(settings.gstin);
    setPhone(settings.phone);
    setCgstPercentage(settings.cgstPercentage.toString());
    setSgstPercentage(settings.sgstPercentage.toString());
  }, [settings]);
  
  const handleSaveSettings = async () => {
    const cgst = parseFloat(cgstPercentage);
    const sgst = parseFloat(sgstPercentage);
    if (isNaN(cgst) || cgst < 0 || cgst > 100) {
      alert("Please enter a valid CGST percentage between 0 and 100.");
      return;
    }
    if (isNaN(sgst) || sgst < 0 || sgst > 100) {
      alert("Please enter a valid SGST percentage between 0 and 100.");
      return;
    }
    setIsSaving(true);
    try {
      await onSaveSettings({
        address,
        phone,
        gstin,
        cgstPercentage: cgst,
        sgstPercentage: sgst
      });
      alert("Configurations saved successfully! Changes are applied.");
    } catch (error) {
      // error handled in helper
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
                  step="0.1"
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
                  step="0.1"
                  min="0"
                  max="100" 
                  value={sgstPercentage}
                  onChange={(e) => setSgstPercentage(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-sm font-mono"
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
            <span>Tax properties are set to standard Indian GST ({settings.cgstPercentage}% CGST + {settings.sgstPercentage}% SGST).</span>
          </div>
        </div>

      </div>

      {/* Database Administration Operations Block (CRITICAL real-app feature) */}
      <div className="glass-panel p-6 rounded-2xl shadow-lg border border-white/10 mt-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Building className="h-5 w-5 text-rose-400" />
          <h4 className="text-base font-bold text-white font-display">Database Administration</h4>
        </div>
        
        <p className="text-xs text-white/50 leading-relaxed">
          Manage local states and persistent ledger variables. You can reset databases, seed prefilled demo profiles, or clear out diagnostic information.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/5 p-4 rounded-xl border border-white/5 text-center text-xs">
          <div>
            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Rooms Logged</span>
            <strong className="text-white text-lg font-mono font-bold">{roomsCount} Rooms</strong>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Active Bills Filed</span>
            <strong className="text-white text-lg font-mono font-bold">{invoicesCount} Invoices</strong>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">State Sync Status</span>
            <strong className="text-emerald-400 text-lg font-semibold">&bull; Online (Local)</strong>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={onResetDatabase}
            className="px-5 py-2.5 border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500 hover:text-white transition-all rounded-xl text-xs font-bold cursor-pointer active:scale-95"
          >
            Wipe &amp; Create Fresh Hotel
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple dynamic hotel pin authenticator form
function LoginView({ 
  onLogin, 
  onGoogleLogin, 
  userEmail 
}: { 
  onLogin: (email: string) => Promise<void>; 
  onGoogleLogin: () => Promise<void>; 
  userEmail: string; 
}) {
  const [email, setEmail] = useState(userEmail || 'waranhariish@gmail.com');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please specify a valid account email.');
      return;
    }
    if (pin === '1234') {
      setIsSubmitting(true);
      setError('');
      try {
        await onLogin(email);
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('auth/operation-not-allowed')) {
          setError('OPERATION_NOT_ALLOWED');
        } else {
          setError(msg || 'An error occurred during authentication.');
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setError('Invalid Access Passcode (Standard PIN is 1234).');
    }
  };

  const handleGoogleClick = async () => {
    setIsGoogleSubmitting(true);
    setError('');
    try {
      await onGoogleLogin();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Google Sign-In failed.');
      }
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

      <div className="glass-panel max-w-sm w-full p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center flex-col items-center gap-3">
            <div className="bg-[#0f1646] p-3.5 rounded-2xl border border-white/10 flex items-center justify-center text-white h-14 w-14">
              <Building className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight font-display">Sekar Inn</h1>
          </div>
          <p className="text-xs text-white/50">Desk Management System Authentication Terminal</p>
        </div>

        {error === 'OPERATION_NOT_ALLOWED' ? (
          <div className="bg-[#1f0f15] border border-rose-500/35 text-rose-200 rounded-2xl p-4 text-xs font-sans space-y-3 shadow-lg select-text">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white tracking-tight">Email/Password Login Disabled</p>
                <p className="text-white/70 leading-relaxed text-[11px]">
                  The "Email/Password" provider is not yet enabled in your Firebase project console.
                </p>
              </div>
            </div>
            <div className="p-3 bg-black/40 rounded-xl space-y-1.5 border border-white/5 font-mono text-[10px] leading-relaxed text-white/50">
              <p className="font-bold text-amber-400">QUICK SETUP FIX:</p>
              <p>1. Open <a href="https://console.firebase.google.com/project/gen-lang-client-0719317047/authentication/providers" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-sans font-bold inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="h-2.5 w-2.5 inline" /></a></p>
              <p>2. Click <span className="text-white">Add new provider</span></p>
              <p>3. Choose <span className="text-white">Email/Password</span></p>
              <p>4. Toggle <span className="text-white">Enable</span> and click <span className="text-white">Save</span></p>
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
                className="w-full border border-white/10 bg-white/5 text-white placeholder-white/20 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Access Passcode (PIN)</label>
              <input 
                type="password"
                required
                disabled={isSubmitting || isGoogleSubmitting}
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(''); }}
                placeholder="••••"
                maxLength={4}
                className="w-full border border-white/10 bg-white/5 text-slate-100 placeholder-white/20 rounded-xl p-3 text-sm text-center tracking-widest font-mono font-black focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              />
              <p className="text-[10px] text-white/30 text-right mt-1 italic">Demo PIN: 1234</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full py-3 mt-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-95 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-indigo-500/10 transition-all select-none cursor-pointer active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && (
                <div className="w-4 h-4 rounded-full border-2 border-t-white border-white/10 animate-spin"></div>
              )}
              Authenticate Profile &amp; Login
            </button>
          </form>
        )}

        <div className="relative flex py-1 items-center justify-center">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold text-white/30 uppercase tracking-widest bg-[#020205] px-2 select-none">or</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <button
          type="button"
          disabled={isSubmitting || isGoogleSubmitting}
          onClick={handleGoogleClick}
          className="w-full py-3 border border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold tracking-wide shadow-lg transition-all select-none cursor-pointer active:scale-95 text-sm flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          {isGoogleSubmitting ? (
            <div className="w-4 h-4 rounded-full border-2 border-t-white border-white/10 animate-spin"></div>
          ) : (
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Sign in with Google Account
        </button>

        <div className="text-center text-[10px] text-white/30 pt-4 border-t border-white/5 select-none">
          Sekar Inn Hospitality Ltd. Secure Ledger Gateway &copy; 2026
        </div>
      </div>
    </div>
  );
}
