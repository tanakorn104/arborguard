'use client';


export default function Header(){



    return (
        <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-wide">ArborGuard</h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Real-time Threat Monitoring Dashboard
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm font-medium">
          {/* ไฟแสดงสถานะ WebSocket */}
          <span className={`flex items-center gap-2 `}>
            <span className="relative flex h-3 w-3">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            {isConnected ? 'System Live' : 'Disconnected'}
          </span>
          
          <span className=" px-4 py-2 rounded-full border border-slate-700 shadow-inner">
             Active Alerts: <span className="text-rose-400 font-bold ml-1">{activeAlerts.length}</span>
          </span>
        </div>
      </d>
    )
}



