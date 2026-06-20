#!/bin/bash

# Bắt tín hiệu Ctrl+C (SIGINT) để dừng tất cả các tiến trình con khi thoát
trap 'echo -e "\n🛑 Đang dừng hệ thống..."; kill $(jobs -p) 2>/dev/null; docker compose stop db; exit' SIGINT

echo "======================================================"
echo "🚀 KHỞI ĐỘNG MÔI TRƯỜNG PHÁT TRIỂN SONG SONG (NATIVE)"
echo "======================================================"

echo "📦 1. Khởi động Database (PostgreSQL) qua Docker..."
docker compose up -d db

echo "⛓️  2. Khởi động Blockchain cục bộ (Hardhat)..."
cd blockchain
npm install > /dev/null 2>&1
npx hardhat node > /dev/null 2>&1 &
cd ..

echo "⏳ Đợi 3 giây cho Hardhat Network sẵn sàng..."
sleep 3

echo "📜 Đang Deploy Smart Contract lên mạng cục bộ..."
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
cd ..

echo "⚙️  3. Khởi động Backend (Port 8080) với Hot Reload..."
cd backend
npm install > /dev/null 2>&1
export PORT="8080"
export DATABASE_URL="postgres://ugc:ugc@localhost:5434/ugc"
export JWT_SECRET="change-me-in-production"
export MNEMONIC="test test test test test test test test test test test junk"
export RPC_URL="http://127.0.0.1:8545"
export CONTRACTS_PATH="../shared/contracts.json"
export UPLOAD_DIR="./uploads"
export CORS_ORIGIN="http://localhost:3000"
mkdir -p ./uploads
node --watch src/index.js &
cd ..

echo "🌐 4. Khởi động Frontend (Port 3000) với Hot Reload..."
cd web/frontend
npm install > /dev/null 2>&1
export VITE_BACKEND_URL="http://localhost:8080"
npm run dev &
cd ../..

echo "======================================================"
echo "✅ HỆ THỐNG ĐÃ SẴN SÀNG!"
echo "👉 Frontend (React):   http://localhost:3000"
echo "👉 Backend (Node.js):  http://localhost:8080"
echo "👉 Blockchain (RPC):   http://127.0.0.1:8545"
echo ""
echo "🔥 Code của bạn sẽ tự động cập nhật khi bạn lưu file."
echo "🛑 Nhấn Ctrl + C để dừng TẤT CẢ dịch vụ."
echo "======================================================"

# Giữ script chạy để duy trì các tiến trình background
wait
