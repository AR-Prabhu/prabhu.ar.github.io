'use client';

import { useEffect, useRef, useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

type DressMode =
  | 'saree'
  | 'night'
  | 'casual'
  | 'glamour'
  | 'default';

export default function SilkApp() {
  // ============================================================
  // STATE
  // ============================================================

  const [input, setInput] = useState('');

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState('Live');

  const [isSpeaking, setIsSpeaking] = useState(false);

  const [isListening, setIsListening] = useState(false);

  const [lastAudio, setLastAudio] = useState<string | null>(null);

  const [dressMode, setDressMode] =
    useState<DressMode>('default');

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'வணக்கம் செல்லம்... நான் தான் SILK. சொல்லுடா, என்ன பேசணும்?'
    }
  ]);

  // ============================================================
  // REFS
  // ============================================================

  const chatContainerRef =
    useRef<HTMLDivElement | null>(null);

  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  const recognitionRef =
    useRef<any>(null);

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // ============================================================
  // CLEANUP AUDIO
  // ============================================================

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // ============================================================
  // DRESS COMMAND DETECTION
  // ============================================================

  const detectDressCommand = (text: string) => {
    const lower = text.toLowerCase();

    // Saree
    if (
      lower.includes('saree') ||
      lower.includes('sari') ||
      lower.includes('சேலை') ||
      lower.includes('சாரி')
    ) {
      setDressMode('saree');
      return;
    }

    // Night dress
    if (
      lower.includes('night dress') ||
      lower.includes('nightwear') ||
      lower.includes('night wear') ||
      lower.includes('நைட் டிரஸ்') ||
      lower.includes('நைட்டி')
    ) {
      setDressMode('night');
      return;
    }

    // Casual
    if (
      lower.includes('casual') ||
      lower.includes('casual dress')
    ) {
      setDressMode('casual');
      return;
    }

    // Glamour
    if (
      lower.includes('glamour') ||
      lower.includes('glamorous')
    ) {
      setDressMode('glamour');
      return;
    }
  };

  // ============================================================
  // DRESS IMAGE
  // ============================================================

  const getDressImage = () => {
    /*
      IMPORTANT:

      These are FUTURE asset names.

      For now, if these files don't exist,
      browser will fallback to silk-full-body.png.

      Later we can upload:

      /public/silk/
        silk-full-body.png
        silk-saree.png
        silk-night.png
        silk-casual.png
        silk-glamour.png
    */

    switch (dressMode) {
      case 'saree':
        return '/silk/silk-saree.png';

      case 'night':
        return '/silk/silk-night.png';

      case 'casual':
        return '/silk/silk-casual.png';

      case 'glamour':
        return '/silk/silk-glamour.png';

      default:
        return '/silk/silk-full-body.png';
    }
  };

  // ============================================================
  // IMAGE FALLBACK
  // ============================================================

  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement>
  ) => {
    const img = event.currentTarget;

    if (!img.src.endsWith('/silk/silk-full-body.png')) {
      img.src = '/silk/silk-full-body.png';
    }
  };

  // ============================================================
  // AUDIO PLAYER
  // ============================================================

  const playAudio = async (base64Audio: string) => {
    try {
      if (!base64Audio) {
        return;
      }

      // Stop previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio();

      audio.preload = 'auto';

      audio.src = base64Audio;

      audioRef.current = audio;

      // --------------------------------------------------------
      // AUDIO EVENTS
      // --------------------------------------------------------

      audio.onplay = () => {
        setIsSpeaking(true);
        setStatus('SILK Speaking...');
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setStatus('Live');
      };

      audio.onerror = (event) => {
        console.error(
          'Audio playback error:',
          event
        );

        setIsSpeaking(false);
        setStatus('Live');
      };

      // --------------------------------------------------------
      // LOAD
      // --------------------------------------------------------

      audio.load();

      // --------------------------------------------------------
      // PLAY
      // --------------------------------------------------------

      try {
        await audio.play();
      } catch (playError) {
        console.warn(
          'Autoplay blocked:',
          playError
        );

        setIsSpeaking(false);
        setStatus('Click Play Voice');
      }
    } catch (error) {
      console.error(
        'Audio initialization error:',
        error
      );

      setIsSpeaking(false);
      setStatus('Live');
    }
  };

  // ============================================================
  // STOP VOICE
  // ============================================================

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setIsSpeaking(false);
    setStatus('Live');
  };

  // ============================================================
  // MICROPHONE
  // ============================================================

  const startListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}

      setIsListening(false);
      setStatus('Live');

      return;
    }

    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        'இந்த browser-ல் microphone speech recognition support இல்லை.'
      );

      return;
    }

    try {
      const recognition =
        new SpeechRecognition();

      recognitionRef.current = recognition;

      recognition.lang = 'ta-IN';

      recognition.continuous = false;

      recognition.interimResults = false;

      recognition.maxAlternatives = 1;

      // --------------------------------------------------------
      // START
      // --------------------------------------------------------

      recognition.onstart = () => {
        setIsListening(true);
        setStatus('Listening...');
      };

      // --------------------------------------------------------
      // RESULT
      // --------------------------------------------------------

      recognition.onresult = (
        event: any
      ) => {
        const transcript =
          event.results?.[0]?.[0]?.transcript;

        if (!transcript) {
          return;
        }

        setInput(transcript);

        detectDressCommand(transcript);

        handleSend(transcript);
      };

      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      recognition.onerror = (
        event: any
      ) => {
        console.error(
          'Speech recognition error:',
          event
        );

        setIsListening(false);
        setStatus('Live');
      };

      // --------------------------------------------------------
      // END
      // --------------------------------------------------------

      recognition.onend = () => {
        setIsListening(false);

        if (!isSpeaking && !loading) {
          setStatus('Live');
        }
      };

      recognition.start();
    } catch (error) {
      console.error(
        'Microphone error:',
        error
      );

      setIsListening(false);
      setStatus('Live');
    }
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSend = async (
    customText?: string
  ) => {
    const query =
      customText !== undefined
        ? customText
        : input;

    if (!query.trim()) {
      return;
    }

    if (loading) {
      return;
    }

    const cleanQuery =
      query.trim();

    // ----------------------------------------------------------
    // CHECK DRESS COMMAND
    // ----------------------------------------------------------

    detectDressCommand(cleanQuery);

    // ----------------------------------------------------------
    // CLEAR INPUT
    // ----------------------------------------------------------

    if (!customText) {
      setInput('');
    }

    // ----------------------------------------------------------
    // USER MESSAGE
    // ----------------------------------------------------------

    const userMessage: Message = {
      role: 'user',
      text: cleanQuery
    };

    setMessages(prev => [
      ...prev,
      userMessage
    ]);

    setLoading(true);

    setStatus('Thinking...');

    try {
      // --------------------------------------------------------
      // API
      // --------------------------------------------------------

      const res = await fetch(
        '/api/chat',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            message: cleanQuery,

            history: messages
          })
        }
      );

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      if (!res.ok) {
        throw new Error(
          `Server error: ${res.status}`
        );
      }

      const data =
        await res.json();

      // --------------------------------------------------------
      // REPLY
      // --------------------------------------------------------

      const reply =
        typeof data.reply === 'string' &&
        data.reply.trim()
          ? data.reply.trim()
          : 'ஹ்ம்ம் செல்லம்... கொஞ்சம் நேரம் கழிச்சு மறுபடியும் சொல்லு டா.';

      // --------------------------------------------------------
      // ASSISTANT MESSAGE
      // --------------------------------------------------------

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: reply
        }
      ]);

      // --------------------------------------------------------
      // AUDIO
      // --------------------------------------------------------

      if (
        data.audio &&
        typeof data.audio === 'string'
      ) {
        setLastAudio(data.audio);

        await playAudio(data.audio);
      } else {
        setStatus('Live');
      }
    } catch (error) {
      console.error(
        'Chat error:',
        error
      );

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text:
            'அச்சோ செல்லம்... connection-la கொஞ்சம் issue. மறுபடியும் try பண்ணுடா.'
        }
      ]);

      setStatus('Live');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CURRENT AVATAR ANIMATION STATE
  // ============================================================

  const avatarClass = [
    'silk-avatar',

    isSpeaking
      ? 'silk-speaking'
      : '',

    isListening
      ? 'silk-listening'
      : '',

    loading
      ? 'silk-thinking'
      : ''
  ]
    .filter(Boolean)
    .join(' ');

  // ============================================================
  // UI
  // ============================================================

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        background:
          'radial-gradient(circle at center, #18051f 0%, #08030c 45%, #020104 100%)',
        color: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily:
          'Arial, Helvetica, sans-serif'
      }}
    >
      {/* ======================================================
          HEADER
      ======================================================= */}

      <header
        style={{
          height: '72px',
          flexShrink: 0,
          padding: '0 26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            'space-between',
          borderBottom:
            '1px solid rgba(255,255,255,0.08)',
          background:
            'rgba(0,0,0,0.45)',
          backdropFilter:
            'blur(15px)',
          zIndex: 50
        }}
      >
        <div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '3px',
              color: '#ec4899',
              textShadow:
                '0 0 20px rgba(236,72,153,0.45)'
            }}
          >
            PROJECT SILK
          </div>

          <div
            style={{
              marginTop: '3px',
              fontSize: '11px',
              color: '#a1a1aa',
              letterSpacing: '0.5px'
            }}
          >
            Live Interactive Companion
          </div>
        </div>

        {/* LIVE STATUS */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding:
              '8px 15px',
            borderRadius: '25px',
            background:
              'rgba(255,255,255,0.07)',
            border:
              '1px solid rgba(255,255,255,0.12)',
            fontSize: '12px'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background:
                isSpeaking
                  ? '#ec4899'
                  : isListening
                  ? '#eab308'
                  : '#22c55e',
              boxShadow:
                '0 0 10px currentColor'
            }}
          />

          <span>
            {status}
          </span>
        </div>
      </header>

      {/* ======================================================
          MAIN AVATAR AREA
      ======================================================= */}

      <section
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        {/* BACKGROUND GLOW */}

        <div
          style={{
            position: 'absolute',
            width: '550px',
            height: '550px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(139,92,246,0.08) 35%, transparent 72%)',
            filter: 'blur(35px)',
            pointerEvents: 'none'
          }}
        />

        {/* SECONDARY GLOW */}

        <div
          style={{
            position: 'absolute',
            width: '250px',
            height: '450px',
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(168,85,247,0.10), transparent 70%)',
            filter: 'blur(30px)',
            pointerEvents: 'none'
          }}
        />

        {/* ==================================================
            FULL BODY SILK
        =================================================== */}

        <div
          className={avatarClass}
          style={{
            position: 'relative',
            height: 'calc(100% - 20px)',
            width: 'min(520px, 72vw)',
            maxWidth: '520px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            zIndex: 5,
            transformOrigin:
              'center bottom'
          }}
        >
          {/* AVATAR GLOW */}

          <div
            style={{
              position: 'absolute',
              inset: '8% 5% 0 5%',
              borderRadius:
                '45% 45% 10% 10%',
              background:
                isSpeaking
                  ? 'radial-gradient(ellipse, rgba(236,72,153,0.24), transparent 68%)'
                  : 'radial-gradient(ellipse, rgba(139,92,246,0.13), transparent 68%)',
              filter: 'blur(30px)',
              transition:
                'all 0.4s ease',
              pointerEvents: 'none'
            }}
          />

          {/* =================================================
              MAIN FULL BODY IMAGE

              THIS IS THE IMPORTANT PART

              Reference images are NOT displayed here.
          ================================================== */}

          <img
            src={getDressImage()}
            alt="SILK virtual companion"
            onError={handleImageError}
            draggable={false}
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition:
                'center bottom',
              userSelect: 'none',
              pointerEvents: 'none',

              filter:
                isSpeaking
                  ? 'brightness(1.05) drop-shadow(0 0 22px rgba(236,72,153,0.42))'
                  : 'brightness(0.94) drop-shadow(0 0 15px rgba(139,92,246,0.20))',

              transition:
                'filter 0.35s ease'
            }}
          />

          {/* =================================================
              LIVE INDICATOR
          ================================================== */}

          <div
            style={{
              position: 'absolute',
              bottom: '8%',
              left: '50%',
              transform:
                'translateX(-50%)',
              zIndex: 10,
              padding:
                '7px 15px',
              borderRadius: '20px',
              background:
                'rgba(0,0,0,0.72)',
              border:
                '1px solid rgba(255,255,255,0.12)',
              backdropFilter:
                'blur(10px)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background:
                  isSpeaking
                    ? '#ec4899'
                    : '#22c55e',
                boxShadow:
                  '0 0 10px currentColor'
              }}
            />

            {isSpeaking
              ? 'Speaking'
              : isListening
              ? 'Listening'
              : 'Live'}
          </div>
        </div>

        {/* ==================================================
            REPLAY VOICE
        =================================================== */}

        {lastAudio &&
          !isSpeaking && (
            <button
              onClick={() =>
                playAudio(lastAudio)
              }
              style={{
                position: 'absolute',
                right: '25px',
                top: '25px',
                zIndex: 30,
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '22px',
                padding:
                  '9px 15px',
                background:
                  'linear-gradient(135deg,#ec4899,#8b5cf6)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow:
                  '0 0 20px rgba(236,72,153,0.3)'
              }}
            >
              🔊 Play Voice
            </button>
          )}

        {/* STOP VOICE */}

        {isSpeaking && (
          <button
            onClick={stopAudio}
            style={{
              position: 'absolute',
              right: '25px',
              top: '25px',
              zIndex: 30,
              border:
                '1px solid rgba(255,255,255,0.15)',
              borderRadius: '22px',
              padding:
                '9px 15px',
              background:
                'rgba(0,0,0,0.65)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ⏹ Stop
          </button>
        )}

        {/* ==================================================
            SUBTITLE
        =================================================== */}

        <div
          ref={chatContainerRef}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '18px',
            transform:
              'translateX(-50%)',
            width: 'min(760px, 88vw)',
            maxHeight: '105px',
            overflowY: 'auto',
            zIndex: 20,
            padding:
              '11px 18px',
            borderRadius: '18px',
            background:
              'rgba(0,0,0,0.70)',
            border:
              '1px solid rgba(255,255,255,0.13)',
            backdropFilter:
              'blur(14px)',
            boxShadow:
              '0 10px 40px rgba(0,0,0,0.35)'
          }}
        >
          {messages.length > 0 && (
            <div
              style={{
                textAlign: 'center',
                fontSize: '14px',
                lineHeight: 1.5,
                color:
                  messages[
                    messages.length - 1
                  ].role ===
                  'assistant'
                    ? '#f9a8d4'
                    : '#e4e4e7'
              }}
            >
              {
                messages[
                  messages.length - 1
                ].text
              }
            </div>
          )}
        </div>
      </section>

      {/* ======================================================
          FOOTER
      ======================================================= */}

      <footer
        style={{
          flexShrink: 0,
          padding:
            '12px 22px 16px',
          background:
            'rgba(8,3,13,0.94)',
          borderTop:
            '1px solid rgba(255,255,255,0.08)',
          backdropFilter:
            'blur(18px)',
          zIndex: 50
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {/* MIC */}

          <button
            onClick={startListening}
            title="Talk to SILK"
            style={{
              width: '50px',
              height: '50px',
              flexShrink: 0,
              borderRadius: '50%',
              border: 'none',
              background:
                isListening
                  ? '#eab308'
                  : 'linear-gradient(135deg,#ec4899,#8b5cf6)',
              color: '#fff',
              fontSize: '19px',
              cursor: 'pointer',
              boxShadow:
                isListening
                  ? '0 0 25px rgba(234,179,8,0.55)'
                  : '0 0 20px rgba(236,72,153,0.20)',
              transition:
                'all 0.25s ease'
            }}
          >
            {isListening
              ? '⏹'
              : '🎤'}
          </button>

          {/* INPUT */}

          <input
            type="text"
            value={input}
            onChange={e =>
              setInput(
                e.target.value
              )
            }
            onKeyDown={e => {
              if (
                e.key === 'Enter'
              ) {
                handleSend();
              }
            }}
            placeholder="பேசுடா செல்லம்... அல்லது type பண்ணு"
            disabled={loading}
            style={{
              flex: 1,
              minWidth: 0,
              height: '48px',
              padding:
                '0 18px',
              borderRadius: '25px',
              border:
                '1px solid rgba(255,255,255,0.13)',
              outline: 'none',
              background:
                'rgba(255,255,255,0.06)',
              color: '#fff',
              fontSize: '14px',
              boxSizing:
                'border-box'
            }}
          />

          {/* SEND */}

          <button
            onClick={() =>
              handleSend()
            }
            disabled={
              loading ||
              !input.trim()
            }
            style={{
              height: '44px',
              padding:
                '0 22px',
              borderRadius: '23px',
              border: 'none',
              background:
                loading ||
                !input.trim()
                  ? '#3f3f46'
                  : '#ec4899',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              cursor:
                loading ||
                !input.trim()
                  ? 'not-allowed'
                  : 'pointer',
              flexShrink: 0
            }}
          >
            {loading
              ? '...'
              : 'Send'}
          </button>
        </div>
      </footer>

      {/* ======================================================
          ANIMATION CSS
      ======================================================= */}

      <style jsx>{`

        /* -----------------------------------------------
           NATURAL BODY BREATHING
        ------------------------------------------------ */

        .silk-avatar {
          animation:
            silkBreathing
            4.8s
            ease-in-out
            infinite;
        }

        @keyframes silkBreathing {

          0% {
            transform:
              translateY(0px)
              scale(1);
          }

          50% {
            transform:
              translateY(-5px)
              scale(1.008);
          }

          100% {
            transform:
              translateY(0px)
              scale(1);
          }

        }

        /* -----------------------------------------------
           SPEAKING
        ------------------------------------------------ */

        .silk-speaking {
          animation:
            silkSpeaking
            2.4s
            ease-in-out
            infinite;
        }

        @keyframes silkSpeaking {

          0% {
            transform:
              translateY(0px)
              scale(1)
              rotate(0deg);
          }

          25% {
            transform:
              translateY(-3px)
              scale(1.006)
              rotate(-0.25deg);
          }

          50% {
            transform:
              translateY(-6px)
              scale(1.012)
              rotate(0.25deg);
          }

          75% {
            transform:
              translateY(-3px)
              scale(1.006)
              rotate(-0.15deg);
          }

          100% {
            transform:
              translateY(0px)
              scale(1)
              rotate(0deg);
          }

        }

        /* -----------------------------------------------
           LISTENING
        ------------------------------------------------ */

        .silk-listening {
          animation:
            silkListening
            2.8s
            ease-in-out
            infinite;
        }

        @keyframes silkListening {

          0% {
            transform:
              translateY(0px)
              rotate(0deg);
          }

          30% {
            transform:
              translateY(-3px)
              rotate(-0.4deg);
          }

          60% {
            transform:
              translateY(-2px)
              rotate(0.4deg);
          }

          100% {
            transform:
              translateY(0px)
              rotate(0deg);
          }

        }

        /* -----------------------------------------------
           THINKING
        ------------------------------------------------ */

        .silk-thinking {
          animation:
            silkThinking
            3.2s
            ease-in-out
            infinite;
        }

        @keyframes silkThinking {

          0% {
            transform:
              translateY(0px);
          }

          50% {
            transform:
              translateY(-3px);
          }

          100% {
            transform:
              translateY(0px);
          }

        }

        /* -----------------------------------------------
           MOBILE
        ------------------------------------------------ */

        @media (max-width: 700px) {

          header {
            padding-left: 15px !important;
            padding-right: 15px !important;
          }

        }

      `}</style>
    </main>
  );
}
