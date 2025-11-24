
import React from "react";
import { UI_STRINGS, UILanguage } from "../translations";

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: UILanguage;
}

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;
  const t = UI_STRINGS[lang];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in" />
       
       <div className="relative w-full max-w-sm rounded-3xl overflow-hidden prismatic-card bg-black/40 text-center p-8 animate-fade-in-up">
        
        {/* Glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-orange-500/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-yellow-500/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/20 transform rotate-3">
                <i className="fas fa-bolt text-4xl text-white"></i>
            </div>
            
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-200 mb-2">{t.energyEmpty}</h2>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">{t.energyDesc}</p>

            <button 
                onClick={onClose} 
                className="w-full py-4 rounded-xl bg-white text-black font-extrabold text-lg shadow-xl hover:scale-105 transition-transform mb-4"
            >
                {t.getUnlimited}
            </button>

            <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300 font-bold uppercase tracking-widest">
                {t.restore}
            </button>
        </div>
      </div>
    </div>
  );
};
