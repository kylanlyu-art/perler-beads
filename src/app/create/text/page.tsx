'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import fusionTextAtlasJson from '../../../features/text-grid-core/generated/fusion-12-zh-hans-mono.v2026.05.07.json';
import { generateTextChart } from '../../../features/text-chart/generateTextChart';
import { textChartStyles } from '../../../features/text-chart/textChartStyles';
import type { GlyphAtlas, TextDirection, TextScale } from '../../../features/text-grid-core';
import type { TextChartStyleId } from '../../../features/text-chart/types';
import { getMardToHexMapping } from '../../../utils/colorSystemUtils';
import { hexToRgb, type PaletteColor } from '../../../utils/pixelation';

const fusionTextAtlas = fusionTextAtlasJson as GlyphAtlas;
const mardToHexMapping = getMardToHexMapping();
const fullPalette: PaletteColor[] = Object.entries(mardToHexMapping)
  .map(([key, hex]) => {
    const rgb = hexToRgb(hex);
    return rgb ? { key, hex: hex.toUpperCase(), rgb } : null;
  })
  .filter((color): color is PaletteColor => color !== null);

const styleIds = Object.keys(textChartStyles) as TextChartStyleId[];
const colorChoices = [
  '#FFFFFF',
  '#1F9D8A',
  '#F7E8C8',
  '#7A4F2A',
  '#101826',
  '#F8D84A',
  '#9BBC0F',
  '#306230',
  '#130A1F',
  '#00E5FF',
];

function styleButtonClass(active: boolean) {
  return [
    'rounded-lg border p-3 text-left transition',
    active ? 'border-[#1f9d8a] bg-[#edf8f5] shadow-sm' : 'border-[#dbe6e3] bg-white hover:bg-[#f8fbfa]',
  ].join(' ');
}

