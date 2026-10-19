# Stitch AI Design Prompts - Hệ thống Quản lý Bãi đỗ xe

> **Hướng dẫn sử dụng**: Copy từng prompt dưới đây vào Stitch AI / v0.dev / Figma AI để sinh thiết kế cho từng màn hình. Sau khi có thiết kế, export về folder `docs/design/screens/` theo quy ước đặt tên.

---

## 🎨 Design System (Dùng cho tất cả prompt)

Thêm đoạn này vào **cuối mỗi prompt** để đảm bảo nhất quán:

```
Design System:
- Style: Clean, modern, professional dashboard
- Color scheme: Primary blue (#0066CC), secondary gray (#6C757D), success green (#28A745), danger red (#DC3545), warning yellow (#FFC107)
- Typography: System font stack (San Francisco/Segoe UI), 14px base size
- Layout: Bootstrap 5 grid, responsive (mobile-first)
- Components: Bootstrap 5 buttons, forms, cards, tables, modals
- Spacing: 8px base unit
- Shadows: Subtle elevation (0 2px 4px rgba(0,0,0,0.1))
- Icons: Bootstrap Icons or Feather Icons
```

---

## 📋 Prompt theo từng Task

### Task 1 - Đăng nhập & Quên mật khẩu

```
Create a modern login page for a parking management system with these screens:

1. LOGIN SCREEN:
   - Center card (max-width 400px) with shadow
   - Company logo/icon at top
   - Title "Hệ thống Quản lý Bãi đỗ xe"
   - Username field (placeholder: "Tên đăng nhập")
   - Password field with show/hide toggle
   - "Đăng nhập" primary button (full width)
   - "Quên mật khẩu?" link below button (right-aligned)
   - Background: subtle gradient or abstract parking lot pattern

2. FORGOT PASSWORD SCREEN:
   - Similar card layout
   - Title "Quên mật khẩu"
   - Email input field
   - "Gửi liên kết đặt lại" button
   - "Quay lại đăng nhập" link

3. RESET PASSWORD SCREEN:
   - Title "Đặt lại mật khẩu"
   - New password field
   - Confirm password field
   - Password strength indicator
   - "Đặt lại mật khẩu" button

[Design System từ trên]
```

---

### Task 2 - Trang chủ & Header/Footer

```
Design a dashboard home page with header and footer for a parking management system:

HEADER (Fixed top):
- Logo/brand on left
- Navigation menu (collapsed on mobile)
- User profile dropdown on right (avatar, name, "Đăng xuất")
- Notification bell icon

HOME PAGE:
- Welcome message with user name
- 4 stat cards in row (responsive to 2x2 on tablet, 1 column on mobile):
  * Tổng xe đang đỗ (icon: car, number, change indicator)
  * Vị trí trống (icon: parking, number, percentage bar)
  * Doanh thu hôm nay (icon: currency, number)
  * Xe vào/ra hôm nay (icon: arrows, number)
- Recent activity timeline (last 5 entries)
- Quick actions section (3-4 prominent buttons: "Xe vào", "Xe ra", "Đăng ký đỗ xe", "Xem bản đồ")

NEWS LIST SECTION:
- Title "Tin tức bãi đỗ xe"
- Card grid (3 columns desktop, 1 column mobile)
- Each card: thumbnail image, title, date, short excerpt, "Đọc thêm" link

FOOTER:
- Company info on left
- Quick links center (Điều khoản, Chính sách, Liên hệ)
- Copyright text right

[Design System từ trên]
```

---

### Task 3-4 - Quản lý Nhân viên

