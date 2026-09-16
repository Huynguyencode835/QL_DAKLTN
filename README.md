# Thesis Portal — Hệ thống Quản lý Đồ án / Khóa luận Tốt nghiệp

> **Trạng thái: Đang phát triển (Development)** — dự án đang được xây dựng tích cực,多数 tính năng đã hoàn thiện.

Hệ thống web quản lý toàn bộ quy trình đăng ký và thực hiện đồ án / khóa luận tốt nghiệp của sinh viên, bao gồm: đăng ký đề tài, phân giảng viên hướng dẫn, xét duyệt, nộp báo cáo, chấm điểm, và quản lý hội đồng.

## 🌐 Triển khai (Deploy)

| Thành phần | URL |
| --- | --- |
| **Frontend** | https://thesis-portal-ou.vercel.app/ |
| **Backend API** | https://ql-dakltn.onrender.com |
| **Swagger UI** | https://ql-dakltn.onrender.com/swagger/ |
| **Redoc** | https://ql-dakltn.onrender.com/redoc/ |
| **Django Admin** | https://ql-dakltn.onrender.com/admin/ |

> Frontend production trỏ về backend qua biến môi trường (`VITE_API_URL`, `VITE_AUTH_URL`) — xem phần [Cấu hình môi trường](#-cấu-hình-môi-trường).

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
| **Sinh viên** | Đăng ký đồ án / khóa luận, chọn giảng viên nguyện vọng, theo dõi tiến độ, nộp báo cáo, xem điểm & lịch bảo vệ |
| **Giảng viên** | Quản lý đề tài gợi ý, duyệt/từ chối đăng ký, chấm điểm, quản lý lịch báo cáo, hội đồng & phiên phản biện |
| **Nhân viên (Giáo vụ)** | Tạo & quản lý đợt đăng ký, phân giảng viên hướng dẫn, quản lý hội đồng, phản biện, báo cáo, sinh viên |
| **Quản trị viên** | Quản lý hệ thống (chưa có giao diện riêng) |

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
| Xác thực | OAuth2 (django-oauth-toolkit, flow `password` + cookie refresh token) |
| Task queue | Celery + Redis (tự động chuyển trạng thái đợt, gửi email) |
| API docs | Swagger UI / Redoc (drf-yasg) |
| Lưu file | Cloudflare R2 (S3-compatible) |
| CORS | django-cors-headers |
| Cấu hình | Biến môi trường qua `python-dotenv` (`.env`) |

```text
backend/
├── config/                 # Cấu hình dự án (settings, urls, wsgi, asgi)
<<<<<<< Updated upstream
├── core/                   # Tiện ích chung (r2_client.py — lưu file R2)
=======
├── core/
│   ├── r2_client.py        # Lưu & tải file từ Cloudflare R2
│   └── tasks.py            # Celery tasks (email, chuyển trạng thái)
>>>>>>> Stashed changes
├── theses/
│   ├── models.py           # Mô hình dữ liệu (20+ models)
│   ├── permissions.py      # 17 permission classes theo vai trò & khoa
│   ├── validators.py       # Bộ xác thực dùng chung (8 validators)
│   ├── views/              # ViewSet theo từng nghiệp vụ (10 view files)
│   ├── serializeres/       # DRF Serializers (10 serializer files)
│   ├── signals.py          # Cache invalidation, auto-scheduling
│   ├── tests.py            # Test tự động (443 dòng)
│   └── urls.py             # API routes (DefaultRouter)
├── seed.py                 # Script tạo dữ liệu mẫu phong phú
└── run_django.sh           # Script khởi tạo & chạy nhanh
```

### Frontend (`frontend/`)

| Thành phần | Công nghệ |
| --- | --- |
| Framework | React 19 |
| Ngôn ngữ | TypeScript 7 |
| Build tool | Vite 8 |
| Style | Tailwind CSS 4 (qua Vite plugin) |
| Định tuyến | React Router 7 |
| HTTP | Axios (tích hợp OAuth2 Bearer token + auto refresh) |
| Icons | Font Awesome 7 + Lucide React |
| PDF | react-pdf |
| Lint | Oxlint |

```
frontend/src/
├── components/
│   ├── Layout/              # SidebarItem
│   ├── Ui/                  # Button, Card, Input, Modal, Select, Badge, ...
│   ├── ManagementLayout/    # TwoPanelLayout, SidebarCardList, FormPanel, ...
│   ├── Cards/               # ItemCardGrid
│   └── Period/              # PeriodCardRegistration/InProgress/ReportSubmission/Closed
├── config/Apis.ts           # Cấu hình axios & endpoint map
├── contexts/                # UserContext, ToastContext, PeriodContext, ModalContext, PageHeaderContext
├── hooks/                   # useUser, useModal, useSearch, usePagination, useReportDetail
├── layouts/MainLayout.tsx   # Khung giao diện chung (sidebar, header)
├── pages/                   # 25 trang chức năng theo vai trò
├── routes/index.tsx         # Định nghĩa route với ProtectedRoute
├── types/                   # Kiểu dữ liệu (models, ui, config)
└── utils/                   # ApiHelper.ts, periodUtils.ts
```

---

## 🗄️ Mô hình dữ liệu

Các entity chính trong `backend/theses/models.py`:

**Cốt lõi:**
- **User** — người dùng với 4 vai trò (`student`, `lecturer`, `staff`, `admin`)
- **Faculty** — khoa; **Major** — ngành; **Specialization** — chuyên ngành
- **StudentProfile / LecturerProfile / StaffProfile** — hồ sơ chi tiết theo vai trò
<<<<<<< Updated upstream
- **ListOfTopics** — danh sách đề tài gợi ý của giảng viên
- **RegistrationPeriod** — đợt đăng ký (nhiều trạng thái: draft → student_registration → in_progress → report_submission → closed → archived)
- **ProjectRegistration** — phiếu đăng ký của sinh viên
- **RegistrationLecturer** — phân công giảng viên cho phiếu đăng ký (main/backup/reviewer, trạng thái pending/approved/rejected)
- **Report** — báo cáo định kỳ / cuối kỳ (nộp file lên Cloudflare R2, trạng thái submitted/reviewed/approved/rejected/late)
- **Grade** — điểm GVHD / phản biện / hội đồng *(backend có model, chưa có API)*
=======
- **AcademicDegree** — học hàm/học vị (Thạc sĩ, Tiến sĩ, Phó Giáo sư, Giáo sư) với chỉ tiêu SV tối đa
>>>>>>> Stashed changes

**Đề tài & Đăng ký:**
- **ListOfTopics** — danh sách đề tài gợi ý của giảng viên
- **RegistrationPeriod** — đợt đăng ký (draft → scheduled → student_registration → in_progress → report_submission → closed)
- **ProjectRegistration** — phiếu đăng ký của sinh viên (hỗ trợ nâng cấp từ đồ án → khóa luận)
- **RegistrationLecturer** — phân công giảng viên (main/preference/reviewer, pending/approved/rejected/skipped)

**Báo cáo:**
- **PeriodicReportSchedule** — lịch nộp báo cáo định kỳ
- **Report** — báo cáo định kỳ / cuối kỳ (file lưu trên Cloudflare R2, trạng thái submitted/reviewed/approved/rejected/late)

**Hội đồng & Phản biện:**
- **Committee** — hội đồng bảo vệ
- **CommitteeMember** — thành viên hội đồng (chair/secretary/member/reviewer)
- **ReviewerAssignmentSession** — phiên phản biện

**Chấm điểm:**
- **Grade** — điểm GVHD / phản biện / hội đồng (process/final/overall, auto-aggregate)
- **GradeWeightConfig** — cấu hình trọng số điểm theo đợt & phạm vi

> Các ràng buộc nghiệp vụ quan trọng được thực thi bằng `CheckConstraint` / `UniqueConstraint` cấp DB (vd: một khoa chỉ có tối đa 1 đợt đang "mở", một sinh viên chỉ đăng ký 1 lần / đợt, không trùng đề tài của cùng giảng viên, XOR constraint cho người chấm...).

---

## ✨ Tính năng đã triển khai

### Backend — API (`/api`)

<<<<<<< Updated upstream
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
=======
**Xác thực:**
- `POST /api/login/` — đăng nhập OAuth2, trả access_token + set refresh_token cookie
- `POST /api/token/refresh/` — làm mới token từ cookie
- `POST /api/logout/` — đăng xuất, thu hồi refresh token
- `GET /api/csrf/` — lấy CSRF cookie

**Người dùng & Hồ sơ:**
- `GET /api/users/profile/` — xem hồ sơ theo vai trò (student/lecturer/staff)
- `GET /api/users/topics/` — giảng viên quản lý (CRUD) danh sách đề tài
- `GET /api/users/my-committees/` — sinh viên xem hội đồng của mình
- `GET /api/users/my-reviewer-sessions/` — sinh viên xem phiên phản biện
- `GET /api/users/my-registration-periods/` — sinh viên xem các đợt đã đăng ký
>>>>>>> Stashed changes

**Giảng viên:**
- `GET /api/lecturers/` — danh sách giảng viên theo khoa
- `GET /api/lecturers/:id/topics/` — đề tài của giảng viên

**Đợt đăng ký:**
- CRUD `/api/registration-periods/` — giáo vụ tạo / cập nhật / xóa đợt (chỉ DRAFT)
- `POST .../publish/` — chuyển DRAFT → SCHEDULED, gửi email thông báo
- `POST .../create-thesis/` — tạo đợt khóa luận từ đợt đồ án đã đóng
- `POST .../convert-to-thesis/` — chuyển đổi đăng ký đủ điều kiện (final_score ≥ 8, GPA > 2.5)

**Đăng ký đề tài:**
- `GET/POST .../registrations/` — sinh viên tạo đăng ký, giáo viên/giáo vụ xem danh sách
- `PATCH .../registrations/:rid/approve/` — giảng viên duyệt nguyện vọng
- `PATCH .../registrations/:rid/reject/` — giảng viên từ chối nguyện vọng
- `PATCH .../registrations/:rid/add_lecturer/` — giáo vụ phân giảng viên hướng dẫn
- `GET .../reviewer-eligible-registrations/` — danh sách đăng ký khóa luận đủ điều kiện phản biện

**Lịch báo cáo:**
- `GET/POST .../schedules/` — giảng viên quản lý lịch báo cáo định kỳ
- `GET .../report-matrix/` — ma trận nộp báo cáo (grid view)

**Hội đồng:**
- CRUD `/api/registration-periods/:id/committees/` — giáo vụ quản lý hội đồng
- Phân quyền chi tiết: chair, secretary, member, reviewer

**Phiên phản biện:**
- CRUD `/api/registration-periods/:id/reviewer-sessions/` — giáo vụ quản lý phiên phản biện

**Báo cáo:**
- `POST /api/reports/upload-final/` — sinh viên nộp báo cáo cuối kỳ (PDF/DOCX, max 10MB)
- `GET /api/reports/final/` — xem báo cáo cuối kỳ + lịch sử
- `GET /api/reports/:id/download/` — tải file qua presigned URL (Cloudflare R2)
- `POST /api/schedules/:id/report/` — sinh viên nộp báo cáo định kỳ

**Chấm điểm:**
- `GET/POST /api/grades/` — giảng viên tạo điểm, xem theo vai trò
- `GET /api/grades/by-registration/?registration=X` — tổng hợp điểm theo đăng ký
- Tự động tính `final_score` dựa trên `GradeWeightConfig`

**Chức năng nâng cao:**
- **Celery tasks**: tự động chuyển trạng thái đợt đăng ký theo thời gian, gửi email thông báo
- **Cache invalidation**: Django signals cho Committee, CommitteeMember, RegistrationPeriod
- **Phân quyền chi tiết**: 17 permission classes theo vai trò & khoa
- **Validator**: 8 validators chống dữ liệu không hợp lệ & ký tự nguy hiểm
- **Test tự động**: 443 dòng test cho luồng duyệt đăng ký, race condition, migration

### Frontend — Giao diện

| Route | Vai trò | Mô tả |
| --- | --- | --- |
<<<<<<< Updated upstream
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
=======
| `/login` | Tất cả | Đăng nhập qua OAuth2 + remember me |
| `/` | Tất cả | Dashboard — thống kê + period cards theo vai trò |
| `/profile` | Tất cả | Xem & chỉnh sửa hồ sơ cá nhân |
| `/notifications` | Tất cả | Trung tâm thông báo *(dữ liệu mock)* |
| `/topic-registration` | Sinh viên | Two-panel: duyệt đề tài + đăng ký (chọn topic, chọn GV nguyện vọng) |
| `/reports-upload` | Sinh viên | Nộp báo cáo định kỳ / cuối kỳ (drag & drop) |
| `/my-defense-schedules` | Sinh viên | Lịch bảo vệ của tôi |
| `/grades-and-results` | Tất cả | Điểm & kết quả |
| `/topic-management` | Giảng viên | Two-panel: CRUD đề tài gợi ý |
| `/report-schedule` | Giảng viên | Two-panel: quản lý lịch báo cáo định kỳ |
| `/my-committees` | Giảng viên | Danh sách hội đồng + chi tiết (members, schedules, students) |
| `/my-reviewer-sessions` | Giảng viên | Danh sách phiên phản biện + chi tiết |
| `/period` | Giáo vụ | Danh sách đợt đăng ký + chi tiết timeline |
| `/manage-registration-period` | Giáo vụ | Two-panel: CRUD đợt đăng ký + gửi email |
| `/manage-committee` | Giáo vụ | Two-panel: CRUD hội đồng + phân thành viên |
| `/manage-reviewer-sessions` | Giáo vụ | Two-panel: CRUD phiên phản biện |
| `/manage-student-and-registration` | Giáo vụ | Two-panel: quản lý sinh viên & đăng ký, phân GVHD |
| `/reports-management` | Giáo vụ | Xem & tải báo cáo của sinh viên |
>>>>>>> Stashed changes

---

## 🚀 Hướng dẫn cài đặt & chạy

### 1. Backend

**Yêu cầu:** Python 3.x, PostgreSQL, Redis.

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
# -> Điền đầy đủ thông tin DB, OAuth, R2, Redis

# Chạy migration & tạo siêu dụng
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Tạo dữ liệu mẫu (tuỳ chọn)
python seed.py run

# Chạy Celery worker (mở terminal riêng)
celery -A config worker -l info

# Chạy server
python manage.py runserver
```

API docs tại http://127.0.0.1:8000/swagger/ (Swagger) hoặc `/redoc/`.

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
# Database
DB_NAME=<tên_database>
DB_USER=<user_postgres>
DB_PASSWORD=<password>
DB_HOST=localhost
DB_PORT=5432

# OAuth2 client (lấy từ bảng oauth2_provider_application)
CLIENT_ID=<client_id_oauth>
CLIENT_SECRET=<client_secret_oauth>

<<<<<<< Updated upstream
=======
# Redis (cho Celery)
REDIS_URL=redis://127.0.0.1:6379/0

>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
> **Lưu ý:** các file `.env` đều nằm trong `.gitignore` và **không được** đẩy lên repo. Tạo file `.env` từ mẫu `.env.example`. client_id/secret lấy từ bảng `oauth2_provider_application` trong DB (do chưa có UI tạo app OAuth).
=======
> **Lưu ý:** các file `.env` đều nằm trong `.gitignore` và **không được** đẩy lên repo. client_id/secret lấy từ bảng `oauth2_provider_application` trong DB (do chưa có UI tạo app OAuth).
>>>>>>> Stashed changes

---

## 🔑 Tài khoản dữ liệu mẫu (từ `seed.py run`)

| Vai trò | Username | Password |
| --- | --- | --- |
| Admin (superuser) | `admin` | `Admin@123` |
| Nhân viên (hero) | `staff1` | `Staff@123` |
| Sinh viên (hero) | `student1` | `Student@123` |
| Giảng viên (hero) | `lecturer1` | `Lecturer@123` |
| Giảng viên khác | `lecturer2 ... lecturer7` | `Lecturer@123` |
| Sinh viên khác | `student2 ... student26` | `Student@123` |
| Nhân viên khác | `staff2`, `staff3` | `Staff@123` |

> Nhóm "hero" (`staff1`, `student1`, `lecturer1`) được tạo đầu tiên với dữ liệu đầy đủ nhất — thích hợp để test toàn bộ luồng nghiệp vụ chính.

> Dữ liệu mẫu bao gồm: 2 khoa, 4 ngành, 6 chuyên ngành, 8 đợt đăng ký (mix CLOSED/REGISTRATION), 25+ đăng ký (các trạng thái), 2 hội đồng với thành viên, phiên phản biện, điểm GVHD & hội đồng.

---

## 🗺 Hướng phát triển

### Đã hoàn thành
- [x] Đăng nhập OAuth2 + cookie refresh token
- [x] Quản lý đề tài (CRUD cho giảng viên)
- [x] Đăng ký đề tài (sinh viên chọn topic + GV nguyện vọng)
- [x] Duyệt/từ chối đăng ký (giảng viên)
- [x] Phân giảng viên hướng dẫn (giáo vụ)
- [x] Đợt đăng ký — lifecycle đầy đủ (draft → scheduled → in_progress → report_submission → closed)
- [x] Nâng cấp đồ án → khóa luận (auto-check final_score ≥ 8, GPA > 2.5)
- [x] Quản lý hội đồng (CRUD + phân thành viên)
- [x] Quản lý phiên phản biện
- [x] Nộp báo cáo (định kỳ + cuối kỳ, lưu trên Cloudflare R2)
- [x] Ma trận nộp báo cáo (grid view)
- [x] Chấm điểm (GVHD / phản biện / hội đồng) + auto-aggregate
- [x] Cấu hình trọng số điểm theo đợt
- [x] Celery tasks — tự động chuyển trạng thái + gửi email
- [x] Phân quyền chi tiết theo vai trò & khoa (17 permission classes)
- [x] Test tự động cho luồng duyệt đăng ký & race condition
- [x] Frontend — 25 trang hoàn chỉnh theo 3 vai trò

<<<<<<< Updated upstream
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
=======
### Cần làm tiếp
- [ ] Giao diện quản trị cho admin (Faculty / Major / Specialization)
- [ ] Trang Thông báo — nối API thay vì dữ liệu mock
- [ ] API CRUD Faculty / Major / Specialization (admin)
- [ ] Phân trang, lọc, tìm kiếm nâng cao
- [ ] Xử lý refresh token khi reconnect (offline → online)
- [ ] Tối ưu UX cho mobile

---

## 📚 Tài nguyên & Tài liệu liên quan

- Swagger UI: `http://127.0.0.1:8000/swagger/`
- Redoc: `http://127.0.0.1:8000/redoc/`
- Django Admin: `http://127.0.0.1:8000/admin/`

---

> **Lưu ý phát triển:** luôn kiểm tra lại `.env` của backend (PostgreSQL, Redis, R2) và của frontend (OAuth client, API URL) trước khi chạy. Không commit bất kỳ file `.env` nào.
>>>>>>> Stashed changes
