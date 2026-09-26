'use client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';


// ฟังก์ชันสร้างไอคอนหมุดแบบกำหนดเอง
const createCustomIcon = (activeEvent:any) => {
  // กำหนดสีตามสถานะ (แดง = active, เขียว = resolved)
  let bgColor =     'bg-green-500';
  let borderColor = 'border-green-500';
  let ringColor = 'ring-green-500';
  if(activeEvent==undefined){
    bgColor =     'bg-green-500';
    borderColor = 'border-green-500';
    ringColor = 'ring-green-500';

  }else{
    bgColor = activeEvent.event_type === 'ต้นไม้ล้ม' ? 'bg-red-500' : 'bg-yellow-500';
    borderColor = activeEvent.event_type === 'ต้นไม้ล้ม' ? 'border-red-500' : 'border-yellow-500';
    ringColor = activeEvent.event_type === 'ต้นไม้ล้ม' ? 'ring-red-500' : 'ring-yellow-500';
    
  }

  return L.divIcon({
    className: 'custom-leaflet-icon',
    // ปรับจุดกึ่งกลางของหมุดให้อยู่ตรงกลางด้านล่าง
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
    html: `
      <div class="relative flex items-center justify-center" key="${activeEvent.node_id}">
        <!-- ตัวอักษรข้างหมุด (Label) -->
        ${activeEvent!=undefined &&activeEvent.status == 'active' ? `<span class="absolute left-8 px-5 py-2 rounded-full bg-white text-black text-xs  whitespace-nowrap shadow-sm border ${borderColor}">
       
            <span>${new Date(activeEvent.created_at).toLocaleDateString('th-TH')}</span>
                      <span>${new Date(activeEvent.created_at).toLocaleTimeString('th-TH')}</span>
        </span>`: ''}
        
        <!-- ตัวหมุด (เอฟเฟกต์กระเพื่อม + วงกลม) -->
          <div class="relative flex h-6 w-6 items-center justify-center">
      
           ${activeEvent!=undefined && activeEvent.status == 'active' ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bgColor}"></span>` : ''}
          
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


export default function Map({ devices, events, focusedLocation }: { devices: any[], events: any[], focusedLocation: [number, number] | null }) {
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
        {devices.map((device) => {
          const activeEvent = events.find(
            item => item.node_id === device.node_id && item.status === "active"
          );
          return (<Marker
            key={device.id}
            position={[device.lat, device.lng]}
            // เรียกใช้ Custom Icon ที่เราสร้าง โดยส่งสถานะและรหัสโหนดไปแสดง
            // icon={createCustomIcon(device.event_type, ` ${device.event_type}`, device.created_at, device.status)}
            icon={createCustomIcon(activeEvent)}
          >
            <Popup className="custom-popup">
              <div className="p-2 text-slate-800">
                <p className="font-bold text-sm">จุดเฝ้าระวัง: {device.node_id}</p>
                <p className="text-xs text-red-600 mt-1 font-semibold">{device.event_type}</p>
                <p className="text-xs text-gray-500 mt-1">เวลา: {new Date(device.created_at).toLocaleString()}</p>
              </div>
            </Popup>
          </Marker>)
        })}
      </MapContainer>
    </div>
  );
}