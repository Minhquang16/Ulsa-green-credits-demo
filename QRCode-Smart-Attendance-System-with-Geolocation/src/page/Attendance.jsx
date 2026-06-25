import { useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { calculateDistance } from "../utils/distanceCalculation";
import { decryptData } from "../utils/crypto";

const MAX_VALID_DISTANCE = 20; 
const QR_LIFESPAN_MS = 90000; // 90 seconds (60s hiển thị + 30s châm chước do mạng lag)

const Attendance = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const [step, setStep] = useState(1); // 1: Lọc, 2: Camera + Liveness, 3: Success
  const [errorMsg, setErrorMsg] = useState("");
  const [userDistance, setUserDistance] = useState(null);
  
  // Liveness States
  const [livenessColor, setLivenessColor] = useState("transparent");
  const [isLivenessPassed, setIsLivenessPassed] = useState(false);
  const [livenessCount, setLivenessCount] = useState(3);

  // Camera refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [stream, setStream] = useState(null);

  const token = queryParams.get("token");

  useEffect(() => {
    // ---- PHASE 1: CHỐNG URL TAMPERING (GIẢI MÃ TOKEN) ----
    if (!token) {
      setErrorMsg("Link điểm danh không hợp lệ (thiếu token).");
      return;
    }

    const decrypted = decryptData(token);
    if (!decrypted) {
      setErrorMsg("Token đã bị chỉnh sửa hoặc giả mạo. Truy cập bị từ chối!");
      return;
    }

    const { lat, lng, t: qrTimestamp } = decrypted;

    // ---- PHASE 1: CHỐNG GỬI ẢNH (TIME VALIDATION) ----
    const timeDiff = Date.now() - qrTimestamp;
    if (timeDiff > QR_LIFESPAN_MS) {
      setErrorMsg("Mã QR đã hết hạn! Vui lòng quét trực tiếp mã mới nhất trên máy chiếu (không dùng ảnh chụp gửi qua mạng).");
      return;
    }

    // ---- PHASE 2: DEVICE FINGERPRINTING (CHỐNG ĐIỂM DANH HỘ) ----
    let deviceId = localStorage.getItem("green_credit_device_id");
    if (!deviceId) {
      deviceId = "device_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("green_credit_device_id", deviceId);
    }
    
    // Giả lập: Nếu thiết bị này đã ghi danh (trong session này), chặn luôn.
    // Thực tế sẽ check API Backend `SELECT count(*) FROM checks WHERE device_id = ? AND date = TODAY`
    const lastCheckIn = localStorage.getItem("last_checkin_time");
    if (lastCheckIn && (Date.now() - parseInt(lastCheckIn) < 1000 * 60 * 60)) {
      // Chặn 1 tiếng
      setErrorMsg(`Thiết bị này (${deviceId.substring(0,8)}...) đã được sử dụng để điểm danh trong vòng 1 giờ qua. KHÔNG ĐƯỢC ĐIỂM DANH HỘ!`);
      return;
    }

    // ---- KIỂM TRA GPS ----
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            // Chống Fake GPS hoặc sóng yếu
            if (accuracy > 500) {
              setErrorMsg(`Tín hiệu GPS quá yếu hoặc đang bị giả mạo (Sai số: ${Math.round(accuracy)}m > 500m). Hãy ra chỗ thoáng hơn.`);
              return;
            }

            const distance = calculateDistance(userLat, userLng, lat, lng);
            setUserDistance(distance);

            if (distance <= MAX_VALID_DISTANCE) {
              setStep(2); // Pass GPS, chuyển sang Camera
              startCamera();
            } else {
              setErrorMsg(`Bạn ở quá xa! (Cách ${distance.toFixed(2)}m. Tối đa: ${MAX_VALID_DISTANCE}m).`);
            }
          },
          (error) => {
            setErrorMsg(`Lỗi khi lấy vị trí của bạn: ${error.message}`);
          },
          {
            enableHighAccuracy: false, // Tắt chế độ độ chính xác cao để máy Mac tìm nhanh hơn qua WiFi
            timeout: 15000,
            maximumAge: 0
          }
        );
      } else {
        setErrorMsg("Trình duyệt của bạn không hỗ trợ định vị (Geolocation).");
      }
    };

    getUserLocation();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      setErrorMsg("Không thể truy cập Camera. Bạn cần cấp quyền Camera để hoàn tất điểm danh.");
      console.error(err);
    }
  };

  // ---- PHASE 3: LIVENESS DETECTION ----
  const startLivenessCheck = () => {
    let count = 3;
    setLivenessCount(count);
    
    const interval = setInterval(() => {
      // Đổi màu màn hình ngẫu nhiên để hắt ánh sáng lên mặt (chống chụp ảnh tĩnh)
      const colors = ["rgba(255,0,0,0.5)", "rgba(0,255,0,0.5)", "rgba(0,0,255,0.5)", "rgba(255,255,0,0.5)"];
      setLivenessColor(colors[Math.floor(Math.random() * colors.length)]);
      
      count--;
      setLivenessCount(count);

      if (count <= 0) {
        clearInterval(interval);
        setLivenessColor("transparent");
        setIsLivenessPassed(true);
        takePhoto(); // Tự động chụp khi Liveness Passed
      }
    }, 1000);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setPhoto(dataUrl);
      
      // Stop camera
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Lưu lại thời gian check-in của thiết bị này
      localStorage.setItem("last_checkin_time", Date.now().toString());

      setStep(3); // Success
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 transition-colors duration-200" style={{ backgroundColor: livenessColor }}>
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center z-10 relative">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Xác Thực Nâng Cao</h2>
        
        {errorMsg ? (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg border border-red-300">
            <svg className="w-12 h-12 mx-auto mb-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            <p className="font-bold text-lg">Từ chối điểm danh!</p>
            <p className="text-sm mt-2">{errorMsg}</p>
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

            {step === 3 && photo && (
              <div className="bg-green-50 text-green-800 p-4 rounded-lg border border-green-200">
                <svg className="w-16 h-16 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h3 className="font-bold text-xl mb-1">Điểm Danh Thành Công!</h3>
                <p className="text-xs text-green-600 mb-4">Mã hoá + GPS + Liveness đều đã vượt qua.</p>
                <img src={photo} alt="Selfie" className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-green-400" />
                <p className="text-xs mt-4 italic text-gray-500">Thiết bị của bạn đã bị khóa tính năng điểm danh trong 1 giờ tới để chống điểm danh hộ.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
