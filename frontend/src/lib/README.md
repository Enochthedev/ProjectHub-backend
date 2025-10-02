# API Client and Error Handling System

This directory contains the enhanced API client and comprehensive error handling system for the ProjectHub frontend application.

## Overview

The system provides:
- **Enhanced API Client**: Axios-based client with automatic token refresh, retry logic, and circuit breaker
- **Error Handler Service**: Centralized error handling with user-friendly messages and monitoring
- **Loading State Management**: Hooks for managing async operations and loading states
- **Toast Notifications**: Integrated notification system for user feedback
- **Error Boundaries**: React error boundaries for graceful error handling

## Components

### 1. API Client (`api.ts`)

Enhanced Axios client with the following features:

#### Features
- **Automatic Token Refresh**: Handles JWT token expiration automatically
- **Retry Logic**: Configurable retry for failed requests with exponential backoff
- **Circuit Breaker**: Prevents cascading failures by temporarily disabling requests after repeated failures
- **Error Mapping**: Converts HTTP status codes to user-friendly messages
- **Request/Response Interceptors**: Automatic token injection and error handling

#### Usage

```typescript
import { api } from '@/lib/api';

// Basic usage
const data = await api.get('/projects');
const newProject = await api.post('/projects', projectData);

// With retry disabled
const data = await api.get('/projects', { retry: false });

// Error handling
try {
  const data = await api.get('/projects');
} catch (error) {
  // Error has enhanced details
  console.log(error.message); // User-friendly message
  console.log(error.details); // API error details
}
```

#### Error Details Structure

```typescript
interface ApiErrorDetails {
  message: string;
  statusCode: number;
  isRetryable: boolean;
  shouldShowToast: boolean;
  shouldRedirect?: string;
}
```

### 2. Error Handler Service (`error-handler.ts`)

Centralized error handling service with monitoring and reporting capabilities.

#### Features
- **Error Classification**: Categorizes errors by type and severity
- **User-Friendly Messages**: Converts technical errors to readable messages
- **Error Reporting**: Logs errors for monitoring (integrates with external services)
- **Offline Support**: Queues errors when offline and sends when reconnected
- **Context Tracking**: Captures error context for debugging

#### Usage

```typescript
import { errorHandler, useErrorHandler } from '@/lib/error-handler';

// Direct usage
errorHandler.handleError(error, {
  component: 'ProjectList',
  action: 'fetchProjects',
});

// Hook usage
const { handleError, getUserFriendlyMessage } = useErrorHandler();

try {
  await someAsyncOperation();
} catch (error) {
  handleError(error, { component: 'MyComponent' });
  const message = getUserFriendlyMessage(error);
}
```

### 3. Loading State Hooks (`useLoadingState.ts`)

React hooks for managing loading states and async operations.

#### `useLoadingState`

```typescript
const { isLoading, error, data, execute, reset } = useLoadingState();

// Execute async operation
const result = await execute(async () => {
  return await api.get('/projects');
});
```

#### `useMultipleLoadingStates`

```typescript
const { execute, getState, isAnyLoading } = useMultipleLoadingStates();

// Handle multiple concurrent operations
await execute('projects', () => api.get('/projects'));
await execute('users', () => api.get('/users'));

const projectsState = getState('projects');
const isLoading = isAnyLoading();
```

#### `useAsyncOperation`

```typescript
const { isLoading, error, data, execute } = useAsyncOperation();

await execute(
  () => api.post('/projects', data),
  {
    onSuccess: (result) => console.log('Success:', result),
    onError: (error) => console.error('Failed:', error),
    showErrorToast: true,
  }
);
```

### 4. Error Provider (`ErrorProvider.tsx`)

React context provider that integrates error handling with the UI.

#### Features
- **Centralized Error Handling**: Single point for all error handling
- **Toast Integration**: Automatic toast notifications for errors
- **Redirect Handling**: Automatic redirects for authentication errors
- **Retry Support**: Built-in retry functionality for retryable errors

#### Usage

```typescript
// Wrap your app
<ErrorProvider>
  <YourApp />
</ErrorProvider>

// Use in components
const { handleError, handleApiError, handleAsyncError } = useErrorProvider();

// Handle different error types
handleError(new Error('General error'));
handleApiError(axiosError);
handleAsyncError(error, {
  showToast: true,
  showRetry: true,
  onRetry: () => retryOperation(),
});
```

### 5. Toast System (`Toast.tsx`)

Comprehensive toast notification system with multiple types and actions.

