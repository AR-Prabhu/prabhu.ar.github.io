'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ShieldAlert, Volume2, Square, Power, Mic, MicOff, RotateCcw } from 'lucide-react';
import { LiveAvatarSession } from '@heygen/liveavatar-web-sdk';

const LOOKS = [
  { name: 'Saree', path: '/silk/silk-face-1.jpg.jpg' },
  { name: 'Traditional', path: '/silk/silk-face-2.jpg.jpg' },
  { name: 'Night', path: '/silk/silk-face-3.jpg.jpg' },
  { name: 'Casual', path: '/silk/silk-face-4.jpg.jpg' },
  { name: 'Glamour', path: '/silk/silk-face-5.jpg.jpg' },
];

const MOODS = ['Happy', 'Shy', 'Excited', 'Calm', 'Loving'];

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function SilkCompanionPage() {
  const [currentLook, setCurrentLook] = useState('Saree');
  const [currentMood, setCurrentMood] = useState('Happy');
  const [framing, setFraming] = useState<'closeup' | 'half' | 'full'>('half');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Vanakkam! Naan SILK. How are you doing today? Ready to chat in Tamil, Tanglish, or English?" }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastAudioUri, setLastAudioUri] = useState<string | null>(null);
  const [lastReplyText, setLastReplyText] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // LiveAvatar Session State
  const [avatarActive, setAvatarActive] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const avatarSessionRef = useRef<any>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const activeLookObj = LOOKS.find(l => l.name === currentLook) || LOOKS[0];
  const imageSrc = activeLookObj.path;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (avatarSessionRef.current) {
        avatarSessionRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          setInputMessage(transcript);
        };
        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInputMessage('');
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const startLiveAvatar = async () => {
    if (avatarLoading || avatarActive) return;
    setAvatarLoading(true);
    setErrorBanner(null);

    try {
      const res = await fetch('/api/liveavatar/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate LiveAvatar session token.');
      }

      const session = new LiveAvatarSession(data.sessionToken, {
        autoKeepAlive: true,
        voiceChat: { defaultMuted: true },
      });

      session.on?.('connected', () => {
        setAvatarActive(true);
        setAvatarLoading(false);
        if (videoElementRef.current && typeof session.attach === 'function') {
          session.attach(videoElementRef.current);
        }
      });

      session.on?.('disconnected', () => {
        setAvatarActive(false);
        setAvatarLoading(false);
        setIsSpeaking(false);
      });

      session.on?.('error', (err: any) => {
        console.error('LiveAvatar Session Error:', err);
        setErrorBanner(err.message || 'LiveAvatar stream error encountered.');
        setAvatarActive(false);
        setAvatarLoading(false);
      });

      await session.start();
      avatarSessionRef.current = session;

    } catch (err: any) {
      console.error('LiveAvatar Startup Error:', err);
      setErrorBanner(err.message || 'Could not start LiveAvatar session. Check your Vercel settings.');
      setAvatarActive(false);
    } finally {
      setAvatarLoading(false);
    }
  };

  const stopLiveAvatar = async () => {
    try {
      if (avatarSessionRef.current) {
        await avatarSessionRef.current.stop();
        avatarSessionRef.current = null;
      }
    } catch (e) {
      console.warn('Error stopping avatar session:', e);
    } finally {
      setAvatarActive(false);
      setAvatarLoading(false);
      setIsSpeaking(false);
    }
  };

  const playAudioResponse = (audioUri: string | null, textFallback: string) => {
    stopSpeaking();
    setIsSpeaking(true);
    setLastAudioUri(audioUri);
    setLastReplyText(textFallback);

    if (audioUri) {
      try {
        const audio = new Audio(audioUri);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
        };
        audio.onerror = () => fallbackSpeechSynthesis(textFallback);
        audio.play().catch(() => fallbackSpeechSynthesis(textFallback));
        return;
      } catch (e) {
        console.warn('Audio play failed, using browser speech synthesis:', e);
      }
    }
    fallbackSpeechSynthesis(textFallback);
  };

  const fallbackSpeechSynthesis = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  const handleReplayVoice = () => {
    if (lastReplyText) {
      playAudioResponse(lastAudioUri, lastReplyText);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const userText = inputMessage.trim();
    setInputMessage('');
    setErrorBanner(null);

    const updatedMessages: Message[] = [...messages, { role: 'user', text: userText }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: updatedMessages.slice(0, -1),
          mood: currentMood,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);

      setMessages([...updatedMessages, { role: 'assistant', text: data.reply }]);
      setLastReplyText(data.reply);
      setLastAudioUri(data.audio || null);

      playAudioResponse(data.audio || null, data.reply);

    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to communicate with SILK.');
      setIsSpeaking(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getFramingStyles = () => {
    switch (framing) {
      case 'closeup': return 'scale-150 object-top translate-y-6';
      case 'full': return 'scale-90 object-center translate-y-0';
      case 'half':
      default: return 'scale-110 object-top translate-y-2';
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between font-sans selection:bg-rose-500 selection:text-white">
      <header className="w-full max-w-4xl bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-bold text-lg shadow-lg">
            S
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base tracking-wide flex items-center gap-1.5">
              SILK <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded-full font-normal">
                {avatarActive ? 'LiveAvatar Stream Active' : 'Photo / Offline Mode'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Mood: <span className="text-rose-300">{currentMood}</span> • Look: <span className="text-amber-300">{currentLook}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!avatarActive ? (
            <button
              onClick={startLiveAvatar}
              disabled={avatarLoading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{avatarLoading ? 'Connecting...' : 'Start LiveAvatar'}</span>
            </button>
          ) : (
            <button
              onClick={stopLiveAvatar}
              className="bg-rose-700 hover:bg-rose-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all shadow-md"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>End Session</span>
            </button>
          )}

          {isSpeaking && (
            <button 
              onClick={stopSpeaking}
              title="Stop Speech"
              className="bg-rose-900 hover:bg-rose-800 text-rose-200 p-1.5 rounded-full border border-rose-700 text-xs flex items-center gap-1 px-2.5 transition-colors animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}

          {lastReplyText && !isSpeaking && (
            <button 
              onClick={handleReplayVoice}
              title="Replay Voice"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded-full border border-slate-700 text-xs flex items-center gap-1 px-2.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Replay</span>
            </button>
          )}
        </div>
      </header>

      <div className="w-full max-w-4xl flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-4 pb-24 lg:pb-6">
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className={`relative w-full aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center transition-all duration-300`}>
            <video 
              ref={videoElementRef} 
              autoPlay 
              playsInline 
              className={`w-full h-full object-cover ${avatarActive ? 'block' : 'hidden'}`}
            />

            {!avatarActive && (
              <img 
                src={imageSrc} 
                alt={currentLook}
                className={`w-full h-full object-cover transition-all duration-500 ease-out idle-breath ${getFramingStyles()}`}
              />
            )}

            <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${avatarActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{avatarActive ? 'LiveAvatar Streaming' : 'SILK Fallback Photo'}</span>
            </div>

            {isSpeaking && (
              <div className="absolute top-3 right-3 bg-rose-600/90 text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Audio Active</span>
              </div>
            )}

            <div className="absolute bottom-3 right-3 flex bg-slate-950/80 backdrop-blur-md rounded-xl p-1 border border-slate-800 gap-1 text-xs z-10 shadow-lg">
              <button onClick={() => setFraming('closeup')} className={`px-2.5 py-1 rounded-lg transition-all ${framing === 'closeup' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}>Close-up</button>
              <button onClick={() => setFraming('half')} className={`px-2.5 py-1 rounded-lg transition-all ${framing === 'half' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}>Half-body</button>
              <button onClick={() => setFraming('full')} className={`px-2.5 py-1 rounded-lg transition-all ${framing === 'full' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}>Full-body</button>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl shadow-md">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Appearance Style</p>
            <div className="grid grid-cols-5 gap-1.5">
              {LOOKS.map((look) => (
                <button
                  key={look.name}
                  onClick={() => setCurrentLook(look.name)}
                  className={`py-2 px-1 text-xs rounded-lg font-medium transition-all truncate ${currentLook === look.name ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md' : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'}`}
                >
                  {look.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl shadow-md">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Emotional State</p>
            <div className="flex justify-between gap-1">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setCurrentMood(mood)}
                  className={`flex-1 py-1.5 px-1 text-[11px] rounded-lg font-medium transition-all ${currentMood === mood ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'}`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden h-[450px] lg:h-[calc(100vh-130px)]">
          <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 className="text-xs font-semibold tracking-wide text-slate-200 uppercase">Voice & Chat Interaction</h2>
            </div>
            <span className="text-[10px] text-rose-400 font-medium">Tamil / Tanglish / English</span>
          </div>

          {errorBanner && (
            <div className="mx-3 mt-3 bg-rose-950/70 border border-rose-800 p-2.5 rounded-xl text-xs text-rose-200 flex items-start gap-2 shadow-md">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div><p className="font-semibold">Notice</p><p>{errorBanner}</p></div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-br-none' : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-bl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-950 border border-slate-800 text-slate-400 rounded-2xl rounded-bl-none px-4 py-3 text-xs flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1">Silk is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-slate-950/90 border-t border-slate-800">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? "Stop Listening" : "Speak to SILK"}
                className={`p-3 rounded-xl transition-all border ${
                  isListening 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse shadow-lg shadow-amber-500/30' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-rose-400" />}
              </button>

              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isListening ? "Listening to your voice..." : "Type or speak in Tamil, Tanglish, English..."}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
              />

              <button 
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
