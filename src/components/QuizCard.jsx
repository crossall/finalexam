const difficultyText = {
  1: '쉬움',
  2: '보통',
  3: '집중',
  4: '심화',
  5: '최상'
};

const stateStyles = {
  idle: {
    badge: '준비',
    caption: '답을 입력한 뒤 Enter 또는 정답 확인 버튼으로 제출하세요.',
    shell: 'border-slate-200 bg-white/80 text-slate-500'
  },
  composing: {
    badge: '조합 중',
    caption: '한글 입력 조합 중입니다. 글자가 완성되면 판정합니다.',
    shell: 'border-slate-200 bg-slate-50 text-slate-600'
  },
  partial: {
    badge: '부분 일치',
    caption: '정답의 앞부분과 일치합니다.',
    shell: 'border-sky-200 bg-sky-50 text-sky-700'
  },
  mismatch: {
    badge: '불일치',
    caption: '현재 입력은 정답 패턴과 다릅니다.',
    shell: 'border-rose-200 bg-rose-50 text-rose-700'
  },
  matched: {
    badge: '정답 일치',
    caption: '정답과 일치합니다. Enter 또는 정답 확인 버튼으로 확정하세요.',
    shell: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  correct: {
    badge: '정답',
    caption: '정답입니다. 다시 Enter 또는 다음 문제 버튼을 누르면 이동합니다.',
    shell: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  incorrect: {
    badge: '오답',
    caption: '오답입니다. 정답을 확인한 뒤 다시 Enter 또는 다음 문제 버튼을 누르세요.',
    shell: 'border-rose-200 bg-rose-50 text-rose-700'
  }
};

const BLANK_PATTERN = /(_{2,}|\*{2,})/;

const renderSolvedSentence = (sentence, answer, tone) => {
  const answerClass =
    tone === 'incorrect'
      ? 'rounded-xl bg-rose-100 px-2 py-1 text-rose-700'
      : 'rounded-xl bg-emerald-100 px-2 py-1 text-emerald-700';
  const match = sentence.match(BLANK_PATTERN);

  if (!match) {
    return (
      <>
        {sentence}{' '}
        <span className={answerClass}>{answer}</span>
      </>
    );
  }

  const token = match[0];
  const startIndex = sentence.indexOf(token);
  const before = sentence.slice(0, startIndex);
  const after = sentence.slice(startIndex + token.length);

  return (
    <>
      {before}
      <span className={answerClass}>{answer}</span>
      {after}
    </>
  );
};

export default function QuizCard({
  question,
  value,
  liveState,
  record,
  submissionResult,
  isAnswerLocked,
  hasPrev,
  hasNext,
  primaryActionLabel,
  mode,
  onChange,
  onCompositionStart,
  onCompositionEnd,
  onPrev,
  onNext,
  onEnter
}) {
  const state = stateStyles[liveState];
  const lockedInputClass =
    submissionResult?.status === 'incorrect'
      ? 'cursor-default bg-rose-50 text-rose-700'
      : 'cursor-default bg-emerald-50 text-emerald-700';

  return (
    <section className="glass-panel p-6">
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <span className="meta-pill">Page {question.page}</span>
            <span className="meta-pill">{question.category}</span>
            <span className="meta-pill">{question.source === 'image' ? 'Image' : 'Text'}</span>
            {question.image ? <span className="meta-pill">Reference Image</span> : null}
            <span className="meta-pill">
              난이도 {question.difficulty} / 5 · {difficultyText[question.difficulty] ?? '기본'}
            </span>
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Fill In The Blank
          </p>
          <h2 className="mt-3 text-2xl font-black leading-snug text-ink md:text-[2rem]">
            {isAnswerLocked
              ? renderSolvedSentence(question.sentence, question.answer, submissionResult?.status)
              : question.sentence}
          </h2>

          <div className="mt-6 rounded-3xl border border-slate-200/70 bg-sand/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Hint</p>
            <p className="mt-2 text-base font-medium text-slate-700">{question.hint}</p>
          </div>

          <div className="mt-6">
            <input
              autoFocus
              type="text"
              value={value}
              readOnly={isAnswerLocked}
              onChange={(event) => onChange(event.target.value, event.nativeEvent.isComposing)}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={(event) => onCompositionEnd(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  onEnter();
                }
              }}
              placeholder={isAnswerLocked ? '정답 확인 완료' : '정답을 입력하세요'}
              className={`answer-input ${isAnswerLocked ? lockedInputClass : ''}`}
            />
          </div>

          <div className={`mt-4 rounded-3xl border px-5 py-4 ${state.shell}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.24em]">
                {state.badge}
              </span>
              <p className="text-sm font-medium">{state.caption}</p>
            </div>

            {submissionResult?.status === 'incorrect' ? (
              <p className="mt-3 text-sm font-medium text-rose-700">
                입력한 답: {submissionResult.submittedAnswer || '빈칸'} / 정답: {question.answer}
              </p>
            ) : null}

            {record.reviewNeeded && (
              <p className="mt-3 text-sm">
                {submissionResult?.status === 'correct'
                  ? '이 문제는 다음 이동 시 오답 복습 목록에서 제거됩니다.'
                  : mode === 'wrongOnly'
                  ? '이 문제를 맞히면 오답 복습 목록에서 제거됩니다.'
                  : '이 문제는 오답 복습 목록에 포함되어 있습니다.'}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              className={`soft-button-secondary ${!hasPrev ? 'cursor-not-allowed opacity-45' : ''}`}
            >
              이전 문제
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className={`soft-button-primary ${!hasNext ? 'cursor-not-allowed opacity-45' : ''}`}
            >
              {primaryActionLabel}
            </button>
          </div>
        </div>

        {question.image ? (
          <aside className="w-full xl:max-w-md">
            <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/85 shadow-lg">
              <img
                src={question.image}
                alt={`${question.category} 참고 이미지`}
                className="h-full max-h-[360px] w-full object-cover"
              />
            </div>
            <p className="mt-3 text-sm text-slate-500">
              이미지 자료는 `public/images` 경로에서 불러옵니다.
            </p>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
