import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
const workbenchPage = readFileSync(join(root, 'src/app/workbench/page.tsx'), 'utf8');
const textCreatePage = readFileSync(join(root, 'src/app/create/text/page.tsx'), 'utf8');
const layout = readFileSync(join(root, 'src/app/layout.tsx'), 'utf8');
const completionCard = readFileSync(join(root, 'src/components/CompletionCard.tsx'), 'utf8');
const imageDownloader = readFileSync(join(root, 'src/utils/imageDownloader.ts'), 'utf8');

const combined = `${page}\n${workbenchPage}\n${textCreatePage}\n${layout}\n${completionCard}\n${imageDownloader}`;

const forbidden = [
  '七卡瓦',
  'Perler Beads Generator',
  '专业工作台',
  '小红书',
  'GitHub',
  '请作者喝一杯奶茶',
  'donation-qr',
  'busuanzi',
  'perlerbeads.zippland.com',
  'xiaohongshu.com',
  'github.com/Zippland/perler-beads',
];

for (const term of forbidden) {
  assert.equal(
    combined.includes(term),
    false,
    `Forbidden legacy/external term remains: ${term}`,
  );
}

assert.equal(combined.includes('Juice拼豆') || combined.includes('Juice 拼豆'), true, 'Product name Juice拼豆 is missing.');
assert.equal(page.includes('/create/image'), true, 'Image creation entry is missing.');
assert.equal(page.includes('/create/text'), true, 'Text creation entry is missing.');
assert.equal(textCreatePage.includes('生成文字图纸'), true, 'Text chart creation action is missing.');
assert.equal(workbenchPage.includes('data-workbench-shell'), true, 'Workbench shell marker is missing.');
assert.equal(workbenchPage.includes('data-canvas-stage'), true, 'Canvas stage marker is missing.');
assert.equal(workbenchPage.includes('data-transform-panel'), true, 'Transform panel marker is missing.');
assert.equal(workbenchPage.includes('data-palette-panel'), true, 'Palette cleanup panel marker is missing.');
assert.equal(workbenchPage.includes('data-action-bar'), true, 'Action bar marker is missing.');

console.log('UI contract passed.');
