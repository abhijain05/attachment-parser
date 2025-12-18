# Design Guidelines: Business Knowledge AI Platform

## Design Approach

**Selected Approach:** Design System-Based (Material Design foundation)  
**References:** Linear (modern productivity aesthetics), Notion (content-focused clarity), Stripe (enterprise polish)

**Rationale:** This enterprise SaaS platform prioritizes functionality, data clarity, and professional aesthetics. Users need efficient workflows for knowledge management, not visual spectacle. The design should feel modern, trustworthy, and purposeful.

---

## Core Design Principles

1. **Clarity Over Decoration** - Information hierarchy is paramount
2. **Efficiency First** - Minimize clicks, maximize productivity
3. **Professional Trust** - Enterprise-grade visual language
4. **Responsive Data Display** - Dense information presented elegantly

---

## Typography System

**Font Stack:** Inter (Google Fonts) for all text  
- **Display/Headings:** 600-700 weight, tight letter-spacing (-0.02em)
- **Body Text:** 400 weight, 1.6 line-height for readability
- **Labels/Metadata:** 500 weight, uppercase 11px with tracking (0.05em)
- **Code/Technical:** 'JetBrains Mono' for API endpoints, script previews

**Size Scale:**
- Hero/Dashboard Title: text-3xl to text-4xl
- Section Headers: text-xl to text-2xl
- Card Titles: text-lg
- Body: text-base
- Metadata/Labels: text-sm
- Micro-copy: text-xs

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16**  
- Tight spacing: p-2, gap-2 (within components)
- Standard spacing: p-4, gap-4 (cards, form fields)
- Section spacing: p-8, py-12 (page sections)
- Large spacing: p-16 (dashboard margins)

**Grid System:**
- Dashboard: Sidebar (240px fixed) + Main Content (flex-1)
- Content Max-Width: max-w-7xl for wide layouts, max-w-4xl for forms
- Card Grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

---

## Component Library

### Navigation
- **Top Bar:** Fixed header with project switcher, search, user menu (h-16)
- **Sidebar:** Collapsible navigation, icon + label pattern, active state highlighting
- **Breadcrumbs:** For nested navigation (Projects > Documents > Details)

### Data Display
- **Data Tables:** Striped rows, sortable headers, row hover states, pagination
- **Cards:** Rounded corners (rounded-lg), subtle shadow, clear hierarchy
- **Stats Widgets:** Large numbers (text-4xl font-bold), label beneath (text-sm opacity-70)
- **Knowledge List:** Document cards with metadata (file type icon, date, size, tags)

### Forms & Inputs
- **File Upload Zone:** Dashed border dropzone, drag-and-drop visual feedback, upload progress bars
- **Text Inputs:** Clean borders, focus ring (ring-2), helper text beneath
- **Select Menus:** Dropdown with search for model selection
- **Toggle Switches:** For chatbot features on/off

### Chatbot Builder
- **Split Layout:** Left side configuration panel, right side live preview (50/50 split on desktop)
- **Color Pickers:** Inline color swatches with hex input
- **Preview Window:** Simulated browser frame showing chatbot overlay

### Analytics Dashboard
- **Metric Cards:** Grid of 4 cards (queries, tokens, projects, active users)
- **Charts:** Line graphs for usage trends, bar charts for top sources
- **Table:** Recent queries with timestamp, question, sources used

### MCP Server Section
- **Endpoint Cards:** Monospace font for API paths, copy button, status indicator (green dot)
- **Request/Response Panels:** Code blocks with syntax highlighting

### Embeddable Script
- **Code Preview:** Monaco-style editor (readonly), syntax highlighting
- **Copy Button:** Prominent "Copy Script" CTA
- **Instructions:** Step-by-step setup guide with numbered list

---

## Interaction Patterns

- **Loading States:** Skeleton screens for data tables, spinner for actions
- **Empty States:** Illustration + helpful text + primary CTA ("Upload Your First Document")
- **Success Feedback:** Toast notifications (top-right), green checkmark icons
- **Error Handling:** Inline validation messages (red text beneath inputs)

---

## Image Strategy

**No decorative imagery.** This is a utility application.

**Functional Images:**
- **Empty State Illustrations:** Simple line-art SVGs (via unDraw or similar libraries)
- **File Type Icons:** Use Heroicons document variants for PDF/TXT/MD
- **User Avatars:** Circular with initials fallback

---

## Accessibility & Consistency

- Form labels always visible (no placeholder-only inputs)
- Focus states: ring-2 ring-offset-2 on all interactive elements
- ARIA labels for icon-only buttons
- Keyboard navigation support throughout
- Consistent button heights (h-10 for primary actions)

---

## Key UI Patterns by Section

**Dashboard Home:** Stats cards grid → Recent activity table → Quick actions  
**Knowledge Library:** Search/filter bar → Document grid with metadata → Batch actions  
**Chatbot Builder:** Tabbed configuration (Appearance, Behavior, Settings) → Live preview panel  
**Analytics:** Date range selector → Metric cards → Charts → Detailed logs table  
**Settings:** Sidebar sub-nav → Form sections with clear headers → Save/Cancel actions sticky at bottom