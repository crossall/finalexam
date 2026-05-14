const formatPercent = (value) => `${value}%`;

export default function ProgressPanel({
  totalCount,
  solvedCount,
  wrongCount,
  accuracy,
  attempts,
  currentIndex,
  visibleCount,
  mode,
  onReset
}) {
  const progressRate = visibleCount === 0 ? 0 : Math.round(((currentIndex + 1) / visibleCount) * 100);
  const stats = [
    { label: '전체 문제 수', value: totalCount, tone: 'text-slate-700' },
    { label: '맞힌 문제 수', value: solvedCount, tone: 'text-pine' },
    { label: '오답 수', value: wrongCount, tone: 'text-coral' },
    { label: '정답률', value: formatPercent(accuracy), tone: 'text-ink' }
  ];

  return (
    <section className="glass-panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-black text-ink">단권화 암기 웹앱</h1>
          <div className="mt-2 max-w-2xl text-sm text-slate-500">
            <code className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              localStorage
            </code>{' '}
            에 학습 기록을 저장하고, 틀린 문제만 따로 모아 다시 학습할 수 있습니다.
          </div>
        </div>
        <button type="button" onClick={onReset} className="soft-button-secondary">
          기록 초기화
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="stat-card">
            <p className="text-sm font-semibold text-slate-400">{stat.label}</p>
            <strong className={`mt-3 block text-3xl font-black ${stat.tone}`}>{stat.value}</strong>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white/70 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              {mode === 'wrongOnly' ? '오답 복습 진행도' : '전체 학습 진행도'}
            </p>
            <p className="mt-1 text-lg font-bold text-ink">
              {visibleCount === 0 ? '대상 문제 없음' : `현재 ${currentIndex + 1} / ${visibleCount}`}
            </p>
          </div>
          <p className="text-sm text-slate-500">총 시도 {attempts}회 기준 정답률</p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ink via-coral to-pine transition-all duration-300"
            style={{ width: `${progressRate}%` }}
          />
        </div>
      </div>
    </section>
  );
}
