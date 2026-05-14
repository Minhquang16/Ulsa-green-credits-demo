import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../auth.jsx';

export default function QRScanner({ eventId, onClose, onSuccess }) {
  const { api } = useAuth();
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(async (decodedText) => {
      // Prevent multiple scans while processing
      if (checking) return;
      setChecking(true);
      
      try {
        // Optional: Get GPS location
        let lat = null;
        let lng = null;
        
        // Simulating getting location (optional for now, can be fully implemented later)
        // navigator.geolocation.getCurrentPosition((pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; });

        await api('/checkin', {
          method: 'POST',
          body: JSON.stringify({
            event_id: eventId,
            token: decodedText,
            latitude: lat,
            longitude: lng
          })
        });

        scanner.clear();
        onSuccess('Check-in thành công!');
      } catch (err) {
        if (err.message && err.message.includes('Already checked in')) {
          scanner.clear();
          onSuccess('Bạn đã điểm danh ở sự kiện này rồi!');
        } else {
          setError(err.message || 'Lỗi quét mã hoặc mã không hợp lệ');
          setChecking(false);
          // We don't clear the scanner on error, so they can try scanning again
        }
      }
    }, (errorMessage) => {
      // Ignore scan failures (happens every frame until it finds a QR code)
    });

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [api, eventId, onSuccess, checking]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl flex flex-col">
        
        <div className="p-6 bg-surface-container-highest text-center">
          <h2 className="text-xl font-headline font-black text-on-surface">Quét mã Check-in</h2>
          <p className="text-on-surface-variant text-xs mt-1">Đưa camera vào mã QR của sự kiện</p>
        </div>

        <div className="p-4 bg-black">
          <div id="qr-reader" className="w-full bg-black rounded-xl overflow-hidden text-white"></div>
        </div>

        <div className="p-6 text-center">
          {error && <div className="text-error font-medium text-sm mb-4 bg-error/10 p-3 rounded-lg">{error}</div>}
          {checking && <div className="text-primary font-bold text-sm mb-4 animate-pulse">Đang xác thực...</div>}
          
          <button 
            onClick={onClose}
            className="w-full py-4 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface font-bold hover:bg-surface-variant transition-colors"
          >
            Hủy / Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
