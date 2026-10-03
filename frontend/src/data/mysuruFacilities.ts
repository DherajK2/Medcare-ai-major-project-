export interface HealthcareFacility {
  id: string;
  name: string;
  category: 'hospital' | 'clinic' | 'pharmacy';
  address: string;
  phone: string | null;
  speciality: string;
  emergency_available: boolean;
  is_24_hours: boolean;
  latitude: number;
  longitude: number;
  source?: string;
  rating?: number;
  distance_km?: number;
}

export const MYSURU_HEALTHCARE_FACILITIES: HealthcareFacility[] = [
  // ==================== HOSPITALS (7) ====================
  {
    id: 'hosp-1',
    name: 'Apollo BGS Hospitals',
    category: 'hospital',
    address: 'Adichunchanagiri Road, Kuvempu Nagara, Mysuru, Karnataka 570023, India',
    phone: '+918069049759',
    speciality: 'Multispeciality & Tertiary Care',
    emergency_available: true,
    is_24_hours: true,
    latitude: 12.2858,
    longitude: 76.6264,
    rating: 4.8,
    source: 'Verified Medical Directory'
  },
  {
    id: 'hosp-2',
    name: 'Narayana Hospital',
    category: 'hospital',
    address: 'CAH/1, 3rd Phase, Devanur, 2nd Stage, R.S. Naidu Nagar, Mysuru, Karnataka 570019, India',
    phone: '+918062154594',
    speciality: 'Cardiac, Oncology & Super Speciality',
    emergency_available: true,
    is_24_hours: true,
    latitude: 12.3368,
    longitude: 76.6780,
    rating: 4.7,
    source: 'Verified Medical Directory'
  },
  {
    id: 'hosp-3',
    name: 'Manipal Hospital Mysore',
    category: 'hospital',
    address: 'No. 85-86, Bangalore-Mysore Ring Road Junction, Bannimantapa \'A\' Layout, Siddique Nagar, Mandi Mohalla, Mysuru, Karnataka 570015, India',
    phone: '+9118001024647',
    speciality: 'Multispeciality & Organ Transplant',
    emergency_available: true,
    is_24_hours: true,
    latitude: 12.3423,
    longitude: 76.6508,
    rating: 4.6,
    source: 'Verified Medical Directory'
  },
  {
    id: 'hosp-4',
    name: 'DRM Multi Speciality Hospital',
    category: 'hospital',
    address: 'Temple Road, Vontikoppal, Mysuru, Karnataka 570002, India',
    phone: '+918105424247',
    speciality: 'Orthopaedics, Gastroenterology, Pediatrics, Emergency & Critical Care',
    emergency_available: true,
    is_24_hours: true,
    latitude: 12.3275,
    longitude: 76.6342,
    rating: 4.5,
    source: 'Verified Medical Directory'
  },
  {
    id: 'hosp-5',
    name: 'Cauvery Heart and Multi-Speciality Hospital',
    category: 'hospital',
    address: 'Malavalli-Mysore Road, Near Teresian College, Terecian Circle, Siddhartha Layout, Mysuru, Karnataka 570029, India',
    phone: '+918212472424',
    speciality: 'Cardiology, Interventional Radiology & Critical Care',
    emergency_available: true,
    is_24_hours: true,
    latitude: 12.3025,
    longitude: 76.6854,
    rating: 4.6,
    source: 'Verified Medical Directory'
  },
  {
    id: 'hosp-6',
    name: 'St. Joseph\'s Hospital Mysuru',
    category: 'hospital',
    address: 'Bangalore-Mysore Road, Bannimantap, Mysuru, Karnataka 570015, India',
    phone: '+918212331066',
    speciality: 'General Surgery, ICU & Emergency Trauma',
    emergency_available: true,
    is_24_hours: true,
    latitude: 12.3340,
    longitude: 76.6535,
    rating: 4.4,
    source: 'Verified Medical Directory'
  },
  {
    id: 'hosp-7',
    name: 'Nayana Kumar\'s Multi Speciality Hospital',
    category: 'hospital',
    address: '6, 3rd Main Road, near Nethaji Circle, Dattagalli, Mysuru, Karnataka 570022, India',
    phone: '+919513310100',
    speciality: 'Multispeciality & Obstetrics/Gynecology',
    emergency_available: true,
    is_24_hours: true,
    latitude: 12.2812,
    longitude: 76.6085,
    rating: 4.5,
    source: 'Verified Medical Directory'
  },

  // ==================== CLINICS (6) ====================
  {
    id: 'clinic-1',
    name: 'Apollo Clinic',
    category: 'clinic',
    address: 'Panchvati Circle, 23, Kalidasa Road, Vani Vilas Mohalla, Mysuru, Karnataka 570012, India',
    phone: '+9118001031010',
    speciality: 'Day Care, Family Medicine & Specialist Consultations',
    emergency_available: false,
    is_24_hours: false,
    latitude: 12.3248,
    longitude: 76.6305,
    rating: 4.7,
    source: 'Verified Medical Directory'
  },
  {
    id: 'clinic-2',
    name: 'LEELA CLINIC',
    category: 'clinic',
    address: 'Sarvodaya Road, Kuvempunagar 1716, E & F Block, Ramakrishnanagar, Mysuru, Karnataka 570023, India',
    phone: '+918951979925',
    speciality: 'General Practice & Family Consultation',
    emergency_available: false,
    is_24_hours: false,
    latitude: 12.2785,
    longitude: 76.6215,
    rating: 4.4,
    source: 'Verified Medical Directory'
  },
  {
    id: 'clinic-3',
    name: 'Vinayaka Clinic',
    category: 'clinic',
    address: '380, 7th Cross Road, Saraswathipuram, Mysuru, Karnataka 570009, India',
    phone: '+918212332045',
    speciality: 'General Medicine & Pediatric Care',
    emergency_available: false,
    is_24_hours: false,
    latitude: 12.3015,
    longitude: 76.6322,
    rating: 4.6,
    source: 'Verified Medical Directory'
  },
  {
    id: 'clinic-4',
    name: 'Samhita Clinic',
    category: 'clinic',
    address: '142, 6th Main, 8th Cross Road, J.L. Puram, Vani Vilas Mohalla, Mysuru, Karnataka 570002, India',
    phone: '+918212410786',
    speciality: 'Internal Medicine & Chronic Disease Management',
    emergency_available: false,
    is_24_hours: false,
    latitude: 12.3262,
    longitude: 76.6278,
    rating: 4.5,
    source: 'Verified Medical Directory'
  },
  {
    id: 'clinic-5',
    name: 'AcesoBKG\'s Diagnostics & Health Care',
    category: 'clinic',
    address: '574, New Kantharaj Urs Road, near Vijaya Bank Circle, Kuvempunagara North, Kuvempu Nagara, Mysuru, Karnataka 570023, India',
    phone: '+918212347272',
    speciality: 'Pathology, Ultrasound Diagnostics & Health Checkups',
    emergency_available: false,
    is_24_hours: false,
    latitude: 12.2920,
    longitude: 76.6310,
    rating: 4.8,
    source: 'Verified Medical Directory'
  },
  {
    id: 'clinic-6',
    name: 'Narayana Superspeciality Clinic, Shivarampet',
    category: 'clinic',
    address: 'Vinoba Road, Devaraja Mohalla, Shivarampet, Mysuru, Karnataka 570001, India',
    phone: '+918062154596',
    speciality: 'Endocrinology, Cardiology & Nephrology OPD',
    emergency_available: false,
    is_24_hours: false,
    latitude: 12.3115,
    longitude: 76.6492,
    rating: 4.7,
    source: 'Verified Medical Directory'
  },

  // ==================== PHARMACIES (6) ====================
  {
    id: 'pharm-1',
    name: 'Raghulal and Co Medicals (24/7)',
    category: 'pharmacy',
    address: 'Sayyaji Rao Road, Devaraja Mohalla, Mandi Mohalla, Mysuru, Karnataka 570001, India',
    phone: '+918212520733',
    speciality: '24-Hour Retail & Wholesale Medicine, Surgical Supplies',
    emergency_available: false,
    is_24_hours: true,
    latitude: 12.3150,
    longitude: 76.6520,
    rating: 4.9,
    source: 'Verified Medical Directory'
  },
  {
    id: 'pharm-2',
    name: 'Aster Pharmacy - Temple Road Mysore',
    category: 'pharmacy',
    address: 'No. 13/2, Scarlet Towers, Temple Road, near Vidhyaashram College, Jayalakshmipuram, Mysuru, Karnataka 570012, India',
    phone: '+918071178114',
    speciality: 'Prescription Drugs, Diabetic Care & Home Delivery',
    emergency_available: false,
    is_24_hours: false,
    latitude: 12.3290,
    longitude: 76.6335,
    rating: 4.6,
    source: 'Verified Medical Directory'
  },
  {
    id: 'pharm-3',
    name: 'Aster Pharmacy - JP Nagar, Mysore',
    category: 'pharmacy',
    address: 'E Block, JP Nagar, Mysuru, Karnataka 570031, India',
    phone: '+918071178099',
    speciality: 'Pharmacy & Wellness Products',
    emergency_available: false,
    is_24_hours: false,
    latitude: 12.2680,
    longitude: 76.6450,
    rating: 4.5,
    source: 'Verified Medical Directory'
  },
  {
    id: 'pharm-4',
    name: 'Aster Pharmacy - Ramakrishna Nagar, Mysore',
    category: 'pharmacy',
    address: '1633/C, E & F Block, 18th Cross, Ramakrishnanagar, Mysuru, Karnataka 570022, India',
    phone: '+918071178107',
    speciality: 'Genuine Medications, Surgical & Health Supplements',
    emergency_available: false,
    is_24_hours: false,
    latitude: 12.2800,
    longitude: 76.6190,
    rating: 4.6,
    source: 'Verified Medical Directory'
  },
  {
    id: 'pharm-5',
    name: 'Sri Murugan Pharma',
    category: 'pharmacy',
    address: 'Ground Floor, No. 57, C Block, Vijay Nagar 3rd Stage, Sangam Circle, Hutagalli, Karnataka 570030, India',
    phone: '+919980253762',
    speciality: 'Allopathic Medicines, Generic Drugs & First Aid',
    emergency_available: false,
    is_24_hours: false,
    latitude: 12.3390,
    longitude: 76.5920,
    rating: 4.4,
    source: 'Verified Medical Directory'
  },
  {
    id: 'pharm-6',
    name: 'ANJANI PHARMA (24 Hours)',
    category: 'pharmacy',
    address: '22, New Kantharaj Urs Road, CFTRI Layout, Sharadadevi Nagar, Mysuru, Karnataka 570022, India',
    phone: '+918212544122',
    speciality: '24-Hour Emergency Medicines & Medical Equipment',
    emergency_available: false,
    is_24_hours: true,
    latitude: 12.2895,
    longitude: 76.6145,
    rating: 4.7,
    source: 'Verified Medical Directory'
  }
];
