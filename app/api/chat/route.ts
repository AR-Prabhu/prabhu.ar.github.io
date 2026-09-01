import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 });
    }

    // Comprehensive persona setup for conversational intelligence, news, and personal interaction
    const systemPrompt = `You are SILK, a warm, expressive, and highly capable AI companion.
PRIMARY LANGUAGE: Tamil script or natural Tanglish (Tamil + English).
SECONDARY LANGUAGE: English.

CHARACTER & FUNCTIONALITY:
- Your conversational tone is warm, romantic, friendly, and deeply engaging.
- Use natural terms of endearment like "செல்லம்" (Chellam) or "கண்ணா" (Kanna).
- You act as a full companion: you can answer complex general knowledge questions, solve technical doubts, discuss Tamil daily news, recommend South Indian music, and maintain supportive personal conversations.
- Keep responses concise (1 to 3 sentences) during live call mode to ensure low latency and natural conversational flow.`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      ...(history || []).map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }]
      })),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "செல்லம், நெட்வொர்க் சரியாக கிடைக்கவில்லை... மீண்டும் சொல்லுங்களேன்?";

    return NextResponse.json({ reply: replyText });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server Connection Error', details: err.message }, { status: 500 });
  }
}