```
Design employee management screens for a parking system:

1. EMPLOYEE LIST:
   - Page title "Danh sách Nhân viên" with "Thêm nhân viên" button (top right)
   - Search bar (placeholder: "Tìm theo tên, email, số điện thoại")
   - Responsive table/card list:
     * Columns: Avatar/Photo, Họ tên, Email, Số điện thoại, Chức vụ, Trạng thái (Active badge), Hành động
     * Action buttons: Edit (pencil icon), Delete (trash icon - red)
   - Pagination controls at bottom
   - Empty state: illustration + "Chưa có nhân viên nào"

2. ADD/EDIT EMPLOYEE FORM:
   - Title "Thêm nhân viên" / "Sửa thông tin nhân viên"
   - Two-column form layout (single column on mobile):
     * Left: Họ tên*, Email*, Số điện thoại*, Địa chỉ
     * Right: Chức vụ (dropdown), Tên đăng nhập*, Mật khẩu* (chỉ khi thêm mới)
   - Avatar upload area (circle, with placeholder)
   - "Lưu" button (primary) and "Hủy" button
   - Required field indicator (*)

3. DELETE CONFIRMATION MODAL:
   - Warning icon
   - Text: "Bạn có chắc muốn xóa nhân viên [Tên]?"
   - "Xóa" button (danger) and "Hủy" button

[Design System từ trên]
```

---

### Task 5-6-7 - Quản lý Khách hàng & Modal Thêm xe

```
Design customer management screens:

1. CUSTOMER LIST:
   - Title "Danh sách Khách hàng" with "Thêm khách hàng" button
   - Search + filter bar (Tìm theo tên/SĐT, Lọc: Tất cả/Có tài khoản/Vãng lai)
   - Table: Họ tên, Số điện thoại, Email, Số xe, Ngày tạo, Hành động (View info, Edit, Delete)
   - Pagination

2. CUSTOMER INFO (Thông tin Xe):
   - Customer header card: Name, phone, email, account status badge
   - Vehicle list table:
     * Columns: Biển số, Tên xe, Hãng xe, Loại xe, Trạng thái đỗ (badge), Vị trí hiện tại
   - "Thêm xe mới" button

3. ADD CUSTOMER FORM:
   - Title "Thêm Khách hàng"
   - Fields: Họ tên*, Số điện thoại*, Email, Địa chỉ
   - Checkbox: "Tạo tài khoản đăng nhập" (expands to show Username, Password fields)
   - Section "Thêm xe" with "+ Thêm xe" button (opens modal)
   - Added vehicles preview list
   - Save/Cancel buttons

4. EDIT CUSTOMER FORM:
   - Similar to Add but title "Sửa thông tin khách hàng"
   - Vehicle section shows existing vehicles with Edit/Delete icons
   - "+ Thêm xe mới" button

5. MODAL - ADD VEHICLE:
   - Modal popup (max-width 500px)
   - Title "Thêm xe mới"
   - Fields: Biển số xe*, Tên xe*, Hãng xe*, Loại xe (dropdown: Xe máy/Ô tô)
   - Note: "Modal này dùng chung cho nhiều màn hình"
   - "Thêm xe" button (primary) and "Đóng" button

[Design System từ trên]
```

---

### Task 8 - Quản lý Xe vào/ra (Scan biển số)

```
Design a check-in/check-out screen with license plate scanning:

LAYOUT:
- Title "Quản lý Xe vào/ra"
- Two-tab interface: "Xe vào" (active) / "Xe ra"

SCAN SECTION (Left half on desktop, top on mobile):
- Large drag-drop zone with dashed border
  * Icon: camera or image placeholder
  * Text: "Kéo thả ảnh biển số xe hoặc click để chọn"
  * Supported formats note: "JPG, PNG, WebP - tối đa 5MB"
- Image preview area (shows uploaded image)
- "Quét biển số" button (primary, with loading spinner state)

RESULT SECTION (Right half, appears after scan):
- Scanned plate display (large, bold, centered)
- 5 auto-filled fields in card layout:
  * Tên xe (icon: car)
  * Hãng xe (icon: tag)
  * Tên khách hàng (icon: user) - shows "Khách vãng lai" if null
  * Số điện thoại (icon: phone)
  * Vị trí đỗ hiện tại (icon: map-pin) - shows "Chưa có vị trí" if null
- Case: Vehicle not found
  * Badge: "Xe mới / Khách vãng lai"
  * "Thêm xe vào hệ thống" button (opens modal)

ACTION BUTTONS:
- "Cho xe vào" button (success green, large)
- "Cho xe ra" button (info blue, large)
- "Xóa và quét lại" button (secondary)

ERROR STATES:
- File too large: warning banner "Ảnh vượt quá 5MB"
- Cannot read plate: error banner "Không đọc được biển số, vui lòng thử ảnh khác"

[Design System từ trên]
```

