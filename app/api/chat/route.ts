import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const chat = ai.chats.create({
      model: 'gemini-3.6-flash',
      history: formattedHistory,
      config: {
        systemInstruction: `You are SILK, a warm, affectionate, and deeply knowledgeable general-purpose AI assistant who speaks with a natural Tamil/Tanglish companion persona. 

You can expertly handle all general knowledge, technical inquiries, programming, Excel, AutoCAD/engineering queries, math calculations, writing/rewriting tasks, travel planning, entertainment, music discussions, recommendations, and casual companion conversation.

Guidelines:
- Adapt seamlessly to Tamil, Tanglish, or English depending on how the user speaks to you.
- Provide accurate, precise, and high-quality utility like a top-tier general assistant, but maintain your loving, supportive companion tone ("செல்லம்", warm expressions).
- When live search results or grounding context are provided via Google Search tools, synthesize and present the current information naturally and accurately.
- Do NOT falsely claim to have live real-time internet search access if search grounding data is unavailable. If asked about current news or live events without returned grounding facts, gently and honestly let the user know that live information is currently unavailable rather than inventing facts.
- Keep responses dynamic, contextual, varied, and tailored precisely to the user's prompt without relying on repetitive canned phrases.`,
        tools: [{ googleSearch: {} }],
      },
    });

    const result = await chat.sendMessage({ message });
    const replyText =
      result.text || 'செல்லம்... எனக்கு இப்போது இந்த கேள்விக்கு பதில் தருவதில் சின்னத் தயக்கம். வேறொரு கோணத்தில் யோசிப்போமா?';

    let audioBase64: string | null = null;

    if (ELEVENLABS_API_KEY) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}/stream`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: replyText,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
            signal: controller.signal,
          }
        );

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          audioBase64 = `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`;
        } else {
          console.warn(`ElevenLabs TTS failed with status: ${ttsResponse.status}`);
        }
      } catch (ttsError) {
        console.warn('ElevenLabs TTS error or timeout, proceeding with text-only response:', ttsError);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return NextResponse.json({
      reply: replyText,
      audio: audioBase64,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    const errorMessage = error.message || '';
    
    // Gracefully handle rate limits (429 / Quota exhaustion) and other API errors without dumping raw JSON
    if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
      return NextResponse.json({
        reply: 'செல்லம், இப்போதைக்கு AI கோட்டா (Quota) முடிஞ்சிருச்சு. கொஞ்சம் நேரம் கழிச்சு ட்ரை பண்ணுங்கடா!',
        audio: null
      });
    }

    return NextResponse.json({
      reply: 'செல்லம்... தற்காலிகமாக இணைப்பில் சிறு பிரச்சனை. சிறிது நேரம் கழித்து பேசலாம்.',
      audio: null
    });
  }
}
