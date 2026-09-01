'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function SilkPage() {
  const [currentMode, setCurrentMode] = useState('girlfriend');
  const [currentOutfit, setCurrentOutfit] = useState('normal');
  const [isListening, setIsListening] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [statusText, setStatusText] = useState('SILK Ready');
  const [statusState, setStatusState] = useState<'ready' | 'busy' | 'speaking'>('ready');
  const [avatarState, setAvatarState] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: string; text: string }>>([]);
  const [userMemory, setUserMemory] = useState('');
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);

  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatTranscriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Load local storage data
    const savedHistory = localStorage.getItem('silk_chat_history');
    if (savedHistory) {
      try { setChatHistory(JSON.parse(savedHistory)); } catch (e) {}
    }
    const savedMemory = localStorage.getItem('silk_user_memory');
    if (savedMemory) {
      setUserMemory(savedMemory);
    } else {
      setUserMemory('User preferred language: Tanglish.');
    }

    // Speech recognition setup
    const windowObj = window as any;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'ta-IN';
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        setStatusState('ready');
        setStatusText('SILK Ready');
        handleSendText(transcript);
      };
      rec.onerror = () => { setIsListening(false); setStatusState('ready'); setStatusText('SILK Ready'); };
      rec.onend = () => { setIsListening(false); setStatusState('ready'); setStatusText('SILK Ready'); };
      recognitionRef.current = rec;
    }
  }, []);

  useEffect(() => {
    if (chatTranscriptRef.current) {
      chatTranscriptRef.current.scrollTop = chatTranscriptRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const saveHistory = (newHistory: Array<{ sender: string; text: string }>) => {
    const trimmed = newHistory.slice(-30);
    setChatHistory(trimmed);
    localStorage.setItem('silk_chat_history', JSON.stringify(trimmed));
  };

  const handleSaveMemory = () => {
    localStorage.setItem('silk_user_memory', userMemory);
    setShowMemoryModal(false);
    setStatusText('Memory Saved');
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1.08;

    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v =>
      (v.lang.includes('ta') || v.lang.includes('en')) &&
      (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira'))
    );
    if (femaleVoice) utterance.voice = femaleVoice;

    utterance.onstart = () => {
      setAvatarState('speaking');
      setStatusState('speaking');
      setStatusText('SILK Speaking...');
    };
    utterance.onend = utterance.onerror = () => {
      setAvatarState('idle');
      setStatusState('ready');
      setStatusText('SILK Ready');
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const updated = [...chatHistory, { sender: 'USER', text }];
    saveHistory(updated);
    setInputText('');

    setAvatarState('thinking');
    setStatusState('busy');
    setStatusText('SILK Thinking...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode: currentMode,
          memory: userMemory,
          history: updated.slice(-10)
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `Server error ${response.status}`);
      }

      const replyText = data.reply;
      saveHistory([...updated, { sender: 'SILK', text: replyText }]);
      speakText(replyText);
    } catch (err: any) {
      setAvatarState('idle');
      setStatusState('ready');
      setStatusText('Connection Error');
      const errNotice = 'Enna chellam, server connection issue. Please check API settings.';
      saveHistory([...updated, { sender: 'SILK', text: errNotice }]);
      speakText(errNotice);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (!isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setStatusState('busy');
        setStatusText('Listening...');
      } catch (e) {}
    } else {
      recognitionRef.current.stop();
      setIsListening(false);
      setStatusState('ready');
      setStatusText('SILK Ready');
    }
  };

  const toggleCamera = async () => {
    if (!cameraActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraActive(true);
      } catch (err) {
        alert('Camera Access Denied or Unavailable.');
      }
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      setCameraActive(false);
    }
  };

  const getOutfitFill = () => {
    if (currentOutfit === 'traditional') return 'url(#outfitTraditional)';
    if (currentOutfit === 'modern') return 'url(#outfitModern)';
    if (currentOutfit === 'night') return 'url(#outfitNight)';
    return 'url(#outfitNormal)';
  };

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', fontFamily: 'sans-serif', color: '#FFF' }}>
      
      {/* Header Bar */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'linear-gradient(to bottom, rgba(11, 5, 18, 0.95), transparent)' }}>
        <select value={currentMode} onChange={(e) => setCurrentMode(e.target.value)} style={{ background: 'rgba(0,0,0,0.6)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', outline: 'none' }}>
          <option value="girlfriend">Girlfriend Mode</option>
          <option value="wife">Wife Companion</option>
          <option value="bestie">Bestie Mode</option>
          <option value="support">Emotional Support</option>
        </select>

        <select value={currentOutfit} onChange={(e) => setCurrentOutfit(e.target.value)} style={{ background: 'rgba(0,0,0,0.6)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', outline: 'none' }}>
          <option value="normal">Normal Style</option>
          <option value="traditional">Traditional Saree</option>
          <option value="modern">Modern Chic</option>
          <option value="night">Night Loungewear</option>
        </select>

        <button onClick={() => setShowMemoryModal(true)} style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', padding: '8px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}>
          🧠 Memory
        </button>
      </div>

      {/* Fullscreen Stage */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <svg className={`silk-avatar ${avatarState}`} viewBox="0 0 200 300" style={{ width: '280px', height: '420px', filter: 'drop-shadow(0 0 25px rgba(168, 85, 247, 0.35))' }}>
          <defs>
            <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9E6B5C"/><stop offset="100%" stopColor="#7A4B3E"/></linearGradient>
            <linearGradient id="outfitNormal" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8B5CF6"/><stop offset="100%" stopColor="#6D28D9"/></linearGradient>
            <linearGradient id="outfitTraditional" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#BE185D"/><stop offset="100%" stopColor="#F59E0B"/></linearGradient>
            <linearGradient id="outfitModern" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0284C7"/><stop offset="100%" stopColor="#0F172A"/></linearGradient>
            <linearGradient id="outfitNight" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4C1D95"/><stop offset="100%" stopColor="#1E1B4B"/></linearGradient>
          </defs>

          <path d="M 45 75 Q 15 120 35 230 Q 165 230 165 120 Q 185 75 155 75 Z" fill="#120722" />
          <path d="M 55 160 C 55 135, 145 135, 145 160 L 160 300 L 40 300 Z" fill={getOutfitFill()} />
          <rect x="88" y="128" width="24" height="32" rx="6" fill="url(#skinGrad)" />
          
          <g id="headGroup">
            <ellipse cx="100" cy="98" rx="36" ry="43" fill="url(#skinGrad)" />
            <circle cx="100" cy="78" r="2.5" fill="#DC2626" />
            <ellipse cx="84" cy="96" rx="5.5" ry="3.8" fill="#FFF" />
            <ellipse cx="116" cy="96" rx="5.5" ry="3.8" fill="#FFF" />
            <circle cx="84" cy="96" r="2.2" fill="#120722" />
            <circle cx="116" cy="96" r="2.2" fill="#120722" />
            <path d="M 76 89 Q 84 85 92 89" stroke="#120722" strokeWidth="2.2" fill="none" />
            <path d="M 108 89 Q 116 85 124 89" stroke="#120722" strokeWidth="2.2" fill="none" />
            <path d="M 90 120 Q 100 124 110 120" stroke="#E11D48" strokeWidth="3" fill="none" />
            <path d="M 62 92 C 62 60, 138 60, 138 92 C 122 72, 78 72, 62 92 Z" fill="#120722" />
          </g>
        </svg>

        <div style={{ marginTop: '20px', background: 'rgba(0, 0, 0, 0.65)', padding: '8px 18px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.15)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusState === 'busy' ? '#EAB308' : statusState === 'speaking' ? '#EC4899' : '#22C55E' }} />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Camera Preview */}
      <div style={{ display: cameraActive ? 'block' : 'none', position: 'relative', zIndex: 10, alignSelf: 'flex-end', marginRight: '16px', width: '105px', height: '145px', borderRadius: '18px', overflow: 'hidden', border: '2px solid rgba(255, 255, 255, 0.35)', background: '#000' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      </div>

      {/* Transcript */}
      {showTranscript && (
        <div ref={chatTranscriptRef} style={{ position: 'relative', zIndex: 10, margin: '0 16px 8px 16px', height: '170px', background: 'rgba(0, 0, 0, 0.55)', borderRadius: '20px', padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
          {chatHistory.map((m, i) => (
            <div key={i} style={{ fontSize: '13px', lineHeight: '1.45', maxWidth: '88%', padding: '10px 14px', borderRadius: '14px', wordBreak: 'break-word', alignSelf: m.sender === 'USER' ? 'flex-end' : 'flex-start', background: m.sender === 'USER' ? 'linear-gradient(135deg, #7E22CE, #9333EA)' : 'rgba(255, 255, 255, 0.15)', color: m.sender === 'USER' ? '#FFF' : '#F3E8FF' }}>
              {m.text}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Controls */}
      <div style={{ position: 'relative', zIndex: 10, padding: '16px', background: 'linear-gradient(to top, rgba(11, 5, 18, 0.98) 85%, transparent)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendText()} placeholder="Talk in Tanglish, Tamil, or English..." style={{ flex: 1, background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '26px', padding: '12px 20px', color: '#FFF', fontSize: '14px', outline: 'none' }} />
          <button onClick={() => handleSendText()} style={{ background: 'linear-gradient(135deg, #9333EA, #C084FC)', color: '#FFF', border: 'none', padding: '0 22px', borderRadius: '26px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Send</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <button onClick={() => setShowTranscript(!showTranscript)} style={{ width: '50px', height: '50px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}>💬</button>
          <button onClick={toggleMic} style={{ width: '60px', height: '60px', borderRadius: '50%', border: 'none', background: isListening ? '#DC2626' : 'linear-gradient(135deg, #9333EA, #A855F7)', color: '#FFF', fontSize: '24px', cursor: 'pointer' }}>🎙️</button>
          <button onClick={toggleCamera} style={{ width: '50px', height: '50px', borderRadius: '50%', border: 'none', background: cameraActive ? '#22C55E' : 'rgba(255,255,255,0.12)', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}>📹</button>
          <button onClick={() => { saveHistory([]); }} style={{ width: '50px', height: '50px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}>🗑️</button>
        </div>
      </div>

      {/* Memory Modal */}
      {showMemoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#180C27', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '16px', color: '#E9D5FF', margin: 0 }}>🧠 SILK Long-Term Memory</h3>
            <textarea value={userMemory} onChange={(e) => setUserMemory(e.target.value)} style={{ width: '100%', height: '100px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#FFF', padding: '10px', fontSize: '13px', outline: 'none', resize: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowMemoryModal(false)} style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', padding: '8px 12px', borderRadius: '20px', fontSize: '12px' }}>Cancel</button>
              <button onClick={handleSaveMemory} style={{ background: 'linear-gradient(135deg, #9333EA, #C084FC)', color: '#FFF', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Save Memory</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}