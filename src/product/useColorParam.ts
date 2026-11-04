"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { normalizeColor } from "@/catalog/query";

/**
 * 상품 상세에서 고른 색. 3D 뷰어와 담기가 형제 컴포넌트라 작은 상태로 나눠 쓰고, 주소 `?color=` 와 맞춘다.
 * 페이지는 정적으로 두고 클라이언트가 읽는다(replaceState — 다시 그리지 않는다)
 */
const useStore = create<{ slug: string; color: string }>(() => ({ slug: "", color: "" }));

export function useColorParam(slug: string): [color: string, setColor: (id: string) => void] {
  const { slug: current, color } = useStore();
  useEffect(() => {
    if (current === slug) return;
    useStore.setState({ slug, color: normalizeColor(slug, new URLSearchParams(window.location.search).get("color")) });
  }, [slug, current]);
  const setColor = (id: string) => {
    const next = normalizeColor(slug, id);
    useStore.setState({ slug, color: next });
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("color", next);
    else url.searchParams.delete("color");
    window.history.replaceState(window.history.state, "", url);
  };
  return [current === slug ? color : "", setColor];
}
