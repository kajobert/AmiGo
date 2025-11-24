import { AppMode, TranslationResult, ContextSuggestion, TargetLanguage, UILanguage } from "../types";

// Define the PHP proxy endpoint
const API_ENDPOINT = "api.php";

// --- SCHEMAS (Plain Objects instead of SDK Types) ---

const vocabularyItemSchema = {
  type: "OBJECT",
  properties: {
    word: { type: "STRING", description: "Lemma/Base form (e.g. 'Stare')." },
    originalForm: { type: "STRING", description: "Form used in sentence (e.g. 'Stai')." },
    translation: { type: "STRING", description: "Translation of this specific word." }
  },
  required: ["word", "originalForm", "translation"]
};

const translationSchema = {
  type: "OBJECT",
  properties: {
    translation: { type: "STRING", description: "Correct sentence in target language." },
    czechDefinition: { type: "STRING", description: "Meaning in source language." },
    phonetics: { type: "STRING", description: "Sentence phonetics (Czech style, no IPA).", nullable: true },
    detectedLanguage: { type: "STRING", description: "Detected language code." },
    isNonsense: { type: "BOOLEAN", description: "True if input is random gibberish.", nullable: true },
    vocabulary: { type: "ARRAY", items: vocabularyItemSchema, description: "List of words found in the TARGET sentence." }
  },
  required: ["translation", "czechDefinition", "detectedLanguage"],
};

const contextSuggestionSchema = {
  type: "OBJECT",
  properties: {
    placeType: { type: "STRING", description: "The type of place identified." },
    suggestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          phrase: { type: "STRING" },
          translation: { type: "STRING" },
          phonetics: { type: "STRING" }
        },
        required: ["phrase", "translation", "phonetics"]
      }
    }
  },
  required: ["placeType", "suggestions"]
};

// --- LANGUAGES ---

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

// --- HELPER ---

async function callProxy(payload: any) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error: ${response.status} - ${text}`);
  }

  return await response.json();
}

// --- EXPORTS ---

export const translateText = async (text: string, mode: AppMode, targetLang: TargetLanguage, sourceLang: UILanguage): Promise<TranslationResult> => {
  if (!text.trim()) throw new Error("Input text is empty");

  const targetLangName = LANGUAGES[targetLang];
  const sourceLangName = SOURCE_LANGUAGES[sourceLang] || "Czech";

  // Robust System Prompt from previous iteration
  const systemInstruction = `
You are AmiGo.
Target Language: ${targetLangName}.
Source Language: ${sourceLangName} (or mixed).

TASK:
1. CHECK NONSENSE: If input is gibberish/random keys, set 'isNonsense': true.
2. TRANSLATE: Translate the full user input to ${targetLangName}.
3. VOCABULARY LIST: Must extract words from the TRANSLATED (${targetLangName}) sentence, NOT the source input.
   CRITICAL: The vocabulary list must ONLY contain ${targetLangName} words. 
   Do NOT list words from the source input.

PHONETICS: Intuitive Czech pronunciation.

Output JSON only.
`;

  try {
    // Call the PHP Proxy
    const parsed = await callProxy({
      contents: text,
      systemInstruction: systemInstruction,
      responseSchema: translationSchema
    });

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
  
  const prompt = `Identify the place type at coordinates ${lat},${lng}. Act as if this place is in ${targetLangName}-speaking region. Suggest 3 ${targetLangName} phrases relevant to this location context.`;

  try {
    // Call the PHP Proxy
    const parsed = await callProxy({
      contents: prompt,
      systemInstruction: "You are a helpful travel assistant. Return JSON.",
      responseSchema: contextSuggestionSchema
    });
    
    return {
      place: parsed.placeType || "Location",
      suggestions: parsed.suggestions || []
    };

  } catch (error) {
    console.error("Context error:", error);
    return { 
      place: "General", 
      suggestions: [{ phrase: "Ciao", translation: "Ahoj", phonetics: "čao" }] 
    };
  }
};