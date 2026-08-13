import os
import sys
import django
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from django.utils import timezone

from theses.models import (
    User, Faculty, Major, Specialization, AcademicDegree,
    StudentProfile, LecturerProfile, StaffProfile,
    ListOfTopics, RegistrationPeriod, ProjectRegistration,
    RegistrationLecturer,
)

# Map nhãn học vị trong lecturers_data -> tên (name) của AcademicDegree
DEGREE_LABEL_TO_NAME = {
    'Tiến sĩ': AcademicDegree.DegreeName.DOCTOR,
    'Thạc sĩ': AcademicDegree.DegreeName.MASTER,
    'Phó giáo sư - Tiến sĩ': AcademicDegree.DegreeName.ASSOC_PROF,
    'Phó giáo sư': AcademicDegree.DegreeName.ASSOC_PROF,
    'Giáo sư': AcademicDegree.DegreeName.PROF,
}

DEGREE_DATA = [
    {'name': AcademicDegree.DegreeName.MASTER, 'max_students_quota': 14},
    {'name': AcademicDegree.DegreeName.DOCTOR, 'max_students_quota': 16},
    {'name': AcademicDegree.DegreeName.ASSOC_PROF, 'max_students_quota': 18},
    {'name': AcademicDegree.DegreeName.PROF, 'max_students_quota': 20},
]


# ============================================================
# ===================  TÀI KHOẢN HERO  ======================
# staff1 / student1 / lecturer1 là 3 tài khoản trung tâm của
# toàn bộ seed data — được tạo TRƯỚC TIÊN, có dữ liệu đầy đủ
# nhất, và dùng để test toàn bộ luồng nghiệp vụ chính:
#   - staff1: tạo & quản lý các RegistrationPeriod của khoa CNTT
#   - student1: có 1 đăng ký đồ án hoàn chỉnh, đã được duyệt
#   - lecturer1: có nhiều đề tài (10) và hướng dẫn nhiều sinh
#     viên với đủ các trạng thái duyệt (APPROVED/REJECTED/PENDING)
# ============================================================

HERO_STAFF_USERNAME = 'staff1'
HERO_STUDENT_USERNAME = 'student1'
HERO_LECTURER_USERNAME = 'lecturer1'


# ============================================================
# DANH MỤC GỐC: Khoa, Ngành, Chuyên ngành
# ============================================================

faculty_data = [
    {
        'name': 'Công nghệ thông tin',
        'description': 'Khoa Công nghệ thông tin - Đại học Mở TP.HCM',
    },
    {
        'name': 'Kinh tế - Quản trị kinh doanh',
        'description': 'Khoa Kinh tế và Quản trị kinh doanh',
    },
]

major_data = [
    {'major_name': 'Kỹ thuật phần mềm', 'training_duration': 4, 'faculty_idx': 0},
    {'major_name': 'Hệ thống thông tin quản lý', 'training_duration': 4, 'faculty_idx': 0},
    {'major_name': 'Quản trị kinh doanh', 'training_duration': 4, 'faculty_idx': 1},
    {'major_name': 'Khoa học máy tính', 'training_duration': 4, 'faculty_idx': 0},
]

specialization_data = [
    {'name': 'Khoa học máy tính', 'faculty_idx': 0},
    {'name': 'Công nghệ phần mềm', 'faculty_idx': 0},
    {'name': 'Trí tuệ nhân tạo', 'faculty_idx': 0},
    {'name': 'Marketing', 'faculty_idx': 1},
    {'name': 'An toàn thông tin', 'faculty_idx': 0},
    {'name': 'Kỹ thuật máy tính', 'faculty_idx': 0},
]


# ============================================================
# SINH VIÊN
# student1 (index 0) là tài khoản hero — sẽ có đăng ký hoàn
# chỉnh (APPROVED) với lecturer1 để test đầy đủ luồng chi tiết.
# ============================================================

