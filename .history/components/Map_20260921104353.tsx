'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ป้องกัน Error ภาพไอคอนหมุดไม่โหลดบน Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// กำหนดโครงสร้างข้อมูล (Type) สำหรับเหตุการณ์
interface TreeEvent {
  id: number | string;
  node_id: string;
  event_type: string;
  lat: number;
  lng: number;
  timestamp: string | Date;
}

interface MapProps {
  events: TreeEvent[];
}

export default function Map({ events }: MapProps) {
  // ตั้งพิกัดเริ่มต้นไปที่ ม.เกษตรศาสตร์ กำแพงแสน
  const defaultCenter: [number, number] = [14.0245, 99.9732];
  
  // ถ้ามีข้อมูลแจ้งเตือน ให้ศูนย์กลางแผนที่ขยับไปที่พิกัดล่าสุด
  const center: [number, number] = events.length > 0 
    ? [events[0].lat, events[0].lng] 
    : defaultCenter;

  return (
    // กำหนด z-0 เพื่อไม่ให้แผนที่ลอยทับ UI อื่นๆ ของหน้าเว็บ
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-xl z-0 relative">
      <MapContainer center={center} zoom={14} className="w-full h-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {events.map((evt) => (
          <Marker key={evt.id} position={[evt.lat, evt.lng]}>
            <Popup>
              <div className="font-sans">
                <h3 className={`font-bold text-lg ${evt.event_type === 'ต้นไม้ล้ม' ? 'text-red-600' : 'text-orange-500'}`}>
                  🚨 {evt.event_type}
                </h3>
                <p className="text-sm text-gray-600 mt-1"><b>อุปกรณ์:</b> {evt.node_id}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <b>เวลา:</b> {new Date(evt.timestamp).toLocaleString('th-TH')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  GPS: {evt.lat.toFixed(4)}, {evt.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}