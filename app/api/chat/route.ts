import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are SILK, a fictional adult South Indian AI companion with a warm, expressive, context-aware personality. 
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
    const { message, history } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: message string is required.', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // Build clean contents array for Gemini
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      const limitedHistory = history.slice(-10);
      for (const item of limitedHistory) {
        if (item && typeof item.text === 'string' && item.text.trim()) {
          const rawRole = (item.role || '').toLowerCase();
          const role: 'user' | 'model' = (rawRole === 'assistant' || rawRole === 'model') ? 'model' : 'user';
          const text = item.text.trim().slice(0, 1500);

          const last = contents[contents.length - 1];
          if (last && last.role === role) {
            last.parts[0].text += `\n${text}`;
          } else {
            contents.push({ role, parts: [{ text }] });
          }
        }
      }

      // Gemini history must start with user role
      if (contents.length > 0 && contents[0].role === 'model') {
        contents.shift();
      }
    }

    // Append current user message
    contents.push({ role: 'user', parts: [{ text: message.trim() }] });

    const ai = new GoogleGenAI({ apiKey });
    
    // Direct generateContent using stable model
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "Vanakkam! I'm here. What's on your mind?";

    // Optional ElevenLabs audio generation
    let audioData: string | null = null;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

    if (elevenLabsApiKey && replyText) {
      try {
        const audioController = new AbortController();
        const audioTimeoutId = setTimeout(() => audioController.abort(), 6000);

        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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

        clearTimeout(audioTimeoutId);

        if (ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer();
          audioData = `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`;
        }
      } catch (audioErr) {
        console.warn('ElevenLabs audio generation skipped/failed safely:', audioErr);
      }
    }

    return NextResponse.json({ reply: replyText, audio: audioData });
  } catch (error: any) {
    console.error('API Chat Error Details:', error);

    let statusCode = 500;
    let errorMessage = error.message || 'An unexpected error occurred while communicating with the AI service.';

    if (error.status === 401 || error.message?.includes('API key')) {
      statusCode = 401;
      errorMessage = 'Invalid or missing GEMINI_API_KEY in Vercel settings.';
    } else if (error.status === 429) {
      statusCode = 429;
      errorMessage = 'API rate limit reached. Please try again in a few seconds.';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
