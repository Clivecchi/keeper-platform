# Keeper Platform Frontend

A modern React-based frontend for the Keeper Platform, built with TypeScript, Vite, and Tailwind CSS.

## 🎨 Features

- **Modern UI/UX**
  - Responsive design
  - Dark/Light theme support
  - System theme synchronization
  - Smooth animations with Framer Motion

- **Authentication**
  - Secure login/register flows
  - Protected routes
  - Session management
  - Persistent authentication state

- **User Experience**
  - Real-time feedback
  - Loading states
  - Error handling
  - Form validation

## 🛠 Tech Stack

- **Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS 4
- **UI Components:** Shadcn UI + Radix UI
- **State Management:** React Context
- **Routing:** React Router 7
- **Animations:** Framer Motion
- **Icons:** Lucide React

## 📦 Prerequisites

- Node.js 18+
- pnpm 8+

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd keeper-platform/frontend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL="http://localhost:3001"
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

3. **Preview production build**
   ```bash
   pnpm preview
   ```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/   # Reusable UI components
│   ├── context/      # React Context providers
│   ├── hooks/        # Custom React hooks
│   ├── kam/          # Core business logic
│   │   ├── auth/     # Authentication logic
│   │   └── settings/ # User settings logic
│   ├── layouts/      # Page layouts
│   ├── lib/          # Utility functions
│   ├── pages/        # Route components
│   ├── App.tsx       # Root component
│   └── main.tsx      # Entry point
├── public/          # Static assets
├── dist/           # Production build
└── package.json    # Project configuration
```

## 🎯 Key Components

### Authentication
- `AuthContext` - Manages authentication state
- `LoginPage` - User login interface
- `RegisterPage` - User registration interface

### Layout
- `AppLayout` - Main application layout
- `RootKeeperPage` - Dashboard layout

### Settings
- `useUserSettings` - Hook for managing user preferences
- Theme synchronization with system preferences

## 🎨 Styling

The project uses Tailwind CSS with a custom configuration:
- Custom color scheme
- Responsive breakpoints
- Animation utilities
- Dark mode support

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## 🚢 Deployment

The frontend is configured for deployment on Vercel.

### Vercel Deployment
1. Connect your Vercel account
2. Import your repository
3. Configure environment variables
4. Deploy

## 🔒 Security

- Environment variables for sensitive data
- CORS configuration
- Secure authentication flow
- Protected routes

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📝 License

[Your License]

## 👥 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 🐛 Known Issues

- None currently reported

## 🔮 Future Improvements

- [ ] Add unit tests
- [ ] Implement E2E testing
- [ ] Add performance monitoring
- [ ] Enhance accessibility
- [ ] Add PWA support 