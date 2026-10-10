'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ShieldAlert, Video } from 'lucide-react';

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
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeLookObj = LOOKS.find(l => l.name === currentLook) || LOOKS[0];
  const imageSrc = activeLookObj.path;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      setMessages([...updatedMessages, { role: 'assistant', text: data.reply }]);

      if (data.audio) {
        try {
          const audio = new Audio(data.audio);
          await audio.play();
        } catch (audioErr) {
          console.warn('Audio playback prevented or failed:', audioErr);
        }
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to communicate with SILK.');
    } finally {
      setIsLoading(false);
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
              <span className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded-full font-normal">Live Companion</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Mood: <span className="text-rose-300">{currentMood}</span> • Look: <span className="text-amber-300">{currentLook}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/60 px-3 py-1 rounded-full border border-slate-800 text-xs text-slate-300">
            <Video className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Virtual Call Active</span>
          </div>
        </div>
      </header>

      <div className="w-full max-w-4xl flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-4 pb-24 lg:pb-6">
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center group">
            <img 
              src={imageSrc} 
              alt={currentLook}
              className={`w-full h-full transition-all duration-500 idle-breath ${
                framing === 'closeup' ? 'object-cover scale-125 object-top' :
                framing === 'full' ? 'object-contain scale-95' : 'object-cover scale-100 object-center'
              }`}
            />

            <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>SILK v20.1</span>
            </div>

            <div className="absolute bottom-3 right-3 flex bg-slate-950/80 backdrop-blur-md rounded-xl p-1 border border-slate-800 gap-1 text-xs z-10 shadow-lg">
              <button 
                type="button"
                onClick={() => setFraming('closeup')}
                className={`px-2.5 py-1 rounded-lg transition-all ${framing === 'closeup' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Close
              </button>
              <button 
                type="button"
                onClick={() => setFraming('half')}
                className={`px-2.5 py-1 rounded-lg transition-all ${framing === 'half' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Half
              </button>
              <button 
                type="button"
                onClick={() => setFraming('full')}
                className={`px-2.5 py-1 rounded-lg transition-all ${framing === 'full' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Full
              </button>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl shadow-md">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Appearance Style</p>
            <div className="grid grid-cols-5 gap-1.5">
              {LOOKS.map((look) => (
                <button
                  key={look.name}
                  onClick={() => setCurrentLook(look.name)}
                  className={`py-2 px-1 text-xs rounded-lg font-medium transition-all truncate ${
                    currentLook === look.name
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-900/40'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
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
                  className={`flex-1 py-1.5 px-1 text-[11px] rounded-lg font-medium transition-all ${
                    currentMood === mood
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                  }`}
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
              <h2 className="text-xs font-semibold tracking-wide text-slate-200 uppercase">Secure Conversation</h2>
            </div>
            <span className="text-[10px] text-rose-400 font-medium">Tamil / Tanglish / English</span>
          </div>

          {errorBanner && (
            <div className="mx-3 mt-3 bg-rose-950/70 border border-rose-800 p-2.5 rounded-xl text-xs text-rose-200 flex items-start gap-2 shadow-md">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p>{errorBanner}</p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-br-none' 
                      : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-bl-none'
                  }`}
                >
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
                  <span className="ml-1">Silk is replying...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-slate-950/90 border-t border-slate-800">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type in Tamil, Tanglish, or English..."
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
