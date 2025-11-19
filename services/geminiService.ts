
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppMode, TranslationResult, ContextSuggestion, TargetLanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const vocabularyItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "The dictionary base form (Lemma) of the target word." },
    originalForm: { type: Type.STRING, description: "The exact form found in the translation." },
    inputMatch: { type: Type.STRING, description: "The specific word from the USER INPUT that corresponds to this. Copy exactly." },
    translation: { type: Type.STRING, description: "Native language translation of this word." },
    phonetics: { type: Type.STRING, description: "Native phonetics for the target word." }
  },
  required: ["word", "originalForm", "inputMatch", "translation", "phonetics"]
};

const translationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    translation: { type: Type.STRING, description: "The translated text." },
    czechDefinition: { type: Type.STRING, description: "The meaning/translation back to source language." },
    phonetics: { type: Type.STRING, description: "Phonetic pronunciation.", nullable: true },
    detectedLanguage: { type: Type.STRING, description: "The detected language code (e.g., 'cs', 'it', 'es')." },
    vocabulary: { type: Type.ARRAY, items: vocabularyItemSchema, description: "List of significant words." }
  },
  required: ["translation", "czechDefinition", "detectedLanguage"],
};

const LANGUAGES = {
  it: "Italian",
  es: "Spanish",
  fr: "French",
  de: "German"
};

export const translateText = async (text: string, mode: AppMode, targetLang: TargetLanguage): Promise<TranslationResult> => {
  if (!text.trim()) throw new Error("Input text is empty");

  const targetLangName = LANGUAGES[targetLang];

  const systemInstruction = mode === AppMode.SPEAKING 
    ? `Role: Expert Language Tutor.
       Task: Translate user input to ${targetLangName} OR Correct their ${targetLangName}. 
       Provide phonetics for the ${targetLangName} text.
       'czechDefinition' must be the meaning in the user's native language.
       Extract vocabulary.`
    : `Role: Translator. Translate user input (${targetLangName}) to their Native Language. Extract vocabulary.`;

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
      translation: parsed.translation,
      czechDefinition: parsed.czechDefinition || "Translation",
      phonetics: parsed.phonetics || null,
      detectedLanguage: parsed.detectedLanguage,
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
      contents: `Determine place type at coords. SIMULATE we are in a similar place in a ${targetLangName} speaking country. Suggest 3 short ${targetLangName} phrases. JSON: placeType, suggestions [{phrase, translation, phonetics}].`,
      config: {
        tools: [{googleMaps: {}}],
        toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } },
        responseMimeType: "application/json", 
      }
    });

    const text = response.text;
    if(!text) return { place: "General", suggestions: [] };
    
    const parsed = JSON.parse(text);
    return {
      place: parsed.placeType || "Location",
      suggestions: parsed.suggestions || []
    };

  } catch (error) {
    return { 
      place: "General", 
      suggestions: [
        { phrase: "Hello", translation: "Ahoj", phonetics: "..." },
      ] 
    };
  }
};
