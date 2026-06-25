// utils/crypto.js
// Giả lập mã hoá cho môi trường Frontend.
// Trong thực tế, bạn nên dùng JWT ký từ Backend để bảo mật tuyệt đối.

const SECRET_SALT = "GREEN_CREDIT_SECRET_2026";

export const encryptData = (dataObj) => {
  try {
    // Thêm một chút nhiễu (salt) để khó đoán hơn
    const payload = JSON.stringify({ ...dataObj, salt: SECRET_SALT });
    // Dùng Base64 encoding để giả lập mã hóa
    // btoa chỉ hỗ trợ ASCII, encodeURIComponent giúp hỗ trợ unicode
    return btoa(encodeURIComponent(payload));
  } catch (error) {
    console.error("Lỗi mã hóa:", error);
    return null;
  }
};

export const decryptData = (token) => {
  try {
    const payload = decodeURIComponent(atob(token));
    const parsed = JSON.parse(payload);
    
    if (parsed.salt !== SECRET_SALT) {
      throw new Error("Token giả mạo!");
    }
    
    return parsed;
  } catch (error) {
    console.error("Lỗi giải mã:", error);
    return null;
  }
};
