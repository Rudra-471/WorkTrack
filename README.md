# WorkTrack

A simple work management app. Supervisors assign tasks, employees work on them and report progress, and supervisors review and approve the finished work.

## Features

- **Two roles:** Supervisor and Employee, with every permission checked on the server
- **Task workflow:** To Do → In Progress → Submitted → Completed (plus Blocked). Employees can't mark tasks Completed; only the supervisor approves.
- **Progress updates:** percentage, notes and hours spent, with a full history
- **Comments on every task.** Employees can flag a comment as a problem, which marks the task Blocked.
- **Deadline extensions:** the employee requests one, the supervisor approves or rejects it
- **Daily work log:** one entry per employee per day
- **In-app notifications** for assignments, submissions, approvals, comments, problems and extensions (checked every 30 seconds)
- **Activity history** on every task: who did what, and when
- **Dashboards** for both roles, a Team page with per-employee stats, and overdue detection
- **Responsive layout:** desktop, tablet and phone

## Tech stack

- **Frontend:** React 19 + Vite, Tailwind CSS 4, React Router 7, Lucide icons (`client/`)
- **Backend:** Node.js + Express 5, JWT auth, bcrypt (`server/`)
- **Database:** PostgreSQL + Prisma ORM

## Running locally

You need Node 20+ and PostgreSQL running.

```bash
# 1. Server
cd server
cp .env.example .env          # then edit DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev        # creates the tables
npm run db:seed               # creates the starting accounts (never deletes anything)
npm run dev                   # API on http://localhost:4100

# 2. Client (in a second terminal)
cd client
npm install
npm run dev                   # app on http://localhost:5173
```

### Accounts and first sign-in

`server/prisma/seed.js` creates the starting accounts: one supervisor and one employee. They have **no password** at first. When someone signs in for the first time, they enter their email and are asked to create a password (and confirm their name).

- **Adding people:** the supervisor adds employees on the Team page using just a name and email. The employee then creates their own password the same way.
- **Forgot password:** the supervisor clicks "Reset password" on the Team page, and the employee creates a new password at their next sign-in.

**Security note:** until someone has created their password, anyone who knows their email can create it for them. Ask new people to sign in soon after their account is added. Adding email verification would close this gap.

## Project structure

```
server/
  prisma/schema.prisma     database tables
  prisma/seed.js           starting accounts
  src/index.js             Express app
  src/lib.js               validation, access checks, activity + notification helpers
  src/middleware/auth.js   JWT check and role guards
  src/routes/              auth, users, tasks, logs, notifications, dashboard
client/
  src/lib/                 API client, auth context, formatting
  src/components/          layout, task list, shared UI pieces
  src/pages/               one file per page
```

## Possible next features

File attachments, calendar view, charts and PDF/Excel export, real-time notifications (Socket.IO), deadline-approaching reminders, password reset by email.
