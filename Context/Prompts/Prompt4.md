Task: Profile Page Refinements

Continuing from the previous profile page implementation, address the following four refinements:

1. Display Editable First Name Under Profile Photo
- Below the circular profile photo, display the user's first name.
- Place a pencil (edit) button immediately to the right of the name.
- Tapping the pencil should allow the user to edit their first name inline or via a modal.

2. Fix Non-Functional X (Delete) Buttons on Photos
- The X buttons currently do not work, particularly on desktop/web.
- Diagnose the cause (e.g., event propagation, pointer events, z-index, or drag handler conflicts).
- Design and implement a fix so the X button reliably triggers the delete confirmation on all platforms.

3. Enable Drag-and-Drop on Desktop
- Photos are currently not draggable on desktop/web.
- Implement proper drag-and-drop support for desktop using appropriate web drag handlers (HTML5 drag events or a cross-platform library compatible with React Native Web).
- Ensure the existing mobile drag behavior continues to function.

4. Resize the Photo Grid
- The current 3x3 photo grid is too large and overflows the screen.
- Adjust sizing (using responsive units, max-width, and aspect-ratio constraints) so the grid fits cleanly within the viewport on both mobile and desktop without horizontal scroll or clipping.

Deliverable
Updated profile.tsx with all four issues resolved and tested across mobile and desktop/web.
