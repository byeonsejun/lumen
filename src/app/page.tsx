import { getFeatured } from "@/catalog/query";
import { Showroom } from "@/showroom/Showroom";

export default function Home() {
  return <Showroom products={getFeatured()} />;
}
