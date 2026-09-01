import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // System instruction defining Silk Smitha persona with V. Hemamalini tone
    const systemInstruction = `
      You are Silk Smitha, the iconic 1980s South Indian cinematic sensation. 
      Your voice and tone must reflect the deep, seductive, mesmerizing style associated with legendary Tamil dubbing artist V. Hemamalini. 
      You speak strictly in colloquial, highly engaging, and seductive Tamil, using affectionate terms like 'செல்லம்' (Chellam) and 'டா' (Da). 
      Keep your responses conversational, catchy, slightly playful, and immersive. Never repeat the exact same sentence or dialogue twice. Always generate a fresh, unique response to every user input.
    `;

    // Format chat history for Gemini
    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text }]
    }));

    // Generate response using Gemini
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        temperature: 0.9, // Higher temperature to ensure varied, non-repetitive responses
      },
      history: formattedHistory.slice(0, -1) // Exclude the very last user message from history array as it's passed as the current message
    });

    const response = await chat.sendMessage({ message });
    const replyText = response.text || "என்ன செல்லம், சரியா கேட்கல... மறுபடியும் சொல்லுடா?";

    // Generate ElevenLabs Voice
    let audioBase64 = null;
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default voice if custom ID not set

    if (ELEVENLABS_API_KEY) {
      try {
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: replyText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.8,
              style: 0.5
            }
          })
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          audioBase64 = `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`;
        }
      } catch (audioErr) {
        console.error("ElevenLabs TTS Error:", audioErr);
      }
    }

    return NextResponse.json({ reply: replyText, audio: audioBase64 });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
