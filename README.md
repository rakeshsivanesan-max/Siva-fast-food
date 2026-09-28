# SIVA'S FAST FOOD — QR-Based Digital Ordering System
**Tagline:** "FAST • FRESH • FIERY"  
**Subtitle:** "Tasty • Affordable • Always"  
**Location:** Ramakrishnapuram, Srivilliputhur  
**Tamil Script:** சிவாஸ் பாஸ்ட் ஃபுட்  

A complete, full-stack, mobile-first QR-code digital ordering system for **SIVA'S FAST FOOD** takeaway/fast-food shop. Designed specifically for fast counter service with automatic sequential token generation, zero customer login friction, real-time kitchen order display (KDS), menu management, POS thermal receipt printing, and shop counter QR standee generation.

---

## 🌟 Key Features

### 1. Mobile-First Customer Ordering (No Tables, Zero Friction)
- **Instant Access via QR Code**: Direct access to menu without downloading an app.
- **No Login / No Account**: Fast ordering without registration barriers.
- **No Table Number Required**: Small fast-food takeaway system based on pickup token numbers.
- **Authentic Menu Seeding**: 37 menu items seeded with exact prices and categories from the actual menu photo:
  - **Omelette**: Plain Omelette (₹40), Bread Omelette (₹50), Cheese Omelette (₹50), Chicken Omelette (₹70), Special Omelette (₹80).
  - **Mojitos**: Lemon Mojito (₹50), Mint Mojito (₹50), Strawberry Mojito (₹60), Mango Mojito (₹60), Student Combo Any 2 (₹100).
  - **Fried Chicken**: 1 Pc (₹50), 2 Pc (₹90), 3 Pc (₹130), 4 Pc (₹170), Chicken Popcorn (₹70), Chicken Strips (₹80), Chicken Nuggets (₹60).
  - **Fried Rice**: Veg (₹80), Schezwan Veg (₹90), Egg (₹100), Mushroom (₹100), Paneer (₹110), Schezwan Egg (₹110), Chicken (₹120), Schezwan Chicken (₹120).
  - **Momo's**: Veg Momo 6pcs (₹60), Chicken Momo 6pcs (₹80), Fried Momo Veg (₹80), Fried Momo Chicken (₹100).
  - **Noodles**: Veg (₹80), Schezwan Veg (₹90), Egg (₹100), Mushroom (₹100), Chilli Garlic (₹110), Schezwan Egg (₹110), Chicken (₹120), Schezwan Chicken (₹120).
- **Diet Filters**: Instant Veg / Non-Veg and Category filtering.
- **Cart Drawer**: Quantity stepper, dynamic subtotal calculation, optional cooking notes.
- **Sticky Bottom Cart Bar**: Shows item count and total amount on mobile.
- **Order Confirmation & Live Tracker**: Shows prominent Token # (e.g. `#101`, `#102`) with live status steps:
  `Received ➔ Preparing (In Wok) ➔ Ready for Pickup 🔔 ➔ Completed`.
- **Audio Notification**: Chimes when food is marked ready!

### 2. Owner / Admin Dashboard (`/admin`)
- **Protected Access**: JWT authentication (`admin` / `siva123`).
- **Live Orders Kitchen Board**:
  - Live order cards with Order Token Number, elapsed time, item breakdown, and cooking notes.
  - One-click workflow buttons: `[ Accept & Cook ]` ➔ `[ Mark Ready 🔔 ]` ➔ `[ Complete ✓ ]`.
  - Web Audio kitchen bell chime on new orders.
- **Real-Time Updates**: Built with Server-Sent Events (SSE) for instantaneous updates without page refreshes.
- **POS Thermal Bill Generation**:
  - Itemized receipt with shop branding, token number, date, time, and total.
  - Styled for 80mm/58mm thermal printers or regular printers via `window.print()`.
- **Menu Management**:
  - Add, edit, or delete items.
  - Instant 1-click **In Stock / Unavailable** toggle switch.
  - Custom image upload or image URL input.
- **Order History**:
  - Search by Order Token # (e.g., `101`) or item name.
  - Date filtering and revenue statistics.
- **QR Code & Counter Standee**:
  - High-res QR code generator pointing to ordering URL.
  - Ready-to-print **Counter Standee Tent Card** with instructions.
  - PNG download button.

### 3. Backend & Security
- **Node.js + Express**: High-speed, robust REST API and SSE stream.
- **Embedded SQLite Database (`node:sqlite`)**: Zero external service dependency, persistent database with WAL mode and ACID transactions.
- **Server-Side Price Validation**: Never trusts prices sent from the client. Re-fetches prices from DB when creating orders.

---

## 🚀 Running the Application

### 1. Prerequisites
- Node.js (v20+ or v24 LTS)

### 2. Start the Server
```bash
# In the project directory:
npm start
```
The application runs at:
👉 **`http://localhost:5000`**

### 3. Access URLs
- **Customer Ordering Menu**: `http://localhost:5000`
- **Owner Dashboard**: `http://localhost:5000/#admin` (or click "Owner" in top header)
- **Default Owner Credentials**:
  - **Username**: `admin`
  - **Password**: `siva123`

### 4. Testing on Mobile via Local Wi-Fi
To scan the QR code with your mobile phone:
1. Find your computer's local IP address (e.g., `192.168.1.15`).
2. In the Owner Dashboard under the **QR Code & Standee** tab, enter `http://192.168.1.15:5000` as the target URL.
3. The QR code will update. Scan it directly with your smartphone's camera to place an order from your phone!

---

## 🧪 Automated Testing
Run the comprehensive 35-point end-to-end test suite:
```bash
node test_e2e.js
```
All 35 tests verify:
- Shop metadata and branding
- 37 menu items and accurate prices
- Order placement and sequential token generation
- Server-side price calculation
- Owner authentication and stats
- Status transition lifecycle (NEW ➔ PREPARING ➔ READY ➔ COMPLETED)
- Bill receipt generation
- Real-time SSE streaming
- Out-of-stock toggle
- Static frontend delivery
