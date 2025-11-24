
import React from "react";
import { AppMode } from "../types";
import { motion } from "framer-motion";

interface ModeSwitchProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({ mode, setMode }) => {
  const isSpeaking = mode === AppMode.SPEAKING;

  return (
    <div className="w-full flex justify-center mb-6">
      <div className="relative bg-zinc-900/50 backdrop-blur border border-zinc-700/50 p-1 rounded-full flex w-56 shadow-xl">
        {/* Active Blob */}
        <motion.div
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-lg"
          animate={{ 
            x: isSpeaking ? 0 : "100%", 
            backgroundColor: isSpeaking ? "#ea580c" : "#0d9488" 
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        
        <button
          onClick={() => setMode(AppMode.SPEAKING)}
          className={`flex-1 relative z-10 py-2.5 text-[10px] font-extrabold uppercase tracking-widest rounded-full transition-colors ${isSpeaking ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <i className="fas fa-comment-alt mr-2"></i> Speak
        </button>
        <button
          onClick={() => setMode(AppMode.LISTENING)}
          className={`flex-1 relative z-10 py-2.5 text-[10px] font-extrabold uppercase tracking-widest rounded-full transition-colors ${!isSpeaking ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Listen <i className="fas fa-ear-listen ml-2"></i>
        </button>
      </div>
    </div>
  );
};