students_data = [
    {
        'username': 'student1', 'email': 'student1@ou.edu.vn',
        'first_name': 'Nguyễn Văn', 'last_name': 'An',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210001', 'class_name': 'DHCNTT19A',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2021-2025', 'gpa': 3.45, 'conduct_score': 90,
            'major_idx': 0,
        },
    },
    {
        'username': 'student2', 'email': 'student2@ou.edu.vn',
        'first_name': 'Lê Thị', 'last_name': 'Mai',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210002', 'class_name': 'DHCNTT19A',
            'training_type': 'regular', 'program_type': 'high_quality',
            'academic_year': '2021-2025', 'gpa': 3.78, 'conduct_score': 95,
            'major_idx': 1,
        },
    },
    {
        'username': 'student3', 'email': 'student3@ou.edu.vn',
        'first_name': 'Phạm Minh', 'last_name': 'Hoàng',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210003', 'class_name': 'DHCNTT19B',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2021-2025', 'gpa': 3.15, 'conduct_score': 85,
            'major_idx': 0,
        },
    },
    {
        'username': 'student4', 'email': 'student4@ou.edu.vn',
        'first_name': 'Trần Đức', 'last_name': 'Huy',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210004', 'class_name': 'DHCNTT19B',
            'training_type': 'regular', 'program_type': 'high_quality',
            'academic_year': '2021-2025', 'gpa': 2.95, 'conduct_score': 80,
            'major_idx': 1,
        },
    },
    {
        'username': 'student5', 'email': 'student5@ou.edu.vn',
        'first_name': 'Ngô Thị', 'last_name': 'Hồng',
        'password': 'Student@123', 'faculty_idx': 1,
        'profile': {
            'student_id': '31220001', 'class_name': 'DHQTKD20A',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2022-2026', 'gpa': 3.62, 'conduct_score': 88,
            'major_idx': 2,
        },
    },
    {
        'username': 'student6', 'email': 'student6@ou.edu.vn',
        'first_name': 'Bùi Thanh', 'last_name': 'Sơn',
        'password': 'Student@123', 'faculty_idx': 1,
        'profile': {
            'student_id': '31220002', 'class_name': 'DHQTKD20B',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2022-2026', 'gpa': 3.05, 'conduct_score': 82,
            'major_idx': 2,
        },
    },
    {
        'username': 'student7', 'email': 'student7@ou.edu.vn',
        'first_name': 'Đặng Hoàng', 'last_name': 'Nam',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210005', 'class_name': 'DHCNTT19A',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2021-2025', 'gpa': 3.62, 'conduct_score': 92,
            'major_idx': 0,
        },
    },
    {
        'username': 'student8', 'email': 'student8@ou.edu.vn',
        'first_name': 'Võ Thị', 'last_name': 'Hà',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210006', 'class_name': 'DHCNTT19A',
            'training_type': 'regular', 'program_type': 'high_quality',
            'academic_year': '2021-2025', 'gpa': 3.88, 'conduct_score': 97,
            'major_idx': 1,
        },
    },
    {
        'username': 'student9', 'email': 'student9@ou.edu.vn',
        'first_name': 'Nguyễn Minh', 'last_name': 'Trí',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210007', 'class_name': 'DHCNTT19B',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2021-2025', 'gpa': 2.75, 'conduct_score': 78,
            'major_idx': 0,
        },
    },
    {
        'username': 'student10', 'email': 'student10@ou.edu.vn',
        'first_name': 'Lâm Quốc', 'last_name': 'Bảo',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210008', 'class_name': 'DHCNTT19B',
            'training_type': 'regular', 'program_type': 'high_quality',
            'academic_year': '2021-2025', 'gpa': 3.52, 'conduct_score': 90,
            'major_idx': 3,
        },
    },
    {
        'username': 'student11', 'email': 'student11@ou.edu.vn',
        'first_name': 'Trần Thanh', 'last_name': 'Thảo',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210009', 'class_name': 'DHCNTT20A',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2022-2026', 'gpa': 3.35, 'conduct_score': 85,
            'major_idx': 3,
        },
    },
    {
        'username': 'student12', 'email': 'student12@ou.edu.vn',
        'first_name': 'Hoàng Ngọc', 'last_name': 'Ánh',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210010', 'class_name': 'DHCNTT20A',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2022-2026', 'gpa': 3.92, 'conduct_score': 98,
            'major_idx': 1,
        },
    },
    {
        'username': 'student13', 'email': 'student13@ou.edu.vn',
        'first_name': 'Phan Gia', 'last_name': 'Khiêm',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210011', 'class_name': 'DHCNTT20B',
            'training_type': 'distance', 'program_type': 'standard',
            'academic_year': '2022-2026', 'gpa': 2.60, 'conduct_score': 70,
            'major_idx': 0,
        },
    },
    {
        'username': 'student14', 'email': 'student14@ou.edu.vn',
        'first_name': 'Đỗ Thị', 'last_name': 'Kim Ngân',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210012', 'class_name': 'DHCNTT20B',
            'training_type': 'regular', 'program_type': 'high_quality',
            'academic_year': '2022-2026', 'gpa': 3.71, 'conduct_score': 93,
            'major_idx': 3,
        },
    },
    {
        'username': 'student15', 'email': 'student15@ou.edu.vn',
        'first_name': 'Vũ Đình', 'last_name': 'Khoa',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210013', 'class_name': 'DHCNTT19A',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2021-2025', 'gpa': 3.20, 'conduct_score': 84,
            'major_idx': 1,
        },
    },
    {
        'username': 'student16', 'email': 'student16@ou.edu.vn',
        'first_name': 'Trịnh Bảo', 'last_name': 'Châu',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210014', 'class_name': 'DHCNTT19B',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2021-2025', 'gpa': 2.50, 'conduct_score': 65,
            'major_idx': 0,
        },
    },
    {
        'username': 'student17', 'email': 'student17@ou.edu.vn',
        'first_name': 'Lý Hoàng', 'last_name': 'Phúc',
        'password': 'Student@123', 'faculty_idx': 0,
        'profile': {
            'student_id': '31210015', 'class_name': 'DHCNTT20A',
            'training_type': 'regular', 'program_type': 'high_quality',
            'academic_year': '2022-2026', 'gpa': 3.15, 'conduct_score': 81,
            'major_idx': 3,
        },
    },
    {
        'username': 'student18', 'email': 'student18@ou.edu.vn',
        'first_name': 'Châu Tuyết', 'last_name': 'Nhi',
        'password': 'Student@123', 'faculty_idx': 1,
        'profile': {
            'student_id': '31220003', 'class_name': 'DHQTKD20A',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2022-2026', 'gpa': 3.10, 'conduct_score': 86,
            'major_idx': 2,
        },
    },
    {
        'username': 'student19', 'email': 'student19@ou.edu.vn',
        'first_name': 'Đinh Nhật', 'last_name': 'Anh',
        'password': 'Student@123', 'faculty_idx': 1,
        'profile': {
            'student_id': '31220004', 'class_name': 'DHQTKD20B',
            'training_type': 'regular', 'program_type': 'standard',
            'academic_year': '2022-2026', 'gpa': 2.80, 'conduct_score': 75,
            'major_idx': 2,
        },
    },
    {
        'username': 'student20', 'email': 'student20@ou.edu.vn',
        'first_name': 'Huỳnh Gia', 'last_name': 'Bảo',
        'password': 'Student@123', 'faculty_idx': 1,
        'profile': {
            'student_id': '31220005', 'class_name': 'DHQTKD21A',
            'training_type': 'distance', 'program_type': 'standard',
            'academic_year': '2023-2027', 'gpa': 3.40, 'conduct_score': 89,
            'major_idx': 2,
        },
    },
]


# ============================================================
# GIẢNG VIÊN
# lecturer1 (index 0) là tài khoản hero — có nhiều đề tài (10)
# và hướng dẫn nhiều sinh viên với đủ các trạng thái đăng ký.
# ============================================================

