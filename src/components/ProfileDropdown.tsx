import { useState, useRef, useEffect } from 'react';
import { Edit3, Check, X, LogOut } from 'lucide-react';

interface ProfileDropdownProps {
  userEmail: string;
  userDisplayName: string;
  userAvatarUrl: string;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onLogout: () => void;
  onClose: () => void;
}

export default function ProfileDropdown({
  userEmail,
  userDisplayName,
  userAvatarUrl,
  onUpdateDisplayName,
  onLogout,
  onClose,
}: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(userDisplayName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateDisplayName(editName.trim());
      setIsEditingName(false);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditingName(false);
    setEditName(userDisplayName);
  };

  const getInitial = () => {
    if (userDisplayName && userDisplayName.trim()) return userDisplayName[0].toUpperCase();
    if (userEmail && userEmail.trim()) return userEmail[0].toUpperCase();
    return 'U';
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 bg-[#0a0a14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-[100] overflow-hidden"
    >
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border border-white/20 p-0.5 flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#0f1646]">
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt=""
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.classList.remove('bg-[#0f1646]');
                }}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 via-emerald-400 to-yellow-200 text-[#0f1646] flex items-center justify-center font-extrabold text-lg select-none">
                {getInitial()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{userDisplayName || 'User'}</p>
            <p className="text-xs text-white/40 font-mono truncate">{userEmail}</p>
          </div>
        </div>
      </div>

      <div className="p-2 space-y-1">
        {isEditingName ? (
          <div className="p-2 flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 glass-input rounded-lg p-2 text-sm"
              autoFocus
              placeholder="Enter display name"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') cancelEdit(); }}
            />
            <button onClick={handleSaveName} disabled={isSaving} className="p-1.5 text-emerald-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
              {isSaving ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button onClick={cancelEdit} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditName(userDisplayName); setIsEditingName(true); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
          >
            <Edit3 className="h-4 w-4 text-indigo-400" />
            <span>Rename profile</span>
          </button>
        )}

        <div className="border-t border-white/5 my-1" />

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
