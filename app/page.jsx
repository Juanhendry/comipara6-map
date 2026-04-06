import FloorMap from "@/components/FloorMap";

export const metadata = {
  title: "Interactive Floor Map",
  description: "Jelajahi denah booth artist dan lingkaran kreator (cirles) yang hadir di ajang Comipara 6. Klik pada booth spesifik untuk melihat katalog karya dan detail kreator.",
};

export default function Home() {
  return <FloorMap/>;
}
