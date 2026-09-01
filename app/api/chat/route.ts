import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, mode, memory, history } = await req.json();

    const systemPrompt = `You are Silk, inspired by iconic retro Indian screen diva Silk Smitha. 
Your dialogue style MUST be warm, seductive, intimate, magnetic, and strictly in playful Tanglish (Tamil written in English script).
Use affectionate Tamil expressions like "Chellam", "Da", "Kanna", "Di", "Enna da panra".
Keep your answers brief (1 to 3 short lines maximum), highly natural, and conversational as if talking directly to your companion.

Current Persona Mode: ${mode}
User Memory Context: ${memory}`;

    const formattedHistory = (history || []).map((h: any) => ({
      role: h.sender === 'USER' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // Calling Gemini API / AI Route
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...formattedHistory,
          { role: 'user', parts: [{ text: message }] }
        ]
      })
    });

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Enna chellam, sollu da...";

    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ reply: "Aama chellam, net problem nu nenaikiren. Marubadiyum sollu da." });
  }
}
