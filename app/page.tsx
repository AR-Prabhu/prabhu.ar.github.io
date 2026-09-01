'use client';

import { useEffect, useRef, useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

const SILK_IMAGES = [
  '/silk/silk-face-1.jpg.jpg',
  '/silk/silk-face-2.jpg.jpg',
  '/silk/silk-face-3.jpg.jpg',
  '/silk/silk-face-4.jpg.jpg',
  '/silk/silk-face-5.jpg.jpg',
];

export default function SilkApp() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState('Live');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [avatarIndex, setAvatarIndex] = useState(0);
  const [dress, setDress] = useState('Saree');
  const [mood, setMood] = useState('Happy');

  const [lastAudio, setLastAudio] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'வணக்கம் செல்லம்... நான் இங்கதான் இருக்கேன். என்ன பேசணும்? ❤️',
    },
  ]);

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // -----------------------------
  // VOICE PLAYER
  // -----------------------------

  const playAudio = (audioData: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

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
        setIsSpeaking(false);
        setStatus('Voice Error');
      };

      audio.play().catch(() => {
        setStatus('Click Play');
      });
    } catch {
      setStatus('Voice Error');
    }
  };

  // -----------------------------
  // SPEECH RECOGNITION
  // -----------------------------

  const startListening = () => {
    if (
      !('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)
    ) {
      alert('இந்த browser-ல் microphone speech support இல்லை.');
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
      const text = event.results[0][0].transcript;

      setInput(text);
      handleSend(text);
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

  // -----------------------------
  // CHAT
  // -----------------------------

  const handleSend = async (customText?: string) => {
    const query = (customText ?? input).trim();

    if (!query || loading) return;

    if (!customText) {
      setInput('');
    }

    const userMessage: Message = {
      role: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMessage]);

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
        throw new Error('API failed');
      }

      const data = await res.json();

      const reply =
        data.reply ||
        'சரி செல்லம்... கொஞ்சம் நேரம் குடு, பார்த்துட்டு சொல்றேன்.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: reply,
        },
      ]);

      if (data.audio) {
        setLastAudio(data.audio);
        playAudio(data.audio);
      } else {
        setStatus('Live');
      }
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'சரி செல்லம்... இப்போ connection கொஞ்சம் problem. மறுபடியும் try பண்ணலாம்.',
        },
      ]);

      setStatus('Live');
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // CHANGE AVATAR REFERENCE
  // -----------------------------

  const nextAvatar = () => {
    setAvatarIndex((prev) => (prev + 1) % SILK_IMAGES.length);
  };

  // -----------------------------
  // DRESS
  // -----------------------------

  const changeDress = (value: string) => {
    setDress(value);

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: `சரி செல்லம்... ${value} look-க்கு change பண்ணிக்கிறேன். ❤️`,
      },
    ]);
  };

  // -----------------------------
  // MOOD
  // -----------------------------

  const changeMood = (value: string) => {
    setMood(value);
  };

  return (
    <main className="silk-app">

      {/* ================= HEADER ================= */}

      <header className="topbar">

        <div>
          <div className="logo">
            PROJECT SILK
          </div>

          <div className="subtitle">
            Live Interactive Companion
          </div>
        </div>

        <div className="header-right">

          <div className="live-pill">
            <span className="live-dot" />
            {status}
          </div>

          {lastAudio && !isSpeaking && (
            <button
              className="voice-button"
              onClick={() => playAudio(lastAudio)}
            >
              🔊 Voice
            </button>
          )}

        </div>

      </header>


      {/* ================= MAIN ================= */}

      <section className="main-area">

        {/* LEFT CHAT */}

        <aside className="chat-panel">

          <div className="panel-title">
            ❤️ SILK Chat
          </div>

          <div
            ref={chatRef}
            className="chat-history"
          >

            {messages.map((msg, index) => (

              <div
                key={index}
                className={
                  msg.role === 'user'
                    ? 'message user-message'
                    : 'message silk-message'
                }
              >

                <div className="message-name">
                  {msg.role === 'user' ? 'You' : 'SILK'}
                </div>

                <div>
                  {msg.text}
                </div>

              </div>

            ))}

            {loading && (
              <div className="typing">
                SILK is thinking...
                <span>●</span>
                <span>●</span>
                <span>●</span>
              </div>
            )}

          </div>

        </aside>


        {/* ================= AVATAR ================= */}

        <section className="avatar-stage">

          <div className="stage-glow" />

          <div
            className={
              isSpeaking
                ? 'avatar-wrapper speaking'
                : 'avatar-wrapper'
            }
          >

            <img
              src={SILK_IMAGES[avatarIndex]}
              alt="SILK virtual companion"
              className="silk-image"
            />

            {/* breathing overlay */}

            <div className="breathing-light" />

          </div>


          {/* STATUS */}

          <div className="avatar-status">

            <span className="live-dot" />

            {isSpeaking
              ? 'Silk Speaking...'
              : isListening
                ? 'Listening...'
                : 'Live'}

          </div>


          {/* SUBTITLE */}

          <div className="subtitle-box">

            {messages.length > 0
              ? messages[messages.length - 1].text
              : 'வணக்கம் செல்லம் ❤️'}

          </div>

        </section>


        {/* ================= ACTIONS ================= */}

        <aside className="actions-panel">

          <div className="panel-title">
            SILK Actions
          </div>


          <div className="action-section">

            <div className="section-label">
              Dress
            </div>

            {[
              'Saree',
              'Night',
              'Casual',
              'Glamour',
            ].map((item) => (

              <button
                key={item}
                className={
                  dress === item
                    ? 'action active'
                    : 'action'
                }
                onClick={() => changeDress(item)}
              >
                👗 Dress: {item}
              </button>

            ))}

          </div>


          <div className="action-section">

            <div className="section-label">
              Mood
            </div>

            {[
              'Happy',
              'Shy',
              'Thinking',
              'Playful',
            ].map((item) => (

              <button
                key={item}
                className={
                  mood === item
                    ? 'action active'
                    : 'action'
                }
                onClick={() => changeMood(item)}
              >
                {item === 'Happy' && '😊'}
                {item === 'Shy' && '☺️'}
                {item === 'Thinking' && '🤔'}
                {item === 'Playful' && '😉'}

                {' '}

                {item}
              </button>

            ))}

          </div>


          <button
            className="next-avatar"
            onClick={nextAvatar}
          >
            🔄 Change Reference
          </button>

        </aside>

      </section>


      {/* ================= MUSIC / STATUS ================= */}

      <div className="bottom-info">

        <div>
          <strong>Current Look</strong>
          <span>{dress}</span>
        </div>

        <div>
          <strong>Mood</strong>
          <span>{mood}</span>
        </div>

        <div>
          <strong>Mode</strong>
          <span>AI Companion</span>
        </div>

      </div>


      {/* ================= INPUT ================= */}

      <footer className="input-area">

        <button
          className={
            isListening
              ? 'mic-button listening'
              : 'mic-button'
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
          className="send-button"
          onClick={() => handleSend()}
          disabled={loading}
        >
          {loading ? '...' : 'Send'}
        </button>

      </footer>


      <div className="footer-text">
        Made with ❤️ for you, Chellam
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
              rgba(110, 25, 130, 0.25),
              transparent 35%
            ),
            #050207;
          color: white;
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
        }


        /* HEADER */

        .topbar {
          height: 72px;
          padding: 0 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(15px);
          flex-shrink: 0;
        }

        .logo {
          font-size: 25px;
          font-weight: 800;
          letter-spacing: 4px;
          color: #ec4899;
        }

        .subtitle {
          color: #9ca3af;
          font-size: 12px;
          margin-top: 4px;
        }

        .header-right {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .live-pill,
        .voice-button {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: white;
          padding: 10px 15px;
          border-radius: 22px;
        }

        .live-dot {
          display: inline-block;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #22c55e;
          margin-right: 7px;
          box-shadow: 0 0 10px #22c55e;
        }


        /* MAIN */

        .main-area {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: 280px minmax(400px, 1fr) 230px;
          gap: 18px;
          padding: 18px;
        }


        /* CHAT */

        .chat-panel,
        .actions-panel {
          min-height: 0;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 18px;
          background: rgba(10,7,15,0.72);
          backdrop-filter: blur(15px);
          overflow: hidden;
        }

        .panel-title {
          padding: 17px;
          font-size: 15px;
          font-weight: 700;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .chat-history {
          height: calc(100% - 55px);
          overflow-y: auto;
          padding: 12px;
        }

        .message {
          padding: 11px;
          border-radius: 12px;
          margin-bottom: 10px;
          font-size: 12px;
          line-height: 1.5;
        }

        .silk-message {
          background: rgba(255,255,255,0.045);
        }

        .user-message {
          background: linear-gradient(
            135deg,
            rgba(236,72,153,0.75),
            rgba(139,92,246,0.65)
          );
        }

        .message-name {
          font-size: 10px;
          opacity: .55;
          margin-bottom: 5px;
        }

        .typing {
          font-size: 11px;
          color: #f472b6;
        }

        .typing span {
          margin-left: 3px;
          animation: blink 1s infinite;
        }

        .typing span:nth-child(2) {
          animation-delay: .2s;
        }

        .typing span:nth-child(3) {
          animation-delay: .4s;
        }

        @keyframes blink {
          0%,100% { opacity: .2; }
          50% { opacity: 1; }
        }


        /* AVATAR */

        .avatar-stage {
          position: relative;
          min-width: 0;
          min-height: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }

        .stage-glow {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(236,72,153,.22),
            transparent 70%
          );
          filter: blur(35px);
          animation: glow 5s ease-in-out infinite;
        }

        @keyframes glow {
          0%,100% {
            transform: scale(1);
            opacity: .65;
          }

          50% {
            transform: scale(1.12);
            opacity: 1;
          }
        }

        .avatar-wrapper {
          position: relative;
          height: 92%;
          max-width: 620px;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2;
          animation: breathing 4s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .avatar-wrapper.speaking {
          animation:
            breathing 3.2s ease-in-out infinite,
            speakingMove .7s ease-in-out infinite alternate;
        }

        @keyframes breathing {
          0%,100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.018);
          }
        }

        @keyframes speakingMove {
          from {
            translate: 0 0;
          }

          to {
            translate: 0 -3px;
          }
        }

        .silk-image {
          height: 100%;
          width: auto;
          max-width: 100%;
          object-fit: contain;
          border-radius: 20px;
          filter:
            brightness(.94)
            contrast(1.04)
            drop-shadow(0 15px 45px rgba(236,72,153,.25));
        }

        .speaking .silk-image {
          filter:
            brightness(1.02)
            contrast(1.05)
            drop-shadow(0 0 30px rgba(236,72,153,.55));
        }

        .breathing-light {
          position: absolute;
          inset: 10% 10% 0;
          border-radius: 50%;
          background: radial-gradient(
            ellipse,
            rgba(236,72,153,.10),
            transparent 65%
          );
          pointer-events: none;
          animation: breathLight 4s ease-in-out infinite;
        }

        @keyframes breathLight {
          0%,100% {
            opacity: .35;
          }

          50% {
            opacity: .75;
          }
        }

        .avatar-status {
          position: absolute;
          bottom: 78px;
          z-index: 5;
          padding: 9px 16px;
          border-radius: 20px;
          background: rgba(0,0,0,.75);
          border: 1px solid rgba(255,255,255,.12);
          font-size: 11px;
        }

        .subtitle-box {
          position: absolute;
          bottom: 15px;
          z-index: 5;
          width: min(90%, 650px);
          padding: 14px 20px;
          text-align: center;
          border-radius: 16px;
          background: rgba(0,0,0,.78);
          border: 1px solid rgba(236,72,153,.25);
          color: #f9a8d4;
          font-size: 14px;
          backdrop-filter: blur(10px);
        }


        /* ACTIONS */

        .actions-panel {
          padding-bottom: 10px;
        }

        .action-section {
          padding: 10px;
        }

        .section-label {
          color: #9ca3af;
          font-size: 10px;
          margin: 4px 6px 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .action {
          width: 100%;
          border: 0;
          background: transparent;
          color: #e5e7eb;
          text-align: left;
          padding: 11px;
          border-radius: 10px;
          cursor: pointer;
          margin-bottom: 3px;
          font-size: 12px;
        }

        .action:hover,
        .action.active {
          background: rgba(236,72,153,.16);
          color: #f472b6;
        }

        .next-avatar {
          margin: 8px 10px;
          width: calc(100% - 20px);
          padding: 11px;
          border-radius: 10px;
          border: 1px solid rgba(236,72,153,.3);
          background: rgba(236,72,153,.08);
          color: #f9a8d4;
          cursor: pointer;
        }


        /* INFO */

        .bottom-info {
          display: flex;
          justify-content: center;
          gap: 45px;
          padding: 8px;
          border-top: 1px solid rgba(255,255,255,.07);
          color: #9ca3af;
          font-size: 10px;
        }

        .bottom-info div {
          display: flex;
          gap: 7px;
        }

        .bottom-info strong {
          color: #f472b6;
        }


        /* INPUT */

        .input-area {
          min-height: 68px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 24px;
          background: rgba(10,5,20,.95);
          border-top: 1px solid rgba(255,255,255,.08);
        }

        .mic-button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(
            135deg,
            #ec4899,
            #8b5cf6
          );
          color: white;
          font-size: 19px;
          cursor: pointer;
        }

        .mic-button.listening {
          background: #eab308;
          box-shadow: 0 0 25px rgba(234,179,8,.55);
        }

        .input-area input {
          flex: 1;
          height: 46px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.055);
          color: white;
          outline: none;
          padding: 0 18px;
          font-size: 14px;
        }

        .send-button {
          height: 44px;
          padding: 0 22px;
          border-radius: 23px;
          border: none;
          background: #ec4899;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .send-button:disabled {
          opacity: .5;
        }

        .footer-text {
          text-align: center;
          padding: 4px;
          color: #6b7280;
          font-size: 10px;
          background: rgba(10,5,20,.95);
        }


        /* MOBILE */

        @media (max-width: 900px) {

          .main-area {
            grid-template-columns: 1fr;
          }

          .chat-panel,
          .actions-panel {
            display: none;
          }

          .avatar-stage {
            min-height: 0;
          }

          .bottom-info {
            display: none;
          }

        }

      `}</style>

    </main>
  );
}
