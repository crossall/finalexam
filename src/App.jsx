import { useEffect, useRef, useState } from 'react';
import ModeSelector from './components/ModeSelector';
import ProgressPanel from './components/ProgressPanel';
import QuizCard from './components/QuizCard';
import WrongAnswerList from './components/WrongAnswerList';
import questions from './data/questions.json';
import { getLiveAnswerState, normalizeAnswer } from './utils/answers';

const STORAGE_KEY = 'finalexam-memory-quiz-progress-v1';

const createEmptyRecord = () => ({
  attempts: 0,
  correctCount: 0,
  wrongCount: 0,
  lastAnswer: '',
  lastWrongAnswer: '',
  lastStatus: 'unseen',
  solved: false,
  reviewNeeded: false,
  updatedAt: null
});

const buildInitialRecords = () =>
  questions.reduce((accumulator, question) => {
    accumulator[question.id] = createEmptyRecord();
    return accumulator;
  }, {});

const loadStoredRecords = () => {
  if (typeof window === 'undefined') {
    return buildInitialRecords();
  }

  const defaultRecords = buildInitialRecords();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaultRecords;
    }

    const parsed = JSON.parse(raw);

    return questions.reduce((accumulator, question) => {
      accumulator[question.id] = {
        ...createEmptyRecord(),
        ...(parsed[question.id] ?? {})
      };
      return accumulator;
    }, {});
  } catch {
    return defaultRecords;
  }
};

const getSiblingQuestionId = (pool, currentId) => {
  const currentIndex = pool.findIndex((question) => question.id === currentId);

  if (currentIndex === -1) {
    return pool[0]?.id ?? null;
  }

  return pool[currentIndex + 1]?.id ?? pool[currentIndex - 1]?.id ?? null;
};

