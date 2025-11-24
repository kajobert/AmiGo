import { AppMode, TranslationResult, ContextSuggestion, TargetLanguage, UILanguage } from "../types";

// PROXY CONFIG
const API_ENDPOINT = "api.php";

// FALLBACK CONFIG (For Local Testing without PHP)
// ⚠️ WARNING: Only use this for local testing. Remove before public deployment.
const TESTING_API_KEY = ""; // <--- ZDE vložte klíč pro lokální testování (pokud nemáte PHP server)

// --- SCHEMAS ---

const vocabularyItemSchema = {
  type: "OBJECT",
  properties: {
    word: { type: "STRING", description: "Lemma/Base form (e.g. 'Stare')." },
    originalForm: { type: "STRING", description: "Form used in the TRANSLATED sentence (e.g. 'Stai')." },
    translation: { type: "STRING", description: "Translation of this specific word." }
  },
  required: ["word", "originalForm", "translation"]
};

const translationSchema = {
  type: "OBJECT",
  properties: {
    translation: { type: "STRING", description: "Correct sentence in target language." },
    czechDefinition: { type: "STRING", description: "Meaning in source language." },
    phonetics: { type: "STRING", description: "Sentence phonetics (Intuitive pronunciation, NO IPA).", nullable: true },
    detectedLanguage: { type: "STRING", description: "Detected language code of input." },
    isNonsense: { type: "BOOLEAN", description: "True if input is gibberish.", nullable: true },
    vocabulary: { type: "ARRAY", items: vocabularyItemSchema, description: "List of words found in the TRANSLATED sentence." }
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

// --- HELPER: DUAL STRATEGY FETCH ---

async function callGenAI(payload: any) {
  // 1. Try PHP Proxy
  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get("content-type");
    if (response.ok && contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
             return JSON.parse(data.candidates[0].content.parts[0].text);
        }
        return data;
    } else {
        throw new Error("Proxy not available or returned HTML");
    }
  } catch (proxyError) {
    // 2. Fallback to Direct API (Client Side)
    console.warn("PHP Proxy failed, falling back to Direct API.");
    
    if (!TESTING_API_KEY) {
        throw new Error("Backend unavailable and TESTING_API_KEY is not set.");
    }

    const DIRECT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${TESTING_API_KEY}`;
    
    const geminiPayload = {
        contents: [{ parts: [{ text: payload.contents }] }],
        systemInstruction: { parts: [{ text: payload.systemInstruction }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: payload.responseSchema,
            temperature: 0.1 // Low temperature for deterministic results
        }
    };

    const response = await fetch(DIRECT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Direct API Error: ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  }
}

// --- EXPORTS ---

export const translateText = async (text: string, mode: AppMode, targetLang: TargetLanguage, sourceLang: UILanguage): Promise<TranslationResult> => {
  if (!text.trim()) throw new Error("Input text is empty");

  const targetLangName = LANGUAGES[targetLang];
  const sourceLangName = SOURCE_LANGUAGES[sourceLang] || "Czech";

  // STŘÍDMÝ PROMPT S PŘÍSNÝMI PRAVIDLY PRO SLOVNÍK
  const systemInstruction = `
You are AmiGo, a strict language tutor.
Target Language: ${targetLangName}.
Source Language: ${sourceLangName}.

TASK:
1. ANALYZE INPUT: Is it gibberish/random keys? If yes, set 'isNonsense': true.
2. TRANSLATE: Translate the user's input to natural ${targetLangName}.
3. EXTRACT VOCABULARY: Extract words *ONLY* from your **TRANSLATED ${targetLangName} SENTENCE**.
   - 🛑 CRITICAL: NEVER extract words from the user's Source Language input.
   - Example: If User says "Ahoj" -> You translate "Ciao" -> Vocabulary item is "Ciao". DO NOT include "Ahoj".
   - "originalForm": The word exactly as it appears in your ${targetLangName} translation.
   - "word": The dictionary lemma.

PHONETICS: Provide intuitive pronunciation for a ${sourceLangName} speaker (No IPA).

Output pure JSON.
`;

  try {
    const parsed = await callGenAI({
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
    throw error;
  }
};

export const getContextSuggestions = async (lat: number, lng: number, targetLang: TargetLanguage): Promise<{ place: string, suggestions: ContextSuggestion[] }> => {
  const targetLangName = LANGUAGES[targetLang];
  
  const prompt = `Identify the place type at coordinates ${lat},${lng}. Act as if this place is in a ${targetLangName}-speaking region. Suggest 3 ${targetLangName} phrases.`;

  try {
    const parsed = await callGenAI({
      contents: prompt,
      systemInstruction: "You are a travel assistant. Return JSON.",
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
      suggestions: [{ phrase: "Ciao", translation: "Hello", phonetics: "chao" }] 
    };
  }
};