---
name: ParkCore Precision
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#414753'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#727784'
  outline-variant: '#c1c6d5'
  surface-tint: '#005cba'
  primary: '#0066cc'
  on-primary: '#ffffff'
  primary-container: '#0066cc'
  primary-hover: '#0052a3'
  primary-active: '#004080'
  on-primary-container: '#dfe8ff'
  inverse-primary: '#aac7ff'
  secondary: '#575f67'
  on-secondary: '#ffffff'
  secondary-container: '#d8e1ea'
  on-secondary-container: '#5b646b'
  tertiary: '#005d1e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00792a'
  on-tertiary-container: '#98ff9d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00458e'
  secondary-fixed: '#dbe4ed'
  secondary-fixed-dim: '#bfc8d0'
  on-secondary-fixed: '#141d23'
  on-secondary-fixed-variant: '#3f484f'
  tertiary-fixed: '#83fc8e'
  tertiary-fixed-dim: '#66df75'
  on-tertiary-fixed: '#002106'
  on-tertiary-fixed-variant: '#00531a'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-base-semibold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-base:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-badge:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system establishes an enterprise-grade operational environment for municipal, commercial, and mixed-use parking facilities. The visual aesthetic fuses **Corporate / Modern** principles with high-density data legibility, prioritizing immediate situational awareness, operational uptime, and sub-second decision making.

### Brand Personality & Emotional Tone
- **Authoritative & Reliable:** Visual weight and structural stability communicate system dependability under heavy throughput conditions (e.g., peak vehicle check-in/check-out).
- **Clear & High-Legibility:** High-contrast indicators and functional information density reduce cognitive load for facility controllers and barrier attendants.
- **Controlled & Pragmatic:** Pure visual utility over decoration; every indicator, badge, and card serves an explicit tracking or monitoring purpose.

### Visual Architecture
The layout uses a structured utility framework: crisp 1px structural dividers, structured dashboard widgets, real-time status cues, and clear Vietnamese terminology tailored for transport logistics and parking telemetry.

## Colors

The palette balances administrative blue with strict operational status colors designed for quick parsing on barrier monitors and CCTV-adjacent dashboards.

### Core Application Roles
- **Primary (`#0066CC`):** Primary interactions, selected navigation states, primary data filters, and high-priority action buttons (e.g., "Xác nhận vào", "Xuất bến").
- **Secondary Neutral (`#6C757D`):** Metadata, non-active icon fills, boundary frames, and the `MAINTENANCE` (Đang bảo trì) status indicator.
- **Surface & Background (`#F8F9FA`):** Low-strain canvas tone preventing glare during extended shift monitoring. Pure white (`#FFFFFF`) is reserved for foreground cards and telemetry panels.
- **Border / Divider (`#E5E7EB` / `#D1D5DB`):** Structural borders establishing card perimeters without high contrast distraction.

### Operational State Matrix (Parking Lot Occupancy)
- **Available (`#28A745` / Trống):** Green badge with 10% tint background (`#EAF5EA`) indicating open bays ready for vehicle routing.
- **Occupied (`#DC3545` / Đã đỗ):** Red badge with 10% tint background (`#FDECEE`) signalling occupied slots or active barriers.
- **Reserved (`#FFC107` text `#856404` / Đặt trước):** Amber badge with tint background (`#FFF9E6`) marking pre-booked customer allocations.
- **Maintenance (`#6C757D` / Đang bảo trì):** Slate-gray badge with tint background (`#F0F2F4`) indicating offline sensors, cleaning, or hardware maintenance.

## Typography

The typography standard relies on **Inter**, optimized for Vietnamese diacritics and clean numeric rendering in data tables, license plate recognition outputs, and monetary transactions.

### Typographic Principles
- **Base Body (14px / 20px):** Default reading scale for transaction logs, customer profiles, and tabular telemetry. Maintains high information density without sacrificing readability.
- **Tabular Figures:** Numbers in tables, license plates (Biển số xe), timestamps, and currency counters (VND) must render using tabular (monospaced) numerals (`font-variant-numeric: tabular-nums`) to prevent shifting layouts on live refreshes.
- **Plate Display Role (`code-mono`):** Applied exclusively to optical character recognition (OCR) license plate reads (e.g., `29A-888.88`, `51K-123.45`) to distinguish human vehicle identifiers from regular system metadata.

## Layout & Spacing

The layout is built on an enterprise dashboard fluid-grid foundation with bounded margins, prioritizing dynamic data widgets and spatial maps of parking floors (Khu vực / Tầng đỗ xe).

### Breakpoints & Adaptations
- **Desktop (>= 1280px):** 12-column layout. Persistent left navigation sidebar (240px or collapsed to 64px), 24px outer margin (`margin-lg`), 24px gutter (`gutter-lg`). Real-time camera feeds and slot allocation grids sit side-by-side.
- **Tablet (768px - 1279px):** 8-column layout. Left navigation transitions to an off-canvas drawer or icon-only bar. Gutters tighten to 16px (`gutter`), margins to 24px (`margin-md`). Cards wrap dynamically.
- **Mobile Handheld (<= 767px):** 4-column layout. 16px margin (`margin`), single-column flow for check-in validation, parking card scanner view, and ticket payment interfaces.

