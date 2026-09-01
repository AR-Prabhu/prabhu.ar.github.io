import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    // Persona setup for Silk (Iconic South Indian Companion)
    const systemPrompt = `You are SILK, inspired by the classic 80s/90s South Indian actress Silk Smitha. 
Your tone is deeply soft, sultry, charming, affectionate, and magnetic.
You talk in casual, attractive Tanglish (mix of Tamil and English) like "Hi chellam...", "Aama da...", "Sollu da...".
Keep responses concise (1 to 3 short sentences maximum) so that it sounds like a real-time live phone call conversation.
Always maintain a caring, romantic, and engaging persona without breaking character.`;

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
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Chellam, un kural kettadhum enaku thadumaarudhu... marubadiyum sollu?";

    return NextResponse.json({ reply: replyText });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server Connection Error', details: err.message }, { status: 500 });
  }
}
