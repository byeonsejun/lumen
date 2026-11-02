export function modelUrl(id: string, res: "1k" | "2k"): string {
  return `/models/${id}/${res}.glb`;
}

export function posterUrl(id: string, width = 640): string {
  return `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=${width}`;
}
