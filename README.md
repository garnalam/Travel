# Smart Travel

Smart Travel là một nền tảng du lịch thông minh hỗ trợ người dùng tìm kiếm, đặt và gợi ý tour du lịch, khách sạn, chuyến bay một cách thuận tiện. Hệ thống bao gồm CMS back-office cho quản trị viên và hệ thống gợi ý tích hợp AI giúp cá nhân hóa trải nghiệm du lịch.

GitHub Repository: [Smart Travel](https://github.com/garnalam/Travel.git)

---

## Mục lục
- [Tính năng chính](#tính-năng-chính)
- [Công nghệ sử dụng](#️-công-nghệ-sử-dụng)
- [Cài đặt và chạy dự án](#-cài-đặt-và-chạy-dự-án))
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Định hướng phát triển](#định-hướng-phát-triển)
- [Liên hệ](#liên-hệ)

---

## Tính năng chính
- Gợi ý tour, khách sạn, chuyến bay dựa trên sở thích và lịch sử người dùng.
- Hệ thống CMS back-office quản lý dịch vụ, nội dung, phân quyền.
- Tích hợp thuật toán gợi ý hybrid (content-based + popularity).
- Hỗ trợ quản lý booking và theo dõi người dùng.
- Cơ sở dữ liệu được thiết kế tối ưu cho hiệu năng và mở rộng.

## Công nghệ sử dụng
- **Backend:** Flask (Python)
- **Frontend:** HTML/CSS/JS
- **Database:** MySQL
- **Recommendation System:** Content-based Filtering, Hybrid Recommendation
- **Triển khai:** XAMPP (local), sẵn sàng deploy cloud

## Cài đặt và chạy dự án

### Yêu cầu
- Python 3.10
- XAMPP (chạy MySQL + phpMyAdmin)
- Git

### Các bước thực hiện
1. Clone dự án về máy:
   ```bash
   git clone https://github.com/garnalam/Travel.git
   cd Travel
   ```

2. Import database vào XAMPP phpMyAdmin:
   - Mở phpMyAdmin
   - Tạo database mới tên `smart_travel`
   - Import file `smart_travel.sql`

3. Cài đặt dependencies Python:
   ```bash
   pip install -r requirements.txt
   ```

4. Chạy ứng dụng:
   ```bash
   python app.py
   ```

5. Mở trình duyệt tại địa chỉ:
   ```
   http://127.0.0.1:5000
   ```

## Cấu trúc thư mục
```
Travel/
│── app.py                # File chính chạy Flask app
│── requirements.txt      # Danh sách thư viện Python cần thiết
│── smart_travel.sql      # Database MySQL cho CMS
│── assets/               # CSS, JS, images
```

## Kiến trúc hệ thống
- **CMS (MySQL + Flask):** Quản lý dữ liệu dịch vụ, người dùng, booking.
- **Recommendation:** Chạy thuật toán gợi ý.
- **Giao diện Web:** Người dùng tương tác, xem và đặt vé máy bay, khách sạn, nhà hàng, tour.

## Định hướng phát triển
- [ ] Tích hợp API thanh toán
- [ ] Nâng cấp giao diện người dùng (React/Next.js)
- [ ] Deploy hệ thống trên cloud (AWS/GCP/Azure)
- [ ] Cải tiến thuật toán gợi ý với deep learning

## Liên hệ
Dự án được xây dựng và phát triển bởi nhóm **Smart Travel AIRC**. 
Link: [Link đơn vị phụ trách](https://iti.vnu.edu.vn/trung-tam-nghien-cuu-tien-tien-quoc-te-ve-tri-tue-nhan-tao-ung-dung/)

