# Thesis Portal — Hệ thống Quản lý Đồ án / Khóa luận Tốt nghiệp

> **Trạng thái: Đang phát triển (Development)** — dự án đang được xây dựng tích cực, một số tính năng đã hoàn thiện và nhiều tính năng đang trong quá trình triển khai.

Hệ thống web quản lý toàn bộ quy trình đăng ký và thực hiện đồ án / khóa luận tốt nghiệp của sinh viên, bao gồm: đăng ký đề tài, phân giảng viên hướng dẫn, xét duyệt, nộp báo cáo và chấm điểm.

## 🌐 Triển khai (Deploy)

| Thành phần | URL |
| --- | --- |
| **Frontend** | https://thesis-portal-ou.vercel.app/ |
| **Backend API** | https://ql-dakltn.onrender.com |
| **Swagger UI** | https://ql-dakltn.onrender.com/swagger/ |
| **Redoc** | https://ql-dakltn.onrender.com/redoc/ |
| **Django Admin** | https://ql-dakltn.onrender.com/admin/ |

> Frontend production trỏ về backend qua biến môi trường (`VITE_API_URL`, `VITE_AUTH_URL`) — xem phần [Cấu hình môi trường](#-cấu-hình-môi-trường).

## 🎯 Mục tiêu & Phạm vi

Hệ thống phục vụ 4 nhóm vai trò với các nghiệp vụ riêng biệt:

| Vai trò | Nghiệp vụ chính |
| --- | --- |
| **Sinh viên** | Đăng ký đồ án / khóa luận, chọn giảng viên nguyện vọng, theo dõi tiến độ, nộp báo cáo |
| **Giảng viên** | Quản lý danh sách đề tài gợi ý, xem & duyệt/từ chối đăng ký, chấm điểm, nhận xét báo cáo |
| **Nhân viên (Giáo vụ)** | Tạo & quản lý đợt đăng ký, phân giảng viên hướng dẫn, theo dõi danh sách đăng ký |
| **Quản trị viên** | Quản lý hệ thống, giảng viên, sinh viên, đề tài, hạn nộp, đợt đăng ký |

---

## 🧱 Kiến trúc & Công nghệ

Dự án được chia thành hai phần độc lập trong cùng một repo monorepo:

```
QL_DAKLTN/
├── backend/    # API server — Django REST Framework
└── frontend/   # SPA — React + TypeScript + Vite
```

### Backend (`backend/`)

| Thành phần | Công nghệ |
| --- | --- |
| Framework | Django 6.0 + Django REST Framework 3.17 |
| Database | PostgreSQL (kết nối qua `psycopg2`) |
| Xác thực | OAuth2 (django-oauth-toolkit, flow `password`) |
| API docs | Swagger UI / Redoc (drf-yasg) |
| CORS | django-cors-headers |
| Cấu hình | Biến môi trường qua `python-dotenv` (`.env`) |

```text
backend/
├── config/                 # Cấu hình dự án (settings, urls, wsgi, asgi)
├── core/                   # Tiện ích chung (r2_client.py — lưu file R2)
├── theses/
│   ├── models.py           # Mô hình dữ liệu (User, Faculty, ... Report, Grade)
│   ├── permissions.py      # Tầng phân quyền theo vai trò
│   ├── validators.py       # Bộ xác thực dùng chung
│   ├── views/              # ViewSet theo từng nghiệp vụ
│   ├── serializeres/       # DRF Serializers
│   └── urls.py             # API routes (DefaultRouter)
├── seed.py                 # Script tạo dữ liệu mẫu
└── run_django.sh           # Script khởi tạo & chạy nhanh
```

### Frontend (`frontend/`)

| **Thành phần** | Công nghệ |
| --- | --- |
| Framework | React 19 |
| Ngôn ngữ | TypeScript 7 |
| Build tool | Vite 8 |
| Style | Tailwind CSS 4 |
| Định tuyến | React Router 7 |
| HTTP | Axios (tích hợp OAuth2 Bearer token) |
| Icons | Font Awesome |
| Lint | Oxlint |

```
frontend/src/
├── components/
│   ├── Layout/           # SidebarItem
│   └── Ui/               # Button, Card, Input, Modal, Select, ...
├── config/Apis.ts        # Cấu hình axios & endpoint map
├── contexts/             # UserContext, ModalContext
├── hooks/                # useUser, useModal, useSearch
├── layouts/MainLayout.tsx # Khung giao diện chung (sidebar, header)
├── pages/                # Trang chức năng theo vai trò
├── routes/index.tsx      # Định nghĩa route
├── types/                # Kiểu dữ liệu & cấu hình hiển thị
└── utils/ApiHelper.ts    # Hàm gọi API (fetch/create/update/delete)
```

---

## 🗄️ Mô hình dữ liệu

Các entity chính trong `backend/theses/models.py`:

- **User** — người dùng với 4 vai trò (`student`, `lecturer`, `staff`, `admin`)
- **Faculty** — khoa; **Major** — ngành; **Specialization** — chuyên ngành
- **StudentProfile / LecturerProfile / StaffProfile** — hồ sơ chi tiết theo vai trò
- **ListOfTopics** — danh sách đề tài gợi ý của giảng viên
- **RegistrationPeriod** — đợt đăng ký (nhiều trạng thái: draft → student_registration → in_progress → report_submission → closed → archived)
- **ProjectRegistration** — phiếu đăng ký của sinh viên
- **RegistrationLecturer** — phân công giảng viên cho phiếu đăng ký (main/backup/reviewer, trạng thái pending/approved/rejected)
- **Report** — báo cáo định kỳ / cuối kỳ (nộp file lên Cloudflare R2, trạng thái submitted/reviewed/approved/rejected/late)
- **Grade** — điểm GVHD / phản biện / hội đồng *(backend có model, chưa có API)*

> Các ràng buộc nghiệp vụ quan trọng được thực thi bằng `CheckConstraint` / `UniqueConstraint` cấp DB (vd: một khoa chỉ có tối đa 1 đợt đang "mở", một sinh viên chỉ đăng ký 1 lần / đợt, không trùng đề tài của cùng giảng viên...).

---

## ✨ Tính năng đã triển khai (Backend)

API (`/api`):

- `users/profile` — xem thông tin hồ sơ theo vai trò
- `users/topics` — giảng viên quản lý (CRUD) danh sách đề tài của mình
- `lecturers` — danh sách / chi tiết giảng viên + đề tài theo khoa
- `specialization` — danh sách chuyên ngành
- `registration-periods` — danh sách / tạo đợt đăng ký (giáo vụ), hỗ trợ đợt `current` đang mở
- `registration-periods/:id/registrations` — danh sách & tạo đăng ký (sinh viên)
- `.../registrations/:rid/` — chi tiết đăng ký
- `.../approve` `.../reject` — giảng viên duyệt/từ chối nguyện vọng
- `.../add_lecturer` — giáo vụ phân giảng viên hướng dẫn
- `reports` — sinh viên nộp báo cáo định kỳ / cuối kỳ (file lưu trên Cloudflare R2)
- `reports/:id/download` — tải file báo cáo qua presigned URL
- `reports/:id/review` — giảng viên xem / góp ý / duyệt báo cáo định kỳ

Ngoài ra:
- **Phân quyền chi tiết** theo vai trò & khoa (`theses/permissions.py`)
- **Xác thực OAuth2** (password grant) với client id/secret
- **Validator chống dữ liệu không hợp lệ** & ký tự nguy hiểm (`validators.py`)
- **Lưu trữ file báo cáo** trên Cloudflare R2 (`core/r2_client.py`)
- **Script seed dữ liệu mẫu** phong phú (`seed.py`)

## ✅ Tính năng đã có trên giao diện (Frontend)

| Route | Vai trò | Mô tả |
| --- | --- | --- |
| `/login` | Tất cả | Đăng nhập qua OAuth2 |
| `/` | Tất cả | Dashboard *(đang là trang placeholder - chưa triển khai)* |
| `/profile` | Tất cả | Xem hồ sơ cá nhân theo vai trò |
| `/period` | Tất cả | Xem đợt đồ án / khóa luận theo trạng thái |
| `/topic-registration` | Sinh viên | Đăng ký đồ án / khóa luận, chọn GV, chọn đề tài |
| `/reports` | Sinh viên | Nộp & quản lý báo cáo định kỳ / cuối kỳ |
| `/topic-management` | Giảng viên | Quản lý đề tài gợi ý (CRUD) |
| `/report-schedule` | Giảng viên | Quản lý báo cáo định kỳ *(placeholder - chưa triển khai)* |
| `/grades-and-results` | Sinh viên / Giảng viên | Điểm & Kết quả *(placeholder - chưa triển khai)* |
| `/registration-periods` | Giáo vụ | Tạo / quản lý đợt đăng ký |
| `/students` | Giảng viên / Giáo vụ | Danh sách sinh viên & đăng ký, phân GVHD, duyệt |

---

## 🚀 Hướng dẫn cài đặt & chạy

### 1. Backend

**Yêu cầu:** Python 3.x, PostgreSQL đã tạo database.

```bash
cd backend

# Tạo & kích hoạt môi trường ảo
python -m venv venv
venv\Scripts\activate            # Windows
source venv/bin/activate         # macOS/Linux

# Cài phụ thuộc
pip install -r requirements.txt

# Cấu hình biến môi trường
copy .env.example .env           # Windows
cp .env.example .env             # macOS/Linux
# -> Điền đúng DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT

# Chạy migration & tạo siêu dùng
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Tạo dữ liệu mẫu (tuỳ chọn)
python seed.py run

# Chạy server
python manage.py runserver
```

API docs tại http://127.0.0.1:8000/swagger/ (Swagger) hoặc `/redoc/`.

> **Ghi chú:** file `run_django.sh` đóng gói các bước trên để chạy nhanh trên Linux/macOS.

### 2. Frontend

```bash
cd frontend

# Cài phụ thuộc
npm install

# Cấu hình biến môi trường (xem phần dưới)
copy .env.example .env           # Windows
cp .env.example .env             # macOS/Linux

# Chạy dev
npm run dev                      # http://127.0.0.1:5173
```

Các lệnh hữu ích:

```bash
npm run build      # Build production
npm run lint       # Kiểm tra mã với Oxlint
npm run preview    # Xem trước build
```

---

## ⚙️ Cấu hình môi trường

### Backend `.env`

```ini
DB_NAME=<tên_database>
DB_USER=<user_postgres>
DB_PASSWORD=<password>
DB_HOST=localhost
DB_PORT=5432

# OAuth2 client (lấy từ bảng oauth2_provider_application)
CLIENT_ID=<client_id_oauth>
CLIENT_SECRET=<client_secret_oauth>

# Cloudflare R2 — lưu trữ file báo cáo
R2_ACCOUNT_ID=<account_id>
R2_ACCESS_KEY_ID=<access_key_id>
R2_SECRET_ACCESS_KEY=<secret_access_key>
R2_BUCKET_NAME=internship-reports
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
```

### Frontend `.env`

```ini
# Local dev
VITE_API_URL=http://127.0.0.1:8000
VITE_CLIENT_ID_APP=<client_id_oauth>
VITE_CLIENT_SECRET_APP=<client_secret_oauth>
VITE_AUTH_URL=http://127.0.0.1:8000
```

> **Production (Vercel):** set các biến sau trên Vercel để frontend trỏ về backend đã deploy:
> `VITE_API_URL=https://ql-dakltn.onrender.com` và `VITE_AUTH_URL=https://ql-dakltn.onrender.com` (giữ nguyên client_id/secret).

> **Lưu ý:** các file `.env` đều nằm trong `.gitignore` và **không được** đẩy lên repo. Tạo file `.env` từ mẫu `.env.example`. client_id/secret lấy từ bảng `oauth2_provider_application` trong DB (do chưa có UI tạo app OAuth).

---

## 🔑 Tài khoản dữ liệu mẫu (từ `seed.py run`)

| Vai trò | Username | Password |
| --- | --- | --- |
| Nhân viên (hero) | `staff1` | `Staff@123` |
| Sinh viên (hero) | `student1` | `Student@123` |
| Giảng viên (hero) | `lecturer1` | `Lecturer@123` |
| Giảng viên khác | `lecturer2 ... lecturer7` | `Lecturer@123` |
| Sinh viên khác | `student2 ... student20` | `Student@123` |
| Nhân viên khác | `staff2`, `staff3` | `Staff@123` |

> Nhóm "hero" (`staff1`, `student1`, `lecturer1`) được tạo đầu tiên với dữ liệu đầy đủ nhất — thích hợp để test toàn bộ luồng nghiệp vụ chính.

---

## 🗺 Hướng phát triển (Đang & cần làm)

Dự án mới đang ở giai đoạn đầu; luồng **đăng ký – xét duyệt – phân GVHD** đã tương đối hoàn chỉnh. Các hạng mục tiếp theo:

### Backend
- [ ] Hoàn thiện API cho **Grade** (chấm điểm GVHD / phản biện / hội đồng)
- [ ] API quản lý **Faculty / Major / Specialization** (admin)
- [ ] Chuyển trạng thái `RegistrationPeriod` tự động theo thời gian (draft → open → ...)
- [ ] Script tạo và quản lý OAuth client
- [ ] Phân trang, lọc, tìm kiếm nâng cao
- [ ] Viết test tự động (`tests.py` hiện đang trống)

### Frontend
- [ ] Trang **Home / Dashboard** (hiện là placeholder)
- [ ] Trang **quản lý báo cáo** cho giảng viên (`/report-schedule`) và trang **chấm điểm / kết quả** (`/grades-and-results`)
- [ ] Trang **quản lý hệ thống** cho admin
- [ ] Chức năng **Chỉnh sửa hồ sơ** trong trang `/profile`
- [ ] Trang `registration-periods` — thêm tính năng **cập nhật** đợt
- [ ] Xử lý refresh token & kết nối lại khi token hết hạn
- [ ] Thông báo (bell) và trung tâm trợ giúp

---