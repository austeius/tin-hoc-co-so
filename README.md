# Website Ôn Thi Tin Học Cơ Sở Bằng C - UTC

Trang web ôn thi tương tác dành cho sinh viên môn **Tin học cơ sở (ngôn ngữ C)** trường **Đại học Giao thông Vận tải (UTC)**. 
Hệ thống tích hợp đầy đủ **113 câu hỏi và bài tập**, giữ nguyên mã câu và cách phân nhóm theo đề, code mẫu chuẩn theo `templates/mau.c`, trình biên soạn bài nháp tự lưu và **Gia sư AI** hỗ trợ thông minh.

---

## 🚀 Cách Mở Web Trên Windows

### Cách 1: Nhấp đúp chuột (Nhanh nhất)
1. Mở thư mục `web/` trong File Explorer.
2. Nhấp đúp vào file **`start.bat`**.
3. Cửa sổ dòng lệnh sẽ chạy server và **tự động mở trình duyệt web** tại địa chỉ:  
   👉 **`http://localhost:3000`**

*(File `start.bat` đã được thiết lập để tự động nhận diện Node.js cài trên máy hoặc Node.js portable có sẵn trong thư mục `web/.node`).*

---

### Cách 2: Chia sẻ link ra Internet để bạn bè cùng xem (`share.bat`)
Muốn gửi link cho bạn bè hoặc mở trên điện thoại ngoài mạng LAN mà không cần cài đặt gì:
1. Nhấp đúp vào file **`share.bat`**.
2. Hệ thống sử dụng Cloudflare Tunnel bảo mật và cung cấp một link HTTPS công khai (ví dụ: `https://xxxx.trycloudflare.com`).
3. Gửi link đó cho bất kỳ ai để cùng xem và ôn tập!

---

### Cách 2: Chạy bằng PowerShell hoặc Command Prompt (CMD)
1. Mở PowerShell hoặc CMD tại thư mục `web/`:
   ```powershell
   cd "c:\Users\Nguyen Vu Hai Nam\Downloads\UTC_TinHocC_Antigravity\UTC_TinHocC\web"
   ```
2. Chạy lệnh:
   - Nếu máy đã cài Node.js toàn cục:
     ```bash
     node server.js
     ```
   - Hoặc dùng trực tiếp Node.js tích hợp sẵn:
     ```powershell
     & ".\.node\node-v22.16.0-win-x64\node.exe" server.js
     ```
3. Mở trình duyệt web truy cập: **`http://localhost:3000`**.

---

## 🔑 Hướng Dẫn Cấu Hình API Key Cho "Hỏi AI" Trên Windows

Website tích hợp backend server bảo mật, **không nhúng API key vào frontend**, đảm bảo an toàn tuyệt đối.

### Bước 1: Tạo file cấu hình `.env`
Trong thư mục `web/`, bạn sao chép file `.env.example` thành `.env`:
- Trên Windows PowerShell:
  ```powershell
  Copy-Item .env.example .env
  ```
- Hoặc dùng File Explorer: Chuột phải vào `.env.example` -> Copy -> Paste -> Đổi tên thành `.env`.

### Bước 2: Điền API Key
Mở file `.env` bằng Notepad (hoặc VS Code/Notepad++) và điền key của nhà cung cấp bạn muốn dùng:

```env
# Google Gemini (Khuyên dùng - miễn phí tạo tại Google AI Studio)
GEMINI_API_KEY=AIzaSy...dien_key_cua_ban_vao_day

# Anthropic Claude (Nếu có)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI GPT (Nếu có)
OPENAI_API_KEY=sk-...

# Cổng server (Mặc định 3000)
PORT=3000
```

> **Lưu ý:**
> - Nếu nhà cung cấp nào chưa có key, menu trên giao diện sẽ hiện nhãn **"(Chưa cấu hình)"** và khóa lựa chọn đó.
> - Nếu chưa cấu hình key nào hoặc API hết hạn mức (Quota Exceeded), khung "Hỏi AI" sẽ hiển thị thông báo hướng dẫn rõ ràng. **Tất cả các tính năng xem đề, làm nháp, mở lời giải và tải file vẫn hoạt động bình thường 100%!**

---

## 🎯 Các Chức Năng Chính

### 1. Dữ liệu chuẩn xác 113 câu hỏi & bài tập
- Dữ liệu tổng hợp từ `data/questions.json` và toàn bộ 113 file mã nguồn C trong `solutions/`.
- Giữ nguyên mã câu (id), tiêu đề câu và nhóm đề (`group`):
  - Đề Word 2016, Đề Word 2019 (từ 001 đến 030).
  - Đề ảnh 2021, 2023 (2TC_041, 2TC_048, 2TC_050, 2TC_05...).
  - Đề thi thử, đề trình chiếu.
  - Bộ 10 bài tập Mảng 1 chiều và 10 bài tập Mảng 2 chiều.
