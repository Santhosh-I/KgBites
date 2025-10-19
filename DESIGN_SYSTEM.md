# KgBites Design System & Brand Guidelines

## 🎨 Brand Identity

### Brand Colors
- **Primary Gold**: `#F7AF08` - The signature KgBites color representing warmth, appetite, and premium quality
- **Secondary Orange**: `#e67e22` - Complementary energy and enthusiasm 
- **Tertiary Orange**: `#f39c12` - Light accent for highlights and CTAs

### Brand Personality
- **Warm & Welcoming** - Like a friendly campus canteen
- **Modern & Tech-Forward** - Digital-first experience
- **Reliable & Efficient** - Fast, accurate service
- **Student-Centric** - Designed for campus life

## 🎯 Design Principles

### 1. **Clarity First**
- Information hierarchy should be obvious
- Actions should be predictable
- Feedback should be immediate

### 2. **Touch-Friendly**
- Minimum 44px touch targets
- Generous spacing between interactive elements
- Optimized for mobile-first usage

### 3. **Accessible by Default**
- High contrast ratios (4.5:1 minimum)
- Keyboard navigation support
- Screen reader compatibility
- Reduced motion preferences

### 4. **Performance Focused**
- Fast loading animations
- Optimized images
- Minimal cognitive load

## 🎨 Color System

### Primary Palette
```css
--brand-primary: #F7AF08;     /* KgBites Gold */
--brand-secondary: #e67e22;   /* Energetic Orange */
--brand-tertiary: #f39c12;    /* Light Orange */
```

### Semantic Colors
```css
--success-color: #1BB76E;     /* Fresh Green */
--error-color: #e74c3c;       /* Alert Red */
--warning-color: #f39c12;     /* Caution Orange */
--info-color: #3498db;        /* Info Blue */
```

### Neutral Scale
```css
/* Light Theme */
--neutral-50: #fafafa;        /* Lightest background */
--neutral-900: #212121;       /* Darkest text */

/* Dark Theme */
--dark-50: #fafafa;           /* Light text */
--dark-900: #171717;          /* Dark background */
```

## 📝 Typography

### Font Stack
```css
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
```

### Type Scale
```css
--text-xs: 0.75rem;      /* 12px - Small labels */
--text-sm: 0.875rem;     /* 14px - Body text */
--text-base: 1rem;       /* 16px - Default */
--text-lg: 1.125rem;     /* 18px - Emphasized */
--text-xl: 1.25rem;      /* 20px - Subheadings */
--text-2xl: 1.5rem;      /* 24px - Headings */
--text-3xl: 1.875rem;    /* 30px - Large headings */
--text-4xl: 2.25rem;     /* 36px - Display */
```

### Font Weights
```css
--font-weight-normal: 400;    /* Body text */
--font-weight-medium: 500;    /* Emphasis */
--font-weight-semibold: 600;  /* Buttons, labels */
--font-weight-bold: 700;      /* Headings */
```

## 🏗️ Layout System

### Spacing Scale
```css
--space-1: 0.25rem;      /* 4px - Tight spacing */
--space-2: 0.5rem;       /* 8px - Small gaps */
--space-3: 0.75rem;      /* 12px - Default gaps */
--space-4: 1rem;         /* 16px - Section spacing */
--space-6: 1.5rem;       /* 24px - Large spacing */
--space-8: 2rem;         /* 32px - Section margins */
--space-12: 3rem;        /* 48px - Large margins */
```

### Border Radius
```css
--radius-sm: 0.25rem;    /* 4px - Small elements */
--radius-base: 0.375rem; /* 6px - Default */
--radius-lg: 0.75rem;    /* 12px - Cards */
--radius-xl: 1rem;       /* 16px - Buttons */
--radius-2xl: 1.25rem;   /* 20px - Large cards */
--radius-full: 9999px;   /* Fully rounded */
```

### Shadows
```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);      /* Subtle elevation */
--shadow-base: 0 4px 6px rgba(0, 0, 0, 0.07);   /* Default cards */
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.15);    /* Elevated elements */
--shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.18);   /* Floating elements */
```

## 🧩 Component Guidelines

### Buttons
- **Primary**: Main actions (Add to Cart, Checkout, Submit)
- **Secondary**: Supporting actions (Cancel, Edit, View)
- **Success**: Positive confirmations (Complete Order, Confirm)
- **Error**: Destructive actions (Delete, Remove)

### Cards
- **Default**: Standard content containers
- **Brand**: Featured content with brand accent
- **Glass**: Overlay content with backdrop blur
- **Elevated**: Important standalone content

### Icons
- **Emoji-based**: Food service context (🍽️, 💰, 🏪)
- **Consistent sizing**: xs(12px) to 3xl(48px)
- **Semantic colors**: Brand, success, error, warning, info

## 🎭 Animation Guidelines

