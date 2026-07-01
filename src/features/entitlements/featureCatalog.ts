import type { FeatureKey } from './types';

export const featureCatalog: Record<FeatureKey, { label: string; productLine: 'text' | 'image' | 'workbench' }> = {
  'text-style:minimal': { label: '极简文字', productLine: 'text' },
  'text-style:farm-sign': { label: '田园木牌', productLine: 'text' },
  'text-style:arcade': { label: '8-bit 街机', productLine: 'text' },
  'text-style:handheld': { label: '掌机绿屏', productLine: 'text' },
  'text-style:neon': { label: '霓虹招牌', productLine: 'text' },
  'text-scale:24': { label: '24 格字高', productLine: 'text' },
  'image:advanced-export': { label: '图片高级导出', productLine: 'image' },
};

