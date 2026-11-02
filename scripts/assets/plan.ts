export type AssetRes = "1k" | "2k";
export type AssetJob = { id: string; res: AssetRes; out: string };

export const RESOLUTIONS: AssetRes[] = ["1k", "2k"];

export function assetJobs(ids: string[]): AssetJob[] {
  return [...new Set(ids)].flatMap((id) => RESOLUTIONS.map((res) => ({ id, res, out: `public/models/${id}/${res}.glb` })));
}
