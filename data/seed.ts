// Seed data for local development. All trainer entries are illustrative,
// clearly "community-added / unverified" sample data — not real people.

export const ACTIVITIES: { slug: string; name: string; icon: string }[] = [
  { slug: "gym-personal-training", name: "Gym / Personal Training", icon: "🏋️" },
  { slug: "yoga", name: "Yoga", icon: "🧘" },
  { slug: "zumba-dance", name: "Zumba / Dance Fitness", icon: "💃" },
  { slug: "swimming", name: "Swimming", icon: "🏊" },
  { slug: "boxing-mma", name: "Boxing / MMA", icon: "🥊" },
  { slug: "badminton", name: "Badminton", icon: "🏸" },
  { slug: "tennis", name: "Tennis", icon: "🎾" },
  { slug: "running-marathon", name: "Running / Marathon", icon: "🏃" },
  { slug: "calisthenics", name: "Calisthenics", icon: "🤸" },
  { slug: "pilates", name: "Pilates", icon: "🧗" },
  { slug: "crossfit", name: "CrossFit", icon: "🔥" },
  { slug: "strength-conditioning", name: "Strength & Conditioning", icon: "💪" },
  { slug: "kids-fitness", name: "Kids Fitness", icon: "🧒" },
];

export const AREAS: {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
}[] = [
  // ---- Bengaluru ----
  { slug: "indiranagar", name: "Indiranagar", lat: 12.9719, lng: 77.6412, city: "bengaluru" },
  { slug: "koramangala", name: "Koramangala", lat: 12.9352, lng: 77.6245, city: "bengaluru" },
  { slug: "hsr-layout", name: "HSR Layout", lat: 12.9081, lng: 77.6476, city: "bengaluru" },
  { slug: "whitefield", name: "Whitefield", lat: 12.9698, lng: 77.75, city: "bengaluru" },
  { slug: "jayanagar", name: "Jayanagar", lat: 12.925, lng: 77.5938, city: "bengaluru" },
  { slug: "jp-nagar", name: "JP Nagar", lat: 12.9063, lng: 77.5857, city: "bengaluru" },
  { slug: "marathahalli", name: "Marathahalli", lat: 12.9591, lng: 77.6974, city: "bengaluru" },
  { slug: "bellandur", name: "Bellandur", lat: 12.9304, lng: 77.6784, city: "bengaluru" },
  { slug: "btm-layout", name: "BTM Layout", lat: 12.9166, lng: 77.6101, city: "bengaluru" },
  { slug: "electronic-city", name: "Electronic City", lat: 12.8452, lng: 77.6602, city: "bengaluru" },
  { slug: "malleshwaram", name: "Malleshwaram", lat: 13.0035, lng: 77.5647, city: "bengaluru" },
  { slug: "rajajinagar", name: "Rajajinagar", lat: 12.9982, lng: 77.555, city: "bengaluru" },
  { slug: "banashankari", name: "Banashankari", lat: 12.9255, lng: 77.5468, city: "bengaluru" },
  { slug: "yelahanka", name: "Yelahanka", lat: 13.1007, lng: 77.5963, city: "bengaluru" },
  { slug: "hebbal", name: "Hebbal", lat: 13.0358, lng: 77.597, city: "bengaluru" },
  { slug: "sarjapur-road", name: "Sarjapur Road", lat: 12.901, lng: 77.687, city: "bengaluru" },
  { slug: "mg-road", name: "MG Road", lat: 12.9756, lng: 77.6068, city: "bengaluru" },
  { slug: "basavanagudi", name: "Basavanagudi", lat: 12.942, lng: 77.573, city: "bengaluru" },
  { slug: "kalyan-nagar", name: "Kalyan Nagar", lat: 13.0254, lng: 77.6408, city: "bengaluru" },
  { slug: "rt-nagar", name: "RT Nagar", lat: 13.0207, lng: 77.5945, city: "bengaluru" },

  // ---- Mumbai ----
  { slug: "andheri", name: "Andheri", lat: 19.1197, lng: 72.8468, city: "mumbai" },
  { slug: "bandra", name: "Bandra", lat: 19.0596, lng: 72.8295, city: "mumbai" },
  { slug: "powai", name: "Powai", lat: 19.1176, lng: 72.906, city: "mumbai" },
  { slug: "juhu", name: "Juhu", lat: 19.1075, lng: 72.8263, city: "mumbai" },
  { slug: "dadar", name: "Dadar", lat: 19.0178, lng: 72.8478, city: "mumbai" },
  { slug: "lower-parel", name: "Lower Parel", lat: 18.996, lng: 72.8302, city: "mumbai" },
  { slug: "colaba", name: "Colaba", lat: 18.9067, lng: 72.8147, city: "mumbai" },
  { slug: "malad", name: "Malad", lat: 19.186, lng: 72.8484, city: "mumbai" },
  { slug: "borivali", name: "Borivali", lat: 19.2307, lng: 72.8567, city: "mumbai" },
  { slug: "chembur", name: "Chembur", lat: 19.062, lng: 72.9, city: "mumbai" },
  { slug: "goregaon", name: "Goregaon", lat: 19.1663, lng: 72.8526, city: "mumbai" },
  { slug: "thane", name: "Thane", lat: 19.2183, lng: 72.9781, city: "mumbai" },

  // ---- Delhi NCR ----
  { slug: "connaught-place", name: "Connaught Place", lat: 28.6315, lng: 77.2167, city: "delhi-ncr" },
  { slug: "saket", name: "Saket", lat: 28.5245, lng: 77.2066, city: "delhi-ncr" },
  { slug: "dwarka", name: "Dwarka", lat: 28.5921, lng: 77.046, city: "delhi-ncr" },
  { slug: "rohini", name: "Rohini", lat: 28.7439, lng: 77.0728, city: "delhi-ncr" },
  { slug: "gurugram", name: "Gurugram", lat: 28.4595, lng: 77.0266, city: "delhi-ncr" },
  { slug: "noida", name: "Noida", lat: 28.5355, lng: 77.391, city: "delhi-ncr" },
  { slug: "indirapuram", name: "Indirapuram", lat: 28.6412, lng: 77.3729, city: "delhi-ncr" },
  { slug: "vasant-kunj", name: "Vasant Kunj", lat: 28.52, lng: 77.159, city: "delhi-ncr" },
  { slug: "karol-bagh", name: "Karol Bagh", lat: 28.6512, lng: 77.1907, city: "delhi-ncr" },
  { slug: "lajpat-nagar", name: "Lajpat Nagar", lat: 28.5677, lng: 77.2433, city: "delhi-ncr" },
  { slug: "janakpuri", name: "Janakpuri", lat: 28.6217, lng: 77.0878, city: "delhi-ncr" },
  { slug: "greater-noida", name: "Greater Noida", lat: 28.4744, lng: 77.504, city: "delhi-ncr" },
];

