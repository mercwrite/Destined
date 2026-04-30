Task: Implementation Plan for Profile Stack (Swipe Tab)

Scope
Follow all functional requirements in Section 3.3 — Profile Stack of @Context/FUNCREQ.md. You may explore optimizations or alternative implementations beyond the suggested flow if they improve performance or UX.

Objective
Using the existing ProfileCard component, build the profile stack feature within the Swipe tab. Users will:
- Swipe right → like a profile
- Swipe left → reject a profile

Suggested Flow (Open to Optimization)
1. Generate a queue of UserIDs whose profiles roughly match the current user's preferences.
2. Fetch the corresponding profile data for those UserIDs.
3. Present them as a stack of swipeable ProfileCards.
4. Continuously feed in new users the current user has not yet seen or swiped on.

Database Schema Additions
Design and add tables to support:
- Like — record of right-swipes
- Match — record of mutual likes
- Reject — record of left-swipes

Include all necessary columns (user IDs, target IDs, timestamps), foreign keys, and indexes for efficient lookup.

Statistics Tracking
- Update profile photo statistics based on swipe outcomes (e.g., impressions, likes-per-photo, rejections-per-photo) consistent with the photo statistics defined in earlier sections.

Plan Deliverables
Produce a comprehensive plan covering three layers:

1. Front-End
- Swipe gesture handling (mobile and desktop)
- Card stack rendering and animation
- Empty/end-of-queue states

2. Back-End
- Supabase tables and relationships for Like, Match, Reject
- Endpoints / RPC functions for recording swipes and detecting matches
- Trigger logic for creating Match records when a mutual like occurs
- Photo statistics update logic

3. Profile Selection Algorithm
- How the candidate queue is generated based on user preferences
- How already-seen / already-swiped users are excluded
- Pagination, prefetching, and queue refill strategy
- Ranking or scoring approach (if applicable)
