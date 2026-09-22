'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ฟังก์ชันสร้างไอคอนหมุดแบบกำหนดเอง
const createCustomIcon = (status: string, label: string) => {
  // กำหนดสีตามสถานะ (แดง = active, เขียว = resolved)
  const bgColor = status === 'ต้นไม้ล้ม' ? 'bg-red-500' : 'bg-yellow-300';
  const ringColor = status === 'ต้นไม้ลม' ? 'ring-red-500' : 'bg-yellow-300';

  return L.divIcon({
    className: 'custom-leaflet-icon',
    // ปรับจุดกึ่งกลางของหมุดให้อยู่ตรงกลางด้านล่าง
    iconAnchor: [12, 24], 
    popupAnchor: [0, -24],
    html: `
      <div class="relative flex items-center justify-center">
        <!-- ตัวอักษรข้างหมุด (Label) -->
        <span class="absolute left-8 px-2 py-0.5 rounded bg-slate-800/90 text-white text-xs font-bold whitespace-nowrap shadow-sm border border-slate-700">
          ${label}
        </span>
        
        <!-- ตัวหมุด (เอฟเฟกต์กระเพื่อม + วงกลม) -->
        <div class="relative flex h-6 w-6 items-center justify-center">
          ${status === 'active' ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bgColor}"></span>` : ''}
          <span class="relative inline-flex rounded-full h-4 w-4 ${bgColor} ring-2 ${ringColor} ring-offset-1 ring-offset-slate-900 shadow-lg"></span>
        </div>
      </div>
    `,
  });
};

export default function Map({ events }: { events: any[] }) {
  // พิกัด ม.เกษตร กำแพงแสน (ตามที่คุณเซ็ตไว้)
  const center: [number, number] = [14.0245, 99.9754];

  return (
    <div className="w-full  h-full rounded-2xl overflow-hidden shadow-xl z-0 relative">
      <MapContainer center={center} zoom={14} className="w-full h-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* วนลูปวาดหมุดจากฐานข้อมูล */}
        {events.map((event) => (
          <Marker 
            key={event.id} 
            position={[event.lat, event.lng]}
            // เรียกใช้ Custom Icon ที่เราสร้าง โดยส่งสถานะและรหัสโหนดไปแสดง
            icon={createCustomIcon(event.event_type, `Node: ${event.node_id}`)}
          >
            <Popup className="custom-popup">
              <div className="p-2 text-slate-800">
                <p className="font-bold text-sm">จุดเฝ้าระวัง: {event.node_id}</p>
                <p className="text-xs text-red-600 mt-1 font-semibold">{event.event_type}</p>
                <p className="text-xs text-gray-500 mt-1">เวลา: {new Date(event.created_at).toLocaleString()}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}