import React from "react";
import { UI_STRINGS, UILanguage } from "../translations";

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void; // In a real app, this might navigate to checkout
  lang: UILanguage;
}

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;
  const t = UI_STRINGS[lang];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 border border-orange-500 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col text-center p-8 relative">
        
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-yellow-500"></div>

        <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-zinc-800 rounded-full flex items-center justify-center mb-4 relative">
                <i className="fas fa-bolt text-4xl text-zinc-600"></i>
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">0</div>
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">{t.energyEmpty}</h2>
            <p className="text-zinc-400">{t.energyDesc}</p>
        </div>

        <button 
            onClick={onClose} // Simulation
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-yellow-600 text-white font-bold text-lg shadow-lg shadow-orange-900/50 hover:scale-105 transition-transform mb-3"
        >
            {t.getUnlimited}
        </button>

        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300 underline">
            {t.restore}
        </button>
      </div>
    </div>
  );
};
