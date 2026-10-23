# Stitch AI Prompts — ParkCore Parking System

Bộ prompt rút gọn cho toàn bộ giao diện Sprint 1, có màn hình riêng cho CUSTOMER và trải nghiệm STAFF (nhân viên vận hành/bảo vệ). Mỗi prompt sinh một màn hình hoặc một flow ngắn; hãy yêu cầu Stitch vẽ UI, không đưa phần hướng dẫn thành chữ trên mockup.

Nguồn nghiệp vụ, phạm vi và RBAC: `AGENTS.md`. Trường dữ liệu: `database/schema.sql`. Contract: `docs/contracts/api.md`. Nếu có khác biệt, theo `AGENTS.md`.

## Quy chuẩn chung — ghép vào prompt cần dùng

```text
Vẽ giao diện thật trực quan cho ParkCore Parking System, dùng tiếng Việt. Ưu tiên bố cục, hình ảnh và thao tác chính; nhãn ngắn, không chèn đoạn giải thích dài, không nhồi nhiều thẻ hoặc nhiều trạng thái vào một frame. Mỗi lần chỉ vẽ màn hình/flow được yêu cầu; nếu cần trạng thái khác, tạo frame riêng. Dùng dữ liệu giả.

Giữ ParkCore Precision: nền #F8F9FA, bề mặt trắng, chữ #191C1D/#414753, viền #E5E7EB, xanh chính #0066CC. Trạng thái ô có màu kèm nhãn chữ: Trống xanh, Đang đỗ đỏ, Đặt trước vàng, Bảo trì xám. Font Inter; JetBrains Mono chỉ cho biển số. Bo góc card 8px, input 4px; icon gọn, tương phản rõ. Không dùng gradient/trang trí kiểu dashboard SaaS đại trà.

Desktop dùng sidebar 240px; mobile chuyển sang drawer/bố cục một cột. Thiết kế đúng role. Frontend thật dùng EJS + Bootstrap 5. Không tự thêm nghiệp vụ, field hay quyền ngoài yêu cầu. Không dùng thông tin cá nhân thật.
```

## Task 1 — Xác thực

**Đăng nhập**
```text
Vẽ màn hình đăng nhập ParkCore: logo biểu tượng bãi đỗ tối giản, tên hệ thống, hai trường Tên đăng nhập/Mật khẩu, nút hiện mật khẩu, nút chính “Đăng nhập”, link “Quên mật khẩu?”. Một trạng thái lỗi với thông báo chung “Sai tên đăng nhập hoặc mật khẩu”. Bố cục sáng, gọn, dùng tốt trên điện thoại. Không thêm đăng ký, OTP hay đăng nhập mạng xã hội.
```

**Quên và đặt lại mật khẩu**
```text
Vẽ hai màn hình riêng, cùng phong cách ParkCore. Quên mật khẩu: trường email, nút “Gửi liên kết đặt lại”, link quay lại đăng nhập và xác nhận trung tính sau khi gửi. Đặt lại mật khẩu: Mật khẩu mới, Nhập lại mật khẩu, gợi ý tối thiểu 8 ký tự, nút “Đặt lại mật khẩu”; có frame link không hợp lệ/hết hạn. Không thêm CAPTCHA hoặc OTP.
```

## Task 2 — Trang chủ, tin tức, khung điều hướng

```text
Vẽ trang chủ ParkCore dùng chung header, sidebar theo role và footer. Nội dung là lời chào ngắn, lối vào chức năng chính và tin tức dạng thẻ gọn (ảnh tùy chọn, tiêu đề, ngày, tóm tắt một dòng). Không tạo dashboard KPI, hoạt động gần đây hay chuông thông báo. Tạo frame rỗng “Chưa có tin tức”. Không bịa hotline, địa chỉ hoặc liên kết.
```

## Task 3–4 — Quản lý nhân viên (MANAGER)

```text
Vẽ các frame danh sách, form thêm/sửa và modal xóa nhân viên chỉ dành cho MANAGER. Danh sách gọn: họ tên, email, điện thoại, chức vụ, trạng thái; có tìm kiếm và nút “Thêm nhân viên”. Form: họ tên, email, username, điện thoại, địa chỉ, chức vụ; mật khẩu chỉ ở chế độ tạo mới. Modal có nút “Xóa nhân viên” và “Hủy”, kèm frame lỗi 409. Không thêm avatar, CCCD, lương hay lịch ca.
```

