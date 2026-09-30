'use client';

import { useCallback, useEffect, useState } from 'react';

interface TtsButtonProps {
  text: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

function normalizeSpeechText(value: string) {
  return value
    .replace(/\*+/g, '')
    .replace(/[`_#~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function japaneseVoice(voices: SpeechSynthesisVoice[]) {
  return voices.find((voice) => voice.lang.toLowerCase() === 'ja-jp')
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('ja'))
    ?? null;
}

export function TtsButton({ text, label = 'Dengarkan', disabled = false, className = '' }: TtsButtonProps) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
  }, []);

  const speak = useCallback(() => {
    const clean = normalizeSpeechText(text);
    if (!supported || disabled || !clean) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    const voice = japaneseVoice(synth.getVoices());
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
  }, [disabled, supported, text]);

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`tts-action-button ${speaking ? 'is-speaking' : ''} ${className}`.trim()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        speak();
      }}
      disabled={disabled || !normalizeSpeechText(text)}
      aria-label={disabled ? 'Audio tersedia setelah menjawab' : label}
      title={disabled ? 'TTS tersedia setelah kamu menjawab soal ini.' : label}
    >
      <span aria-hidden="true">🔊</span>
      <span>{disabled ? 'Audio setelah menjawab' : speaking ? 'Memutar…' : label}</span>
    </button>
  );
}
