# ProjectHub Frontend

A modern, minimalist web application for Final Year Project (FYP) management built with Next.js 14 and a clean black-and-white design system.

## 🚀 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom black-and-white theme
- **State Management**:
  - Zustand (client state)
  - TanStack Query (server state)
- **UI Components**: Headless UI
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **Icons**: Lucide React & Heroicons
- **Development**: ESLint, Prettier, TypeScript strict mode

## 🎨 Design System

The application follows a brutalist black-and-white design philosophy:

- **Colors**: Pure black (#000000) and white (#ffffff) with grayscale variants
- **Typography**: Inter font family with clear hierarchy
- **Borders**: Sharp edges with minimal border radius (0-4px)
- **Shadows**: Brutal box shadows for emphasis
- **Spacing**: 4px grid system for consistent layouts

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard routes
│   └── api/               # API routes
├── components/
│   ├── ui/                # Base UI components
│   ├── layout/            # Layout components
│   ├── features/          # Feature-specific components
│   └── providers/         # Context providers
├── lib/                   # Utilities and configurations
├── hooks/                 # Custom React hooks
├── stores/                # Zustand stores
├── types/                 # TypeScript type definitions
└── utils/                 # Helper functions
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:

   ```bash
   cp .env.example .env.local
   ```

   Update the values in `.env.local` as needed.

3. **Start development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

## 🏗️ Architecture

### State Management

- **Zustand**: Lightweight state management for client-side state
- **TanStack Query**: Server state management with caching, background updates, and error handling

### API Integration

- **Axios**: HTTP client with interceptors for authentication and error handling
- **Type Safety**: Full TypeScript integration with API responses

### Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Custom Theme**: Black-and-white brutalist design system
- **Responsive**: Mobile-first responsive design

## 🎯 Features

- **Authentication**: JWT-based authentication with role-based access
- **Project Discovery**: Search and filter FYP projects
- **AI Assistant**: Chat interface for project guidance
- **Bookmarks**: Save and organize favorite projects
- **Milestones**: Track project progress and deadlines
- **Responsive Design**: Works on desktop and mobile devices
- **Accessibility**: WCAG 2.1 AA compliant

## 🔧 Configuration

### Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

### Tailwind Configuration

The project uses a custom Tailwind configuration with:

- Black and white color palette
- Custom spacing based on 4px grid
- Brutal box shadows
- Minimal border radius
- Inter font family

## 📝 Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Use meaningful component and variable names
- Write JSDoc comments for complex functions

### Component Structure

- Keep components small and focused
- Use composition over inheritance
- Implement proper TypeScript interfaces
- Follow the established design system

### State Management

- Use Zustand for client state
- Use TanStack Query for server state
- Keep state as close to where it's used as possible
- Implement proper error handling

## 🚀 Deployment

The application is configured for deployment on Vercel, Netlify, or any platform that supports Next.js.

### Build

```bash
npm run build
```

### Production

```bash
npm run start
```

## 📚 Documentation

For comprehensive documentation, see the [docs](./docs/) directory:

- **[Component Documentation](./docs/COMPONENT_DOCUMENTATION.md)** - Complete UI component guide
- **[API Integration](./docs/API_INTEGRATION.md)** - API integration patterns and examples
- **[User Guide](./docs/USER_GUIDE.md)** - Complete user manual for all roles
- **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)** - Deployment instructions for all platforms

## 🔍 Monitoring and Health

### Health Check Endpoints

- **Application Health**: `GET /api/health` - Returns application health status
- **Metrics**: `GET /api/metrics` - Returns performance and usage metrics
- **Analytics**: `POST /api/analytics` - Tracks user interactions and events

### Performance Monitoring

The application includes comprehensive monitoring:

- **Core Web Vitals**: Automatic tracking of performance metrics
- **Error Tracking**: Client-side error reporting and analytics
- **User Analytics**: Behavior tracking and usage patterns
- **Real-time Metrics**: Live performance and health monitoring

## 🚀 Deployment

### Quick Deploy

**Vercel (Recommended)**:
```bash
npm install -g vercel
vercel --prod
```

**Netlify**:
```bash
npm run build
# Deploy the `out/` directory
```

**Docker**:
```bash
docker build -t projecthub-frontend .
docker run -p 3000:3000 projecthub-frontend
```

For detailed deployment instructions, see the [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md).

## 📄 License

This project is part of the ProjectHub system for Final Year Project management.
