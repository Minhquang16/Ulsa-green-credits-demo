import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../auth.jsx';

export default function QRGenerator({ eventId, onClose }) {
  const { api } = useAuth();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadToken() {
      try {
        const res = await api(`/events/${eventId}/qr`);
        setToken(res.token);
      } catch (e) {
        setError('Không thể tải mã QR: ' + e.message);
      }
    }
    loadToken();
    // Optional: Refresh token every 60 seconds if implemented dynamically on backend
    // const interval = setInterval(loadToken, 60000);
    // return () => clearInterval(interval);
  }, [eventId, api]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface rounded-[28px] p-6 max-w-[320px] w-full shadow-2xl flex flex-col items-center text-center mx-auto">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-primary text-2xl">qr_code_2</span>
        </div>
        
        <h2 className="text-xl font-headline font-black text-on-surface mb-2">Mã QR Check-in</h2>
        <p className="text-on-surface-variant text-xs mb-6 px-2">
          Cho sinh viên quét mã này bằng tính năng Check-in trên app để xác nhận có mặt.
        </p>

        {error ? (
          <div className="text-error font-medium text-xs mb-6">{error}</div>
        ) : token ? (
          <div className="bg-white p-3 rounded-2xl shadow-inner mb-6">
            <QRCodeSVG value={token} size={180} level="H" />
          </div>
        ) : (
          <div className="h-[204px] flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        <button 
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-surface-container-highest text-on-surface font-bold text-sm hover:bg-surface-variant transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
