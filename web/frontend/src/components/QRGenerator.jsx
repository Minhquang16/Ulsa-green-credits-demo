import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../auth.jsx';
import { encryptData } from '../utils/crypto';

const QR_LIFESPAN = 60; // 60 seconds

export default function QRGenerator({ eventId, onClose }) {
  const { api } = useAuth();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [timestamp, setTimestamp] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(QR_LIFESPAN);

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await api(`/events/${eventId}`);
        setEvent(res);
        if (res.latitude && res.longitude) {
          setLat(res.latitude.toString());
          setLng(res.longitude.toString());
        }
      } catch (e) {
        setError('Không thể tải sự kiện: ' + e.message);
      }
    }
    loadEvent();
  }, [eventId, api]);

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
          setError('');
        },
        (error) => {
          alert("Không thể lấy vị trí hiện tại: " + error.message);
        }
      );
    } else {
      alert("Trình duyệt không hỗ trợ Geolocation.");
    }
  };

  // Generate dynamic token
  let token = '';
  if (event && lat && lng) {
    token = encryptData({
      eventId: event.id,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      t: timestamp
    });
  }

  // The scanner is built-in, but native camera can also read this URL if we deploy it
  const baseUrl = window.location.origin;
  const attendanceUrl = `${baseUrl}/attendance?token=${token}`;
  
  // We encode the full URL to support native iOS camera scanning
  // and maintain compatibility with the original module.

  return (
    <div className="fixed inset-0 bg-gray-100 z-[100] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">QR Code Điểm Danh</h1>
        <p className="text-sm text-red-500 font-bold mb-6">QR Động + Token Mã Hoá</p>

        {error && (
          <div className="text-red-600 font-medium text-sm mb-6 bg-red-50 p-3 rounded">{error}</div>
        )}

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

        {!token && !error && event && (
          <div className="text-orange-600 font-medium text-sm mb-6 bg-orange-50 p-3 rounded">
            Vui lòng lấy tọa độ hiện tại hoặc nhập tọa độ để tạo QR.
          </div>
        )}

        {token ? (
          <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg border border-gray-200 relative mb-4">
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
        ) : !event && !error ? (
          <div className="h-[250px] flex items-center justify-center mb-6">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : null}

      </div>
    </div>
  );
}
