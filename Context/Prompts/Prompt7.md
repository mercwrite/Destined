Task: Complete the Settings Page

Scope
Reference Section 3.6 — User Settings of @Context/FUNCREQ.md.

Context
Some settings features are already partially implemented, including:
- Password changing
- Discovery preferences

Instructions
1. Review the current settings page implementation.
2. Identify gaps between the existing implementation and the requirements in Section 3.6.
3. Implement all missing features, paying particular attention to the following:

Required Features

a. Disable Profile Discovery
- Add a toggle that allows the user to disable their profile from being discovered by others in the swipe stack.

b. Blocked Users Management
- Provide a view listing all users the current user has blocked.
- Each entry must include an Unblock action that removes the user from the block list (and updates the database accordingly).

c. Disable Account
- Add an option to disable the user's account (soft-disable: account is recoverable, but profile is hidden and login may be restricted per requirements).

d. Delete Account
- Add an option to permanently delete the user's account.
- Include an appropriate confirmation prompt warning the action is irreversible.
- Ensure all associated data is removed per the requirements.

e. Log Out
- Add a Log Out button that signs the user out and redirects them to the authentication screen.

Deliverable
An updated, complete Settings page that fulfills every requirement in Section 3.6, with database updates wired correctly for each action.
