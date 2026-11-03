import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보처리방침 — LUMEN" };

const ISSUES = "https://github.com/byeonsejun/lumen/issues";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 pb-20 pt-24 text-sm leading-relaxed sm:px-8">
      <h1 className="text-3xl font-light">개인정보처리방침</h1>
      <p className="mt-2 text-muted">시행일 2026년 11월 3일</p>

      <p className="mt-8">
        LUMEN 은 포트폴리오용 데모 쇼핑몰입니다. 실제 상품을 팔지 않고, 결제는 토스페이먼츠 <strong>테스트 결제</strong>로만 이뤄져 돈이 나가지
        않습니다. 서비스에 필요한 최소한의 정보만 다룹니다.
      </p>

      <h2 className="mt-10 text-lg">1. 수집하는 정보</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li>카카오 · 구글로 로그인할 때: 로그인 서비스가 주는 회원 식별 번호와 이름(닉네임)을 저장합니다. 구글이 함께 주는 이메일은 데이터베이스에 저장하지 않습니다.</li>
        <li>데모 계정으로 체험할 때: 임의로 만든 식별 번호를 저장합니다. 데모 계정을 지나치게 많이 만드는 것을 막으려고 접속 IP 를 되돌릴 수 없게 바꾼 값(해시) 일부를 함께 붙여 둡니다. IP 주소 자체는 저장하지 않습니다.</li>
        <li>주문할 때: 주문서에 직접 적은 받는 분 · 연락처 · 주소와 장바구니 · 주문 내역. 테스트 결제라 실제 정보를 적지 않아도 됩니다.</li>
        <li>결제할 때: 토스페이먼츠가 돌려주는 결제 키와 결제 수단 이름. 카드 번호는 LUMEN 에 전달되지 않습니다.</li>
      </ul>

      <h2 className="mt-10 text-lg">2. 쓰는 곳</h2>
      <p className="mt-3">로그인 유지, 장바구니 저장, 주문 · 결제 처리, 주문 내역 표시, 데모 계정 남용 방지에만 씁니다. 광고 · 마케팅에 쓰거나 다른 곳에 팔지 않습니다.</p>

      <h2 className="mt-10 text-lg">3. 보관 기간</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li>데모 계정은 만든 지 24시간이 지나면 장바구니 · 주문과 함께 지웁니다.</li>
        <li>카카오 · 구글 계정의 정보는 삭제를 요청하면 지웁니다.</li>
      </ul>

      <h2 className="mt-10 text-lg">4. 처리를 맡기는 곳</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li>Vercel — 웹사이트 호스팅</li>
        <li>Neon — 데이터베이스 (싱가포르 리전)</li>
        <li>토스페이먼츠 — 테스트 결제</li>
        <li>카카오 · 구글 — 로그인</li>
      </ul>

      <h2 className="mt-10 text-lg">5. 쿠키</h2>
      <p className="mt-3">로그인 상태를 유지하는 쿠키 하나를 씁니다. 로그인 전 장바구니는 쿠키가 아니라 브라우저 저장소(localStorage)에만 둡니다.</p>

      <h2 className="mt-10 text-lg">6. 문의 · 삭제 요청</h2>
      <p className="mt-3">
        <a href={ISSUES} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-4">
          GitHub 저장소의 이슈
        </a>
        로 남겨 주세요. 로그인 서비스 이름(카카오 · 구글)과 표시 이름을 알려 주시면 해당 정보를 지웁니다.
      </p>
    </article>
  );
}
