'use client';

import { useState, useRef, useEffect } from 'react';

export default function SilkApp() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Live');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastAudio, setLastAudio] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([
    { role: 'assistant', text: 'வணக்கம் செல்லம்... நான் தான் உன் SILK. சொல்லுடா என்ன பேசணும்?' }
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Audio Player Function
  const playAudio = (base64Audio: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(base64Audio);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setStatus('Silk Speaking...');
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setStatus('Live');
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsSpeaking(false);
        setStatus('Live');
      };

      audio.play().catch(e => {
        console.error("Browser blocked autoplay:", e);
        setStatus('Click Play to Hear');
      });
    } catch (err) {
      console.error("Audio init error:", err);
    }
  };

  // Mic Speech-to-Text
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('உங்கள் Browser-ல் Mic வசதி ஆதரிக்கப்படவில்லை.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ta-IN';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('Listening...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus('Live');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSend = async (customText?: string) => {
    const query = customText || input;
    if (!query.trim() || loading) return;

    if (!customText) setInput('');
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setLoading(true);
    setStatus('Thinking...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, history: messages })
      });

      const data = await res.json();
      const reply = data.reply || 'செல்லம், சரியா கேட்கல... மறுபடியும் சொல்லுடா?';

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      
      if (data.audio) {
        setLastAudio(data.audio);
        playAudio(data.audio);
      } else {
        setStatus('Live');
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'என்ன செல்லம்... மறுபடியும் try பண்ணுடா.' }]);
      setStatus('Live');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#05020a', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <div style={{ position: 'relative', zIndex: 10, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.7)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', color: '#ec4899', letterSpacing: '1px' }}>PROJECT SILK</h1>
          <span style={{ fontSize: '10px', color: '#aaa' }}>Live Interactive Mode</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '20px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isSpeaking ? '#ec4899' : isListening ? '#eab308' : '#22c55e' }} />
          <span style={{ fontSize: '11px' }}>{status}</span>
        </div>
      </div>

      {/* AVATAR & FULL BODY VIEW CONTAINER */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', overflow: 'hidden', paddingBottom: '70px' }}>
        
        {/* Glow Lighting */}
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        {/* Silk Smitha Image - Change the src link to your uploaded Silk photo URL if hosted */}
        <div style={{ height: '100%', width: '100%', maxWidth: '450px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80" 
            alt="SILK Avatar"
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              filter: isSpeaking ? 'drop-shadow(0 0 20px rgba(236,72,153,0.7)) brightness(1.05)' : 'brightness(0.95)',
              transform: isSpeaking ? 'scale(1.01)' : 'scale(1)',
              transition: 'all 0.3s ease-in-out'
            }}
          />
        </div>

        {/* REPLAY VOICE BUTTON (Appears if audio is blocked or ready) */}
        {lastAudio && !isSpeaking && (
          <button
            onClick={() => playAudio(lastAudio)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#ec4899',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              zIndex: 20,
              boxShadow: '0 0 10px rgba(236,72,153,0.5)'
            }}
          >
            🔊 Play Voice
          </button>
        )}

        {/* CHAT SUBTITLE OVERLAY */}
        <div ref={chatContainerRef} style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '450px', maxHeight: '100px', overflowY: 'auto', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', padding: '10px 15px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)' }}>
          {messages.length > 0 && (
            <p style={{ margin: 0, fontSize: '13px', textAlign: 'center', lineHeight: '1.35', color: messages[messages.length - 1].role === 'assistant' ? '#f472b6' : '#e2e8f0' }}>
              {messages[messages.length - 1].text}
            </p>
          )}
        </div>
      </div>

      {/* FOOTER CONTROLS */}
      <div style={{ padding: '12px 16px', background: 'rgba(10,5,20,0.95)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px', alignItems: 'center' }}>
        
        {/* MIC BUTTON */}
        <button 
          onClick={startListening}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: isListening ? '#eab308' : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '16px',
            boxShadow: isListening ? '0 0 12px #eab308' : 'none',
            flexShrink: 0
          }}
          title="Click to Speak"
        >
          🎤
        </button>

        <input 
          type="text" 
          placeholder="பேசுடா செல்லம்... அல்லது Type பண்ணு" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: '10px 16px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none', fontSize: '14px' }}
        />
        
        <button 
          onClick={() => handleSend()}
          disabled={loading}
          style={{ padding: '0 18px', height: '40px', borderRadius: '20px', border: 'none', background: '#ec4899', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}
        >
          Send
        </button>
      </div>

    </div>
  );
}
