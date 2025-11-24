
import React, { useState } from "react";
import { UserProfile, Badge, TargetLanguage, UILanguage, Theme } from "../types";
import { UI_STRINGS } from "../translations";
import { motion, AnimatePresence } from "framer-motion";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onReset, profile, onUpdateProfile }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'badges' | 'settings'>('profile');
  const [resetConfirm, setResetConfirm] = useState(false);
  
  if (!isOpen) return null;

  const t = UI_STRINGS[profile.uiLanguage];
  const avatars = ["🛵", "🍕", "☕", "🍷", "🍝", "🕶️", "🍋", "🏺", "🎨", "⚽"];
  
  const isDark = profile.theme === 'dark';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 z-50">
       <motion.div 
         initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
         className="absolute inset-0 bg-black/60 backdrop-blur-sm"
         onClick={onClose}
       />
      <motion.div 
         initial={{ scale: 0.95, opacity: 0, y: 10 }}
         animate={{ scale: 1, opacity: 1, y: 0 }}
         className={`relative w-full max-w-md h-[650px] rounded-3xl shadow-2xl overflow-hidden flex flex-col prismatic-card prismatic-border ${isDark ? 'text-zinc-100' : 'text-zinc-900 bg-white/80'}`}
      >
        
        <div className="p-5 border-b border-zinc-500/10 flex justify-between items-center bg-zinc-500/5">
          <h2 className="text-xl font-bold tracking-tight">{t.myProfile}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-500/20 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex border-b border-zinc-500/10 p-1 bg-zinc-500/5">
            {['profile', 'badges', 'settings'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)} 
                  className={`flex-1 py-2.5 text-[10px] font-extrabold uppercase tracking-widest rounded-lg transition-all relative overflow-hidden ${activeTab === tab ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
                >
                    {activeTab === tab && (
                        <motion.div layoutId="activeTab" className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 opacity-80" />
                    )}
                    <span className="relative z-10">{t[tab as keyof typeof t]}</span>
                </button>
            ))}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            
            {activeTab === 'profile' && (
                <div className="flex flex-col items-center animate-fade-in-up">
                    <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-zinc-500/10 border-4 border-zinc-500/20 flex items-center justify-center text-5xl mb-6 shadow-xl backdrop-blur-sm">
                            {profile.avatar}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold px-3 py-1 rounded-full text-xs shadow-lg">
                            LVL {profile.level}
                        </div>
                    </div>
                    
                    <div className="w-full mb-6">
                        <label className="text-[10px] font-bold opacity-50 uppercase mb-1 block">{t.username}</label>
                        <input 
                            type="text" 
                            value={profile.name}
                            onChange={(e) => onUpdateProfile({ ...profile, name: e.target.value })}
                            className="w-full bg-zinc-500/5 border border-zinc-500/20 rounded-xl p-3 text-center font-bold focus:border-orange-500 focus:outline-none transition-all"
                        />
                    </div>

                    <div className="w-full mb-6 grid grid-cols-2 gap-4">
                        <div>
                             <label className="text-[10px] font-bold opacity-50 uppercase mb-2 block">{t.uiLang}</label>
                             <div className="flex flex-col gap-2">
                                 {(['cs', 'en', 'it'] as UILanguage[]).map(lang => (
                                     <button
                                        key={lang}
                                        onClick={() => onUpdateProfile({ ...profile, uiLanguage: lang })}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${profile.uiLanguage === lang ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-zinc-500/10 opacity-70'}`}
                                     >
                                         {lang}
                                     </button>
                                 ))}
                             </div>
                        </div>
                        <div>
                             <label className="text-[10px] font-bold opacity-50 uppercase mb-2 block">{t.targetLang}</label>
                             <div className="flex flex-col gap-2">
                                 {[
                                    {code: 'it', label: 'Italiano 🇮🇹'},
                                    {code: 'es', label: 'Español 🇪🇸'},
                                    {code: 'fr', label: 'Français 🇫🇷'},
                                    {code: 'de', label: 'Deutsch 🇩🇪'},
                                 ].map(opt => (
                                     <button
                                        key={opt.code}
                                        onClick={() => onUpdateProfile({ ...profile, targetLanguage: opt.code as TargetLanguage })}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${profile.targetLanguage === opt.code ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-zinc-500/10 opacity-70'}`}
                                     >
                                         {opt.label}
                                     </button>
                                 ))}
                             </div>
                        </div>
                    </div>

                    <div className="w-full mb-8">
                         <label className="text-[10px] font-bold opacity-50 uppercase mb-2 block">{t.chooseAvatar}</label>
                         <div className="flex flex-wrap justify-center gap-3">
                             {avatars.map(a => (
                                 <motion.button 
                                    whileTap={{ scale: 0.9 }}
                                    key={a}
                                    onClick={() => onUpdateProfile({ ...profile, avatar: a })}
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${profile.avatar === a ? 'bg-orange-500/20 border-2 border-orange-500' : 'bg-zinc-500/10 border border-transparent'}`}
                                 >
                                     {a}
                                 </motion.button>
                             ))}
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'badges' && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                    {profile.badges.map((badge: Badge) => (
                        <div 
                            key={badge.id} 
                            className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${badge.unlocked ? 'bg-teal-500/10 border-teal-500/30' : 'bg-zinc-500/5 border-zinc-500/10 opacity-50 grayscale'}`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-3 ${badge.unlocked ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-zinc-500/20 text-zinc-500'}`}>
                                <i className={`fas ${badge.icon}`}></i>
                            </div>
                            <h4 className="text-sm font-bold">{badge.name}</h4>
                            <p className="text-[10px] opacity-60 mt-1">{badge.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="animate-fade-in-up space-y-6">
                    
                    {/* Theme Toggle */}
                    <div className="p-4 rounded-xl bg-zinc-500/5 border border-zinc-500/10 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold">Theme</h3>
                            <p className="text-xs opacity-60">{isDark ? 'Void Dark' : 'Prismatic Light'}</p>
                        </div>
                        <div className="flex bg-zinc-500/10 rounded-full p-1 relative">
                            <motion.div 
                                layout
                                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white shadow-sm rounded-full"
                                style={{ left: isDark ? '4px' : 'calc(50%)' }}
                            />
                            <button onClick={() => onUpdateProfile({...profile, theme: 'dark'})} className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-xs ${isDark ? 'text-black' : 'text-zinc-500'}`}><i className="fas fa-moon"></i></button>
                            <button onClick={() => onUpdateProfile({...profile, theme: 'light'})} className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-xs ${!isDark ? 'text-black' : 'text-zinc-500'}`}><i className="fas fa-sun"></i></button>
                        </div>
                    </div>

                    <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl">
                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <i className="fas fa-exclamation-triangle"></i> {t.dangerZone}
                        </h3>
                        <p className="text-xs opacity-60 mb-4 leading-relaxed">
                            {t.resetDesc}
                        </p>
                        
                        {!resetConfirm ? (
                            <button 
                                onClick={() => setResetConfirm(true)}
                                className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 font-bold text-sm transition-all"
                            >
                                {t.reset}
                            </button>
                        ) : (
                            <div className="flex gap-2 animate-fade-in">
                                <button 
                                    onClick={() => {
                                        onReset();
                                        setResetConfirm(false);
                                        onClose();
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-lg shadow-red-500/30"
                                >
                                    {t.confirm}
                                </button>
                                <button 
                                    onClick={() => setResetConfirm(false)}
                                    className="flex-1 py-3 rounded-xl bg-zinc-500/10 text-zinc-500 font-bold text-sm hover:bg-zinc-500/20"
                                >
                                    {t.cancel}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="text-center mt-8 opacity-30 text-[10px] font-mono">AmiGo v3.1 // 2026 Build</div>
                </div>
            )}
        </div>
      </motion.div>
    </div>
  );
};
