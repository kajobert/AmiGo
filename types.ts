
export enum AppMode {
  SPEAKING = 'SPEAKING', // CZ -> IT
  LISTENING = 'LISTENING', // IT -> CZ
}

export interface VocabularyItem {
  word: string; // Lemma (e.g. 'andare')
  originalForm: string; // Used form (e.g. 'vado')
  inputMatch: string; // The word from user input that triggered this (e.g. 'kvatro' or 'quattro' or 'čtyři')
  translation: string;
  phonetics: string;
  status?: 'win' | 'lookup'; // Calculated locally
}

export interface TranslationResult {
  original: string;
  translation: string;
  phonetics?: string | null; // Only for Italian results (CZ phonetics)
  detectedLanguage?: string;
  vocabulary?: VocabularyItem[];
}

export interface WordItem {
  word: string;
  usedForms: string[]; // List of variations seen (e.g., pivo, piva, pivu)
  translation?: string;
  phonetics?: string;
  count: number; // Current Heat (Lookups - Wins)
  lookups: number; // Total times searched (CZ->IT)
  wins: number; // Total times used correctly (IT->CZ)
  lastUsed: number;
}

export interface ContextSuggestion {
  phrase: string;
  translation: string;
  phonetics: string;
}

export interface FutureRoadmap {
  voiceMode: boolean;
  contextAwareness: boolean;
  monetization: boolean;
}
