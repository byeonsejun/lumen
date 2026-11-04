"use client";

import Image from "next/image";
import { formatPrice, getProducts } from "@/catalog/query";
import { posterUrl } from "@/three/models";

/** 방에서 가구 더하기 — 담으면 장바구니에 들어가고 방에도 놓인다("방 = 장바구니") */
export function AddFurnitureDrawer({ onAdd, onClose }: { onAdd: (slug: string) => void; onClose: () => void }) {
  return (
    <div role="dialog" aria-label="가구 더하기" className="mt-4 rounded-sm border border-line bg-bg-raised p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm">가구 더하기</p>
        <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center px-2 text-xs text-muted hover:text-fg">
          닫기
        </button>
      </div>
      <ul className="mt-2 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
        {getProducts().map((p) => (
          <li key={p.slug}>
            <button
              type="button"
              data-testid={`room-add-${p.slug}`}
              onClick={() => onAdd(p.slug)}
              className="flex w-full flex-col items-center gap-1 rounded-sm p-2 text-center text-xs hover:bg-bg"
            >
              <span className="relative size-16">
                <Image src={posterUrl(p.polyhavenId, 256)} alt="" fill sizes="64px" className="object-contain" />
              </span>
              <span className="line-clamp-1">{p.name}</span>
              <span className="text-muted">{formatPrice(p.priceKRW)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
