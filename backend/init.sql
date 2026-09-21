-- Project Management Database Initialization Script
CREATE DATABASE IF NOT EXISTS `project_management_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `project_management_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `Users` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `FullName` VARCHAR(150) NOT NULL,
    `Email` VARCHAR(150) NOT NULL UNIQUE,
    `PasswordHash` VARCHAR(255) NOT NULL,
    `Role` VARCHAR(50) NOT NULL, -- Admin, ProjectManager, Caretaker, InternalEmployee, Consultant
    `EmploymentType` VARCHAR(50) NOT NULL, -- Internal, Consultant
    `Status` VARCHAR(50) NOT NULL DEFAULT 'PendingApproval', -- PendingApproval, Active, Inactive, Rejected
    `CompanyOrAgency` VARCHAR(150) NULL,
    `HourlyRate` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `AvatarUrl` VARCHAR(255) NULL,
    `OnboardingCompleted` BOOLEAN NOT NULL DEFAULT FALSE,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS `Projects` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `Name` VARCHAR(150) NOT NULL,
    `Code` VARCHAR(50) NOT NULL UNIQUE,
    `Description` TEXT NOT NULL,
    `ClientName` VARCHAR(150) NOT NULL,
    `StartDate` DATE NOT NULL,
    `EndDate` DATE NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, OnHold, Completed
    `Budget` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `CreatedByUserId` INT NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`CreatedByUserId`) REFERENCES `Users`(`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Project Members Table
CREATE TABLE IF NOT EXISTS `ProjectMembers` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `ProjectId` INT NOT NULL,
    `UserId` INT NOT NULL,
    `RoleInProject` VARCHAR(50) NOT NULL DEFAULT 'Member', -- Manager, Lead, Developer, Consultant, CaretakerLead, CaretakerMember
    `JoinedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`ProjectId`) REFERENCES `Projects`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`UserId`) REFERENCES `Users`(`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS `Tasks` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `ProjectId` INT NOT NULL,
    `Title` VARCHAR(200) NOT NULL,
    `Description` TEXT NOT NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Todo', -- Todo, InProgress, InReview, Done
    `Priority` VARCHAR(50) NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Urgent
    `AssigneeId` INT NULL,
    `DueDate` DATE NULL,
    `EstimatedHours` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`ProjectId`) REFERENCES `Projects`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`AssigneeId`) REFERENCES `Users`(`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Notes Table
CREATE TABLE IF NOT EXISTS `Notes` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `ProjectId` INT NULL,
    `Title` VARCHAR(200) NOT NULL,
    `Content` LONGTEXT NOT NULL,
    `Category` VARCHAR(50) NOT NULL DEFAULT 'General', -- Meeting, Architecture, Guide, General
    `CreatedByUserId` INT NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL,
    FOREIGN KEY (`ProjectId`) REFERENCES `Projects`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`CreatedByUserId`) REFERENCES `Users`(`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Timesheets Table
CREATE TABLE IF NOT EXISTS `Timesheets` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `UserId` INT NOT NULL,
    `ProjectId` INT NOT NULL,
    `PeriodMonth` INT NOT NULL,
    `PeriodYear` INT NOT NULL,
    `SubmissionType` VARCHAR(50) NOT NULL, -- InternalDaily, ConsultantMonthlyUpload
    `UploadedFilePath` VARCHAR(255) NULL,
    `OriginalFileName` VARCHAR(255) NULL,
    `TotalHours` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Submitted, Approved, Rejected
    `ReviewerId` INT NULL,
    `ReviewNotes` TEXT NULL,
    `SubmittedAt` DATETIME NULL,
    `ReviewedAt` DATETIME NULL,
    FOREIGN KEY (`UserId`) REFERENCES `Users`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`ProjectId`) REFERENCES `Projects`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`ReviewerId`) REFERENCES `Users`(`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Timesheet Entries Table
CREATE TABLE IF NOT EXISTS `TimesheetEntries` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `TimesheetId` INT NOT NULL,
    `Date` DATE NOT NULL,
    `Hours` DECIMAL(5, 2) NOT NULL,
    `TaskId` INT NULL,
    `ActivityDescription` TEXT NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`TimesheetId`) REFERENCES `Timesheets`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`TaskId`) REFERENCES `Tasks`(`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Attendances Table
CREATE TABLE IF NOT EXISTS `Attendances` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `UserId` INT NOT NULL,
    `Date` DATE NOT NULL,
    `ClockInTime` DATETIME NOT NULL,
    `ClockOutTime` DATETIME NULL,
    `WorkMode` VARCHAR(50) NOT NULL DEFAULT 'WFO', -- WFO, WFH
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Present', -- Present, Late, Sick, Leave, Alpha
    `LocationNotes` VARCHAR(200) NULL,
    `Notes` TEXT NULL,
    FOREIGN KEY (`UserId`) REFERENCES `Users`(`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Tickets Table
CREATE TABLE IF NOT EXISTS `Tickets` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `TicketNumber` VARCHAR(50) NOT NULL UNIQUE,
    `ProjectId` INT NOT NULL,
    `Title` VARCHAR(200) NOT NULL,
    `Description` TEXT NOT NULL,
    `Severity` VARCHAR(50) NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Critical
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Open', -- Open, InProgress, InReview, Resolved, Closed
    `ReportedByUserId` INT NOT NULL,
    `AssignedCaretakerId` INT NULL,
    `AttachmentUrl` VARCHAR(255) NULL,
    `ResolutionNotes` TEXT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ResolvedAt` DATETIME NULL,
    FOREIGN KEY (`ProjectId`) REFERENCES `Projects`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`ReportedByUserId`) REFERENCES `Users`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`AssignedCaretakerId`) REFERENCES `Users`(`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Ticket Comments Table
CREATE TABLE IF NOT EXISTS `TicketComments` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `TicketId` INT NOT NULL,
    `UserId` INT NOT NULL,
    `Comment` TEXT NOT NULL,
    `AttachmentUrl` VARCHAR(255) NULL,
    `StatusChange` VARCHAR(50) NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`TicketId`) REFERENCES `Tickets`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`UserId`) REFERENCES `Users`(`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
