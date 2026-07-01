# Juice 拼豆文字图纸生成项目报告

日期：2026-07-01  
当前实现分支：`master`  
核心目标：文字图纸不走图片生成、不走 AI 生图，而是用像素字库和确定性几何规则生成可制作、可统计、可编辑、可导出的拼豆 grid。

## 1. 当前产品结构

当前项目已经拆成三类入口：

- `/`：创建方式选择页。
- `/create/text`：文字生成图纸入口。
- `/create/image`：图片生成图纸入口，目前转入现有图片工作台。
- `/workbench`：统一图纸工作台，继续承载画布、编辑、调色、统计、导出。

文字生成后的数据通过 `sessionStorage` 暂存为 `juicepindou:pendingTextChart`，进入 `/workbench` 后读取为可编辑的 `MappedPixel[][]`。

## 2. 文字图纸生成总链路

核心代码位置：

```text
src/features/text-chart/generateTextChart.ts
src/features/text-chart/textChartStyles.ts
src/features/text-chart/textChartGeometry.ts
src/features/text-chart/textChartColorResolver.ts
src/features/text-chart/types.ts
src/features/text-chart/generateTextChart.test.ts
src/features/text-grid-core/index.ts
src/features/text-grid-core/generated/fusion-12-zh-hans-mono.v2026.05.07.json
```

总流程：

```text
用户文字
→ Fusion Pixel Font 字库布局 layoutTextPattern()
→ 得到 glyph-fill 基础字形占格
→ 按风格配方生成 frame / decoration / shadow / outline / fill 等图层
→ 图层归一化到原点
→ 根据字高加入外边距：12 格字高四周 3 格，24 格字高四周 6 格
→ 创建完整背景豆 grid
→ 按图层优先级覆盖写入
→ 计算尺寸、总豆数、颜色统计、语义图层
```

这里的“生图”不是生成图片文件，而是生成最终拼豆图纸数据：

```ts
MappedPixel[][]
```

每一个格子都是一个实际豆子或可编辑单元。

## 3. 编译器主逻辑

入口函数：

```ts
export function generateTextChart(input: GenerateTextChartInput): GeneratedTextChart
```

关键步骤来自 `src/features/text-chart/generateTextChart.ts`。

### 3.1 字形布局

编译器先把用户输入转成现有文字布局 spec：

```ts
function buildSpec(input: GenerateTextChartInput): TextPatternSpec {
  return {
    text: input.text,
    atlasId: input.atlas.atlasId,
    atlasVersion: input.atlas.fontVersion,
    direction: input.direction,
    scale: input.scale,
    letterSpacingCells: input.letterSpacingCells,
    lineSpacingCells: input.lineSpacingCells,
    fillColorId: 'glyph-fill',
    fillColorHex: input.colors.glyphFill,
    anchor: { x: 0, y: 0 },
    overwritePolicy: 'overwrite',
  };
}
```

然后调用：

```ts
const placement = layoutTextPattern(buildSpec(input), input.atlas);
```

这一步只负责根据真实像素字库算出文字占哪些格子。它不会做描边、阴影、边框或背景。

### 3.2 字形归一化

布局返回的坐标可能不是从 `(0, 0)` 开始，所以会先归一化：

```ts
const glyphCells = uniqueCells(placement.cells.map((cell) => ({
  x: cell.x - placement.bounds.x,
  y: cell.y - placement.bounds.y,
})));
const glyphBounds = getBounds(glyphCells);
```

之后所有风格都只基于这个 `glyphCells` 工作。

### 3.3 风格图层生成

不同风格由 `textChartStyles[styleId].buildLayers()` 决定：

```ts
const style = getTextChartStyle(input.styleId);
const layers = style.buildLayers({ glyphCells, glyphBounds, scale: input.scale });
```

这就是不同风格长得不一样的核心原因：每个风格对同一份字形 mask 做了不同几何操作。

### 3.4 边距和最终尺寸

当前固定规则：

```ts
const margin = input.scale === 1 ? 3 : 6;
```

也就是：

- 12 格字高：四周 3 格外边距。
- 24 格字高：四周 6 格外边距。

最终尺寸来自风格内容边界，而不是裸文字边界：

```ts
width = contentBounds.width + margin * 2
height = contentBounds.height + margin * 2
```

