'use client';

import { useEffect, useRef, useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

type Look = {
  name: string;
  image: string;
};

const looks: Look[] = [
  {
    name: 'Saree',
    image: '/silk/silk-face-1.jpg.jpg',
  },
  {
    name: 'Traditional',
    image: '/silk/silk-face-2.jpg.jpg',
  },
  {
    name: 'Night',
    image: '/silk/silk-face-3.jpg.jpg',
  },
  {
    name: 'Casual',
    image: '/silk/silk-face-4.jpg.jpg',
  },
  {
    name: 'Glamour',
    image: '/silk/silk-face-5.jpg.jpg',
  },
];

export default function SilkApp() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Live');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [currentLook, setCurrentLook] = useState(0);
  const [lastAudio, setLastAudio] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'வணக்கம் செல்லம்... நான் தான் SILK. சொல்லுடா என்ன பேசணும்?',
    },
  ]);

  const chatRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Reliable Audio Playback with fallback to browser SpeechSynthesis
  const playAudio = (audioData: string | null, textFallback: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (audioData) {
        const audio = new Audio(audioData);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
          setStatus('Silk Speaking...');
        };

        audio.onended = () => {
          setIsSpeaking(false);
          setStatus('Live');
        };

        audio.onerror = () => {
          console.warn('ElevenLabs audio error, falling back to browser speech.');
          fallbackBrowserSpeech(textFallback);
        };

        audio.play().catch(() => {
          console.warn('Audio play restricted or failed, falling back to browser speech.');
          fallbackBrowserSpeech(textFallback);
        });
      } else {
        fallbackBrowserSpeech(textFallback);
      }
    } catch (error) {
      console.error('Audio playback exception:', error);
      fallbackBrowserSpeech(textFallback);
    }
  };

  const fallbackBrowserSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      setStatus('Live');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ta-IN';
    utterance.rate = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus('Silk Speaking...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus('Live');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatus('Live');
    };

    window.speechSynthesis.speak(utterance);
  };

  const changeLook = (index: number) => {
    setCurrentLook(index);
    setStatus(`Switching look to ${looks[index].name}...`);
    setTimeout(() => {
      setStatus('Live');
    }, 500);
  };

  const startListening = () => {
    if (
      !('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)
    ) {
      alert('இந்த browser-ல் microphone support இல்லை.');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ta-IN';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('Listening...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => {
        handleSend(transcript);
      }, 100);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus('Live');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!isSpeaking) {
        setStatus('Live');
      }
    };

    recognition.start();
  };

  const handleSend = async (customText?: string) => {
    const query = customText ?? input;
    if (!query.trim() || loading) return;

    if (!customText) {
      setInput('');
    }

    const userMessage: Message = {
      role: 'user',
      text: query,
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setLoading(true);
    setStatus('Thinking...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          history: messages,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const reply =
        data.reply ||
        'செல்லம்... எனக்கு இப்போது பதில் தருவதில் சின்னத் தயக்கம். மீண்டும் சொல்லுடா.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: reply,
        },
      ]);

      setLastAudio(data.audio || null);
      playAudio(data.audio || null, reply);
    } catch (error: any) {
      console.error('Chat API Error:', error);
      const errorMessage = `மன்னிக்கவும் செல்லம், AI சேவையில் தற்காலிக இணைப்பு பிரச்சனை (${error.message || 'API Error'}). சிறிது நேரம் கழித்து முயற்சிக்கவும்.`;
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: errorMessage,
        },
      ]);
      setStatus('API Error');
      setIsSpeaking(false);
    } finally {
      setLoading(false);
    }
  };

  const currentImage = looks[currentLook].image;

  return (
    <main className="silk-app">

      {/* ================= HEADER ================= */}
      <header className="header">
        <div>
          <h1>PROJECT SILK</h1>
          <span>Live Interactive Companion</span>
        </div>

        <div className="live-indicator">
          <span
            className={
              isSpeaking
                ? 'dot speaking'
                : isListening
                ? 'dot listening'
                : 'dot'
            }
          />
          <span>{status}</span>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <section className="main">

        {/* ================= LEFT CHAT ================= */}
        <aside className="chat-panel">
          <div className="panel-title">💗 SILK Chat</div>

          <div ref={chatRef} className="messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === 'user'
                    ? 'message user'
                    : 'message silk'
                }
              >
                <small>{message.role === 'user' ? 'You' : 'SILK'}</small>
                <div>{message.text}</div>
              </div>
            ))}

            {loading && (
              <div className="message silk">
                <small>SILK</small>
                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ================= LIVE MOVING AVATAR ================= */}
        <section className="avatar-section">
          <div className="glow-ring glow-1" />
          <div className="glow-ring glow-2" />

          <div
            className={
              isSpeaking
                ? 'avatar-container speaking-avatar'
                : 'avatar-container live-breathing'
            }
          >
            <div className="ambient-overlay" />

            <img
              key={currentImage}
              src={currentImage}
              alt="SILK Full Body Companion"
              className="silk-image"
            />

            <div className="avatar-live">
              <span className="live-pulse" />
              {isSpeaking ? 'Speaking Live' : 'AI Live'}
            </div>
          </div>

          <div className="subtitle">
            {messages[messages.length - 1]?.text}
          </div>

          {lastAudio && !isSpeaking && (
            <button
              className="replay"
              onClick={() => playAudio(lastAudio, messages[messages.length - 1]?.text || '')}
            >
              🔊 Play Voice
            </button>
          )}
        </section>

        {/* ================= ACTION PANEL ================= */}
        <aside className="actions">
          <div className="panel-title">SILK Actions</div>

          <div className="action-content">
            <div className="section-label">LOOK</div>

            {looks.map((look, index) => (
              <button
                key={look.name}
                onClick={() => changeLook(index)}
                className={
                  currentLook === index
                    ? 'action active'
                    : 'action'
                }
              >
                👗 {look.name}
              </button>
            ))}

            <div className="section-label mood-label">MOOD</div>

            <button
              className="action"
              onClick={() => handleSend('இன்னைக்கு happy mood-la இருக்கியா செல்லம்?')}
            >
              😊 Happy
            </button>

            <button
              className="action"
              onClick={() => handleSend('கொஞ்சம் shy-aa பேசுடா')}
            >
              😊 Shy
            </button>

            <button
              className="action"
              onClick={() => handleSend('இப்போ என்ன யோசிச்சிட்டு இருக்க?')}
            >
              🤔 Thinking
            </button>

            <button
              className="action"
              onClick={() => handleSend('ஜாலியா கொஞ்சம் பேசு பார்க்கலாம்')}
            >
              😄 Playful
            </button>
          </div>
        </aside>

      </section>

      {/* ================= BOTTOM INFO ================= */}
      <div className="current-info">
        <span>
          <b>Current Look</b> {looks[currentLook].name}
        </span>
        <span>
          <b>Mode</b> Live Interactive Companion
        </span>
        <span>
          <b>Status</b> {status}
        </span>
      </div>

      {/* ================= INPUT ================= */}
      <footer className="footer">
        <button
          className={
            isListening
              ? 'mic listening-mic'
              : 'mic'
          }
          onClick={startListening}
        >
          🎤
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSend();
            }
          }}
          placeholder="பேசுடா செல்லம்... அல்லது type பண்ணு..."
        />

        <button
          className="send"
          disabled={loading}
          onClick={() => handleSend()}
        >
          {loading ? '...' : 'Send'}
        </button>
      </footer>

      <div className="footer-text">
        Made with 💗 for you, Chellam
      </div>

      {/* ================= CSS ================= */}
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .silk-app {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 50% 45%,
              rgba(236, 72, 153, 0.12),
              transparent 45%
            ),
            #030105;
          color: white;
          font-family: Arial, Helvetica, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .header {
          height: 82px;
          flex-shrink: 0;
          padding: 0 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.55);
        }

        .header h1 {
          margin: 0;
          color: #ec4899;
          font-size: 28px;
          letter-spacing: 4px;
        }

        .header span {
          color: #999;
          font-size: 14px;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 18px;
          border-radius: 30px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 12px #22c55e;
        }

        .dot.speaking {
          background: #ec4899;
          box-shadow: 0 0 14px #ec4899;
          animation: pulse 0.7s infinite;
        }

        .dot.listening {
          background: #eab308;
          box-shadow: 0 0 14px #eab308;
          animation: pulse 0.7s infinite;
        }

        .main {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: 330px minmax(400px, 1fr) 270px;
          gap: 22px;
          padding: 22px;
        }

        .chat-panel,
        .actions {
          min-height: 0;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 22px;
          background: rgba(12,8,18,.82);
          backdrop-filter: blur(15px);
        }

        .panel-title {
          padding: 20px;
          font-size: 18px;
          font-weight: bold;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .messages {
          height: calc(100% - 65px);
          overflow-y: auto;
          padding: 14px;
        }

        .message {
          padding: 13px 14px;
          margin-bottom: 12px;
          border-radius: 15px;
          font-size: 14px;
          line-height: 1.5;
        }

        .message small {
          display: block;
          margin-bottom: 5px;
          color: #aaa;
          font-size: 10px;
        }

        .message.silk {
          background: rgba(255,255,255,.045);
        }

        .message.user {
          background: linear-gradient(
            135deg,
            rgba(236,72,153,.75),
            rgba(139,92,246,.75)
          );
        }

        .typing {
          display: flex;
          gap: 5px;
        }

        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ec4899;
          animation: typing 1s infinite;
        }

        .typing span:nth-child(2) {
          animation-delay: .15s;
        }

        .typing span:nth-child(3) {
          animation-delay: .3s;
        }

        .avatar-section {
          position: relative;
          min-width: 0;
          min-height: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          padding-bottom: 50px;
        }

        .glow-ring {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
        }

        .glow-1 {
          width: 380px;
          height: 380px;
          background: rgba(236,72,153,0.18);
          animation: floatGlow 6s ease-in-out infinite alternate;
        }

        .glow-2 {
          width: 280px;
          height: 280px;
          background: rgba(139,92,246,0.15);
          animation: floatGlow 4s ease-in-out infinite alternate-reverse;
        }

        .avatar-container {
          position: relative;
          height: 92%;
          width: 100%;
          max-width: 410px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 25px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0,0,0,0.6);
          border: 1px solid rgba(236,72,153,0.2);
          background: #000;
        }

        .live-breathing {
          animation: softBreathing 5s ease-in-out infinite;
        }

        .speaking-avatar {
          animation: activeSpeakingMotion 0.8s ease-in-out infinite alternate;
          border-color: rgba(236,72,153,0.6);
          box-shadow: 0 0 25px rgba(236,72,153,0.35);
        }

        .ambient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0,0,0,0.05),
            transparent 50%,
            rgba(3,1,5,0.6)
          );
          z-index: 2;
          pointer-events: none;
        }

        .silk-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          display: block;
          filter: brightness(0.98) contrast(1.03) saturate(1.02);
          transition: transform 0.5s ease;
        }

        .speaking-avatar .silk-image {
          transform: scale(1.02);
          filter: brightness(1.02) contrast(1.05) saturate(1.05);
        }

        .avatar-live {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 14px;
          border-radius: 30px;
          background: rgba(0,0,0,0.85);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 11px;
          z-index: 5;
          backdrop-filter: blur(8px);
        }

        .live-pulse {
          width: 7px;
          height: 7px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 10px #22c55e;
          animation: pulseDot 1.5s infinite;
        }

        .subtitle {
          position: absolute;
          bottom: 50px;
          left: 50%;
          transform: translateX(-50%);
          width: 85%;
          padding: 10px 16px;
          text-align: center;
          border-radius: 14px;
          background: rgba(0,0,0,0.88);
          border: 1px solid rgba(236,72,153,.3);
          color: #f9a8d4;
          font-size: 13px;
          line-height: 1.35;
          backdrop-filter: blur(10px);
          z-index: 10;
        }

        .replay {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10;
          border: none;
          border-radius: 20px;
          padding: 8px 14px;
          background: #ec4899;
          color: white;
          font-weight: bold;
          cursor: pointer;
          font-size: 12px;
        }

        .action-content {
          padding: 15px;
          overflow-y: auto;
          height: calc(100% - 65px);
        }

        .section-label {
          margin: 5px 7px 10px;
          color: #888;
          font-size: 11px;
          letter-spacing: 1.5px;
        }

        .mood-label {
          margin-top: 22px;
        }

        .action {
          width: 100%;
          margin-bottom: 6px;
          padding: 12px 13px;
          text-align: left;
          border: none;
          border-radius: 13px;
          background: transparent;
          color: #ddd;
          cursor: pointer;
          font-size: 13px;
          transition: .2s;
        }

        .action:hover {
          background: rgba(236,72,153,.12);
        }

        .action.active {
          background: linear-gradient(
            90deg,
            rgba(236,72,153,.25),
            rgba(236,72,153,.08)
          );
          color: #f472b6;
          border-left: 3px solid #ec4899;
        }

        .current-info {
          height: 38px;
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 45px;
          color: #aaa;
          font-size: 11px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .current-info b {
          color: #ec4899;
          margin-right: 5px;
        }

        .footer {
          height: 72px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 24px;
          background: rgba(10,5,20,.95);
          border-top: 1px solid rgba(255,255,255,.09);
        }

        .mic {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border: none;
          border-radius: 50%;
          background: linear-gradient(
            135deg,
            #ec4899,
            #8b5cf6
          );
          color: white;
          font-size: 19px;
          cursor: pointer;
        }

        .listening-mic {
          background: #eab308;
          box-shadow: 0 0 20px rgba(234,179,8,.5);
          animation: pulse 1s infinite;
        }

        .footer input {
          flex: 1;
          min-width: 0;
          height: 48px;
          padding: 0 18px;
          border-radius: 25px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          color: white;
          outline: none;
          font-size: 14px;
        }

        .footer input:focus {
          border-color: rgba(236,72,153,.5);
        }

        .send {
          height: 46px;
          padding: 0 24px;
          border: none;
          border-radius: 24px;
          background: #ec4899;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }

        .send:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .footer-text {
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          color: #555;
          font-size: 9px;
          pointer-events: none;
        }

        @keyframes softBreathing {
          0%, 100% {
            transform: scale(1) translateY(0);
          }
          50% {
            transform: scale(1.008) translateY(-2px);
          }
        }

        @keyframes activeSpeakingMotion {
          0% {
            transform: scale(1.01) translateY(-1px);
          }
          100% {
            transform: scale(1.025) translateY(-4px);
          }
        }

        @keyframes floatGlow {
          0% {
            transform: translate(-20px, -15px) scale(0.95);
          }
          100% {
            transform: translate(20px, 15px) scale(1.05);
          }
        }

        @keyframes pulseDot {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.4);
            opacity: 0.6;
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.35);
            opacity: .7;
          }
        }

        @keyframes typing {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @media (max-width: 1000px) {
          .main {
            grid-template-columns: 1fr;
          }

          .chat-panel,
          .actions {
            display: none;
          }

          .avatar-section {
            width: 100%;
          }

          .current-info {
            gap: 15px;
          }

          .header {
            padding: 0 15px;
          }

          .header h1 {
            font-size: 20px;
          }
        }
      `}</style>
    </main>
  );
}
