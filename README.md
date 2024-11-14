Server xử lí hệ thống bơm nước iot sử dụng websocket

# Đăng nhập 
- Request: 

{"type": "login", 
"username": "...", 
"password": "..."
}

- Trả về:
- 
{
  "type": "loginSuccess",
   "token": "..."
}


Sau khi đăng nhập, mức nước và nhiệt độ trong thời gian thực được gửi về client mỗi 1 giây dưới dạng:

{
  "type": "realTimeData",
  "waterLevel": ...,
  "temperature": ...
}

# Bơm nước thủ công

- Request:

{"type": "manualPump", "token": "...", "action": "..."} với action là "start" hoặc "stop"

# Bơm nước tự động

- Request:

{"type": "manualPump", "token": "...", "minLevel": "...", "maxLevel": "..."}