### Timing
```css
--transition-fast: 150ms ease;    /* Micro-interactions */
--transition-base: 250ms ease;    /* Default */
--transition-slow: 350ms ease;    /* Complex animations */
```

### Easing
```css
--ease-out: cubic-bezier(0, 0, 0.2, 1);        /* Natural deceleration */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);   /* Smooth transitions */
--ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Playful bounce */
```

### Animation Principles
- **Subtle**: Enhance, don't distract
- **Purposeful**: Guide user attention
- **Responsive**: React to user actions
- **Respectful**: Honor reduced motion preferences

## 📱 Responsive Design

### Breakpoints
```css
--breakpoint-sm: 480px;    /* Small phones */
--breakpoint-md: 768px;    /* Tablets */
--breakpoint-lg: 1024px;   /* Small laptops */
--breakpoint-xl: 1280px;   /* Desktops */
```

### Mobile-First Strategy
1. Design for mobile screens first
2. Progressive enhancement for larger screens
3. Touch-friendly interactions (44px minimum)
4. Readable typography (16px minimum)

## 🌙 Dark Mode Support

### Implementation
- System preference detection: `prefers-color-scheme: dark`
- Manual toggle: `.dark-theme` class
- Consistent contrast ratios
- Brand colors remain vibrant

### Color Adaptations
- Background: Light (#ffffff) → Dark (#171717)
- Text: Dark (#212121) → Light (#fafafa)
- Borders: Subtle adjustments for visibility
- Shadows: Reduced opacity in dark mode

## ♿ Accessibility Standards

### WCAG 2.1 AA Compliance
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements
- **Screen Readers**: Semantic HTML and ARIA labels
- **Focus Management**: Visible focus indicators

### Implementation Checklist
- [ ] Alt text for all images
- [ ] Semantic HTML structure
- [ ] Keyboard navigation support
- [ ] Color not sole indicator
- [ ] Sufficient color contrast
- [ ] Form labels and validation
- [ ] Loading and error states

## 🎨 Icon System

### Categories
- **Food & Menu**: 🍽️, 🍚, 🍛, 🥤, 🍰
- **Operations**: 📋, 📝, ✅, 🚀, 🏪
- **Payment**: 💰, 💳, 💵, ⬆️, ⚖️
- **Status**: ✅, ❌, ⚠️, ℹ️, ⏳
- **Navigation**: 🏠, 🔍, ⚙️, 🚪

### Usage Guidelines
- Consistent sizing across contexts
- Semantic color coding
- Background variants for emphasis
- Animation for feedback

## 🔧 Implementation Guidelines

### CSS Custom Properties
- Use design tokens consistently
- Avoid hardcoded values
- Leverage cascade for themes
- Document custom property usage

### Component Architecture
- Modular, reusable components
- Consistent naming conventions
- Prop-based variations
- Accessibility built-in

### File Organization
```
/design-system/
  ├── design-tokens.css      # Core variables
  ├── icon-system.css        # Icon components
  ├── component-library.css  # UI components
  └── brand-guidelines.md    # This document
```

## 🚀 Usage Examples

### Button Implementation
```jsx
// Primary action
<button className="btn btn-primary btn-shimmer">
  <span className="icon-cart"></span>
  Add to Cart
</button>

// With loading state
<button className="btn btn-success btn-loading">
  Processing...
</button>
```

### Card Implementation
```jsx
// Brand card with icon
<div className="card card-brand">
  <div className="card-header">
    <h3 className="card-title">
      <span className="icon-food emoji-icon-lg"></span>
      Today's Special
    </h3>
  </div>
  <div className="card-content">
    Premium meal with fresh ingredients
  </div>
</div>
```

### Icon Usage
```jsx
// Standalone icon
<span className="icon-wallet emoji-icon-xl icon-bg-brand"></span>

// Icon with text
<button className="btn btn-secondary">
  <span className="icon-search"></span>
  Search Menu
</button>
```

## 📈 Performance Considerations

### CSS Optimization
- Use CSS custom properties for runtime themes
- Minimize specificity conflicts
- Leverage CSS Grid and Flexbox
- Optimize for critical rendering path

### Asset Management
- Optimize icon fonts/SVGs
- Use responsive images
- Lazy load non-critical content
- Minimize bundle size

## 🎯 Best Practices

### Do's
✅ Use design tokens consistently  
✅ Follow mobile-first approach  
✅ Implement proper focus management  
✅ Test with screen readers  
✅ Honor user preferences  
✅ Provide loading and error states  

### Don'ts
❌ Hardcode color values  
❌ Use color alone for information  
❌ Create tiny touch targets  
❌ Ignore keyboard navigation  
❌ Overuse animations  
❌ Skip accessibility testing  

---

*This design system ensures consistent, accessible, and delightful user experiences across all KgBites applications.*