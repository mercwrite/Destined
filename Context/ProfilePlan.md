# Profile Editing Page Implementation Plan

## Context
The profile page (`app/(tabs)/profile.tsx`) is currently a placeholder. It needs to become a full profile editing interface where users can manage their photos and personal information (FR-PROF-001 through FR-PROF-005). This is NOT a profile preview — it's the user's personal editing view.

## Overview
Build a scrollable profile editing screen with: avatar display, 3x3 draggable photo grid, and editable profile fields with an explicit Save button.

---

## Step 1: Install expo-image-picker
```bash
npx expo install expo-image-picker
```
This handles image selection on both mobile (photo gallery) and web (file dialog).

---

## Step 2: Create Supabase Storage Bucket
Apply a migration via MCP tool to create a `photos` storage bucket with RLS policies:
- **Upload**: Only authenticated users can upload to their own `{userId}/` folder
- **Read**: Public (profile photos are viewable by all)
- **Delete**: Only owners can delete their own photos

File path convention: `photos/{userId}/{uuid}.jpg`

---

## Step 3: Create `components/ProfileAvatar.tsx` (~40 lines)
Simple presentational component:
- 120x120 circle showing the user's first photo (or a person icon placeholder)
- User's name displayed below (bold, 22px)
- Age computed from `date_of_birth` displayed below (16px, grey)

**Props**: `photoUrl: string | null`, `name: string | null`, `dateOfBirth: string | null`

---

## Step 4: Create `components/PhotoGridItem.tsx` (~100 lines)
A single cell in the photo grid:

**Empty slot:**
- Light grey background (#F0F0F0), dashed border
- Faint grey plus icon (Ionicons "add")
- `TouchableOpacity` — tap triggers `onAdd(slotIndex)`

**Occupied slot:**
- Photo displayed via `expo-image` (3:4 portrait aspect ratio)
- Round X button (top-right corner, white circle with Ionicons "close")
- X press → `Alert.alert("Are you sure you want to delete this photo? All statistics will be lost")` with Cancel/Delete
- Wrapped in gesture detector for drag-and-drop

---

## Step 5: Create `components/PhotoGrid.tsx` (~200 lines)
The 3x3 grid with drag-and-drop reordering:

**Layout:**
- Container calculates cell width: `(containerWidth - gaps) / 3` with 3:4 aspect ratio
- 9 total slots, photos fill left-to-right by `display_order`, rest are empty
- Uses `onLayout` to measure container width

**Drag-and-drop (react-native-gesture-handler + react-native-reanimated):**
- `Gesture.LongPress()` activates drag mode
- `Gesture.Pan()` tracks finger position, animates the dragged item with `useSharedValue` for translateX/translateY
- `useAnimatedStyle` elevates dragged item (scale 1.05, shadow, higher zIndex)
- On drop: calculate target slot from finger position, swap items, call `onReorder`
- Communicate `isDragging` state up to parent to disable ScrollView during drag

**Props:**
```typescript
{
  photos: ProfilePhoto[];
  onAddPhoto: (slotIndex: number) => void;
  onDeletePhoto: (photo: ProfilePhoto) => void;
  onReorder: (reorderedPhotos: ProfilePhoto[]) => void;
  disabled?: boolean; // disable interaction during upload
}
```

---

## Step 6: Rewrite `app/(tabs)/profile.tsx` (~350 lines)
The main screen that ties everything together.

### Data Loading
- Use `useAuth()` to get `session.user.id`
- On mount, fetch in parallel:
  - `supabase.from("profiles").select("*").eq("id", userId).single()`
  - `supabase.from("profile_photos").select("*").eq("profile_id", userId).order("display_order")`
- Store in `profile` and `photos` state

### Layout (ScrollView, backgroundColor #FAFAFA)
1. **ProfileAvatar** — first photo URL, name, age
2. **PhotoGrid** — 3x3 grid with all photo management
3. **Profile Fields** — section header "About You", then:
   - **Location** — TextInput (rounded, grey bg)
   - **Gender** — Pill/chip selector row (Male, Female, Non-binary, Other) with #4291db selected color
   - **Desired Destination/Activity** — TextInput
   - **Bio** — Multiline TextInput, maxLength 300, character counter
   - **Hobbies/Interests** — TextInput where comma/enter creates tag pills, each pill has X to remove
   - **Relationship Type** — Pill/chip selector (Short-term, Long-term, Casual, Open)
4. **Save Button** — full-width, #4291db, "Save Changes", disabled when no changes or saving

### Photo Handlers

**Add photo:**
1. `ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [3, 4] })`
2. Fetch the asset URI as blob
3. Upload to Supabase Storage: `photos/{userId}/{uuid}.jpg`
4. Get public URL via `supabase.storage.from("photos").getPublicUrl(path)`
5. Insert row into `profile_photos` with `display_order = photos.length`, stats initialized to 0
6. Update local state

**Delete photo:**
1. Confirmation alert (text from requirements)
2. Extract storage path from public URL
3. Delete from Supabase Storage
4. Delete row from `profile_photos`
5. Update local state and re-normalize display_order

**Reorder photos:**
1. Receive new array order from PhotoGrid
2. Update `display_order` for each changed photo in `profile_photos`
3. Update local state

### Save Logic
- Track `formState` (location_city, gender, destination, bio, hobbies, relationship_type)
- Initialize from loaded profile
- Compare against original profile to detect `hasChanges`
- On save: `supabase.from("profiles").update({...}).eq("id", userId)`
- Success: update local profile reference, show "Saved" alert
- Error: show error alert

### Error Handling
- Inline error banner (red text on light red bg, matching auth screen pattern)
- `Alert.alert()` for confirmations and success
- Loading states: `ActivityIndicator` during initial load, disabled button during save
- Grid disabled during photo upload/delete operations

---

## Styling Constants
```
Primary:     #4291db (baby blue — save button, selected pills)
Accent:      #E91E63 (pink — used by tab bar, sparingly elsewhere)
Background:  #FAFAFA
Input BG:    #F5F5F5
Text:        #1A1A1A
Text Grey:   #9E9E9E
Border:      #E0E0E0
Error:       #D32F2F on #FFEBEE
```
Inputs: rounded (borderRadius 12), grey background, white border per CLAUDE.md.

---

## Files Modified/Created

| File | Action |
|------|--------|
| `app/(tabs)/profile.tsx` | **Rewrite** — full profile editing screen |
| `components/ProfileAvatar.tsx` | **Create** — avatar + name + age |
| `components/PhotoGrid.tsx` | **Create** — 3x3 draggable grid |
| `components/PhotoGridItem.tsx` | **Create** — single grid cell |
| Supabase (via MCP) | **Migration** — storage bucket + RLS policies |

**Reference files** (read-only):
- `app/_layout.tsx` — AuthContext/useAuth pattern
- `app/(auth)/sign-up.tsx` — styling and form patterns
- `utils/supabase.ts` — client import

---

## Verification
1. Run `npx expo start` and navigate to Profile tab
2. Verify avatar shows placeholder when no photos exist
3. Tap an empty grid slot → image picker opens (web: file dialog, mobile: gallery)
4. Add a photo → appears in grid, row created in `profile_photos` with stats = 0
5. Tap X on photo → confirmation dialog appears → delete removes from grid and database
6. Long press and drag a photo to another slot → positions swap, `display_order` updates in DB
7. Edit profile fields (location, gender, bio, etc.) → Save button enables
8. Press Save → fields persist to `profiles` table
9. Reload the page → all data loads correctly from database