## Task 5–7 — Quản lý khách hàng và xe (MANAGER/STAFF)

```text
Vẽ bộ màn hình nghiệp vụ cho MANAGER/STAFF: danh sách khách hàng; form tạo khách hàng kèm tài khoản CUSTOMER; hồ sơ/danh sách xe; form sửa; modal thêm xe. Chỉ dùng field: họ tên, điện thoại, email, địa chỉ; xe gồm biển số, tên xe, hãng tùy chọn, loại xe. Mật khẩu tài khoản chỉ nhập khi tạo mới. Xe không có chủ hiển thị “Khách vãng lai”. Có frame lỗi xóa 409. Không thêm avatar, tự đăng ký CUSTOMER hoặc xóa xe.
```

## Giao diện CUSTOMER — Trang chủ

```text
Vẽ trang chủ cho CUSTOMER đăng nhập trên điện thoại, có desktop responsive. Chào khách ngắn; điều hướng nổi bật tới “Xe của tôi” và “Bản đồ bãi đỗ”; có thể xem tin tức. Giao diện cá nhân, đơn giản, không giống dashboard quản lý. Không có thống kê doanh thu, danh sách khách hàng, xe vào/ra, vé, chức năng admin hay xe của người khác. Không thêm tự đăng ký tài khoản.
```

## Giao diện CUSTOMER — Hồ sơ và xe của tôi

```text
Vẽ màn hình “Xe của tôi” cho CUSTOMER. Phần trên là hồ sơ ngắn; bên dưới là danh sách xe thuộc tài khoản này, mỗi xe hiển thị biển số, tên xe, hãng, loại xe và trạng thái nếu có. Nút “Thêm xe” mở form/modal gồm biển số, tên xe, hãng tùy chọn, loại xe. Không có trường chọn chủ xe. Có empty state “Bạn chưa đăng ký xe” và lỗi biển số trùng. Không hiển thị hoặc chỉnh dữ liệu khách hàng khác; không thêm nút xóa xe.
```

## Task 8 — Nhân viên vận hành / Bảo vệ (STAFF)

```text
Vẽ màn hình tại cổng cho STAFF (nhân viên/bảo vệ): vùng tải ảnh biển số và preview; nút “Quét biển số”; biển số nhận dạng rõ; bên cạnh là thông tin xe, hãng, khách hàng, số điện thoại, vị trí hiện tại. Làm nổi bật đúng thao tác “Cho xe vào” hoặc “Cho xe ra” khi hợp lệ; chọn ô khi cần. Xe chưa có trong hệ thống có nút “Thêm xe vãng lai”. Tạo frame lỗi ảnh quá 5 MB và không đọc được biển số. Không có live camera, tìm biển số thủ công, RFID, barie, thanh toán hoặc in vé.
```

## Task 9 — Tìm xe (MANAGER/STAFF)

```text
Vẽ modal “Tìm xe” gọn cho MANAGER/STAFF: một ô tìm theo tên khách hàng, số điện thoại hoặc biển số, nút “Tìm”. Kết quả tối đa 20 dòng: biển số nổi bật, tên xe/hãng, khách hàng và điện thoại; xe không có chủ ghi “Khách vãng lai”. Có frame ban đầu, đang tải và không có kết quả. Không hiện lịch sử, thời lượng hay dữ liệu ngoài kết quả API.
```

## Task 10 — Bản đồ và đăng ký chỗ đỗ

**Bản đồ MANAGER/STAFF**
```text
Vẽ bản đồ bãi xe trực quan với lưới ô lớn, bộ lọc zone gọn và chú giải bốn trạng thái. Mỗi ô chỉ có mã ô, zone, trạng thái — tuyệt đối không có biển số, xe, khách hay thời lượng. MANAGER/STAFF có thể mở panel riêng để xem chi tiết xe ở ô đang có xe. Không đặt chức năng sửa/xóa/bảo trì ô trên bản đồ.
```