### Structural Density Rules
- Component internal padding uses compact steps: cards use `space-lg` (16px) or `space-xl` (24px) padding.
- Input groupings, button groups, and badge indicators use `space-xs` (4px) to `space-sm` (8px) internal spacing to preserve dashboard real estate.

## Elevation & Depth

To prevent visual fatigue and keep focus strictly on vehicle telemetry, this design system uses controlled, low-intensity elevation with clean, low-contrast structural outlines.

### Elevation Levels
- **Level 0 (Flat / Canvas):** Applied to the main backdrop (`#F8F9FA`). No shadow. Internal borders between layout zones use `1px solid #E5E7EB`.
- **Level 1 (Card & Dashboard Panels):** 
  - Formula: `box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);`
  - Outline: `border: 1px solid #E5E7EB;`
  - Applied to metrics cards (KPI panels), camera stream containers, and data table wrappers.
- **Level 2 (Interactive Hover & Dropdowns):**
  - Formula: `box-shadow: 0 4px 8px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04);`
  - Applied to active slot tooltips, quick-select vehicle detail popovers, and select dropdown menus.
- **Level 3 (Modals & Gate Overrides):**
  - Formula: `box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.12);`
  - Applied to critical emergency gate release confirmations ("Mở barie thủ công") and manual ticket creation dialogs.

## Shapes

The design system adopts a **Soft (Level 1)** geometric standard. Crisp corners with micro-radii reinforce professional software reliability, mirroring industrial control terminals and fleet hardware.

### Radius Assignments
- **Base (0.25rem / 4px):** Checkboxes, radio handles, status pills, small input controls, table row hover indicators, and dense data badges.
- **Containers & Cards (`rounded-lg`, 0.5rem / 8px):** Dashboard summary cards, data grid containers, modal windows, and live surveillance video viewports.
- **Maximum Inner Elements (`rounded-xl`, 0.75rem / 12px):** Contextual side-drawers and master overview map modules. Pill-style circular curves are prohibited for operational elements except for avatar badges.

## Components

All components are localized into Vietnamese terminology standard in Vietnamese logistics and facility management operations.

### 1. Status Badges (Huy hiệu trạng thái đỗ xe)
Badges feature all-caps label text, 4px border radius, and strict semantic color pairings:
- **TRỐNG (AVAILABLE):** Text `#1E7E34`, Background `#EAF5EA`, Border `1px solid #B8E2BE`.
- **ĐÃ ĐỖ (OCCUPIED):** Text `#BD2130`, Background `#FDECEE`, Border `1px solid #F5B5BB`.
- **ĐẶT TRƯỚC (RESERVED):** Text `#856404`, Background `#FFF9E6`, Border `1px solid #FFE699`.
- **BẢO TRÌ (MAINTENANCE):** Text `#545B62`, Background `#F0F2F4`, Border `1px solid #CED4DA`.

### 2. Buttons (Nút bấm tương tác)
- **Primary:** Background `#0066CC`, Text `#FFFFFF`, Border: none. Hover state `#0052A3`. Active state `#004080`.
- **Secondary:** Background `#FFFFFF`, Text `#495057`, Border `1px solid #CED4DA`. Hover state `#F8F9FA`.
- **Danger (Cảnh báo / Mở khẩn cấp):** Background `#DC3545`, Text `#FFFFFF`. Hover `#C82333`.
- **Dimensions:** 36px height for standard actions (14px text), 44px for primary gate trigger operations to support touchscreen touch targets.

### 3. Cards & KPI Widgets (Thẻ chỉ số tổng quan)
- Background `#FFFFFF`, Border `1px solid #E5E7EB`, Elevation `0 2px 4px rgba(0, 0, 0, 0.06)`.
- Internal structure: Upper section contains 13px muted label (e.g., "Tổng số xe trong bãi", "Doanh thu hôm nay"), mid-section contains prominent 24px/32px tabular numerical metrics, lower section displays real-time delta indicators.

### 4. Input Fields (Trường nhập liệu & Tìm kiếm)
- Height 38px, Border `1px solid #CED4DA`, Corner radius `4px`.
- Focus state: Border `#0066CC`, Box-shadow `0 0 0 3px rgba(0, 102, 204, 0.15)`.
- Dedicated search variant with embedded magnifying glass icon and placeholder: "Tìm kiếm biển số, mã vé, số điện thoại...".

### 5. Checkboxes & Radio Buttons (Lựa chọn & Bộ lọc)
- Checkbox size 16px x 16px with `rounded` 3px corner. Checked background `#0066CC` with white checkmark.
- Radio button 16px outer diameter with 6px concentric indicator upon selection.

### 6. Parking Slot Visual Grid Map (Sơ đồ vị trí đỗ xe)
- Interactive cell cards representing individual bays (e.g., "A-01", "B-12").
- Displays: Bay identifier, live occupancy duration, assigned vehicle plate number (in monospace font), and color-coded status bar on the cell's left rim (4px solid color).

### 7. Tables (Bảng dữ liệu nhật ký vào / ra)
- Crisp border-collapsed layout with alternating hover state (`#F8F9FA`).
- Headers: 12px uppercase medium text (`#6C757D`), 36px row height.
- Columns: Mã vé (Ticket ID), Biển số xe (License Plate), Thời gian vào (Entry Time), Thời gian ra (Exit Time), Vị trí đỗ (Slot), Phí dịch vụ (Fee), Trạng thái (Status), Thao tác (Action).