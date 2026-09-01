'use client';

import { useState, useRef, useEffect } from 'react';

export default function SilkApp() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Live');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([
    { role: 'assistant', text: 'வணக்கம் செல்லம்... நான் தான் உன் SILK. என்ன விஷயம் பேசலாம் சொல்லுங்க?' }
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Optimized Speech Synthesis setup
  const speakVoice = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.9;
    utterance.rate = 0.85;
    utterance.lang = 'ta-IN';

    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.lang.includes('ta') || v.lang.includes('TA')) || voices[0];
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus('Speaking');
      if (videoRef.current) videoRef.current.playbackRate = 1.1; // Dynamic movement speed adjustment
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus('Live');
      if (videoRef.current) videoRef.current.playbackRate = 1.0;
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    setStatus('Thinking...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages })
      });

      const data = await res.json();
      const reply = data.reply || 'செல்லம், சரியாக கேட்கவில்லை. மீண்டும் சொல்லுங்கள்.';

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      speakVoice(reply);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'தொடர்பு தடைபட்டது செல்லம். மீண்டும் முயற்சி செய்யுங்கள்.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#000', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* BACKGROUND FULL-SCREEN DISPLAY WITH MOTION EFFECTS */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <img 
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80" 
          alt="SILK Full View"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 15%',
            filter: isSpeaking ? 'brightness(1.05) contrast(1.05)' : 'brightness(0.85)',
            transform: isSpeaking ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.5s ease-in-out'
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 50%, rgba(0,0,0,0.85) 100%)' }} />
      </div>

      {/* HEADER SECTION */}
      <div style={{ position: 'relative', zIndex: 10, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#ec4899', letterSpacing: '1px' }}>SILK AI</h1>
          <span style={{ fontSize: '12px', color: '#ccc' }}>Live Interaction Mode</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isSpeaking ? '#ec4899' : '#22c55e' }} />
          <span style={{ fontSize: '12px' }}>{status}</span>
        </div>
      </div>

      {/* SUBTITLE & CONVERSATION DISPLAY */}
      <div style={{ position: 'relative', zIndex: 10, height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 20px 10px 20px' }}>
        <div ref={chatContainerRef} style={{ width: '100%', maxWidth: '600px', margin: '0 auto', maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? 'rgba(147, 51, 234, 0.85)' : 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              padding: '10px 16px',
              borderRadius: '16px',
              fontSize: '14px',
              maxWidth: '85%',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {m.text}
            </div>
          ))}
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ position: 'relative', zIndex: 10, padding: '16px 20px', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="கேள்விகள், செய்திகள் அல்லது பேச தொடங்கவும்..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: '14px 20px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }}
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          style={{ padding: '0 24px', borderRadius: '25px', border: 'none', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Send
        </button>
      </div>

    </div>
  );
}
