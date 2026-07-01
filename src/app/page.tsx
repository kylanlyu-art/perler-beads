const entryCards = [
  {
    href: '/create/image',
    title: '图片生成图纸',
    description: '上传照片、插画、像素图或 CSV，继续使用现有的取色、色板和网格编辑能力。',
    action: '从图片开始',
    preview: ['#1F9D8A', '#F2CF5B', '#E9F0EE', '#EF7B67', '#A8D8D0', '#FFFFFF'],
  },
  {
    href: '/create/text',
    title: '文字生成图纸',
    description: '输入名字、昵称、短句或口号，自动计算尺寸、背景豆和总豆数。',
    action: '从文字开始',
    preview: ['#FFFFFF', '#1F9D8A', '#1F9D8A', '#FFFFFF', '#DCEBE7', '#1F9D8A'],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f8f7] text-[#17201f]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-[#dfe8e5] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1f7669]">Juice 拼豆</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">选择图纸生成方式</h1>
          </div>
          <a
            href="/workbench"
            className="rounded-md border border-[#cfdedb] bg-white px-3 py-2 text-sm font-semibold text-[#2c3a38] transition hover:bg-[#eef5f3]"
          >
            打开工作台
          </a>
        </header>

        <section className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-xl">
            <h2 className="text-4xl font-semibold leading-tight sm:text-5xl">把图片或文字变成可制作的拼豆图纸</h2>
            <p className="mt-5 text-base leading-7 text-[#5f6d6a]">
              图片和文字从不同入口生成，最后进入同一套工作台继续编辑、调色、统计 BOM 和导出。
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
              <div className="border-l-2 border-[#1f9d8a] pl-3">
                <div className="font-semibold">统一编辑</div>
                <div className="mt-1 text-[#6f7d7b]">同一张 grid</div>
              </div>
              <div className="border-l-2 border-[#f2cf5b] pl-3">
                <div className="font-semibold">准确统计</div>
                <div className="mt-1 text-[#6f7d7b]">真实背景豆</div>
              </div>
              <div className="border-l-2 border-[#ef7b67] pl-3">
                <div className="font-semibold">可导出</div>
                <div className="mt-1 text-[#6f7d7b]">PNG / CSV</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {entryCards.map((card) => (
              <a
                key={card.href}
                href={card.href}
                className="group flex min-h-[360px] flex-col justify-between rounded-lg border border-[#dbe6e3] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9d2cc] hover:shadow-md"
              >
                <div>
                  <div className="grid h-28 grid-cols-8 gap-1 rounded-md border border-[#e3ebe8] bg-[#fbfdfc] p-3">
                    {Array.from({ length: 48 }).map((_, index) => (
                      <span
                        key={index}
                        className="rounded-[2px]"
                        style={{ backgroundColor: card.preview[index % card.preview.length] }}
                      />
                    ))}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#657370]">{card.description}</p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-[#edf2f0] pt-4 text-sm font-semibold text-[#176b5f]">
                  <span>{card.action}</span>
                  <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
