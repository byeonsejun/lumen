import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Neon 서버리스 드라이버로 연결한다(풀러 주소). 빌드 시점엔 DATABASE_URL 이 없을 수 있어 첫 사용 때 만든다.
// 개발 중 HMR 로 인스턴스가 늘지 않게 globalThis 에 보관한다
function createClient() {
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function db(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}
