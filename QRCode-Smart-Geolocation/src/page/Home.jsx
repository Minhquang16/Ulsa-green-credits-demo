import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { encryptData } from "../utils/crypto";

const QR_LIFESPAN = 60; // 60 seconds

const Home = () => {
  const [lat, setLat] = useState("21.028511");
  const [lng, setLng] = useState("105.804817");
  const [timestamp, setTimestamp] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(QR_LIFESPAN);

  const baseUrl = window.location.origin;
  
  // Mã hoá toàn bộ dữ liệu thành 1 token duy nhất (Phase 1)
  const token = encryptData({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    t: timestamp
  });
  
  const attendanceUrl = `${baseUrl}/attendance?token=${token}`;

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimestamp(Date.now());
          return QR_LIFESPAN;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toString());
          setLng(position.coords.longitude.toString());
          setTimestamp(Date.now());
          setTimeLeft(QR_LIFESPAN);
        },
        (error) => {
          alert("Không thể lấy vị trí hiện tại: " + error.message);
        }
      );
    } else {
      alert("Trình duyệt không hỗ trợ Geolocation.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">QR Code Điểm Danh</h1>
        <p className="text-sm text-red-500 font-bold mb-6">QR Động + Token Mã Hoá</p>
        
        <div className="mb-4 text-left flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Vĩ độ (Latitude):</label>
            <input 
              type="text" 
              value={lat} 
              onChange={(e) => setLat(e.target.value)}
              className="w-full border border-gray-300 rounded p-1 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Kinh độ (Longitude):</label>
            <input 
              type="text" 
              value={lng} 
              onChange={(e) => setLng(e.target.value)}
              className="w-full border border-gray-300 rounded p-1 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button 
          onClick={handleGetCurrentLocation}
          className="w-full bg-blue-100 text-blue-700 font-semibold py-2 px-4 text-sm rounded mb-6 hover:bg-blue-200 transition"
        >
          Lấy tọa độ hiện tại
        </button>

        <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
          <QRCodeSVG value={attendanceUrl} size={200} />
          
          <div className="mt-4 w-full">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Tự động làm mới sau:</span>
              <span className="font-bold text-red-500">{timeLeft}s</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / QR_LIFESPAN) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;
