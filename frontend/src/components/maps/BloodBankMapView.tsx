import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import hospitalIconImg from '../../assets/Hospital_icon.png';
import mapDirectionIcon from '../../assets/Map_Direction_icon.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export interface BloodBankFacility {
  id: string;
  name: string;
  address: string;
  phone: string;
  is24x7: string;
  type: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
}

// Custom Red Blood Bank Pin
const createBloodBankIcon = (isSelected: boolean = false) => {
  const selectedRing = isSelected ? 'transform: scale(1.28); z-index: 1000;' : '';

  return L.divIcon({
    className: 'custom-bloodbank-pin',
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
        <div style="
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 3.5px solid #DC2626;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(220, 38, 38, 0.45);
          overflow: hidden;
          padding: 2px;
        ">
          <img src="${hospitalIconImg}" alt="Blood Bank" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 10px solid #DC2626;
          margin-top: -3px;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
        "></div>
      </div>
    `,
    iconSize: [44, 52],
    iconAnchor: [22, 49],
    popupAnchor: [0, -50],
  });
};

const userBeaconIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      background: #0284C7;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 15px;
      box-shadow: 0 0 0 7px rgba(2, 132, 199, 0.35);
      border: 2.5px solid #FFFFFF;
    ">
      📍
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13, { duration: 1.2 });
  }, [center, map]);
  return null;
}

interface BloodBankMapViewProps {
  bloodBanks: BloodBankFacility[];
  userLocation: [number, number];
  selectedId?: string | null;
  onSelect?: (bb: BloodBankFacility) => void;
  onCall?: (bb: BloodBankFacility) => void;
}

export function BloodBankMapView({
  bloodBanks,
  userLocation,
  selectedId,
  onSelect,
  onCall,
}: BloodBankMapViewProps) {
  return (
    <div className="relative w-full h-[380px] sm:h-[450px] rounded-2xl overflow-hidden border border-red-200 shadow-md">
      <MapContainer
        center={userLocation}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <RecenterMap center={userLocation} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* User Real-Time Location Marker */}
        <Marker position={userLocation} icon={userBeaconIcon}>
          <Popup>
            <div className="p-1.5 text-center">
              <span className="font-bold text-sky-700 text-xs block">Your Live Location</span>
              <span className="text-[11px] text-gray-500">Real-time GPS center</span>
            </div>
          </Popup>
        </Marker>

        {/* 12 Blood Banks Markers */}
        {bloodBanks.map((bb) => (
          <Marker
            key={bb.id}
            position={[bb.latitude, bb.longitude]}
            icon={createBloodBankIcon(selectedId === bb.id)}
            eventHandlers={{
              click: () => onSelect && onSelect(bb),
            }}
          >
            <Popup className="custom-facility-popup" maxWidth={300}>
              <div className="p-2 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-1.5">
                  <h4 className="font-bold text-gray-900 text-sm leading-tight">{bb.name}</h4>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">
                    {bb.id}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    24×7 Active
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                    {bb.type}
                  </span>
                  {bb.distance_km !== undefined && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      📍 {bb.distance_km} km away
                    </span>
                  )}
                </div>

                <p className="text-gray-600 leading-snug">{bb.address}</p>

                <div className="pt-2 border-t border-gray-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onCall ? onCall(bb) : (window.location.href = `tel:${bb.phone.replace(/[^0-9+]/g, '')}`)}
                    className="flex-1 text-center py-1.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    🤖 Inquire / Call
                  </button>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${bb.name}, ${bb.address}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-1.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <img src={mapDirectionIcon} alt="Route" className="w-3.5 h-3.5 object-contain" />
                    <span>Navigate</span>
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