export default function App() {
  const [records, setRecords] = useState(loadStoredRecords);
  const [mode, setMode] = useState('all');
  const [activeQuestionId, setActiveQuestionId] = useState(questions[0]?.id ?? null);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const successLoggedRef = useRef(false);
  const editedAnswerRef = useRef(false);
  const lastEditedValueRef = useRef('');
  const queuedNextQuestionIdRef = useRef(null);
  const suppressNextEnterRef = useRef(false);
  const enterGuardTimerRef = useRef(null);

  const wrongQuestions = questions.filter((question) => records[question.id]?.reviewNeeded);
  const visibleQuestions = mode === 'wrongOnly' ? wrongQuestions : questions;
  const currentQuestion = questions.find((question) => question.id === activeQuestionId) ?? visibleQuestions[0] ?? null;
  const currentIndex = currentQuestion
    ? visibleQuestions.findIndex((question) => question.id === currentQuestion.id)
    : -1;
  const currentRecord = currentQuestion ? records[currentQuestion.id] : createEmptyRecord();
  const liveState = currentQuestion
    ? isAnswerLocked
      ? 'correct'
      : isComposing && draftAnswer
        ? 'composing'
        : getLiveAnswerState(draftAnswer, currentQuestion)
    : 'idle';
  const progressIndex = currentIndex >= 0 ? currentIndex : 0;
  const hasNext =
    isAnswerLocked && mode === 'wrongOnly'
      ? true
      : currentIndex >= 0 && currentIndex < visibleQuestions.length - 1;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  }, [records]);

  useEffect(
    () => () => {
      if (enterGuardTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(enterGuardTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (isAnswerLocked) {
      return;
    }

    if (!visibleQuestions.length) {
      if (activeQuestionId !== null) {
        setActiveQuestionId(null);
      }
      return;
    }

    if (!visibleQuestions.some((question) => question.id === activeQuestionId)) {
      setActiveQuestionId(visibleQuestions[0].id);
    }
  }, [activeQuestionId, isAnswerLocked, visibleQuestions]);

  useEffect(() => {
    if (!currentQuestion) {
      setDraftAnswer('');
      successLoggedRef.current = false;
      editedAnswerRef.current = false;
      lastEditedValueRef.current = '';
      queuedNextQuestionIdRef.current = null;
      suppressNextEnterRef.current = false;
      if (enterGuardTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(enterGuardTimerRef.current);
        enterGuardTimerRef.current = null;
      }
      setIsComposing(false);
      setIsAnswerLocked(false);
      return;
    }

    const reviewSeed = records[currentQuestion.id]?.reviewNeeded
      ? records[currentQuestion.id]?.lastWrongAnswer
      : '';

    setDraftAnswer(reviewSeed ?? '');
    successLoggedRef.current = false;
    editedAnswerRef.current = false;
    lastEditedValueRef.current = reviewSeed ?? '';
    queuedNextQuestionIdRef.current = null;
    suppressNextEnterRef.current = false;
    if (enterGuardTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(enterGuardTimerRef.current);
      enterGuardTimerRef.current = null;
    }
    setIsComposing(false);
    setIsAnswerLocked(false);
  }, [currentQuestion?.id, mode]);

  const commitAttempt = (questionId, status, answerText, options = {}) => {
    setRecords((previous) => {
      const nextRecord = {
        ...(previous[questionId] ?? createEmptyRecord())
      };

      nextRecord.attempts += 1;
      nextRecord.lastAnswer = answerText;
      nextRecord.lastStatus = status;
      nextRecord.updatedAt = new Date().toISOString();

      if (status === 'correct') {
        nextRecord.correctCount += 1;
        nextRecord.solved = true;

        if (options.clearReview) {
          nextRecord.reviewNeeded = false;
        }
      }

      if (status === 'wrong') {
        nextRecord.wrongCount += 1;
        nextRecord.lastWrongAnswer = answerText;
        nextRecord.reviewNeeded = true;
      }

      return {
        ...previous,
        [questionId]: nextRecord
      };
    });
  };

  const finalizeCurrentAttempt = () => {
    if (!currentQuestion || isAnswerLocked || successLoggedRef.current || !editedAnswerRef.current) {
      return;
    }

    const attemptValue = draftAnswer || lastEditedValueRef.current;

    if (!normalizeAnswer(attemptValue)) {
      return;
    }

    commitAttempt(currentQuestion.id, 'wrong', attemptValue);
  };

  const handleModeChange = (nextMode) => {
    finalizeCurrentAttempt();
    setMode(nextMode);
  };

  const guardImmediateEnterAfterLock = () => {
    suppressNextEnterRef.current = true;

    if (typeof window === 'undefined') {
      suppressNextEnterRef.current = false;
      return;
    }

    if (enterGuardTimerRef.current !== null) {
      window.clearTimeout(enterGuardTimerRef.current);
    }

    enterGuardTimerRef.current = window.setTimeout(() => {
      suppressNextEnterRef.current = false;
      enterGuardTimerRef.current = null;
    }, 0);
  };

  const handleAnswerChange = (nextValue, composing = false) => {
    if (!currentQuestion || isAnswerLocked) {
      return;
    }

    setDraftAnswer(nextValue);
    editedAnswerRef.current = true;
    lastEditedValueRef.current = nextValue;

    if (composing) {
      return;
    }

    if (successLoggedRef.current) {
      return;
    }

    const nextState = getLiveAnswerState(nextValue, currentQuestion);

    if (nextState === 'correct' && !successLoggedRef.current) {
      queuedNextQuestionIdRef.current =
        mode === 'wrongOnly' ? getSiblingQuestionId(visibleQuestions, currentQuestion.id) : null;
      successLoggedRef.current = true;
      guardImmediateEnterAfterLock();
      setIsAnswerLocked(true);
      commitAttempt(currentQuestion.id, 'correct', nextValue, {
        clearReview: true
      });
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (finalValue) => {
    setIsComposing(false);
    handleAnswerChange(finalValue);
  };

  const moveToQuestion = (nextQuestionId) => {
    if (!isAnswerLocked) {
      finalizeCurrentAttempt();
    }

    setActiveQuestionId(nextQuestionId);
  };

  const handleMove = (offset) => {
    if (!currentQuestion || currentIndex < 0) {
      return;
    }

    const target = visibleQuestions[currentIndex + offset];

    if (target) {
      moveToQuestion(target.id);
    }
  };

  const handleNext = () => {
    if (!currentQuestion) {
      return;
    }

    if (isAnswerLocked) {
      const nextQuestionId =
        mode === 'wrongOnly' ? queuedNextQuestionIdRef.current : visibleQuestions[currentIndex + 1]?.id ?? null;

      moveToQuestion(nextQuestionId ?? null);
      return;
    }

    handleMove(1);
  };

  const handleReset = () => {
    if (!window.confirm('학습 기록을 모두 초기화할까요?')) {
      return;
    }

    const freshRecords = buildInitialRecords();
    setRecords(freshRecords);
    setMode('all');
    setActiveQuestionId(questions[0]?.id ?? null);
    setDraftAnswer('');
    successLoggedRef.current = false;
    editedAnswerRef.current = false;
    lastEditedValueRef.current = '';
    queuedNextQuestionIdRef.current = null;
    suppressNextEnterRef.current = false;
    if (enterGuardTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(enterGuardTimerRef.current);
      enterGuardTimerRef.current = null;
    }
    setIsComposing(false);
    setIsAnswerLocked(false);
  };

  const solvedCount = questions.filter((question) => records[question.id]?.solved).length;
  const wrongCount = wrongQuestions.length;
  const attempts = Object.values(records).reduce((sum, record) => sum + record.attempts, 0);
  const correctAttempts = Object.values(records).reduce((sum, record) => sum + record.correctCount, 0);
  const accuracy = attempts === 0 ? 0 : Math.round((correctAttempts / attempts) * 100);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <ProgressPanel
        totalCount={questions.length}
        solvedCount={solvedCount}
        wrongCount={wrongCount}
        accuracy={accuracy}
        attempts={attempts}
        currentIndex={progressIndex}
        visibleCount={visibleQuestions.length}
        mode={mode}
        onReset={handleReset}
      />

      <ModeSelector mode={mode} onChange={handleModeChange} wrongCount={wrongCount} />

      {currentQuestion ? (
        <QuizCard
          question={currentQuestion}
          value={draftAnswer}
          liveState={liveState}
          record={currentRecord}
          isAnswerLocked={isAnswerLocked}
          hasPrev={currentIndex > 0}
          hasNext={hasNext}
          mode={mode}
          onChange={handleAnswerChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onPrev={() => handleMove(-1)}
          onNext={handleNext}
          onEnter={() => {
            if (isComposing) {
              return;
            }

            if (suppressNextEnterRef.current) {
              return;
            }

            if (isAnswerLocked) {
              handleNext();
            }
          }}
        />
      ) : (
        <section className="glass-panel p-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">All Clear</p>
          <h2 className="mt-3 text-3xl font-black text-ink">오답 복습 목록이 비었습니다.</h2>
          <p className="mt-3 text-slate-500">
            전체 학습 모드로 돌아가 새로운 문제를 풀거나, 다시 틀린 문제가 생기면 여기에서 복습할 수 있습니다.
          </p>
          <button type="button" onClick={() => setMode('all')} className="soft-button-primary mt-6">
            전체 학습으로 이동
          </button>
        </section>
      )}

      <WrongAnswerList
        wrongQuestions={wrongQuestions}
        records={records}
        activeQuestionId={currentQuestion?.id ?? null}
        onSelect={(questionId) => {
          if (mode === 'wrongOnly' && !wrongQuestions.some((question) => question.id === questionId)) {
            return;
          }

          moveToQuestion(questionId);
        }}
      />
    </main>
  );
}
