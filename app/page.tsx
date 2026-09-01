'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

export default function SilkApp() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Live');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastAudio, setLastAudio] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'வணக்கம் செல்லம்... நான் தான் உன் SILK. சொல்லுடா என்ன பேசணும்?'
    }
  ]);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --------------------------------------------------
  // AUTO SCROLL
  // --------------------------------------------------

  useEffect(() => {
    const el = chatContainerRef.current;

    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // --------------------------------------------------
  // CLEANUP AUDIO
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------
  // PLAY SILK VOICE
  // --------------------------------------------------

  const playAudio = (base64Audio: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
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

      audio.onerror = (event) => {
        console.error('Audio playback error:', event);

        setIsSpeaking(false);
        setStatus('Live');
      };

      audio.play().catch((error) => {
        console.error('Autoplay blocked:', error);

        setIsSpeaking(false);
        setStatus('Click Play to Hear');
      });
    } catch (error) {
      console.error('Audio initialization error:', error);
    }
  };

  // --------------------------------------------------
  // MICROPHONE
  // --------------------------------------------------

  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('உங்கள் Browser-ல் Mic வசதி support இல்லை.');
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

      if (!transcript.trim()) return;

      setInput(transcript);

      handleSend(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event);

      setIsListening(false);
      setStatus('Live');
    };

    recognition.onend = () => {
      setIsListening(false);

      if (!isSpeaking) {
        setStatus('Live');
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Recognition start error:', error);

      setIsListening(false);
      setStatus('Live');
    }
  };

  // --------------------------------------------------
  // SEND MESSAGE
  // --------------------------------------------------

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

    setMessages((prev) => [
      ...prev,
      userMessage
    ]);

    setLoading(true);
    setStatus('Thinking...');

    try {
      const history = messages.map((message) => ({
        sender:
          message.role === 'user'
            ? 'USER'
            : 'SILK',
        text: message.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: query,
          mode: 'girlfriend',
          memory: '',
          history
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.details ||
          data?.error ||
          'Server error'
        );
      }

      const reply =
        data?.reply ||
        'செல்லம்... சரியா கேட்கல. மறுபடியும் சொல்லுடா?';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: reply
        }
      ]);

      if (data?.audio) {
        setLastAudio(data.audio);
        playAudio(data.audio);
      } else {
        setStatus('Live');
      }
    } catch (error) {
      console.error('Chat error:', error);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            'என்ன செல்லம்... connection-la konjam issue. மறுபடியும் try பண்ணுடா.'
        }
      ]);

      setStatus('Live');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // CURRENT SILK IMAGE
  // --------------------------------------------------

  const silkImage =
    '/silk/silk-face-1.jpg.jpg';

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="silk-app">

      {/* ================================================
          ANIMATION STYLES
      ================================================= */}

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .silk-app {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;

          background:
            radial-gradient(
              circle at 50% 45%,
              rgba(236,72,153,0.12),
              transparent 38%
            ),
            #05020a;

          color: white;

          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          display: flex;
          flex-direction: column;
        }

        /* ----------------------------------------------
           HEADER
        ---------------------------------------------- */

        .header {
          position: relative;
          z-index: 20;

          height: 64px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 20px;

          background:
            linear-gradient(
              to bottom,
              rgba(0,0,0,0.88),
              rgba(0,0,0,0.35)
            );

          border-bottom:
            1px solid rgba(255,255,255,0.08);
        }

        .logo {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 2px;

          color: #ec4899;

          text-shadow:
            0 0 15px rgba(236,72,153,0.55);
        }

        .subtitle {
          margin-top: 3px;

          font-size: 10px;
          color: #888;
          letter-spacing: 0.5px;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 8px;

          padding: 7px 13px;

          border-radius: 20px;

          background:
            rgba(255,255,255,0.07);

          border:
            1px solid rgba(255,255,255,0.10);

          font-size: 11px;
        }

        .live-dot {
          width: 8px;
          height: 8px;

          border-radius: 50%;

          background: #22c55e;

          box-shadow:
            0 0 10px #22c55e;

          animation:
            livePulse 2s infinite;
        }

        @keyframes livePulse {
          0%,100% {
            opacity: .55;
            transform: scale(.85);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        /* ----------------------------------------------
           MAIN STAGE
        ---------------------------------------------- */

        .stage {
          position: relative;

          flex: 1;

          min-height: 0;

          display: flex;

          justify-content: center;
          align-items: center;

          overflow: hidden;

          background:
            radial-gradient(
              ellipse at center,
              rgba(236,72,153,0.08),
              transparent 55%
            );
        }

        /* ----------------------------------------------
           BACKGROUND GLOW
        ---------------------------------------------- */

        .ambient-glow {
          position: absolute;

          width: 480px;
          height: 480px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(236,72,153,0.20),
              rgba(139,92,246,0.08),
              transparent 70%
            );

          filter: blur(45px);

          animation:
            ambientMove 8s ease-in-out infinite;
        }

        @keyframes ambientMove {

          0%,100% {
            transform:
              scale(.95)
              translateY(5px);
          }

          50% {
            transform:
              scale(1.08)
              translateY(-8px);
          }
        }

        /* ----------------------------------------------
           SILK BODY / IMAGE
        ---------------------------------------------- */

        .silk-wrapper {
          position: relative;

          width: min(92vw, 520px);
          height: calc(100% - 20px);

          display: flex;

          align-items: center;
          justify-content: center;

          z-index: 5;
        }

        .silk-body {
          position: relative;

          height: 96%;
          width: 100%;

          display: flex;

          justify-content: center;
          align-items: center;

          transform-origin:
            50% 82%;

          animation:
            silkBreathing 4.8s ease-in-out infinite;
        }

        /*
          Subtle idle movement.
          This gives the photo a soft "alive" feeling.
        */

        @keyframes silkBreathing {

          0% {
            transform:
              translateY(0px)
              scale(1);
          }

          25% {
            transform:
              translateY(-3px)
              scale(1.006);
          }

          50% {
            transform:
              translateY(-6px)
              scale(1.012);
          }

          75% {
            transform:
              translateY(-3px)
              scale(1.006);
          }

          100% {
            transform:
              translateY(0px)
              scale(1);
          }
        }

        /*
          Extra speaking movement.
        */

        .speaking .silk-body {
          animation:
            silkSpeaking 2.7s ease-in-out infinite;
        }

        @keyframes silkSpeaking {

          0%,100% {
            transform:
              translateY(0)
              scale(1);
          }

          25% {
            transform:
              translateY(-4px)
              scale(1.009)
              rotate(-0.15deg);
          }

          50% {
            transform:
              translateY(-7px)
              scale(1.014)
              rotate(0.15deg);
          }

          75% {
            transform:
              translateY(-3px)
              scale(1.007)
              rotate(-0.1deg);
          }
        }

        /*
          Listening = gentle attentive movement
        */

        .listening .silk-body {
          animation:
            silkListening 3.5s ease-in-out infinite;
        }

        @keyframes silkListening {

          0%,100% {
            transform:
              translateY(0)
              rotate(0deg);
          }

          35% {
            transform:
              translateY(-3px)
              rotate(-0.25deg);
          }

          70% {
            transform:
              translateY(-2px)
              rotate(0.25deg);
          }
        }

        .silk-image {
          position: relative;

          height: 100%;
          width: 100%;

          object-fit: contain;

          display: block;

          user-select: none;

          -webkit-user-drag: none;

          filter:
            brightness(0.97)
            contrast(1.03)
            saturate(1.04)
            drop-shadow(
              0 20px 45px
              rgba(0,0,0,0.65)
            );

          transition:
            filter .4s ease;
        }

        .speaking .silk-image {

          filter:
            brightness(1.05)
            contrast(1.04)
            saturate(1.08)
            drop-shadow(
              0 0 28px
              rgba(236,72,153,0.45)
            );
        }

        /* ----------------------------------------------
           LIGHT SWEEP
        ---------------------------------------------- */

        .light-sweep {
          position: absolute;

          width: 130%;
          height: 20%;

          left: -15%;
          top: 35%;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,0.035),
              transparent
            );

          transform:
            rotate(-8deg);

          pointer-events: none;

          animation:
            lightSweep 7s ease-in-out infinite;
        }

        @keyframes lightSweep {

          0% {
            transform:
              translateX(-40%)
              rotate(-8deg);
            opacity: 0;
          }

          25% {
            opacity: .8;
          }

          55% {
            opacity: .8;
          }

          100% {
            transform:
              translateX(40%)
              rotate(-8deg);
            opacity: 0;
          }
        }

        /* ----------------------------------------------
           SPEAKING RING
        ---------------------------------------------- */

        .speaking-ring {

          position: absolute;

          width: 310px;
          height: 310px;

          border-radius: 50%;

          border:
            1px solid
            rgba(236,72,153,0.18);

          opacity: 0;

          pointer-events: none;
        }

        .speaking .speaking-ring {

          opacity: 1;

          animation:
            speakingRing 2s ease-out infinite;
        }

        @keyframes speakingRing {

          0% {
            transform: scale(.75);
            opacity: .6;
          }

          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }

        /* ----------------------------------------------
           STATUS
        ---------------------------------------------- */

        .status {

          position: absolute;

          left: 50%;
          bottom: 125px;

          transform:
            translateX(-50%);

          z-index: 15;

          padding: 7px 15px;

          border-radius: 22px;

          background:
            rgba(0,0,0,0.72);

          backdrop-filter:
            blur(10px);

          border:
            1px solid
            rgba(255,255,255,0.12);

          font-size: 11px;

          white-space: nowrap;
        }

        .status-dot {

          display: inline-block;

          width: 7px;
          height: 7px;

          border-radius: 50%;

          margin-right: 7px;

          background: #22c55e;
        }

        .status-speaking .status-dot {
          background: #ec4899;

          box-shadow:
            0 0 10px
            rgba(236,72,153,.9);
        }

        .status-listening .status-dot {
          background: #eab308;

          box-shadow:
            0 0 10px
            rgba(234,179,8,.9);
        }

        /* ----------------------------------------------
           SUBTITLE
        ---------------------------------------------- */

        .subtitle-box {

          position: absolute;

          left: 50%;
          bottom: 20px;

          transform:
            translateX(-50%);

          width: min(90%, 620px);

          max-height: 90px;

          overflow-y: auto;

          padding: 11px 16px;

          border-radius: 16px;

          background:
            rgba(0,0,0,0.78);

          backdrop-filter:
            blur(12px);

          border:
            1px solid
            rgba(255,255,255,0.10);

          z-index: 20;

          text-align: center;
        }

        .subtitle-text {

          margin: 0;

          font-size: 14px;

          line-height: 1.45;

          color: #f9a8d4;
        }

        /* ----------------------------------------------
           PLAY BUTTON
        ---------------------------------------------- */

        .play-button {

          position: absolute;

          top: 20px;
          right: 20px;

          z-index: 30;

          border: none;

          padding: 9px 15px;

          border-radius: 22px;

          color: white;

          background:
            linear-gradient(
              135deg,
              #ec4899,
              #8b5cf6
            );

          font-weight: 700;

          font-size: 12px;

          cursor: pointer;

          box-shadow:
            0 0 20px
            rgba(236,72,153,.30);
        }

        .play-button:hover {
          transform: translateY(-1px);
        }

        /* ----------------------------------------------
           FOOTER
        ---------------------------------------------- */

        .footer {

          position: relative;

          z-index: 30;

          display: flex;

          align-items: center;

          gap: 10px;

          padding: 10px 16px;

          min-height: 68px;

          background:
            rgba(10,5,20,0.96);

          border-top:
            1px solid
            rgba(255,255,255,0.08);
        }

        .mic-button {

          width: 46px;
          height: 46px;

          flex-shrink: 0;

          border: none;

          border-radius: 50%;

          color: white;

          font-size: 18px;

          cursor: pointer;

          background:
            linear-gradient(
              135deg,
              #ec4899,
              #8b5cf6
            );

          box-shadow:
            0 0 15px
            rgba(236,72,153,.25);
        }

        .mic-button.listening-button {

          background: #eab308;

          box-shadow:
            0 0 20px
            rgba(234,179,8,.55);

          animation:
            micPulse 1.2s infinite;
        }

        @keyframes micPulse {

          0%,100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.08);
          }
        }

        .text-input {

          flex: 1;

          height: 44px;

          min-width: 0;

          padding:
            0 17px;

          border-radius: 24px;

          border:
            1px solid
            rgba(255,255,255,0.14);

          outline: none;

          background:
            rgba(255,255,255,0.07);

          color: white;

          font-size: 14px;
        }

        .text-input::placeholder {
          color: #777;
        }

        .text-input:focus {
          border-color:
            rgba(236,72,153,.55);

          box-shadow:
            0 0 15px
            rgba(236,72,153,.10);
        }

        .send-button {

          height: 42px;

          padding:
            0 20px;

          border: none;

          border-radius: 22px;

          background:
            linear-gradient(
              135deg,
              #ec4899,
              #a855f7
            );

          color: white;

          font-weight: 800;

          cursor: pointer;
        }

        .send-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        /* ----------------------------------------------
           MOBILE
        ---------------------------------------------- */

        @media (max-width: 600px) {

          .header {
            height: 58px;
            padding: 0 14px;
          }

          .logo {
            font-size: 16px;
          }

          .silk-wrapper {
            width: 100%;
          }

          .status {
            bottom: 118px;
          }

          .subtitle-box {
            bottom: 14px;
            max-height: 80px;
          }

          .footer {
            padding:
              9px 10px;
          }

          .mic-button {
            width: 42px;
            height: 42px;
          }

          .send-button {
            padding:
              0 15px;
          }
        }

      `}</style>

      {/* ================================================
          HEADER
      ================================================= */}

      <header className="header">

        <div>
          <div className="logo">
            PROJECT SILK
          </div>

          <div className="subtitle">
            Live Interactive Companion
          </div>
        </div>

        <div className="live-indicator">

          <span className="live-dot" />

          <span>
            {status}
          </span>

        </div>

      </header>

      {/* ================================================
          MAIN STAGE
      ================================================= */}

      <main
        className={`
          stage
          ${isSpeaking ? 'speaking' : ''}
          ${isListening ? 'listening' : ''}
        `}
      >

        <div className="ambient-glow" />

        <div className="speaking-ring" />

        <div className="silk-wrapper">

          <div className="silk-body">

            <img
              src={silkImage}
              alt="SILK"
              className="silk-image"
              draggable={false}
            />

            <div className="light-sweep" />

          </div>

        </div>

        {/* STATUS */}

        <div
          className={`
            status
            ${isSpeaking ? 'status-speaking' : ''}
            ${isListening ? 'status-listening' : ''}
          `}
        >

          <span className="status-dot" />

          {status}

        </div>

        {/* REPLAY VOICE */}

        {lastAudio && !isSpeaking && (

          <button
            className="play-button"
            onClick={() => playAudio(lastAudio)}
          >
            🔊 Play Voice
          </button>

        )}

        {/* SUBTITLE */}

        <div
          ref={chatContainerRef}
          className="subtitle-box"
        >

          {messages.length > 0 && (

            <p className="subtitle-text">

              {
                messages[
                  messages.length - 1
                ].text
              }

            </p>

          )}

        </div>

      </main>

      {/* ================================================
          FOOTER
      ================================================= */}

      <footer className="footer">

        <button
          className={`
            mic-button
            ${isListening ? 'listening-button' : ''}
          `}
          onClick={startListening}
          title="Speak to SILK"
        >
          🎤
        </button>

        <input
          className="text-input"
          type="text"
          placeholder="பேசுடா செல்லம்... அல்லது Type பண்ணு"
          value={input}
          onChange={(event) =>
            setInput(event.target.value)
          }
          onKeyDown={(event) => {

            if (event.key === 'Enter') {
              handleSend();
            }

          }}
        />

        <button
          className="send-button"
          onClick={() => handleSend()}
          disabled={loading}
        >
          {loading ? '...' : 'Send'}
        </button>

      </footer>

    </div>
  );
}
