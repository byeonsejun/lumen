import type { Product } from "./types";

// 가격·설명·소재는 가짜 데이터. 모델과 치수는 Poly Haven (2026-11-02 api.polyhaven.com/info)
export const PRODUCTS: Product[] = [
  { slug: "ember-sofa", name: "Ember 3인 소파", category: "seating", priceKRW: 1890000, material: "브라운 패브릭 · 원목 다리", description: "낮고 깊은 좌방석에 몸이 잠기는 3인 소파. 저녁 조명 아래에서 가장 따뜻해 보이도록 짙은 갈색 직물을 골랐습니다.", polyhavenId: "sofa_02", dimensionsMm: [1807, 709, 818], featuredOrder: 1 },
  { slug: "halo-lounge-chair", name: "Halo 라운지 체어", category: "seating", priceKRW: 890000, material: "가죽 · 블랙 스틸", description: "곡선 등받이가 어깨를 감싸는 1인 라운지 체어. 책 한 권 분량의 시간을 위해 만들었습니다.", polyhavenId: "modern_arm_chair_01", dimensionsMm: [820, 1023, 987], featuredOrder: 2 },
  { slug: "orbit-coffee-table", name: "Orbit 원형 커피 테이블", category: "table", priceKRW: 540000, material: "오크 원목", description: "모서리 없는 원형 상판이 소파 앞 동선을 부드럽게 만듭니다.", polyhavenId: "coffee_table_round_01", dimensionsMm: [1301, 491, 1301], featuredOrder: 3 },
  { slug: "dusk-pendant", name: "Dusk 펜던트 조명", category: "lighting", priceKRW: 320000, material: "무광 금속 셰이드", description: "아래로만 빛을 떨어뜨려 테이블 위에 작은 무대를 만드는 펜던트 조명.", polyhavenId: "modern_ceiling_lamp_01", dimensionsMm: [432, 952, 432], featuredOrder: 4 },
  { slug: "fern-planter", name: "Fern 대형 화분", category: "decor", priceKRW: 180000, material: "생화 · 세라믹 화분", description: "어두운 방에 초록 하나. 넓게 퍼지는 잎이 조명 그림자를 벽에 그립니다.", polyhavenId: "potted_plant_02", dimensionsMm: [701, 841, 657], featuredOrder: 5 },
  { slug: "velvet-sofa", name: "Velvet 2인 소파", category: "seating", priceKRW: 1390000, material: "벨벳 · 원목 다리", description: "짧은 팔걸이와 단단한 쿠션의 2인 소파. 작은 거실에 맞춘 크기입니다.", polyhavenId: "Sofa_01", dimensionsMm: [1571, 797, 658] },
  { slug: "moss-chair", name: "Moss 체어", category: "seating", priceKRW: 420000, material: "그린 패브릭", description: "깊은 녹색 직물의 1인 의자. 공간에 색 하나를 더할 때.", polyhavenId: "GreenChair_01", dimensionsMm: [673, 1059, 664] },
  { slug: "pebble-ottoman", name: "Pebble 오토만", category: "seating", priceKRW: 260000, material: "패브릭", description: "발을 올리거나 보조 의자로 쓰는 낮은 오토만.", polyhavenId: "Ottoman_01", dimensionsMm: [885, 624, 621] },
  { slug: "classic-armchair", name: "Classic 암체어", category: "seating", priceKRW: 760000, material: "패브릭 · 원목", description: "넓은 팔걸이의 고전적인 암체어.", polyhavenId: "ArmChair_01", dimensionsMm: [848, 1065, 766] },
  { slug: "plank-dining-table", name: "Plank 식탁", category: "table", priceKRW: 980000, material: "원목", description: "두꺼운 원목 상판의 4인 식탁.", polyhavenId: "wooden_table_02", dimensionsMm: [1134, 800, 706] },
  { slug: "gallery-console", name: "Gallery 콘솔", category: "table", priceKRW: 670000, material: "원목 · 조각 장식", description: "현관이나 소파 뒤에 두는 좁고 긴 콘솔 테이블.", polyhavenId: "ClassicConsole_01", dimensionsMm: [1543, 949, 589] },
  { slug: "ladder-display-shelf", name: "Ladder 진열 선반", category: "shelves", priceKRW: 450000, material: "원목", description: "책과 오브제를 계단처럼 올려 두는 진열 선반.", polyhavenId: "wooden_display_shelves_01", dimensionsMm: [1078, 1556, 372] },
  { slug: "loft-steel-shelf", name: "Loft 스틸 선반", category: "shelves", priceKRW: 390000, material: "스틸 프레임 · 원목 판", description: "공구부터 화분까지 버티는 단단한 스틸 선반.", polyhavenId: "steel_frame_shelves_01", dimensionsMm: [1097, 2141, 502] },
  { slug: "noir-commode", name: "Noir 서랍장", category: "shelves", priceKRW: 820000, material: "원목 · 조각 장식", description: "고딕 장식의 낮은 서랍장.", polyhavenId: "GothicCommode_01", dimensionsMm: [1201, 1212, 581] },
  { slug: "siesta-daybed", name: "Siesta 데이베드", category: "bed", priceKRW: 1190000, material: "원목 · 패브릭 매트", description: "낮잠과 손님용 침대를 겸하는 데이베드.", polyhavenId: "vintage_day_bed", dimensionsMm: [1973, 1127, 855] },
  { slug: "cathedral-bed", name: "Cathedral 침대", category: "bed", priceKRW: 2490000, material: "원목 · 조각 장식", description: "높은 머리판의 고딕 양식 퀸 침대.", polyhavenId: "GothicBed_01", dimensionsMm: [1494, 1534, 2040] },
  { slug: "crown-chandelier", name: "Crown 샹들리에", category: "lighting", priceKRW: 690000, material: "황동", description: "식탁 위를 위한 황동 샹들리에.", polyhavenId: "Chandelier_01", dimensionsMm: [746, 798, 816] },
  { slug: "brass-candleholders", name: "Brass 캔들 홀더 세트", category: "lighting", priceKRW: 140000, material: "황동", description: "촛불 세 개가 만드는 가장 낮은 조명.", polyhavenId: "brass_candleholders", dimensionsMm: [1053, 835, 365] },
  { slug: "clay-vase", name: "Clay 세라믹 화병", category: "decor", priceKRW: 79000, material: "세라믹", description: "유약 없이 구운 흙빛 화병.", polyhavenId: "ceramic_vase_01", dimensionsMm: [205, 401, 206] },
  { slug: "heirloom-vase", name: "Heirloom 앤티크 화병", category: "decor", priceKRW: 129000, material: "세라믹 · 앤티크 유약", description: "오래된 유약의 빛바랜 결이 남은 화병.", polyhavenId: "antique_ceramic_vase_01", dimensionsMm: [255, 440, 255] },
];