---

### Task 9 - Modal Tìm xe

```
Design a vehicle search modal (opened from sidebar button):

MODAL LAYOUT:
- Title "Tìm xe" with close button
- Search input (large, with search icon)
  * Placeholder: "Nhập tên khách hàng, số điện thoại hoặc biển số xe"
  * Search button on right
- Real-time results list (max 20 items):
  * Each result card shows:
    - Biển số xe (bold, large)
    - Tên xe - Hãng xe (smaller text)
    - Khách hàng: Tên (SĐT)
    - Trạng thái: Badge (Đang đỗ tại X / Chưa đỗ)
    - "Xem chi tiết" link
- Empty state: "Không tìm thấy kết quả"
- Loading state: skeleton cards

NOTES:
- Modal triggered by "Tìm xe" button in sidebar
- Only visible for MANAGER and STAFF roles
- Results update as user types (debounced)

[Design System từ trên]
```

---

### Task 10 - Bản đồ Bãi đỗ xe

```
Design an interactive parking lot map with slot management:

LAYOUT:
- Title "Bản đồ Bãi đỗ xe" with legend
- Legend showing status colors:
  * Green: Trống (AVAILABLE)
  * Red: Đang đỗ (OCCUPIED)
  * Yellow: Đã đăng ký (RESERVED)
  * Gray: Bảo trì (MAINTENANCE)

MAP GRID:
- Visual grid layout (e.g., 10x10 cells)
- Each cell:
  * Slot code (e.g., "A-01") at top
  * Color-coded background based on status
  * Hover effect: border highlight + cursor pointer
  * Click: shows context menu

CONTEXT MENU (appears on cell click):
- Small popup panel positioned near clicked cell
- Menu items:
  1. "Xem thông tin xe" - enabled only for OCCUPIED/RESERVED, grayed out for AVAILABLE/MAINTENANCE
     * Note: Only MANAGER and STAFF can see vehicle info (hide for CUSTOMER)
  2. "Đăng ký đỗ xe" - enabled only for AVAILABLE, grayed with reason for others
     * CUSTOMER version: "Chọn xe của bạn" dropdown
- Close button

VEHICLE INFO POPUP (when "Xem thông tin xe" clicked):
- Card overlay showing:
  * Vị trí: [Slot code]
  * Biển số xe
  * Tên xe - Hãng xe
  * Khách hàng (nếu có)
  * Thời gian vào
  * "Đóng" button

REGISTER PARKING POPUP (when "Đăng ký đỗ xe" clicked):
- For MANAGER/STAFF: Search vehicle input + suggestions
- For CUSTOMER: Dropdown "Chọn xe của bạn" (only their vehicles)
- Ticket type selector: Theo ngày / Theo tháng / VIP
- Price display
- "Xác nhận đăng ký" button

RESPONSIVE:
- Desktop: grid view
- Mobile: list view with filter by zone

[Design System từ trên]
```

---

### Task 11-12 - Quản lý Vé & Sidebar

