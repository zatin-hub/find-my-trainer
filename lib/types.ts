export type Mode = "in_person" | "home_visit" | "online";
export type PriceUnit = "per_session" | "per_month";

export interface Activity {
  id: number;
  slug: string;
  name: string;
  icon: string;
}

export interface Area {
  id: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Trainer {
  id: number;
  slug: string;
  name: string;
  gender: string | null;
  bio: string | null;
  area_id: number;
  area_name: string;
  lat: number;
  lng: number;
  modes: Mode[];
  languages: string[];
  contact_instagram: string | null;
  contact_phone: string | null;
  price_min: number | null;
  price_max: number | null;
  price_unit: PriceUnit | null;
  status: "pending" | "approved" | "rejected";
  claimed: boolean;
  verified: boolean;
  activities: Activity[];
  rec_count: number;
  avg_rating: number | null;
  created_at: string;
}

export interface Recommendation {
  id: number;
  trainer_id: number;
  activity_id: number | null;
  activity_name: string | null;
  rating: number | null;
  would_recommend: number;
  body: string;
  price_paid: number | null;
  price_unit: PriceUnit | null;
  trained_duration: string | null;
  helpful_count: number;
  status: "pending" | "approved" | "rejected";
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface SeekerPin {
  id: number;
  email: string;
  activity_id: number | null;
  area_id: number | null;
  radius_m: number;
  budget_max: number | null;
  created_at: string;
}
