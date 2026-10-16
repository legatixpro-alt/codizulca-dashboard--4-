import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  Mic, 
  Volume2, 
  VolumeX,
  Square,
  Sparkles,
  Database,
  Maximize2,
  Minimize2,
  Trash2,
  AlertCircle,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { SqlResultsTable } from './SqlResultsTable';
import codibotAvatar from '../../assets/codibot-avatar.jpg';

export interface SqlResultData {
  columns: string[];
  rows: Record<string, any>[];
  totalCount: number;
  executionTimeMs?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sqlQuery?: string;
  sqlResults?: SqlResultData;
  modelUsed?: string;
  source?: 'gemini' | 'gemini_sql' | 'analytical_engine';
  isVoiceInput?: boolean;
  audioBase64?: string;
}

/**
 * Circular Head Avatar of the 3D CodiBot Android
 */
export const CodiBotHeadAvatar: React.FC<{ 
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showGreenDot?: boolean;
  isSpeaking?: boolean;
}> = ({ className, size = 'md', showGreenDot = true, isSpeaking = false }) => {
  const sizeClasses = {
    xs: 'w-5 h-5 border',
    sm: 'w-6 h-6 border',
    md: 'w-8 h-8 border-2',
    lg: 'w-10 h-10 border-2'
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5 -top-0.5 -right-0.5',
    sm: 'w-2 h-2 -top-0.5 -right-0.5',
    md: 'w-2.5 h-2.5 -top-0.5 -right-0.5',
    lg: 'w-3 h-3 -top-1 right-0'
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0", className)}>
      {showGreenDot && (
        <div 
          className={cn(
            "absolute z-10 rounded-full bg-[#00e676] border border-black flex items-center justify-center shadow-[0_0_6px_#00e676]",
            dotSizes[size]
          )}
        >
          <span className="w-1 h-1 rounded-full bg-white/80 animate-ping" />
        </div>
      )}
      <div 
        className={cn(
          "rounded-full overflow-hidden border-red-500/50 bg-[#0a0a0c] shadow-sm relative transition-all duration-300",
          sizeClasses[size],
          isSpeaking && "ring-2 ring-red-500/60 shadow-[0_0_12px_rgba(224,6,19,0.7)]"
        )}
      >
        <img 
          src={codibotAvatar} 
          alt="CodiBot Avatar" 
          className="w-full h-full object-cover scale-[1.8] translate-y-[-10%]"
          style={{ objectPosition: '50% 18%' }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};

/**
 * CodiBot Pill Component with Official 3D Android Avatar
 */
export const CodiBotPillBadge: React.FC<{
  onClick?: () => void;
  className?: string;
  isFloating?: boolean;
}> = ({ onClick, className, isFloating = false }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center gap-2.5 bg-[#e00613] hover:bg-[#c90510] text-white pl-2 pr-4 py-1.5 rounded-full select-none cursor-pointer transition-all duration-200 active:scale-95 group",
        isFloating && "shadow-[0_8px_24px_-4px_rgba(0,0,0,0.8),0_0_16px_rgba(224,6,19,0.4)] hover:scale-105 border border-red-400/40",
        className
      )}
    >
      <CodiBotHeadAvatar size="md" />

      <div className="flex flex-col text-left leading-tight">
        <span className="text-[14px] font-bold text-white tracking-tight font-sans">
          CodiBot
        </span>
        <span className="text-[10px] text-zinc-100 font-mono tracking-wide opacity-90 -mt-0.5">
          Asistente IA
        </span>
      </div>
    </div>
  );
};

