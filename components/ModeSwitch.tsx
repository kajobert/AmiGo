import React from "react";
import { AppMode } from "../types";

interface ModeSwitchProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({ mode, setMode }) => {
  const isSpeaking = mode === AppMode.SPEAKING;

  return (
    <div className="w-full flex justify-center mb-4">
      <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-full flex w-48 relative shadow-lg">
        {/* Slider Background */}
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-sm transition-all duration-300 ease-out transform ${
            isSpeaking ? "translate-x-0 bg-orange-600" : "translate-x-[calc(100%+4px)] bg-teal-600"
          }`}
        />
        
        {/* Buttons */}
        <button
          onClick={() => setMode(AppMode.SPEAKING)}
          className={`flex-1 relative z-10 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors duration-300 ${
            isSpeaking ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <i className="fas fa-comment-alt mr-1"></i> Speak
        </button>
        <button
          onClick={() => setMode(AppMode.LISTENING)}
          className={`flex-1 relative z-10 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors duration-300 ${
            !isSpeaking ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Listen <i className="fas fa-ear-listen ml-1"></i>
        </button>
      </div>
    </div>
  );
};