#### Features
- **Multiple Types**: Success, error, warning, info
- **Action Buttons**: Custom actions with callbacks
- **Auto-dismiss**: Configurable auto-dismiss timing
- **Queue Management**: Handles multiple toasts gracefully
- **Accessibility**: Full keyboard and screen reader support

#### Usage

```typescript
// Basic usage
const addSuccessToast = useSuccessToast();
const addErrorToast = useErrorToast();

addSuccessToast('Operation completed!');
addErrorToast('Something went wrong', 'Please try again');

// API error toast with retry
const addApiErrorToast = useApiErrorToast();
addApiErrorToast(error, {
  showRetry: true,
  onRetry: () => retryOperation(),
});
```

## Integration Example

Here's how all components work together:

```typescript
import React from 'react';
import { api } from '@/lib/api';
import { useErrorProvider } from '@/components/providers/ErrorProvider';
import { useLoadingState } from '@/hooks/useLoadingState';

const ProjectList: React.FC = () => {
  const { handleAsyncError } = useErrorProvider();
  const { isLoading, data, execute } = useLoadingState();

  const fetchProjects = async () => {
    try {
      await execute(async () => {
        return await api.get('/projects');
      });
    } catch (error) {
      handleAsyncError(error as Error, {
        showToast: true,
        showRetry: true,
        onRetry: fetchProjects,
        context: {
          component: 'ProjectList',
          action: 'fetchProjects',
        },
      });
    }
  };

  return (
    <div>
      {isLoading && <LoadingSpinner />}
      {data && <ProjectGrid projects={data} />}
      <Button onClick={fetchProjects}>Refresh</Button>
    </div>
  );
};
```

## Error Types and Handling

### Network Errors
- **Detection**: No response from server
- **Handling**: Show network error message, enable retry
- **User Action**: Retry button, check connection

### Authentication Errors (401)
- **Detection**: Unauthorized response
- **Handling**: Attempt token refresh, redirect to login if failed
- **User Action**: Automatic redirect to login

### Authorization Errors (403)
- **Detection**: Forbidden response
- **Handling**: Show permission error, no retry
- **User Action**: Contact administrator

### Validation Errors (400, 422)
- **Detection**: Bad request with validation details
- **Handling**: Show specific validation messages
- **User Action**: Fix input and retry

### Server Errors (500+)
- **Detection**: Server error responses
- **Handling**: Show generic server error, enable retry
- **User Action**: Retry button, report if persistent

### Rate Limiting (429)
- **Detection**: Too many requests response
- **Handling**: Show rate limit message, automatic retry with delay
- **User Action**: Wait and retry automatically

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
NEXT_PUBLIC_ERROR_REPORTING_URL=/api/errors
```

### API Client Configuration

```typescript
// Customize retry behavior
const customApi = {
  ...api,
  get: (url: string) => api.get(url, { 
    retry: true,
    timeout: 15000 
  })
};
```

### Error Handler Configuration

```typescript
// Custom error mapping
const customErrorHandler = new ErrorHandlerService();
customErrorHandler.handleError(error, {
  component: 'CustomComponent',
  severity: 'high',
  category: 'business-logic',
});
```

## Testing

The system includes comprehensive tests for all components:

- **API Client Tests**: Mock axios, test retry logic, circuit breaker
- **Error Handler Tests**: Error classification, message mapping
- **Loading State Tests**: Async operations, timeout handling
- **Toast Tests**: Notification display, auto-dismiss, actions
- **Integration Tests**: End-to-end error handling flows

Run tests:
```bash
npm test -- --testPathPatterns="api.test.ts|error-handler.test.ts"
```

## Monitoring and Debugging

### Development Mode
- Detailed error logs in console
- Error context and stack traces
- Performance metrics

### Production Mode
- Error reporting to monitoring service
- User-friendly error messages only
- Aggregated error metrics

### Error Context
Every error includes:
- Component name and action
- User ID (if authenticated)
- Timestamp and user agent
- Current URL and navigation state
- Error severity and category

## Best Practices

1. **Always use the error provider** for consistent error handling
2. **Provide context** when handling errors for better debugging
3. **Use appropriate error types** (network, validation, server, etc.)
4. **Test error scenarios** in your components
5. **Monitor error rates** in production
6. **Provide clear user actions** for recoverable errors
7. **Use loading states** for better user experience
8. **Handle offline scenarios** gracefully

## Future Enhancements

- **Error Analytics Dashboard**: Visual error tracking and trends
- **Smart Retry Logic**: ML-based retry decisions
- **Error Recovery Suggestions**: Context-aware recovery actions
- **Performance Monitoring**: Request timing and optimization
- **A/B Testing**: Error message effectiveness testing