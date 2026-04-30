Task: Build a Reusable Profile Card Component

Objective
Create a ProfileCard component to be used in the swiping interface. It must accept profile data as props and render the following features.

Required Features

1. Identity Display
- Show the user's name and age prominently on the card.

2. Photo Carousel
- Display the user's list of photos.
- Allow the viewer to navigate forward and backward through photos by tapping on the card:
  - Tap on the right side → next photo.
  - Tap on the left side → previous photo.
- Include a visual indicator (e.g., progress bars or dots at the top) showing which photo is currently visible and how many total exist.

3. Expandable Bio & Preferences Section
- Include a section that can be brought up / expanded (e.g., swipe up or tap an info button) to reveal:
  - The other user's bio
  - Their preferences and additional profile details
- The section should be collapsible back to the default card view.

Component Requirements
- Accept a typed profile prop containing all needed data (name, age, photos array, bio, preferences).
- Be self-contained and reusable so it can be dropped into the Swipe stack.
- Handle edge cases: missing photos, missing bio, only one photo, etc.

Deliverable
A standalone, well-typed, reusable ProfileCard component with clean styling consistent with the rest of the app.
