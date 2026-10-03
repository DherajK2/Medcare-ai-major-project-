import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { HealthcareFacility } from '../../data/mysuruFacilities';
import hospitalIconImg from '../../assets/Hospital_icon.png';
import clinicIconImg from '../../assets/Clinic_icon.png';
import pharmacyIconImg from '../../assets/Pharmacy_icon.png';
import mapDirectionIcon from '../../assets/Map_Direction_icon.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom category icons using user's uploaded asset images
const createCategoryIcon = (category: string, isSelected: boolean = false) => {
  const cat = category.toLowerCase();
  let iconSrc = hospitalIconImg;
  let bg = '#EF4444'; // Red for Hospital
  let badgeLabel = 'Hospital';

  if (cat.includes('pharmacy') || cat.includes('medicals') || cat.includes('pharma')) {
    iconSrc = pharmacyIconImg;
    bg = '#10B981'; // Green for Pharmacy
    badgeLabel = 'Pharmacy';
  } else if (cat.includes('clinic') || cat.includes('diagnostic')) {
    iconSrc = clinicIconImg;
    bg = '#3B82F6'; // Blue for Clinic
    badgeLabel = 'Clinic';
  }

  const selectedRing = isSelected ? 'scale: 1.25; z-index: 1000;' : '';

  return L.divIcon({
    className: 'custom-healthcare-pin',
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 52px;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        ${selectedRing}
        transition: transform 0.2s ease;
      ">
        <!-- Pin Top Bubble with Asset Image -->
        <div style="
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #ffffff;
          border: 3.5px solid ${bg};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          overflow: hidden;
          padding: 3px;
        ">
          <img src="${iconSrc}" alt="${badgeLabel}" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <!-- Pin Bottom Pointer Tip Landing on Location -->
        <div style="
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 10px solid ${bg};
          margin-top: -3px;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
        "></div>
      </div>
    `,
    iconSize: [44, 52],
    iconAnchor: [22, 49], // Bottom pointer tip rests precisely on GPS coordinate
    popupAnchor: [0, -50],
  });
};

const userBeaconIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      background: #06B6D4;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 15px;
      box-shadow: 0 0 0 7px rgba(6, 182, 212, 0.4);
      border: 2.5px solid #FFFFFF;
    ">
      📍
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

function MapFlyToController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || 14, { duration: 1.0 });
  }, [center[0], center[1], zoom, map]);
  return null;
}

export function HealthcareMapView({
  facilities,
  userLocation,
  selectedFacilityId,
  onSelectFacility,
}: {
  facilities: HealthcareFacility[];
  userLocation?: [number, number];
  selectedFacilityId?: string | null;
  onSelectFacility?: (facility: HealthcareFacility) => void;
}) {
  // Default to user location or central Mysuru
  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);
  const center: [number, number] = selectedFacility
    ? [selectedFacility.latitude, selectedFacility.longitude]
    : userLocation || [12.3050, 76.6400];

  return (
    <div className="relative h-[480px] sm:h-[540px] rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md">
      {/* Visual Category Legend Overlay */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-lg border border-slate-200 text-xs font-semibold flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border border-red-500 bg-white p-0.5 shadow-sm flex items-center justify-center">
            <img src={hospitalIconImg} alt="Hospital" className="w-full h-full object-contain" />
          </div>
          <span className="text-gray-800">Hospital (7)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border border-blue-500 bg-white p-0.5 shadow-sm flex items-center justify-center">
            <img src={clinicIconImg} alt="Clinic" className="w-full h-full object-contain" />
          </div>
          <span className="text-gray-800">Clinic (6)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border border-emerald-500 bg-white p-0.5 shadow-sm flex items-center justify-center">
            <img src={pharmacyIconImg} alt="Pharmacy" className="w-full h-full object-contain" />
          </div>
          <span className="text-gray-800">Pharmacy (6)</span>
        </div>
      </div>

      <MapContainer center={center} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFlyToController center={center} zoom={selectedFacility ? 15 : 13} />

        {userLocation && (
          <Marker position={userLocation} icon={userBeaconIcon}>
            <Popup>
              <div className="text-xs p-1">
                <strong className="text-cyan-700 block text-sm">📍 Your Location</strong>
                <p className="text-gray-500 mt-0.5">Searching nearby healthcare providers in Mysuru</p>
              </div>
            </Popup>
          </Marker>
        )}

        {facilities.map((f) => {
          const isSelected = f.id === selectedFacilityId;
          const isPharmacy = f.category === 'pharmacy';
          const isClinic = f.category === 'clinic';
          const categoryBadgeColor = isPharmacy
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
            : isClinic
            ? 'bg-blue-100 text-blue-800 border-blue-300'
            : 'bg-red-100 text-red-800 border-red-300';

          return (
            <Marker
              key={f.id}
              position={[f.latitude, f.longitude]}
              icon={createCategoryIcon(f.category, isSelected)}
              eventHandlers={{
                click: () => onSelectFacility && onSelectFacility(f),
              }}
            >
              <Popup>
                <div className="min-w-[240px] max-w-[280px] p-1 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${categoryBadgeColor}`}>
                      {f.category}
                    </span>
                    {f.is_24_hours && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded-full">
                        ⚡ 24x7
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-sm leading-tight">{f.name}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">{f.speciality}</p>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-snug border-t border-gray-100 pt-1">
                    📍 {f.address}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 gap-2">
                    {f.phone ? (
                      <a
                        href={`tel:${f.phone}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors"
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                      >
                        📞 Call
                      </a>
                    ) : <span />}

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${f.name}, ${f.address}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:opacity-95 transition-all"
                      style={{
                        backgroundColor: '#1E40AF',
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        fontWeight: 700,
                      }}
                    >
                      <img
                        src={mapDirectionIcon}
                        alt="Map"
                        className="w-4 h-4 object-contain rounded-sm"
                      />
                      <span style={{ color: '#FFFFFF' }}>Navigate</span>
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}