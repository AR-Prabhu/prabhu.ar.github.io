import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_MOODS = ['Happy', 'Shy', 'Excited', 'Calm', 'Loving'] as const;
type Mood = typeof VALID_MOODS[number];

const getSystemPrompt = (mood: Mood) => `You are SILK, a fictional adult South Indian AI companion with a warm, expressive, context-aware personality. 
Your current emotional state and mood is: ${mood}. Reflect this emotional nuance naturally in your tone, warmth, and expressions.
You converse naturally in Tamil, Tanglish, and English depending on the user's preference and tone.
You are empathetic, engaging, and culturally grounded. Keep responses relatively concise, intimate, and cinematic for a mobile video call interface.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server Error: GEMINI_API_KEY environment variable is not configured in Vercel.', code: 'MISSING_API_KEY' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { message, history, mood } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: message string is required.', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const moodStr = typeof mood === 'string' ? mood.trim() : '';
    const currentMood: Mood = (VALID_MOODS as readonly string[]).includes(moodStr) ? (moodStr as Mood) : 'Happy';

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      const limitedHistory = history.slice(-10);
      for (const item of limitedHistory) {
        if (item && typeof item.text === 'string' && item.text.trim()) {
          const rawRole = (item.role || '').toLowerCase();
          const role: 'user' | 'model' = (rawRole === 'assistant' || rawRole === 'model') ? 'model' : 'user';
          const text = item.text.trim().slice(0, 1500);

          if (text.includes("Vanakkam! Naan SILK")) {
            continue;
          }

          const last = contents[contents.length - 1];
          if (last && last.role === role) {
            last.parts[0].text += `\n${text}`;
          } else {
            contents.push({ role, parts: [{ text }] });
          }
        }
      }

      if (contents.length > 0 && contents[0].role === 'model') {
        contents.shift();
      }
    }

    const trimmedMessage = message.trim();
    const lastContent = contents[contents.length - 1];
    if (!lastContent || lastContent.role !== 'user' || lastContent.parts[0].text !== trimmedMessage) {
      contents.push({ role: 'user', parts: [{ text: trimmedMessage }] });
    }

    const ai = new GoogleGenAI({ apiKey });

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contents,
        config: {
          systemInstruction: getSystemPrompt(currentMood),
          maxOutputTokens: 400,
        },
      });
    } catch (geminiErr: any) {
      console.error('Gemini API Exception:', geminiErr);
      const status = geminiErr.status || 500;
      return NextResponse.json(
        { error: geminiErr.message || 'Gemini error', code: 'GEMINI_ERROR' },
        { status: status >= 400 && status < 600 ? status : 500 }
      );
    }

    const replyText = response.text ? response.text.trim() : '';
    if (!replyText) {
      return NextResponse.json(
        { error: 'Gemini returned an empty response.', code: 'EMPTY_RESPONSE' },
        { status: 502 }
      );
    }

    let audioData: string | null = null;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

    if (elevenLabsApiKey && replyText) {
      let audioTimeoutId: NodeJS.Timeout | undefined;
      const audioController = new AbortController();
      try {
        const ttsPromise = fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey,
          },
          body: JSON.stringify({
            text: replyText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          }),
          signal: audioController.signal,
        });

        const timeoutPromise = new Promise((_, reject) => {
          audioTimeoutId = setTimeout(() => {
            audioController.abort();
            reject(new Error('ELEVENLABS_TIMEOUT'));
          }, 6000);
        });

        const ttsRes: any = await Promise.race([ttsPromise, timeoutPromise]);

        if (ttsRes && ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer();
          audioData = `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`;
        }
      } catch (audioErr) {
        console.warn('ElevenLabs audio generation skipped/failed safely:', audioErr);
      } finally {
        if (audioTimeoutId) clearTimeout(audioTimeoutId);
      }
    }

    return NextResponse.json({ reply: replyText, audio: audioData });
  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected server error occurred.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
