const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Lấy token từ header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token không được cung cấp' });
  }

  try {
    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded; // Lưu thông tin user vào request
    next(); // Cho phép tiếp tục xử lý
  } catch (error) {
    return res.status(403).json({ message: 'Token không hợp lệ' });
  }
};

module.exports = authMiddleware;
