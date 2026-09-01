'use client';

import { useState, useRef, useEffect } from 'react';

export default function SilkApp() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Online');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([
    { role: 'assistant', text: 'Hi chellam... Naan dhaan un SILK. Enkitta enna pesa pora?' }
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Soft Tanglish Voice Engine Synthesis
  const speakVoice = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.2; // Soft female pitch
    utterance.rate = 0.88;  // Slow, passionate delivery

    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.lang.includes('ta') || v.lang.includes('hi') || v.name.toLowerCase().includes('female'));
    if (femaleVoice) utterance.voice = femaleVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus('Speaking...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus('Online');
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
      const reply = data.reply || 'Chellam, network konjam weak-a irukku...';

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      speakVoice(reply);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Ennodu pesum podhu yen indha idaiveri? Marubadiyum try pannu chellam.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#05020a', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: '20px', letterSpacing: '2px', color: '#ec4899', fontWeight: 'bold' }}>PROJECT SILK</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '20px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isSpeaking ? '#ec4899' : '#22c55e' }} />
          <span style={{ fontSize: '12px' }}>{status}</span>
        </div>
      </div>

      {/* STAGE & AVATAR SCREEN (FULL STAND MODE) */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        
        {/* Animated Glow Backlight */}
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        {/* SILK Full Body Stand Container */}
        <div style={{ height: '90%', width: '100%', maxWidth: '420px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80" 
            alt="SILK Avatar"
            style={{
              height: '100%',
              width: '100%',
              objectFit: 'contain',
              objectPosition: 'center center',
              filter: isSpeaking ? 'drop-shadow(0 0 15px rgba(236,72,153,0.6))' : 'none',
              transition: 'all 0.3s ease'
            }}
          />
        </div>

        {/* Live Subtitle Overlay */}
        <div ref={chatContainerRef} style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '500px', maxHeight: '100px', overflowY: 'auto', textAlign: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', padding: '12px 18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          {messages.length > 0 && (
            <p style={{ margin: 0, fontSize: '14px', color: messages[messages.length - 1].role === 'assistant' ? '#f472b6' : '#e2e8f0' }}>
              {messages[messages.length - 1].text}
            </p>
          )}
        </div>
      </div>

      {/* FOOTER CONTROLS */}
      <div style={{ padding: '16px 20px', background: 'rgba(10,5,20,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Pesuda chellam..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: '14px 18px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
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
