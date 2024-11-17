const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Mô hình User của bạn
const router = express.Router();

// Đăng nhập và tạo JWT token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Kiểm tra nếu thiếu username hoặc password
  if (!username || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin đăng nhập' });
  }

  try {
    // Tìm người dùng trong database
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: 'Tên tài khoản không tồn tại' });
    }

    // Kiểm tra mật khẩu (so sánh mật khẩu thuần túy)
    if (user.password !== password) {
      return res.status(400).json({ message: 'Mật khẩu sai' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret', // Mã bí mật dùng để mã hóa token
      { expiresIn: '1h' } // Token hết hạn sau 1 giờ
    );

    res.status(200).json({
      message: 'Đăng nhập thành công',
      token, // Trả về token cho client
    });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi', error });
  }
});

module.exports = router;
