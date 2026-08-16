echo "=== cài đặt thư viện từ requirements.txt ==="
pip install -r requirements.txt

echo "=== Thực thi migrate cơ sở dữ liệu ==="
python manage.py makemigrations
python manage.py migrate

echo "=== Tạo superuser ==="
export DJANGO_SUPERUSER_USERNAME=admin
export DJANGO_SUPERUSER_EMAIL=admin@gmail.com
export DJANGO_SUPERUSER_PASSWORD=Admin@123

python manage.py createsuperuser --no-input || echo "SuperUser đã tồn tại!"
python seed.py run
echo "=== Chạy xong ==="
