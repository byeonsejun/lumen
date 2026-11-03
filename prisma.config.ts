import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// 로컬은 .env.local(Neon dev 브랜치)을 읽는다. Vercel 빌드에선 환경 변수가 이미 들어 있다
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // 마이그레이션은 풀러를 거치지 않는 직접 연결로. 앱은 src/server/db.ts 에서 풀러 주소(DATABASE_URL)
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