interface SeedTrainer {
  name: string;
  gender: string;
  bio: string;
  area: string; // area slug
  modes: string[];
  languages: string[];
  instagram?: string;
  price_min: number;
  price_max: number;
  price_unit: "per_session" | "per_month";
  activities: string[]; // activity slugs
  recommendations: {
    rating: number;
    body: string;
    price_paid: number;
    price_unit: "per_session" | "per_month";
    trained_duration: string;
    helpful: number;
  }[];
}

export const TRAINERS: SeedTrainer[] = [
  {
    name: "Arjun Rao",
    gender: "male",
    bio: "ACE-certified strength coach. Focus on fat loss and beginner-friendly programming.",
    area: "indiranagar",
    modes: ["in_person", "home_visit"],
    languages: ["English", "Kannada", "Hindi"],
    instagram: "arjun.lifts",
    price_min: 8000,
    price_max: 12000,
    price_unit: "per_month",
    activities: ["gym-personal-training", "strength-conditioning"],
    recommendations: [
      {
        rating: 5,
        body: "Helped me lose 9kg in 4 months without crash dieting. Very patient with form correction.",
        price_paid: 10000,
        price_unit: "per_month",
        trained_duration: "4 months",
        helpful: 12,
      },
      {
        rating: 4,
        body: "Knows his stuff on programming. Sometimes runs late but makes up the time.",
        price_paid: 9000,
        price_unit: "per_month",
        trained_duration: "6 months",
        helpful: 5,
      },
    ],
  },
  {
    name: "Meera Nair",
    gender: "female",
    bio: "Hatha & Vinyasa yoga instructor, 500hr RYT. Home visits across east Bengaluru.",
    area: "koramangala",
    modes: ["home_visit", "online"],
    languages: ["English", "Malayalam", "Hindi"],
    instagram: "meera.yoga",
    price_min: 600,
    price_max: 900,
    price_unit: "per_session",
    activities: ["yoga", "pilates"],
    recommendations: [
      {
        rating: 5,
        body: "Gentle but effective. My back pain reduced a lot after 2 months of regular sessions.",
        price_paid: 700,
        price_unit: "per_session",
        trained_duration: "3 months",
        helpful: 18,
      },
    ],
  },
  {
    name: "Rahul Dsouza",
    gender: "male",
    bio: "Ex-state boxer. Boxing and MMA conditioning for all levels.",
    area: "hsr-layout",
    modes: ["in_person"],
    languages: ["English", "Hindi"],
    price_min: 5000,
    price_max: 7000,
    price_unit: "per_month",
    activities: ["boxing-mma", "strength-conditioning"],
    recommendations: [
      {
        rating: 5,
        body: "Real technique, not just cardio. Great if you actually want to learn to box.",
        price_paid: 6000,
        price_unit: "per_month",
        trained_duration: "5 months",
        helpful: 9,
      },
    ],
  },
  {
    name: "Priya Shetty",
    gender: "female",
    bio: "Zumba ZIN instructor. High-energy group and 1:1 dance fitness.",
    area: "jayanagar",
    modes: ["in_person", "online"],
    languages: ["English", "Kannada", "Tulu"],
    instagram: "zumbawithpriya",
    price_min: 2500,
    price_max: 3500,
    price_unit: "per_month",
    activities: ["zumba-dance"],
    recommendations: [
      {
        rating: 5,
        body: "So much fun you forget it's a workout. Classes are packed for a reason.",
        price_paid: 3000,
        price_unit: "per_month",
        trained_duration: "8 months",
        helpful: 22,
      },
      {
        rating: 4,
        body: "Great energy. Wish there were more morning slots.",
        price_paid: 3000,
        price_unit: "per_month",
        trained_duration: "2 months",
        helpful: 3,
      },
    ],
  },
  {
    name: "Vikram Singh",
    gender: "male",
    bio: "Swimming coach, SAI-certified. Adult beginners a specialty.",
    area: "whitefield",
    modes: ["in_person"],
    languages: ["English", "Hindi", "Punjabi"],
    price_min: 800,
    price_max: 1200,
    price_unit: "per_session",
    activities: ["swimming"],
    recommendations: [
      {
        rating: 5,
        body: "I was terrified of water at 32. Could swim a lap in 6 weeks. Incredibly patient.",
        price_paid: 1000,
        price_unit: "per_session",
        trained_duration: "6 weeks",
        helpful: 15,
      },
    ],
  },
  {
    name: "Anita Kumar",
    gender: "female",
    bio: "Certified marathon coach. Couch-to-10k and half-marathon plans.",
    area: "jp-nagar",
    modes: ["in_person", "online"],
    languages: ["English", "Kannada", "Tamil"],
    instagram: "runwithanita",
    price_min: 3000,
    price_max: 4500,
    price_unit: "per_month",
    activities: ["running-marathon"],
    recommendations: [
      {
        rating: 5,
        body: "Took me from zero to finishing TCS 10k. Structured and motivating.",
        price_paid: 4000,
        price_unit: "per_month",
        trained_duration: "4 months",
        helpful: 11,
      },
    ],
  },
  {
    name: "Karthik Reddy",
    gender: "male",
    bio: "Calisthenics and mobility coach. Park-based group sessions.",
    area: "marathahalli",
    modes: ["in_person"],
    languages: ["English", "Telugu", "Kannada"],
    instagram: "karthik.calis",
    price_min: 4000,
    price_max: 5500,
    price_unit: "per_month",
    activities: ["calisthenics", "strength-conditioning"],
    recommendations: [
      {
        rating: 4,
        body: "Got my first pull-ups under him. Outdoor sessions are refreshing.",
        price_paid: 4500,
        price_unit: "per_month",
        trained_duration: "3 months",
        helpful: 7,
      },
    ],
  },
  {
    name: "Sneha Iyer",
    gender: "female",
    bio: "Prenatal and postnatal fitness, plus general personal training for women.",
    area: "btm-layout",
    modes: ["home_visit", "online"],
    languages: ["English", "Tamil", "Hindi"],
    price_min: 7000,
    price_max: 10000,
    price_unit: "per_month",
    activities: ["gym-personal-training", "pilates"],
    recommendations: [
      {
        rating: 5,
        body: "Trained safely through my second trimester. Knows the modifications cold.",
        price_paid: 9000,
        price_unit: "per_month",
        trained_duration: "5 months",
        helpful: 14,
      },
    ],
  },
  {
    name: "Mohammed Faisal",
    gender: "male",
    bio: "CrossFit L2 coach. WOD-style strength and conditioning.",
    area: "bellandur",
    modes: ["in_person"],
    languages: ["English", "Hindi", "Urdu"],
    instagram: "faisal.wod",
    price_min: 6000,
    price_max: 9000,
    price_unit: "per_month",
    activities: ["crossfit", "strength-conditioning"],
    recommendations: [
      {
        rating: 5,
        body: "Pushes you hard but watches form like a hawk. Best conditioning I've had.",
        price_paid: 8000,
        price_unit: "per_month",
        trained_duration: "7 months",
        helpful: 10,
      },
    ],
  },
  {
    name: "Deepa Menon",
    gender: "female",
    bio: "Badminton coach, former university player. Kids and adult batches.",
    area: "malleshwaram",
    modes: ["in_person"],
    languages: ["English", "Malayalam", "Kannada"],
    price_min: 2000,
    price_max: 3000,
    price_unit: "per_month",
    activities: ["badminton", "kids-fitness"],
    recommendations: [
      {
        rating: 4,
        body: "My daughter improved a lot in 3 months. Good with kids.",
        price_paid: 2500,
        price_unit: "per_month",
        trained_duration: "3 months",
        helpful: 6,
      },
    ],
  },
  {
    name: "Sandeep Gowda",
    gender: "male",
    bio: "Tennis coach with 10+ years. Beginner to intermediate.",
    area: "rajajinagar",
    modes: ["in_person"],
    languages: ["English", "Kannada"],
    price_min: 3500,
    price_max: 5000,
    price_unit: "per_month",
    activities: ["tennis"],
    recommendations: [
      {
        rating: 5,
        body: "Solid fundamentals, fixed my serve in a few weeks. Punctual and professional.",
        price_paid: 4500,
        price_unit: "per_month",
        trained_duration: "4 months",
        helpful: 8,
      },
    ],
  },
  {
    name: "Lakshmi Prasad",
    gender: "female",
    bio: "Iyengar yoga, props-based alignment. Great for injury recovery.",
    area: "basavanagudi",
    modes: ["in_person", "home_visit"],
    languages: ["English", "Kannada", "Hindi"],
    instagram: "iyengar.lakshmi",
    price_min: 700,
    price_max: 1000,
    price_unit: "per_session",
    activities: ["yoga"],
    recommendations: [
      {
        rating: 5,
        body: "Deep knowledge of alignment. Helped my frozen shoulder when physio plateaued.",
        price_paid: 800,
        price_unit: "per_session",
        trained_duration: "2 months",
        helpful: 13,
      },
    ],
  },
];
