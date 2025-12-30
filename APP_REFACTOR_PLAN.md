# App.jsx Refactoring Plan

## Current State
- **File Size**: 670 lines, 24KB
- **Imports**: 50+ eager imports (all components loaded upfront)
- **Routing**: Large if/else chain with repeated patterns
- **Deployment Time**: 11+ minutes (likely due to bundle size)

## Problems
1. **All components loaded eagerly** - Every page component is imported and bundled even if not visited
2. **Large bundle size** - All code shipped to client upfront
3. **Repeated patterns** - Same Header/Footer/FloatingArchyButton pattern repeated 30+ times
4. **Hard to maintain** - Large file with complex routing logic

## Refactoring Strategy

### Phase 1: Create Page Layout Component (Quick Win)
**Goal**: Eliminate repetition, reduce file size immediately

Create `src/components/PageLayout.jsx`:
```jsx
export default function PageLayout({ children, showHeader = true, showFooter = true, showArchy = true }) {
  return (
    <main className="bg-warm-offWhite text-warm-charcoal">
      {showHeader && <Header />}
      {children}
      {showFooter && <Footer />}
      {showArchy && <FloatingArchyButton />}
    </main>
  );
}
```

**Impact**: Reduces App.jsx by ~200 lines immediately

### Phase 2: Extract Router Logic
**Goal**: Separate routing logic from rendering

Create `src/utils/router.js`:
- `getInitialPage()` function
- `handleRoute()` function
- Route configuration object

**Impact**: Makes routing testable and maintainable

### Phase 3: Implement Code Splitting (Biggest Impact)
**Goal**: Lazy load page components, reduce initial bundle size

Convert eager imports to lazy:
```jsx
// Before
import AboutPage from "./pages/About";

// After
const AboutPage = React.lazy(() => import("./pages/About"));
```

Wrap routes in Suspense:
```jsx
<Suspense fallback={<LoadingSpinner />}>
  {currentPage === 'about' && <AboutPage />}
</Suspense>
```

**Impact**: 
- Initial bundle: ~70% smaller
- Pages load on-demand
- Faster initial page load
- Faster deployments (smaller bundles to process)

### Phase 4: Create Route Configuration
**Goal**: Centralize route definitions

Create `src/config/routes.js`:
```jsx
export const routes = {
  home: { component: () => import('./pages/Home'), path: '/' },
  about: { component: () => import('./pages/About'), path: '/meet-bart' },
  // ... etc
};
```

**Impact**: Single source of truth for routes, easier to maintain

## Implementation Order (Recommended)

### Step 1: PageLayout Component (30 min)
- Create PageLayout component
- Replace all repeated patterns in App.jsx
- **Expected reduction**: 200+ lines

### Step 2: Lazy Load Heavy Components (1 hour)
- Start with largest components (Culture Science pages, Methods pages)
- Add Suspense boundaries
- **Expected impact**: 50-70% bundle size reduction

### Step 3: Extract Router Logic (1 hour)
- Move routing functions to utils/router.js
- Create route configuration
- **Expected impact**: Better maintainability, easier testing

### Step 4: Lazy Load Remaining Components (1 hour)
- Convert all remaining eager imports
- Optimize Suspense boundaries
- **Expected impact**: Maximum bundle size reduction

## Expected Results

### Bundle Size
- **Before**: ~2-3MB (all components)
- **After**: ~500KB-1MB (core + lazy loaded)
- **Reduction**: 60-70%

### Deployment Time
- **Before**: 11+ minutes
- **After**: 3-5 minutes (estimated)
- **Improvement**: 50-70% faster

### Initial Load Time
- **Before**: Loads all components
- **After**: Loads only core + current page
- **Improvement**: 50-70% faster

## Files to Create

1. `src/components/PageLayout.jsx` - Reusable page wrapper
2. `src/utils/router.js` - Routing logic
3. `src/config/routes.js` - Route configuration
4. `src/components/LoadingSpinner.jsx` - Loading state for Suspense

## Files to Modify

1. `src/App.jsx` - Refactor to use new structure
2. `vite.config.js` - May need to configure code splitting

## Risk Assessment

**Low Risk**:
- PageLayout component (pure refactor)
- Router extraction (pure refactor)

**Medium Risk**:
- Lazy loading (need to test all routes)
- Suspense boundaries (need loading states)

**Mitigation**:
- Test each phase independently
- Keep old code commented during transition
- Deploy incrementally

## Next Steps

1. Review this plan
2. Start with Phase 1 (PageLayout) - quick win, low risk
3. Test thoroughly after each phase
4. Monitor deployment times

