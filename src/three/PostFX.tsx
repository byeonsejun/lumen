"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { builtinAOContext, mrt, normalView, pass, screenUV } from "three/tsl";
import { RenderPipeline, type WebGPURenderer } from "three/webgpu";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { ao } from "three/examples/jsm/tsl/display/GTAONode.js";
import { QUALITY_PRESETS } from "./quality/presets";
import { useQuality } from "./quality/store";

/** 품질 단계에 따라 bloom · AO 를 켠다. 둘 다 꺼지면 R3F 기본 렌더로 돌아간다 */
export function PostFX({ bloomStrength = 0.6 }: { bloomStrength?: number }) {
  const preset = useQuality((s) => QUALITY_PRESETS[s.tier]);
  if (!preset.bloom && !preset.ao) return null;
  return <Pipeline bloomOn={preset.bloom} aoOn={preset.ao} bloomStrength={bloomStrength} />;
}

function Pipeline({ bloomOn, aoOn, bloomStrength }: { bloomOn: boolean; aoOn: boolean; bloomStrength: number }) {
  const { gl, scene, camera } = useThree();
  const pipeline = useMemo(() => {
    const p = new RenderPipeline(gl as unknown as WebGPURenderer);
    const scenePass = pass(scene, camera);
    if (aoOn) {
      const prePass = pass(scene, camera);
      prePass.setMRT(mrt({ output: normalView }));
      const aoPass = ao(prePass.getTextureNode("depth"), prePass.getTextureNode(), camera);
      aoPass.resolutionScale = 0.5;
      scenePass.contextNode = builtinAOContext(aoPass.getTextureNode().sample(screenUV).r);
    }
    const color = scenePass.getTextureNode("output");
    p.outputNode = bloomOn ? color.add(bloom(color, bloomStrength, 0.4, 0.7)) : color;
    return p;
  }, [gl, scene, camera, aoOn, bloomOn, bloomStrength]);

  useEffect(() => () => pipeline.dispose(), [pipeline]);
  useFrame(() => pipeline.render(), 1);
  return null;
}
