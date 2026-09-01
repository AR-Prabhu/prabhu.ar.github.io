'use client';

import { useEffect, useRef, useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

type DressMode = 'Saree' | 'Night' | 'Casual' | 'Glamour';

const dressImages: Record<DressMode, string> = {
  Saree: '/silk/silk-face-1.jpg.jpg',
  Night: '/silk/silk-face-2.jpg.jpg',
  Casual: '/silk/silk-face-3.jpg.jpg',
  Glamour: '/silk/silk-face-4.jpg.jpg',
};

export default function SilkApp() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState('Live');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [dress, setDress] = useState<DressMode>('Saree');
  const [mood, setMood] = useState('Happy');

  const [lastAudio, setLastAudio] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'வணக்கம் செல்லம்... நான் தான் உன் SILK. சொல்லுடா என்ன பேசணும்?'
    }
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* ---------------- SCROLL CHAT ---------------- */

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  /* ---------------- AUDIO ---------------- */

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
        setStatus('Live');
        console.error('Audio playback error');
      };

      audio.play().catch(() => {
        setStatus('Click Play to Hear');
      });
    } catch (error) {
      console.error(error);
      setIsSpeaking(false);
      setStatus('Live');
    }
  };

  /* ---------------- SPEECH RECOGNITION ---------------- */

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('இந்த browser-ல் microphone support இல்லை.');
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = 'ta-IN';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('Listening...');
    };

    recognition.onresult = (event: any) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript || '';

      if (transcript) {
        setInput(transcript);
        handleSend(transcript);
      }
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

  /* ---------------- SEND MESSAGE ---------------- */

  const handleSend = async (customText?: string) => {
    const query = (customText ?? input).trim();

    if (!query || loading) return;

    if (!customText) {
      setInput('');
    }

    const userMessage: Message = {
      role: 'user',
      text: query
    };

    setMessages(prev => [...prev, userMessage]);

    setLoading(true);
    setStatus('Thinking...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: query,
          history: messages
        })
      });

      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data = await res.json();

      const reply =
        data.reply ||
        'செல்லம்... கொஞ்சம் problem வந்திருக்கு. மறுபடியும் try பண்ணுடா.';

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: reply
        }
      ]);

      if (data.audio) {
        setLastAudio(data.audio);
        playAudio(data.audio);
      } else {
        setStatus('Live');
      }

    } catch (error) {
      console.error(error);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'செல்லம்... connection கொஞ்சம் problem. மறுபடியும் try பண்ணலாம்.'
        }
      ]);

      setStatus('Live');

    } finally {
      setLoading(false);
    }
  };

  /* ---------------- DRESS ---------------- */

  const changeDress = (newDress: DressMode) => {
    setDress(newDress);

    const dressText: Record<DressMode, string> = {
      Saree: 'சரி செல்லம்... Saree look-ku change பண்ணிக்கிட்டேன். ❤️',
      Night: 'சரி செல்லம்... Night look-ku change பண்ணிக்கிட்டேன். ❤️',
      Casual: 'சரி செல்லம்... Casual look-ku change பண்ணிக்கிட்டேன். ❤️',
      Glamour: 'சரி செல்லம்... Glamour look-ku change பண்ணிக்கிட்டேன். ❤️'
    };

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        text: dressText[newDress]
      }
    ]);
  };

  /* ---------------- MOOD ---------------- */

  const changeMood = (newMood: string) => {
    setMood(newMood);
  };

  return (
    <main className="silk-app">

      {/* ================= HEADER ================= */}

      <header className="topbar">

        <div>
          <h1>PROJECT SILK</h1>
          <span>Live Interactive Companion</span>
        </div>

        <div className="live-indicator">
          <span className="live-dot" />
          <span>{status}</span>
        </div>

      </header>


      {/* ================= MAIN AREA ================= */}

      <section className="main-area">

        {/* LEFT CHAT */}

        <aside className="panel chat-panel">

          <div className="panel-title">
            <span>💗</span>
            <strong>SILK Chat</strong>
          </div>

          <div
            ref={chatContainerRef}
            className="messages"
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

                <small>
                  {msg.role === 'user' ? 'You' : 'SILK'}
                </small>

                <div>{msg.text}</div>

              </div>

            ))}

            {loading && (
              <div className="typing">
                SILK is thinking<span>.</span><span>.</span><span>.</span>
              </div>
            )}

          </div>

        </aside>


        {/* ================= CENTER AVATAR ================= */}

        <section className="avatar-section">

          <div className="ambient-glow" />

          <div
            className={`avatar-stage ${
              isSpeaking ? 'speaking' : ''
            }`}
          >

            {/* breathing wrapper */}

            <div className="breathing-avatar">

              <img
                src={dressImages[dress]}
                alt="SILK virtual companion"
                className="silk-image"
              />

            </div>

            {/* Live badge */}

            <div className="avatar-live">

              <span className="live-dot" />

              {isSpeaking
                ? 'Speaking'
                : isListening
                ? 'Listening'
                : 'Live'}

            </div>

          </div>


          {/* SUBTITLE */}

          <div className="subtitle">

            {messages[messages.length - 1]?.text}

          </div>

        </section>


        {/* ================= RIGHT ACTIONS ================= */}

        <aside className="panel actions-panel">

          <div className="panel-title">
            <strong>SILK Actions</strong>
          </div>


          {/* DRESS */}

          <div className="action-section">

            <label>DRESS</label>

            <button
              className={dress === 'Saree' ? 'action active' : 'action'}
              onClick={() => changeDress('Saree')}
            >
              👗 Dress: Saree
            </button>

            <button
              className={dress === 'Night' ? 'action active' : 'action'}
              onClick={() => changeDress('Night')}
            >
              👗 Dress: Night
            </button>

            <button
              className={dress === 'Casual' ? 'action active' : 'action'}
              onClick={() => changeDress('Casual')}
            >
              👗 Dress: Casual
            </button>

            <button
              className={dress === 'Glamour' ? 'action active' : 'action'}
              onClick={() => changeDress('Glamour')}
            >
              👗 Dress: Glamour
            </button>

          </div>


          {/* MOOD */}

          <div className="action-section">

            <label>MOOD</label>

            {['Happy', 'Shy', 'Thinking', 'Playful'].map(
              item => (

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
                  {item === 'Shy' && '😳'}
                  {item === 'Thinking' && '🤔'}
                  {item === 'Playful' && '😜'}

                  {' '}{item}

                </button>

              )
            )}

          </div>

        </aside>

      </section>


      {/* ================= FOOTER ================= */}

      <footer className="input-area">

        <button
          className={`mic-button ${
            isListening ? 'listening' : ''
          }`}
          onClick={startListening}
        >
          🎤
        </button>


        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
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


      {/* ================= CSS ================= */}

      <style jsx global>{`

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: #05020a;
        }

        body {
          font-family:
            Arial,
            "Noto Sans Tamil",
            sans-serif;
          color: white;
        }

        button,
        input {
          font-family: inherit;
        }

        .silk-app {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(
              circle at 50% 45%,
              rgba(155, 40, 190, 0.16),
              transparent 35%
            ),
            #05020a;
        }


        /* HEADER */

        .topbar {
          height: 82px;
          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 30px;

          border-bottom:
            1px solid rgba(255,255,255,0.08);

          background:
            rgba(0,0,0,0.55);

          backdrop-filter: blur(14px);
        }

        .topbar h1 {
          margin: 0;

          color: #ec4899;

          font-size: 29px;

          letter-spacing: 4px;

          font-weight: 800;

          text-shadow:
            0 0 20px rgba(236,72,153,0.4);
        }

        .topbar span {
          display: block;

          margin-top: 4px;

          color: #999;

          font-size: 13px;

          letter-spacing: 0.5px;
        }


        /* LIVE */

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 9px;

          padding: 10px 17px;

          border-radius: 25px;

          background:
            rgba(255,255,255,0.05);

          border:
            1px solid rgba(255,255,255,0.12);

          font-size: 13px;
        }

        .live-dot {
          width: 9px;
          height: 9px;

          border-radius: 50%;

          display: inline-block;

          background: #22c55e;

          box-shadow:
            0 0 12px #22c55e;

          animation: pulseDot 1.5s infinite;
        }

        @keyframes pulseDot {

          0%,100% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: 0.55;
            transform: scale(0.75);
          }

        }


        /* MAIN */

        .main-area {
          flex: 1;
          min-height: 0;

          display: grid;

          grid-template-columns:
            330px
            minmax(400px, 1fr)
            280px;

          gap: 20px;

          padding: 20px 24px;
        }


        /* PANELS */

        .panel {
          min-height: 0;

          border:
            1px solid rgba(255,255,255,0.09);

          border-radius: 20px;

          background:
            rgba(12,8,18,0.82);

          backdrop-filter: blur(15px);

          overflow: hidden;
        }

        .panel-title {
          height: 62px;

          display: flex;
          align-items: center;
          gap: 9px;

          padding: 0 20px;

          border-bottom:
            1px solid rgba(255,255,255,0.08);

          font-size: 18px;
        }


        /* CHAT */

        .chat-panel {
          display: flex;
          flex-direction: column;
        }

        .messages {
          flex: 1;

          overflow-y: auto;

          padding: 12px;
        }

        .messages::-webkit-scrollbar {
          width: 7px;
        }

        .messages::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 10px;
        }

        .message {
          padding: 12px 14px;

          margin-bottom: 10px;

          border-radius: 14px;

          font-size: 14px;

          line-height: 1.5;
        }

        .message small {
          display: block;

          margin-bottom: 4px;

          font-size: 10px;

          opacity: 0.55;

          letter-spacing: 1px;
        }

        .silk-message {
          background:
            rgba(255,255,255,0.045);

          color: #f2a7d0;
        }

        .user-message {
          background:
            linear-gradient(
              135deg,
              #9d3fc5,
              #6f3fb5
            );

          color: white;

          margin-left: 15px;
        }

        .typing {
          color: #ec4899;

          padding: 10px;

          font-size: 13px;
        }

        .typing span {
          animation: typing 1.2s infinite;
        }

        .typing span:nth-child(2) {
          animation-delay: .2s;
        }

        .typing span:nth-child(3) {
          animation-delay: .4s;
        }

        @keyframes typing {

          0%,100% {
            opacity: .2;
          }

          50% {
            opacity: 1;
          }

        }


        /* AVATAR */

        .avatar-section {
          position: relative;

          min-width: 0;

          display: flex;

          align-items: center;

          justify-content: center;

          flex-direction: column;

          overflow: hidden;
        }

        .ambient-glow {
          position: absolute;

          width: 520px;
          height: 520px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(236,72,153,0.27),
              rgba(120,40,180,0.1) 40%,
              transparent 70%
            );

          filter: blur(35px);

          pointer-events: none;
        }


        .avatar-stage {
          position: relative;

          height: calc(100% - 75px);

          width: min(100%, 520px);

          display: flex;

          align-items: center;

          justify-content: center;

          z-index: 2;
        }


        /* LIVE BREATHING EFFECT */

        .breathing-avatar {
          height: 100%;
          width: 100%;

          display: flex;

          align-items: center;
          justify-content: center;

          animation:
            breathing 4.2s ease-in-out infinite;
        }

        .speaking .breathing-avatar {
          animation:
            speakingMovement 0.9s ease-in-out infinite;
        }

        @keyframes breathing {

          0%,100% {
            transform:
              translateY(0)
              scale(1);
          }

          50% {
            transform:
              translateY(-5px)
              scale(1.008);
          }

        }

        @keyframes speakingMovement {

          0%,100% {
            transform:
              translateY(0)
              scale(1);
          }

          50% {
            transform:
              translateY(-3px)
              scale(1.012);
          }

        }


        .silk-image {
          max-height: 100%;
          max-width: 100%;

          object-fit: contain;

          border-radius: 18px;

          filter:
            brightness(0.96)
            contrast(1.04)
            drop-shadow(
              0 15px 45px
              rgba(236,72,153,0.22)
            );

          transition:
            opacity .35s ease,
            filter .35s ease,
            transform .35s ease;
        }

        .speaking .silk-image {
          filter:
            brightness(1.04)
            contrast(1.05)
            drop-shadow(
              0 0 25px
              rgba(236,72,153,0.55)
            );
        }


        /* AVATAR LIVE */

        .avatar-live {
          position: absolute;

          bottom: 24px;
          left: 50%;

          transform: translateX(-50%);

          padding: 9px 18px;

          display: flex;

          align-items: center;

          gap: 8px;

          border-radius: 25px;

          background:
            rgba(0,0,0,0.72);

          border:
            1px solid rgba(255,255,255,0.15);

          font-size: 12px;

          backdrop-filter: blur(10px);
        }


        /* SUBTITLE */

        .subtitle {
          position: absolute;

          bottom: 0;

          width: min(90%, 760px);

          min-height: 48px;

          padding: 12px 20px;

          display: flex;

          align-items: center;

          justify-content: center;

          text-align: center;

          border-radius: 18px;

          background:
            rgba(0,0,0,0.72);

          border:
            1px solid rgba(236,72,153,0.25);

          color: #f3a3cc;

          font-size: 14px;

          z-index: 5;

          backdrop-filter: blur(10px);
        }


        /* ACTIONS */

        .actions-panel {
          overflow-y: auto;
        }

        .action-section {
          padding: 18px 14px;

          border-bottom:
            1px solid rgba(255,255,255,0.06);
        }

        .action-section label {
          display: block;

          margin: 0 8px 10px;

          color: #8f8995;

          font-size: 11px;

          letter-spacing: 1.5px;
        }

        .action {
          width: 100%;

          border: none;

          background: transparent;

          color: #ddd;

          padding: 12px;

          margin-bottom: 4px;

          border-radius: 12px;

          text-align: left;

          cursor: pointer;

          font-size: 13px;

          transition:
            background .2s ease,
            transform .2s ease;
        }

        .action:hover {
          background:
            rgba(236,72,153,0.10);

          transform:
            translateX(3px);
        }

        .action.active {
          background:
            rgba(236,72,153,0.17);

          color: #f472b6;
        }


        /* INPUT */

        .input-area {
          height: 88px;

          flex-shrink: 0;

          display: flex;

          align-items: center;

          gap: 12px;

          padding: 14px 24px;

          border-top:
            1px solid rgba(255,255,255,0.08);

          background:
            rgba(8,5,13,0.95);
        }

        .input-area input {
          flex: 1;

          height: 54px;

          border-radius: 28px;

          padding:
            0 20px;

          border:
            1px solid rgba(255,255,255,0.12);

          outline: none;

          background:
            rgba(255,255,255,0.06);

          color: white;

          font-size: 15px;
        }

        .input-area input::placeholder {
          color: #77717c;
        }

        .input-area input:focus {
          border-color:
            rgba(236,72,153,0.45);
        }

        .mic-button {
          width: 54px;
          height: 54px;

          flex-shrink: 0;

          border: none;

          border-radius: 50%;

          cursor: pointer;

          color: white;

          font-size: 20px;

          background:
            linear-gradient(
              135deg,
              #ec4899,
              #8b5cf6
            );

          box-shadow:
            0 0 20px
            rgba(236,72,153,0.22);
        }

        .mic-button.listening {
          background: #eab308;

          box-shadow:
            0 0 25px
            rgba(234,179,8,0.55);
        }

        .send-button {
          height: 50px;

          padding:
            0 25px;

          border: none;

          border-radius: 26px;

          background: #ec4899;

          color: white;

          font-weight: 700;

          cursor: pointer;

          font-size: 14px;
        }

        .send-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }


        /* MOBILE */

        @media (max-width: 1000px) {

          .main-area {
            grid-template-columns:
              250px
              minmax(300px, 1fr);

          }

          .actions-panel {
            display: none;
          }

        }


        @media (max-width: 700px) {

          .topbar {
            height: 65px;
            padding: 0 15px;
          }

          .topbar h1 {
            font-size: 20px;
          }

          .topbar span {
            font-size: 10px;
          }

          .main-area {
            display: block;
            padding: 10px;
          }

          .chat-panel {
            display: none;
          }

          .avatar-section {
            height: 100%;
          }

          .avatar-stage {
            width: 100%;
          }

          .input-area {
            padding: 10px;
            height: 76px;
          }

          .mic-button {
            width: 46px;
            height: 46px;
          }

          .send-button {
            padding: 0 17px;
          }

        }

      `}</style>

    </main>
  );
}
