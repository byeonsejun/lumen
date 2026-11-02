/** 방 공개 장면에서 featured 가구가 놓일 자리 (미터, 방 가운데 기준. 뒷벽 z = -2.2) */
export const ROOM_LAYOUT: Record<string, { position: [number, number, number]; rotationY: number }> = {
  "ember-sofa": { position: [0, 0, -1.7], rotationY: 0 },
  "orbit-coffee-table": { position: [0, 0, 0.25], rotationY: 0 },
  "halo-lounge-chair": { position: [1.85, 0, -0.15], rotationY: -1.15 },
  "dusk-pendant": { position: [0, 1.45, 0.25], rotationY: 0 },
  "fern-planter": { position: [-1.95, 0, -1.6], rotationY: 0.4 },
};

export const ROOM_CAMERA = { position: [0, 2.5, 5.6] as const, target: [0, 0.55, -0.6] as const };
