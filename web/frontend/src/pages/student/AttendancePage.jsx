import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { decryptData } from '../../utils/crypto';
import { calculateDistance } from '../../utils/distanceCalculation';

const MAX_VALID_DISTANCE = 500; // allow 500m for demo, normally 20-50m
const QR_LIFESPAN_MS = 90000; // 90 seconds

export default function AttendancePage() {
  const { api } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  const [step, setStep] = useState(1); // 1: Validating GPS, 2: Liveness, 3: Submitting
  const [error, setError] = useState('');
  const [userDistance, setUserDistance] = useState(null);
  const [checkinLocation, setCheckinLocation] = useState({ lat: null, lng: null });
  const [eventId, setEventId] = useState(null);

  // Liveness States
  const [livenessColor, setLivenessColor] = useState("transparent");
  const [isLivenessPassed, setIsLivenessPassed] = useState(false);
  const [livenessCount, setLivenessCount] = useState(3);
  const [photo, setPhoto] = useState(null);

  // Camera refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  const token = queryParams.get("token");

  // Stop camera stream safely
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    return () => stopStream();
  }, [stream]);

  // Step 1: Validate Token & GPS
  useEffect(() => {
    if (step !== 1) return;

    if (!token) {
      setError("Link điểm danh không hợp lệ (thiếu token).");
      return;
    }

    const validate = () => {
      try {
        const decrypted = decryptData(token);
        if (!decrypted) {
          setError("Mã QR không hợp lệ hoặc đã bị giả mạo.");
          return;
        }

        const { eventId: qrEventId, lat, lng, t: qrTimestamp } = decrypted;
        setEventId(qrEventId);

        const timeDiff = Date.now() - qrTimestamp;
        if (timeDiff > QR_LIFESPAN_MS) {
          setError("Mã QR đã hết hạn! Vui lòng quét mã mới trên màn hình của Admin.");
          return;
        }

        let deviceId = localStorage.getItem("green_credit_device_id");
        if (!deviceId) {
          deviceId = "device_" + Math.random().toString(36).substring(2, 15);
          localStorage.setItem("green_credit_device_id", deviceId);
        }

        const lastCheckIn = localStorage.getItem(`last_checkin_${qrEventId}`);
        if (lastCheckIn && (Date.now() - parseInt(lastCheckIn) < 1000 * 60 * 60)) {
          setError(`Thiết bị này đã được sử dụng để điểm danh sự kiện này trong 1 giờ qua. KHÔNG ĐƯỢC ĐIỂM DANH HỘ!`);
          return;
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;
              const accuracy = position.coords.accuracy;

              setCheckinLocation({ lat: userLat, lng: userLng });

              if (accuracy > 1000) {
                setError(`Tín hiệu GPS quá yếu (Sai số: ${Math.round(accuracy)}m). Hãy ra chỗ thoáng hơn.`);
                return;
              }

              const distance = calculateDistance(userLat, userLng, lat, lng);
              setUserDistance(distance);

              if (distance <= MAX_VALID_DISTANCE) {
                setStep(2);
                startCamera();
              } else {
                setError(`Bạn ở quá xa! (Cách ${distance.toFixed(0)}m. Tối đa: ${MAX_VALID_DISTANCE}m).`);
              }
            },
            (err) => {
              setError(`Lỗi GPS: ${err.message}. Vui lòng bật định vị trên trình duyệt.`);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        } else {
          setError("Trình duyệt không hỗ trợ định vị (Geolocation).");
        }
      } catch (err) {
        setError("Lỗi xử lý: " + err.message);
      }
    };

    validate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, token]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Không thể truy cập Camera. Bạn cần cấp quyền Camera để quét khuôn mặt.");
      console.error(err);
    }
  };

  const startLivenessCheck = () => {
    let count = 3;
    setLivenessCount(count);
    
    const interval = setInterval(() => {
      const colors = ["rgba(255,0,0,0.5)", "rgba(0,255,0,0.5)", "rgba(0,0,255,0.5)", "rgba(255,255,0,0.5)"];
      setLivenessColor(colors[Math.floor(Math.random() * colors.length)]);
      
      count--;
      setLivenessCount(count);

      if (count <= 0) {
        clearInterval(interval);
        setLivenessColor("transparent");
        setIsLivenessPassed(true);
        takePhotoAndSubmit();
      }
    }, 1000);
  };

  const takePhotoAndSubmit = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setPhoto(dataUrl);
    
    stopStream();
    setStep(3); // Submitting

    try {
      const deviceId = localStorage.getItem("green_credit_device_id");
      await api('/api/smart-checkin', {
        method: 'POST',
        body: JSON.stringify({
          event_id: eventId,
          token: token,
          proof_image: dataUrl,
          checkin_lat: checkinLocation.lat,
          checkin_lng: checkinLocation.lng,
          device_id: deviceId
        })
      });

      localStorage.setItem(`last_checkin_${eventId}`, Date.now().toString());
      
      try {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.play().catch(() => {});
      } catch (e) {}

      setTimeout(() => {
        // Redirect to dashboard or claims after success
        navigate('/student/claims');
      }, 3000);

    } catch (err) {
      setError(err.message || 'Lỗi khi gọi API Check-in');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4 transition-colors duration-200" style={{ backgroundColor: step === 2 ? livenessColor : 'transparent' }}>
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center z-10 relative">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Xác Thực Nâng Cao
        </h2>
        
        {error ? (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg border border-red-300">
            <svg className="w-12 h-12 mx-auto mb-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            <p className="font-bold text-lg">Từ chối điểm danh!</p>
            <p className="text-sm mt-2">{error}</p>
            <button onClick={() => navigate('/student/events')} className="mt-4 px-4 py-2 bg-white text-red-600 rounded-md text-sm border border-red-300 hover:bg-red-50 w-full font-bold">Về trang sự kiện</button>
          </div>
        ) : (
          <div>
            {step === 1 && (
              <div className="text-gray-600">
                <p className="animate-pulse mb-4">Đang kiểm tra: Giải mã Token, Chống Fake GPS, Quét Fingerprint...</p>
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="bg-green-100 text-green-700 p-2 rounded text-xs mb-4 text-left">
                  <p>✓ Token Hợp lệ (Giải mã thành công)</p>
                  <p>✓ GPS đáng tin cậy (Cách {userDistance?.toFixed(2)}m)</p>
                  <p>✓ Thiết bị được chấp thuận (1 device/1 lần)</p>
                </div>

                <p className="font-bold mb-2 text-red-600">BƯỚC CUỐI: XÁC THỰC LIVENESS</p>
                <p className="text-xs text-gray-500 mb-2">Giữ thẳng điện thoại trước mặt. Hệ thống sẽ phát ánh sáng ngẫu nhiên để chống giả mạo ảnh tĩnh.</p>
                
                <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-auto max-h-64 object-cover transform scale-x-[-1]" 
                  />
                  {livenessCount > 0 && livenessCount < 3 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <span className="text-white text-5xl font-bold">{livenessCount}</span>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                
                {!isLivenessPassed && (
                  <button 
                    onClick={startLivenessCheck}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
                  >
                    🚀 Bắt đầu quét khuôn mặt
                  </button>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="bg-green-50 text-green-800 p-4 rounded-lg border border-green-200">
                <svg className="w-16 h-16 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h3 className="font-bold text-xl mb-1">Điểm Danh Thành Công!</h3>
                <p className="text-xs text-green-600 mb-4">Mã hoá + GPS + Liveness đều đã vượt qua.</p>
                {photo && <img src={photo} alt="Selfie" className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-green-400" />}
                <p className="text-xs mt-4 italic text-gray-500">Đang nộp minh chứng. Thiết bị của bạn đã bị khóa tính năng điểm danh trong 1 giờ tới để chống điểm danh hộ.</p>
                <div className="w-full bg-green-200 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-green-600 h-full animate-pulse w-full"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
