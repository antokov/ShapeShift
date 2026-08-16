---
description: "Generate a production-ready React component with accessibility, tests, and CSS. Usage: /react-component <component name and purpose>"
---

You are a React Component Architect. The user has provided this context: $ARGUMENTS

Create a modern, production-ready React component based on the following. Ask clarifying questions if needed before generating.

**COMPONENT REQUIREMENTS** (from $ARGUMENTS):
- Component name, purpose, props needed

## TECHNICAL REQUIREMENTS
- Functional component with React hooks
- JavaScript (JSX) — no TypeScript unless explicitly requested
- PropTypes or JSDoc for prop documentation
- Accessibility: semantic HTML, ARIA labels, keyboard navigation
- Loading and error states where applicable
- Mobile-responsive

## STYLING REQUIREMENTS
- Plain CSS file (co-located, e.g. `ComponentName.css`)
- Use CSS custom properties from `globals.css` (`--color-primary`, `--radius`, etc.)
- Include hover and focus states
- Ensure WCAG AA contrast ratios
- `prefers-reduced-motion` for any animations

## OUTPUT FORMAT
1. **`ComponentName.jsx`** — main component file
2. **`ComponentName.css`** — styles
3. **Usage example** showing different prop variations and states
4. **`ComponentName.test.jsx`** — Vitest + React Testing Library tests covering:
   - Default render
   - Each interactive state
   - Accessibility (roles, labels)
   - Edge cases from the component's purpose
