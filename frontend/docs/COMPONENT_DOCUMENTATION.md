# Component Documentation

This document provides comprehensive documentation for all components in the ProjectHub frontend application.

## Table of Contents

- [Design System Components](#design-system-components)
- [Layout Components](#layout-components)
- [Feature Components](#feature-components)
- [Usage Guidelines](#usage-guidelines)
- [Component Props Reference](#component-props-reference)

## Design System Components

### Button Component

**Location**: `src/components/ui/Button.tsx`

A versatile button component following the black-and-white design system.

#### Props

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}
```

#### Usage Examples

```tsx
// Primary button
<Button variant="primary" size="md" onClick={handleClick}>
  Save Changes
</Button>

// Loading state
<Button variant="primary" loading>
  Saving...
</Button>

// Full width button
<Button variant="secondary" fullWidth>
  Cancel
</Button>
```

#### Design Specifications

- **Primary**: Black background, white text, 2px black border
- **Secondary**: White background, black text, 2px black border
- **Ghost**: Transparent background, black text, 2px transparent border
- **Hover**: Inverts colors (black ↔ white)
- **Focus**: 2px gray-400 ring
- **Disabled**: Gray-300 background, gray-500 text
- **Sharp corners**: border-radius: 0
- **Bold typography**: font-weight: 500

### Input Component

**Location**: `src/components/ui/Input.tsx`

Form input component with validation support.

#### Props

```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'search' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}
```

#### Usage Examples

```tsx
// Basic input
<Input
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={setEmail}
/>

// Input with error
<Input
  type="password"
  placeholder="Password"
  value={password}
  onChange={setPassword}
  error="Password must be at least 8 characters"
/>
```

#### Design Specifications

- **Default**: White background, 2px gray-300 border
- **Focus**: 2px black border
- **Error**: 2px black border, gray-50 background
- **Sharp corners**: border-radius: 0
- **Placeholder**: gray-400 text
- **Error message**: Black text with alert icon

### Card Component

**Location**: `src/components/ui/Card.tsx`

Container component for grouping related content.

#### Props

```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}
```

#### Usage Examples

```tsx
// Basic card
<Card variant="default" padding="md">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>

// Clickable card with elevation
<Card variant="elevated" clickable onClick={handleCardClick}>
  <ProjectInfo project={project} />
</Card>
```

#### Design Specifications

- **Default**: White background, 2px gray-200 border
- **Elevated**: White background, 2px black border, brutal shadow
- **Outlined**: White background, 2px black border
- **Hover**: Border color changes to gray-400
- **Sharp corners**: border-radius: 0
- **Clickable**: Cursor pointer, hover background gray-50

### Modal Component

**Location**: `src/components/ui/Modal.tsx`

Overlay component for displaying content above the main interface.

#### Props

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}
```

#### Usage Examples

```tsx
// Basic modal
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to delete this project?</p>
  <div className="flex gap-4 mt-6">
    <Button variant="danger" onClick={handleDelete}>Delete</Button>
    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
  </div>
</Modal>
```

## Layout Components

### Header Component

**Location**: `src/components/layout/Header.tsx`

Main navigation header with search and user menu.

#### Features

- Logo and branding
- Global search with Cmd+K shortcut
- User avatar and dropdown menu
- Mobile hamburger menu toggle
- Role-based navigation items

#### Usage

```tsx
<Header
  user={currentUser}
  onLogout={handleLogout}
  onSearch={handleGlobalSearch}
/>
```

### Sidebar Component

**Location**: `src/components/layout/Sidebar.tsx`

Role-based navigation sidebar.

#### Features

- Role-specific navigation items
- Active route highlighting
- Collapsible design
- Mobile overlay mode
- Keyboard navigation support

#### Usage

```tsx
<Sidebar
  user={currentUser}
  currentPath={pathname}
  collapsed={isSidebarCollapsed}
  onToggle={toggleSidebar}
/>
```

### Layout Component

**Location**: `src/components/layout/Layout.tsx`

Main layout wrapper combining header, sidebar, and content area.

#### Usage

```tsx
<Layout>
  <YourPageContent />
</Layout>
```

## Feature Components

### AI Assistant Components

#### ChatInterface

**Location**: `src/components/features/ai/ChatInterface.tsx`

Main chat interface for AI assistant interactions.

##### Features

- Real-time message display
- Typing indicators
- Message history with infinite scroll
- Message bookmarking and rating
- Confidence score display
- Source attribution
- Suggested follow-up questions

##### Usage

```tsx
<ChatInterface
  conversationId={activeConversationId}
  onSendMessage={handleSendMessage}
  messages={messages}
  isAITyping={isTyping}
  onBookmark={handleBookmarkMessage}
  onRate={handleRateMessage}
/>
```

#### TypingIndicator

**Location**: `src/components/features/ai/TypingIndicator.tsx`

Animated typing indicator for AI responses.

##### Usage

```tsx
<TypingIndicator
  avatar={aiAvatar}
  text="AI is thinking..."
  animated={true}
/>
```

### Project Components

#### ProjectCard

**Location**: `src/components/features/projects/ProjectCard.tsx`

Display component for project information.

##### Features

- Project title, abstract, and metadata
- Bookmark toggle functionality
- Technology stack badges
- Difficulty level indicator
- Supervisor information
- View count and statistics

##### Usage

```tsx
<ProjectCard
  project={project}
  bookmarked={isBookmarked}
  onBookmark={handleBookmark}
  onView={handleViewProject}
  variant="detailed"
/>
```

#### ProjectSearch

**Location**: `src/components/features/projects/ProjectSearch.tsx`

Advanced search interface for project discovery.

##### Features

- Real-time search with debouncing
- Advanced filter sidebar
- Sort controls
- Pagination
- Search result highlighting
- Filter persistence

##### Usage

```tsx
<ProjectSearch
  onSearch={handleSearch}
  filters={searchFilters}
  loading={isSearching}
  results={searchResults}
/>
```

### Milestone Components

#### MilestoneCard

**Location**: `src/components/features/milestones/MilestoneCard.tsx`

Display and management component for project milestones.

##### Features

- Status indicators
- Progress tracking
- Due date warnings
- Priority levels
- Action buttons for status updates

##### Usage

```tsx
<MilestoneCard
  milestone={milestone}
  onStatusUpdate={handleStatusUpdate}
  onEdit={handleEditMilestone}
  compact={false}
/>
```

### Bookmark Components

#### BookmarkGrid

**Location**: `src/components/features/bookmarks/BookmarkGrid.tsx`

Grid display for bookmarked projects and content.

##### Features

- Category filtering
- Grid/list view toggle
- Bulk operations
- Search within bookmarks
- Category management

##### Usage

```tsx
<BookmarkGrid
  bookmarks={userBookmarks}
  categories={bookmarkCategories}
  onCategoryFilter={handleCategoryFilter}
  onRemoveBookmark={handleRemoveBookmark}
/>
```

## Usage Guidelines

### Component Composition

Components are designed to be composable and reusable:

```tsx
// Good: Composing components
<Card variant="elevated" padding="md">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold">Project Title</h3>
    <Button variant="ghost" size="sm" onClick={handleBookmark}>
      <BookmarkIcon />
    </Button>
  </div>
  <p className="text-gray-600 mb-4">Project description...</p>
  <div className="flex gap-2">
    <Button variant="primary" size="sm">View Details</Button>
    <Button variant="secondary" size="sm">Apply</Button>
  </div>
</Card>
```

### Styling Guidelines

- Use Tailwind utility classes for styling
- Follow the black-and-white design system
- Maintain consistent spacing using the 4px grid
- Use sharp corners (border-radius: 0 or max 4px)
- Implement proper hover and focus states

### Accessibility

All components follow WCAG 2.1 AA guidelines:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast ratios
- Focus management

### Performance

- Components use React.memo for optimization where appropriate
- Large lists implement virtual scrolling
- Images use Next.js Image component for optimization
- Lazy loading for non-critical components

## Component Props Reference

### Common Props

Most components accept these common props:

```typescript
interface CommonProps {
  className?: string;        // Additional CSS classes
  children?: React.ReactNode; // Child components
  id?: string;              // HTML id attribute
  'data-testid'?: string;   // Testing identifier
}
```

### Event Handler Props

Standard event handlers used across components:

```typescript
interface EventHandlers {
  onClick?: (event: React.MouseEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onChange?: (value: any) => void;
}
```

### Loading and Error States

Components that handle async operations:

```typescript
interface AsyncProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}
```

## Testing Components

### Unit Testing

Components are tested using Jest and React Testing Library:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing

Feature components are tested with Playwright for end-to-end scenarios:

```typescript
import { test, expect } from '@playwright/test';

test('project search functionality', async ({ page }) => {
  await page.goto('/projects');
  
  // Test search input
  await page.fill('[data-testid="search-input"]', 'machine learning');
  await page.press('[data-testid="search-input"]', 'Enter');
  
  // Verify results
  await expect(page.locator('[data-testid="project-card"]')).toHaveCount(5);
});
```

## Contributing

When creating new components:

1. Follow the established naming conventions
2. Implement proper TypeScript interfaces
3. Add comprehensive JSDoc comments
4. Include unit tests
5. Follow the design system guidelines
6. Ensure accessibility compliance
7. Update this documentation

For more information, see the [Development Guidelines](../README.md#development-guidelines).