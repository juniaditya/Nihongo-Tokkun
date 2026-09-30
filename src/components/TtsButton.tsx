'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface TtsButtonProps {
  text: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  autoPlay?: boolean;
  autoPlayKey?: string | number | null;
  showSettings?: boolean;
}

const TTS_MUTED_KEY = 'nihongo-tokkun-tts-muted';
const TTS_VOICE_KEY = 'nihongo-tokkun-tts-voice';

function normalizeSpeechText(value: string) {
  return value
    .replace(/\*+/g, '')
    .replace(/[`_#~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function japaneseVoices(voices: SpeechSynthesisVoice[]) {
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith('ja'));
}

function preferredJapaneseVoice(voices: SpeechSynthesisVoice[], selectedVoiceUri: string) {
  const japanese = japaneseVoices(voices);
  return japanese.find((voice) => voice.voiceURI === selectedVoiceUri)
    ?? japanese.find((voice) => voice.lang.toLowerCase() === 'ja-jp')
    ?? japanese[0]
    ?? null;
}

export function TtsButton({
  text,
  label = 'Dengarkan',
  disabled = false,
  className = '',
  autoPlay = false,
  autoPlayKey = null,
  showSettings = false,
}: TtsButtonProps) {
  const [supported, setSupported] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState('');
  const lastAutoPlayKeyRef = useRef<string>('');

  useEffect(() => {
    const available = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    setSupported(available);
    if (!available) {
      setPrefsReady(true);
      return;
    }

    setMuted(window.localStorage.getItem(TTS_MUTED_KEY) === 'true');
    setSelectedVoiceUri(window.localStorage.getItem(TTS_VOICE_KEY) || '');

    const synth = window.speechSynthesis;
    const loadVoices = () => setVoices(synth.getVoices());
    loadVoices();
    synth.addEventListener?.('voiceschanged', loadVoices);
    setPrefsReady(true);

    return () => {
      synth.removeEventListener?.('voiceschanged', loadVoices);
      synth.cancel();
    };
  }, []);

  const availableJapaneseVoices = useMemo(() => japaneseVoices(voices), [voices]);

  const speak = useCallback(() => {
    const clean = normalizeSpeechText(text);
    if (!supported || !prefsReady || disabled || muted || !clean) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    const voice = preferredJapaneseVoice(voices, selectedVoiceUri);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
  }, [disabled, muted, prefsReady, selectedVoiceUri, supported, text, voices]);

  useEffect(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported, text]);

  useEffect(() => {
    if (!autoPlay || autoPlayKey == null || disabled || muted || !prefsReady || !supported) return;
    const key = String(autoPlayKey);
    if (!key || lastAutoPlayKeyRef.current === key) return;
    lastAutoPlayKeyRef.current = key;
    const timer = window.setTimeout(() => speak(), 120);
    return () => window.clearTimeout(timer);
  }, [autoPlay, autoPlayKey, disabled, muted, prefsReady, speak, supported]);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      window.localStorage.setItem(TTS_MUTED_KEY, String(next));
      if (next) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      }
      return next;
    });
  }, []);

  const changeVoice = useCallback((voiceUri: string) => {
    setSelectedVoiceUri(voiceUri);
    window.localStorage.setItem(TTS_VOICE_KEY, voiceUri);
  }, []);

  if (!supported) return null;

  const listenButton = (
    <button
      type="button"
      className={`tts-action-button ${speaking ? 'is-speaking' : ''} ${className}`.trim()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        speak();
      }}
      disabled={disabled || muted || !normalizeSpeechText(text)}
      aria-label={muted ? 'TTS sedang dimute' : disabled ? 'Audio tersedia setelah menjawab' : label}
      title={muted ? 'Aktifkan suara untuk menggunakan TTS.' : disabled ? 'TTS tersedia setelah kamu menjawab soal ini.' : label}
    >
      <span aria-hidden="true">🔊</span>
      <span>{muted ? 'Dimute' : disabled ? 'Audio setelah menjawab' : speaking ? 'Memutar…' : label}</span>
    </button>
  );

  if (!showSettings) return listenButton;

  return (
    <div className="tts-control-cluster" onClick={(event) => event.stopPropagation()}>
      {listenButton}
      <button
        type="button"
        className={`tts-mute-button ${muted ? 'is-muted' : ''}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleMuted();
        }}
        aria-pressed={muted}
        title={muted ? 'Aktifkan suara TTS' : 'Mute suara TTS'}
      >
        <span aria-hidden="true">{muted ? '🔇' : '🔈'}</span>
        <span>{muted ? 'Aktifkan suara' : 'Mute'}</span>
      </button>

      <label className="tts-voice-control">
        <span className="tts-voice-label">Suara</span>
        <select
          className="tts-voice-select"
          value={selectedVoiceUri}
          onChange={(event) => changeVoice(event.target.value)}
          disabled={availableJapaneseVoices.length === 0}
          aria-label="Pilih suara TTS Jepang"
        >
          <option value="">Default Jepang</option>
          {availableJapaneseVoices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
