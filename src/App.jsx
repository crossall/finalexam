import { useEffect, useState } from 'react';
import ModeSelector from './components/ModeSelector';
import ProgressPanel from './components/ProgressPanel';
import QuizCard from './components/QuizCard';
import WrongAnswerList from './components/WrongAnswerList';
import questions from './data/questions.json';
import { getLiveAnswerState, isAcceptedAnswer } from './utils/answers';

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
  const [submissionResult, setSubmissionResult] = useState(null);

  const wrongQuestions = questions.filter((question) => records[question.id]?.reviewNeeded);
  const visibleQuestions = mode === 'wrongOnly' ? wrongQuestions : questions;
  const currentQuestion = questions.find((question) => question.id === activeQuestionId) ?? visibleQuestions[0] ?? null;
  const currentIndex = currentQuestion
    ? visibleQuestions.findIndex((question) => question.id === currentQuestion.id)
    : -1;
  const currentRecord = currentQuestion ? records[currentQuestion.id] : createEmptyRecord();
  const isAnswerLocked = Boolean(submissionResult);
  const progressIndex = currentIndex >= 0 ? currentIndex : 0;

  const liveState = (() => {
    if (!currentQuestion) {
      return 'idle';
    }

    if (submissionResult) {
      return submissionResult.status;
    }

    if (isComposing && draftAnswer) {
      return 'composing';
    }

    const nextState = getLiveAnswerState(draftAnswer, currentQuestion);

    if (nextState === 'correct') {
      return 'matched';
    }

    if (nextState === 'incorrect') {
      return 'mismatch';
    }

    return nextState;
  })();

  const primaryActionLabel = (() => {
    if (!submissionResult) {
      return '정답 확인';
    }

    if (mode === 'wrongOnly' && !submissionResult.nextQuestionId) {
      return '복습 완료';
    }

    return submissionResult.nextQuestionId ? '다음 문제' : '완료';
  })();

  const hasPrimaryAction = Boolean(currentQuestion);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  }, [records]);

  useEffect(() => {
    if (submissionResult) {
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
  }, [activeQuestionId, submissionResult, visibleQuestions]);

  useEffect(() => {
    if (!currentQuestion) {
      setDraftAnswer('');
      setIsComposing(false);
      setSubmissionResult(null);
      return;
    }

    const reviewSeed = records[currentQuestion.id]?.reviewNeeded
      ? records[currentQuestion.id]?.lastWrongAnswer
      : '';

    setDraftAnswer(reviewSeed ?? '');
    setIsComposing(false);
    setSubmissionResult(null);
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

  const updateReviewNeeded = (questionId, reviewNeeded) => {
    setRecords((previous) => ({
      ...previous,
      [questionId]: {
        ...(previous[questionId] ?? createEmptyRecord()),
        reviewNeeded,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const settleCurrentQuestion = () => {
    if (!currentQuestion || !submissionResult) {
      return;
    }

    if (submissionResult.status === 'correct' && submissionResult.shouldClearReview) {
      updateReviewNeeded(currentQuestion.id, false);
    }
  };

  const moveToQuestion = (questionId) => {
    settleCurrentQuestion();
    setActiveQuestionId(questionId);
  };

  const submitCurrentAnswer = () => {
    if (!currentQuestion || submissionResult) {
      return;
    }

    const submittedAnswer = draftAnswer;
    const correct = isAcceptedAnswer(submittedAnswer, currentQuestion);
    const nextQuestionId =
      mode === 'wrongOnly'
        ? getSiblingQuestionId(visibleQuestions, currentQuestion.id)
        : visibleQuestions[currentIndex + 1]?.id ?? null;

    if (correct) {
      commitAttempt(currentQuestion.id, 'correct', submittedAnswer, {
        clearReview: false
      });
    } else {
      commitAttempt(currentQuestion.id, 'wrong', submittedAnswer);
    }

    setSubmissionResult({
      status: correct ? 'correct' : 'incorrect',
      submittedAnswer,
      correctAnswer: currentQuestion.answer,
      nextQuestionId,
      shouldClearReview: correct && currentRecord.reviewNeeded
    });
  };

  const handlePrimaryAction = () => {
    if (!currentQuestion) {
      return;
    }

    if (submissionResult) {
      moveToQuestion(submissionResult.nextQuestionId ?? null);
      return;
    }

    submitCurrentAnswer();
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

  const handleReset = () => {
    if (!window.confirm('학습 기록을 모두 초기화할까요?')) {
      return;
    }

    const freshRecords = buildInitialRecords();
    setRecords(freshRecords);
    setMode('all');
    setActiveQuestionId(questions[0]?.id ?? null);
    setDraftAnswer('');
    setIsComposing(false);
    setSubmissionResult(null);
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

      <ModeSelector
        mode={mode}
        onChange={(nextMode) => {
          settleCurrentQuestion();
          setMode(nextMode);
        }}
        wrongCount={wrongCount}
      />

      {currentQuestion ? (
        <QuizCard
          question={currentQuestion}
          value={draftAnswer}
          liveState={liveState}
          record={currentRecord}
          submissionResult={submissionResult}
          isAnswerLocked={isAnswerLocked}
          hasPrev={currentIndex > 0}
          hasNext={hasPrimaryAction}
          primaryActionLabel={primaryActionLabel}
          mode={mode}
          onChange={(nextValue, composing = false) => {
            if (submissionResult) {
              return;
            }

            setDraftAnswer(nextValue);

            if (composing) {
              return;
            }
          }}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(finalValue) => {
            setIsComposing(false);
            if (!submissionResult) {
              setDraftAnswer(finalValue);
            }
          }}
          onPrev={() => handleMove(-1)}
          onNext={handlePrimaryAction}
          onEnter={() => {
            if (isComposing) {
              return;
            }

            handlePrimaryAction();
          }}
        />
      ) : (
        <section className="glass-panel p-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">All Clear</p>
          <h2 className="mt-3 text-3xl font-black text-ink">
            {mode === 'wrongOnly' ? '오답 복습 목록이 비었습니다.' : '전체 문제 확인이 끝났습니다.'}
          </h2>
          <p className="mt-3 text-slate-500">
            {mode === 'wrongOnly'
              ? '전체 학습 모드로 돌아가 새로운 문제를 풀거나, 다시 틀린 문제가 생기면 여기에서 복습할 수 있습니다.'
              : '다시 처음부터 학습하거나 오답 복습 모드로 전환해 틀린 문제만 다시 확인할 수 있습니다.'}
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
