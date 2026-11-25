import type { Metadata } from "next";

/** 공유 미리보기 이미지 — public/og.png (1200x630) */
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "어두운 쇼룸에서 조명 아래 놓인 3D 가구" };

/**
 * 공유 카드(Open Graph)의 공통 부분. title · description 은 일부러 넣지 않는다 —
 * 비워 두면 Next 가 각 페이지의 제목 · 설명으로 채운다. 여기서 정해 두면 모든 페이지가 같은 문구로 공유된다.
 * 페이지가 openGraph 를 지정하면 layout 의 openGraph 는 통째로 대체되므로(병합 안 됨), 페이지는 `ogFor` 로 이 공통부를 다시 받는다.
 */
type OpenGraph = NonNullable<Metadata["openGraph"]>;

export const ogBase: OpenGraph = { type: "website", siteName: "LUMEN", locale: "ko_KR", images: [OG_IMAGE] };

/** 정본 주소와 같은 경로를 og:url 로. 페이지의 `alternates.canonical` 과 함께 쓴다 */
export const ogFor = (path: string): OpenGraph => ({ ...ogBase, url: path });