```
Design ticket management screens and navigation sidebar:

1. TICKET LIST:
   - Title "Danh sách Vé"
   - Filter bar: Trạng thái (Tất cả/Hiệu lực/Hết hạn/Đã hủy), Loại vé (dropdown), Từ ngày - Đến ngày
   - Table: Mã vé, Biển số xe, Khách hàng, Loại vé (badge), Giá, Ngày bắt đầu, Ngày hết hạn, Trạng thái (badge), Hành động
   - Action: Edit (pencil), Delete (trash - MANAGER only)
   - Pagination

2. EDIT TICKET FORM:
   - Title "Chỉnh sửa Vé [Mã vé]"
   - Read-only fields: Mã vé, Biển số xe, Khách hàng
   - Editable: Loại vé (dropdown), Giá, Ngày bắt đầu, Ngày kết thúc, Trạng thái
   - Warning: "Không thể sửa vé đang gắn với xe đang đỗ"
   - Save/Cancel buttons

3. SIDEBAR (for all management screens):
   - Collapsible on mobile (hamburger icon)
   - Logo/brand at top
   - Navigation menu items (icon + label):
     * Trang chủ / Tin tức (all roles)
     * Nhân viên (MANAGER only)
     * Khách hàng (MANAGER, STAFF)
     * Thông tin của tôi (CUSTOMER only - their info + vehicles)
     * Xe vào/ra (MANAGER, STAFF)
     * Bản đồ bãi đỗ (all roles)
     * Vé (MANAGER, STAFF)
     * Thống kê (MANAGER only)
     * Vị trí đỗ (MANAGER, STAFF)
   - "Tìm xe" button at bottom (MANAGER, STAFF - opens modal)
   - Active state highlighting
   - Responsive: fixed left on desktop, overlay on mobile

[Design System từ trên]
```

---

### Task 13 - Tổng hợp & Thống kê

```
Design statistics and reporting dashboard:

PAGE TITLE: "Thống kê & Báo cáo"

FILTER SECTION (Card at top):
- Radio buttons: "Theo Ngày" / "Theo Tháng" / "Theo Năm" (active style)
- Date range picker: "Từ ngày" - "Đến ngày" (changes to month/year picker based on radio)
- Validation note: "Ngày bắt đầu phải <= Ngày kết thúc"
- "Xem báo cáo" button (primary)
- "Xuất Excel" button (secondary, icon: download)

OVERVIEW CARDS (4 cards in row, responsive):
1. Tổng xe vào (icon: arrow-down-circle, number, trend indicator ↑5%)
2. Tổng xe ra (icon: arrow-up-circle, number)
3. Doanh thu vé (icon: ticket, currency format)
4. Doanh thu lượt đỗ lẻ (icon: coins, currency format)

CURRENT STATUS (2 cards):
- Vị trí trống (gauge chart or progress bar)
- Vị trí đang đỗ

DETAILED SECTIONS (Tabs):
Tab 1 - Lưu lượng xe:
- Line chart: xe vào/ra theo thời gian (dual line, green/red)
- Data table below chart

Tab 2 - Doanh thu:
- Bar chart: doanh thu vé vs lượt đỗ lẻ (stacked)
- Table breakdown by ticket type

Tab 3 - Sử dụng vị trí:
- Pie chart: AVAILABLE/OCCUPIED/RESERVED/MAINTENANCE
- List of most used slots

EMPTY STATE:
- Illustration: "Chọn khoảng thời gian để xem thống kê"

[Design System từ trên]
```

---

### Task 14-15-16 - Quản lý Vị trí đỗ

