Task: Enhance the Matches Tab and Messaging Interface

Scope
Reference Section 3.5 — Messaging Interface of @Context/FUNCREQ.md. Review what is currently implemented in the Matches tab and add any features that are missing per that section.

Required New Features

1. Block Users
- Inside an open chat window, the three-dot menu (top-right of the chat) must include an option to block the matched user.
- Blocking should:
  - Add the user to a blocked users list (create a new database schema/table for this if one does not exist).
  - Remove or hide the conversation from the matches list.
  - Prevent further interaction between the two users.

2. Star Conversations
- Allow users to star a conversation.
- Starred conversations should be pinned to the top of the matches list, above unstarred conversations.
- Toggling the star off should return the conversation to its normal position.

3. Remove a Match
- The three-dot menu must also include a Delete Match option.
- Deleting a match must:
  - Remove the match from the database.
  - Delete all associated messages for that conversation.
  - Remove the conversation from the matches list immediately.

Mobile Formatting Fix
- The current mobile layout of the matches/chat interface is broken or misaligned.
- Diagnose and fix the mobile formatting issues so the interface displays cleanly on phones.
- Do NOT change the desktop formatting — desktop is already correct and must remain untouched.

Deliverable
- All three features implemented and wired to the database (with new schema where needed).
- Mobile formatting polished without affecting desktop layout.
- All other Section 3.5 requirements verified to be implemented.
