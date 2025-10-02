# ProjectHub Design System

A minimalist black-and-white design system built with Tailwind CSS for the ProjectHub frontend application.

## Design Principles

- **Monochromatic**: Uses only black (#000000), white (#ffffff), and grayscale colors
- **Brutal Aesthetics**: Sharp edges, minimal rounded corners (0-4px max)
- **High Contrast**: 2px solid borders with strong visual hierarchy
- **Functional**: Prioritizes usability over decorative elements
- **Consistent**: 4px grid system for spacing and sizing

## Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
import { Button } from '@/components/ui';

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button loading>Loading...</Button>
<Button disabled>Disabled</Button>
<Button fullWidth>Full Width</Button>
```

### Input

A clean input component with label and error state support.

```tsx
import { Input } from '@/components/ui';

<Input 
  label="Username"
  placeholder="Enter username"
  error="This field is required"
/>
```

### Card

A flexible card component with multiple variants and sub-components.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

<Card variant="elevated" clickable>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
  <CardFooter>
    Card footer actions
  </CardFooter>
</Card>
```

### Modal

A modal component with backdrop, keyboard navigation, and sub-components.

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';

<Modal 
  isOpen={isOpen} 
  onClose={handleClose}
  title="Modal Title"
  description="Modal description"
  size="lg"
>
  <ModalBody>
    Modal content
  </ModalBody>
  <ModalFooter>
    <Button onClick={handleClose}>Close</Button>
  </ModalFooter>
</Modal>
```

## Color System

```css
/* Primary Colors */
--black: #000000
--white: #ffffff

/* Grayscale Palette */
--gray-50: #fafafa
--gray-100: #f5f5f5
--gray-200: #e5e5e5
--gray-300: #d4d4d4
--gray-400: #a3a3a3
--gray-500: #737373
--gray-600: #525252
--gray-700: #404040
--gray-800: #262626
--gray-900: #171717
```

## Spacing System (4px Grid)

```css
--spacing-1: 0.25rem  /* 4px */
--spacing-2: 0.5rem   /* 8px */
--spacing-3: 0.75rem  /* 12px */
--spacing-4: 1rem     /* 16px */
--spacing-5: 1.25rem  /* 20px */
--spacing-6: 1.5rem   /* 24px */
--spacing-8: 2rem     /* 32px */
--spacing-10: 2.5rem  /* 40px */
--spacing-12: 3rem    /* 48px */
--spacing-16: 4rem    /* 64px */
```

## Shadows (Brutal Style)

```css
--shadow-brutal-sm: 2px 2px 0px 0px rgba(0,0,0,1)
--shadow-brutal: 4px 4px 0px 0px rgba(0,0,0,1)
--shadow-brutal-lg: 8px 8px 0px 0px rgba(0,0,0,1)
```

## Typography

- **Font Family**: Inter (sans-serif), JetBrains Mono (monospace)
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold)
- **Line Heights**: Optimized for readability

## Testing

All components include comprehensive unit tests covering:
- Rendering and basic functionality
- Props and variants
- Event handling
- Accessibility features
- Error states

Run tests with:
```bash
npm test
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:
- Proper ARIA labels and roles
- Keyboard navigation support
- High contrast ratios
- Screen reader compatibility
- Focus management