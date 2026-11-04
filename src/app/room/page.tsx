import type { Metadata } from "next";
import { RoomPlanner } from "@/room/RoomPlanner";

export const metadata: Metadata = { title: "내 방에 놓아 보기 — LUMEN" };

export default function RoomPage() {
  return <RoomPlanner />;
}
