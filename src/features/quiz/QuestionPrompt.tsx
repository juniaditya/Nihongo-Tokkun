interface QuestionPromptProps {
  questionNumber: number;
  total: number;
  prompt: string;
  section: string;
}

/** Formats a raw section key into a readable label */
function formatSection(section: string): string {
  const map: Record<string, string> = {
    arti: 'Arti',
    cara_baca: 'Cara Baca',
    penggunaan: 'Penggunaan dalam Kalimat',
    yohou: '用法',
    ruigigo: '類義語・使い分け',
    arti_fungsi: 'Arti & Fungsi',
    bentuk_koneksi: 'Bentuk Koneksi',
    perbedaan_grammar: 'Perbedaan Grammar',
    penggunaan_kalimat: 'Penggunaan Kalimat',
    tanbun: 'Tanbun (短文)',
    chuubun: 'Chuubun (中文)',
    tougou: 'Tougou (統合)',
    chobun: 'Chobun (長文)',
    jouhou: 'Jouhou (情報)',
    latihan: 'Latihan',
  };
  return map[section] ?? section;
}

export function QuestionPrompt({ questionNumber, total, prompt, section }: QuestionPromptProps) {
  return (
    <div className="quiz-question-prompt">
      <div className="quiz-question-meta">
        <span className="quiz-question-counter">{questionNumber} / {total}</span>
        <span className="quiz-section-badge">{formatSection(section)}</span>
      </div>
      <p id="question-prompt" className="quiz-question-text" lang="ja">{prompt}</p>
    </div>
  );
}
