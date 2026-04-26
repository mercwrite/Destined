You are developing a react-native expo app utilizing supabase. This is for an application called destined, which is a dating app.

Destined has five main tabs: Swipe, Likes, Matches, User profile/Stats , and App Settings

## Tech Stack
- **Framework:** React Native (0.81) with Expo SDK 54, expo-router ~6.0 (file-based routing)
- **Backend:** Supabase (client in `utils/supabase.ts`)
- **Styling:** NativeWind v4 (Tailwind CSS via `className` props) + StyleSheet for navigation config
- **Navigation:** expo-router `Tabs` on mobile (bottom), custom `Slot`-based layout on web (top tabs + header)
- **Icons:** `@expo/vector-icons` (Ionicons)

## Project Structure
```
app/
├── _layout.tsx              # Root layout — AuthContext, auth guard, font loading
├── index.tsx                # Redirects to /(tabs)/swipe
├── (auth)/
│   ├── _layout.tsx          # Auth stack layout
│   ├── welcome.tsx          # Welcome/landing screen
│   ├── sign-in.tsx          # Sign in screen
│   ├── sign-up.tsx          # Sign up screen
│   └── forgot-password.tsx  # Password reset screen
└── (tabs)/
    ├── _layout.tsx          # Tab layout — adaptive per platform
    ├── swipe.tsx            # Swipe tab (main swiping area)
    ├── likes.tsx            # Likes tab
    ├── matches.tsx          # Matches tab
    ├── profile.tsx          # User Profile editing (photos, bio, fields)
    └── settings.tsx         # Settings tab
components/
├── WebHeader.tsx            # "Destined" header bar (web/desktop only)
├── ProfileAvatar.tsx        # Circular avatar with name & age display
├── PhotoGrid.tsx            # 3x3 draggable photo grid (gesture-handler + reanimated)
├── PhotoGridItem.tsx        # Single photo grid cell (empty/occupied states)
├── ProfileCard.tsx          # Full swipe card with photo tap + info drawer; type ProfileCardData
├── SwipeCard.tsx            # Gesture-enabled card (forwardRef, SwipeCardRef); wraps ProfileCardData
├── SwipeStack.tsx           # Renders top 3 cards with stack offsets
├── MatchModal.tsx           # Animated match overlay (Reanimated)
├── Text.tsx                 # <AppText variant="..."> — use instead of bare <Text>
├── Button.tsx               # primary | secondary | ghost | dark
├── Card.tsx                 # plain | warm | flat
├── Chip.tsx                 # interest/tag chips
├── ActionBar.tsx            # undo / nope / like / star buttons under swipe card
├── ScreenHeader.tsx         # eyebrow + serif title header
└── TabBar.tsx               # design-system tab bar (prototype use; expo-router Tabs used in app)
screens/                     # Design prototype screens — NOT routed by expo-router; reference only
hooks/
├── useSwipeQueue.ts         # Supabase-backed swipe queue with match detection
utils/
├── supabase.ts              # Supabase client init
theme.ts                     # Design tokens — colors, gradients, typography, spacing, radii, shadows
Context/
├── FUNCREQ.md               # Functional requirements document
├── AuthPlan.md              # Auth implementation plan & DB schema
├── ProfilePlan.md           # Profile page implementation plan
```

## Design System
- **Single source of truth:** `theme.ts` — never hardcode colors, spacing, radii, or shadows; always import from `theme`
- **Typography:** use `<AppText variant="...">` from `components/Text.tsx` instead of bare `<Text>` — variants: `display`, `h1`, `h2`, `h3`, `body`, `bodyMedium`, `bodySmall`, `label`, `caption`
- **Action buttons:** use `<ActionBar>` from `components/ActionBar.tsx` for the row under the swipe card
- **Screen headers:** use `<ScreenHeader eyebrow="..." title="...">` from `components/ScreenHeader.tsx`
- **Fonts:** Fraunces (serif headlines) + DM Sans (body) + JetBrains Mono (labels) — already loaded in `app/_layout.tsx` via `useFonts`; do not reinstall or re-add

## UI Conventions
- All text input fields should be rounded and grey, with white borders
- The main colors are baby blue `#4291db` and warm bone `#f7f5f0` (background)
- The UI should feel modern and clean, like Spotify, Instagram, and Tinder
- App background: `colors.bg` (`#f7f5f0`), surfaces: `colors.surface` (`#ffffff`)

## Key Conventions
- All tab screens are **flat files** in `app/(tabs)/`. Do NOT use subdirectories with `_layout.tsx` for tabs — expo-router has trouble resolving nested layouts inside tab navigators.
- `app/(tabs)/_layout.tsx` renders two different layouts based on `Platform.OS`:
  - **Mobile:** `<Tabs>` from expo-router (bottom tab bar)
  - **Web:** `<WebHeader />` + custom horizontal tab bar + `<Slot />` (top navigation)
- Tab config (names, icons, hrefs) lives in `TAB_CONFIG` array in `app/(tabs)/_layout.tsx`.
- Active color: `#4291db` (baby blue), used across tab bars.
- Components go in `components/`, hooks in `hooks/`, utilities in `utils/`.

## Component Notes
- `SwipeCard` — gesture-driven (`forwardRef`, `SwipeCardRef` with `swipeLeft`/`swipeRight`), accepts `ProfileCardData`; also has named export for prototype screens
- `ProfileCardData` (from `components/ProfileCard.tsx`) — canonical Supabase profile shape; fields: `id, name, date_of_birth, bio, location_city, gender, destination, hobbies, relationship_type, photos[]`
- `screens/` folder — design prototype screens only, not file-routed; use as reference for UI intent

## Known Pre-existing TS Errors (ignore)
- `__tests__/` — missing `@types/jest` (test infra issue, not app code)
- `components/PhotoGrid.tsx` — mouse event props (`onMouseMove` etc.) are a web-only workaround; not fixable without RN web types
- `hooks/useSwipeQueue.ts` — argument count mismatch (pre-existing)
