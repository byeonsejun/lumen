"use client";

import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { Box3, Mesh, SRGBColorSpace, TextureLoader, Vector3, type Group, type Object3D, type Texture } from "three";
import { loadModel } from "./loadModel";
import { modelUrl, posterUrl } from "./models";
import { QUALITY_PRESETS } from "./quality/presets";
import { useQuality } from "./quality/store";

type Props = { id: string; onClick?: () => void; castShadow?: boolean };
type Loaded = { res: "1k" | "2k"; scene: Group };

/** 항상 1k 를 먼저 그리고, 품질 단계가 2k 면 2k 를 받아 교체한다. 로드 실패 시 같은 자리에 포스터 */
export function ProductModel({ id, onClick, castShadow = true }: Props) {
  const want = useQuality((s) => QUALITY_PRESETS[s.tier].assetRes);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const steps: ("1k" | "2k")[] = want === "2k" ? ["1k", "2k"] : ["1k"];
    (async () => {
      for (const res of steps) {
        try {
          const scene = await loadModel(modelUrl(id, res));
          if (alive) setLoaded({ res, scene });
        } catch (error) {
          console.warn(`[ProductModel] ${id} ${res} 로드 실패`, error);
          // 1k 실패면 포스터, 2k 실패면 1k 를 그대로 둔다
          if (alive && res === "1k") setFailed(true);
          return;
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, want]);

  const object = useMemo(() => {
    if (!loaded) return null;
    const clone = loaded.scene.clone(true);
    clone.traverse((o: Object3D) => {
      if (o instanceof Mesh) {
        o.castShadow = castShadow;
        o.receiveShadow = true;
      }
    });
    // 모델마다 원점이 다르다(천장 조명은 윗부분) — 바닥 위 가운데로 맞춘다
    const box = new Box3().setFromObject(clone);
    const center = box.getCenter(new Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    return clone;
  }, [loaded, castShadow]);

  const handleClick = onClick
    ? (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }
    : undefined;

  return (
    <group onClick={handleClick}>
      {failed && !object ? <PosterBillboard id={id} /> : object && <primitive object={object} />}
    </group>
  );
}

function PosterBillboard({ id }: { id: string }) {
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    let alive = true;
    new TextureLoader().setCrossOrigin("anonymous").load(
      posterUrl(id),
      (t) => {
        t.colorSpace = SRGBColorSpace;
        if (alive) setTexture(t);
      },
      undefined,
      () => {}, // 포스터도 못 받으면 빈 판으로 둔다
    );
    return () => {
      alive = false;
    };
  }, [id]);
  return (
    <mesh position={[0, 0.5, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent color={texture ? "#ffffff" : "#1a1714"} />
      <Html center>
        <span data-testid="model-fallback" className="sr-only">
          {id}
        </span>
      </Html>
    </mesh>
  );
}
