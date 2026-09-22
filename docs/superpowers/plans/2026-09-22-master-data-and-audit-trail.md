# Master Data, Project Color, and Audit Trail Line Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive Master Data module (managing Projects, Categories, Priorities, Milestones, User Types, and Project Types), add customizable Project Colors with visual impact on Kanban task cards, and enhance the Audit Trail page with an interactive SVG line chart and multi-criteria filtering.

**Architecture:** Hybrid Master Data model with a flexible `MasterDataItems` table for dynamic lookups, extended `Project` model with `Color` and `ProjectType`, and an aggregated `/api/audit-logs/trend` endpoint feeding a lightweight, interactive SVG Line Chart with tooltips in React.

**Tech Stack:** ASP.NET Core 8 Web API, EF Core 8 (SQLite/MySQL), Vite + React 18, Vanilla CSS, Lucide React, SweetAlert2.

**Spec:** [docs/superpowers/specs/2026-09-22-master-data-and-audit-trail-design.md](file:///c:/TEMP/VSCODE/ProjectManagement/docs/superpowers/specs/2026-09-22-master-data-and-audit-trail-design.md)

## Global Constraints
- Do not introduce heavy chart libraries (like chart.js/recharts); use a responsive, clean, pure SVG Line Chart component for zero-bundle overhead and maximum performance.
- Project colors must be valid hex values (e.g. `#4f46e5`, `#10b981`, `#f59e0b`, `#ef4444`, `#8b5cf6`, `#06b6d4`, `#ec4899`).
- Kanban task cards must reflect the project color on their border-left accent (4px solid) and project badge.
- Master Data must be protected for `Admin` and `ProjectManager` roles.

---

### Task 1: Backend Models and DbContext Updates

**Files:**
- Create: `backend/Models/MasterData.cs`
- Modify: `backend/Models/Project.cs:30-40`
- Modify: `backend/Data/AppDbContext.cs:20-35`, `140-190`
- Modify: `backend/Program.cs:140-170`

**Interfaces:**
- Produces: `MasterDataItem` entity (`Id`, `Type`, `Code`, `Name`, `Description`, `BadgeColor`, `SortOrder`, `IsActive`, `CreatedAt`)
- Produces: `Project.Color`, `Project.ProjectType`

- [ ] **Step 1: Create `backend/Models/MasterData.cs`**

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Api.Models
{
    public class MasterDataItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // Category, Priority, Milestone, UserType, ProjectType

        [Required]
        [MaxLength(100)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string? BadgeColor { get; set; }

        public int SortOrder { get; set; } = 0;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
```

- [ ] **Step 2: Add `ProjectType` and `Color` to `backend/Models/Project.cs`**

```csharp
        [MaxLength(50)]
        public string ProjectType { get; set; } = "New Application";

        [MaxLength(20)]
        public string Color { get; set; } = "#4f46e5";
```

- [ ] **Step 3: Register `DbSet<MasterDataItem>` and Seed Initial Master Data in `AppDbContext.cs`**
Add `public DbSet<MasterDataItem> MasterDataItems => Set<MasterDataItem>();` to `AppDbContext.cs` and configure initial seeds in `SeedData()`.

- [ ] **Step 4: Ensure SQLite tables and columns exist in `backend/Program.cs`**
Add safety `CREATE TABLE IF NOT EXISTS MasterDataItems` and `ALTER TABLE Projects ADD COLUMN ProjectType` / `ALTER TABLE Projects ADD COLUMN Color` in the startup script.

- [ ] **Step 5: Verify build compiles**
Run `dotnet build backend/ProjectManagement.Api.csproj` to confirm 0 errors.

---

### Task 2: Backend Master Data Controller and DTOs

**Files:**
- Create: `backend/DTOs/MasterDataDtos.cs`
- Create: `backend/Controllers/MasterDataController.cs`
- Modify: `backend/DTOs/ProjectTaskNoteDtos.cs` (add `Color`, `ProjectType` to Project DTOs and `ProjectColor` to `TaskResponseDto`)
- Modify: `backend/Controllers/TasksController.cs:50-70` (map `ProjectColor = t.Project != null ? t.Project.Color : "#4f46e5"`)

**Interfaces:**
- Produces: `GET /api/master-data`, `POST /api/master-data`, `PUT /api/master-data/{id}`, `DELETE /api/master-data/{id}`
- Produces: `TaskResponseDto.ProjectColor`

- [ ] **Step 1: Create `backend/DTOs/MasterDataDtos.cs`**
Define `CreateMasterDataDto`, `UpdateMasterDataDto`, `MasterDataResponseDto`.

- [ ] **Step 2: Update `ProjectTaskNoteDtos.cs` and `TasksController.cs`**
Include `Color` and `ProjectType` in `CreateProjectDto`, `ProjectResponseDto`, and `ProjectColor` in `TaskResponseDto`.

- [ ] **Step 3: Create `backend/Controllers/MasterDataController.cs`**
Implement full CRUD endpoints with `[Authorize(Roles = "Admin,ProjectManager")]`, SignalR broadcast `MasterDataUpdated`, and Audit Logging.

- [ ] **Step 4: Test MasterData API endpoints via PowerShell**
Verify `GET /api/master-data` returns default seeded categories, priorities, milestones, user types, and project types.

---

### Task 3: Backend Audit Logs Enhancement & Trend Aggregation Endpoint

**Files:**
- Modify: `backend/Controllers/AuditLogsController.cs:20-62`

**Interfaces:**
- Produces: `GET /api/audit-logs` supporting `userName`, `module`, `severity`, `search`, `startDate`, `endDate`, `limit`
- Produces: `GET /api/audit-logs/trend` returning daily aggregated metrics: `{ success: true, data: [{ date, count, modules, users }] }`

- [ ] **Step 1: Add `/trend` endpoint in `AuditLogsController.cs`**
Group logs by date formatted `yyyy-MM-dd` within the requested date range, counting total occurrences and module breakdown.

- [ ] **Step 2: Test `/trend` endpoint**
Verify endpoint returns valid JSON timeline data.

---

### Task 4: Frontend Master Data Management Page (`MasterDataPage.jsx`)

**Files:**
- Create: `frontend/src/pages/MasterDataPage.jsx`
- Modify: `frontend/src/components/Sidebar.jsx` (add "Master Data" navigation link)
- Modify: `frontend/src/App.jsx` (add `/master-data` route)

**Interfaces:**
- Consumes: `/api/master-data`, `/api/projects`
- Produces: Dynamic 6-tab interface (Projects, Categories, Priorities, Milestones, User Types, Project Types) with CRUD modals and color swatches.

- [ ] **Step 1: Implement `MasterDataPage.jsx`**
Build tabbed navigation with:
- Proyek tab (with project color picker, client, budget, project type, status)
- Kategori tab (task/document categories)
- Prioritas tab (priority levels with badge color selector)
- Milestone tab (milestone phases)
- Jenis User tab (user roles)
- Tipe Project tab (project classifications)

- [ ] **Step 2: Connect routes and sidebar**
Add icon and link in `Sidebar.jsx` for Admin and PM, add route in `App.jsx`.

---

### Task 5: Integrate Project Color into Kanban Task Cards (`TasksPage.jsx`)

**Files:**
- Modify: `frontend/src/pages/TasksPage.jsx:240-275`

**Interfaces:**
- Consumes: `task.projectColor`, `task.projectName`
- Produces: Visual 4px solid left-border accent with `task.projectColor`, and stylish tinted badge pill for the project name.

- [ ] **Step 1: Update task card rendering in `TasksPage.jsx`**
Apply `borderLeft: '4px solid ' + (task.projectColor || '#4f46e5')` and project badge with matching color.

- [ ] **Step 2: Verify in browser dev server**
Ensure task cards clearly show their project color and project code.

---

### Task 6: Audit Trail Interactive Line Chart and Filters (`AuditTrailPage.jsx`)

**Files:**
- Modify: `frontend/src/pages/AuditTrailPage.jsx`

**Interfaces:**
- Consumes: `/api/audit-logs`, `/api/audit-logs/trend`
- Produces: Interactive SVG Line Chart with smooth curve, gradient fill, interactive points, hover tooltips, summary metric cards, and filter controls (User, Module, Date Range presets).

- [ ] **Step 1: Create `AuditLineChart` component inside `AuditTrailPage.jsx`**
Render smooth bezier curve `<path d="..." />`, `<linearGradient>`, data dots with `<circle>`, and hover tooltip displaying date, count, and module tags.

- [ ] **Step 2: Add Filter Controls**
Add User dropdown, Module dropdown, Date Range (`startDate`, `endDate`), and preset buttons ("Hari Ini", "7 Hari", "30 Hari", "Semua").

- [ ] **Step 3: Connect chart and table filtering**
Selecting a date range or filter updates both the line chart trend and the audit log table synchronously.

---

### Task 7: End-to-End Verification and Validation

- [ ] **Step 1: Compile backend and frontend**
Run `dotnet build` and `npm run build` to verify 0 errors.

- [ ] **Step 2: Test Master Data CRUD operations**
Create a new project with a custom color (e.g. `#10b981` Emerald), add a new Category, and add a new Priority.

- [ ] **Step 3: Test Kanban Color Impact**
Create a task under the new project and verify it displays the `#10b981` left border accent on the Kanban board.

- [ ] **Step 4: Test Audit Trail Chart and Filters**
Perform actions in Master Data, open Audit Trail, verify the Line Chart reflects the new activity events, and test date range and module filtering.
