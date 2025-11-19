
import React, { useState } from "react";
import { UserProfile, Badge, TargetLanguage, UILanguage } from "../types";
import { UI_STRINGS } from "../translations";

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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md h-[650px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <h2 className="text-lg font-bold text-zinc-100">{t.myProfile}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex border-b border-zinc-800">
            <button onClick={() => setActiveTab('profile')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'profile' ? 'text-orange-500 border-b-2 border-orange-500 bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {t.profile}
            </button>
            <button onClick={() => setActiveTab('badges')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'badges' ? 'text-teal-500 border-b-2 border-teal-500 bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {t.badges}
            </button>
            <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'settings' ? 'text-red-500 border-b-2 border-red-500 bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {t.settings}
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700">
            
            {activeTab === 'profile' && (
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center text-4xl mb-4 shadow-lg">
                        {profile.avatar}
                    </div>
                    
                    <div className="w-full mb-6">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">{t.username}</label>
                        <input 
                            type="text" 
                            value={profile.name}
                            onChange={(e) => onUpdateProfile({ ...profile, name: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none text-center font-bold"
                        />
                    </div>

                    <div className="w-full mb-6">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">{t.uiLang}</label>
                        <div className="flex gap-2 justify-center">
                             {(['cs', 'en', 'it'] as UILanguage[]).map(lang => (
                                 <button
                                    key={lang}
                                    onClick={() => onUpdateProfile({ ...profile, uiLanguage: lang })}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${profile.uiLanguage === lang ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                                 >
                                     {lang}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div className="w-full mb-6">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">{t.targetLang}</label>
                        <div className="grid grid-cols-2 gap-2">
                             {[
                                {code: 'it', label: 'Italiano 🇮🇹'},
                                {code: 'es', label: 'Español 🇪🇸'},
                                {code: 'fr', label: 'Français 🇫🇷'},
                                {code: 'de', label: 'Deutsch 🇩🇪'},
                             ].map(opt => (
                                 <button
                                    key={opt.code}
                                    onClick={() => onUpdateProfile({ ...profile, targetLanguage: opt.code as TargetLanguage })}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold ${profile.targetLanguage === opt.code ? 'bg-teal-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                                 >
                                     {opt.label}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div className="w-full mb-6">
                         <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">{t.chooseAvatar}</label>
                         <div className="flex flex-wrap justify-center gap-3">
                             {avatars.map(a => (
                                 <button 
                                    key={a}
                                    onClick={() => onUpdateProfile({ ...profile, avatar: a })}
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-110 ${profile.avatar === a ? 'bg-orange-900/50 border border-orange-500' : 'bg-zinc-800 border border-zinc-700'}`}
                                 >
                                     {a}
                                 </button>
                             ))}
                         </div>
                    </div>

                    <div className="w-full bg-zinc-800/50 rounded-xl p-4 flex justify-between items-center border border-zinc-800">
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold">{t.lvl} {profile.level}</div>
                            <div className="text-2xl font-extrabold text-orange-500">{profile.xp} XP</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'badges' && (
                <div className="grid grid-cols-2 gap-3">
                    {profile.badges.map((badge: Badge) => (
                        <div 
                            key={badge.id} 
                            className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${badge.unlocked ? 'bg-teal-950/30 border-teal-500/50' : 'bg-zinc-900 border-zinc-800 opacity-50 grayscale'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2 ${badge.unlocked ? 'bg-teal-500 text-black' : 'bg-zinc-800 text-zinc-600'}`}>
                                <i className={`fas ${badge.icon}`}></i>
                            </div>
                            <h4 className={`text-sm font-bold ${badge.unlocked ? 'text-teal-200' : 'text-zinc-500'}`}>{badge.name}</h4>
                            <p className="text-[10px] text-zinc-500 leading-tight mt-1">{badge.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'settings' && (
                <div>
                    <div className="mb-6 p-4 bg-red-950/20 border border-red-900/30 rounded-xl">
                        <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <i className="fas fa-exclamation-triangle"></i> {t.dangerZone}
                        </h3>
                        <p className="text-xs text-red-300/70 mb-4 leading-relaxed">
                            {t.resetDesc}
                        </p>
                        
                        {!resetConfirm ? (
                            <button 
                                onClick={() => setResetConfirm(true)}
                                className="w-full py-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 font-bold text-sm transition-all"
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
                                    className="flex-1 py-3 rounded-lg bg-red-600 text-white font-bold text-sm hover:bg-red-500 shadow-lg shadow-red-900/50"
                                >
                                    {t.confirm}
                                </button>
                                <button 
                                    onClick={() => setResetConfirm(false)}
                                    className="flex-1 py-3 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700"
                                >
                                    {t.cancel}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="text-center mt-8">
                        <p className="text-[10px] text-zinc-600">AmiGo v3.0</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
