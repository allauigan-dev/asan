# Asan

Asan is a web-based fleet management and live tracking dashboard. Built as a monorepo using React, Vite, and Turborepo, it seamlessly integrates with a Traccar server to provide real-time location data, route replay history, and comprehensive fleet monitoring.

## Features

- **Live Tracking Dashboard:** Monitor fleet vehicles in real-time on an interactive map.
- **Route Replay History:** View historical routes and trip data over specified timeframes.
- **Fleet Management:** Sidebar and tables for managing fleet information and device statuses.
- **Traccar Integration:** Connects seamlessly with Traccar servers via API and WebSockets.
- **Modern UI:** Built with Tailwind CSS and `shadcn/ui` components for a responsive and clean design.

## Project Structure

This project is a monorepo managed by [Turborepo](https://turbo.build/) and uses [pnpm](https://pnpm.io/) workspaces.

- `apps/web`: The main frontend application (React/Vite).
- `packages/ui`: Shared UI components utilizing Tailwind CSS and `shadcn/ui`.

## Getting Started

### Prerequisites

- Node.js (>= 20.0.0)
- [pnpm](https://pnpm.io/) (v9+)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/allauigan-dev/asan.git
   cd asan
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Environment Setup

Copy the example environment file to a local `.env` file at the root of the project to configure your Traccar server settings:

```bash
cp .env.example .env
```

Ensure you update the `.env` with your actual Traccar API details:

```env
API_URL=your_traccar_ip:8082
API_TOKEN=your_traccar_api_token
```

### Running the App

Start the development server across all packages:

```bash
pnpm dev
```

You can now open your browser and navigate to the local development server (typically `http://localhost:5173`).

### Available Scripts

- `pnpm dev` - Start the development server.
- `pnpm build` - Build the application for production.
- `pnpm lint` - Run ESLint across the monorepo.
- `pnpm format` - Run Prettier to format the codebase.
- `pnpm typecheck` - Run TypeScript type checking.

## UI Components (shadcn/ui)

This monorepo uses shared UI components in the `packages/ui` directory. To add a new component from `shadcn/ui`, run the following command at the root of the project:

```bash
pnpm dlx shadcn@latest add [component-name] -c apps/web
```

This will automatically place the UI components in the `packages/ui/src/components` directory.

To use the components in your application, import them from the `@workspace/ui` package:

```tsx
import { Button } from "@workspace/ui/components/button"
```