lecturers_data = [
    {
        'username': 'lecturer1', 'email': 'lecturer1@ou.edu.vn',
        'first_name': 'Trần Thị', 'last_name': 'Bình',
        'password': 'Lecturer@123', 'faculty_idx': 0,
        'profile': {'academic_degree': 'Tiến sĩ', 'position': 'Trưởng bộ môn'},
        'specializations': [0, 1, 2],
        'topics': [
            {'title': 'Xây dựng hệ thống quản lý khóa luận tốt nghiệp',
             'description': 'Xây dựng hệ thống web quản lý toàn bộ quy trình đăng ký và thực hiện KLTN.',
             'technology': 'Django, React, PostgreSQL', 'difficulty_level': 'medium'},
            {'title': 'Ứng dụng blockchain trong lưu trữ văn bằng',
             'description': 'Nghiên cứu ứng dụng blockchain để lưu trữ và xác thực văn bằng tốt nghiệp.',
             'technology': 'Ethereum, Solidity, IPFS', 'difficulty_level': 'difficult'},
            {'title': 'Phát triển API Gateway cho hệ thống vi dịch vụ',
             'description': 'Xây dựng API Gateway để quản lý và định tuyến các micro-service trong hệ thống phân tán.',
             'technology': 'Node.js, Express, Redis, Docker', 'difficulty_level': 'medium'},
            {'title': 'Hệ thống quản lý thư viện số',
             'description': 'Xây dựng hệ thống quản lý và tra cứu tài liệu số cho thư viện trường.',
             'technology': 'Django, Elasticsearch, React', 'difficulty_level': 'easy'},
            {'title': 'Ứng dụng đặt xe nội bộ cho doanh nghiệp',
             'description': 'Xây dựng ứng dụng đặt xe đưa đón nhân viên trong nội bộ doanh nghiệp.',
             'technology': 'Flutter, Firebase, Google Maps API', 'difficulty_level': 'easy'},
            {'title': 'Hệ thống giám sát hiệu năng vi dịch vụ',
             'description': 'Xây dựng dashboard giám sát hiệu năng và log tập trung cho kiến trúc microservices.',
             'technology': 'Prometheus, Grafana, ELK Stack, Kubernetes', 'difficulty_level': 'difficult'},
            {'title': 'Nền tảng thi trực tuyến chống gian lận',
             'description': 'Xây dựng hệ thống thi trực tuyến tích hợp giám sát webcam phát hiện gian lận.',
             'technology': 'Django, OpenCV, WebRTC, React', 'difficulty_level': 'difficult'},
            {'title': 'Ứng dụng quản lý ký túc xá sinh viên',
             'description': 'Xây dựng hệ thống quản lý phòng, đăng ký ở, và thanh toán phí ký túc xá.',
             'technology': 'Laravel, MySQL, Vue.js', 'difficulty_level': 'easy'},
            {'title': 'Hệ thống chấm điểm tự động bài tập lập trình',
             'description': 'Xây dựng hệ thống chấm tự động bài tập lập trình sử dụng sandbox thực thi mã.',
             'technology': 'Python, Docker, FastAPI, Judge0', 'difficulty_level': 'medium'},
            {'title': 'Ứng dụng quản lý chuỗi cung ứng sử dụng blockchain',
             'description': 'Ứng dụng blockchain để truy xuất nguồn gốc hàng hóa trong chuỗi cung ứng.',
             'technology': 'Hyperledger Fabric, Node.js, React', 'difficulty_level': 'difficult'},
        ],
    },
    {
        'username': 'lecturer2', 'email': 'lecturer2@ou.edu.vn',
        'first_name': 'Nguyễn Hoàng', 'last_name': 'Long',
        'password': 'Lecturer@123', 'faculty_idx': 0,
        'profile': {'academic_degree': 'Tiến sĩ', 'position': 'Giảng viên chính'},
        'specializations': [2],
        'topics': [
            {'title': 'Nhận diện khuôn mặt sử dụng deep learning',
             'description': 'Xây dựng ứng dụng nhận diện khuôn mặt bằng các mô hình deep learning tiên tiến.',
             'technology': 'Python, TensorFlow, OpenCV', 'difficulty_level': 'difficult'},
            {'title': 'Chatbot hỗ trợ tư vấn tuyển sinh',
             'description': 'Phát triển chatbot sử dụng NLP để tư vấn tuyển sinh cho thí sinh.',
             'technology': 'Python, Rasa, Dialogflow, PostgreSQL', 'difficulty_level': 'medium'},
            {'title': 'Phân tích cảm xúc trên mạng xã hội',
             'description': 'Sử dụng machine learning để phân tích cảm xúc người dùng trên các nền tảng mạng xã hội.',
             'technology': 'Python, Scikit-learn, Kafka, MongoDB', 'difficulty_level': 'difficult'},
            {'title': 'Hệ thống gợi ý sản phẩm thương mại điện tử',
             'description': 'Xây dựng hệ thống gợi ý sản phẩm sử dụng collaborative filtering và content-based filtering.',
             'technology': 'Python, Spark, Elasticsearch, Redis', 'difficulty_level': 'medium'},
        ],
    },
    {
        'username': 'lecturer3', 'email': 'lecturer3@ou.edu.vn',
        'first_name': 'Lê Minh', 'last_name': 'Quân',
        'password': 'Lecturer@123', 'faculty_idx': 0,
        'profile': {'academic_degree': 'Thạc sĩ', 'position': 'Giảng viên'},
        'specializations': [1],
        'topics': [
            {'title': 'Website thương mại điện tử Spring Boot',
             'description': 'Xây dựng website thương mại điện tử sử dụng Spring Boot và React.',
             'technology': 'Java Spring Boot, React, MySQL, Redis', 'difficulty_level': 'medium'},
            {'title': 'App quản lý chi tiêu cá nhân',
             'description': 'Phát triển ứng dụng mobile quản lý chi tiêu cá nhân trên nền tảng Flutter.',
             'technology': 'Flutter, Dart, Firebase, SQLite', 'difficulty_level': 'easy'},
            {'title': 'Hệ thống đặt lịch khám bệnh trực tuyến',
             'description': 'Xây dựng hệ thống đặt lịch khám bệnh từ xa cho các phòng khám đa khoa.',
             'technology': 'ASP.NET Core, Angular, SQL Server, SignalR', 'difficulty_level': 'medium'},
        ],
    },
    {
        'username': 'lecturer4', 'email': 'lecturer4@ou.edu.vn',
        'first_name': 'Hoàng Thị', 'last_name': 'Lan',
        'password': 'Lecturer@123', 'faculty_idx': 0,
        'profile': {'academic_degree': 'Phó giáo sư - Tiến sĩ', 'position': 'Phó trưởng khoa'},
        'specializations': [0, 2],
        'topics': [
            {'title': 'Phát hiện xâm nhập mạng sử dụng học sâu',
             'description': 'Xây dựng hệ thống phát hiện xâm nhập mạng dựa trên các mô hình deep learning cho dữ liệu gói tin.',
             'technology': 'Python, PyTorch, Wireshark, Docker', 'difficulty_level': 'difficult'},
            {'title': 'Hệ thống quản lý học tập thông minh',
             'description': 'Phát triển LMS tích hợp AI đề xuất lộ trình học tập cá nhân hóa cho sinh viên.',
             'technology': 'Django, React, PostgreSQL, Scikit-learn', 'difficulty_level': 'medium'},
            {'title': 'Ứng dụng IoT giám sát chất lượng không khí',
             'description': 'Xây dựng hệ thống IoT thu thập và giám sát chất lượng không khí theo thời gian thực.',
             'technology': 'Arduino, Raspberry Pi, MQTT, InfluxDB, Grafana', 'difficulty_level': 'difficult'},
        ],
    },
    {
        'username': 'lecturer5', 'email': 'lecturer5@ou.edu.vn',
        'first_name': 'Võ Văn', 'last_name': 'Tuấn',
        'password': 'Lecturer@123', 'faculty_idx': 1,
        'profile': {'academic_degree': 'Tiến sĩ', 'position': 'Trưởng bộ môn'},
        'specializations': [3],
        'topics': [
            {'title': 'Phân tích hành vi khách hàng trong thương mại điện tử',
             'description': 'Sử dụng dữ liệu lớn để phân tích và dự đoán hành vi mua sắm của khách hàng trực tuyến.',
             'technology': 'Python, Tableau, BigQuery, Power BI', 'difficulty_level': 'medium'},
            {'title': 'Chiến lược marketing số cho doanh nghiệp nhỏ',
             'description': 'Nghiên cứu và đề xuất chiến lược marketing số tối ưu cho doanh nghiệp vừa và nhỏ.',
             'technology': 'Google Analytics, Facebook Ads, SEO', 'difficulty_level': 'easy'},
            {'title': 'Hệ thống dự báo doanh số bán lẻ',
             'description': 'Xây dựng mô hình dự báo doanh số cho chuỗi cửa hàng bán lẻ dựa trên dữ liệu lịch sử.',
             'technology': 'Python, Prophet, Power BI, SQL Server', 'difficulty_level': 'medium'},
        ],
    },
    {
        'username': 'lecturer6', 'email': 'lecturer6@ou.edu.vn',
        'first_name': 'Nguyễn Thị Thanh', 'last_name': 'Hương',
        'password': 'Lecturer@123', 'faculty_idx': 0,
        'profile': {'academic_degree': 'Thạc sĩ', 'position': 'Giảng viên'},
        'specializations': [0, 2],
        'topics': [
            {'title': 'Xây dựng ứng dụng học ngoại ngữ với AI',
             'description': 'Phát triển ứng dụng mobile hỗ trợ học ngoại ngữ tích hợp trí tuệ nhân tạo nhận diện giọng nói.',
             'technology': 'Flutter, TensorFlow Lite, Firebase, Python', 'difficulty_level': 'medium'},
            {'title': 'Hệ thống khuyến nghị việc làm thông minh',
             'description': 'Xây dựng hệ thống gợi ý việc làm dựa trên kỹ năng và sở thích của người tìm việc sử dụng machine learning.',
             'technology': 'Python, Scikit-learn, Elasticsearch, React, Docker', 'difficulty_level': 'medium'},
            {'title': 'Ứng dụng thực tế ảo hỗ trợ học tập lịch sử',
             'description': 'Phát triển ứng dụng VR giúp học sinh tương tác với các sự kiện lịch sử qua mô phỏng 3D.',
             'technology': 'Unity, C#, Blender, Oculus SDK', 'difficulty_level': 'difficult'},
        ],
    },
    {
        'username': 'lecturer7', 'email': 'lecturer7@ou.edu.vn',
        'first_name': 'Phạm Văn', 'last_name': 'Dũng',
        'password': 'Lecturer@123', 'faculty_idx': 0,
        'profile': {'academic_degree': 'Tiến sĩ', 'position': 'Trưởng bộ môn'},
        'specializations': [0, 4],
        'topics': [
            {'title': 'Phát hiện mã độc sử dụng học máy',
             'description': 'Xây dựng hệ thống phát hiện mã độc dựa trên đặc trưng hành vi sử dụng các thuật toán học máy.',
             'technology': 'Python, Scikit-learn, Cuckoo Sandbox, Docker', 'difficulty_level': 'difficult'},
            {'title': 'Xác thực đa nhân tố sử dụng sinh trắc học hành vi',
             'description': 'Nghiên cứu và phát triển hệ thống xác thực dựa trên hành vi gõ phím và di chuyển chuột.',
             'technology': 'Python, JavaScript, MongoDB, FastAPI', 'difficulty_level': 'difficult'},
            {'title': 'Hệ thống quản lý bản quyền phần mềm trên nền tảng đám mây',
             'description': 'Xây dựng giải pháp quản lý và bảo vệ bản quyền phần mềm sử dụng công nghệ cloud computing.',
             'technology': 'AWS, Node.js, PostgreSQL, Redis, Nginx', 'difficulty_level': 'medium'},
            {'title': 'Phân tích mã độc IoT sử dụng kỹ thuật hộp đen',
             'description': 'Nghiên cứu và phát triển phương pháp phân tích mã độc trên thiết bị IoT bằng kỹ thuật hộp đen.',
             'technology': 'Python, Ghidra, Wireshark, Raspberry Pi', 'difficulty_level': 'difficult'},
        ],
    },
]


