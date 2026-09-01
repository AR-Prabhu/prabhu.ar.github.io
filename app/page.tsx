'use client';

import { useState, useRef, useEffect } from 'react';

export default function SilkApp() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Live');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([
    { role: 'assistant', text: 'வணக்கம் செல்லம்... நான் தான் உன் SILK. மைக் அழுத்தி என்கிட்ட நேரடியா பேசுடா...' }
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Voice Engine (Tamil Female Seductive Tone)
  const speakVoice = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.88;
    utterance.rate = 0.82;
    utterance.lang = 'ta-IN';

    const voices = window.speechSynthesis.getVoices();
    const tamilFemale = voices.find(v => (v.lang.includes('ta') || v.lang.includes('TA')) && v.name.toLowerCase().includes('female')) 
      || voices.find(v => v.lang.includes('ta') || v.lang.includes('TA'))
      || voices[0];

    if (tamilFemale) utterance.voice = tamilFemale;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus('Silk Speaking...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus('Live');
    };

    window.speechSynthesis.speak(utterance);
  };

  // Mic Speech-to-Text Setup
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('உங்கள் Browser-ல் Mic வசதி ஆதரிக்கப்படவில்லை. Chrome பயன்படுத்தவும்.');
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
      speakVoice(reply);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'என்ன செல்லம்... மறுபடியும் try பண்ணுடா.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#05020a', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <div style={{ position: 'relative', zIndex: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.7)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#ec4899', letterSpacing: '1px' }}>PROJECT SILK</h1>
          <span style={{ fontSize: '11px', color: '#aaa' }}>V. Hemamalini Tone AI Engine</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isSpeaking ? '#ec4899' : isListening ? '#eab308' : '#22c55e' }} />
          <span style={{ fontSize: '12px' }}>{status}</span>
        </div>
      </div>

      {/* FULL BODY STANDING AVATAR VIEW */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', overflow: 'hidden' }}>
        
        {/* Glow Lighting */}
        <div style={{ position: 'absolute', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)', filter: 'blur(50px)' }} />

        {/* Full Standing Image Container (Fixed fitting so head-to-toe fits screen) */}
        <div style={{ height: '100%', width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80" 
            alt="SILK Full Standing Avatar"
            style={{
              maxHeight: '92%',
              maxWidth: '100%',
              objectFit: 'contain', // Entire standing body will be visible without zooming
              filter: isSpeaking ? 'drop-shadow(0 0 25px rgba(236,72,153,0.8)) brightness(1.1)' : 'brightness(0.95)',
              transform: isSpeaking ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.4s ease-in-out'
            }}
          />
        </div>

        {/* CHAT SUBTITLE OVERLAY */}
        <div ref={chatContainerRef} style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '500px', maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', padding: '12px 18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)' }}>
          {messages.length > 0 && (
            <p style={{ margin: 0, fontSize: '14px', textAlign: 'center', lineHeight: '1.4', color: messages[messages.length - 1].role === 'assistant' ? '#f472b6' : '#e2e8f0' }}>
              {messages[messages.length - 1].text}
            </p>
          )}
        </div>
      </div>

      {/* FOOTER CONTROLS (MIC + INPUT) */}
      <div style={{ padding: '14px 16px', background: 'rgba(10,5,20,0.95)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px', alignItems: 'center' }}>
        
        {/* MIC BUTTON */}
        <button 
          onClick={startListening}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: isListening ? '#eab308' : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
            boxShadow: isListening ? '0 0 15px #eab308' : 'none'
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
          style={{ flex: 1, padding: '12px 18px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }}
        />
        
        <button 
          onClick={() => handleSend()}
          disabled={loading}
          style={{ padding: '0 20px', height: '44px', borderRadius: '22px', border: 'none', background: '#ec4899', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Send
        </button>
      </div>

    </div>
  );
}