```
Design parking slot management screens:

1. SLOT LIST:
   - Title "Danh sách Vị trí đỗ"
   - "Thêm vị trí đỗ" button (top right, MANAGER only)
   - Filter: Zone (dropdown: Tất cả/A/B/C...), Trạng thái (dropdown)
   - Grid/card view toggle
   - Card view: Each slot card shows:
     * Slot code (large, bold)
     * Zone badge
     * Status badge with color
     * Current vehicle (if OCCUPIED/RESERVED) with icon
     * View detail link
   - Table view alternative (for desktop)
   - Pagination

2. ADD SLOT FORM:
   - Title "Thêm Vị trí đỗ"
   - Fields:
     * Mã vị trí* (e.g., "A-01")
     * Khu vực/Zone* (dropdown: A, B, C, VIP...)
     * Trạng thái ban đầu (default: AVAILABLE)
     * Ghi chú (textarea)
   - Validation: "Mã vị trí đã tồn tại"
   - Save/Cancel buttons

3. EDIT SLOT FORM:
   - Title "Sửa Vị trí đỗ [Mã]"
   - Read-only: Mã vị trí
   - Editable: Zone, Trạng thái, Ghi chú
   - Status change rules (with visual indicators):
     * AVAILABLE → MAINTENANCE: allowed
     * OCCUPIED/RESERVED → anything: blocked with warning
     * MAINTENANCE → AVAILABLE: allowed
   - Save/Cancel

4. SLOT DETAIL PAGE:
   - Header: Slot code, zone, status badge
   - Info card:
     * Thời gian tạo
     * Ghi chú
     * Current vehicle (if any): plate, customer link
   - History section (table):
     * Lịch sử xe đỗ: Biển số, Thời gian vào, Thời gian ra, Phí
     * Pagination for history
   - Actions: Edit button, Delete button (MANAGER only)

5. DELETE CONFIRMATION MODAL:
   - Warning icon
   - Text: "Xóa vị trí [Mã]?"
   - Conditions check:
     * "Không thể xóa vị trí đang OCCUPIED/RESERVED"
     * "Vị trí đã có lịch sử. Đề xuất: chuyển sang MAINTENANCE"
   - Delete (danger) / Cancel buttons

[Design System từ trên]
```

---

## 🎯 Prompt tổng quát cho Partials/Components

### Header Component
```
Design a responsive header component for parking management system:
- Logo left (parking icon + text "Parking System")
- Navigation menu center (auto-collapse to hamburger on mobile)
- Right section: notification bell (badge count), user dropdown (avatar, name, role, "Đăng xuất")
- Sticky on scroll
- Height: 60px desktop, 56px mobile
[Design System]
```

### Footer Component
```
Design a simple footer:
- 3 columns on desktop, stacked on mobile
- Column 1: Company info + logo
- Column 2: Quick links (Điều khoản, Chính sách, Hỗ trợ, Liên hệ)
- Column 3: Social icons + language selector (if needed)
- Copyright text bottom center
- Background: light gray (#F8F9FA)
[Design System]
```

### Confirmation Modal Template
```
Design a reusable confirmation modal:
- Icon at top (warning/info/danger - parameterized)
- Title
- Message text (can be multi-line)
- Two buttons: Primary action (left, danger/primary color) + Cancel (right, secondary)
- Max-width: 400px
- Backdrop: semi-transparent black
[Design System]
```

---

## 📝 Notes cho Designer

1. **Responsive breakpoints**: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)
2. **Accessibility**: 
   - Color contrast ratio >= 4.5:1
   - Focus states for all interactive elements
   - ARIA labels for icons
3. **Role-based visibility**: 
   - Dùng badge/note để chỉ rõ "Chỉ MANAGER", "MANAGER & STAFF", "Tất cả vai trò"
4. **Vietnamese language**: Tất cả labels/text dùng tiếng Việt
5. **Empty states**: Mỗi list/table cần có empty state với illustration
6. **Loading states**: Skeleton screens cho danh sách, spinner cho buttons
7. **Error states**: Inline validation messages (red text below field)

---

## 🔄 Workflow với Stitch AI

1. Copy prompt của Task bạn cần thiết kế
2. Paste vào Stitch AI / v0.dev
3. Review thiết kế sinh ra, điều chỉnh prompt nếu cần
4. Export:
   - PNG cho documentation (300 DPI)
   - SVG cho assets tái sử dụng
   - Code (HTML/React) nếu Stitch AI hỗ trợ
5. Lưu vào `docs/design/screens/task-XX-ten-man-hinh.png`
6. Cập nhật checklist trong `figma-link.md`

---

## 🤝 Team Collaboration

- **Frontend dev**: Lấy thiết kế từ folder này, đối chiếu với `rule_common.md` mục 3 để biết logic/API
- **Backend dev**: Xem thiết kế để hiểu UI cần field gì, validate gì
- **QA**: Dùng thiết kế làm baseline cho test UI/UX

**Lưu ý**: Thiết kế từ AI là bản *gần đúng*. Team cần review và tinh chỉnh cho phù hợp brand, UX thực tế.
