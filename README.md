# Clothes Shop Frontend

Giao diện web bán quần áo dành cho khách hàng và quản trị viên. Dự án được xây dựng bằng React, Vite và Tailwind CSS, kết nối với REST API để quản lý sản phẩm, giỏ hàng, đơn hàng, khách hàng và các chương trình khuyến mãi.

## Chức năng chính

### Khách hàng

- Đăng ký, đăng nhập bằng tài khoản hoặc Google.
- Xem, tìm kiếm và lọc sản phẩm theo danh mục.
- Xem chi tiết sản phẩm, biến thể, giá và khuyến mãi.
- Quản lý giỏ hàng và sản phẩm yêu thích.
- Đặt hàng, áp dụng voucher và thanh toán COD/VNPAY.
- Theo dõi trạng thái đơn hàng và vận chuyển GHN.
- Hủy đơn hàng, đánh giá sản phẩm sau khi hoàn thành.
- Quản lý hồ sơ và địa chỉ nhận hàng.

### Quản trị viên

- Xem dashboard và thống kê hoạt động cửa hàng.
- Quản lý sản phẩm, biến thể, danh mục và thuộc tính.
- Quản lý đơn hàng và theo dõi doanh thu.
- Quản lý khách hàng.
- Quản lý chương trình khuyến mãi và voucher.
- Cấu hình thông tin cửa hàng.

## Công nghệ sử dụng

- React 19
- Vite 8
- React Router 7
- Tailwind CSS 4
- Ant Design
- Axios
- Firebase Authentication
- React Toastify
- Lucide React, Iconify và Material Symbols

## Yêu cầu môi trường

- Node.js `20.19+` hoặc `22.12+`
- npm
- Backend API của Clothes Shop đang hoạt động
- Firebase project nếu sử dụng đăng nhập Google

## Cài đặt và chạy dự án

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường

Tạo hoặc cập nhật file `.env` tại thư mục gốc:

```env
VITE_BACKEND_URL=http://127.0.0.1:8000/api

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

| Biến | Mô tả |
| --- | --- |
| `VITE_BACKEND_URL` | Base URL của backend API. Mặc định là `http://127.0.0.1:8000/api`. |
| `VITE_FIREBASE_API_KEY` | API key của Firebase Web App. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Authentication domain của Firebase. |
| `VITE_FIREBASE_PROJECT_ID` | ID của Firebase project. |
| `VITE_FIREBASE_APP_ID` | App ID của Firebase Web App. |

> Các biến có tiền tố `VITE_` được đóng gói vào mã frontend. Không đặt private key hoặc secret của backend trong các biến này.

### 3. Chạy môi trường phát triển

```bash
npm run dev
```

Vite sẽ hiển thị địa chỉ truy cập trong terminal, thường là `http://localhost:5173`.

## Các lệnh có sẵn

| Lệnh | Chức năng |
| --- | --- |
| `npm run dev` | Khởi động development server và HMR. |
| `npm run build` | Tạo production build trong thư mục `dist/`. |
| `npm run preview` | Chạy thử production build trên máy local. |
| `npm run lint` | Kiểm tra mã nguồn bằng ESLint. |

## Cấu trúc thư mục

```text
src/
├── assets/          # Hình ảnh và tài nguyên tĩnh
├── components/      # Component dùng lại cho customer và admin
├── configs/         # Cấu hình Axios và Firebase
├── constants/       # Hằng số dùng chung
├── context/         # React context và state dùng chung
├── layouts/         # Layout customer và admin
├── pages/
│   ├── admin/       # Các trang quản trị
│   ├── auth/        # Đăng nhập, đăng ký và khôi phục mật khẩu
│   └── customer/    # Các trang mua sắm
├── router/          # Router và route guard
├── services/        # Các module giao tiếp với backend API
├── index.css        # Tailwind theme và style toàn cục
└── main.jsx         # Điểm khởi tạo ứng dụng
```

## Phân quyền và xác thực

- Access token được đọc từ cookie hoặc `localStorage`.
- Axios tự động gắn header `Authorization: Bearer <token>` cho API cần xác thực.
- Role được lưu bằng key `user_role` và gửi qua header `X-User-Role`.
- Các role admin được hỗ trợ: `ROLE_ADMIN`, `ADMIN`, `SUPER_ADMIN`, `SUPERADMIN`.
- Route guard tự chuyển hướng người dùng khi truy cập sai khu vực.

## Route chính

### Customer

| Route | Nội dung |
| --- | --- |
| `/` | Trang chủ |
| `/products` | Danh sách sản phẩm |
| `/products/:id` | Chi tiết sản phẩm |
| `/categories` | Danh mục |
| `/cart` | Giỏ hàng |
| `/checkout` | Thanh toán |
| `/orders` | Danh sách đơn hàng |
| `/orders/:id` | Chi tiết đơn hàng |
| `/favorites` | Sản phẩm yêu thích |
| `/profile` | Hồ sơ khách hàng |

### Admin

| Route | Nội dung |
| --- | --- |
| `/admin` | Dashboard |
| `/admin/products` | Quản lý sản phẩm |
| `/admin/categories` | Quản lý danh mục |
| `/admin/attributes` | Quản lý thuộc tính |
| `/admin/orders` | Quản lý đơn hàng |
| `/admin/customers` | Quản lý khách hàng |
| `/admin/promotions` | Quản lý khuyến mãi |
| `/admin/vouchers` | Quản lý voucher |
| `/admin/settings` | Cài đặt cửa hàng |

## Trạng thái đơn hàng

Frontend sử dụng các trạng thái đơn hàng sau:

```text
PENDING_PAYMENT
CONFIRMED
SHIPPING
COMPLETED
CANCELLED
RETURNED
```

Backend cần trả về và nhận bộ giá trị này để bộ lọc, badge và luồng xử lý đơn hàng hoạt động đồng nhất.

## Build và triển khai

Tạo bản production:

```bash
npm run build
```

Nội dung triển khai nằm trong thư mục `dist/`. Khi deploy, cần:

- Cấu hình đúng các biến môi trường trước khi build.
- Cho phép frontend gọi tới backend API bằng CORS.
- Cấu hình web server fallback mọi route SPA về `index.html`.
- Cấu hình domain được phép trong Firebase Authentication nếu dùng đăng nhập Google.
