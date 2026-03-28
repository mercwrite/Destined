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
├── _layout.tsx              # Root Stack (headerShown: false)
├── index.tsx                # Redirects to /(tabs)/swipe
└── (tabs)/
    ├── _layout.tsx          # Tab layout — adaptive per platform
    ├── swipe.tsx            # Swipe tab (main swiping area)
    ├── likes.tsx            # Likes tab
    ├── matches.tsx          # Matches tab
    ├── profile.tsx          # User Profile & Stats tab
    └── settings.tsx         # Settings tab
components/
├── WebHeader.tsx            # "Destined" header bar (web/desktop only)
hooks/                       # Custom hooks (empty)
utils/
├── supabase.ts              # Supabase client init
```
## UI Conventions
- All text input fields should be rounded and grey, with white borders
- The main colors utilized should be a soft baby blue like #4291db and grey
- The UI should feel modern and clean, like spotify, instagram, and tinder

## Key Conventions
- All tab screens are **flat files** in `app/(tabs)/`. Do NOT use subdirectories with `_layout.tsx` for tabs — expo-router has trouble resolving nested layouts inside tab navigators. If a tab needs stack navigation in the future, handle it at that time.
- `app/(tabs)/_layout.tsx` renders two different layouts based on `Platform.OS`:
  - **Mobile:** `<Tabs>` from expo-router (bottom tab bar)
  - **Web:** `<WebHeader />` + custom horizontal tab bar + `<Slot />` (top navigation)
- Tab config (names, icons, hrefs) lives in `TAB_CONFIG` array in `app/(tabs)/_layout.tsx`.
- Active color: `#E91E63` (pink), used across tab bars.
- Components go in `components/`, hooks in `hooks/`, utilities in `utils/`.