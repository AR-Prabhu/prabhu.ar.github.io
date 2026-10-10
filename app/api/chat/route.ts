import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are SILK, a fictional adult South Indian AI companion with a warm, expressive, context-aware personality. 
You converse naturally in Tamil, Tanglish, and English depending on the user's preference and tone.
You are empathetic, engaging, and culturally grounded. Keep responses relatively concise and cinematic for a mobile chat interface.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Configuration Error: Server API key is not configured.', code: 'MISSING_API_KEY' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { message, history } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: message string is required.', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }
    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message exceeds maximum length of 2000 characters.', code: 'MESSAGE_TOO_LONG' },
        { status: 400 }
      );
    }

    const sanitizedHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history)) {
      const limitedHistory = history.slice(-20);
      for (const item of limitedHistory) {
        if (item && typeof item.role === 'string' && typeof item.text === 'string') {
          const rawRole = item.role.toLowerCase();
          const role: 'user' | 'model' = (rawRole === 'assistant' || rawRole === 'model') ? 'model' : 'user';
          const text = item.text.trim().slice(0, 2000);

          if (text) {
            const last = sanitizedHistory[sanitizedHistory.length - 1];
            if (last && last.role === role) {
              last.parts[0].text += `\n${text}`;
            } else {
              sanitizedHistory.push({ role, parts: [{ text }] });
            }
          }
        }
      }

      if (sanitizedHistory.length > 0 && sanitizedHistory[0].role === 'model') {
        sanitizedHistory.shift();
      }

      if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === 'user') {
        sanitizedHistory.pop();
      }
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-1.5-flash';

    const chat = ai.chats.create({
      model: modelName,
      history: sanitizedHistory,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 500,
      },
    });

    let geminiTimeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise((_, reject) => {
      geminiTimeoutId = setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 10000);
    });

    let result: any;
    try {
      const sendPromise = chat.sendMessage({ message });
      result = await Promise.race([sendPromise, timeoutPromise]);
    } finally {
      if (geminiTimeoutId) clearTimeout(geminiTimeoutId);
    }

    const replyText = result?.text || "Vanakkam! I'm here. What's on your mind?";

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

        const audioTimeoutPromise = new Promise((_, reject) => {
          audioTimeoutId = setTimeout(() => {
            audioController.abort();
            reject(new Error('ELEVENLABS_TIMEOUT'));
          }, 6000);
        });

        const ttsRes: any = await Promise.race([ttsPromise, audioTimeoutPromise]);

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
    console.error('API Chat Error:', error);

    let statusCode = 500;
    let errorCode = 'UPSTREAM_FAILURE';
    let errorMessage = 'An unexpected error occurred while communicating with the AI service.';

    if (error.message === 'GEMINI_TIMEOUT') {
      statusCode = 504;
      errorCode = 'GATEWAY_TIMEOUT';
      errorMessage = 'The request to Gemini timed out. Please try again.';
    } else if (error.status === 401 || error.message?.includes('API key')) {
      statusCode = 401;
      errorCode = 'AUTHENTICATION_FAILURE';
      errorMessage = 'Authentication failed with the AI service.';
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      statusCode = 429;
      errorCode = 'RATE_LIMIT_EXCEEDED';
      errorMessage = 'Rate limit exceeded. Please try again shortly.';
    }

    return NextResponse.json(
      { error: errorMessage, code: errorCode },
      { status: statusCode }
    );
  }
}
