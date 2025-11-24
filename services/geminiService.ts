
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppMode, TranslationResult, ContextSuggestion, TargetLanguage, UILanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const vocabularyItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "Lemma/Base form (e.g. 'Stare')." },
    originalForm: { type: Type.STRING, description: "Form used in sentence (e.g. 'Stai')." },
    translation: { type: Type.STRING, description: "Translation of this specific word." }
  },
  required: ["word", "originalForm", "translation"]
};

const translationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    translation: { type: Type.STRING, description: "Correct sentence in target language." },
    czechDefinition: { type: Type.STRING, description: "Meaning in source language." },
    phonetics: { type: Type.STRING, description: "Sentence phonetics (Czech style, no IPA).", nullable: true },
    detectedLanguage: { type: Type.STRING, description: "Detected language code." },
    isNonsense: { type: Type.BOOLEAN, description: "True if input is random gibberish.", nullable: true },
    vocabulary: { type: Type.ARRAY, items: vocabularyItemSchema, description: "List of words found in the TARGET sentence." }
  },
  required: ["translation", "czechDefinition", "detectedLanguage"],
};

const LANGUAGES = {
  it: "Italian",
  es: "Spanish",
  fr: "French",
  de: "German"
};

const SOURCE_LANGUAGES = {
  cs: "Czech",
  en: "English",
  it: "Italian"
};

export const translateText = async (text: string, mode: AppMode, targetLang: TargetLanguage, sourceLang: UILanguage): Promise<TranslationResult> => {
  if (!text.trim()) throw new Error("Input text is empty");

  const targetLangName = LANGUAGES[targetLang];
  const sourceLangName = SOURCE_LANGUAGES[sourceLang] || "Czech";

  const systemInstruction = `
You are AmiGo.
Target Language: ${targetLangName}.
Source Language: ${sourceLangName} (or mixed).

TASK:
1. CHECK NONSENSE: If input is gibberish/random keys, set 'isNonsense': true.
2. TRANSLATE: Translate the full user input to ${targetLangName}.
3. LIST WORDS: List the words from YOUR TRANSLATED (${targetLangName}) sentence.
   CRITICAL: The vocabulary list must ONLY contain ${targetLangName} words. 
   Do NOT list words from the source input.

PHONETICS: Intuitive Czech pronunciation.

Output JSON only.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: text,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: translationSchema,
        temperature: 0.0, 
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    const parsed = JSON.parse(jsonText);

    return {
      original: text,
      translation: parsed.translation || "...",
      czechDefinition: parsed.czechDefinition || "Translation",
      phonetics: parsed.phonetics || null,
      detectedLanguage: parsed.detectedLanguage,
      isNonsense: parsed.isNonsense || false,
      vocabulary: parsed.vocabulary || []
    };
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Translation failed.");
  }
};

export const getContextSuggestions = async (lat: number, lng: number, targetLang: TargetLanguage): Promise<{ place: string, suggestions: ContextSuggestion[] }> => {
  const targetLangName = LANGUAGES[targetLang];
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Place at ${lat},${lng}? Suggest 3 ${targetLangName} phrases for this place. JSON: {placeType, suggestions:[{phrase, translation, phonetics}]}`,
      config: { responseMimeType: "application/json" }
    });
    
    const parsed = JSON.parse(response.text || "{}");
    return {
      place: parsed.placeType || "Location",
      suggestions: parsed.suggestions || []
    };

  } catch (error) {
    return { 
      place: "General", 
      suggestions: [{ phrase: "Ciao", translation: "Ahoj", phonetics: "čao" }] 
    };
  }
};
