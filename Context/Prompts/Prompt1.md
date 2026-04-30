Feature: Bottom/Top Navigation Tabs with Conditional Header

Objective
Implement a five-tab navigation system in the /app directory that adapts its position and styling based on platform (mobile vs. desktop/web).

Tab Structure (Left to Right)
Create the following tabs in this exact order, using clear and descriptive file names within the /app directory:
1. Swipe — Main swiping area containing the profile stack
2. Likes — Page showing users who liked the current user
3. Matches — Page showing mutual matches and conversations
4. Profile — User's own profile and statistics page
5. Settings — Account and app settings page

Platform-Specific Behavior

Mobile
- Tabs must be displayed at the bottom of the screen as a standard bottom tab bar.
- No header bar should appear.

Desktop / Web
- Tabs must be displayed at the top of the screen.
- A header bar must appear above the tabs containing:
  - The app name "Destined"
  - The app logo
- The header bar must only render on desktop/web (hidden on mobile).
- The tabs should sit directly beneath this header bar.

Deliverables
- Properly named tab files within /app reflecting each tab's purpose.
- A responsive layout component that conditionally renders the header and switches tab placement based on platform detection.
- Confirm consistent styling and spacing across both layouts.
