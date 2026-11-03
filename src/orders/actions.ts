"use server";

import { auth } from "@/auth";
import { paymentSimulation } from "@/payments/toss";
import { findUser } from "@/server/users";
import { createOrder, type CreateOrderResult, type Recipient } from "./create";

export type StartPaymentResult = (CreateOrderResult & { simulation?: boolean; customerKey?: string }) | { error: "signed-out" };

/** 주문서의 `결제하기` — 서버 장바구니로 PENDING 주문을 만들고 결제창에 넘길 값을 돌려준다 */
export async function startPaymentAction(recipient: Recipient): Promise<StartPaymentResult> {
  const id = (await auth())?.viewer?.id;
  if (!id || !(await findUser(id))) return { error: "signed-out" };
  const r = await createOrder(id, recipient);
  if ("error" in r) return r;
  return { ...r, simulation: paymentSimulation(), customerKey: id };
}
