export type FeatureKey =
  | 'text-style:minimal'
  | 'text-style:farm-sign'
  | 'text-style:arcade'
  | 'text-style:handheld'
  | 'text-style:neon'
  | 'text-scale:24'
  | 'image:advanced-export';

export interface Entitlements {
  has(feature: FeatureKey): boolean;
}

