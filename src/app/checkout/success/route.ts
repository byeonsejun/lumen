import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { confirmOrder } from "@/orders/confirm";
import { paymentSimulation, simulatedConfirm, tossConfirm } from "@/payments/toss";

/** 토스 successUrl — 서버가 금액을 확인하고 승인한다. 새로고침해도 두 번 승인하지 않는다 */
export async function GET(request: NextRequest) {
  const userId = (await auth())?.viewer?.id;
  const url = request.nextUrl;
  if (!userId) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(url.pathname + url.search)}`, url));
  const sim = paymentSimulation() && (url.searchParams.get("paymentKey") ?? "").startsWith("sim_");
  const r = await confirmOrder(
    userId,
    { paymentKey: url.searchParams.get("paymentKey"), orderId: url.searchParams.get("orderId"), amount: url.searchParams.get("amount") },
    sim ? simulatedConfirm : tossConfirm,
  );
  if (r.result === "rejected") return NextResponse.redirect(new URL(`/checkout/fail?reason=${r.reason}`, url));
  return NextResponse.redirect(new URL(`/orders/${r.orderId}/complete`, url));
}
