export type Profile = {
  id: string;
  full_name: string;
  username: string | null;
  bio: string;
  avatar_url: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  date_of_birth: string | null;
  gender: string;
  languages: string[];
  linkedin_url: string;
  instagram_url: string;
  facebook_url: string;
  photos: { url: string; caption?: string }[];
  videos: { url: string; caption?: string }[];
  is_onboarded: boolean;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
};

export type TravelPreference = {
  id: string;
  user_id: string;
  travel_style: TravelStyle;
  budget_range: BudgetRange;
  accommodation: AccommodationType;
  group_size: GroupSize;
  interests: string[];
  dietary: string;
  drinking: string;
  smoking: string;
  created_at: string;
  updated_at: string;
};

export type TravelPlan = {
  id: string;
  user_id: string;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  country: string;
  start_date: string | null;
  end_date: string | null;
  description: string;
  is_flexible: boolean;
  status: TravelPlanStatus;
  created_at: string;
  updated_at: string;
};

export type Match = {
  id: string;
  user_id_1: string;
  user_id_2: string;
  status: MatchStatus;
  acted_by: string | null;
  compatibility_score: number;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  match_id: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  media_url: string;
  is_read: boolean;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export type TravelStyle = 'adventure' | 'relaxation' | 'cultural' | 'party' | 'eco' | 'luxury';
export type BudgetRange = 'budget' | 'mid-range' | 'luxury' | 'no-limit';
export type AccommodationType = 'hotel' | 'hostel' | 'airbnb' | 'camping' | 'resort';
export type GroupSize = 'solo-pair' | 'small-group' | 'large-group' | 'any';
export type TravelPlanStatus = 'planning' | 'confirmed' | 'completed' | 'cancelled';
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';
export type MessageType = 'text' | 'image' | 'video' | 'system';

export const TRAVEL_STYLES: { value: TravelStyle; label: string; icon: string }[] = [
  { value: 'adventure', label: 'Adventure', icon: 'Mountain' },
  { value: 'relaxation', label: 'Relaxation', icon: 'Palmtree' },
  { value: 'cultural', label: 'Cultural', icon: 'Landmark' },
  { value: 'party', label: 'Nightlife', icon: 'Music' },
  { value: 'eco', label: 'Eco Travel', icon: 'Leaf' },
  { value: 'luxury', label: 'Luxury', icon: 'Gem' },
];

export const BUDGET_RANGES: { value: BudgetRange; label: string }[] = [
  { value: 'budget', label: 'Budget' },
  { value: 'mid-range', label: 'Mid-Range' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'no-limit', label: 'No Limit' },
];

export const ACCOMMODATION_TYPES: { value: AccommodationType; label: string }[] = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'camping', label: 'Camping' },
  { value: 'resort', label: 'Resort' },
];

export const GROUP_SIZES: { value: GroupSize; label: string }[] = [
  { value: 'solo-pair', label: 'Solo / Pair' },
  { value: 'small-group', label: 'Small Group (3-5)' },
  { value: 'large-group', label: 'Large Group (6+)' },
  { value: 'any', label: 'Any Size' },
];

export const INTERESTS = [
  'Photography', 'Hiking', 'Surfing', 'Diving', 'Food & Dining',
  'History', 'Art', 'Music', 'Dancing', 'Yoga',
  'Wildlife', 'Architecture', 'Shopping', 'Sports', 'Wine & Beer',
  'Festivals', 'Road Trips', 'Backpacking', 'Skiing', 'Cooking',
];

export const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian',
  'Portuguese', 'Mandarin', 'Japanese', 'Korean', 'Arabic',
  'Hindi', 'Russian', 'Dutch', 'Swedish', 'Turkish',
  'Thai', 'Vietnamese', 'Greek', 'Polish', 'Czech',
];