# ============================================================
# GIÁO VỤ (STAFF)
# staff1 (index 0) là tài khoản hero — là người tạo phần lớn
# các đợt đăng ký của khoa CNTT, phủ đủ mọi trạng thái.
# ============================================================

staffs_data = [
    {
        'username': 'staff1', 'email': 'staff1@ou.edu.vn',
        'first_name': 'Lê Văn', 'last_name': 'Cường',
        'password': 'Staff@123', 'faculty_idx': 0,
        'profile': {'position': 'Trưởng phòng đào tạo'},
    },
    {
        'username': 'staff2', 'email': 'staff2@ou.edu.vn',
        'first_name': 'Phạm Thị', 'last_name': 'Hoa',
        'password': 'Staff@123', 'faculty_idx': 0,
        'profile': {'position': 'Trợ lý khoa'},
    },
    {
        'username': 'staff3', 'email': 'staff3@ou.edu.vn',
        'first_name': 'Đinh Văn', 'last_name': 'Tuấn',
        'password': 'Staff@123', 'faculty_idx': 1,
        'profile': {'position': 'Chuyên viên đào tạo'},
    },
]


# ============================================================
# HÀM TẠO DÙNG CHUNG
# Tách riêng logic tạo student/lecturer/staff thành hàm để
# gọi lại cho cả hero (tạo trước, nổi bật) lẫn user còn lại
# (tạo sau, theo vòng lặp bình thường) mà không lặp code.
# ============================================================

def create_student(data, faculties, majors):
    faculty = faculties[data['faculty_idx']]
    major = majors[data['profile']['major_idx']]
    user, created = User.objects.get_or_create(
        username=data['username'],
        defaults={
            'email': data['email'],
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'role': 'student',
            'phone_number': f"09{str(hash(data['username']) % 100000000).zfill(8)}",
            'dob': date(2002, 5, 15),
            'faculty': faculty,
        },
    )
    if created:
        user.set_password(data['password'])
        user.save()
        p = data['profile']
        StudentProfile.objects.get_or_create(
            user=user,
            defaults={
                'student_id': p['student_id'],
                'class_name': p['class_name'],
                'training_type': p['training_type'],
                'program_type': p['program_type'],
                'academic_year': p['academic_year'],
                'gpa': p['gpa'],
                'conduct_score': p['conduct_score'],
                'major': major,
            },
        )
    return user, created


