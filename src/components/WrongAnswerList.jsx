export default function WrongAnswerList({ wrongQuestions, records, activeQuestionId, onSelect }) {
  return (
    <section className="glass-panel p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Review Queue
          </p>
          <h2 className="mt-2 text-2xl font-black text-ink">오답 문제 목록</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
          {wrongQuestions.length}문제
        </span>
      </div>

      {wrongQuestions.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-white/60 p-8 text-center">
          <p className="text-lg font-bold text-slate-700">현재 복습할 오답이 없습니다.</p>
          <p className="mt-2 text-sm text-slate-500">
            문제를 틀리면 이 목록에 자동으로 추가됩니다.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {wrongQuestions.map((question) => {
            const record = records[question.id];
            const active = activeQuestionId === question.id;

            return (
              <button
                key={question.id}
                type="button"
                onClick={() => onSelect(question.id)}
                className={`rounded-3xl border p-4 text-left transition duration-200 ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                    : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-white/70' : 'text-slate-400'}`}>
                      p.{question.page} · {question.category}
                    </p>
                    <h3 className="mt-1 text-lg font-bold">{question.sentence}</h3>
                  </div>
                  <div className={`text-sm ${active ? 'text-white/80' : 'text-slate-500'}`}>
                    <p>최근 오답: {record.lastWrongAnswer || '기록 없음'}</p>
                    <p className="mt-1">오답 {record.wrongCount}회 · 정답 {record.correctCount}회</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

