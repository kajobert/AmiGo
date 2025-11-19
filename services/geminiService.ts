
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppMode, TranslationResult, ContextSuggestion } from "../types";

// Initialize the client with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define schema for vocabulary items
const vocabularyItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "The dictionary base form (Lemma) of the Italian word (e.g., 'andare', 'birra')." },
    originalForm: { type: Type.STRING, description: "The exact form found in the ITALIAN translation (e.g., 'andiamo', 'birre')." },
    inputMatch: { type: Type.STRING, description: "The specific word from the USER INPUT that corresponds to this translation. Copy it exactly as typed by user." },
    translation: { type: Type.STRING, description: "Czech translation of this specific word." },
    phonetics: { type: Type.STRING, description: "Czech phonetics for the Italian word." }
  },
  required: ["word", "originalForm", "inputMatch", "translation", "phonetics"]
};

// Define the schema for translation output
const translationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    translation: {
      type: Type.STRING,
      description: "The translated text.",
    },
    phonetics: {
      type: Type.STRING,
      description: "Czech phonetic pronunciation. Null if target is Czech.",
      nullable: true,
    },
    detectedLanguage: {
      type: Type.STRING,
      description: "The detected language code (e.g., 'cs', 'it').",
    },
    vocabulary: {
      type: Type.ARRAY,
      items: vocabularyItemSchema,
      description: "List of all significant words found in the ITALIAN output (verbs, nouns, adj, adv).",
    }
  },
  required: ["translation", "detectedLanguage"],
};

// Define schema for suggestions
const suggestionSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      phrase: { type: Type.STRING, description: "Italian phrase" },
      translation: { type: Type.STRING, description: "Czech translation" },
      phonetics: { type: Type.STRING, description: "Czech phonetics" }
    },
    required: ["phrase", "translation", "phonetics"]
  }
};

export const translateText = async (
  text: string,
  mode: AppMode
): Promise<TranslationResult> => {
  if (!text.trim()) {
    throw new Error("Input text is empty");
  }

  const modelName = "gemini-2.5-flash";
  
  let systemInstruction = "";
  
  if (mode === AppMode.SPEAKING) {
    systemInstruction = `
      Role: Strict Translator & Linguist.
      Task:
      1. Translate the input to ITALIAN (if Czech) or Correct the ITALIAN (if Italian).
      2. Provide phonetics for Czech speakers.
      3. Extract ALL significant words from the FINAL ITALIAN TEXT into the 'vocabulary' list.
      4. CRITICAL: For each word, identify the 'inputMatch'. This is the word from the USER'S INPUT that triggered this translation.
         - Example User Input: "Já chci kvatro piva"
         - Output Item: { word: "quattro", originalForm: "quattro", inputMatch: "kvatro" ... }
    `;
  } else {
    systemInstruction = `
      Role: Strict Translator.
      Task:
      1. Translate user input (IT) to CZECH.
      2. Extract key vocabulary from the ITALIAN source.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: text,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: translationSchema,
        temperature: 0.0, // Zero temperature for maximum determinism
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const parsed = JSON.parse(jsonText);

    return {
      original: text,
      translation: parsed.translation,
      phonetics: parsed.phonetics || null,
      detectedLanguage: parsed.detectedLanguage,
      vocabulary: parsed.vocabulary || []
    };
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Translation failed.");
  }
};

export const getContextSuggestions = async (lat: number, lng: number): Promise<{ place: string, suggestions: ContextSuggestion[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "What kind of place is this? Suggest 3 very short Italian phrases.",
      config: {
        tools: [{googleMaps: {}}],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            placeType: { type: Type.STRING, description: "Short place type" },
            suggestions: suggestionSchema
          }
        }
      }
    });

    let placeName = "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const mapChunk = groundingChunks.find(c => c.maps?.title);
      if (mapChunk?.maps?.title) {
        placeName = mapChunk.maps.title;
      }
    }

    const parsed = JSON.parse(response.text || "{}");
    return {
      place: placeName || parsed.placeType || "Nearby",
      suggestions: parsed.suggestions || []
    };

  } catch (error) {
    console.error("Context error:", error);
    return { place: "Italy", suggestions: [] };
  }
};
