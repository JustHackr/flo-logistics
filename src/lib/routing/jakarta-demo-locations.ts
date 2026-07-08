export type StopAccessRequirement = "CAR_ONLY" | "MOTORCYCLE_ONLY" | "BOTH";

export type DemoLocation = {
  address: string;
  lat: number;
  lng: number;
  accessRequirement: StopAccessRequirement;
};

export const JAKARTA_WAREHOUSE = {
  name: "Blok M Square Warehouse",
  address: "Blok M Square, Jakarta, Indonesia",
  lat: -6.2445,
  lng: 106.8001,
} as const;

/** Demo delivery stops — addresses paired with coordinates on real Jakarta corridors. */
export const JAKARTA_DEMO_LOCATIONS: DemoLocation[] = [
  {
    address: "Jl. Sudirman Blok A, Jakarta",
    lat: -6.2148,
    lng: 106.827,
    accessRequirement: "CAR_ONLY",
  },
  {
    address: "Jl. Gatot Subroto RT 05, Jakarta",
    lat: -6.229,
    lng: 106.835,
    accessRequirement: "CAR_ONLY",
  },
  {
    address: "Jl. Thamrin Gang 2, Jakarta",
    lat: -6.1915,
    lng: 106.8343,
    accessRequirement: "MOTORCYCLE_ONLY",
  },
  {
    address: "Jl. Kuningan Raya, Jakarta",
    lat: -6.2245,
    lng: 106.8319,
    accessRequirement: "BOTH",
  },
  {
    address: "Jl. Menteng Lorong, Jakarta",
    lat: -6.1987,
    lng: 106.8331,
    accessRequirement: "MOTORCYCLE_ONLY",
  },
  {
    address: "Jl. Casablanca Dalam, Jakarta",
    lat: -6.2384,
    lng: 106.8605,
    accessRequirement: "CAR_ONLY",
  },
  {
    address: "Jl. Cikini Raya, Jakarta",
    lat: -6.212,
    lng: 106.8432,
    accessRequirement: "BOTH",
  },
  {
    address: "Jl. Pancoran Gang Kecil, Jakarta",
    lat: -6.2662,
    lng: 106.8479,
    accessRequirement: "MOTORCYCLE_ONLY",
  },
  {
    address: "Jl. Kebon Sirih, Jakarta",
    lat: -6.1875,
    lng: 106.8237,
    accessRequirement: "CAR_ONLY",
  },
  {
    address: "Jl. Palmerah Dalam, Jakarta",
    lat: -6.2142,
    lng: 106.7937,
    accessRequirement: "BOTH",
  },
  {
    address: "Jl. Kebayoran Lama 11, Jakarta",
    lat: -6.2428,
    lng: 106.7859,
    accessRequirement: "CAR_ONLY",
  },
  {
    address: "Jl. Kelapa Gading Gang 7, Jakarta",
    lat: -6.131,
    lng: 106.905,
    accessRequirement: "MOTORCYCLE_ONLY",
  },
  {
    address: "Jl. Fatmawati Raya, Jakarta",
    lat: -6.292,
    lng: 106.794,
    accessRequirement: "BOTH",
  },
  {
    address: "Jl. Senopati Dalam, Jakarta",
    lat: -6.235,
    lng: 106.811,
    accessRequirement: "MOTORCYCLE_ONLY",
  },
  {
    address: "Jl. Kemang Selatan, Jakarta",
    lat: -6.261,
    lng: 106.815,
    accessRequirement: "BOTH",
  },
  {
    address: "Jl. Tebet Dalam, Jakarta",
    lat: -6.228,
    lng: 106.851,
    accessRequirement: "CAR_ONLY",
  },
  {
    address: "Jl. Rawamangun Muka, Jakarta",
    lat: -6.187,
    lng: 106.872,
    accessRequirement: "MOTORCYCLE_ONLY",
  },
  {
    address: "Jl. Pluit Permai, Jakarta",
    lat: -6.121,
    lng: 106.79,
    accessRequirement: "CAR_ONLY",
  },
  {
    address: "Jl. Tanjung Duren Raya, Jakarta",
    lat: -6.178,
    lng: 106.787,
    accessRequirement: "BOTH",
  },
  {
    address: "Jl. Pasar Minggu Raya, Jakarta",
    lat: -6.289,
    lng: 106.843,
    accessRequirement: "MOTORCYCLE_ONLY",
  },
];

export function getDemoLocation(index: number): DemoLocation {
  const base = JAKARTA_DEMO_LOCATIONS[index % JAKARTA_DEMO_LOCATIONS.length];
  if (index < JAKARTA_DEMO_LOCATIONS.length) return base;

  const cycle = Math.floor(index / JAKARTA_DEMO_LOCATIONS.length);
  const jitter = cycle * 0.002;
  return {
    ...base,
    lat: Math.round((base.lat + jitter) * 10000) / 10000,
    lng: Math.round((base.lng + jitter) * 10000) / 10000,
  };
}
