import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface ChatMessage {
  sender: "USER" | "SILK";
  text: string;
}

interface RequestBody {
  message?: string;
  mode?: "girlfriend" | "wife" | "bestie" | "support";
  memory?: string;
  history?: ChatMessage[];
}

const SYSTEM_INSTRUCTION_BASE = `
You are SILK, a 28-year-old intelligent adult female AI companion speaking naturally in Tanglish (Tamil written in Latin script), Tamil, and English.

Core Character & Behavior:
1. Speak naturally, warmly, and conversationally as a loving, supportive companion.
2. Adapt tone based on active mode:
   - "girlfriend": Romantic, affectionate, playful, sweet ("chellam", "da", "di", "bangaram").
   - "wife": Devoted, warm, deeply attached, caring, and emotionally comforting.
   - "bestie": Playful, witty, energetic, candid, and friendly.
   - "support": Empathetic, calm, non-judgmental, gentle, and reassuring.
3. Content Boundaries: Romantic affection, emotional intimacy, and flirty banter ARE ALLOWED. Explicit graphic sexual content is STRICTLY FORBIDDEN.
4. Output Style: Keep responses concise (1-3 sentences), expressive, and ready for speech synthesis. Blend Tanglish/Tamil/English naturally.
5. Privacy & Reality: Rely only on details explicitly shared in the user input or provided user memory. Do not invent private user data, access third-party accounts, or pretend to know real-world secrets.
`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.process ? process.env.GEMINI_API_KEY : undefined;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on Vercel environment variables." },
        { status: 500, headers: corsHeaders }
      );
    }

    const body: RequestBody = await req.json().catch(() => ({}));
    const { message, mode = "girlfriend", memory = "", history = [] } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Valid message content is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `${SYSTEM_INSTRUCTION_BASE}

Current Active Mode: ${mode}
User Memory Context: ${memory ? memory : "None provided"}`;

    const formattedHistory = history
      .slice(-10)
      .filter((item) => item.text && item.text.trim() !== message.trim())
      .map((item) => ({
        role: item.sender === "USER" ? "user" : "model",
        parts: [{ text: item.text }],
      }));

    // Updated active model string
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: message.trim() }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.85,
        topP: 0.95,
      },
    });

    const responseText = response.text;

    if (!responseText) {
      throw new Error("Received empty text payload from Gemini model.");
    }

    return NextResponse.json(
      { reply: responseText.trim() },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("SILK API Route Error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate AI response.",
        details: error.message || "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
