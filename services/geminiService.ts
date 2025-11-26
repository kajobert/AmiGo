
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppMode, TranslationResult, ContextSuggestion, TargetLanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const vocabularyItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    original: { type: Type.STRING, description: "Text from user input." },
    lemma: { type: Type.STRING, description: "Target language lemma." },
    targetWord: { type: Type.STRING, description: "Correct target form in context." },
    phonetics: { type: Type.STRING, description: "Phonetic transcription (IPA)." },
    status: { type: Type.STRING, enum: ["win", "gap", "typo"], description: "Assessment of the word." },
    matchType: { type: Type.STRING, enum: ["exact", "phonetic", "none"], description: "Type of match." },
    translation: { type: Type.STRING, description: "Native translation of this specific word." }
  },
  required: ["original", "lemma", "targetWord", "phonetics", "status", "matchType", "translation"]
};

const translationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    translation: { type: Type.STRING, description: "The perfect target language sentence." },
    nativeMeaning: { type: Type.STRING, description: "The meaning in the native language." },
    analysis: { type: Type.ARRAY, items: vocabularyItemSchema, description: "Word-by-word analysis." }
  },
  required: ["translation", "nativeMeaning", "analysis"],
};

const LANGUAGES = {
  it: "Italian",
  es: "Spanish",
  fr: "French",
  de: "German"
};

export const AMIGO_SYSTEM_PROMPT = `
You are AmiGo, an intelligent language learning assistant designed for "Code Switching" practice.
Your user is a learner who speaks a "Native Language" (e.g., Czech) and is learning a "Target Language" (e.g., Italian).

THE USER'S GOAL:
The user will input sentences that are a MIX of their Native Language and the Target Language.
They try to use Target Language words where they can, and fall back to Native Language where they cannot.

YOUR TASK:
1. Analyze the user's input sentence.
2. Identify the intent/meaning of the full sentence.
3. For EACH word or phrase in the sentence, determine:
    - Is it a valid attempt at the Target Language?
    - Is it a Native Language word (Gap)?
    - Is it a typo?
4. Return a structured JSON object containing the full translation, meaning, and word-by-word analysis.

CRITICAL RULES:
- **Lemma:** Always provide the base form (lemma) of the Target Language word.
- **Phonetics:** Provide the IPA or standard phonetic transcription for the target word.
- **Strictness:** Do NOT hallucinate. If a word is clearly Native, it is a GAP.

JSON OUTPUT FORMAT:
Return ONLY a raw JSON object (no markdown). Structure:
{
  "translation": "The perfect target language sentence",
  "nativeMeaning": "The meaning in the native language",
  "analysis": [
    {
      "original": "text from user input",
      "lemma": "target language lemma",
      "targetWord": "correct target form in context",
      "phonetics": "/IPA/",
      "status": "win" | "gap" | "typo",
      "matchType": "exact" | "phonetic" | "none",
      "translation": "native translation of this specific word"
    }
  ]
}
`;

export const translateText = async (text: string, mode: AppMode, targetLang: TargetLanguage): Promise<TranslationResult> => {
  if (!text.trim()) throw new Error("Input text is empty");

  // We are using the AMIGO_SYSTEM_PROMPT for now, tailored to "Code Switching".
  // Note: The prompt is generic regarding target language names (it expects context),
  // but to be safe and specific, we can append the language context or rely on the prompt's
  // embedded instructions if we inject the variables.

  // However, the prompt provided is a static string in the user instruction.
  // To make it dynamic (inserting 'Czech' and 'Italian'), we should construct it dynamically
  // or prepend the specific context.
  // Given the instruction says "Replace the systemInstruction with this specialized prompt",
  // I will use it as the base. I will prepend the specific language configuration to ensure it knows the languages.

  const targetLangName = LANGUAGES[targetLang];
  const nativeLangName = "Czech"; // Assuming Native is Czech as per context

  const specificInstruction = `Native Language: ${nativeLangName}\nTarget Language: ${targetLangName}\n\n${AMIGO_SYSTEM_PROMPT}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: text,
      config: {
        systemInstruction: specificInstruction,
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
      czechDefinition: parsed.nativeMeaning || "Translation",
      phonetics: null, // The new prompt puts phonetics in the analysis items, not the top level.
      detectedLanguage: targetLang, // We assume the output is the target language.
      vocabulary: parsed.analysis ? parsed.analysis.map((item: any) => ({
        word: item.lemma,
        originalForm: item.targetWord,
        inputMatch: item.original,
        translation: item.translation,
        phonetics: item.phonetics,
        status: item.status,
        matchType: item.matchType
      })) : []
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
