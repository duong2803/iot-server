Server xử lí hệ thống bơm nước iot sử dụng websocket

Một số request đến server:

- Đăng nhập: {"type": "login", "username": "...", "password": "..."}

Sau khi đăng nhập, mức nước và nhiệt độ trong thời gian thực được gửi về client mỗi 1 giây dưới dạng {
  "type": "realTimeData",
  "waterLevel": ...,
  "temperature": ...
}

- Bơm nước thủ công: {"type": "manualPump", "token": "...", "action": "..."}

- Bơm nước tự động: {"type": "manualPump", "token": "...", "minLevel": "...", "maxLevel": "..."}