export const CodiBotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('codibot_is_open');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [dockMode, setDockMode] = useState<'floating' | 'docked' | 'fullscreen'>(() => {
    try {
      const saved = localStorage.getItem('codibot_dock_mode');
      return saved === 'floating' || saved === 'docked' || saved === 'fullscreen' ? saved : 'floating';
    } catch {
      return 'floating';
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('codibot_messages_active');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading saved messages:', e);
    }
    return [];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSqlViewId, setActiveSqlViewId] = useState<string | null>(null);

  // Audio / Voice States
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [voiceAutoPlay, setVoiceAutoPlay] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('codibot_voice_autoplay');
      return saved !== null ? saved === 'true' : false; // Default OFF to be non-intrusive
    } catch {
      return false;
    }
  });

  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const recordTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      stopAudioPlayback();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('codibot_is_open', String(isOpen));
    } catch {}
  }, [isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('codibot_dock_mode', dockMode);
    } catch {}
  }, [dockMode]);

  useEffect(() => {
    try {
      localStorage.setItem('codibot_messages_active', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('codibot_voice_autoplay', String(voiceAutoPlay));
    } catch {}
  }, [voiceAutoPlay]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isRecording, isOpen]);

  useEffect(() => {
    if (isOpen && !isRecording) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOpenCodiBot = () => {
      setIsOpen(true);
    };

    window.addEventListener('open-codibot' as any, handleOpenCodiBot);
    return () => window.removeEventListener('open-codibot' as any, handleOpenCodiBot);
  }, []);

  useEffect(() => {
    if (isRecording) {
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  const stopAudioPlayback = () => {
    if (currentAudioElementRef.current) {
      try {
        currentAudioElementRef.current.pause();
        currentAudioElementRef.current.currentTime = 0;
      } catch {}
      currentAudioElementRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setPlayingMessageId(null);
  };

  const playAudioForMessage = async (messageId: string, text: string, audioBase64?: string) => {
    if (playingMessageId === messageId) {
      stopAudioPlayback();
      return;
    }

    stopAudioPlayback();
    setPlayingMessageId(messageId);

    if (audioBase64) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        currentAudioElementRef.current = audio;
        audio.onended = () => {
          setPlayingMessageId(null);
          currentAudioElementRef.current = null;
        };
        audio.onerror = () => playSpeechSynthesisFallback(messageId, text);
        await audio.play();
        return;
      } catch (err) {
        console.warn('[CodiBot Voice] Audio play error:', err);
      }
    }

    try {
      const res = await fetch('/api/codibot/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          currentAudioElementRef.current = audio;
          audio.onended = () => {
            setPlayingMessageId(null);
            currentAudioElementRef.current = null;
          };
          audio.onerror = () => playSpeechSynthesisFallback(messageId, text);
          await audio.play();
          return;
        }
      }
    } catch {}

    playSpeechSynthesisFallback(messageId, text);
  };

  const playSpeechSynthesisFallback = (messageId: string, rawText: string) => {
    if (!('speechSynthesis' in window)) {
      setPlayingMessageId(null);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const cleanText = rawText
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\|[\s\S]*?\|/g, '')
        .replace(/[#*`_~]/g, '')
        .replace(/\$/g, ' dólares ')
        .replace(/\n+/g, '. ')
        .slice(0, 350);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onstart = () => setPlayingMessageId(messageId);
      utterance.onend = () => setPlayingMessageId(null);
      utterance.onerror = () => setPlayingMessageId(null);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setPlayingMessageId(null);
    }
  };

  const stopRecordingCleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const startVoiceRecording = async () => {
    setMicError(null);
    setLiveTranscript('');
    stopAudioPlayback();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Tu navegador no permite captura de audio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      const hasSpeechRec = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      if (hasSpeechRec) {
        try {
          const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRec();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'es-VE';

          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript) {
              setLiveTranscript(transcript);
            }
          };

          recognition.onerror = () => {};
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {}
      }

    } catch (err: any) {
      console.error('[CodiBot Mic Permission Error]:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Permiso de micrófono no habilitado en el navegador.');
      } else {
        setMicError('Error al acceder al micrófono.');
      }
      stopRecordingCleanup();
    }
  };

  const stopVoiceRecordingAndSend = async () => {
    if (!mediaRecorderRef.current || !isRecording) {
      stopRecordingCleanup();
      return;
    }

    setIsRecording(false);
    setTranscribing(true);

    const capturedLiveText = liveTranscript.trim();

    mediaRecorderRef.current.onstop = async () => {
      stopRecordingCleanup();

      if (capturedLiveText && capturedLiveText.length >= 3) {
        setTranscribing(false);
        setLiveTranscript('');
        handleSendMessage(capturedLiveText, true);
        return;
      }

      try {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
        });

        if (audioBlob.size < 100) {
          setTranscribing(false);
          setMicError('No se detectó audio.');
          return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string)?.split(',')[1];
          if (!base64Data) {
            setTranscribing(false);
            return;
          }

          try {
            const res = await fetch('/api/codibot/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: audioBlob.type || 'audio/webm'
              })
            });

            const data = await res.json();
            const transcript = (data.transcript || '').trim();

            setTranscribing(false);
            setLiveTranscript('');

            if (transcript) {
              handleSendMessage(transcript, true);
            } else {
              setMicError('Audio no identificado claramente.');
            }
          } catch (e) {
            setTranscribing(false);
            setMicError('Error en transcripción.');
          }
        };
        reader.readAsDataURL(audioBlob);

      } catch (err) {
        setTranscribing(false);
      }
    };

    try {
      mediaRecorderRef.current.stop();
    } catch {
      stopRecordingCleanup();
      setTranscribing(false);
    }
  };

  const cancelVoiceRecording = () => {
    stopRecordingCleanup();
    setLiveTranscript('');
    setMicError(null);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    stopAudioPlayback();
    setMessages([]);
    localStorage.removeItem('codibot_messages_active');
  };

  const handleSendMessage = async (customText?: string, fromVoice = false) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || loading) return;

    stopAudioPlayback();

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      isVoiceInput: fromVoice
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.content
      }));

      const res = await fetch('/api/codibot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          wantVoice: voiceAutoPlay || fromVoice
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const replyContent = data.reply || 'Sin respuesta del servidor.';

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        sqlQuery: data.sqlQuery,
        sqlResults: data.sqlResults,
        modelUsed: data.modelUsed || 'gemini-3.1-flash-lite',
        source: data.source || 'gemini',
        audioBase64: data.audioBase64
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (voiceAutoPlay || fromVoice) {
        setTimeout(() => {
          playAudioForMessage(assistantMessage.id, replyContent, data.audioBase64);
        }, 150);
      }

    } catch (err: any) {
      console.error('[CodiBot Widget Error]:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'No fue posible procesar la consulta. Intenta reformular tu pregunta.',
        timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        source: 'analytical_engine'
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('#### ')) {
        return (
          <h4 key={idx} className="font-bold text-red-300 text-xs mt-2 mb-1 flex items-center gap-1.5 border-b border-red-500/20 pb-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
            {line.replace('#### ', '')}
          </h4>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="font-bold text-white text-xs mt-2 mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-red-500" />
            {line.replace('### ', '')}
          </h3>
        );
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5 text-xs text-zinc-200 leading-snug pl-0.5">
            <span className="text-red-400 font-bold mt-0.5">•</span>
            <span>{formatInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</span>
          </div>
        );
      }
      if (/^\d+\.\s+/.test(line.trim())) {
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5 text-xs text-zinc-200 leading-snug pl-0.5">
            <span className="text-red-400 font-mono text-[10px] font-bold mt-0.5">
              {line.trim().match(/^\d+\./)?.[0]}
            </span>
            <span>{formatInlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</span>
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1" />;
      }
      return (
        <p key={idx} className="text-xs text-zinc-200 my-0.5 leading-snug">
          {formatInlineMarkdown(line)}
        </p>
      );
    });
  };

  const formatInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="text-zinc-200 italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="font-mono text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-red-300 border border-white/5">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Interactive Compact Chat Window (Optimized to take less screen space) */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 flex flex-col bg-[#0c0c0e]/98 backdrop-blur-2xl border border-red-500/30 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9),0_0_25px_rgba(224,6,19,0.25)] transition-all duration-300 font-sans",
            // Compact Floating Size: leaves dashboard visible!
            dockMode === 'floating' && "bottom-5 right-5 w-[92vw] sm:w-[380px] md:w-[400px] h-[520px] max-h-[78vh] rounded-2xl",
            // Docked Sidebar Mode
            dockMode === 'docked' && "right-0 top-0 bottom-0 w-full sm:w-[420px] lg:w-[450px] rounded-l-2xl border-r-0",
            // Fullscreen Modal Mode
            dockMode === 'fullscreen' && "inset-2 sm:inset-4 rounded-2xl"
          )}
        >
          {/* Header Bar - Sleek & Compact */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-zinc-950/90 shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="relative inline-flex items-center gap-2 bg-[#e00613] text-white pl-1.5 pr-3 py-1 rounded-full shadow-sm border border-red-400/40">
                <CodiBotHeadAvatar size="xs" isSpeaking={playingMessageId !== null} />
                <span className="text-xs font-bold text-white font-sans">CodiBot</span>
              </div>

              <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline truncate max-w-[140px]">
                Copiloto Comercial
              </span>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              {/* Voice Auto-Response Toggle */}
              <button
                onClick={() => setVoiceAutoPlay(!voiceAutoPlay)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-semibold",
                  voiceAutoPlay
                    ? "bg-red-950/60 text-red-400 border border-red-800/50 hover:bg-red-900/60"
                    : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                )}
                title={voiceAutoPlay ? "Voz automática ACTIVA" : "Voz SILENCIADA"}
              >
                {voiceAutoPlay ? <Volume2 className="h-3.5 w-3.5 text-red-500" /> : <VolumeX className="h-3.5 w-3.5" />}
                <span className="text-[9px]">{voiceAutoPlay ? "Voz ON" : "Voz OFF"}</span>
              </button>

              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Limpiar conversación"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                onClick={() => setDockMode(dockMode === 'floating' ? 'docked' : dockMode === 'docked' ? 'fullscreen' : 'floating')}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer hidden sm:flex"
                title={dockMode === 'floating' ? "Acoplar al lateral" : dockMode === 'docked' ? "Pantalla completa" : "Ventana flotante compacta"}
              >
                {dockMode === 'fullscreen' ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={() => {
                  stopAudioPlayback();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Minimizar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active Speaking Audio Visualizer Bar */}
          {playingMessageId && (
            <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-red-950 px-3 py-1.5 border-b border-red-500/30 flex items-center justify-between text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
                <span className="text-[11px] font-semibold text-red-200">CodiBot hablando...</span>
                <div className="flex items-center gap-1 ml-1">
                  <span className="w-1 h-2.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-3.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>

              <button
                onClick={stopAudioPlayback}
                className="px-2 py-0.5 rounded bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Square className="h-2.5 w-2.5 fill-current" />
                Pausar
              </button>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-zinc-400 space-y-3 overflow-y-auto">
                {/* Compact Robot Showcase */}
                <div className="relative group">
                  <div className="w-24 h-32 rounded-2xl overflow-hidden border border-red-500/40 shadow-[0_8px_20px_rgba(224,6,19,0.3)] bg-gradient-to-b from-zinc-900 to-black relative flex items-center justify-center">
                    <img 
                      src={codibotAvatar} 
                      alt="CodiBot 3D" 
                      className="w-full h-full object-contain p-1 filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]"
                    />
                    <div className="absolute bottom-1 inset-x-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono text-red-400 font-bold text-center border border-red-500/30">
                      EN LÍNEA
                    </div>
                  </div>
                </div>

                <div className="max-w-[280px] space-y-1">
                  <h4 className="text-sm font-bold text-white">¿Qué necesitas consultar?</h4>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    Respuestas directas con cifras exactas de ventas, cuotas, geocercas e inventario.
                  </p>
                </div>

                {/* Compact Voice Button */}
                <div className="pt-1 flex flex-col items-center gap-1.5">
                  <button
                    onClick={isRecording ? stopVoiceRecordingAndSend : startVoiceRecording}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shadow-lg cursor-pointer active:scale-95",
                      isRecording
                        ? "bg-red-600 text-white animate-pulse ring-2 ring-red-400"
                        : "bg-[#e00613] hover:bg-[#c90510] text-white shadow-red-950/70 hover:scale-105"
                    )}
                  >
                    {isRecording ? (
                      <Square className="h-3.5 w-3.5 fill-current animate-pulse text-white" />
                    ) : (
                      <Mic className="h-3.5 w-3.5" />
                    )}
                    <span>{isRecording ? `Grabando (${formatTimer(recordDuration)}) • Enviar` : "Comando por voz"}</span>
                  </button>

                  <span className="text-[10px] text-zinc-500">
                    {isRecording ? "Pulsa para enviar audio" : "o escribe tu pregunta abajo"}
                  </span>
                </div>

                {micError && (
                  <div className="p-2 rounded-xl bg-red-950/70 border border-red-500/40 text-left max-w-[280px] text-[10px] text-red-200 space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1 font-bold text-red-400">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>Micrófono:</span>
                    </div>
                    <p className="text-zinc-300">{micError}</p>
                    <button
                      onClick={() => startVoiceRecording()}
                      className="mt-0.5 text-[10px] font-bold text-white bg-red-600 hover:bg-red-500 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Reintentar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col gap-0.5 max-w-[96%] animate-in fade-in duration-200",
                      msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    {/* Role & Time Badge */}
                    <div className="flex items-center gap-1.5 px-1 text-[9px] text-zinc-500">
                      {msg.role === 'assistant' ? (
                        <span className="flex items-center gap-1 font-bold text-red-400">
                          <CodiBotHeadAvatar size="xs" isSpeaking={playingMessageId === msg.id} />
                          CodiBot
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-bold text-zinc-400">
                          {msg.isVoiceInput && <Mic className="h-2.5 w-2.5 text-red-400" />}
                          Tú
                        </span>
                      )}
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Message Bubble - Compact & Direct */}
                    <div
                      className={cn(
                        "rounded-xl p-3 shadow text-xs relative group/bubble",
                        msg.role === 'user'
                          ? "bg-[#e00613] text-white rounded-br-none border border-red-400/30 shadow-red-950/30"
                          : "bg-zinc-900/95 text-zinc-200 rounded-bl-none border border-white/10"
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="space-y-1.5">
                          {renderFormattedContent(msg.content)}

                          {/* Technical Query / Data Table Accordion (Hidden by default so user gets clean answer!) */}
                          {msg.sqlQuery && (
                            <div className="mt-2 pt-1.5 border-t border-white/10">
                              <button
                                onClick={() => setActiveSqlViewId(activeSqlViewId === msg.id ? null : msg.id)}
                                className="text-[10px] font-mono font-medium text-zinc-400 hover:text-white bg-zinc-800/70 hover:bg-zinc-800 px-2 py-1 rounded-md border border-white/10 flex items-center justify-between w-full transition-colors cursor-pointer"
                              >
                                <span className="flex items-center gap-1 text-red-400">
                                  <Database className="h-3 w-3" />
                                  <span>Consulta técnica y tabla de datos</span>
                                </span>
                                <span className="flex items-center gap-1 text-zinc-500 text-[9px]">
                                  {msg.sqlResults && <span>{msg.sqlResults.totalCount} filas</span>}
                                  {activeSqlViewId === msg.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </span>
                              </button>

                              {activeSqlViewId === msg.id && (
                                <div className="mt-2 space-y-2 animate-in fade-in duration-150">
                                  <pre className="p-2 rounded bg-black/80 border border-white/5 font-mono text-[9px] text-zinc-200 overflow-x-auto max-h-28">
                                    {msg.sqlQuery}
                                  </pre>
                                  {msg.sqlResults && (
                                    <div className="max-h-48 overflow-y-auto">
                                      <SqlResultsTable
                                        columns={msg.sqlResults.columns}
                                        rows={msg.sqlResults.rows}
                                        totalCount={msg.sqlResults.totalCount}
                                        executionTimeMs={msg.sqlResults.executionTimeMs}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Footer */}
                          <div className="flex items-center gap-2 pt-1.5 mt-1 border-t border-white/5 text-[9px] text-zinc-500">
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="flex items-center gap-1 hover:text-zinc-200 transition-colors cursor-pointer"
                              title="Copiar respuesta"
                            >
                              {copiedId === msg.id ? <Check className="h-2.5 w-2.5 text-red-500" /> : <Copy className="h-2.5 w-2.5" />}
                              <span>{copiedId === msg.id ? 'Copiado' : 'Copiar'}</span>
                            </button>

                            <button
                              onClick={() => playAudioForMessage(msg.id, msg.content, msg.audioBase64)}
                              className={cn(
                                "flex items-center gap-1 transition-colors cursor-pointer ml-auto px-1.5 py-0.5 rounded",
                                playingMessageId === msg.id 
                                  ? "bg-red-600/30 text-red-400 font-bold animate-pulse" 
                                  : "hover:text-zinc-200 hover:bg-zinc-800 text-zinc-400"
                              )}
                              title={playingMessageId === msg.id ? "Detener voz" : "Escuchar respuesta"}
                            >
                              {playingMessageId === msg.id ? (
                                <>
                                  <Square className="h-2.5 w-2.5 fill-current text-red-400" />
                                  <span>Detener</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-2.5 w-2.5 fill-current" />
                                  <span>Escuchar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {transcribing && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900 border border-red-500/30 max-w-[85%] animate-pulse text-xs text-zinc-300">
                    <Mic className="h-4 w-4 text-red-500 animate-spin" />
                    <span className="text-[11px] font-semibold text-white">Transcribiendo voz con IA...</span>
                  </div>
                )}

                {loading && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900 border border-white/10 max-w-[85%] animate-pulse text-xs text-zinc-300">
                    <CodiBotHeadAvatar size="xs" isSpeaking={true} />
                    <span className="text-[11px] font-semibold text-white">Consultando base de datos...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Active Voice Recording Bar */}
          {isRecording && (
            <div className="px-3 py-2 bg-red-950/90 border-t border-red-500/50 flex flex-col gap-1.5 text-xs text-white animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                  </span>
                  <span className="font-bold text-[11px] text-red-200">
                    Grabando ({formatTimer(recordDuration)})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={cancelVoiceRecording}
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={stopVoiceRecordingAndSend}
                    className="px-2.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] shadow transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Send className="h-2.5 w-2.5" />
                    Enviar
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-zinc-300 italic bg-black/40 px-2 py-1 rounded border border-white/5 truncate">
                {liveTranscript ? `"${liveTranscript}"` : 'Escuchando tu consulta...'}
              </div>
            </div>
          )}

          {/* Input Footer - Clean & Compact */}
          <div className="p-2 border-t border-white/10 bg-zinc-950/90 rounded-b-2xl">
            <div className="flex items-center gap-1.5 bg-zinc-900/90 rounded-xl p-1.5 border border-white/10 focus-within:border-red-500/50 transition-colors">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta a CodiBot..."
                rows={1}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none resize-none max-h-20 py-1 px-1 scrollbar-thin"
              />

              {/* Voice Command Button */}
              <button
                onClick={isRecording ? stopVoiceRecordingAndSend : startVoiceRecording}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  isRecording
                    ? "bg-red-600 text-white animate-pulse"
                    : "text-red-400 hover:text-white hover:bg-red-600/30 bg-red-950/40 border border-red-500/30"
                )}
                title={isRecording ? "Detener y enviar" : "Hablar por voz"}
              >
                {isRecording ? <Square className="h-3.5 w-3.5 fill-current animate-pulse" /> : <Mic className="h-3.5 w-3.5" />}
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || loading}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  inputMessage.trim() && !loading
                    ? "bg-[#e00613] hover:bg-[#c90510] text-white shadow-sm"
                    : "text-zinc-600 bg-zinc-800/50 cursor-not-allowed"
                )}
                title="Enviar"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
