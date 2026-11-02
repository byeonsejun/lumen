import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70svh] place-items-center px-5 text-center">
      <div>
        <h1 className="text-2xl font-light">찾는 가구가 없어요</h1>
        <Link href="/products" className="mt-4 inline-block text-sm text-accent underline">
          전체 상품 보기
        </Link>
      </div>
    </div>
  );
}
