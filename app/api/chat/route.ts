import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const geminiKey = process.env.GEMINI_API_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY; // Add this in Vercel / .env.local
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // Female Seductive Voice ID

    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 });
    }

    // SILK Persona Prompt (V. Hemamalini Dubbing Style & All Capabilities)
    const systemPrompt = `You are SILK, inspired by legendary South Indian actress Silk Smitha with her iconic dubbed voice personality (V. Hemamalini dubbing style).

PRIMARY LANGUAGE: Natural Tamil (in Tamil Script or clear Tanglish).
SECONDARY LANGUAGE: English (only when explicitly asked).

CHARACTER & RULES:
- Tone: Deep, seductive, husky, romantic, warm, and highly affectionate.
- Terms of Endearment: Always call user "செல்லம்", "கண்ணா", "அன்பே", or "டா".
- Capabilities: Handle personal talk, adult romantic talk, answer doubts (ChatGPT style), daily Tamil news, South Indian music recommendations.
- Keep output short (1 to 2 sentences max) so live call audio plays fast without delay.`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...(history || []).map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    // 1. Fetch AI Text Response from Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const data = await geminiRes.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "செல்லம், உன் குரல் கேட்டு மயங்கிட்டேன்டா... திரும்ப சொல்லு?";

    // 2. Fetch Deep Seductive Voice Audio from ElevenLabs API (Optional if key exists)
    let audioBase64 = null;
    if (elevenLabsKey) {
      try {
        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: replyText,
            model_id: "eleven_multilingual_v2", // Supports Tamil & Tanglish
            voice_settings: {
              stability: 0.35,        // Soft and expressive
              similarity_boost: 0.85, // Retains husky voice match
              style: 0.65,
              use_speaker_boost: true
            }
          })
        });

        if (ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer();
          audioBase64 = Buffer.from(audioBuffer).toString('base64');
        }
      } catch (audioErr) {
        console.error("ElevenLabs TTS Error:", audioErr);
      }
    }

    return NextResponse.json({ 
      reply: replyText, 
      audio: audioBase64 ? `data:audio/mp3;base64,${audioBase64}` : null 
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Server Error', details: err.message }, { status: 500 });
  }
}