**Bản đồ CUSTOMER và đăng ký**
```text
Vẽ bản đồ mobile-first cho CUSTOMER. Ô chỉ hiển thị mã, zone và trạng thái; ưu tiên ô Trống, không lộ thông tin xe/khách khác. Khi chọn ô Trống, mở flow chọn một xe của chính khách và xác nhận “Đăng ký đỗ xe”. Thành công hiển thị mã ô và vé DAILY trong ngày theo phản hồi hệ thống; không chọn loại vé hoặc tự nhập giá. Có frame lỗi ô vừa được người khác đăng ký. Không có xem thông tin xe, hủy đặt chỗ hay đăng ký xe người khác.
```

## Task 11–12 — Vé và sidebar

```text
Vẽ danh sách vé và form chỉnh sửa vé cho MANAGER/STAFF: bảng gọn gồm mã vé, biển số, loại, giá, ngày hiệu lực, trạng thái. STAFF chỉ xem; MANAGER có thao tác được phép. Không có tạo vé mới, in vé hoặc hủy vé. Kèm sidebar theo role: CUSTOMER chỉ thấy Trang chủ, Xe của tôi, Bản đồ; STAFF có chức năng vận hành và chỉ xem Vé/Vị trí; MANAGER có quản trị và thống kê. CUSTOMER không có danh sách vé.
```

## Task 13 — Thống kê (MANAGER)

```text
Vẽ trang thống kê gọn cho MANAGER: bộ lọc Theo ngày/tháng/năm, Từ ngày, Đến ngày, nút “Xem báo cáo”; các chỉ số lượt vào, lượt ra, doanh thu vé, doanh thu đỗ lẻ, ô trống, ô đang đỗ. Tách riêng hai nguồn doanh thu. Dùng tối đa một biểu đồ rõ ràng nếu có dữ liệu. Có trạng thái chưa chọn kỳ và không có dữ liệu. Không có export, dự đoán, top xe hoặc KPI tự bịa.
```

## Task 14–16 — Quản lý vị trí đỗ (MANAGER/STAFF)

```text
Vẽ danh sách, form và chi tiết vị trí đỗ cho MANAGER/STAFF. Danh sách gọn gồm mã ô, zone, trạng thái; MANAGER có nút thêm/sửa/xóa, STAFF chỉ xem. Form chỉ có mã ô, zone, trạng thái hợp lệ và ghi chú. Panel xe chỉ dành cho MANAGER/STAFF. Modal xóa có frame lỗi 409 và giữ nguyên dữ liệu. Không thêm sức chứa, sơ đồ kéo-thả, sensor hay lịch bảo trì. CUSTOMER không truy cập trang này.
```

## Thành phần dùng chung

```text
Vẽ riêng header, sidebar mobile/desktop và modal xác nhận của ParkCore. Header có thương hiệu, tên/role người dùng và đăng xuất. Sidebar có trạng thái đang chọn, menu theo role. Modal xác nhận có đối tượng, nút hành động rõ và nút hủy; có biến thể lỗi 409. Nhãn tiếng Việt ngắn, không có chuông thông báo hoặc dữ liệu giả.
```

## Quy ước role

| Role | Phạm vi giao diện |
|---|---|
| MANAGER | Quản trị theo ma trận quyền trong `AGENTS.md`. |
| STAFF (Bảo vệ) | Nhân viên vận hành; scan, check-in/out, tìm xe; chỉ xem Vé và Vị trí. “Bảo vệ” là tên hiển thị/ngữ cảnh, không tạo role mới. |
| CUSTOMER | Trang chủ/tin tức, hồ sơ và xe của chính mình, bản đồ và đăng ký ô trống bằng xe của mình. Không xem thông tin xe ở bản đồ hoặc vào các trang quản trị. |

## Lưu và review mockup

Lưu vào thư mục Task tương ứng dưới `docs/design/screens/`. Đặt tên biến thể CUSTOMER/STAFF dễ phân biệt, ví dụ `customer-home.png`, `customer-my-vehicles.png`, `customer-map.png`, `staff-gate.png`. Cập nhật `docs/design/figma-link.md` sau khi Stitch tạo hình. Mockup chỉ tham khảo; không đưa `code.html` Tailwind vào production. Trước khi code, đối chiếu lại `AGENTS.md`, API contract và `.agents/rules/ejs.md`.
