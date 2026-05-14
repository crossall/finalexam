const MODES = [
  {
    id: 'all',
    title: '전체 학습',
    description: '문제집 전체를 순서대로 풉니다.'
  },
  {
    id: 'wrongOnly',
    title: '오답 복습',
    description: '틀린 문제만 다시 풀고 정리합니다.'
  }
];

export default function ModeSelector({ mode, onChange, wrongCount }) {
  return (
    <section className="glass-panel p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Study Mode
          </p>
          <h2 className="mt-2 text-2xl font-black text-ink">학습 모드 선택</h2>
          <p className="mt-1 text-sm text-slate-500">
            오답 복습 모드에서는 정답을 맞히면 복습 목록에서 제거됩니다.
          </p>
        </div>
        <span className="rounded-full bg-coral/10 px-4 py-2 text-sm font-semibold text-coral">
          복습 대기 {wrongCount}문제
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {MODES.map((item) => {
          const active = item.id === mode;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`rounded-3xl border p-5 text-left transition duration-200 ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                  : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{item.title}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                    active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {active ? '선택됨' : '대기'}
                </span>
              </div>
              <p className={`mt-2 text-sm ${active ? 'text-white/75' : 'text-slate-500'}`}>
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
