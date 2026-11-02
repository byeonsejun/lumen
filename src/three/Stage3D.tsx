"use client";

import { Canvas } from "@react-three/fiber";
import { getGPUTier } from "detect-gpu";
import { useEffect, useState, type ReactNode } from "react";
import { browserEnv, detectRenderCapability, forcedCapability, type RenderCapability } from "./capability";
import { createRenderer, rendererBackend } from "./createRenderer";
import { AdaptiveQuality } from "./quality/AdaptiveQuality";
import { initialTier } from "./quality/policy";
import { QUALITY_PRESETS, type QualityTier } from "./quality/presets";
import { useQuality } from "./quality/store";

type Props = { poster: string; posterAlt: string; className?: string; children: ReactNode };

function parseTier(v: string | null): QualityTier | undefined {
  return v === "0" || v === "1" || v === "2" ? (Number(v) as QualityTier) : undefined;
}

let tierInitialized = false;

async function initTier(search: URLSearchParams) {
  if (tierInitialized) return;
  tierInitialized = true;
  const s = useQuality.getState();
  s.setAdaptive(search.get("adaptive") !== "off");
  const forced = parseTier(search.get("tier"));
  if (forced !== undefined) {
    s.setTier(forced);
    s.setCeiling(forced);
    return;
  }
  try {
    const gpu = await getGPUTier({ benchmarksURL: "/detect-gpu" });
    const t = initialTier({ tier: gpu.tier as 0 | 1 | 2 | 3, isMobile: !!gpu.isMobile });
    s.setTier(t);
    s.setCeiling(t === 0 ? 1 : 2); // 저사양 판정이 틀렸을 수 있으니 실제 fps 가 좋으면 한 단계는 올라갈 수 있다
  } catch {
    s.setTier(1);
  }
}

export function Stage3D({ poster, posterAlt, className, children }: Props) {
  const [cap, setCap] = useState<RenderCapability | null>(null);
  // ssr:false 로만 쓰므로 window 를 바로 읽는다
  const [debug] = useState(() => new URLSearchParams(window.location.search).has("debug"));
  const tier = useQuality((s) => s.tier);
  const preset = QUALITY_PRESETS[tier];

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    let alive = true;
    Promise.all([detectRenderCapability({ ...browserEnv(), force: forcedCapability(search) }), initTier(search)]).then(
      ([c]) => {
        if (!alive) return;
        if (c === "none") useQuality.getState().setBackend("none");
        setCap(c);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  if (cap === "none") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img data-testid="stage-fallback" src={poster} alt={posterAlt} className={`${className ?? ""} object-contain`} />;
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      {cap && (
        <Canvas
          data-testid="stage-canvas"
          gl={createRenderer(cap)}
          dpr={preset.dpr}
          shadows={preset.shadows ? "percentage" : false}
          onCreated={(state) => useQuality.getState().setBackend(rendererBackend(state.gl))}
        >
          <AdaptiveQuality />
          {children}
        </Canvas>
      )}
      {debug && <DebugHud />}
    </div>
  );
}

function DebugHud() {
  const { backend, tier, fps, adaptive } = useQuality();
  return (
    <div
      data-testid="stage-hud"
      className="pointer-events-none absolute right-3 top-16 z-30 rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-fg"
    >
      {backend ?? "…"} · tier {tier} · {fps}fps{adaptive ? "" : " · fixed"}
    </div>
  );
}
