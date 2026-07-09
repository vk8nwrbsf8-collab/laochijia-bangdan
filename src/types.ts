export type Rating = '夯' | '顶级' | '人上人' | 'NPC' | '拉';

export interface UserProfile {
  nickname: string;
  avatar_url?: string;
  banner_title?: string;
  dish_banner_title?: string;
  banner_slogan?: string;
  theme_mode?: 'light' | 'dark';
  created_at?: number;
  updated_at?: number;
}

export interface DishEvaluation {
  name: string;
  like: boolean;
}

export interface Shop {
  id: string;
  name: string;
  city: string;
  category: string;
  avg_price?: number;
  rating: Rating;
  comment?: string;
  images?: string[];
  dianping_url?: string;
  dishes?: DishEvaluation[];
  sort_order?: number;
  created_at: number;
  updated_at?: number;
}

export interface Dish {
  id: string;
  name: string;
  shop_id?: string;
  shop_name?: string;
  city: string;
  category: string;
  price?: number;
  rating: Rating;
  comment?: string;
  images?: string[];
  dianping_url?: string;
  sort_order?: number;
  created_at: number;
  updated_at?: number;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: string;
  path: string | null;
  authInfo: any;
}