### 3.5 完整背景豆

文字图纸默认不是透明底，而是完整实体背景：

```ts
const grid: MappedPixel[][] = Array.from({ length: finalBounds.height }, () =>
  Array.from({ length: finalBounds.width }, () => ({ ...backgroundPixel })),
);
```

这保证：

- 背景进入 BOM。
- `totalBeadCount === width * height`。
- 图纸是完整可熨烫作品，而不是只有文字线条。

### 3.6 图层叠放顺序

当前叠放顺序：

```ts
for (const role of ['frame', 'decoration', 'glyph-shadow', 'glyph-outline', 'glyph-fill'] as const) {
  const roleLayers = placedLayers.filter((layer) => layer.role === role);
  for (const layer of roleLayers) {
    const colorKey = layerCellColorRole(role);
    writeLayer(grid, semanticLayers, layer, toMappedPixel(resolvedColors[colorKey]));
  }
}
```

含义：

```text
background
→ frame
→ decoration
→ glyph-shadow
→ glyph-outline
→ glyph-fill
```

后写入的层会覆盖前面的层。同一个坐标最终只属于一个语义角色。

## 4. 几何函数

核心代码位置：

```text
src/features/text-chart/textChartGeometry.ts
```

目前主要几何能力：

```ts
dilate8(cells, radius)      // 八方向膨胀，用于粗描边、外圈、阴影
translate(cells, dx, dy)    // 平移，用于右下阴影
subtract(a, b)              // 集合相减，用于 ring = 膨胀层 - 原字形
createRect(rect)            // 创建矩形填充
createRectRing(rect)        // 创建矩形边框
inflateRect(rect, padding)  // 对内容边界外扩
cornerLeafTemplates(...)    // 田园木牌 24 格角标叶片模板
```

这些函数都是纯函数，不读 React state，不读 Canvas，不调用网络。

## 5. 五种风格的生成逻辑

风格定义文件：

```text
src/features/text-chart/textChartStyles.ts
```

### 5.1 极简文字 minimal

定位：默认、省豆、干净，适合名字和短句。

默认色：

```ts
background: '#FFFFFF'
glyphFill:  '#1F9D8A'
```

生成逻辑：

```ts
buildLayers: ({ glyphCells }) => [
  { role: 'glyph-fill', cells: glyphCells },
]
```

解释：

- 不加描边。
- 不加阴影。
- 不加边框。
- 不加装饰。
- 只有完整背景和原始字形。

视觉结果最接近“绿色字 + 白底”的基础款。

### 5.2 田园木牌 farm-sign

定位：手作名字牌、田园木牌效果。24 格时出现角标叶片。

默认色：

```ts
background: '#F7E8C8'
glyphFill:  '#7A4F2A'
frame:      '#7A4F2A'
decoration: '#3F8F4E'
```

生成逻辑：

```ts
buildLayers: ({ glyphCells, glyphBounds, scale }) => {
  const boardRect = inflateRect(glyphBounds, scale === 1 ? 2 : 4);
  const layers = [
    { role: 'decoration', cells: subtract(createRect(boardRect), createRectRing(boardRect)) },
    { role: 'frame', cells: createRectRing(boardRect) },
    { role: 'glyph-fill', cells: glyphCells },
  ];
  if (scale === 2) {
    layers.splice(1, 0, { role: 'decoration', cells: cornerLeafTemplates(boardRect, scale) });
  }
  return layers;
}
```

解释：

- 先根据文字边界外扩出一个 `boardRect`。
- `decoration` 先填充木牌内部。
- `frame` 画出木牌边框。
- `glyph-fill` 把文字写在木牌上。
- 24 格时额外加入四角叶片装饰。

从截图看，田园木牌目前出现了大块木牌填充、边框和文字本体，所以整体更像一块横向牌匾。这和极简文字完全不同，是由 `createRect / createRectRing / cornerLeafTemplates` 这些矩形和模板逻辑造成的。

当前注意点：

- `decoration` 同时承担“木牌内部填充”和“叶片装饰”，角色语义还可以继续细分。
- 如果用户把文字色改成绿色、背景改成奶油色，木牌的文字和边框可能因为当前色板映射变成同一类棕色，视觉会更重。

### 5.3 8-bit 街机 arcade

