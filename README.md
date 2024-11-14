Server xử lí hệ thống bơm nước iot sử dụng websocket

Một số request đến server:

- Đăng nhập: {"type": "login", "username": "...", "password": "..."}

- Bơm nước thủ công: {"type": "manualPump", "token": "...", "action": "..."}

- Bơm nước tự động: {"type": "manualPump", "token": "...", "minLevel": "...", "maxLevel": "..."}
