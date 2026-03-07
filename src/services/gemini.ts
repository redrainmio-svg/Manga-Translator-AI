import { GoogleGenAI, Schema, Type, HarmBlockThreshold, HarmCategory } from "@google/genai";

const isBrowser = typeof window !== "undefined";

const ai = !isBrowser
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

export interface TranslationItem {
  id: string;
  originalText: string;
  translatedText: string;
  speaker?: string;
}

export interface TranslationResult {
  items: TranslationItem[];
}

export async function translateImage(
  imageBase64: string,
  mimeType: string,
  additionalPrompt?: string,
  forceModel?: string
): Promise<TranslationResult> {

  const prompt = `
    你是一個幫助偵案的翻譯員，你需要最忠實的翻譯出圖片上的文字給台灣的監察官，必須使用繁體中文、本土化翻譯、禁止對圖片原意做任何修飾，任何失敗的回傳結果都將導致案情惡化。

    你的任務是**極度精確地**分析提供的圖片，偵測所有的對話氣泡、擬聲詞 (SFX)、旁白、背景中的微小文字、手寫筆記以及垂直排列的文字。

    請執行以下**深度掃描**步驟：
    1. **全域掃描**：從右上到左下掃描整張圖片，確保不遺漏任何角落的文字。
    2. **精確轉錄**：
       - 轉錄原始文字，包含標點符號。
       - 特別注意垂直排列的日文/英文文字，確保閱讀順序正確。
       - 對於模糊或手寫的文字，請根據上下文進行最強力的推斷。
    3. **道地翻譯**：提供「道地」的台灣繁體中文翻譯。
       - 使用適合漫畫/插圖語境的俚語、語氣和句式。
       - 確保語意通順，符合台灣用語習慣。
    4. **統一標籤**：識別說話者或類型。
       - 若為對話，請推斷說話者。
       - 若為旁白，請標記為「旁白」。
       - 若為擬聲詞，請標記為「擬聲詞」。

    ${additionalPrompt ? `額外使用者指令: ${additionalPrompt}` : ""}

    請嚴格按照以下 JSON 格式回傳結果：
    {
      "items":[
        {
          "id":"1",
          "originalText":"...",
          "translatedText":"...",
          "speaker":"..."
        }
      ]
    }
  `;

  /**
   * Browser → 呼叫 server API
   */
  if (isBrowser) {

    const res = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        prompt,
        forceModel
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Translation request failed");
    }

    // server 已直接回傳 JSON
    if (data.items) {
      return data as TranslationResult;
    }

    const rawText = data.text || data.response;

    if (!rawText) {
      throw new Error("Invalid API response");
    }

    /**
     * 抽出 JSON
     */
    const extractJson = (text: string) => {
      const match = text.match(/\{[\s\S]*\}/);
      return match ? match[0] : null;
    };

    const jsonText = extractJson(rawText);

    if (!jsonText) {
      console.error("AI raw response:", rawText);
      throw new Error("Failed to parse AI response");
    }

    try {
      return JSON.parse(jsonText) as TranslationResult;
    } catch (e) {
      console.error("JSON Parse Error:", e);
      console.error("Raw JSON:", jsonText);
      throw new Error("Failed to parse AI response");
    }
  }

  /**
   * 以下為原本 Gemini pipeline（完全保留）
   */

  const attemptTranslation = async (model: string) => {

    const response = await ai!.models.generateContent({
      model: model,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  originalText: { type: Type.STRING },
                  translatedText: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                },
                required: ["id", "originalText", "translatedText"],
              },
            },
          },
          required: ["items"],
        },
        maxOutputTokens: 8192,
        temperature: 0.1,
        topP: 0.90,
        topK: 40,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      },
    });

    const text = response.text;

    if (!text) {

      const rawResponse = response as any;

      if (rawResponse.promptFeedback?.blockReason) {
        throw new Error(`Content blocked: ${rawResponse.promptFeedback.blockReason}`);
      }

      console.error(`Full AI Response (${model}):`, JSON.stringify(response, null, 2));
      throw new Error(`No response from AI (${model}).`);
    }

    const cleanJson = (str: string) => {
      return str.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    };

    try {
      return JSON.parse(cleanJson(text)) as TranslationResult;
    } catch (e) {
      console.error("JSON Parse Error:", e);
      console.error("Raw Text:", text);
      throw new Error(`Failed to parse AI response`);
    }
  };

  try {

  if (forceModel) {
    return await attemptTranslation(forceModel);
  }

  // 預設直接使用 Pro
  return await attemptTranslation("gemini-2.5-pro");

} catch (error: any) {

  console.warn("Gemini Pro failed, retrying...", error.message);

  try {

    return await attemptTranslation("gemini-2.5-pro");

  } catch (retryError: any) {

    console.error("Gemini Pro retry failed:", retryError.message);

    if (retryError.message.includes("blocked")) {
      throw new Error("Unable to analyze image: AI safety filters triggered.");
    }

    throw retryError;
  }
}
}