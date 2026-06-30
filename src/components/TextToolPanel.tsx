import type {
  LetterSpacingCells,
  LineSpacingCells,
  OverwritePolicy,
  TextDirection,
  TextPlacementResult,
  TextScale,
} from '../features/text-grid-core';
import { getColorKeyByHex, type ColorSystem } from '../utils/colorSystemUtils';

interface TextToolColorOption {
  key: string;
  color: string;
}

interface TextToolPanelProps {
  chartReady: boolean;
  isTextToolActive: boolean;
  onToggleTextTool: () => void;
  blankGridWidthInput: string;
  onBlankGridWidthInputChange: (value: string) => void;
  blankGridHeightInput: string;
  onBlankGridHeightInputChange: (value: string) => void;
  onCreateBlankGrid: () => void;
  textToolText: string;
  onTextToolTextChange: (value: string) => void;
  selectedTextToolColor: TextToolColorOption;
  textToolColorOptions: TextToolColorOption[];
  selectedColorSystem: ColorSystem;
  onTextToolColorHexChange: (value: string) => void;
  textToolDirection: TextDirection;
  onTextToolDirectionChange: (value: TextDirection) => void;
  textToolScale: TextScale;
  onTextToolScaleChange: (value: TextScale) => void;
  textToolLetterSpacing: LetterSpacingCells;
  onTextToolLetterSpacingChange: (value: LetterSpacingCells) => void;
  textToolLineSpacing: LineSpacingCells;
  onTextToolLineSpacingChange: (value: LineSpacingCells) => void;
  textToolOverwritePolicy: OverwritePolicy;
  onTextToolOverwritePolicyChange: (value: OverwritePolicy) => void;
  textPlacementPreview: TextPlacementResult | null;
}

