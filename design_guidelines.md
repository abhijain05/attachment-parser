# Design Guidelines: Knowledge AI Platform

## Design Approach

**Selected Approach:** Hybrid - Material Design foundation + Notion clarity + Linear premium aesthetics

**Rationale:** Enterprise SaaS platform with premium visual identity. Gradients provide brand differentiation while maintaining functional clarity. Mobile-first ensures accessibility across devices.

**Core Principles:**
- Gradients as accent, not distraction
- Data clarity through contrast
- Premium polish with functional efficiency
- Touch-first interactions

---

## Color System

### Light Mode Gradients
- **Primary Gradient:** `from-purple-500 via-blue-500 to-blue-600` (buttons, headers, accents)
- **Subtle Gradient:** `from-purple-50 via-blue-50 to-teal-50` (backgrounds, cards)
- **Accent Gradient:** `from-teal-400 to-blue-500` (stats, highlights)

### Dark Mode Gradients
- **Primary Gradient:** `from-purple-900 via-blue-900 to-teal-900` (buttons, headers)
- **Deep Gradient:** `from-gray-950 via-purple-950 to-blue-950` (backgrounds)
- **Bright Accent:** `from-purple-600 via-blue-600 to-teal-500` (interactive elements)

### Neutral Palette
- **Light Backgrounds:** White, gray-50, gray-100
- **Dark Backgrounds:** gray-950, gray-900, gray-800
- **Text:** gray-900 (light mode), gray-50 (dark mode)
- **Borders:** gray-200 (light), gray-700 (dark)

### Semantic Colors
- **Success:** green-500 gradient to teal-500
- **Warning:** amber-500 to orange-500
- **Error:** red-500 to pink-600
- **Info:** blue-500 to purple-500

---

## Typography

**Fonts:** Inter (primary), JetBrains Mono (code)

**Scale:**
- **Hero:** text-4xl md:text-5xl, font-bold, gradient text effect
- **Section Headers:** text-2xl md:text-3xl, font-semibold
- **Card Titles:** text-lg font-medium
- **Body:** text-base, leading-relaxed
- **Labels:** text-sm font-medium, tracking-wide
- **Metadata:** text-xs opacity-70

---

## Spacing System

**Primitives:** 2, 4, 6, 8, 12, 16, 20, 24

**Mobile Touch Targets:** Minimum h-12 for buttons, h-16 for nav items  
**Card Padding:** p-6 mobile, p-8 desktop  
**Section Spacing:** py-12 mobile, py-20 desktop  
**Grid Gaps:** gap-4 mobile, gap-6 desktop

---

## Layout Architecture

### Desktop
- **Sidebar:** w-64, gradient background, fixed position
- **Top Bar:** h-16, glass morphism effect, sticky
- **Content:** max-w-7xl mx-auto, px-6

### Mobile (< 768px)
- **Bottom Navigation:** Fixed h-16, 4-5 icons, gradient background, active state glow
- **No Sidebar:** Full-width stacked layout
- **Cards:** Full-width with horizontal scroll for grids

---

## Component Library

### Navigation
**Desktop Top Bar:** Logo + Search + Project Switcher + User Menu  
**Desktop Sidebar:** Nested nav with icons, gradient hover states  
**Mobile Bottom Nav:** Home, Knowledge, Chat, Analytics, Profile (icons with labels)

### Hero Section
**Marketing/Dashboard Hero:**
- Full-width gradient background (primary gradient with 60% opacity overlay)
- Large heading with gradient text effect
- Subheading text-xl
- Primary CTA button with blurred background treatment
- Background image: Abstract tech/AI visualization (modern, soft-focus)
- Height: 60vh mobile, 70vh desktop

### Cards
**Standard Card:** Rounded-2xl, gradient border (1px), glass effect background, shadow-lg  
**Stat Card:** Large number (text-5xl) with gradient color, icon top-right, subtitle below  
**Knowledge Card:** Document icon, title, metadata row (date, size, type), gradient tag

### Buttons
**Primary:** Gradient background (primary), text-white, rounded-xl, px-6 py-3, shadow-md  
**Secondary:** Gradient border, transparent background, gradient text  
**Icon Buttons:** w-12 h-12 circle, gradient on hover  
**Floating Action (Mobile):** Fixed bottom-right, gradient circle, shadow-2xl

### Data Display
**Tables:** 
- Headers with subtle gradient background
- Alternating row backgrounds (gray-50/transparent)
- Rounded-lg outer container
- Mobile: Horizontal scroll or card transformation

**Charts:** Gradient line fills, colored data points, glass-effect backgrounds

### Forms
**Inputs:** rounded-lg, ring-2 focus state with gradient color, h-12 minimum  
**File Upload:** Dashed gradient border, dropzone h-48, drag feedback glow  
**Selects:** Custom dropdown with gradient hover states  
**Toggles:** Gradient active state, larger touch target (w-14 h-8)

### Chatbot Builder
**Split View (Desktop):** Config panel (gradient sidebar) + Preview (glass frame)  
**Mobile:** Tabbed interface, full-screen preview toggle  
**Color Picker:** Gradient swatches, hex input  
**Live Preview:** Simulated browser with gradient chatbot bubble

### Analytics Dashboard
**Metric Grid:** 2x2 mobile, 4x1 desktop, gradient stat cards  
**Charts:** Line graphs with gradient fills, interactive tooltips  
**Activity Feed:** Timeline with gradient connectors, card-style entries

### Empty States
**Illustration:** Gradient-colored line art (upload cloud, chart, document)  
**Text:** Encouraging message + gradient CTA button  
**Container:** Centered, py-20, subtle gradient background

---

## Images

**Hero Background:** Modern abstract tech visualization - flowing gradients, neural networks, or particle effects (soft focus, 40% opacity overlay)  
**Empty States:** Gradient-style illustrations (unDraw or similar with custom colors)  
**Document Icons:** Heroicons with gradient color variants  
**User Avatars:** Circular with gradient borders

---

## Mobile-Specific Patterns

**Bottom Navigation:**
- 5 main sections with icons + labels
- Active state: icon scale + gradient glow
- Subtle gradient background

**Touch Interactions:**
- All buttons minimum 44x44px
- Swipe gestures for card deletion
- Pull-to-refresh with gradient loader
- Bottom sheets for filters/actions

**Card Layouts:**
- Full-width cards with gap-4
- Horizontal scroll for secondary content
- Expansion panels for detail views

---

## Interaction & Feedback

**Loading:** Skeleton screens with gradient shimmer effect  
**Success:** Toast with gradient background, slide-in from top  
**Errors:** Inline with gradient error icon, red-to-pink gradient text  
**Progress:** Gradient progress bars, circular loaders with gradient stroke

---

## Accessibility

- 4.5:1 contrast ratio maintained even with gradients
- Focus rings: 3px gradient border on focused elements
- Touch targets: 48x48px minimum
- ARIA labels for all icon-only buttons
- Screen reader announcements for gradient decorative elements hidden

---

## Dark Mode Strategy

Auto-switch based on system preference. All gradients use dark variants. Increase shadow intensity for depth. Reduce gradient opacity to prevent eye strain.