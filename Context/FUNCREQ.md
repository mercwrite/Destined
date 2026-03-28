3.1 Authentication
FR-AUTH-001:	
The application shall allow users to sign up for a new account using an email address (or phone number) and password.	
FR-AUTH-002:	
The application shall allow users to log in to an existing account using their email/phone and password.	
FR-AUTH-003:	
The application shall provide an option for users to save login credentials and remain logged in on a device.	
FR-AUTH-004:	
The application shall enforce two-factor authentication (2FA) when a user signs in from a new or unrecognized device.	
FR-AUTH-005:	
The application shall provide a "Forgot Password" flow that allows users to reset their password via email or phone verification.	
FR-AUTH-006:
The application shall require new users to confirm their email address or phone number before granting full access.	

3.2 User Profile and Editing Interface
FR-PROF-001:	
The application shall allow users to create and edit their profile, including the following fields: Name, Age, Location, Gender, Desired Destination/Activity, Bio, Hobbies/Interests, Photos, Photo Order, and Desired Relationship Type (e.g., short-term, long-term, monogamy).	
FR-PROF-002: 
The application shall track analytics for each user photo, including swipe-left rate, swipe-right rate, and total impressions.	
FR-PROF-003: 
The application shall display photo analytics to the user within the profile editing interface.	
FR-PROF-004: 	
The application shall allow users to delete individual photos from their profile.	
FR-PROF-005:	
The application shall allow users to rearrange the display order of their profile photos.
3.3 Profile Stack
FR-STACK-001:
The application shall present users with a stack of profile cards, sorted and filtered based on the user's preferences and a matching algorithm.	
FR-STACK-002:	
Users shall be able to swipe left on a profile card to reject it.	
FR-STACK-003:
Users shall be able to swipe right on a profile card to like it.	
FR-STACK-004:
The front face of each profile card shall display the user's top photo, name, age, approximate location (city/town), and desired destination or activity.	
FR-STACK-005:	
Users shall be able to tap or expand a profile card to view additional information (bio, hobbies/interests, additional photos, desired relationship type).	
FR-STACK-006:	
After each swipe action, the application shall display the next profile card in the stack.	
FR-STACK-007:	
The application shall record the profile IDs of all profiles swiped on by each user to prevent repeated display.	
FR-STACK-008:	
After a configurable period of time, previously swiped profile IDs shall be removed from the exclusion list, allowing those profiles to reappear in the stack.	

3.4 Match Management Interface
FR-MATCH-001:	
The application shall provide an interface where users can view a list of profiles that have liked them.	
FR-MATCH-002:	
Users shall be able to tap on a profile in the likes list to expand and view the full profile card.	
FR-MATCH-003:	
From the expanded profile view, users shall be able to match with (like back) or reject the profile.	
FR-MATCH-004:	
When two users mutually like each other, the application shall create a match and notify both users.	

3.5 Messaging Interface	
FR-MSG-001:	
The application shall present users with a list of conversations, sorted by most recent message.	
FR-MSG-002:	
Conversations with unread messages shall display the count of unread messages and the timestamp of the last message received.	
FR-MSG-003:	
Users shall be able to star (favorite) conversations to pin them to the top of the conversation list.	
FR-MSG-004:
Each conversation list item shall display the matched user's profile picture and name.	
FR-MSG-005:	
Tapping on a conversation shall open the messenger view.	
FR-MSG-006:	
The messenger view shall display the full chat history with timestamps for each message.	
FR-MSG-007:	
Users shall be able to compose and send text messages to matched users within the messenger.	
FR-MSG-008:
	Users shall be able to delete a match and its associated conversation.	
FR-MSG-009:	
Users shall be able to report a matched user for inappropriate behavior.	
FR-MSG-010:	
Users shall be able to block a matched user, preventing further communication and removing the match.	

3.6 User Settings
FR-SET-001:	
Users shall be able to delete their account and all associated data.
FR-SET-002:	
Users shall be able to disable (deactivate) their account without permanent deletion.	
FR-SET-003:	
Users shall be able to set preferences for the profile stack, including preferred distance range, gender, and age range.	
FR-SET-004:	
Users shall be able to enable or disable profile discovery (i.e., remove their profile from appearing in other users' stacks).
FR-SET-005:	
Users shall be able to log out of the application.	
FR-SET-006:	
Users shall be able to manage notification settings (enable/disable notifications for messages, matches, etc.).	
FR-SET-007:	
Users shall be able to manage sign-in settings (e.g., saved credentials, 2FA preferences).	

3.7 Backend, Database, and API
FR-BE-001:	
The backend database shall store public user profiles and all associated profile information.	
FR-BE-002:	
The backend database shall store user conversations and message histories.	
FR-BE-003:	
The backend database shall store photo analytics data (impressions, swipe rates).	
FR-BE-004:	
The backend database shall store user login credentials with passwords securely hashed.	
FR-BE-005:	
The backend database shall store user settings and preferences.	
FR-BE-006:	
All stored data shall be accessible through well-defined RESTful API endpoints.	

3.8 Notifications and Caching
FR-NC-001:	
The application shall send push notifications to users for new messages.	
FR-NC-002:	
The application shall send push notifications to users for new matches.	
FR-NC-003:
The application shall cache user profile information on the device to reduce API calls and improve performance.	
FR-NC-004:	
The application shall cache recent conversation histories on the device to reduce API calls and improve performance.	