export default function TextToolPanel({
  chartReady,
  isTextToolActive,
  onToggleTextTool,
  blankGridWidthInput,
  onBlankGridWidthInputChange,
  blankGridHeightInput,
  onBlankGridHeightInputChange,
  onCreateBlankGrid,
  textToolText,
  onTextToolTextChange,
  selectedTextToolColor,
  textToolColorOptions,
  selectedColorSystem,
  onTextToolColorHexChange,
  textToolDirection,
  onTextToolDirectionChange,
  textToolScale,
  onTextToolScaleChange,
  textToolLetterSpacing,
  onTextToolLetterSpacingChange,
  textToolLineSpacing,
  onTextToolLineSpacingChange,
  textToolOverwritePolicy,
  onTextToolOverwritePolicyChange,
  textPlacementPreview,
}: TextToolPanelProps) {
  const previewStatus = textPlacementPreview
    ? textPlacementPreview.valid
      ? `${textPlacementPreview.cells.length} 颗预览`
      : '预览不可提交'
    : '像素字形直写图纸';

  const invalidPreviewMessage = textPlacementPreview && !textPlacementPreview.valid
    ? textPlacementPreview.missingCharacters.length > 0
      ? `缺字：${textPlacementPreview.missingCharacters.map(item => `${item.grapheme} ${item.codePoint}`).join('、')}`
      : textPlacementPreview.outOfBounds.length > 0
        ? '超出画布边界'
        : textPlacementPreview.collisions.length > 0
          ? `冲突：${textPlacementPreview.collisions.length} 格`
          : '当前文字不可放置'
    : null;

  return (
    <section data-text-tool-panel className="rounded-lg border border-[#dce5e2] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#17201f]">文字工具</h2>
          <p className="mt-1 text-xs text-[#6f7d7b]">{previewStatus}</p>
        </div>
        <button
          type="button"
          onClick={onToggleTextTool}
          disabled={!chartReady}
          aria-pressed={isTextToolActive}
          className={'h-8 rounded-md border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ' + (isTextToolActive ? 'border-[#1f9d8a] bg-[#e7f3f0] text-[#176b5f]' : 'border-[#d2dedb] bg-white text-[#3b4947] hover:bg-[#f7fbfa]')}
        >
          {isTextToolActive ? '启用中' : '启用'}
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input type="number" min="10" max="300" value={blankGridWidthInput} onChange={(event) => onBlankGridWidthInputChange(event.target.value)} className="h-9 rounded-md border border-[#d2dedb] px-2 text-xs outline-none focus:border-[#1f9d8a] focus:ring-2 focus:ring-[#1f9d8a]/15" aria-label="空白图纸宽度" />
          <input type="number" min="10" max="300" value={blankGridHeightInput} onChange={(event) => onBlankGridHeightInputChange(event.target.value)} className="h-9 rounded-md border border-[#d2dedb] px-2 text-xs outline-none focus:border-[#1f9d8a] focus:ring-2 focus:ring-[#1f9d8a]/15" aria-label="空白图纸高度" />
          <button type="button" onClick={onCreateBlankGrid} className="h-9 rounded-md border border-[#d2dedb] bg-white px-2 text-xs font-medium text-[#3b4947] hover:bg-[#f7fbfa]">新建</button>
        </div>

        <textarea value={textToolText} onChange={(event) => onTextToolTextChange(event.target.value)} rows={3} className="w-full resize-none rounded-md border border-[#d2dedb] bg-white px-3 py-2 text-sm leading-5 outline-none focus:border-[#1f9d8a] focus:ring-2 focus:ring-[#1f9d8a]/15" placeholder="绿色靓仔" />

        <div>
          <p className="mb-2 text-xs font-medium text-[#3b4947]">颜色</p>
          <select value={selectedTextToolColor.color} onChange={(event) => onTextToolColorHexChange(event.target.value)} className="h-9 w-full rounded-md border border-[#d2dedb] bg-white px-2 text-xs outline-none focus:border-[#1f9d8a]">
            {textToolColorOptions.map(color => (
              <option key={color.color} value={color.color}>
                {getColorKeyByHex(color.color.toUpperCase(), selectedColorSystem)} · {color.color}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onTextToolDirectionChange('horizontal')} className={'h-9 rounded-md border text-xs font-medium transition ' + (textToolDirection === 'horizontal' ? 'border-[#1f9d8a] bg-[#e7f3f0] text-[#176b5f]' : 'border-[#d2dedb] bg-white text-[#3b4947] hover:bg-[#f7fbfa]')}>横排</button>
          <button type="button" onClick={() => onTextToolDirectionChange('vertical')} className={'h-9 rounded-md border text-xs font-medium transition ' + (textToolDirection === 'vertical' ? 'border-[#1f9d8a] bg-[#e7f3f0] text-[#176b5f]' : 'border-[#d2dedb] bg-white text-[#3b4947] hover:bg-[#f7fbfa]')}>竖排</button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="block"><span className="mb-1 block text-[11px] font-medium text-[#6f7d7b]">字高</span><select value={textToolScale} onChange={(event) => onTextToolScaleChange(Number(event.target.value) as TextScale)} className="h-9 w-full rounded-md border border-[#d2dedb] bg-white px-2 text-xs"><option value={1}>12 颗</option><option value={2}>24 颗</option></select></label>
          <label className="block"><span className="mb-1 block text-[11px] font-medium text-[#6f7d7b]">字距</span><select value={textToolLetterSpacing} onChange={(event) => onTextToolLetterSpacingChange(Number(event.target.value) as LetterSpacingCells)} className="h-9 w-full rounded-md border border-[#d2dedb] bg-white px-2 text-xs"><option value={-1}>-1</option><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select></label>
          <label className="block"><span className="mb-1 block text-[11px] font-medium text-[#6f7d7b]">行距</span><select value={textToolLineSpacing} onChange={(event) => onTextToolLineSpacingChange(Number(event.target.value) as LineSpacingCells)} className="h-9 w-full rounded-md border border-[#d2dedb] bg-white px-2 text-xs"><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select></label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onTextToolOverwritePolicyChange('empty-only')} className={'h-9 rounded-md border text-xs font-medium transition ' + (textToolOverwritePolicy === 'empty-only' ? 'border-[#1f9d8a] bg-[#e7f3f0] text-[#176b5f]' : 'border-[#d2dedb] bg-white text-[#3b4947] hover:bg-[#f7fbfa]')}>仅空白格</button>
          <button type="button" onClick={() => onTextToolOverwritePolicyChange('overwrite')} className={'h-9 rounded-md border text-xs font-medium transition ' + (textToolOverwritePolicy === 'overwrite' ? 'border-[#d9823b] bg-[#fff1e6] text-[#9c4f12]' : 'border-[#d2dedb] bg-white text-[#3b4947] hover:bg-[#f7fbfa]')}>覆盖已有格</button>
        </div>

        {invalidPreviewMessage ? (
          <div className="rounded-md border border-[#f0c9b9] bg-[#fff7f2] px-3 py-2 text-xs leading-5 text-[#9c4324]">{invalidPreviewMessage}</div>
        ) : null}
      </div>
    </section>
  );
}
