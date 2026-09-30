import type { QuizOption } from '@/lib/quizTypes';

interface AnswerOptionProps {
  option: QuizOption;
  state: 'idle' | 'selected' | 'selected-correct' | 'selected-wrong' | 'revealed-correct';
  disabled: boolean;
  onSelect: (option: QuizOption) => void;
}

const stateIcon: Record<AnswerOptionProps['state'], string> = {
  idle: '',
  selected: '',
  'selected-correct': '✓',
  'selected-wrong': '✗',
  'revealed-correct': '✓',
};

export function AnswerOption({ option, state, disabled, onSelect }: AnswerOptionProps) {
  return (
    <button
      id={`option-${option.id}`}
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onSelect(option)}
      aria-pressed={state !== 'idle'}
      aria-label={option.text}
      className={`quiz-answer-option quiz-answer-${state}`}
    >
      {stateIcon[state] && <span className="quiz-answer-icon" aria-hidden="true">{stateIcon[state]}</span>}
      <span lang="ja" className="quiz-answer-text">{option.text}</span>
    </button>
  );
}
