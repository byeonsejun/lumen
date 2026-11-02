export type QualityTier = 0 | 1 | 2;

export type QualityPreset = {
  dpr: [min: number, max: number];
  shadows: boolean;
  shadowMapSize: 512 | 1024 | 2048;
  bloom: boolean;
  ao: boolean;
  assetRes: "1k" | "2k";
};

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  0: { dpr: [1, 1], shadows: false, shadowMapSize: 512, bloom: false, ao: false, assetRes: "1k" },
  1: { dpr: [1, 1.5], shadows: true, shadowMapSize: 1024, bloom: true, ao: false, assetRes: "1k" },
  2: { dpr: [1, 2], shadows: true, shadowMapSize: 2048, bloom: true, ao: true, assetRes: "2k" },
};
