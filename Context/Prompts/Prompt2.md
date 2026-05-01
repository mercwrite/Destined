Task: Authentication Implementation Plan

Scope
Reference only the functional requirements listed in Section 3.1 — Authentication of @Context/FUNCREQ.md. Do not include requirements from any other section.

Objective
Design a detailed implementation plan for an authentication entry page that is presented to the user immediately upon opening the app. This page must allow users to either:
- Sign up for a new account, or
- Log in to an existing account

Backend Requirements
- Use Supabase as the backend.
- Create new users in Supabase Auth upon signup.
- Retrieve and reference user information from the Supabase database during login and session restoration.

Database Schema Design
Within the plan, design the schema necessary to support:
- The users table (auth identity, credentials handled by Supabase Auth)
- The profiles table (extended user data linked to auth via foreign key)
- Define all columns, data types, primary/foreign keys, and any required indexes or relationships.

Deliverable
Write the complete plan to @Context/AuthPlan.md. The plan should include:
1. Overview of the authentication flow
2. UI/UX flow for the sign-up and log-in screens
3. Supabase integration details (auth methods, session handling)
4. Database schema for users and profiles (with SQL or schema diagram)
5. Step-by-step implementation breakdown
6. Edge cases and error handling considerations
