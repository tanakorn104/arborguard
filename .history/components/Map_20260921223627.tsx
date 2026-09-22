'use client';
import { MapContainer, TileLayer, Marker, Popup,useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';


// ฟังก์ชันสร้างไอคอนหมุดแบบกำหนดเอง
const createCustomIcon = (status: string, label: string) => {
  // กำหนดสีตามสถานะ (แดง = active, เขียว = resolved)
  const bgColor = status === 'ต้นไม้ล้ม' ? 'bg-red-500' : 'bg-yellow-500';
  const borderColor = status === 'ต้นไม้ล้ม' ? 'border-red-500' : 'border-yellow-500';
  const ringColor = status === 'ต้นไม้ล้ม' ? 'ring-red-500' : 'ring-yellow-500';

  return L.divIcon({
    className: 'custom-leaflet-icon',
    // ปรับจุดกึ่งกลางของหมุดให้อยู่ตรงกลางด้านล่าง
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
    html: `
      <div class="relative flex items-center justify-center">
        <!-- ตัวอักษรข้างหมุด (Label) -->
        <span class="absolute left-8 px-2 py-0.5 rounded-full bg-white text-black text-xs  shadow-sm border ${borderColor}">
          ${label}
        </span>
        
        <!-- ตัวหมุด (เอฟเฟกต์กระเพื่อม + วงกลม) -->
          <div class="relative flex h-6 w-6 items-center justify-center">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bgColor}"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 ${bgColor} ring-2 ${ringColor} ring-offset-1  shadow-lg"></span>
        </div>
      </div>
    `,
  });
};

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap(); // ดึงอินสแตนซ์ของแผนที่ออกมา

  useEffect(() => {
    if (center) {
      // สั่งให้กล้องบินไปที่พิกัดใหม่ (พิกัด, ซูมเลเวล, ออปชัน)
      map.flyTo(center, 17, {
        duration: 1.5, // ความเร็วในการเลื่อน (วินาที)
        easeLinearity: 0.25
      });
    }
  }, [center, map]); // ทำงานใหม่ทุกครั้งที่ center เปลี่ยน

  return null; // คอมโพเนนต์นี้ไม่มี UI แค่คุม Logic
}


export default function Map({ events,focusedLocation }: { events: any[],focusedLocation: [number, number] | null }) {
  // พิกัด ม.เกษตร กำแพงแสน (ตามที่คุณเซ็ตไว้)
  const center: [number, number] = [14.0245, 99.9754];

  return (
    <div className="w-full  h-full rounded-2xl overflow-hidden shadow-xl z-0 relative">
      <MapContainer center={center} zoom={14} className="w-full h-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapController center={focusedLocation} />

        {/* วนลูปวาดหมุดจากฐานข้อมูล */}
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.lat, event.lng]}
            // เรียกใช้ Custom Icon ที่เราสร้าง โดยส่งสถานะและรหัสโหนดไปแสดง
            icon={createCustomIcon(event.event_type, ` ${event.event_type}`)}
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