- Tuân thủ phong cách `templates/mau.c`: đặt hàm xử lý trước `main`, tên hàm tiếng Việt không dấu (`nhapDay`, `inDay`, `tinhTong`, `xuLy`...).

### 2. Tìm kiếm và Lọc thông minh
- Tìm theo **mã đề** (ví dụ gõ: `2019_012` sẽ hiện ngay các câu của đề này).
- Tìm theo từ khóa trong tiêu đề hoặc nội dung đề bài.
- Lọc theo trạng thái: **Tất cả**, **⚠️ Cần ôn lại**, **✅ Đã nắm**, **Chưa làm**.
- Thanh tiến độ hiển thị trực quan tỷ lệ câu đã nắm vững.

### 3. Khu vực làm bài & Tự lưu bản nháp
- Khi mở câu: ban đầu chỉ hiện đề bài và ô editor để sinh viên tự suy nghĩ viết code.
- Hỗ trợ phím `Tab` thụt 4 khoảng trắng.
- **Tự động lưu bài nháp** vào `localStorage` theo từng câu. Tải lại trang (`F5`) hoặc tắt trình duyệt mở lại vẫn giữ nguyên bài đang làm dở!
- Nút **"⬇️ Tải file .c"** để xuất bài làm về máy tính.
- Nút **"🔄 Viết lại"** để xóa nháp làm lại từ đầu.

### 4. Xem lời giải mẫu & Test cases
- Bấm **"👁️ Xem lời giải"** để mở:
  - Phân tích ý tưởng thuật toán (`approach`).
  - Code C chuẩn có **tô màu cú pháp (Syntax Highlighting)** đẹp mắt.
  - Nút **"📋 Sao chép code"** (1 chạm có thông báo xác nhận).
  - Nút **"⬇️ Tải file C mẫu"**.
  - Bảng ví dụ đầu vào/đầu ra (`stdin` / `stdout`).

### 5. Gia sư AI thông minh ("Hỏi AI")
- Đóng vai trò gia sư môn Tin học cơ sở UTC, giao tiếp hoàn toàn bằng tiếng Việt.
- **Menu Chọn Model**:
  - Nhóm theo nhà cung cấp: **Google Gemini**, **Anthropic Claude**, **OpenAI GPT**.
  - Tự động nhận diện key từ backend, ghi nhớ model đã chọn trong `localStorage`.
  - Hiển thị tên model bên cạnh từng câu trả lời.
- **3 Nút hỗ trợ nhanh**:
  - `💡 Gợi ý bước tiếp theo`: Đọc đề và code đang viết, gợi ý đúng 1 bước tiếp theo để sinh viên tự làm tiếp (nếu ô code trống, gợi ý nên viết hàm nào trước).
  - `🔍 Tìm lỗi trong code của tôi`: Chỉ ra dòng/đoạn có vấn đề, giải thích nguyên nhân và cung cấp bộ test case nhỏ để sinh viên tự kiểm tra.
  - `📖 Giải thích đoạn code`: Bôi đen bất kỳ đoạn code nào trong bài nháp hoặc lời giải rồi bấm nút để được giải thích chi tiết kèm ví dụ minh họa.
- **Lưu lịch sử trò chuyện theo từng câu riêng biệt**: Chuyển câu hỏi sẽ chuyển đúng cuộc trò chuyện của câu đó.

---

## 📂 Cấu Trúc Thư Mục `web/`

```
web/
├── .node/                 # Node.js runtime portable tích hợp sẵn (không cần cài thêm)
├── .env.example           # File mẫu hướng dẫn điền API Key
├── .env                   # File chứa API key thực tế (tạo từ .env.example)
├── package.json           # Thông tin dự án
├── server.js              # Backend server Node.js (phục vụ web & proxy AI API)
├── build-data.js          # Script trích xuất và đóng gói 113 câu hỏi từ nguồn
├── data.json              # Dữ liệu JSON của 113 câu hỏi kèm code C đầy đủ
├── data.js                # Dữ liệu JS nhúng trực tiếp cho frontend
├── index.html             # Giao diện chính (SPA)
├── style.css              # Giao diện hiện đại, responsive laptop & mobile
├── app.js                 # Toàn bộ logic frontend, tự lưu nháp, tìm kiếm, chat AI
├── start.bat              # Script 1-click khởi động web trên Windows
└── README.md              # Tài liệu hướng dẫn sử dụng
```
