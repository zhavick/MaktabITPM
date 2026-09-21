# Enterprise Project Management Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete enterprise Project Management application with ASP.NET Core 8 Web API, MySQL (Docker), JWT authentication, Vite + ReactJS frontend, Select2, SweetAlert2, supporting hybrid member onboarding, task kanban, notes, dual-mode timesheets, attendance, caretaker incident ticketing, and analytics reports.

**Architecture:** Decoupled architecture with ASP.NET Core 8 Web API on backend handling business logic and file uploads, MySQL 8 running in Docker for persistence, and Vite + ReactJS SPA on frontend featuring a rich Vanilla CSS design system, SweetAlert2 dialogs/toasts, and Select2 searchable components.

**Tech Stack:** ASP.NET Core 8, Pomelo.EntityFrameworkCore.MySql, JWT Bearer, Docker (MySQL 8), Vite, React 18+, Axios, SweetAlert2, Select2, Lucide React, Modern Vanilla CSS (Plus Jakarta Sans).

**Spec:** [2026-09-21-project-management-app-design.md](file:///c:/TEMP/VSCODE/ProjectManagement/docs/superpowers/specs/2026-09-21-project-management-app-design.md)

## Global Constraints

- Backend framework: ASP.NET Core 8 Web API (`C# 12`)
- Database: MySQL 8.0 via Docker Compose (Port 3306)
- Frontend: Vite + ReactJS SPA with modern Vanilla CSS design system
- UI Plugins: SweetAlert2 (dialogs/toasts) and Select2 (searchable selects)
- Authentication: JWT Bearer with Claims (UserId, Email, Role, EmploymentType, OnboardingCompleted)
- Roles: `Admin`, `ProjectManager`, `Caretaker`, `InternalEmployee`, `Consultant`
- Timesheet Dual Mode: Consultant uploads monthly Excel/CSV; Internal logs continuous/daily entries
- Ticketing: Open ticket pool for incident reporting with Caretaker assignment workflow

---

### Task 1: Docker MySQL & Backend Scaffolding

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/init.sql`
- Create: `backend/ProjectManagement.Api.csproj`
- Create: `backend/appsettings.json`
- Create: `backend/appsettings.Development.json`

**Interfaces:**
- Produces: Running MySQL 8 container with persistent volume and initialized database schema; base .NET 8 Web API project with required NuGet dependencies.

- [ ] **Step 1: Create `docker-compose.yml` for MySQL 8**

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: pm_mysql_db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: project_management_db
      MYSQL_USER: pm_user
      MYSQL_PASSWORD: pm_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpassword"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:
```

- [ ] **Step 2: Create `backend/init.sql` with database schema and seed data**

Write SQL initialization to create tables (`Users`, `Projects`, `ProjectMembers`, `Tasks`, `Notes`, `Timesheets`, `TimesheetEntries`, `Attendances`, `Tickets`, `TicketComments`) and seed initial admin user (`admin@projectmgmt.local`).

- [ ] **Step 3: Scaffold ASP.NET Core 8 Web API project and install dependencies**

Run:
```bash
dotnet new webapi -n ProjectManagement.Api -o backend --no-https
cd backend
dotnet add package Pomelo.EntityFrameworkCore.MySql --version 8.0.2
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.8
dotnet add package System.IdentityModel.Tokens.Jwt --version 8.0.2
dotnet add package BCrypt.Net-Next --version 4.0.3
dotnet add package Swashbuckle.AspNetCore --version 6.6.2
```

- [ ] **Step 4: Configure `appsettings.json` with database connection and JWT configuration**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=project_management_db;User=pm_user;Password=pm_password;"
  },
  "Jwt": {
    "Key": "SuperSecretKeyForProjectManagementAppJWT2026SecureString!",
    "Issuer": "ProjectManagementApi",
    "Audience": "ProjectManagementClient",
    "ExpiryMinutes": 1440
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

- [ ] **Step 5: Verify build**

Run: `dotnet build backend/ProjectManagement.Api.csproj`
Expected: Build succeeded with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml backend/
git commit -m "feat: setup docker mysql and backend .net 8 scaffolding"
```

---

### Task 2: Data Models & Entity Framework Core Context

**Files:**
- Create: `backend/Models/User.cs`
- Create: `backend/Models/Project.cs`
- Create: `backend/Models/ProjectMember.cs`
- Create: `backend/Models/TaskItem.cs`
- Create: `backend/Models/Note.cs`
- Create: `backend/Models/Timesheet.cs`
- Create: `backend/Models/TimesheetEntry.cs`
- Create: `backend/Models/Attendance.cs`
- Create: `backend/Models/Ticket.cs`
- Create: `backend/Models/TicketComment.cs`
- Create: `backend/Data/AppDbContext.cs`

**Interfaces:**
- Consumes: MySQL Connection string from `appsettings.json`
- Produces: `AppDbContext` with full entity sets, relationships, constraints, and data seeding for Admin, Caretaker, PM, and sample Project.

- [ ] **Step 1: Create Entity models in `backend/Models/`**
- [ ] **Step 2: Create `AppDbContext` configuring Pomelo MySQL entity mappings, indexes, cascade rules**
- [ ] **Step 3: Register `AppDbContext` in `backend/Program.cs`**
- [ ] **Step 4: Build and test compilation**
Run: `dotnet build backend/ProjectManagement.Api.csproj`
- [ ] **Step 5: Commit**

```bash
git add backend/Models/ backend/Data/ backend/Program.cs
git commit -m "feat: add ef core models and appdbcontext"
```

---

### Task 3: Authentication, JWT & Hybrid Member Acceptance API

**Files:**
- Create: `backend/DTOs/AuthDtos.cs`
- Create: `backend/DTOs/MemberDtos.cs`
- Create: `backend/Services/ITokenService.cs`
- Create: `backend/Services/TokenService.cs`
- Create: `backend/Services/IAuthService.cs`
- Create: `backend/Services/AuthService.cs`
- Create: `backend/Controllers/AuthController.cs`
- Create: `backend/Controllers/MembersController.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `IConfiguration`
- Produces:
  - `POST /api/auth/register` (Hybrid registration, status `PendingApproval`)
  - `POST /api/auth/login` (Returns JWT token + user profile)
  - `GET /api/auth/me`
  - `POST /api/auth/onboarding` (Complete onboarding setup)
  - `GET /api/members/pending` (Admin review list)
  - `POST /api/members/{id}/approve` (Set status `Active` & assign Role)
  - `POST /api/members/{id}/reject`
  - `POST /api/members/invite` (Direct invite)
  - `GET /api/members` (Directory of active members)

- [ ] **Step 1: Write DTOs for Auth and Member management**
- [ ] **Step 2: Implement `TokenService` generating JWT with claims**
- [ ] **Step 3: Implement `AuthService` handling registration, BCrypt password verification, and approval workflow**
- [ ] **Step 4: Implement `AuthController` and `MembersController` with role authorization**
- [ ] **Step 5: Configure JWT authentication middleware and CORS in `backend/Program.cs`**
- [ ] **Step 6: Verify build and test endpoints**
Run: `dotnet build backend/ProjectManagement.Api.csproj`
- [ ] **Step 7: Commit**

```bash
git add backend/DTOs/ backend/Services/ backend/Controllers/ backend/Program.cs
git commit -m "feat: implement auth, jwt and hybrid member acceptance api"
```

---

### Task 4: Projects, Tasks (Kanban) & Notes API

**Files:**
- Create: `backend/DTOs/ProjectDtos.cs`
- Create: `backend/DTOs/TaskDtos.cs`
- Create: `backend/DTOs/NoteDtos.cs`
- Create: `backend/Controllers/ProjectsController.cs`
- Create: `backend/Controllers/TasksController.cs`
- Create: `backend/Controllers/NotesController.cs`

**Interfaces:**
- Produces:
  - `GET /api/projects`, `POST /api/projects`, `GET /api/projects/{id}`
  - `GET /api/tasks?projectId=...`, `POST /api/tasks`, `PUT /api/tasks/{id}`, `PUT /api/tasks/{id}/status` (Kanban drag-drop)
  - `GET /api/notes?projectId=...`, `POST /api/notes`, `PUT /api/notes/{id}`, `DELETE /api/notes/{id}`

- [ ] **Step 1: Create DTOs for Projects, Tasks, and Notes**
- [ ] **Step 2: Implement `ProjectsController` with membership assignment**
- [ ] **Step 3: Implement `TasksController` supporting status update for Kanban columns**
- [ ] **Step 4: Implement `NotesController` supporting markdown content and categories**
- [ ] **Step 5: Verify build**
Run: `dotnet build backend/ProjectManagement.Api.csproj`
- [ ] **Step 6: Commit**

```bash
git add backend/DTOs/ backend/Controllers/
git commit -m "feat: implement projects, tasks kanban and notes api"
```

---

### Task 5: Dual-Mode Timesheet & Attendance API

**Files:**
- Create: `backend/DTOs/TimesheetDtos.cs`
- Create: `backend/DTOs/AttendanceDtos.cs`
- Create: `backend/Services/ITimesheetParserService.cs`
- Create: `backend/Services/TimesheetParserService.cs`
- Create: `backend/Controllers/TimesheetsController.cs`
- Create: `backend/Controllers/AttendanceController.cs`

**Interfaces:**
- Produces:
  - `GET /api/timesheets/my` (Get current user's timesheets)
  - `POST /api/timesheets/internal/log` (Internal real-time / daily entry)
  - `GET /api/timesheets/consultant/template` (Generates official Excel/CSV template)
  - `POST /api/timesheets/consultant/upload` (Uploads monthly `.xlsx` / `.csv`, parses rows, computes total hours)
  - `POST /api/timesheets/{id}/review` (PM/Finance approval with notes)
  - `GET /api/attendance/today`
  - `POST /api/attendance/clock-in` (Clock-in with WFO/WFH mode)
  - `POST /api/attendance/clock-out` (Clock-out with total hours calculated)
  - `GET /api/attendance/history` (Recap history)

- [ ] **Step 1: Create DTOs for Timesheet and Attendance**
- [ ] **Step 2: Implement `TimesheetParserService` to generate template and parse uploaded Excel/CSV**
- [ ] **Step 3: Implement `TimesheetsController` supporting dual-mode logic and reviewer workflow**
- [ ] **Step 4: Implement `AttendanceController` preventing duplicate clock-ins and recording work mode**
- [ ] **Step 5: Setup upload directory creation in `Program.cs` (`/Uploads/Timesheets`)**
- [ ] **Step 6: Verify build**
Run: `dotnet build backend/ProjectManagement.Api.csproj`
- [ ] **Step 7: Commit**

```bash
git add backend/DTOs/ backend/Services/ backend/Controllers/
git commit -m "feat: implement dual-mode timesheet and attendance api"
```

---

### Task 6: Incident Ticketing, Caretaker Assignment & Reports API

**Files:**
- Create: `backend/DTOs/TicketDtos.cs`
- Create: `backend/DTOs/ReportDtos.cs`
- Create: `backend/Controllers/TicketsController.cs`
- Create: `backend/Controllers/ReportsController.cs`

**Interfaces:**
- Produces:
  - `GET /api/tickets` (Supports filter by status, unassigned pool, project)
  - `POST /api/tickets` (Create issue with severity and optional screenshot)
  - `POST /api/tickets/{id}/assign` (Caretaker pick or assign to caretaker member)
  - `PUT /api/tickets/{id}/status` (Progress status: Open -> InProgress -> Resolved -> Closed)
  - `POST /api/tickets/{id}/comments`
  - `GET /api/reports/dashboard-stats`
  - `GET /api/reports/timesheet-summary`
  - `GET /api/reports/export/timesheets.csv`
  - `GET /api/reports/export/attendance.csv`

- [ ] **Step 1: Create DTOs for Ticket and Report**
- [ ] **Step 2: Implement `TicketsController` with Open Ticket Pool and Caretaker routing**
- [ ] **Step 3: Implement `ReportsController` with KPI aggregations and CSV/Excel file streams**
- [ ] **Step 4: Verify build**
Run: `dotnet build backend/ProjectManagement.Api.csproj`
- [ ] **Step 5: Commit**

```bash
git add backend/DTOs/ backend/Controllers/
git commit -m "feat: implement tickets caretaker management and reports api"
```

---

### Task 7: Frontend Scaffolding, Design System & UI Libraries (SweetAlert2 + Select2)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/index.css`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/utils/api.js`
- Create: `frontend/src/utils/swal.js`
- Create: `frontend/src/components/Select2.jsx`
- Create: `frontend/src/context/AuthContext.jsx`
- Create: `frontend/src/components/Navbar.jsx`
- Create: `frontend/src/components/Sidebar.jsx`

**Interfaces:**
- Produces: Clean, modern Vite React application with:
  - Global Axios client attached with Bearer JWT token and response interceptor.
  - SweetAlert2 helper module (`showToast`, `confirmDialog`, `errorAlert`).
  - Searchable `Select2` dropdown component with single and multi-select support.
  - Responsive App Shell layout (Sidebar, Header, Breadcrumbs, Theme Toggle).

- [ ] **Step 1: Create `frontend/package.json` with React, Vite, SweetAlert2, Lucide React, Axios**
- [ ] **Step 2: Install Node.js (if not already present via winget) and npm packages**
- [ ] **Step 3: Implement `frontend/src/index.css` design system (Plus Jakarta Sans, variables, glassmorphic cards, badges, button styles)**
- [ ] **Step 4: Implement `swal.js` wrapper with modern styling**
- [ ] **Step 5: Implement `Select2.jsx` searchable component with search filtering and custom option badges**
- [ ] **Step 6: Implement `AuthContext.jsx` with persistent token storage and role validation**
- [ ] **Step 7: Implement responsive `Sidebar.jsx` and `Navbar.jsx`**
- [ ] **Step 8: Verify frontend build (`npm run build` or dev server start)**
- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend with design system, swal2, and select2"
```

---

### Task 8: Frontend Auth, Hybrid Registration & Onboarding Screen Wizard

**Files:**
- Create: `frontend/src/pages/LoginPage.jsx`
- Create: `frontend/src/pages/RegisterPage.jsx`
- Create: `frontend/src/pages/PendingApprovalPage.jsx`
- Create: `frontend/src/pages/OnboardingWizardPage.jsx`
- Create: `frontend/src/pages/MembersManagementPage.jsx`

**Interfaces:**
- Produces:
  - Complete user authentication flow.
  - Hybrid registration form with role/employment type switcher.
  - Pending approval state with status check.
  - Interactive 3-step Onboarding Screen wizard.
  - Admin/PM member approval and direct invite dashboard with SweetAlert2 modals.

- [ ] **Step 1: Build `LoginPage.jsx` with demo account quick-fill buttons**
- [ ] **Step 2: Build `RegisterPage.jsx` supporting Internal Employee vs Consultant registration**
- [ ] **Step 3: Build `PendingApprovalPage.jsx` informing new registrants about pending admin review**
- [ ] **Step 4: Build `OnboardingWizardPage.jsx` (Profile & avatar setup -> Project overview -> Module tour)**
- [ ] **Step 5: Build `MembersManagementPage.jsx` for Admins (Review queue, Approve/Reject with SweetAlert2, Invite with Select2)**
- [ ] **Step 6: Test auth flow end-to-end**
- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/
git commit -m "feat: implement frontend auth, hybrid registration, and onboarding wizard"
```

---

### Task 9: Frontend Task Kanban Board & Notes Management

**Files:**
- Create: `frontend/src/pages/TasksPage.jsx`
- Create: `frontend/src/components/TaskModal.jsx`
- Create: `frontend/src/pages/NotesPage.jsx`
- Create: `frontend/src/components/NoteModal.jsx`

**Interfaces:**
- Produces:
  - Visual Kanban Board with *To Do*, *In Progress*, *In Review*, *Done* columns and drag-or-click status updating.
  - Searchable Task Modal using `Select2` for Project and Assignee selection.
  - Notes management page with category filtering (*Meeting*, *Architecture*, *General*), live markdown preview, and search.

- [ ] **Step 1: Implement `TasksPage.jsx` with Kanban board & list view toggle**
- [ ] **Step 2: Implement `TaskModal.jsx` with Select2 inputs and priority badges**
- [ ] **Step 3: Implement `NotesPage.jsx` with category tabs and markdown rendering**
- [ ] **Step 4: Implement `NoteModal.jsx` for creating/editing documentation**
- [ ] **Step 5: Verify task movements and note creations**
- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/TasksPage.jsx frontend/src/components/TaskModal.jsx frontend/src/pages/NotesPage.jsx frontend/src/components/NoteModal.jsx
git commit -m "feat: implement tasks kanban board and notes documentation"
```

---

### Task 10: Frontend Dual-Mode Timesheet & Attendance Module

**Files:**
- Create: `frontend/src/pages/TimesheetsPage.jsx`
- Create: `frontend/src/components/ConsultantUploadSection.jsx`
- Create: `frontend/src/components/InternalLogSection.jsx`
- Create: `frontend/src/components/TimesheetReviewModal.jsx`
- Create: `frontend/src/pages/AttendancePage.jsx`

**Interfaces:**
- Produces:
  - Consultant Timesheet tab: Download official template button, drag-and-drop file upload, extracted row preview table, total hours sum, and submit button.
  - Internal Timesheet tab: Live stopwatch widget, daily log entry form, and historical table.
  - Timesheet Review queue for PM/Finance with SweetAlert2 approve/reject confirmation.
  - Attendance page: Interactive Clock-In / Clock-Out widget with WFO/WFH selector, late status indicator, and monthly attendance calendar/table.

- [ ] **Step 1: Implement `ConsultantUploadSection.jsx` with file dropzone and preview**
- [ ] **Step 2: Implement `InternalLogSection.jsx` with live timer and quick log form**
- [ ] **Step 3: Implement `TimesheetReviewModal.jsx` for PM/Admin review**
- [ ] **Step 4: Implement `TimesheetsPage.jsx` unifying dual-mode tabs**
- [ ] **Step 5: Implement `AttendancePage.jsx` with clock-in/out buttons and monthly history table**
- [ ] **Step 6: Test consultant upload and internal logging**
- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/TimesheetsPage.jsx frontend/src/components/ frontend/src/pages/AttendancePage.jsx
git commit -m "feat: implement dual-mode timesheets and attendance frontend"
```

---

### Task 11: Frontend Incident Ticketing & Caretaker Management

**Files:**
- Create: `frontend/src/pages/TicketsPage.jsx`
- Create: `frontend/src/components/TicketModal.jsx`
- Create: `frontend/src/components/TicketDetailModal.jsx`

**Interfaces:**
- Produces:
  - Open Ticket Pool tab (unassigned issues) and My Assigned Tickets tab (for Caretakers).
  - Create Ticket form with severity selector and file/screenshot upload.
  - Caretaker assignment modal using `Select2` to pick or assign caretaker member.
  - Ticket detail view with status progression buttons (`Open` -> `InProgress` -> `Resolved` -> `Closed`) and resolution discussion timeline.

- [ ] **Step 1: Implement `TicketModal.jsx` for submitting issues with severity levels**
- [ ] **Step 2: Implement `TicketsPage.jsx` with Open Pool tab, Caretaker tab, and filter controls**
- [ ] **Step 3: Implement `TicketDetailModal.jsx` with Caretaker claim/assign button, status updates, and comments**
- [ ] **Step 4: Test ticket creation, caretaker claim, and status lifecycle**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/TicketsPage.jsx frontend/src/components/TicketModal.jsx frontend/src/components/TicketDetailModal.jsx
git commit -m "feat: implement ticketing and caretaker management frontend"
```

---

### Task 12: Frontend Reports & Analytics Dashboard

**Files:**
- Create: `frontend/src/pages/ReportsPage.jsx`
- Create: `frontend/src/pages/DashboardPage.jsx`

**Interfaces:**
- Produces:
  - Executive Dashboard with summary stats (Active Tasks, Burn Hours, Open Tickets, Today's Attendance status).
  - Reports Page with bar/progress comparisons (Internal vs Consultant hours), ticket resolution times, attendance percentages, and CSV/Excel Export download buttons.

- [ ] **Step 1: Implement `DashboardPage.jsx` with quick action widgets and stats**
- [ ] **Step 2: Implement `ReportsPage.jsx` with interactive metric cards, breakdown tables, and export handlers**
- [ ] **Step 3: Verify export downloads and dashboard stats**
- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DashboardPage.jsx frontend/src/pages/ReportsPage.jsx
git commit -m "feat: implement dashboard and reports analytics frontend"
```

---

### Task 13: End-to-End Integration, Docker Verification & Walkthrough

**Files:**
- Create: `README.md`
- Create: `start.bat` / `start.sh`

**Interfaces:**
- Produces: Verified working full-stack project, end-to-end integration verified, and complete user walkthrough documentation.

- [ ] **Step 1: Verify Docker MySQL container runs and connects successfully**
- [ ] **Step 2: Verify ASP.NET Core API builds, runs, seeds database, and Swagger displays all endpoints**
- [ ] **Step 3: Verify Vite React SPA compiles without errors and connects to API**
- [ ] **Step 4: Perform end-to-end test of core workflows: Login -> Onboarding -> Tasks -> Notes -> Timesheets -> Attendance -> Tickets -> Reports**
- [ ] **Step 5: Write comprehensive `README.md` with instructions and `start.bat` startup script**
- [ ] **Step 6: Commit**

```bash
git add README.md start.bat
git commit -m "docs: add startup script and project readme"
```
