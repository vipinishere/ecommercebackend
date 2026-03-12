# 🛒 E-Commerce Backend API

A production-ready, scalable e-commerce backend built with **NestJS**, **Prisma ORM**, and **PostgreSQL**.

## 🚀 Tech Stack

- **Framework:** NestJS (TypeScript)
- **Database:** PostgreSQL
- **ORM:** Prisma 6.x
- **Authentication:** JWT (Access + Refresh Token)
- **Validation:** class-validator & class-transformer

## 👥 User Roles

| Role | Description |
|---|---|
| **User** | Browse, cart, wishlist, orders, reviews |
| **Seller** | Manage products, variants, specifications |
| **Admin** | Manage categories, attributes, shipments |
| **Super Admin** | Full access including destructive operations |

## 📦 Modules

| Module | APIs | Description |
|---|---|---|
| Auth | 4 | Register, Login, Refresh, Logout |
| User | 9 | Profile, Password, Addresses |
| Seller | 8 | Seller auth, Products, Orders |
| Admin | 5 | Admin auth, Profile |
| Category | 8 | Tree structure, Attribute assignment |
| Specification | 9 | Groups, Attributes, DataTypes |
| Product | 12 | CRUD, Variants, Images, Specifications |
| Cart | 5 | Add, Update, Remove, Clear |
| Wishlist | 7 | CRUD, Move to Cart |
| Order | 7 | Checkout, Buy Now, Cancel, Return, Track |
| Wallet | 4 | Balance, Transactions, Add Money |
| Shipment | 5 | Create, Track, Status Updates |
| Review | 5 | CRUD, Verified Purchase, Rating Summary |
| **Total** | **93** | |

## ✨ Key Features

- 🔐 Separate JWT auth for User, Seller and Admin
- 🌳 Nested category tree with attribute inheritance
- 📦 Product specifications per category (Admin defined, Seller filled)
- 🛒 Cart with stock validation and quantity management
- 💳 Multi payment support — COD, Wallet, UPI, Card
- 🔄 Order lifecycle — Place, Pack, Ship, Deliver, Cancel, Return
- 📍 Shipment tracking with event history
- ⭐ Review system with verified purchase badge and rating summary
- 💰 Wallet with transaction history and auto refund on cancel/return
- 🔁 Refresh token rotation for all three user types

## 🗂️ Project Structure
```
src/
├── auth/
├── user/
├── seller/
├── admin/
├── category/
├── specification/
├── product/
├── cart/
├── wishlist/
├── order/
├── wallet/
├── shipment/
├── review/
└── prisma/
```

## ⚙️ Environment Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

SELLER_JWT_ACCESS_SECRET=your_seller_access_secret
SELLER_JWT_REFRESH_SECRET=your_seller_refresh_secret

ADMIN_JWT_ACCESS_SECRET=your_admin_access_secret
ADMIN_JWT_REFRESH_SECRET=your_admin_refresh_secret
```

## 🛠️ Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/ecommerce-backend.git

# Install dependencies
cd ecommerce-backend
npm install

# Setup environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

## 📝 API Documentation

Base URL: `http://localhost:3000`

| Auth Type | Header |
|---|---|
| User | `Authorization: Bearer <userAccessToken>` |
| Seller | `Authorization: Bearer <sellerAccessToken>` |
| Admin | `Authorization: Bearer <adminAccessToken>` |

## 📄 License

MIT License