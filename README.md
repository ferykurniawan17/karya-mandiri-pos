# POS Karya Mandiri

Aplikasi POS Desktop untuk usaha bahan bangunan.

## Tech Stack

- Next.js 14+ (App Router)
- Electron
- SQLite + Prisma ORM
- TypeScript
- Tailwind CSS
- Yarn

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Setup database:
```bash
yarn db:push
```

3. Initialize database with default users:
```bash
yarn db:init
```

4. (Optional) Create database template for production:
```bash
yarn db:template
```
This creates a template database that will be bundled with the .exe installer.

Default users:
- Admin: username `admin`, password `admin123`
- Cashier: username `cashier`, password `cashier123`

**⚠️ PENTING: Ganti password default setelah pertama kali login!**

4. Run development:
```bash
yarn electron:dev
```

5. Build for production (Windows):
```bash
yarn electron:build
```

Installer akan tersedia di folder `dist/`

## Features

- ✅ Login & User Management (Multiple users dengan role admin/cashier)
- ✅ Category Management (CRUD kategori dengan search & filter)
- ✅ Product Management (CRUD produk lengkap dengan photo upload)
  - Nama, SKU, Stock, Minimal Stock
  - Satuan (pcs, kg, m, m², m³, pack, box)
  - Harga Beli & Harga Jual
  - Photo upload
  - Penempatan barang
  - Stock alerts (peringatan stok rendah)
- ✅ Point of Sale (POS) Interface
  - Product selection dengan search & filter
  - Cart management
  - Checkout dengan perhitungan kembalian
  - Receipt printing
- ✅ Transaction History (Riwayat transaksi lengkap)
- ✅ Daily Sync to Cloud Server (Manual & otomatis)

## Database

Database SQLite disimpan di:
- Development: `prisma/pos.db`
- Production: User data directory (persistent)

## Sync Configuration

Untuk mengaktifkan sync ke cloud server, set environment variables:
- `NEXT_PUBLIC_SYNC_URL`: URL cloud server
- `SYNC_API_KEY`: API key untuk autentikasi (opsional)

## Development

- Next.js dev server: `http://localhost:3000`
- Prisma Studio: `yarn db:studio`

## Production Build

Aplikasi akan di-build sebagai Windows installer (.exe) menggunakan Electron Builder.
File installer akan tersedia di folder `dist/` setelah build selesai.

