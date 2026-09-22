'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';

// โหลด Map Component แบบไม่พึ่งพาระบบ Server-Side Rendering
// ปิด Server-Side Rendering สำหรับคอมโพเนนต์แผนที่โดยเฉพาะ
const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false, // <--- จุดสำคัญ: ห้ามเรนเดอร์ฝั่ง Server เด็ดขาด
  loading: () => <p>กำลังโหลดแผนที่...</p> // (ทางเลือก) ข้อความตอนโหลด
});
// ดึง URL จาก Environment ถ้าไม่ได้ตั้งไว้ให้ใช้พอร์ต 3000 ของเครื่องปัจจุบัน

// ระบุ path ให้ตรงกับที่ Custom Server เปิดไว้ เพื่อไม่ให้ชนกับระบบ HMR ของ Next.js
const socket = io({
  autoConnect: false,
  path: '/socket.io/'
});

export default function Dashboard() {
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    // 1. โหลดข้อมูลที่ยัง Active อยู่จากฐานข้อมูลทันทีที่เปิดเว็บ
    fetch('/api/active')
      .then(res => res.json())
      .then(data => setActiveAlerts(data))
      .catch(err => console.error("Failed to fetch active alerts:", err));

    // 2. เชื่อมต่อ WebSocket
    socket.connect();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // 3. รับการแจ้งเตือนเหตุการณ์ใหม่
    socket.on('new_alert', (newEvent) => {
      // ดันข้อมูลใหม่ขึ้นไปไว้บนสุดของอาร์เรย์
      setActiveAlerts(prev => [newEvent, ...prev]);
    });

    // 4. รับคำสั่งเคลียร์สถานะ (ลบเหตุการณ์ของ Node ที่ส่งคำสั่งมาออก)
    socket.on('alert_cleared', (data) => {
      setActiveAlerts(prev => prev.filter(alert => alert.node_id !== data.node_id));
    });

    // Cleanup เมื่อผู้ใช้ออกจากหน้าเว็บ
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_alert');
      socket.off('alert_cleared');
      socket.disconnect();
    };
  }, []);

  return (
    <div className="relative bg-white">

      <div className=" top-0 z-999 sticky text-black bg-white p-3 gap-3 shadow-lg  w-full flex flex-col items-center justify-between md:flex-row ">

        <div className="flex flex-row gap-2 px-5">
          <div className="text-white bg-green-600 rounded-full flex items-center justify-center w-10 h-10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </div>
          <div className="">
            <p className='font-bold'>ArborGuard At KU</p>
            <p className="text-xs text-gray-300 font-bold">KAMPHAENG SAEN CAMPUS</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm  font-medium">
          {/* ไฟแสดงสถานะ WebSocket */}
          <span className={`flex items-center gap-2 `}>
            <span className="relative flex h-3 w-3">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            {isConnected ? 'System Live' : 'Disconnected'}
          </span>

          <span className=" px-4 py-2 rounded-full  shadow-lg">
            Active Alerts: <span className="text-rose-400 font-bold ml-1">{activeAlerts.length}</span>
          </span>
        </div>


      </div>

      <div className="min-h-screen bg-white text-black p-4 md:p-8 flex flex-col font-sans">
        {/* Header */}


        {/* Main Content Grid */}
        
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* แผนที่ (ใช้พื้นที่ 2 ใน 3 ของจอใหญ่) */}
          {/* <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-2 min-h-[400px] lg:min-h-[600px] shadow-xl border border-slate-700/50">
            <MapComponent events={activeAlerts} focusedLocation={focusedLocation} />
          </div> */}

          {/* แถบแจ้งเตือนด้านข้าง (Event Feed) */}
          <div className=" rounded-2xl p-6 flex flex-col h-[500px] lg:h-auto shadow-xl border border-slate-700/50">
            <h2 className="text-lg md:text-xl  mb-4 border-b border-slate-700/50 pb-3 ">
              Current Threats
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-600">
              {activeAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-70">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <p className="text-lg">ระบบปกติ</p>
                  <p className="text-sm mt-1">เคลียร์ทุกเหตุการณ์เรียบร้อยแล้ว</p>
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => setFocusedLocation([alert.lat, alert.lng])}
                    className={`p-4 h-15 rounded-xl border-l-4 shadow-md hover:cursor-pointer
                    ${alert.event_type === 'ต้นไม้ล้ม' ? 'border-red-500 hover:bg-red-200' : 'border-yellow-500 hover:bg-orange-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <p className={`font-bold`}>
                        {alert.event_type === 'ต้นไม้ล้ม' ? 'ต้นไม้ล้ม' : ' กิ่งไม้หัก'}
                      </p>
                    </div>
                    <p className="text-sm black mt-2">
                      Node: <span className="font-mono ">{alert.node_id}</span>
                    </p>
                    <p className="text-xs  mt-1 flex justify-between">
                      <span>{new Date(alert.created_at).toLocaleDateString('th-TH')}</span>
                      <span>{new Date(alert.created_at).toLocaleTimeString('th-TH')}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}