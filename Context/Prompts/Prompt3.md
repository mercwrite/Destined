Task: Profile Page Implementation Plan

Scope
Reference only the functional requirements listed in Section 3.2 — User Profile and Editing Interface of @Context/FUNCREQ.md.

Target File
Implement the plan at @app/(tabs)/profile.tsx.

Page Purpose
This page is the user's personal profile management view. It is not a preview of how other users see the profile. Its purpose is to display the current user's information and allow them to edit it.

Layout Specification (Top to Bottom)

1. Profile Header
- A circular profile image at the top, populated with the user's first photo.
- Below the circle: the user's name and age, displayed clearly.

2. Photo Grid (3x3)
- A grid of nine portrait-aspect-ratio boxes for up to nine photos.
- Empty boxes show a faint grey plus (+) icon indicating they can be filled.
- Tapping an empty box opens a photo picker:
  - On web: open the file explorer.
  - On mobile: open the device photo gallery.
- When a photo occupies a slot, it should fill the box (replacing the plus icon).
- Photos must be drag-and-drop reorderable within the grid (hold and drag to rearrange).
- Each occupied photo slot must display a circular X button in its top-right corner.
  - Pressing X must trigger a confirmation prompt: "Are you sure you want to delete this photo? All statistics will be lost"
  - Only on confirmation should the photo be removed.

3. Database Synchronization
- Whenever photos are added, deleted, or reordered, the database must be updated to reflect the change.
- Each photo must be configured to track statistics as defined in FR-PROF-002.

4. Editable Profile Information Section
- Below the photo grid, provide editing controls for all fields listed in FR-PROF-001, excluding any fields already covered by the photo grid and profile header above.

Deliverable
A complete implementation plan covering UI structure, state management, photo upload/deletion handlers, drag-and-drop logic, database update calls, and statistics tracking integration.
