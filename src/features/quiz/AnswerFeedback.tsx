import type { QuizOption } from '@/lib/quizTypes';
import type { WrongReasonKey } from '@/lib/runtimeDtos';

const WRONG_REASONS: Array<{ key: WrongReasonKey; label: string }> = [
  { key: 'lupa_arti', label: 'Lupa artinya' },
  { key: 'tidak_ngerti', label: 'Tidak mengerti soal/bacaan' },
  { key: 'buru_buru', label: 'Terburu-buru / salah klik' },
  { key: 'terkecoh', label: 'Terkecoh pilihan lain' },
  { key: 'salah_baca', label: 'Salah baca soal' },
  { key: 'lainnya', label: 'Lainnya' },
];

interface AnswerFeedbackProps {
  selectedOption: QuizOption;
  onNext: () => void;
  isLast: boolean;
  wrongReason: WrongReasonKey | '';
  wrongReasonOther: string;
  onWrongReasonChange: (value: WrongReasonKey | '') => void;
  onWrongReasonOtherChange: (value: string) => void;
}

export function AnswerFeedback({
  selectedOption,
  onNext,
  isLast,
  wrongReason,
  wrongReasonOther,
  onWrongReasonChange,
  onWrongReasonOtherChange,
}: AnswerFeedbackProps) {
  const isCorrect = selectedOption.isCorrect;
  const reasonReady = isCorrect || (wrongReason !== '' && (wrongReason !== 'lainnya' || wrongReasonOther.trim() !== ''));

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`quiz-feedback ${isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong'}`}
    >
      <p className="quiz-feedback-title">{isCorrect ? '✓ Benar!' : '✗ Salah'}</p>

      {selectedOption.explanation && (
        <p className="quiz-feedback-explanation" lang="ja">{selectedOption.explanation}</p>
      )}

      {!isCorrect && (
        <div className="wrong-reason-panel">
          <p className="wrong-reason-title">Kenapa jawabanmu salah?</p>
          <div className="wrong-reason-options">
            {WRONG_REASONS.map((reason) => (
              <button
                key={reason.key}
                type="button"
                className={`wrong-reason-btn ${wrongReason === reason.key ? 'active' : ''}`}
                onClick={() => onWrongReasonChange(reason.key)}
              >
                {reason.label}
              </button>
            ))}
          </div>
          {wrongReason === 'lainnya' && (
            <textarea
              className="wrong-reason-other"
              rows={2}
              placeholder="Tuliskan alasan singkat..."
              value={wrongReasonOther}
              onChange={(event) => onWrongReasonOtherChange(event.target.value)}
            />
          )}
        </div>
      )}

      <button
        id="quiz-next-btn"
        type="button"
        onClick={onNext}
        disabled={!reasonReady}
        className="btn-primary quiz-next-btn"
      >
        {isLast ? 'Lihat Hasil →' : 'Lanjut →'}
      </button>
    </div>
  );
}
