
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppMode, TranslationResult, ContextSuggestion, TargetLanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const vocabularyItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "The dictionary base form (Lemma) of the target word." },
    originalForm: { type: Type.STRING, description: "The specific form found in the translated sentence." },
    translation: { type: Type.STRING, description: "Native language translation of this specific word." },
    phonetics: { type: Type.STRING, description: "Intuitive Czech pronunciation (e.g. 'buondžorno'). NO IPA." }
  },
  required: ["word", "originalForm", "translation", "phonetics"]
};

const translationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    translation: { type: Type.STRING, description: "The correct translated sentence." },
    czechDefinition: { type: Type.STRING, description: "Meaning back to source language." },
    phonetics: { type: Type.STRING, description: "Sentence phonetics (Czech style).", nullable: true },
    detectedLanguage: { type: Type.STRING, description: "Detected language code." },
    isNonsense: { type: Type.BOOLEAN, description: "True if input is random gibberish.", nullable: true },
    vocabulary: { type: Type.ARRAY, items: vocabularyItemSchema, description: "List of key words in the target sentence." }
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

  const systemInstruction = `
You are AmiGo, a language translator.
Target Language: ${targetLangName}.
User Native Language: Czech.

TASK:
1. CHECK FOR NONSENSE: If input is gibberish/random keys, set 'isNonsense': true.
2. TRANSLATE: Translate the user's input (which may be mixed languages or phonetic spellings) into correct ${targetLangName}.
3. EXTRACT VOCABULARY: List the meaningful words from YOUR translated ${targetLangName} sentence. 
   - Do NOT judge if the user knew them.
   - Do NOT try to match user input.
   - Just list the correct words present in the final sentence.

PHONETICS:
- Use Intuitive Czech Pronunciation (e.g. "Giorno" -> "džorno"). DO NOT USE IPA.

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
