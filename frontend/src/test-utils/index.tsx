import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';

// Mock Next.js router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
};

// Mock user data
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  role: 'student' as const,
  isEmailVerified: true,
  isActive: true,
  profile: {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    studentId: 'S123456',
    specialization: 'Software Engineering',
    year: 3,
    interests: ['AI', 'Web Development'],
    skills: ['React', 'Node.js', 'Python'],
    profileUpdatedAt: '2024-01-01T00:00:00Z',
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock project data
export const mockProject = {
  id: '1',
  title: 'AI-Powered Chat Application',
  abstract: 'A modern chat application using AI for smart responses',
  specialization: 'Software Engineering',
  difficultyLevel: 'intermediate' as const,
  year: 2024,
  tags: ['AI', 'React', 'Node.js'],
  technologyStack: ['React', 'Node.js', 'OpenAI', 'WebSocket'],
  isGroupProject: false,
  approvalStatus: 'approved' as const,
  githubUrl: 'https://github.com/example/chat-app',
  supervisor: {
    id: '1',
    name: 'Dr. Smith',
    specializations: ['AI', 'Software Engineering'],
  },
  viewCount: 120,
  bookmarkCount: 15,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock conversation data
export const mockConversation = {
  id: '1',
  studentId: '1',
  title: 'Project Planning Discussion',
  status: 'active' as const,
  projectId: '1',
  language: 'en',
  messageCount: 3,
  messages: [
    {
      id: '1',
      conversationId: '1',
      type: 'user' as const,
      content: 'I need help with my project planning',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      status: 'read' as const,
      isBookmarked: false,
      averageRating: 0,
    },
    {
      id: '2',
      conversationId: '1',
      type: 'assistant' as const,
      content: 'I\'d be happy to help you with project planning! What specific aspect would you like to focus on?',
      timestamp: new Date('2024-01-01T10:00:30Z'),
      status: 'read' as const,
      confidenceScore: 0.92,
      sources: [
        { title: 'Project Planning Guide', url: 'https://example.com/guide' }
      ],
      suggestedFollowUps: [
        'How do I create a timeline?',
        'What tools should I use?'
      ],
      isBookmarked: false,
      averageRating: 4.5,
    }
  ],
  createdAt: '2024-01-01T10:00:00Z',
  lastMessageAt: '2024-01-01T10:00:30Z',
};

// Test wrapper with providers
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Custom render function
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test helpers
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

export const mockSessionStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// API mocking helpers
export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
};

export const mockApiError = (message: string, status = 500) => {
  return Promise.reject({
    response: {
      status,
      data: { message },
    },
  });
};

// Form testing helpers
export const fillForm = async (fields: Record<string, string>) => {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();
  
  for (const [name, value] of Object.entries(fields)) {
    const field = document.querySelector(`[name="${name}"]`) as HTMLInputElement;
    if (field) {
      await user.clear(field);
      await user.type(field, value);
    }
  }
};

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe } = await import('jest-axe');
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

// Performance testing helpers
export const measureRenderTime = (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

// Mock intersection observer
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
};

// Mock resize observer
export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
};