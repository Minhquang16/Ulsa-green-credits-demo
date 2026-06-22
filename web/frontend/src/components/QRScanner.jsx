import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ethers } from 'ethers';
import { useAuth } from '../auth.jsx';
export default function QRScanner({ eventId, onClose, onSuccess }) {
  const { api } = useAuth();
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [successStatus, setSuccessStatus] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  const checkingRef = React.useRef(false);

  useEffect(() => {
    let timer;
    if (hasStarted && !checking && !successStatus) {
      timer = setTimeout(() => setShowReminder(true), 4000);
    } else {
      setShowReminder(false);
    }
    return () => clearTimeout(timer);
  }, [hasStarted, checking, successStatus]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(async (decodedText) => {
      // Prevent multiple scans while processing
      if (checkingRef.current) return;
      checkingRef.current = true;
      setChecking(true);
      
      try {
        // Optional: Get GPS location
        let lat = null;
        let lng = null;
        
        // Simulating getting location (optional for now, can be fully implemented later)
        // navigator.geolocation.getCurrentPosition((pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; });

        // Generate temporary signature (Mã hóa kèm chữ ký tạm thời của ví sinh viên)
        const tempWalletStr = localStorage.getItem('temp_student_wallet');
        let tempWallet;
        if (tempWalletStr) {
          tempWallet = new ethers.Wallet(tempWalletStr);
        } else {
          tempWallet = ethers.Wallet.createRandom();
          localStorage.setItem('temp_student_wallet', tempWallet.privateKey);
        }

        const offlineTimestamp = new Date().toISOString();
        const payloadString = `${eventId}:${decodedText}:${lat}:${lng}:${offlineTimestamp}`;
        const tempSignature = await tempWallet.signMessage(payloadString);

        if (!navigator.onLine) {
          // Offline mode
          const offlineData = {
            event_id: eventId,
            token: decodedText,
            latitude: lat,
            longitude: lng,
            offline_timestamp: offlineTimestamp,
            temp_signature: tempSignature,
            temp_address: tempWallet.address
          };
          const queue = JSON.parse(localStorage.getItem('offline_checkin_queue') || '[]');
          queue.push(offlineData);
          localStorage.setItem('offline_checkin_queue', JSON.stringify(queue));
          
          scanner.clear();
          onSuccess('Mất mạng! Đã lưu check-in kèm chữ ký tạm (Offline). Khi có mạng vào nộp chứng minh + ấn xác nhận', true);
          return;
        }

        await api('/checkin', {
          method: 'POST',
          body: JSON.stringify({
            event_id: eventId,
            token: decodedText,
            latitude: lat,
            longitude: lng,
            offline_timestamp: offlineTimestamp,
            temp_signature: tempSignature,
            temp_address: tempWallet.address
          })
        });

        // Trigger success state
        setChecking(false);
        setSuccessStatus(true);
        
        try {
          const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
          audio.play().catch(e => console.log(e));
        } catch (e) {}

        setTimeout(() => {
          scanner.clear();
          onSuccess('Check-in thành công!', false);
        }, 1500);

      } catch (err) {
        if (err.message && err.message.includes('Already checked in')) {
          setChecking(false);
          setSuccessStatus(true);
          setTimeout(() => {
            scanner.clear();
            onSuccess('Bạn đã điểm danh ở sự kiện này rồi!', false);
          }, 1500);
        } else if (
          err.message && (
            err.message.includes('Failed to fetch') || 
            err.message.includes('Network') ||
            err.message.includes('502') ||
            err.message.includes('503') ||
            err.message.includes('504')
          )
        ) {
          // Fallback if network failed
          const tempWalletStr = localStorage.getItem('temp_student_wallet');
          const tempWallet = tempWalletStr ? new ethers.Wallet(tempWalletStr) : ethers.Wallet.createRandom();
          if (!tempWalletStr) localStorage.setItem('temp_student_wallet', tempWallet.privateKey);
          
          const offlineTimestamp = new Date().toISOString();
          const payloadString = `${eventId}:${decodedText}:${lat}:${lng}:${offlineTimestamp}`;
          const tempSignature = await tempWallet.signMessage(payloadString);

          const offlineData = {
            event_id: eventId,
            token: decodedText,
            latitude: lat,
            longitude: lng,
            offline_timestamp: offlineTimestamp,
            temp_signature: tempSignature,
            temp_address: tempWallet.address
          };
          const queue = JSON.parse(localStorage.getItem('offline_checkin_queue') || '[]');
          queue.push(offlineData);
          localStorage.setItem('offline_checkin_queue', JSON.stringify(queue));
          
          scanner.clear();
          onSuccess('Mạng lỗi (Backend)! Đã lưu check-in kèm chữ ký tạm (Offline). Khi có mạng vào nộp chứng minh + ấn xác nhận', true);
        } else {
          setError(err.message || 'Lỗi quét mã hoặc mã không hợp lệ');
          checkingRef.current = false;
          setChecking(false);
        }
      }
    }, (errorMessage) => {
      // Ignore scan failures (happens every frame until it finds a QR code)
    });

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [api, eventId, onSuccess]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <style>{`
        #qr-reader { border: none !important; background: transparent; width: 100%; height: 100%; }
        #qr-reader__dashboard_section_swaplink { display: none !important; }
        
        /* Completely hide dashboard section so user only uses our button */
        #qr-reader__dashboard_section_csr { display: none !important; }
        
        #qr-reader__scan_region { background: transparent !important; height: 100%; width: 100%; }
        #qr-reader__scan_region video { 
          border-radius: 24px !important; object-fit: cover !important; 
          width: 100% !important; height: 100% !important; 
        }
        /* Hide html5-qrcode's custom shaded overlay */
        #qr-reader__scan_region > div { display: none !important; }

        @keyframes laserScan {
          0%, 100% { transform: translateY(-70px); }
          50% { transform: translateY(70px); }
        }
        .laser-line { animation: laserScan 2.5s ease-in-out infinite; }
      `}</style>
      
      <div className="bg-white rounded-[28px] w-[92%] max-w-[380px] shadow-2xl flex flex-col relative overflow-hidden">
        
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors z-10">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>

        <div className="pt-6 pb-3 px-5 text-center">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Quét mã Check-in</h2>
          <p className="text-slate-500 text-[12px] mt-1 mb-2">Đưa camera vào mã QR của sự kiện để xác nhận tham gia</p>
          <div className="flex items-center justify-center text-[#059669] text-[10px] font-bold tracking-wide">
            <span className="material-symbols-outlined text-[12px] mr-1">verified_user</span>
            Thông tin được bảo mật và xác thực bởi UGC
          </div>
        </div>

        <div className="px-5 relative">
          <div className="relative bg-black rounded-[24px] w-full h-[260px] overflow-hidden shadow-inner">
            <div id="qr-reader" className="w-full h-full"></div>
            
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
              <div className="relative w-[180px] h-[180px]">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-white rounded-tl-[16px]"></div>
                <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-white rounded-tr-[16px]"></div>
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-white rounded-bl-[16px]"></div>
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-white rounded-br-[16px]"></div>
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#22c55e] shadow-[0_0_12px_#22c55e] laser-line"></div>
              </div>

              <div className={`absolute bottom-4 backdrop-blur-md text-white/90 text-[11px] px-4 py-2 rounded-full flex items-center transition-all duration-500 ${showReminder ? 'bg-red-500/90 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse' : 'bg-black/60'}`}>
                <span className="material-symbols-outlined text-[14px] mr-1.5">{showReminder ? 'error' : 'qr_code_scanner'}</span>
                {showReminder ? 'Vui lòng đưa mã QR sát vào khung hình' : 'Căn chỉnh mã QR vào khung để quét'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 py-4 px-5 border-b border-slate-50 mt-1">
          <button className="flex items-center text-slate-500 text-[11px] font-semibold hover:text-[#059669] transition-colors">
            <span className="material-symbols-outlined text-[16px] mr-1 text-[#059669]">bolt</span>
            Bật đèn pin
          </button>
          <div className="w-[1px] h-3 bg-slate-200"></div>
          <button className="flex items-center text-slate-500 text-[11px] font-semibold hover:text-[#059669] transition-colors">
            <span className="material-symbols-outlined text-[16px] mr-1 text-[#059669]">image</span>
            Tải ảnh QR
          </button>
          <div className="w-[1px] h-3 bg-slate-200"></div>
          <button className="flex items-center text-slate-500 text-[11px] font-semibold hover:text-[#059669] transition-colors">
            <span className="material-symbols-outlined text-[16px] mr-1 text-[#059669]">help</span>
            Hướng dẫn
          </button>
        </div>

        <div className="p-4 flex flex-col gap-2.5">
          {error && <div className="text-red-600 font-bold text-[11px] text-center bg-red-50 p-2 rounded-lg">{error}</div>}
          
          <button 
            disabled={checking || successStatus}
            onClick={() => {
              const permBtn = document.getElementById('html5-qrcode-button-camera-permission');
              const startBtn = document.getElementById('html5-qrcode-button-camera-start');
              if (permBtn) permBtn.click();
              else if (startBtn) startBtn.click();
              setHasStarted(true);
            }} 
            className={`w-full py-3 rounded-xl text-white font-bold text-[13px] flex items-center justify-center shadow-lg transition-colors ${
              successStatus ? 'bg-blue-600 shadow-blue-600/20' : 'bg-[#059669] shadow-green-600/20'
            } ${(checking || successStatus) ? 'opacity-90 cursor-not-allowed' : ''}`}
          >
            {successStatus ? (
              <>
                <span className="material-symbols-outlined mr-1.5 text-[18px]">check_circle</span>
                Thành công!
              </>
            ) : checking ? (
              <>
                <span className="material-symbols-outlined mr-1.5 text-[18px] animate-spin">progress_activity</span>
                Đang xử lý...
              </>
            ) : hasStarted ? (
              <>
                <span className="material-symbols-outlined mr-1.5 text-[18px]">qr_code_scanner</span>
                Đang quét mã...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined mr-1.5 text-[18px]">qr_code_scanner</span>
                Bắt đầu quét mã
              </>
            )}
          </button>
          
          <button onClick={onClose} disabled={checking || successStatus} className="w-full py-1.5 text-slate-500 font-bold text-[13px] hover:text-slate-800 transition-colors disabled:opacity-50">
            Hủy và đóng
          </button>
        </div>
      </div>
    </div>
  );
}