定位：游戏昵称、队名、短口号，高对比。

默认色：

```ts
background:    '#101826'
glyphFill:     '#F8D84A'
glyphOutline:  '#4DE1D2'
glyphShadow:   '#4B3A8F'
```

生成逻辑：

```ts
buildLayers: ({ glyphCells, scale }) => {
  const radius = scale === 1 ? 1 : 2;
  return [
    { role: 'glyph-shadow', cells: translate(dilate8(glyphCells, radius), 1, 1) },
    { role: 'glyph-outline', cells: subtract(dilate8(glyphCells, radius), glyphCells) },
    { role: 'glyph-fill', cells: glyphCells },
  ];
}
```

解释：

- `dilate8(glyphCells, radius)` 先把字形向八方向膨胀，得到粗描边范围。
- `subtract(..., glyphCells)` 得到只有外圈的描边。
- `translate(..., 1, 1)` 把膨胀层向右下移动，形成街机阴影。
- 最后写回原始 `glyph-fill`。

视觉上会比极简更“厚”，也更像游戏字牌。

### 5.4 掌机绿屏 handheld

定位：低色数、复古、省颜色，适合 12 格。

默认色：

```ts
background: '#9BBC0F'
glyphFill:  '#306230'
frame:      '#306230'
decoration: '#8BAC0F'
```

生成逻辑：

```ts
buildLayers: ({ glyphCells, glyphBounds, scale }) => {
  const screenRect = inflateRect(glyphBounds, scale === 1 ? 2 : 4);
  return [
    { role: 'decoration', cells: subtract(createRect(screenRect), createRectRing(screenRect)) },
    { role: 'frame', cells: createRectRing(screenRect) },
    { role: 'glyph-fill', cells: glyphCells },
  ];
}
```

解释：

- 和田园木牌类似，也有一个外扩矩形。
- 但颜色角色是绿屏体系：浅绿背景、中绿屏幕、深绿边框和文字。
- 不加阴影，不加复杂描边，不加叶片。

视觉上应该是“屏幕框 + 低色数字形”。

### 5.5 霓虹招牌 neon

定位：夜间招牌感、潮流短词，不使用渐变，只用离散色环。

默认色：

```ts
background:   '#130A1F'
glyphFill:    '#FFF7D6'
glyphOutline: '#00E5FF'
glyphShadow:  '#43316D'
```

生成逻辑：

```ts
buildLayers: ({ glyphCells, scale }) => {
  const innerRing = subtract(dilate8(glyphCells, 1), glyphCells);
  if (scale === 1) {
    return [
      { role: 'glyph-outline', cells: innerRing },
      { role: 'glyph-fill', cells: glyphCells },
    ];
  }
  const outer = dilate8(glyphCells, 2);
  return [
    { role: 'glyph-shadow', cells: subtract(outer, dilate8(glyphCells, 1)) },
    { role: 'glyph-outline', cells: innerRing },
    { role: 'glyph-fill', cells: glyphCells },
  ];
}
```

解释：

- 12 格时只保留内圈和字芯，避免汉字内部堵塞。
- 24 格时增加第二层外圈。
- 不使用透明、渐变、模糊或发光滤镜。

从截图看，霓虹招牌会出现深色背景、青色内圈和浅色字芯，和田园木牌完全不同。这是因为它不创建矩形牌匾，而是直接对字形做 `dilate8` 色环。

## 6. 颜色映射逻辑

核心代码位置：

```text
src/features/text-chart/textChartColorResolver.ts
```

规则：

1. 风格默认色先用目标 hex 表示。
2. 如果当前可用色板里有精确 hex，直接使用。
3. 如果没有精确 hex，则找最近似颜色。
4. 返回 warning，提示“默认色不在当前色板中，已映射为某色号”。

当前示例：

```text
背景 默认色 #F7E8C8 不在当前色板中，已映射为 P11。
文字 默认色 #7A4F2A 不在当前色板中，已映射为 F10。
```

这解释了截图底部为什么会出现一串 warning。风格目标色和当前色板不完全一致时，会自动映射到可购买/可用色板里的近似色。

## 7. 为什么不同风格差异这么大

目前差异来自四层因素：

