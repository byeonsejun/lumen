/**
 * Poly Haven 모델을 받아 압축한 뒤 public/models 에 둔다 (npm run assets, --force 로 다시 받기).
 * 런타임은 Poly Haven 원본을 직접 받지 않는다 — 스펙 4장.
 */
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { PRODUCTS } from "../../src/catalog/products";
import { assetJobs, type AssetJob } from "./plan";

const UA = { "User-Agent": "LUMEN-asset-build/1.0" };
const HDRI = { id: "brown_photostudio_02", out: "public/hdri/studio_1k.hdr" };
const TEXTURE_SIZE = { "1k": 1024, "2k": 2048 } as const;
/** 1k 가 2MB 를 넘는 모델은 1k 텍스처를 더 줄인다 (계획 Task 5: 첫 화면 지연 = 실패 조건) */
const TEXTURE_SIZE_1K_OVERRIDE: Record<string, number> = { brass_candleholders: 512 };
const force = process.argv.includes("--force");

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<T>;
}

async function download(url: string, to: string) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  await mkdir(dirname(to), { recursive: true });
  await writeFile(to, Buffer.from(await r.arrayBuffer()));
}

type FileEntry = { url: string; size: number; include?: Record<string, { url: string }> };

async function buildModel(job: AssetJob, io: NodeIO) {
  if (!force && existsSync(job.out)) return;
  const files = await getJson<{ gltf: Record<string, { gltf: FileEntry }> }>(`https://api.polyhaven.com/files/${job.id}`);
  const entry = files.gltf[job.res]?.gltf;
  if (!entry) throw new Error(`${job.id}: ${job.res} glTF 없음`);
  const dir = await mkdtemp(join(tmpdir(), `ph-${job.id}-`));
  try {
    const gltfPath = join(dir, "model.gltf");
    await download(entry.url, gltfPath);
    for (const [rel, f] of Object.entries(entry.include ?? {})) await download(f.url, join(dir, rel));
    const doc = await io.read(gltfPath);
    const size = job.res === "1k" ? (TEXTURE_SIZE_1K_OVERRIDE[job.id] ?? TEXTURE_SIZE["1k"]) : TEXTURE_SIZE[job.res];
    await doc.transform(
      dedup(),
      prune(),
      weld(),
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: [size, size], quality: 82 }),
      meshopt({ encoder: MeshoptEncoder, level: "medium" }),
    );
    await mkdir(dirname(job.out), { recursive: true });
    await io.write(job.out, doc);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function buildHdri() {
  if (!force && existsSync(HDRI.out)) return;
  const files = await getJson<{ hdri: Record<string, { hdr: FileEntry }> }>(`https://api.polyhaven.com/files/${HDRI.id}`);
  await download(files.hdri["1k"].hdr.url, HDRI.out);
}

async function main() {
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
  const jobs = assetJobs(PRODUCTS.map((p) => p.polyhavenId));
  const manifest: Record<string, Record<string, number>> = {};
  for (const job of jobs) {
    process.stdout.write(`${job.id} ${job.res} … `);
    await buildModel(job, io);
    const bytes = (await stat(job.out)).size;
    (manifest[job.id] ??= {})[job.res] = bytes;
    console.log(`${(bytes / 1024 / 1024).toFixed(2)}MB`);
  }
  await writeFile("public/models/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
  await buildHdri();
  console.log("hdri ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
