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

  // Full-Body Realistic Character Models
  const fullBodyOutfits: Record<string, string> = {
    normal: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80",
    traditional: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80",
    modern: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80",
    night: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80"
  };

  useEffect(() => {
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

    const cleanedText = text
      .replace(/chellam/gi, "chellaam")
      .replace(/da/gi, "daa")
      .replace(/di/gi, "dee");

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 0.90;
    utterance.pitch = 1.18;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => 
      (v.lang.includes('ta') || v.lang.includes('en-IN')) && 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Female'))
    ) || voices.find(v => 
      v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Google US English')
    );

    if (naturalVoice) utterance.voice = naturalVoice;

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

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', fontFamily: 'sans-serif', backgroundColor: '#05020a', color: '#FFF' }}>
      
      {/* Real Live Idle & Motion CSS Animations */}
      <style jsx global>{`
        @keyframes liveBreathing {
          0% { transform: scale(1) translateY(0px); }
          50% { transform: scale(1.015) translateY(-4px); }
          100% { transform: scale(1) translateY(0px); }
        }
        @keyframes liveTalkPulse {
          0% { filter: drop-shadow(0 0 15px rgba(236, 72, 153, 0.4)); transform: scale(1.01); }
          50% { filter: drop-shadow(0 0 35px rgba(236, 72, 153, 0.8)); transform: scale(1.025); }
          100% { filter: drop-shadow(0 0 15px rgba(236, 72, 153, 0.4)); transform: scale(1.01); }
        }
        .full-body-idle {
          animation: liveBreathing 4s infinite ease-in-out;
        }
        .full-body-speaking {
          animation: liveTalkPulse 1.2s infinite ease-in-out;
        }
      `}</style>

      {/* Header Bar */}
      <div style={{ position: 'relative', zIndex: 20, display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'linear-gradient(to bottom, rgba(5, 2, 10, 0.9), transparent)' }}>
        <select value={currentMode} onChange={(e) => setCurrentMode(e.target.value)} style={{ background: 'rgba(0,0,0,0.6)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', outline: 'none', backdropFilter: 'blur(8px)' }}>
          <option value="girlfriend">Girlfriend Mode</option>
          <option value="wife">Wife Companion</option>
          <option value="bestie">Bestie Mode</option>
          <option value="support">Emotional Support</option>
        </select>

        <select value={currentOutfit} onChange={(e) => setCurrentOutfit(e.target.value)} style={{ background: 'rgba(0,0,0,0.6)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', outline: 'none', backdropFilter: 'blur(8px)' }}>
          <option value="normal">Normal Style</option>
          <option value="traditional">Traditional Saree</option>
          <option value="modern">Modern Chic</option>
          <option value="night">Night Loungewear</option>
        </select>

        <button onClick={() => setShowMemoryModal(true)} style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', padding: '8px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          🧠 Memory
        </button>
      </div>

      {/* FULL BODY REAL-FEEL STAGE */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 1, overflow: 'hidden' }}>
        <div 
          className={avatarState === 'speaking' ? 'full-body-speaking' : 'full-body-idle'}
          style={{
            height: '92vh',
            width: '100%',
            maxWidth: '520px',
            position: 'relative',
            display: 'flex',
            justify: 'center',
            transition: 'all 0.5s ease'
          }}
        >
          <img 
            src={fullBodyOutfits[currentOutfit] || fullBodyOutfits.normal} 
            alt="SILK Full Body Companion"
            style={{
              height: '100%',
              width: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
            }}
          />
          {/* Ambient Studio Lighting Glow */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%, transparent 40%, #05020a 95%)', pointerEvents: 'none' }} />
        </div>

        {/* Floating Status Pill */}
        <div style={{ position: 'absolute', top: '80px', background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(10px)', padding: '6px 16px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.15)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusState === 'busy' ? '#EAB308' : statusState === 'speaking' ? '#EC4899' : '#22C55E' }} />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Camera Preview */}
      <div style={{ display: cameraActive ? 'block' : 'none', position: 'relative', zIndex: 20, alignSelf: 'flex-end', marginRight: '16px', width: '105px', height: '145px', borderRadius: '18px', overflow: 'hidden', border: '2px solid rgba(255, 255, 255, 0.35)', background: '#000' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      </div>

      {/* Floating Chat Overlay (APK Style UI) */}
      {showTranscript && (
        <div ref={chatTranscriptRef} style={{ position: 'relative', zIndex: 20, margin: '0 16px 8px 16px', height: '150px', background: 'rgba(5, 2, 10, 0.45)', backdropFilter: 'blur(12px)', borderRadius: '20px', padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {chatHistory.map((m, i) => (
            <div key={i} style={{ fontSize: '13px', lineHeight: '1.45', maxWidth: '85%', padding: '10px 14px', borderRadius: '14px', wordBreak: 'break-word', alignSelf: m.sender === 'USER' ? 'flex-end' : 'flex-start', background: m.sender === 'USER' ? 'linear-gradient(135deg, #7E22CE, #9333EA)' : 'rgba(255, 255, 255, 0.18)', color: m.sender === 'USER' ? '#FFF' : '#F3E8FF' }}>
              {m.text}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Controls */}
      <div style={{ position: 'relative', zIndex: 20, padding: '16px', background: 'linear-gradient(to top, rgba(5, 2, 10, 0.98) 75%, transparent)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendText()} placeholder="Talk in Tanglish, Tamil, or English..." style={{ flex: 1, background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '26px', padding: '12px 20px', color: '#FFF', fontSize: '14px', outline: 'none', backdropFilter: 'blur(8px)' }} />
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
