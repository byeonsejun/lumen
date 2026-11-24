import type { Metadata } from "next";
import { ogFor } from "@/seo/share";
import { RoomPlanner } from "@/room/RoomPlanner";

export const metadata: Metadata = {
  title: "내 방에 놓아 보기",
  description: "방 크기를 넣고 LUMEN 가구를 3D로 놓아 보며 내 방에 어울리는지 미리 확인해 보세요",
  alternates: { canonical: "/room" },
  openGraph: ogFor("/room"),
};

export default function RoomPage() {
  return <RoomPlanner />;
}
