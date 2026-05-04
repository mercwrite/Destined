Task: Implement user sign up flow
 
Overview:
    In our dating app, we want to sign users up by having them fill in some forms for default information. 
    Among the information the user should enter will be:
    - Name (Required)
    - Date of birth (Required)
    - Location they would like to visit (skippable)
    - Hobbies (skippable)
    - Relationship type (Required, choose an option)
    - Photos to start off with (at least one required)
    - Email Address (Required)
    - Phone Number (Required)
    - Bio (Skippable)
    
Required Features:
    - Screens that follow the current styling that walk the user through the sign up process.
    - Screen 1: Name, date of birth, email address, password
    - Screen 2: Photos (at least one)
    - Screen 3: Relationship type
    - Screen 4: Location to visit (Skippable)
    - Screen 5: Bio (Skippable)
    - Screen 6: Hobbies (Skippable)
    - After screen 6, the user will be told to verify their email and should be brought to the swipe page, and they begin using the app like normal
    - Screens marked as skippable will have the word "skip" in the top right corner that users can click to skip and complete the information later. All other screens will require filling in information in order to unlock a "next" button.
    - All information is submitted/inserted into the database and user is created only after screen 6
    - The app should check if the email address entered is already taken/used by another user, if it is, show some text below the field in red "email address is taken!". The field is not counted as valid (user can't continue to next screen) until an email that is not taken is entered.
    - The app should calculate the users age using the date of birth they entered
    - Ensure the sign up button shows up on mobile, as it currently does not.

    Deliverable:
    - All features implemented correctly, without mistakes, following the styling and proper formatting choices for the web and mobile versions.