import { describe, expect, it } from "vitest";
import { assetJobs } from "../../scripts/assets/plan";
import { modelUrl, posterUrl } from "@/three/models";

describe("asset plan", () => {
  it("id 당 1k·2k 두 작업, 중복 제거", () =>
    expect(assetJobs(["a", "a", "b"]).map((j) => j.out)).toEqual([
      "public/models/a/1k.glb",
      "public/models/a/2k.glb",
      "public/models/b/1k.glb",
      "public/models/b/2k.glb",
    ]));
  it("modelUrl", () => expect(modelUrl("sofa_02", "1k")).toBe("/models/sofa_02/1k.glb"));
  it("posterUrl", () => expect(posterUrl("sofa_02")).toBe("https://cdn.polyhaven.com/asset_img/thumbs/sofa_02.png?width=640"));
});
