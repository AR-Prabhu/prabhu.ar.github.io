'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const LOOKS = [
  { name: 'Saree', path: '/public/silk/saree.jpg', file: 'saree.jpg' },
  { name: 'Traditional', path: '/public/silk/traditional.jpg', file: 'traditional.jpg' },
  { name: 'Night', path: '/public/silk/night.jpg', file: 'night.jpg' },
  { name: 'Casual', path: '/public/silk/casual.jpg', file: 'casual.jpg' },
  { name: 'Glamour', path: '/public/silk/glamour.jpg', file: 'glamour.jpg' },
];

const MOODS = ['Happy', 'Shy', 'Excited', 'Calm', 'Loving'];

export default function SilkApp() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'வணக்கம் செல்லம்... நான் தான் SILK. சொல்லுடா என்ன பேசணும்?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentLook, setCurrentLook] = useState('Traditional');
  const [currentMood, setCurrentMood] = useState('Happy');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [apiStatus, setApiStatus] = useState<'Live' | 'API Error'>('Live');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const avatarContainerRef = useRef<HTMLDivElement>(null);

  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle Audio-Reactive Animation Loop & Safe Source Linking
  const startAudioReactivity = (audioEl: HTMLAudioElement) => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      if (!analyserRef.current && audioContextRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      // Safely cleanup previous source node to prevent memory leaks and duplicate creation errors
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (e) {
          // ignore disconnect errors if already disconnected
        }
        sourceNodeRef.current = null;
      }

      // Create a fresh MediaElementAudioSource for this new Audio element and link to analyser
      if (audioContextRef.current && analyserRef.current) {
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioEl);
        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }

      const bufferLength = analyserRef.current?.frequencyBinCount || 128;
      const dataArray = new Uint8Array(bufferLength);

      const renderFrame = () => {
        if (!analyserRef.current || !avatarContainerRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = average / 255; // 0.0 to 1.0

        // Audio-reactive scale, vertical drift, and dynamic glow
        const scale = 1 + normalized * 0.035;
        const translateY = -normalized * 5;
        const glowAlpha = 0.2 + normalized * 0.5;

        avatarContainerRef.current.style.transform = `scale(${scale}) translateY(${translateY}px)`;
        avatarContainerRef.current.style.boxShadow = `0 0 ${15 + normalized * 30}px rgba(255, 105, 180, ${glowAlpha})`;

        animationFrameRef.current = requestAnimationFrame(renderFrame);
      };

      renderFrame();
    } catch (err) {
      console.warn('Web Audio API initialization warning:', err);
    }
  };

  const stopAudioReactivity = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (avatarContainerRef.current) {
      avatarContainerRef.current.style.transform = '';
      avatarContainerRef.current.style.boxShadow = '';
    }
  };

  const playAudio = (base64Audio: string | null) => {
    if (!base64Audio) {
      setIsSpeaking(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(base64Audio);
    audioRef.current = audio;

    audio.onplay = () => {
      setIsSpeaking(true);
      startAudioReactivity(audio);
    };

    audio.onended = () => {
      setIsSpeaking(false);
      stopAudioReactivity();
    };

    audio.onerror = () => {
      setIsSpeaking(false);
      stopAudioReactivity();
    };

    audio.play().catch((e) => {
      console.warn('Audio playback restricted or failed:', e);
      setIsSpeaking(false);
      stopAudioReactivity();
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);
    setApiStatus('Live');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred');
      }

      setMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
      playAudio(data.audio);
    } catch (err: any) {
      console.error('Chat request failed:', err);
      setApiStatus('API Error');
      const fallbackReply = 'மன்னிக்கவும் செல்லம், இணைப்பில் சிறு தாராளப் பிரச்சனை. சிறிது நேரம் கழித்து பேசலாம்.';
      setMessages((prev) => [...prev, { role: 'model', text: fallbackReply }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get active image filename based on look
  const activeLookObj = LOOKS.find((l) => l.name === currentLook) || LOOKS[1];
  const imageSrc = `/silk/${activeLookObj.file}`;

  return (
    <main className="min-h-screen bg-[#0a050c] text-pink-100 flex flex-col justify-between p-4 font-sans select-none">
      {/* Top Header */}
      <header className="flex justify-between items-center border-b border-pink-900/40 pb-3 px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-pink-400 font-serif">PROJECT SILK</h1>
          <p className="text-xs text-pink-400/70 tracking-widest uppercase">Live Interactive Companion</p>
        </div>
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-pink-900/50 text-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${apiStatus === 'Live' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className={apiStatus === 'Live' ? 'text-emerald-400' : 'text-rose-400'}>{apiStatus}</span>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 my-4 flex-1">
        {/* Left: Chat Log */}
        <section className="bg-[#120816]/80 border border-pink-900/30 rounded-xl p-4 flex flex-col h-[520px] shadow-lg shadow-pink-950/20">
          <h2 className="text-sm font-semibold text-pink-300 mb-3 flex items-center gap-2">
            <span>💖</span> SILK Chat
          </h2>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-pink-900/40 border border-pink-700/40 ml-6 text-pink-50'
                    : 'bg-black/50 border border-pink-900/30 mr-6 text-pink-200'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider text-pink-400/60 mb-1">
                  {msg.role === 'user' ? 'You' : 'SILK'}
                </div>
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="bg-black/50 border border-pink-900/30 p-3 rounded-lg mr-6 text-xs text-pink-400 animate-pulse">
                SILK is thinking & crafting response...
              </div>
            )}
          </div>
        </section>

        {/* Center: Avatar Stage */}
        <section className="lg:col-span-2 flex flex-col items-center justify-center bg-[#0d0710] border border-pink-900/30 rounded-xl p-4 relative overflow-hidden shadow-2xl shadow-pink-950/40 h-[520px]">
          <div
            ref={avatarContainerRef}
            className={`relative w-full max-w-[360px] h-[440px] rounded-2xl overflow-hidden border border-pink-800/40 transition-all duration-300 ${
              isSpeaking ? 'audio-active-glow' : 'idle-breath'
            }`}
          >
            <img
              src={imageSrc}
              alt={`SILK - ${currentLook}`}
              className="w-full h-full object-contain object-center bg-black/80"
            />
            {/* Live speech subtitle / status overlay */}
            <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md border border-pink-900/50 p-2.5 rounded-xl text-center">
              <p className="text-xs text-pink-200 font-medium italic line-clamp-2">
                {messages[messages.length - 1]?.role === 'model' ? messages[messages.length - 1].text : 'Ready to talk, செல்லம்...'}
              </p>
            </div>
          </div>
        </section>

        {/* Right: Actions / Looks / Moods */}
        <section className="bg-[#120816]/80 border border-pink-900/30 rounded-xl p-4 flex flex-col h-[520px] overflow-y-auto shadow-lg shadow-pink-950/20">
          <h2 className="text-sm font-semibold text-pink-300 mb-3">SILK Actions</h2>

          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider text-pink-400/70 block mb-2 font-semibold">Look</label>
            <div className="space-y-1.5">
              {LOOKS.map((look) => (
                <button
                  key={look.name}
                  onClick={() => setCurrentLook(look.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    currentLook === look.name
                      ? 'bg-pink-900/60 border border-pink-600 text-pink-100 shadow-sm'
                      : 'bg-black/30 hover:bg-pink-950/30 text-pink-300/80 border border-transparent'
                  }`}
                >
                  👗 {look.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-pink-400/70 block mb-2 font-semibold">Mood</label>
            <div className="grid grid-cols-1 gap-1.5">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setCurrentMood(mood)}
                  className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentMood === mood
                      ? 'bg-pink-900/40 border border-pink-700 text-pink-200'
                      : 'bg-black/30 hover:bg-pink-950/30 text-pink-300/70 border border-transparent'
                  }`}
                >
                  😊 {mood}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Footer Status Bar & Input Form */}
      <footer className="mt-2">
        <div className="flex justify-between items-center text-xs text-pink-400/60 px-2 mb-2">
          <div><span className="text-pink-400 font-medium">Current Look:</span> {currentLook}</div>
          <div><span className="text-pink-400 font-medium">Mode:</span> Live Interactive Companion</div>
          <div><span className="text-pink-400 font-medium">Status:</span> {isSpeaking ? 'Speaking...' : 'Idle'}</div>
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2 bg-[#120816] border border-pink-900/50 p-2 rounded-2xl shadow-lg">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="பேசுடா செல்லம்... அல்லது type பண்ணு..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-sm text-pink-100 placeholder-pink-500/50"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-pink-700 hover:bg-pink-600 active:scale-95 text-pink-50 px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md shadow-pink-900/50 disabled:opacity-50"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </footer>
    </main>
  );
}
