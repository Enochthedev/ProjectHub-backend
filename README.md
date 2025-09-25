# FYP Platform Backend

Authentication and User Management service for the Final Year Project Selection & Guidance Platform.

## Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:

\`\`\`bash
npm install
\`\`\`

2. Copy environment variables:

\`\`\`bash
cp .env.example .env
\`\`\`

3. Update the `.env` file with your database credentials and other configuration values.

4. Start the development server:

\`\`\`bash
npm run start:dev
\`\`\`

The server will start on `http://localhost:3001` by default.

### Environment Variables

| Variable                 | Description              | Default               |
| ------------------------ | ------------------------ | --------------------- |
| `DATABASE_HOST`          | PostgreSQL host          | localhost             |
| `DATABASE_PORT`          | PostgreSQL port          | 5432                  |
| `DATABASE_USERNAME`      | Database username        | postgres              |
| `DATABASE_PASSWORD`      | Database password        | password              |
| `DATABASE_NAME`          | Database name            | fyp_platform          |
| `JWT_SECRET`             | JWT signing secret       | -                     |
| `JWT_EXPIRES_IN`         | Access token expiration  | 15m                   |
| `JWT_REFRESH_SECRET`     | Refresh token secret     | -                     |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | 7d                    |
| `PORT`                   | Server port              | 3001                  |
| `NODE_ENV`               | Environment              | development           |
| `FRONTEND_URL`           | Frontend URL for CORS    | http://localhost:3000 |

### Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build the application
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Database Migrations

- `npm run migration:generate -- src/migrations/MigrationName` - Generate a new migration
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert the last migration

## API Documentation

Once the server is running, API documentation will be available at:

- Swagger UI: `http://localhost:3001/api/docs` (to be implemented)

## Health Check

Check if the service is running:

\`\`\`bash
curl http://localhost:3001/health
\`\`\`

## Project Structure

\`\`\`
src/
├── auth/           # Authentication module
├── users/          # User management module
├── common/         # Shared utilities, guards, decorators
├── config/         # Configuration files
├── entities/       # Database entities
├── dto/           # Data Transfer Objects
└── migrations/    # Database migrations
\`\`\`
