import { useState, useEffect, useMemo } from 'react';
import { HealthcareMapView } from '../components/maps/HealthcareMapView';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MapPin, Phone, Navigation, RefreshCw, Clock, AlertTriangle, Search } from 'lucide-react';
import { MYSURU_HEALTHCARE_FACILITIES, type HealthcareFacility } from '../data/mysuruFacilities';
import hospitalIconImg from '../assets/Hospital_icon.png';
import clinicIconImg from '../assets/Clinic_icon.png';
import pharmacyIconImg from '../assets/Pharmacy_icon.png';

// Haversine formula to calculate accurate distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export default function MapPage() {
  const [userLocation, setUserLocation] = useState<[number, number]>([12.3050, 76.6400]); // Central Mysuru
  const [locating, setLocating] = useState(false);
  const [category, setCategory] = useState<'all' | 'hospital' | 'clinic' | 'pharmacy'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter24Hours, setFilter24Hours] = useState(false);
  const [filterEmergency, setFilterEmergency] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<HealthcareFacility | null>(null);

  const detectLocation = () => {
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setLocating(false);
        },
        (err) => {
          console.warn('Geolocation unavailable, defaulting to central Mysuru', err);
          setLocating(false);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  // Compute live distances for all facilities based on userLocation
  const facilitiesWithDistance = useMemo(() => {
    return MYSURU_HEALTHCARE_FACILITIES.map((f) => ({
      ...f,
      distance_km: calculateDistance(userLocation[0], userLocation[1], f.latitude, f.longitude),
    })).sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
  }, [userLocation]);

  // Counts for each category
  const counts = useMemo(() => {
    return {
      all: facilitiesWithDistance.length,
      hospital: facilitiesWithDistance.filter((f) => f.category === 'hospital').length,
      clinic: facilitiesWithDistance.filter((f) => f.category === 'clinic').length,
      pharmacy: facilitiesWithDistance.filter((f) => f.category === 'pharmacy').length,
    };
  }, [facilitiesWithDistance]);

  const filtered = useMemo(() => {
    return facilitiesWithDistance.filter((f) => {
      const matchesCategory = category === 'all' || f.category === category;
      const matches24Hours = !filter24Hours || f.is_24_hours;
      const matchesEmergency = !filterEmergency || f.emergency_available;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.address.toLowerCase().includes(q) ||
        f.speciality.toLowerCase().includes(q);

      return matchesCategory && matches24Hours && matchesEmergency && matchesSearch;
    });
  }, [facilitiesWithDistance, category, filter24Hours, filterEmergency, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Nearby Care & Healthcare Map
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Mysuru, Karnataka
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Verified real-time GPS directory of 19 hospitals, specialist clinics & 24x7 pharmacies
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={detectLocation}
            disabled={locating}
            className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 transition-colors shadow-sm"
          >
            <RefreshCw size={13} className={`mr-1.5 ${locating ? 'animate-spin' : ''}`} />
            {locating ? 'Detecting GPS...' : '📍 My Location'}
          </button>
          <Badge variant="info" size="sm">
            ⚡ Live GPS Active
          </Badge>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setCategory('all')}
          className={`p-3 rounded-xl border text-left transition-all ${
            category === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80">All Providers</div>
          <div className="text-xl font-extrabold">{counts.all} Facilities</div>
        </button>

        <button
          onClick={() => setCategory('hospital')}
          className={`p-3 rounded-xl border text-left transition-all ${
            category === 'hospital'
              ? 'bg-red-600 text-white border-red-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
          }`}
        >
          <div className="text-[11px] font-medium flex items-center gap-1.5 opacity-90">
            <div className="w-4 h-4 rounded-full bg-white p-0.5 shadow-sm inline-flex items-center justify-center">
              <img src={hospitalIconImg} alt="Hospital" className="w-full h-full object-contain" />
            </div>
            Hospitals
          </div>
          <div className="text-xl font-extrabold text-red-600 group-hover:text-red-700 mt-0.5">
            <span className={category === 'hospital' ? 'text-white' : 'text-red-600'}>{counts.hospital}</span>
          </div>
        </button>

        <button
          onClick={() => setCategory('clinic')}
          className={`p-3 rounded-xl border text-left transition-all ${
            category === 'clinic'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="text-[11px] font-medium flex items-center gap-1.5 opacity-90">
            <div className="w-4 h-4 rounded-full bg-white p-0.5 shadow-sm inline-flex items-center justify-center">
              <img src={clinicIconImg} alt="Clinic" className="w-full h-full object-contain" />
            </div>
            Clinics
          </div>
          <div className="text-xl font-extrabold mt-0.5">
            <span className={category === 'clinic' ? 'text-white' : 'text-blue-600'}>{counts.clinic}</span>
          </div>
        </button>

        <button
          onClick={() => setCategory('pharmacy')}
          className={`p-3 rounded-xl border text-left transition-all ${
            category === 'pharmacy'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
          }`}
        >
          <div className="text-[11px] font-medium flex items-center gap-1.5 opacity-90">
            <div className="w-4 h-4 rounded-full bg-white p-0.5 shadow-sm inline-flex items-center justify-center">
              <img src={pharmacyIconImg} alt="Pharmacy" className="w-full h-full object-contain" />
            </div>
            Pharmacies
          </div>
          <div className="text-xl font-extrabold mt-0.5">
            <span className={category === 'pharmacy' ? 'text-white' : 'text-emerald-600'}>{counts.pharmacy}</span>
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-gray-500 mr-1">Filter:</span>
          <button
            onClick={() => setFilter24Hours(!filter24Hours)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
              filter24Hours
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Clock size={12} /> ⚡ 24x7 Open
          </button>

          <button
            onClick={() => setFilterEmergency(!filterEmergency)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
              filterEmergency
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle size={12} /> 🚨 Emergency Ready
          </button>

          {(filter24Hours || filterEmergency || category !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setCategory('all');
                setFilter24Hours(false);
                setFilterEmergency(false);
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 font-bold hover:underline ml-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search Apollo, Raghulal, Kuvempunagar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-xl pl-8 pr-3 py-1.5 text-xs bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Map & Facility List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Map View */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <HealthcareMapView
            facilities={filtered}
            userLocation={userLocation}
            selectedFacilityId={selectedFacility?.id}
            onSelectFacility={(f) => setSelectedFacility(f)}
          />
        </div>

        {/* Facility Directory List */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3 overflow-y-auto max-h-[540px] pr-1">
          <div className="flex items-center justify-between sticky top-0 bg-gray-50/90 backdrop-blur-sm py-1 z-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Matching Facilities ({filtered.length})
            </h2>
            <span className="text-[11px] text-gray-400">Click to focus map</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 text-xs">
              No healthcare facilities found matching your active filters.
            </div>
          ) : (
            filtered.map((f) => {
              const isSelected = selectedFacility?.id === f.id;
              const isPharmacy = f.category === 'pharmacy';
              const isClinic = f.category === 'clinic';

              const badgeColor = isPharmacy
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : isClinic
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : 'bg-red-100 text-red-800 border-red-200';

              const iconSrc = isPharmacy ? pharmacyIconImg : isClinic ? clinicIconImg : hospitalIconImg;
              const iconBorder = isPharmacy ? 'border-emerald-500 bg-emerald-50' : isClinic ? 'border-blue-500 bg-blue-50' : 'border-red-500 bg-red-50';

              return (
                <Card
                  key={f.id}
                  onClick={() => setSelectedFacility(f)}
                  className={`p-4 border-2 transition-all cursor-pointer rounded-2xl ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl border-2 p-1 shadow-sm flex-shrink-0 flex items-center justify-center ${iconBorder}`}>
                        <img src={iconSrc} alt={f.category} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-snug">{f.name}</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{f.speciality}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {f.distance_km} km
                      </span>
                      {f.is_24_hours && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full border border-amber-200">
                          ⚡ 24/7
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 flex items-start mt-2.5 leading-relaxed">
                    <MapPin size={13} className="mr-1.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{f.address}</span>
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${badgeColor}`}>
                      {f.category}
                    </span>

                    <div className="flex items-center space-x-2">
                      {f.phone && (
                        <a
                          href={`tel:${f.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                        >
                          <Phone size={11} /> Call
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${f.name}, ${f.address}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg shadow-sm transition-colors"
                      >
                        <Navigation size={11} /> Directions
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}