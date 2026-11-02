import { expect, it } from "vitest";
import { getFeatured } from "@/catalog/query";
import { ROOM_LAYOUT } from "@/showroom/layout";

it("featured 가구는 모두 방 배치가 있다", () => expect(getFeatured().every((p) => ROOM_LAYOUT[p.slug])).toBe(true));