export default function TextCreatePage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [scale, setScale] = useState<TextScale>(1);
  const [styleId, setStyleId] = useState<TextChartStyleId>('minimal');
  const [direction, setDirection] = useState<TextDirection>('horizontal');
  const [glyphFill, setGlyphFill] = useState(textChartStyles.minimal.defaultColorTargets.glyphFill);
  const [background, setBackground] = useState(textChartStyles.minimal.defaultColorTargets.background);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const style = textChartStyles[styleId];
  const colors = useMemo(() => ({
    ...style.defaultColorTargets,
    glyphFill,
    background,
  }), [background, glyphFill, style.defaultColorTargets]);

  const generated = useMemo(() => generateTextChart({
    text,
    atlas: fusionTextAtlas,
    direction,
    scale,
    letterSpacingCells: 1,
    lineSpacingCells: 1,
    styleId,
    colors,
    availablePalette: fullPalette.map((color) => ({ key: color.key, color: color.hex })),
  }), [colors, direction, scale, styleId, text]);

  const canGenerate = generated.valid;

  function handleStyleChange(nextStyleId: TextChartStyleId) {
    const nextStyle = textChartStyles[nextStyleId];
    setStyleId(nextStyleId);
    setGlyphFill(nextStyle.defaultColorTargets.glyphFill);
    setBackground(nextStyle.defaultColorTargets.background);
  }

  function handleGenerate() {
    const next = generateTextChart({
      text,
      atlas: fusionTextAtlas,
      direction,
      scale,
      letterSpacingCells: 1,
      lineSpacingCells: 1,
      styleId,
      colors,
      availablePalette: fullPalette.map((color) => ({ key: color.key, color: color.hex })),
    });
    if (!next.valid) return;

    sessionStorage.setItem('juicepindou:pendingTextChart', JSON.stringify({
      kind: 'text',
      text,
      styleId,
      scale,
      direction,
      colors,
      grid: next.grid,
      dimensions: next.dimensions,
      stats: next.stats,
      semanticLayers: next.semanticLayers,
      createdAt: new Date().toISOString(),
    }));
    router.push('/workbench');
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] text-[#17201f]">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-[#dbe6e3] bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1f7669]">文字生成图纸</p>
            <h1 className="mt-2 text-2xl font-semibold">输入文字，直接生成完整拼豆图纸</h1>
            <p className="mt-2 text-sm leading-6 text-[#657370]">默认 12 格字高、绿色字、白色背景。背景会作为真实豆子进入 BOM。</p>
          </div>

          <label className="block text-sm font-semibold" htmlFor="text-chart-content">文字内容</label>
          <textarea
            id="text-chart-content"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="例如：绿色靓仔"
            className="mt-2 min-h-28 w-full resize-y rounded-md border border-[#cfdedb] bg-[#fbfdfc] px-3 py-2 text-base outline-none transition focus:border-[#1f9d8a] focus:ring-2 focus:ring-[#cbece6]"
          />

          <div className="mt-5">
            <div className="mb-2 text-sm font-semibold">字高</div>
            <div className="grid grid-cols-2 gap-2">
              {([1, 2] as TextScale[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScale(value)}
                  className={styleButtonClass(scale === value)}
                >
                  <div className="font-semibold">{value === 1 ? '12 格字高' : '24 格字高'}</div>
                  <div className="mt-1 text-xs text-[#657370]">{value === 1 ? '默认、省豆' : '更适合复杂风格'}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-sm font-semibold">风格</div>
            <div className="grid gap-2">
              {styleIds.map((id) => {
                const item = textChartStyles[id];
                return (
                  <button key={id} type="button" onClick={() => handleStyleChange(id)} className={styleButtonClass(styleId === id)}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{item.name}</span>
                      <span className="rounded-full bg-[#eef3f1] px-2 py-1 text-[11px] text-[#5e6b68]">{item.access === 'free' ? '免费' : '高级'}</span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[#657370]">{item.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <div className="mb-2 text-sm font-semibold">文字色</div>
              <div className="flex flex-wrap gap-2">
                {colorChoices.map((color) => (
                  <button
                    key={`glyph-${color}`}
                    type="button"
                    onClick={() => setGlyphFill(color)}
                    className={`h-8 w-8 rounded border ${glyphFill.toUpperCase() === color ? 'border-[#17201f]' : 'border-black/10'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">背景色</div>
              <div className="flex flex-wrap gap-2">
                {colorChoices.map((color) => (
                  <button
                    key={`bg-${color}`}
                    type="button"
                    onClick={() => setBackground(color)}
                    className={`h-8 w-8 rounded border ${background.toUpperCase() === color ? 'border-[#17201f]' : 'border-black/10'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-5 text-sm font-semibold text-[#176b5f]"
          >
            {showAdvanced ? '收起排版设置' : '展开排版设置'}
          </button>
          {showAdvanced ? (
            <div className="mt-3 rounded-md border border-[#dbe6e3] bg-[#fbfdfc] p-3">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDirection('horizontal')} className={styleButtonClass(direction === 'horizontal')}>横排</button>
                <button type="button" onClick={() => setDirection('vertical')} className={styleButtonClass(direction === 'vertical')}>竖排</button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canGenerate}
            onClick={handleGenerate}
            className="mt-6 h-11 w-full rounded-md bg-[#1f9d8a] text-sm font-semibold text-white shadow-sm transition hover:bg-[#188775] disabled:cursor-not-allowed disabled:bg-[#a7c9c3]"
          >
            生成文字图纸
          </button>
        </section>

        <section className="flex min-h-[calc(100vh-40px)] flex-col rounded-lg border border-[#dbe6e3] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4ece9] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">实时图纸预览</h2>
              <p className="mt-1 text-xs text-[#657370]">
                {generated.valid ? `${generated.dimensions.width} × ${generated.dimensions.height} 格 · ${generated.breakdown.total} 颗 · ${Object.keys(generated.stats.colorCounts).length} 色` : '输入文字后显示尺寸和豆数'}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-md bg-[#f3f7f5] px-3 py-2"><div className="font-semibold">{generated.dimensions.width}</div><div className="text-[#657370]">宽</div></div>
              <div className="rounded-md bg-[#f3f7f5] px-3 py-2"><div className="font-semibold">{generated.dimensions.height}</div><div className="text-[#657370]">高</div></div>
              <div className="rounded-md bg-[#f3f7f5] px-3 py-2"><div className="font-semibold">{generated.breakdown.glyphStructure}</div><div className="text-[#657370]">结构</div></div>
              <div className="rounded-md bg-[#f3f7f5] px-3 py-2"><div className="font-semibold">{generated.breakdown.background}</div><div className="text-[#657370]">背景</div></div>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-auto bg-[linear-gradient(90deg,#edf2f1_1px,transparent_1px),linear-gradient(#edf2f1_1px,transparent_1px)] bg-[length:24px_24px] p-5">
            {generated.valid ? (
              <div
                className="grid rounded-md border border-[#cfdedb] bg-white p-2 shadow-sm"
                style={{
                  gridTemplateColumns: `repeat(${generated.dimensions.width}, minmax(4px, 10px))`,
                  gap: '1px',
                }}
              >
                {generated.grid.flat().map((cell, index) => (
                  <span key={index} className="aspect-square min-h-1 min-w-1 rounded-[1px]" style={{ backgroundColor: cell.color }} />
                ))}
              </div>
            ) : (
              <div className="max-w-md rounded-lg border border-dashed border-[#cfdedb] bg-white/80 p-8 text-center">
                <h3 className="text-lg font-semibold">等待文字内容</h3>
                <p className="mt-2 text-sm leading-6 text-[#657370]">
                  {generated.missingCharacters.length > 0
                    ? `缺少字符：${generated.missingCharacters.map((item) => `${item.grapheme} ${item.codePoint}`).join('、')}`
                    : generated.invalidCharacters[0]?.reason ?? '输入文字后，系统会立即生成可统计的完整背景图纸。'}
                </p>
              </div>
            )}
          </div>

          {generated.warnings.length > 0 ? (
            <div className="border-t border-[#e4ece9] bg-[#fff9ed] px-5 py-3 text-xs leading-5 text-[#7a5b17]">
              {generated.warnings.join(' ')}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