def create_lecturer(data, faculties, specializations):
    faculty = faculties[data['faculty_idx']]
    user, created = User.objects.get_or_create(
        username=data['username'],
        defaults={
            'email': data['email'],
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'role': 'lecturer',
            'phone_number': f"09{str(hash(data['username']) % 100000000).zfill(8)}",
            'dob': date(1985, 8, 20),
            'faculty': faculty,
        },
    )
    if created:
        user.set_password(data['password'])
        user.save()
        degree_label = data['profile']['academic_degree']
        degree = AcademicDegree.objects.get(
            name=DEGREE_LABEL_TO_NAME[degree_label],
        )
        profile, _ = LecturerProfile.objects.get_or_create(
            user=user,
            defaults={
                'academic_degree': degree,
                'position': data['profile']['position'],
            },
        )
        for sp_idx in data['specializations']:
            profile.specializations.add(specializations[sp_idx])
        for topic_data in data['topics']:
            ListOfTopics.objects.get_or_create(
                lecturer=user,
                title=topic_data['title'],
                defaults={
                    'description': topic_data['description'],
                    'technology': topic_data['technology'],
                    'difficulty_level': topic_data['difficulty_level'],
                },
            )
    return user, created


def create_staff(data, faculties):
    faculty = faculties[data['faculty_idx']]
    user, created = User.objects.get_or_create(
        username=data['username'],
        defaults={
            'email': data['email'],
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'role': 'staff',
            'phone_number': f"09{str(hash(data['username']) % 100000000).zfill(8)}",
            'dob': date(1990, 12, 1),
            'faculty': faculty,
        },
    )
    if created:
        user.set_password(data['password'])
        user.save()
        StaffProfile.objects.get_or_create(
            user=user,
            defaults={'position': data['profile']['position']},
        )
    return user, created


def reset_data():
    """Xoá toàn bộ dữ liệu cũ của app theses để seed tạo lại từ đầu.

    Giữ lại superuser (admin) để không phá quyền quản trị đã tạo.
    Thứ tự xoá tuân theo khoá ngoại (con trước, cha sau).
    """
    from theses.models import (
        Committee, CommitteeMember, Faculty, Grade, LecturerProfile,
        ListOfTopics, Major, ProjectRegistration, RegistrationLecturer,
        RegistrationPeriod, Report, Specialization, StaffProfile,
        StudentProfile, User,
    )

    Report.objects.all().delete()
    Grade.objects.all().delete()
    RegistrationLecturer.objects.all().delete()
    CommitteeMember.objects.all().delete()
    Committee.objects.all().delete()
    ProjectRegistration.objects.all().delete()
    RegistrationPeriod.objects.all().delete()
    ListOfTopics.objects.all().delete()
    StudentProfile.objects.all().delete()
    LecturerProfile.objects.all().delete()
    StaffProfile.objects.all().delete()
    # Giữ superuser, xoá các user còn lại (student/lecturer/staff thường)
    User.objects.filter(is_superuser=False).delete()
    User.objects.filter(is_superuser=True).update(faculty=None)
    Specialization.objects.all().delete()
    Major.objects.all().delete()
    Faculty.objects.all().delete()


