# FortiAnswer - AI Security Chatbot Frontend

A modern React-based frontend application for an AI-powered security chatbot that helps users with security-related questions and issues.

## Features

- **AI Chat Assistant**: Interactive chat interface with request type selection (Phishing, Suspicious Login, VPN, MFA, Endpoint Alert)
- **FAQ Management**: Create, update, delete, publish, and suspend FAQs
- **Policy Management**: Manage security policies with full CRUD operations
- **Admin Panel**: Configure user profile, theme settings, and feature flags
- **Support Tickets**: Create tickets and escalate issues to human agents
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Dark Mode Support**: Built-in dark mode with theme persistence

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router v6** - Routing
- **React Hooks** - State management

## Project Structure

```
src/
├── components/
│   ├── chat/          # Chat-related components
│   ├── common/        # Shared components (Header, Footer, etc.)
│   └── admin/         # Admin-specific components
├── pages/             # Page components
├── hooks/             # Custom React hooks
├── services/          # API service layer
├── types/             # TypeScript type definitions
└── utils/             # Utility functions and constants
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Pages

- `/` - Landing page
- `/chat` - Chat interface with request type selection
- `/faq` - FAQ management
- `/policy` - Security policy management
- `/admin` - Admin settings and configuration
- `/create-ticket` - Create support ticket
- `/contact-support` - Contact support form
- `/escalate` - Escalate issue to human agents

## API Integration

The application includes a mock API service layer in `src/services/api.ts`. To connect to a real backend:

1. Update `API_BASE_URL` in `src/utils/constants.ts`
2. Replace mock implementations in `src/services/api.ts` with actual API calls
3. Update environment variables as needed

## Environment Variables

Create a `.env` file in the root directory:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

## Features in Detail

### Chat Interface
- Request type selection (5 types: Phishing, Suspicious Login, VPN, MFA, Endpoint Alert)
- Real-time message display with status indicators
- Citation rendering with source links
- Suggested prompts based on request type
- Feedback system (thumbs up/down + "Solved?" checkbox)

### FAQ & Policy Management
- Full CRUD operations
- Publish/Suspend functionality
- Category organization
- Rich text support

### Admin Panel
- User profile configuration
- Theme selection (Light/Dark/Auto)
- Feature flags for enabling/disabling features
- Settings persistence in localStorage

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
