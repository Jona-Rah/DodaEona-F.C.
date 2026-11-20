import React, { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  Loader2,
  PhoneOff,
  Radio,
  Send,
  Volume2,
  X,
} from 'lucide-react';
import {
  GEMINI_VOICE_OPTIONS,
  GeminiBroadcastVoiceChoice,
  GeminiLiveVoiceClient,
  LiveMatchContext,
  LiveSessionStatus,
  geminiHalftimeAudio,
  resolveVoiceForBroadcastStage,
} from '../../../utils/geminiAudioPlayer';

interface TranscriptEntry {
  id: string;
  role: 'user' | 'pundit';
  text: string;
}

interface HalftimeGeminiStudioProps {
  matchContext: LiveMatchContext;
  voiceName: GeminiBroadcastVoiceChoice;
  onChangeVoice: (voice: GeminiBroadcastVoiceChoice) => void;
  onClose: () => void;
}

export const HalftimeGeminiStudio: React.FC<HalftimeGeminiStudioProps> = ({
  matchContext,
  voiceName,
  onChangeVoice,
  onClose,
}) => {
  const [status, setStatus] = useState<LiveSessionStatus>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const clientRef = useRef<GeminiLiveVoiceClient | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const appendTranscript = (role: 'user' | 'pundit', chunk: string) => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [
          ...prev.slice(0, -1),
          { ...last, text: `${last.text}${chunk}` },
        ];
      }
      return [
        ...prev,
        {
          id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role,
          text: chunk,
        },
      ];
    });
  };

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    clientRef.current?.updateMatchContext(matchContext);
  }, [matchContext]);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);

  const handleStartLive = async () => {
    geminiHalftimeAudio.stop();
    setErrorMsg(null);
    setTranscript([]);

    if (!clientRef.current) {
      clientRef.current = new GeminiLiveVoiceClient({
        onStatusChange: setStatus,
        onOutputTranscript: (text) => appendTranscript('pundit', text),
        onSpeakingChange: setIsSpeaking,
        onError: (msg) => setErrorMsg(msg),
      });
    }

    await clientRef.current.connect({
      matchContext,
      voiceName,
      promptOpening: true,
    });
  };

  const handleStopLive = () => {
    clientRef.current?.disconnect();
    setStatus('idle');
    setIsSpeaking(false);
  };

  const handleSendText = (promptText?: string) => {
    const val = (promptText ?? textInput).trim();
    if (!val || status !== 'live' || !clientRef.current) return;
    const historySnapshot = transcript.slice(-10).map((t) => ({ role: t.role, text: t.text }));
    appendTranscript('user', val);
    clientRef.current.updateMatchContext(matchContext);
    clientRef.current.sendText(val, historySnapshot);
    if (!promptText) setTextInput('');
  };

  const quickPrompts =
    matchContext.phase === 'full-time'
      ? [
          `What swung ${matchContext.homeTeam} ${matchContext.homeScore}-${matchContext.awayScore} ${matchContext.awayTeam} across the ninety minutes?`,
          'Who stood out individually — compare top ratings, shots, passes, through passes, and defensive blocks.',
          'Which players lost the ball most often, and who defended cleanly with tackles and blocks?',
          'Did the scoreline reflect the balance of play, xG, and tactical adjustments?',
        ]
      : matchContext.phase === 'penalties' || matchContext.phase === 'penalties-intro'
      ? [
          `How do you call this shootout between ${matchContext.homeTeam} and ${matchContext.awayTeam} from here?`,
          'Who were the highest-rated performers and biggest ball-losers over 120 minutes?',
          'From a goalkeeper’s point of view, how do you read the pressure on the next penalty taker?',
        ]
      : [
          `What stands out most in ${matchContext.homeTeam} ${matchContext.homeScore}-${matchContext.awayScore} ${matchContext.awayTeam} so far?`,
          'Break down player ratings, shots, through passes, blocks, and who has lost the ball most.',
          'If you’re adjusting the shape at the break, what tactical tweak makes the biggest difference?',
          'Who is controlling midfield right now, and how can the opposition disrupt it?',
        ];

  return (
    <div className="rounded-2xl bg-[#060D1A] light:bg-white border border-cyan-400/35 light:border-cyan-300 shadow-xl overflow-hidden">
      {/* Studio Header */}
      <div className="px-4 py-3 border-b border-white/10 light:border-slate-200 bg-gradient-to-r from-cyan-950/60 via-[#070E1A] to-blue-950/50 light:from-cyan-50 light:via-white light:to-blue-50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              status === 'live'
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 light:text-emerald-700 animate-pulse'
                : 'bg-cyan-500/15 border-cyan-400/35 text-cyan-300 light:text-cyan-700'
            }`}
          >
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-black uppercase tracking-wider text-white light:text-slate-900 flex items-center gap-2">
              <span>AI Pundit Voice Studio</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/35 text-[9px] text-cyan-300 light:text-cyan-800">
                AI Voice Only · No Mic Needed
              </span>
            </div>
            <div className="font-mono text-[10px] text-slate-400 light:text-slate-600">
              {matchContext.homeTeam} {matchContext.homeScore} - {matchContext.awayScore}{' '}
              {matchContext.awayTeam} · AI Spoken Analysis
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={voiceName}
            disabled={status === 'live' || status === 'connecting'}
            onChange={(e) => onChangeVoice(e.target.value as GeminiBroadcastVoiceChoice)}
            className="bg-slate-950 light:bg-slate-100 border border-white/15 light:border-slate-300 rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold text-white light:text-slate-900 disabled:opacity-50"
          >
            <option value="Auto">
              Auto · Charon &amp; Orus Studio ({resolveVoiceForBroadcastStage('Auto', matchContext.phase, `${matchContext.homeTeam}:${matchContext.awayTeam}`)})
            </option>
            <optgroup label="Two-Commentator Studio">
              {GEMINI_VOICE_OPTIONS.filter((v) => v.category === 'analysis').map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ({v.role})
                </option>
              ))}
            </optgroup>
            <optgroup label="Alternative Solo Voices">
              {GEMINI_VOICE_OPTIONS.filter((v) => v.category === 'commentary').map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ({v.role})
                </option>
              ))}
            </optgroup>
          </select>

          <button
            type="button"
            onClick={() => {
              handleStopLive();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/[0.05] light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 cursor-pointer"
            title="Close AI Voice Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="p-4 space-y-3">
        {/* AI Voice Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/35 light:bg-slate-50 border border-white/10 light:border-slate-200">
          <div className="flex items-center gap-2.5">
            {status === 'idle' || status === 'error' ? (
              <button
                type="button"
                onClick={handleStartLive}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer hover:brightness-110 shadow-md"
              >
                <Volume2 className="w-4 h-4" />
                <span>Start AI Pundit Broadcast</span>
              </button>
            ) : status === 'connecting' ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 light:text-amber-800 font-mono text-xs font-bold uppercase cursor-wait"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting AI Studio...</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopLive}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/45 font-mono text-xs font-bold uppercase text-rose-200 light:text-rose-800 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Stop AI Broadcast</span>
              </button>
            )}
          </div>

          {/* AI Playback Status */}
          <div className="flex items-center gap-3">
            {status === 'live' && (
              <div className="flex items-center gap-2 font-mono text-[11px]">
                {isSpeaking ? (
                  <span className="inline-flex items-center gap-1.5 text-cyan-300 light:text-cyan-700 font-bold">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <span>AI Broadcaster Speaking...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300 light:text-emerald-700 font-bold">
                    <AudioLines className="w-4 h-4" />
                    <span>AI Pundit Ready · Select a Topic Below</span>
                  </span>
                )}
              </div>
            )}
            {status === 'idle' && (
              <span className="font-mono text-[11px] text-slate-400 light:text-slate-600">
                Let the AI broadcaster announce scores, tactics, and analysis out loud (no microphone needed).
              </span>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-400/40 font-mono text-xs text-rose-200 light:text-rose-800">
            {errorMsg}
          </div>
        )}

        {/* Quick Tactical Prompt Chips */}
        {status === 'live' && (
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendText(chip)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] light:bg-slate-100 hover:bg-cyan-500/15 border border-white/10 light:border-slate-300 font-mono text-[10px] text-slate-300 light:text-slate-700 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* AI Broadcast Transcript Feed */}
        {transcript.length > 0 && (
          <div className="max-h-44 overflow-y-auto space-y-2 p-3 rounded-xl bg-slate-950/70 light:bg-slate-50 border border-white/10 light:border-slate-200 text-xs">
            {transcript.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col ${
                  item.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mb-0.5">
                  {item.role === 'user'
                    ? 'Topic Request'
                    : `AI Broadcaster (${resolveVoiceForBroadcastStage(
                        voiceName,
                        matchContext.phase,
                        `${matchContext.homeTeam}:${matchContext.awayTeam}`
                      )})`}
                </span>
                <div
                  className={`px-3 py-1.5 rounded-xl max-w-[85%] leading-relaxed whitespace-pre-line ${
                    item.role === 'user'
                      ? 'bg-cyan-500/20 border border-cyan-400/35 text-cyan-100 light:text-cyan-950'
                      : 'bg-white/[0.06] light:bg-white border border-white/10 light:border-slate-200 text-slate-100 light:text-slate-900'
                  }`}
                >
                  {item.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}

        {/* Text Prompt to Hear AI Speak */}
        {status === 'live' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendText();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask a question or enter a topic for the AI broadcaster to voice..."
              className="flex-1 bg-slate-950 light:bg-white border border-white/15 light:border-slate-300 rounded-xl px-3 py-2 text-xs text-white light:text-slate-900 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono text-xs font-bold uppercase cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>AI Speak</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