@transaction.atomic
def run():
    now = timezone.now()

    # --------------------------------------------------------
    # XOÁ DỮ LIỆU CŨ -> luôn tạo lại bộ dữ liệu mới
    # --------------------------------------------------------
    print('=== Xoá dữ liệu cũ của app theses (giữ superuser) ===')
    reset_data()

    # --------------------------------------------------------
    # Khoa, Ngành, Chuyên ngành
    # --------------------------------------------------------
    faculties = []
    for fd in faculty_data:
        f, _ = Faculty.objects.get_or_create(
            name=fd['name'],
            defaults={'description': fd['description']},
        )
        faculties.append(f)

    majors = []
    for md in major_data:
        m, _ = Major.objects.get_or_create(
            major_name=md['major_name'],
            defaults={
                'description': '',
                'training_duration': md['training_duration'],
                'faculty': faculties[md['faculty_idx']],
            },
        )
        majors.append(m)

    specializations = []
    for sd in specialization_data:
        s, _ = Specialization.objects.get_or_create(
            name=sd['name'],
            defaults={'faculty': faculties[sd['faculty_idx']]},
        )
        specializations.append(s)

    # --------------------------------------------------------
    # Học vị (AcademicDegree) — bắt buộc cho LecturerProfile.
    # Không xoá ở reset_data (dữ liệu cố định), dùng ignore_conflicts
    # để chạy lại nhiều lần không lỗi unique.
    # --------------------------------------------------------
    AcademicDegree.objects.bulk_create(
        [AcademicDegree(**d) for d in DEGREE_DATA],
        ignore_conflicts=True,
    )

    # ========================================================
    # ===============  TẠO 3 TÀI KHOẢN HERO  ================
    # Tạo trước tiên, in log nổi bật riêng để dễ nhận biết khi
    # chạy script — đây là 3 tài khoản chính dùng để demo/test.
    # ========================================================
    print('\n' + '=' * 60)
    print('  TẠO TÀI KHOẢN HERO (staff1, student1, lecturer1)')
    print('=' * 60)

    hero_student_data = next(d for d in students_data if d['username'] == HERO_STUDENT_USERNAME)
    hero_lecturer_data = next(d for d in lecturers_data if d['username'] == HERO_LECTURER_USERNAME)
    hero_staff_data = next(d for d in staffs_data if d['username'] == HERO_STAFF_USERNAME)

    staff1, staff1_created = create_staff(hero_staff_data, faculties)
    print(f"  ★ Staff hero:    {staff1.username} "
          f"({'created' if staff1_created else 'already exists'})")

    student1, student1_created = create_student(hero_student_data, faculties, majors)
    print(f"  ★ Student hero:  {student1.username} "
          f"({'created' if student1_created else 'already exists'})")

    lecturer1, lecturer1_created = create_lecturer(hero_lecturer_data, faculties, specializations)
    print(f"  ★ Lecturer hero: {lecturer1.username} "
          f"({'created' if lecturer1_created else 'already exists'}, "
          f"{len(hero_lecturer_data['topics'])} topics)")

    print('=' * 60 + '\n')

    # --------------------------------------------------------
    # Sinh viên còn lại (bỏ qua student1 đã tạo ở trên)
    # --------------------------------------------------------
    print('--- Sinh viên còn lại ---')
    for data in students_data:
        if data['username'] == HERO_STUDENT_USERNAME:
            continue
        user, created = create_student(data, faculties, majors)
        print(f"  {'Created' if created else 'Exists '} student: {user.username}")

    # --------------------------------------------------------
    # Giảng viên còn lại (bỏ qua lecturer1 đã tạo ở trên)
    # --------------------------------------------------------
    print('--- Giảng viên còn lại ---')
    for data in lecturers_data:
        if data['username'] == HERO_LECTURER_USERNAME:
            continue
        user, created = create_lecturer(data, faculties, specializations)
        print(f"  {'Created' if created else 'Exists '} lecturer: {user.username} "
              f"({len(data['topics'])} topics)")

    # --------------------------------------------------------
    # Giáo vụ còn lại (bỏ qua staff1 đã tạo ở trên)
    # --------------------------------------------------------
    print('--- Giáo vụ còn lại ---')
    for data in staffs_data:
        if data['username'] == HERO_STAFF_USERNAME:
            continue
        user, created = create_staff(data, faculties)
        print(f"  {'Created' if created else 'Exists '} staff: {user.username}")

    users_by_username = {u.username: u for u in User.objects.all()}
    staff1 = users_by_username[HERO_STAFF_USERNAME]
    staff3 = users_by_username['staff3']

    # --------------------------------------------------------
    # Đợt đăng ký (RegistrationPeriod)
    #
    # LƯU Ý QUAN TRỌNG: theo ràng buộc
    # `unique_open_registration_period_per_faculty`, mỗi khoa chỉ
    # được có TỐI ĐA 1 đợt đang ở trạng thái "mở" (nằm trong
    # RegistrationPeriod.OPEN_STATUSES = DRAFT, STUDENT_REGISTRATION,
    # IN_PROGRESS, REPORT_SUBMISSION) tại một thời điểm.
    #
    # Vì vậy với khoa CNTT (faculty_idx=0), chỉ `open_1` được giữ
    # trạng thái "mở" (STUDENT_REGISTRATION — đợt đang thực sự diễn
    # ra tại thời điểm chạy seed). Các đợt còn lại của CNTT đại diện
    # cho những học kỳ ĐÃ QUA nên được chuyển về CLOSED/ARCHIVED cho
    # đúng với thực tế (không có 2 đợt cùng "đang mở" một lúc).
    # Khoa KTQTKD (faculty_idx=1) có `ktqtkd_open` là đợt "mở" duy
    # nhất của khoa đó — không xung đột vì khác khoa.
    # --------------------------------------------------------
    def dt(weeks_offset):
        return now + timedelta(weeks=weeks_offset)

    period_data = [
        {
            'key': 'archived_1', 'name': 'Đợt 1 - Học kỳ 1 (2022-2023)',
            'academic_year': '2022-2023', 'status': RegistrationPeriod.STATUS.CLOSED,
            'faculty_idx': 0, 'created_by': staff1,
            'student_registration_start': dt(-104), 'student_registration_end': dt(-98),
            'report_submission_start': dt(-97), 'report_submission_end': dt(-90),
            'execution_duration_weeks': 8,
        },
        {
            'key': 'archived_2', 'name': 'Đợt 2 - Học kỳ 2 (2022-2023)',
            'academic_year': '2022-2023', 'status': RegistrationPeriod.STATUS.CLOSED,
            'faculty_idx': 0, 'created_by': staff1,
            'student_registration_start': dt(-90), 'student_registration_end': dt(-84),
            'report_submission_start': dt(-83), 'report_submission_end': dt(-76),
            'execution_duration_weeks': 8,
        },
        {
            'key': 'closed_1', 'name': 'Đợt 3 - Học kỳ 1 (2023-2024)',
            'academic_year': '2023-2024', 'status': RegistrationPeriod.STATUS.CLOSED,
            'faculty_idx': 0, 'created_by': staff1,
            'student_registration_start': dt(-52), 'student_registration_end': dt(-46),
            'report_submission_start': dt(-45), 'report_submission_end': dt(-38),
            'execution_duration_weeks': 10,
        },
        {
            # Đã hoàn tất nộp báo cáo từ lâu -> đóng đợt (không còn "mở")
            'key': 'report_submission_1', 'name': 'Đợt 4 - Học kỳ 2 (2023-2024)',
            'academic_year': '2023-2024', 'status': RegistrationPeriod.STATUS.CLOSED,
            'faculty_idx': 0, 'created_by': staff1,
            'student_registration_start': dt(-20), 'student_registration_end': dt(-14),
            'report_submission_start': dt(-13), 'report_submission_end': dt(1),
            'execution_duration_weeks': 10,
        },
        {
            # Đợt trước đã hoàn tất thực hiện đồ án -> đóng đợt (không còn "mở")
            'key': 'in_progress_1', 'name': 'Đợt 5 - Học kỳ 1 (2024-2025)',
            'academic_year': '2024-2025', 'status': RegistrationPeriod.STATUS.CLOSED,
            'faculty_idx': 0, 'created_by': staff1,
            'student_registration_start': dt(-10), 'student_registration_end': dt(-4),
            'report_submission_start': dt(2), 'report_submission_end': dt(9),
            'execution_duration_weeks': 10,
        },
        {
            # Đợt duy nhất đang "mở" của khoa CNTT tại thời điểm chạy seed.
            # Cửa sổ đăng ký phải bao quanh thời điểm hiện tại để SV/GV dùng được.
            'key': 'open_1', 'name': 'Đợt 6 - Học kỳ 2 (2024-2025)',
            'academic_year': '2024-2025', 'status': RegistrationPeriod.STATUS.STUDENT_REGISTRATION,
            'faculty_idx': 0, 'created_by': staff1,
            'student_registration_start': dt(-7), 'student_registration_end': dt(7),
            'report_submission_start': dt(17), 'report_submission_end': dt(24),
            'execution_duration_weeks': 10,
        },
        {
            # Đợt này được đặt CLOSED (không phải DRAFT) vì unique constraint
            # chỉ cho phép 1 đợt "mở" (DRAFT/STUDENT_REGISTRATION/IN_PROGRESS/
            # REPORT_SUBMISSION) mỗi khoa, mà open_1 đã ở STUDENT_REGISTRATION rồi.
            'key': 'draft_1', 'name': 'Đợt 7 - Học kỳ 1 (2025-2026)',
            'academic_year': '2025-2026', 'status': RegistrationPeriod.STATUS.CLOSED,
            'faculty_idx': 0, 'created_by': staff1,
            'student_registration_start': dt(10), 'student_registration_end': dt(14),
            'report_submission_start': dt(24), 'report_submission_end': dt(31),
            'execution_duration_weeks': 10,
        },
        {
            # Đợt "mở" duy nhất của khoa KTQTKD -> không xung đột vì khác khoa
            'key': 'ktqtkd_open', 'name': 'Đợt KTQTKD - Học kỳ 1 (2024-2025)',
            'academic_year': '2024-2025', 'status': RegistrationPeriod.STATUS.STUDENT_REGISTRATION,
            'faculty_idx': 1, 'created_by': staff3,
            'student_registration_start': dt(-7), 'student_registration_end': dt(7),
            'report_submission_start': dt(17), 'report_submission_end': dt(24),
            'execution_duration_weeks': 10,
        },
    ]

    periods_by_key = {}
    for pd in period_data:
        # student_registration_end / report_submission_start / report_submission_end
        # là các @property tính từ start + các số ngày/tuần, KHÔNG phải field trong DB.
        # Tính ngược ra các field thật để giữ đúng các mốc thời gian đã khai báo.
        student_registration_days = (
            pd['student_registration_end'] - pd['student_registration_start']
        ).days
        report_submission_days = (
            pd['report_submission_end'] - pd['report_submission_start']
        ).days

        period, created = RegistrationPeriod.objects.get_or_create(
            name=pd['name'],
            defaults={
                'academic_year': pd['academic_year'],
                'status': pd['status'],
                'faculty': faculties[pd['faculty_idx']],
                'created_by': pd['created_by'],
                'student_registration_start': pd['student_registration_start'],
                'student_registration_days': student_registration_days,
                'execution_duration_weeks': pd['execution_duration_weeks'],
                'report_submission_days': report_submission_days,
            },
        )
        periods_by_key[pd['key']] = period
        if created:
            print(f"  Created period: {period.name} [{period.status}]")
        else:
            print(f"  Period exists: {period.name}")

    # --------------------------------------------------------
    # Đăng ký đồ án (ProjectRegistration)
    #
    # LƯU Ý: Model mới KHÔNG còn field `lecturer` trên ProjectRegistration,
    # và ProjectRegistration.STATUS chỉ còn 2 giá trị:
    #   - WAITING_LECTURER_AND_PENDING (chưa có giảng viên)
    #   - ASSIGNED_LECTURER_AND_PENDING (đã có giảng viên, xem approval_status
    #     của RegistrationLecturer để biết đã duyệt/từ chối hay chưa)
    #
    # Nên: mỗi registration có lecturer sẽ tạo thêm 1 dòng RegistrationLecturer
    # (role=MAIN) với approval_status tương ứng (APPROVED/REJECTED/PENDING).
    # --------------------------------------------------------
    registrations_data = [
        # ---- Hero: lecturer1 hướng dẫn — đủ trạng thái duyệt, nhiều đợt ----
        {
            'student': 'student1', 'lecturer': 'lecturer1', 'period': 'closed_1',
            'project_title': 'Xây dựng hệ thống quản lý khóa luận tốt nghiệp',
            'project_description': 'Xây dựng hệ thống web quản lý toàn bộ quy trình đăng ký và thực hiện khóa luận tốt nghiệp.',
            'approval_status': RegistrationLecturer.ApprovalStatus.APPROVED, 'wants_thesis_upgrade': True,
        },
        {
            'student': 'student4', 'lecturer': 'lecturer1', 'period': 'open_1',
            'project_title': 'Ứng dụng đặt xe nội bộ cho doanh nghiệp',
            'project_description': 'Em muốn xây dựng ứng dụng đặt xe đưa đón nhân viên nội bộ cho doanh nghiệp vừa và nhỏ.',
            'approval_status': RegistrationLecturer.ApprovalStatus.PENDING, 'wants_thesis_upgrade': False,
        },
        {
            'student': 'student6', 'lecturer': 'lecturer1', 'period': 'closed_1',
            'project_title': 'Hệ thống giám sát hiệu năng vi dịch vụ',
            'project_description': 'Xây dựng dashboard giám sát hiệu năng cho kiến trúc microservices.',
            'approval_status': RegistrationLecturer.ApprovalStatus.REJECTED,
            'note': 'Đề tài trùng với đề tài đã có sinh viên khác thực hiện.', 'wants_thesis_upgrade': True,
        },
        {
            'student': 'student7', 'lecturer': 'lecturer1', 'period': 'report_submission_1',
            'project_title': 'Nền tảng thi trực tuyến chống gian lận',
            'project_description': 'Xây dựng hệ thống thi trực tuyến tích hợp giám sát webcam phát hiện gian lận.',
            'approval_status': RegistrationLecturer.ApprovalStatus.APPROVED, 'wants_thesis_upgrade': True,
        },
        {
            'student': 'student8', 'lecturer': 'lecturer1', 'period': 'report_submission_1',
            'project_title': 'Ứng dụng quản lý ký túc xá sinh viên',
            'project_description': 'Xây dựng hệ thống quản lý phòng, đăng ký ở và thanh toán phí ký túc xá.',
            'approval_status': RegistrationLecturer.ApprovalStatus.APPROVED, 'wants_thesis_upgrade': False,
        },
        {
            'student': 'student10', 'lecturer': 'lecturer1', 'period': 'open_1',
            'project_title': 'Hệ thống chấm điểm tự động bài tập lập trình',
            'project_description': 'Xây dựng hệ thống chấm tự động bài tập lập trình sử dụng sandbox thực thi mã.',
            'approval_status': RegistrationLecturer.ApprovalStatus.PENDING, 'wants_thesis_upgrade': False,
        },
        {
            'student': 'student11', 'lecturer': 'lecturer1', 'period': 'closed_1',
            'project_title': 'Ứng dụng quản lý chuỗi cung ứng sử dụng blockchain',
            'project_description': 'Ứng dụng blockchain để truy xuất nguồn gốc hàng hóa trong chuỗi cung ứng.',
            'approval_status': RegistrationLecturer.ApprovalStatus.REJECTED,
            'note': 'Phạm vi đề tài quá rộng so với thời gian thực hiện.', 'wants_thesis_upgrade': True,
        },
        {
            'student': 'student12', 'lecturer': 'lecturer1', 'period': 'in_progress_1',
            'project_title': 'Hệ thống quản lý thư viện số',
            'project_description': 'Xây dựng hệ thống quản lý và tra cứu tài liệu số cho thư viện trường.',
            'approval_status': RegistrationLecturer.ApprovalStatus.APPROVED, 'wants_thesis_upgrade': True,
        },
        {
            'student': 'student13', 'lecturer': 'lecturer1', 'period': 'open_1',
            'project_title': 'Ứng dụng học ngoại ngữ tương tác',
            'project_description': 'Em muốn xây dựng ứng dụng học ngoại ngữ có phần luyện phát âm bằng AI.',
            'approval_status': RegistrationLecturer.ApprovalStatus.PENDING, 'wants_thesis_upgrade': False,
        },
        {
            'student': 'student14', 'lecturer': 'lecturer1', 'period': 'report_submission_1',
            'project_title': 'Hệ thống quản lý bảo hành thiết bị điện tử',
            'project_description': 'Xây dựng hệ thống theo dõi bảo hành và sửa chữa thiết bị điện tử cho cửa hàng.',
            'approval_status': RegistrationLecturer.ApprovalStatus.APPROVED, 'wants_thesis_upgrade': False,
        },
        # ---- Sinh viên chưa được phân/chờ giảng viên (open_1) ----
        {
            'student': 'student2', 'lecturer': None, 'period': 'open_1',
            'project_title': 'Ứng dụng blockchain trong lưu trữ văn bằng',
            'project_description': 'Nghiên cứu ứng dụng công nghệ blockchain để lưu trữ và xác thực văn bằng tốt nghiệp.',
            'wants_thesis_upgrade': True,
        },
        {
            'student': 'student9', 'lecturer': None, 'period': 'open_1',
            'project_title': 'Thực tập tại công ty phần mềm',
            'project_description': 'Em đăng ký thực tập tốt nghiệp tại doanh nghiệp thay vì làm đồ án.',
            'wants_thesis_upgrade': False,
        },
        {
            'student': 'student16', 'lecturer': None, 'period': 'open_1',
            'project_title': 'Thực tập tốt nghiệp tại doanh nghiệp phần mềm',
            'project_description': 'Em đăng ký hình thức thực tập tốt nghiệp thay vì làm khóa luận.',
            'wants_thesis_upgrade': False,
        },
        # ---- Các giảng viên khác, để test staff1 thấy đa dạng dữ liệu ----
        {
            'student': 'student3', 'lecturer': 'lecturer3', 'period': 'closed_1',
            'project_title': 'Chatbot hỗ trợ tư vấn tuyển sinh',
            'project_description': 'Phát triển chatbot sử dụng NLP để tư vấn tuyển sinh cho thí sinh.',
            'approval_status': RegistrationLecturer.ApprovalStatus.APPROVED, 'wants_thesis_upgrade': True,
        },
        {
            'student': 'student15', 'lecturer': 'lecturer2', 'period': 'closed_1',
            'project_title': 'Hệ thống gợi ý sản phẩm thương mại điện tử',
            'project_description': 'Xây dựng hệ thống gợi ý sản phẩm sử dụng collaborative filtering.',
            'approval_status': RegistrationLecturer.ApprovalStatus.APPROVED, 'wants_thesis_upgrade': False,
        },
        {
            'student': 'student17', 'lecturer': 'lecturer6', 'period': 'open_1',
            'project_title': 'Hệ thống khuyến nghị việc làm thông minh',
            'project_description': 'Xây dựng hệ thống gợi ý việc làm dựa trên kỹ năng và sở thích người dùng.',
            'approval_status': RegistrationLecturer.ApprovalStatus.PENDING, 'wants_thesis_upgrade': True,
        },
        # ---- Khoa KTQTKD ----
        {
            'student': 'student5', 'lecturer': 'lecturer5', 'period': 'ktqtkd_open',
            'project_title': 'Phân tích hành vi khách hàng trong thương mại điện tử',
            'project_description': 'Sử dụng dữ liệu lớn để phân tích và dự đoán hành vi mua sắm khách hàng trực tuyến.',
            'approval_status': RegistrationLecturer.ApprovalStatus.PENDING, 'wants_thesis_upgrade': False,
        },
        {
            'student': 'student18', 'lecturer': 'lecturer5', 'period': 'ktqtkd_open',
            'project_title': 'Hệ thống dự báo doanh số bán lẻ',
            'project_description': 'Xây dựng mô hình dự báo doanh số cho chuỗi cửa hàng bán lẻ.',
            'approval_status': RegistrationLecturer.ApprovalStatus.APPROVED, 'wants_thesis_upgrade': False,
        },
        {
            'student': 'student19', 'lecturer': None, 'period': 'ktqtkd_open',
            'project_title': 'Chiến lược marketing số cho doanh nghiệp nhỏ',
            'project_description': 'Nghiên cứu và đề xuất chiến lược marketing số cho doanh nghiệp vừa và nhỏ.',
            'wants_thesis_upgrade': False,
        },
        {
            'student': 'student20', 'lecturer': 'lecturer5', 'period': 'ktqtkd_open',
            'project_title': 'Thực tập tốt nghiệp tại doanh nghiệp bán lẻ',
            'project_description': 'Em đăng ký hình thức thực tập tốt nghiệp tại doanh nghiệp bán lẻ.',
            'approval_status': RegistrationLecturer.ApprovalStatus.REJECTED,
            'note': 'Doanh nghiệp thực tập chưa có hợp đồng hợp tác với trường.', 'wants_thesis_upgrade': False,
        },
    ]

    for rd in registrations_data:
        student = users_by_username.get(rd['student'])
        lecturer = users_by_username.get(rd['lecturer']) if rd['lecturer'] else None
        period = periods_by_key.get(rd['period']) if rd['period'] else None
        if not student:
            continue

        # Trạng thái tổng của registration: ASSIGNED chỉ khi đã có GVHD chính
        # thức (MAIN, đã duyệt); nếu chỉ có nguyện vọng (OPTION) đang chờ/từ chối
        # thì vẫn WAITING cho tới khi có người được chọn làm MAIN.
        approved = rd.get('approval_status') == RegistrationLecturer.ApprovalStatus.APPROVED
        reg_status = (
            ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING
            if (lecturer and approved) else
            ProjectRegistration.STATUS.WAITING_LECTURER_AND_PENDING
        )

        registration, created = ProjectRegistration.objects.get_or_create(
            student=student,
            registration_period=period,
            defaults={
                'project_title': rd['project_title'],
                'project_description': rd['project_description'],
                'status': reg_status,
                'wants_thesis_upgrade': rd.get('wants_thesis_upgrade', False),
            },
        )

        if created:
            marker = ' ★' if student.username == HERO_STUDENT_USERNAME else ''
            print(
                f"  Created registration{marker}: {student.username} "
                f"-> {lecturer.username if lecturer else 'TBD'} [{reg_status}]"
            )

            # Nếu đã có giảng viên -> tạo dòng RegistrationLecturer.
            #   - Đã đồng ý (APPROVED) -> role=MAIN (GVHD chính thức)
            #   - Đang chờ / từ chối -> role=OPTION1 (nguyện vọng)
            if lecturer:
                approval_status = rd.get('approval_status', RegistrationLecturer.ApprovalStatus.PENDING)
                responded_at = (
                    timezone.now()
                    if approval_status in (
                        RegistrationLecturer.ApprovalStatus.APPROVED,
                        RegistrationLecturer.ApprovalStatus.REJECTED,
                    )
                    else None
                )
                assignment_role = (
                    RegistrationLecturer.Role.MAIN
                    if approval_status == RegistrationLecturer.ApprovalStatus.APPROVED
                    else RegistrationLecturer.Role.OPTION1
                )
                RegistrationLecturer.objects.get_or_create(
                    registration=registration,
                    lecturer=lecturer,
                    defaults={
                        'role': assignment_role,
                        'approval_status': approval_status,
                        'responded_at': responded_at,
                        'note': rd.get('note'),
                    },
                )

    print("\n=== Seed completed ===")
    print(f"    Hero accounts: {HERO_STAFF_USERNAME}, {HERO_STUDENT_USERNAME}, {HERO_LECTURER_USERNAME}")


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'run':
        run()
    else:
        print("Usage: python seed.py run")