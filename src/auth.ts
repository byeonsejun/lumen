// 인증은 이 모듈 하나에 모은다. 세션은 JWT(쿠키) — Auth.js 어댑터 · 세션 테이블 없이 우리 User 하나만 쓴다
// (InterestGroup 과 같은 방식. 계획 "스펙에서 조정한 것")
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { clientIp } from "@/server/client-ip";
import { createDemoUser, demoAllowed, demoBucket, purgeExpiredDemoUsers, upsertOAuthUser } from "@/server/users";
import type {} from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** 우리 User.id 와 데모 여부. 로그인 전이면 없다 */
    viewer?: { id: string; name: string | null; isDemo: boolean };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    isDemo?: boolean;
  }
}

const providers: NextAuthConfig["providers"] = [
  // 면접관이 개인 계정 없이 결제 완료 장면까지 볼 수 있게 — 브라우저마다 임시 계정을 만든다 (스펙 4.4)
  Credentials({
    id: "demo",
    name: "데모 계정",
    credentials: {},
    async authorize(_credentials, request) {
      // 운영에서만 IP 별 한도를 건다. 로컬 · e2e 는 같은 주소로 수십 번 만든다
      const bucket = process.env.VERCEL_ENV === "production" ? demoBucket(clientIp(request.headers)) : null;
      if (bucket && !(await demoAllowed(bucket))) return null; // → /login?error=CredentialsSignin
      await purgeExpiredDemoUsers();
      const u = await createDemoUser(new Date(), bucket);
      return { id: u.id, name: u.name };
    },
  }),
];
export const kakaoEnabled = Boolean(process.env.AUTH_KAKAO_ID);
export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID);
if (kakaoEnabled) providers.push(Kakao);
if (googleEnabled) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    async jwt({ token, account, user, profile }) {
      // 최초 로그인 때만 account 가 온다. 우리 User.id 를 토큰에 고정한다
      if (account?.provider === "demo" && user?.id) {
        token.uid = user.id;
        token.isDemo = true;
      } else if (account && (account.provider === "kakao" || account.provider === "google")) {
        const name = (profile?.name as string | undefined) ?? user?.name ?? undefined;
        const u = await upsertOAuthUser(account.provider === "kakao" ? "KAKAO" : "GOOGLE", account.providerAccountId, name);
        token.uid = u.id;
        token.isDemo = false;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.viewer = { id: token.uid, name: session.user?.name ?? null, isDemo: Boolean(token.isDemo) };
      return session;
    },
  },
});

