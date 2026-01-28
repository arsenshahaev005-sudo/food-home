"use client";

import { useEffect, useState } from "react";
import { UserDevice } from "@/lib/api";

interface DevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: UserDevice[];
  onLogoutDevice: (id: string) => Promise<void>;
  onLogoutCurrent?: () => void;
}

const DeviceIcon = ({ name }: { name: string }) => {
  const n = name.toLowerCase();

  if (n.includes("iphone") || n.includes("android") || n.includes("mobile")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#c9825b]">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#c9825b]">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
};

const DeviceRow = ({ device, onLogout, isCurrent, onLogoutCurrent }: { device: UserDevice, onLogout?: (id: string) => void, isCurrent?: boolean, onLogoutCurrent?: () => void }) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleLogout = () => {
        if (isCurrent && onLogoutCurrent) {
            onLogoutCurrent();
        } else if (onLogout) {
            onLogout(device.id);
        }
    };

    return (
        <div className={`flex items-center justify-between p-4 rounded-2xl border ${isCurrent ? 'bg-[#fff5f0] border-[#ffdccb]' : 'bg-gray-50 border-transparent'}`}>
            <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${isCurrent ? 'bg-white' : 'bg-white'}`}>
                    <DeviceIcon name={device.name} />
                </div>
                <div>
                    <div className="font-medium text-[#1a1a1a]">
                        {device.name}
                        {isCurrent && <span className="ml-2 text-xs font-bold text-[#c9825b] bg-[#fff5f0] px-2 py-0.5 rounded-full border border-[#ffdccb]">Это устройство</span>}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                        {device.ip_address} • {new Date(device.last_active).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
            {(onLogout || (isCurrent && onLogoutCurrent)) && (
                <button 
                    onClick={handleLogout} 
                    className="transition-colors duration-300"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{ color: isHovered ? '#ef4444' : '#9ca3af' }}
                    title={isCurrent ? "Выйти из аккаунта" : "Завершить сеанс"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export default function DevicesModal({
  isOpen,
  onClose,
  devices,
  onLogoutDevice,
  onLogoutCurrent
}: DevicesModalProps) {
  const [isCloseHovered, setIsCloseHovered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Ensure devices is an array
  const safeDevices = Array.isArray(devices) ? devices : [];

  const currentDevice = safeDevices.find(d => d.is_current);
  const otherDevices = safeDevices.filter(d => !d.is_current);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#1a1a1a]">Ваши устройства</h2>
          <button 
            onClick={onClose} 
            className="transition-colors duration-300"
            onMouseEnter={() => setIsCloseHovered(true)}
            onMouseLeave={() => setIsCloseHovered(false)}
            style={{ color: isCloseHovered ? '#c9825b' : '#9ca3af' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
            {/* Current Device */}
            {currentDevice && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 ml-1">Текущий сеанс</h3>
                    <DeviceRow device={currentDevice} isCurrent onLogoutCurrent={onLogoutCurrent} />
                </div>
            )}


            {/* Other Devices */}
            {otherDevices.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 ml-1">Активные сеансы</h3>
                    <div className="space-y-3">
                        {otherDevices.map(dev => (
                            <DeviceRow key={dev.id} device={dev} onLogout={onLogoutDevice} />
                        ))}
                    </div>
                </div>
            )}
            
            {otherDevices.length === 0 && !currentDevice && (
                <div className="text-center text-gray-500 py-8">
                    Список устройств пуст
                </div>
            )}
        </div>

        <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Если вы заметили подозрительную активность, завершите сеанс и смените пароль.
            </p>
        </div>
      </div>
    </div>
  );
}