1. **几何结构不同**
   - 极简：只写字。
   - 田园木牌：创建矩形牌匾和边框。
   - 街机：字形膨胀、描边、右下阴影。
   - 掌机绿屏：创建屏幕矩形和边框。
   - 霓虹：字形内外色环。

2. **颜色角色不同**
   - 极简主要是背景和文字。
   - 田园木牌有背景、木牌内部、边框、文字、叶片。
   - 霓虹有深底、外圈、内圈、字芯。

3. **12/24 格规则不同**
   - 12 格会简化复杂结构。
   - 24 格允许更多装饰，比如田园木牌叶片、霓虹外圈。

4. **色板映射不同**
   - 默认目标色不一定在当前拼豆色板中。
   - 实际显示颜色是映射后的色号，所以会和设计目标有偏差。

## 8. 当前测试覆盖

测试文件：

```text
src/features/text-chart/generateTextChart.test.ts
```

覆盖内容：

- 12 格极简文字完整背景。
- 24 格边距规则。
- 缺字时不输出半成品 grid。
- 五种风格 deterministic。
- 复杂风格 12/24 简化差异。
- 窄色板颜色回退和 warning。

核心断言包括：

```ts
assert.equal(chart.stats.totalBeadCount, chart.dimensions.width * chart.dimensions.height);
assert.ok(chart.grid.flat().every((cell) => cell && cell.isExternal !== true));
assert.deepEqual(first.grid, second.grid);
```

## 9. 当前已知问题和可改进点

### 9.1 风格视觉一致性还需要产品审美校准

现在五种风格的生成逻辑已经分开，但视觉上还比较“工程配方”：

- 田园木牌的木牌填充占比大，可能显得厚重。
- 霓虹招牌在 12 格/24 格、中文复杂字形下容易有堵塞或黑底过重。
- 街机和霓虹都使用膨胀逻辑，若颜色接近，可能风格区分度下降。

建议下一轮让 ChatGPT 或设计审查重点看：

```text
每种风格是否有明确用途？
是否适合拼豆实物制作？
12 格下是否太堵？
24 格下是否值得增加装饰？
颜色映射后是否仍保留风格识别度？
```

### 9.2 语义角色还可以更细

当前 `decoration` 在不同风格里承担多种含义：

- 木牌内部填充。
- 叶片装饰。
- 掌机屏幕内部。

后续若要精细改色，建议拆成：

```text
panel-fill
corner-decoration
screen-fill
```

### 9.3 UI 色块目前是固定候选色

`/create/text` 的色块来自页面内固定数组：

```ts
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
```

后续可以改成直接来自当前启用拼豆色板，避免用户选择一个最终又被映射的颜色。

### 9.4 当前 `/create/image` 是过渡实现

当前图片入口会跳转到 `/workbench`，复用现有图片工作台。技术方案里更完整的目标是 `/create/image` 单独承载图片输入与编译，生成后再进入统一工作台。这个还没有完全拆完。

## 10. 给 ChatGPT 审核时建议重点问的问题

可以把下面这段直接发给 ChatGPT：

```text
请审核这个文字拼豆图纸生成实现：
1. 五种风格 minimal / farm-sign / arcade / handheld / neon 的几何配方是否合理？
2. 当前田园木牌和霓虹招牌的视觉差异是否足够清晰？
3. 这些风格是否适合真实拼豆制作，而不是只适合屏幕预览？
4. 12 格中文字体下，哪些风格应该简化或禁用？
5. 当前颜色角色 background / glyphFill / glyphOutline / glyphShadow / frame / decoration 是否足够，是否需要拆分 decoration？
6. 当前 UI 里用户可改“文字色/背景色”，但部分风格还有描边、阴影、边框、装饰色，应该怎么设计更直观？
7. 如果要把风格做得更像可售卖的风格包，优先改哪三个地方？
```

## 11. 最新验证状态

最近一次完整检查：

```bash
npm run check
```

通过内容：

- `npm run test:text-grid`
- `npm run text-font:verify`
- `npm run typecheck`
- `npm run lint`
- `npm run verify:ui-contract`
- `npm run build`

已知非阻断 warning：

- `src/app/workbench/page.tsx` 有一个 `fullBeadPalette` hook dependency warning。
- `src/app/workbench/page.tsx` 有一个 Next.js `<img>` 建议替换为 `<Image />` 的 warning。

