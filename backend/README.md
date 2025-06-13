# Keeper Platform Backend

A robust Express.js backend service for the Keeper Platform, built with TypeScript and Prisma.

## 🚀 Features

- **Authentication System**
  - User registration and login
  - JWT-based session management
  - Secure password hashing with bcrypt

- **User Settings Management**
  - Theme preferences
  - System theme synchronization
  - User-specific configurations

- **API Security**
  - CORS protection
  - Request logging
  - Input validation

## 🛠 Tech Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma)
- **Authentication:** JWT + bcrypt
- **API Documentation:** OpenAPI/Swagger (planned)

## 📦 Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL database

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd keeper-platform/backend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/keeper"
   JWT_SECRET="your-secret-key"
   PORT=3001
   ```

4. **Database Setup**
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

## 🏃‍♂️ Development

1. **Start development server**
   ```bash
   pnpm dev
   ```

2. **Build for production**
   ```bash
   pnpm build
   ```

3. **Start production server**
   ```bash
   pnpm start
   ```

## 📁 Project Structure

```
backend/
├── src/
│   ├── api/          # API route handlers
│   │   └── kam/      # KAM-specific endpoints
│   │   ├── auth/     # Authentication logic
│   │   └── settings/ # User settings logic
│   ├── middleware/   # Express middleware
│   └── index.ts      # Application entry point
├── prisma/           # Database schema and migrations
├── dist/            # Compiled JavaScript
└── package.json     # Project configuration
```

## 🔐 API Endpoints

### Authentication
- `POST /api/kam/auth/register` - User registration
- `POST /api/kam/auth/login` - User login
- `GET /api/kam/auth/session` - Session validation

### Settings
- `GET /api/kam/settings` - Get user settings
- `PATCH /api/kam/settings` - Update user settings

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## 🚢 Deployment

The backend is configured for deployment on Railway. The `railway.toml` file contains the necessary configuration.

### Railway Deployment
1. Connect your Railway account
2. Link your repository
3. Set environment variables
4. Deploy

## 🔍 Health Checks

- `GET /api/test` - Basic health check endpoint
- `GET /debug/index-code` - Debug endpoint for deployed code inspection

## 🔒 Security

- CORS is configured to allow specific origins:
  - `https://v0-keeper.vercel.app`
  - `http://localhost:5173`
  - `http://livecchi.biz`

## 📝 License

[Your License]

## 👥 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 