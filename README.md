Server xử lí hệ thống bơm nước iot sử dụng websocket

Một số request đến server:

# Đăng nhập 
- Request: 

{

"type": "login", 

"username": "...", 

"password": "..."

}

- Trả về:

{

  "type": "loginSuccess",
  
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiI2NzM2MWYxYTQ0OWQzNWYzMGI4MmNlNzAiLCJpYXQiOjE3MzE2MDI4NTAsImV4cCI6MTczMTYwNjQ1MH0.htuXMrXg0tOHiU8O3vVhro0lfbQ4NdCK8NIcHQ-b8rs"

}


Sau khi đăng nhập, mức nước và nhiệt độ trong thời gian thực được gửi về client mỗi 1 giây dưới dạng {
  "type": "realTimeData",
  "waterLevel": ...,
  "temperature": ...
}

- Bơm nước thủ công: {"type": "manualPump", "token": "...", "action": "..."} với action là "start" hoặc "stop"

- Bơm nước tự động: {"type": "manualPump", "token": "...", "minLevel": "...", "maxLevel": "..."}


