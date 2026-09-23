using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using ClosedXML.Excel;
using ProjectManagement.Api.DTOs;
using ProjectManagement.Api.Models;

namespace ProjectManagement.Api.Services
{
    public class ParsedTaskItem
    {
        public string ProjectName { get; set; } = string.Empty;
        public TaskItem Task { get; set; } = null!;
        public string SheetName { get; set; } = string.Empty;
        public string? DeveloperOrPicName { get; set; }
    }

    public class ExcelImportPackage
    {
        public List<ParsedTaskItem> Tasks { get; set; } = new();
        public List<User> NewUsersToCreate { get; set; } = new();
        public List<string> SkippedSheets { get; set; } = new();
        public List<string> ProcessedSheets { get; set; } = new();
        public List<string> UserSheets { get; set; } = new();
        public int SkippedTasksCount { get; set; } = 0;
        public List<string> SkippedReasons { get; set; } = new();
        public int IncompleteTasksCount { get; set; } = 0;
        public List<string> IncompleteReasons { get; set; } = new();
        public int DuplicateTasksCount { get; set; } = 0;
        public List<string> DuplicateReasons { get; set; } = new();
    }

    public interface ITaskExcelImportService
    {
        List<TaskItem> ParseTasksFromExcel(Stream fileStream, int targetProjectId, List<User> users);
        List<ParsedTaskItem> ParseTasksWithProjectFromExcel(Stream fileStream, List<User> users, string? defaultProjectName = null);
        ExcelImportPackage ParseTasksPackageFromExcel(Stream fileStream, List<User> users, string? defaultProjectName = null);
        byte[] GenerateTemplateExcel();
        byte[] GenerateTasksExportExcel(List<TaskResponseDto> tasks, string? filterSummary = null);
        byte[] GenerateTasksExportCsv(List<TaskResponseDto> tasks);
    }

    public class TaskExcelImportService : ITaskExcelImportService
    {
        public List<TaskItem> ParseTasksFromExcel(Stream fileStream, int targetProjectId, List<User> users)
        {
            var package = ParseTasksPackageFromExcel(fileStream, users);
            foreach (var item in package.Tasks)
            {
                item.Task.ProjectId = targetProjectId;
            }
            return package.Tasks.Select(p => p.Task).ToList();
        }

        public List<ParsedTaskItem> ParseTasksWithProjectFromExcel(Stream fileStream, List<User> users, string? defaultProjectName = null)
        {
            return ParseTasksPackageFromExcel(fileStream, users, defaultProjectName).Tasks;
        }

        public static readonly string[] ExpectedExcelHeaders = new[]
        {
            "No.",
            "project_name",
            "requirement_code",
            "title",
            "status",
            "priority",
            "jenis_task",
            "module_name",
            "bug_type",
            "progress",
            "start_date",
            "due_date",
            "completed_date",
            "developer_emails",
            "ba_emails",
            "infra_emails",
            "master_data_emails",
            "tester_emails",
            "technical_writer_emails",
            "quality_assurance_emails",
            "system_analyst_emails",
            "kendala",
            "solusi",
            "evidence",
            "kode_task"
        };

        private static string NormalizeHeader(string header)
        {
            if (string.IsNullOrWhiteSpace(header)) return string.Empty;
            return new string(header.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
        }

        private static string GenerateEmailFromName(string fullName, IEnumerable<User> existingUsers)
        {
            var clean = new string(fullName.Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c)).ToArray()).Trim();
            var words = clean.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            string baseSlug;
            if (words.Length == 1)
                baseSlug = words[0].ToLowerInvariant();
            else if (words.Length >= 2)
                baseSlug = $"{words[0].ToLowerInvariant()}.{words[1].ToLowerInvariant()}";
            else
                baseSlug = "user";

            var candidate = $"{baseSlug}@projectmgmt.local";
            int counter = 1;
            while (existingUsers.Any(u => u.Email.Equals(candidate, StringComparison.OrdinalIgnoreCase)))
            {
                candidate = $"{baseSlug}{counter++}@projectmgmt.local";
            }
            return candidate;
        }

        private static string CleanNameFromEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return "User Baru";
            var prefix = email.Split('@')[0];
            var parts = prefix.Split(new[] { '.', '_', '-' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return prefix;
            return string.Join(" ", parts.Select(p => CultureInfo.CurrentCulture.TextInfo.ToTitleCase(p.ToLowerInvariant())));
        }

        private static string MapRole(string? roleStr)
        {
            if (string.IsNullOrWhiteSpace(roleStr)) return "InternalEmployee";
            var lower = roleStr.Trim().ToLowerInvariant();
            if (lower.Contains("admin")) return "Admin";
            if (lower.Contains("manager") || lower.Contains("pm") || lower.Contains("lead")) return "ProjectManager";
            if (lower.Contains("caretaker")) return "Caretaker";
            if (lower.Contains("consultant") || lower.Contains("konsultan") || lower.Contains("vendor") || lower.Contains("external")) return "Consultant";
            return "InternalEmployee";
        }

        private static bool IsPersonName(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return false;
            name = name.Trim();
            var lower = name.ToLowerInvariant();
            var systemWords = new[] { 
                "sheet", "task", "tugas", "project", "proyek", "dashboard", "info", "informasi",
                "summary", "ringkasan", "cover", "petunjuk", "panduan", "readme", "instruction",
                "keterangan", "rekap", "data", "export", "import", "master", "milestone", "category",
                "mobile", "banking", "crm", "system", "sistem", "app", "apps", "aplikasi", "portal",
                "web", "website", "service", "services", "api", "backend", "frontend", "database",
                "infra", "infrastructure", "client", "server", "core", "integration", "gateway"
            };
            if (systemWords.Any(w => lower.Contains(w))) return false;

            if (!name.All(c => char.IsLetter(c) || char.IsWhiteSpace(c) || c == '.' || c == '\'')) return false;

            var words = name.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            return words.Length >= 2 && words.Length <= 4;
        }

        private static bool IsInfoOrDashboardSheet(IXLWorksheet worksheet, List<IXLRangeRow>? rows, Dictionary<string, int> headerMap)
        {
            var lower = worksheet.Name.Trim().ToLowerInvariant();
            var infoKeywords = new[] {
                "dashboard", "info", "informasi", "overview", "summary", "ringkasan", 
                "cover", "petunjuk", "panduan", "readme", "instruction", "keterangan", 
                "catatan", "rekap", "statistic", "statistik", "baca saya"
            };

            if (infoKeywords.Any(k => lower.Contains(k))) return true;

            if (rows == null || rows.Count <= 1) return true;

            bool hasTaskHeader = headerMap.ContainsKey("title") || 
                                 headerMap.ContainsKey("namatask") || 
                                 headerMap.ContainsKey("tasktitle") || 
                                 headerMap.ContainsKey("kodetask") || 
                                 headerMap.ContainsKey("projectname") ||
                                 headerMap.ContainsKey("namaproject");

            bool hasUserHeader = headerMap.ContainsKey("nama") || 
                                 headerMap.ContainsKey("fullname") || 
                                 headerMap.ContainsKey("namalengkap") ||
                                 headerMap.ContainsKey("namaorang");

            return !hasTaskHeader && !hasUserHeader;
        }

        private static bool IsUserSheet(IXLWorksheet worksheet, Dictionary<string, int> headerMap)
        {
            var lower = worksheet.Name.Trim().ToLowerInvariant();
            var userSheetKeywords = new[] { 
                "user", "users", "team", "tim", "anggota", "member", "members", 
                "pic", "personil", "personnel", "karyawan", "employee", "employees", 
                "daftar tim", "daftar user", "data user", "data personil", "nama orang" 
            };

            if (userSheetKeywords.Any(k => lower.Contains(k))) return true;

            bool hasNameCol = headerMap.ContainsKey("nama") || headerMap.ContainsKey("name") || 
                              headerMap.ContainsKey("fullname") || headerMap.ContainsKey("namalengkap") ||
                              headerMap.ContainsKey("namapersonil") || headerMap.ContainsKey("personil");

            bool hasTaskSpecificCol = headerMap.ContainsKey("requirementcode") || 
                                      headerMap.ContainsKey("bugtype") || 
                                      headerMap.ContainsKey("kodetask");

            return hasNameCol && !hasTaskSpecificCol;
        }

        public ExcelImportPackage ParseTasksPackageFromExcel(Stream fileStream, List<User> users, string? defaultProjectName = null)
        {
            var package = new ExcelImportPackage();
            var workingUsers = new List<User>(users ?? new List<User>());

            XLWorkbook workbook;
            try
            {
                workbook = new XLWorkbook(fileStream);
            }
            catch (Exception ex)
            {
                throw new InvalidDataException("Berkas yang diunggah bukan merupakan berkas Excel (.xlsx / .xls) yang valid atau berkas mengalami kerusakan (corrupted).", ex);
            }

            using (workbook)
            {
                // Helper to safely get cell string
                string GetCellString(IXLRangeRow row, int col)
                {
                    if (col <= 0) return string.Empty;
                    try
                    {
                        var cell = row.Cell(col);
                        var str = cell.GetString().Trim();
                        if (string.IsNullOrEmpty(str))
                        {
                            str = cell.GetFormattedString().Trim();
                        }
                        return str;
                    }
                    catch
                    {
                        return string.Empty;
                    }
                }

                // Helper to find or auto-create user
                User EnsureUserExists(string rawNameOrEmail, string? roleHint = null)
                {
                    var token = rawNameOrEmail.Trim();
                    bool isEmail = token.Contains("@");

                    var existing = workingUsers.FirstOrDefault(u =>
                        (isEmail && u.Email.Equals(token, StringComparison.OrdinalIgnoreCase)) ||
                        (!isEmail && (u.FullName.Equals(token, StringComparison.OrdinalIgnoreCase) ||
                                      u.FullName.IndexOf(token, StringComparison.OrdinalIgnoreCase) >= 0 ||
                                      token.IndexOf(u.FullName, StringComparison.OrdinalIgnoreCase) >= 0)));

                    if (existing != null) return existing;

                    var fullName = isEmail ? CleanNameFromEmail(token) : token;
                    var email = isEmail ? token : GenerateEmailFromName(fullName, workingUsers);

                    var newUser = new User
                    {
                        FullName = fullName.Length > 150 ? fullName.Substring(0, 150) : fullName,
                        Email = email.Length > 150 ? email.Substring(0, 150) : email,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
                        Role = MapRole(roleHint),
                        EmploymentType = "Internal",
                        Status = "Active",
                        OnboardingCompleted = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    workingUsers.Add(newUser);
                    package.NewUsersToCreate.Add(newUser);
                    return newUser;
                }

                int sheetIndex = 0;
                foreach (var worksheet in workbook.Worksheets)
                {
                    sheetIndex++;
                    var rows = worksheet.RangeUsed()?.RowsUsed()?.ToList();

                    // Map headers of this sheet
                    var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    var firstRow = rows?.FirstOrDefault();
                    if (firstRow != null)
                    {
                        foreach (var cell in firstRow.CellsUsed())
                        {
                            var rawVal = cell.GetString().Trim();
                            var normVal = NormalizeHeader(rawVal);
                            if (!string.IsNullOrEmpty(normVal) && !headerMap.ContainsKey(normVal))
                            {
                                headerMap[normVal] = cell.Address.ColumnNumber;
                            }
                        }
                    }

                    int GetCol(params string[] aliases)
                    {
                        foreach (var alias in aliases)
                        {
                            var normAlias = NormalizeHeader(alias);
                            if (headerMap.TryGetValue(normAlias, out var col))
                                return col;
                            
                            var key = headerMap.Keys.FirstOrDefault(k => k.Contains(normAlias) || normAlias.Contains(k));
                            if (key != null) return headerMap[key];
                        }
                        return -1;
                    }

                    // 1. Check if this sheet is an Information / Dashboard sheet -> SKIP
                    if (IsInfoOrDashboardSheet(worksheet, rows, headerMap))
                    {
                        package.SkippedSheets.Add(worksheet.Name);
                        continue;
                    }

                    if (rows == null || rows.Count <= 1)
                    {
                        package.SkippedSheets.Add(worksheet.Name);
                        continue;
                    }

                    // 2. Check if this sheet contains User / Team Personil Information -> AUTO-CREATE USERS
                    if (IsUserSheet(worksheet, headerMap))
                    {
                        package.UserSheets.Add(worksheet.Name);
                        package.ProcessedSheets.Add($"{worksheet.Name} (Daftar Pengguna/Tim)");

                        int colName = GetCol("nama", "name", "full_name", "nama_lengkap", "nama personil", "personil", "anggota");
                        int colEmail = GetCol("email", "surel", "e-mail");
                        int colRole = GetCol("role", "jabatan", "peran", "posisi");
                        int colPhone = GetCol("phone", "no_hp", "telepon", "handphone");
                        int colCompany = GetCol("company", "instansi", "perusahaan", "divisi");

                        bool isFirst = true;
                        foreach (var row in rows)
                        {
                            if (isFirst) { isFirst = false; continue; }

                            var nameVal = colName > 0 ? GetCellString(row, colName) : string.Empty;
                            var emailVal = colEmail > 0 ? GetCellString(row, colEmail) : string.Empty;
                            var roleVal = colRole > 0 ? GetCellString(row, colRole) : string.Empty;
                            var phoneVal = colPhone > 0 ? GetCellString(row, colPhone) : string.Empty;
                            var compVal = colCompany > 0 ? GetCellString(row, colCompany) : string.Empty;

                            if (string.IsNullOrWhiteSpace(nameVal) && string.IsNullOrWhiteSpace(emailVal))
                                continue;

                            var targetToken = !string.IsNullOrWhiteSpace(emailVal) ? emailVal : nameVal;
                            var user = EnsureUserExists(targetToken, roleVal);
                            if (!string.IsNullOrWhiteSpace(nameVal) && user.FullName == "User Baru")
                            {
                                user.FullName = nameVal;
                            }
                            if (!string.IsNullOrWhiteSpace(phoneVal)) user.PhoneNumber = phoneVal;
                            if (!string.IsNullOrWhiteSpace(compVal)) user.CompanyOrAgency = compVal;
                        }

                        // Done parsing user sheet, proceed to next sheet
                        continue;
                    }

                    // 3. Process Task Sheet
                    package.ProcessedSheets.Add(worksheet.Name);

                    // Check if worksheet name itself represents a Person's Name (e.g. "Budi Santoso", "Siti Rahma")
                    User? sheetAssignedUser = null;
                    if (IsPersonName(worksheet.Name))
                    {
                        sheetAssignedUser = EnsureUserExists(worksheet.Name, "InternalEmployee");
                    }

                    int colNo = GetCol("No.", "No");
                    int colProject = GetCol("project_name", "project name", "nama project", "nama proyek", "project", "proyek");
                    int colReqCode = GetCol("requirement_code", "requirement code", "req code", "no requirement");
                    int colTitle = GetCol("title", "nama task", "task title", "task name", "judul", "uraian", "nama", "deskripsi");
                    int colStatus = GetCol("status", "task status");
                    int colPriority = GetCol("priority", "prioritas");
                    int colJenisTask = GetCol("jenis_task", "jenis task", "kategori", "category", "tipe task");
                    int colModuleName = GetCol("module_name", "module name", "nama modul", "modul", "milestone", "milestone sdlc");
                    int colBugType = GetCol("bug_type", "bug type", "tipe bug", "jenis bug");
                    int colProgress = GetCol("progress", "progres", "progress (%)", "kemajuan");
                    int colStartDate = GetCol("start_date", "start date", "tanggal mulai", "tgl mulai", "mulai");
                    int colDueDate = GetCol("due_date", "due date", "deadline", "tanggal berakhir", "tgl berakhir", "target selesai");
                    int colCompletedDate = GetCol("completed_date", "completed date", "tanggal selesai", "tgl selesai", "selesai");
                    int colDevEmails = GetCol("developer_emails", "developer emails", "developer email", "developer", "dev emails", "programmer", "pic", "assignee");
                    int colBaEmails = GetCol("ba_emails", "ba emails", "ba email", "business analyst");
                    int colInfraEmails = GetCol("infra_emails", "infra emails", "infra email", "infrastructure", "devops");
                    int colMasterDataEmails = GetCol("master_data_emails", "master data emails", "master data", "masterdata");
                    int colTesterEmails = GetCol("tester_emails", "tester emails", "tester email", "tester", "manual tester");
                    int colTechWriterEmails = GetCol("technical_writer_emails", "technical writer emails", "technical writer", "tech writer", "writer");
                    int colQaEmails = GetCol("quality_assurance_emails", "quality assurance emails", "qa emails", "quality assurance", "qa");
                    int colSaEmails = GetCol("system_analyst_emails", "system analyst emails", "sa emails", "system analyst", "sa");
                    int colKendala = GetCol("kendala", "hambatan", "blocker", "issue", "issues");
                    int colSolusi = GetCol("solusi", "solution", "penanganan", "catatan");
                    int colEvidence = GetCol("evidence", "bukti", "lampiran", "referensi", "attachment");
                    int colKodeTask = GetCol("kode_task", "kode task", "task code", "kode");

                    bool isHeader = true;
                    string lastSeenProject = string.Empty;

                    foreach (var row in rows)
                    {
                        if (isHeader)
                        {
                            isHeader = false;
                            continue;
                        }

                        var title = GetCellString(row, colTitle);
                        if (string.IsNullOrWhiteSpace(title))
                        {
                            title = GetCellString(row, 4);
                            if (string.IsNullOrWhiteSpace(title)) title = GetCellString(row, 3);
                            if (string.IsNullOrWhiteSpace(title)) title = GetCellString(row, 1);
                        }
                        
                        // Jika penamaan task tidak tersedia (data tidak lengkap) -> lewati (skip)
                        if (string.IsNullOrWhiteSpace(title) || title == "-" || title.Equals("n/a", StringComparison.OrdinalIgnoreCase) || title.Equals("none", StringComparison.OrdinalIgnoreCase))
                        {
                            package.SkippedTasksCount++;
                            package.IncompleteTasksCount++;
                            var reason = $"Baris pada sheet '{worksheet.Name}' dilewati karena data judul/nama tugas tidak lengkap atau kosong.";
                            package.SkippedReasons.Add(reason);
                            package.IncompleteReasons.Add(reason);
                            continue;
                        }

                        var projInFile = colProject > 0 ? GetCellString(row, colProject) : GetCellString(row, 2);
                        if (string.IsNullOrWhiteSpace(projInFile)) projInFile = GetCellString(row, 2);

                        // Jika penamaan project tidak tersedia di baris Excel (data tidak lengkap)
                        if (string.IsNullOrWhiteSpace(projInFile) || projInFile == "-" || projInFile.Equals("n/a", StringComparison.OrdinalIgnoreCase) || projInFile.Equals("none", StringComparison.OrdinalIgnoreCase))
                        {
                            if (!string.IsNullOrWhiteSpace(defaultProjectName))
                            {
                                projInFile = defaultProjectName;
                            }
                            else if (!string.IsNullOrWhiteSpace(worksheet.Name) && !worksheet.Name.StartsWith("Sheet", StringComparison.OrdinalIgnoreCase) && !IsPersonName(worksheet.Name))
                            {
                                projInFile = worksheet.Name;
                            }
                            else
                            {
                                // Penamaan project tidak lengkap / tidak tersedia -> lewati (skip)
                                package.SkippedTasksCount++;
                                package.IncompleteTasksCount++;
                                var reason = $"Tugas '{title}' pada sheet '{worksheet.Name}' dilewati karena informasi nama proyek tidak lengkap atau tidak tersedia.";
                                package.SkippedReasons.Add(reason);
                                package.IncompleteReasons.Add(reason);
                                continue;
                            }
                        }

                        var reqCode = colReqCode > 0 ? GetCellString(row, colReqCode) : string.Empty;
                        var kodeTask = colKodeTask > 0 ? GetCellString(row, colKodeTask) : string.Empty;
                        var statusStr = colStatus > 0 ? GetCellString(row, colStatus) : string.Empty;
                        var priorityStr = colPriority > 0 ? GetCellString(row, colPriority) : string.Empty;
                        var jenisTask = colJenisTask > 0 ? GetCellString(row, colJenisTask) : string.Empty;
                        var moduleName = colModuleName > 0 ? GetCellString(row, colModuleName) : string.Empty;
                        var bugType = colBugType > 0 ? GetCellString(row, colBugType) : string.Empty;
                        var progress = colProgress > 0 ? GetCellString(row, colProgress) : string.Empty;
                        var startDateStr = colStartDate > 0 ? GetCellString(row, colStartDate) : string.Empty;
                        var dueDateStr = colDueDate > 0 ? GetCellString(row, colDueDate) : string.Empty;
                        var completedDateStr = colCompletedDate > 0 ? GetCellString(row, colCompletedDate) : string.Empty;

                        var devEmails = colDevEmails > 0 ? GetCellString(row, colDevEmails) : string.Empty;
                        var baEmails = colBaEmails > 0 ? GetCellString(row, colBaEmails) : string.Empty;
                        var infraEmails = colInfraEmails > 0 ? GetCellString(row, colInfraEmails) : string.Empty;
                        var masterDataEmails = colMasterDataEmails > 0 ? GetCellString(row, colMasterDataEmails) : string.Empty;
                        var testerEmails = colTesterEmails > 0 ? GetCellString(row, colTesterEmails) : string.Empty;
                        var techWriterEmails = colTechWriterEmails > 0 ? GetCellString(row, colTechWriterEmails) : string.Empty;
                        var qaEmails = colQaEmails > 0 ? GetCellString(row, colQaEmails) : string.Empty;
                        var saEmails = colSaEmails > 0 ? GetCellString(row, colSaEmails) : string.Empty;

                        var kendala = colKendala > 0 ? GetCellString(row, colKendala) : string.Empty;
                        var solusi = colSolusi > 0 ? GetCellString(row, colSolusi) : string.Empty;
                        var evidence = colEvidence > 0 ? GetCellString(row, colEvidence) : string.Empty;

                        // Priority mapping
                        var priority = "Medium";
                        if (!string.IsNullOrWhiteSpace(priorityStr))
                        {
                            if (priorityStr.Equals("Critical", StringComparison.OrdinalIgnoreCase) || priorityStr.Equals("Urgent", StringComparison.OrdinalIgnoreCase) || priorityStr.Equals("Mendesak", StringComparison.OrdinalIgnoreCase) || priorityStr.Equals("Kritis", StringComparison.OrdinalIgnoreCase))
                                priority = "Urgent";
                            else if (priorityStr.Equals("High", StringComparison.OrdinalIgnoreCase) || priorityStr.Equals("Tinggi", StringComparison.OrdinalIgnoreCase))
                                priority = "High";
                            else if (priorityStr.Equals("Low", StringComparison.OrdinalIgnoreCase) || priorityStr.Equals("Rendah", StringComparison.OrdinalIgnoreCase))
                                priority = "Low";
                            else
                                priority = "Medium";
                        }

                        // Status mapping
                        var status = "Todo";
                        if (!string.IsNullOrWhiteSpace(statusStr))
                        {
                            if (statusStr.Equals("Done", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("Selesai", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("Completed", StringComparison.OrdinalIgnoreCase))
                                status = "Done";
                            else if (statusStr.Equals("InProgress", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("In Progress", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("Sedang Dikerjakan", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("WIP", StringComparison.OrdinalIgnoreCase))
                                status = "InProgress";
                            else if (statusStr.Equals("InReview", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("In Review", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("Review", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("QA", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("Testing", StringComparison.OrdinalIgnoreCase))
                                status = "InReview";
                            else
                                status = "Todo";
                        }

                        // Assignee matching & auto-creation
                        string? primaryPerson = null;
                        if (!string.IsNullOrWhiteSpace(devEmails) && !devEmails.Equals("-"))
                        {
                            var firstDev = devEmails.Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim();
                            if (!string.IsNullOrWhiteSpace(firstDev)) primaryPerson = firstDev;
                        }
                        else if (sheetAssignedUser != null)
                        {
                            primaryPerson = sheetAssignedUser.FullName;
                        }

                        int? assigneeId = null;
                        if (!string.IsNullOrWhiteSpace(primaryPerson))
                        {
                            var assignedUser = EnsureUserExists(primaryPerson, "InternalEmployee");
                            assigneeId = assignedUser.Id > 0 ? assignedUser.Id : (int?)null;
                        }

                        // Auto-create other role users if they are mentioned
                        void EnsureRoleUsersExist(string? emails, string roleLabel)
                        {
                            if (string.IsNullOrWhiteSpace(emails) || emails.Equals("-")) return;
                            var parts = emails.Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries);
                            foreach (var p in parts)
                            {
                                var clean = p.Trim();
                                if (!string.IsNullOrWhiteSpace(clean) && !clean.Equals("-"))
                                    EnsureUserExists(clean, roleLabel);
                            }
                        }
                        EnsureRoleUsersExist(baEmails, "ProjectManager");
                        EnsureRoleUsersExist(saEmails, "ProjectManager");
                        EnsureRoleUsersExist(qaEmails, "InternalEmployee");
                        EnsureRoleUsersExist(testerEmails, "InternalEmployee");
                        EnsureRoleUsersExist(infraEmails, "InternalEmployee");
                        EnsureRoleUsersExist(masterDataEmails, "InternalEmployee");
                        EnsureRoleUsersExist(techWriterEmails, "InternalEmployee");

                        // Start date parsing
                        DateTime? startDate = null;
                        if (!string.IsNullOrWhiteSpace(startDateStr))
                        {
                            if (DateTime.TryParse(startDateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var sd) ||
                                DateTime.TryParse(startDateStr, out sd))
                            {
                                startDate = DateTime.SpecifyKind(sd, DateTimeKind.Utc);
                            }
                        }

                        // Due date parsing
                        DateTime? dueDate = null;
                        if (!string.IsNullOrWhiteSpace(dueDateStr))
                        {
                            if (DateTime.TryParse(dueDateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ||
                                DateTime.TryParse(dueDateStr, out d))
                            {
                                dueDate = DateTime.SpecifyKind(d, DateTimeKind.Utc);
                            }
                        }

                        var finalTitle = title;
                        if (!string.IsNullOrWhiteSpace(kodeTask) && !kodeTask.Equals("-"))
                        {
                            if (!finalTitle.StartsWith($"[{kodeTask}]", StringComparison.OrdinalIgnoreCase))
                            {
                                finalTitle = $"[{kodeTask}] {finalTitle}";
                            }
                        }
                        else if (!string.IsNullOrWhiteSpace(reqCode) && !reqCode.Equals("-"))
                        {
                            if (!finalTitle.StartsWith($"[{reqCode}]", StringComparison.OrdinalIgnoreCase))
                            {
                                finalTitle = $"[{reqCode}] {finalTitle}";
                            }
                        }
                        if (finalTitle.Length > 500)
                            finalTitle = finalTitle.Substring(0, 500);

                        var descBuilder = new StringBuilder();
                        var metaTags = new List<string>();
                        if (!string.IsNullOrWhiteSpace(projInFile)) metaTags.Add($"Proyek: {projInFile}");
                        if (!string.IsNullOrWhiteSpace(kodeTask) && !kodeTask.Equals("-")) metaTags.Add($"Kode: {kodeTask}");
                        if (!string.IsNullOrWhiteSpace(reqCode) && !reqCode.Equals("-")) metaTags.Add($"Req: {reqCode}");
                        if (!string.IsNullOrWhiteSpace(jenisTask)) metaTags.Add($"Jenis: {jenisTask}");
                        if (!string.IsNullOrWhiteSpace(moduleName)) metaTags.Add($"Modul: {moduleName}");
                        if (!string.IsNullOrWhiteSpace(progress) && !progress.Equals("0")) metaTags.Add($"Progress: {progress.TrimEnd('%')}%");
                        if (!string.IsNullOrWhiteSpace(bugType) && !bugType.Equals("-")) metaTags.Add($"Bug: {bugType}");

                        if (metaTags.Count > 0)
                        {
                            descBuilder.AppendLine($"📌 [{string.Join(" | ", metaTags)}]");
                            descBuilder.AppendLine();
                        }

                        var dateParts = new List<string>();
                        if (!string.IsNullOrWhiteSpace(startDateStr)) dateParts.Add($"Mulai: {startDateStr}");
                        if (!string.IsNullOrWhiteSpace(dueDateStr)) dateParts.Add($"Deadline: {dueDateStr}");
                        if (!string.IsNullOrWhiteSpace(completedDateStr) && !completedDateStr.Equals("-")) dateParts.Add($"Selesai: {completedDateStr}");

                        if (dateParts.Count > 0)
                        {
                            descBuilder.AppendLine($"⏱️ **Jadwal & Target**: {string.Join(" • ", dateParts)}");
                            descBuilder.AppendLine();
                        }

                        var teamList = new List<string>();
                        void AddTeam(string roleLabel, string emails)
                        {
                            if (!string.IsNullOrWhiteSpace(emails) && !emails.Equals("-"))
                                teamList.Add($"• **{roleLabel}**: {emails}");
                        }

                        AddTeam("Developer / PIC", devEmails);
                        AddTeam("Business Analyst", baEmails);
                        AddTeam("System Analyst", saEmails);
                        AddTeam("Quality Assurance", qaEmails);
                        AddTeam("Tester", testerEmails);
                        AddTeam("Infrastructure / DevOps", infraEmails);
                        AddTeam("Master Data", masterDataEmails);
                        AddTeam("Technical Writer", techWriterEmails);

                        if (teamList.Count > 0)
                        {
                            descBuilder.AppendLine("👥 **Tim Terkait (Stakeholders)**:");
                            foreach (var member in teamList)
                            {
                                descBuilder.AppendLine(member);
                            }
                            descBuilder.AppendLine();
                        }

                        if (!string.IsNullOrWhiteSpace(kendala) && !kendala.Equals("-"))
                        {
                            descBuilder.AppendLine("⚠️ **Kendala / Blocker**:");
                            descBuilder.AppendLine(kendala);
                            descBuilder.AppendLine();
                        }

                        if (!string.IsNullOrWhiteSpace(solusi) && !solusi.Equals("-"))
                        {
                            descBuilder.AppendLine("💡 **Solusi / Tindak Lanjut**:");
                            descBuilder.AppendLine(solusi);
                            descBuilder.AppendLine();
                        }

                        if (!string.IsNullOrWhiteSpace(evidence) && !evidence.Equals("-"))
                        {
                            descBuilder.AppendLine("📎 **Evidence / Bukti Pendukung**:");
                            descBuilder.AppendLine(evidence);
                            descBuilder.AppendLine();
                        }

                        var finalDesc = descBuilder.ToString().Trim();
                        if (string.IsNullOrWhiteSpace(finalDesc))
                        {
                            finalDesc = !string.IsNullOrWhiteSpace(jenisTask) 
                                ? $"Tugas '{title}' ({jenisTask}) diimpor dari berkas Excel ({worksheet.Name})."
                                : $"Tugas '{title}' diimpor dari berkas Excel ({worksheet.Name}).";
                        }

                        var task = new TaskItem
                        {
                            ProjectId = 0,
                            Title = finalTitle,
                            Description = finalDesc,
                            Category = !string.IsNullOrWhiteSpace(jenisTask) ? jenisTask : null,
                            Milestone = !string.IsNullOrWhiteSpace(moduleName) ? moduleName : null,
                            Status = status,
                            Priority = priority,
                            AssigneeId = assigneeId,
                            StartDate = startDate,
                            DueDate = dueDate,
                            EstimatedHours = 8.00m,
                            CreatedAt = DateTime.UtcNow
                        };

                        package.Tasks.Add(new ParsedTaskItem
                        {
                            ProjectName = projInFile,
                            Task = task,
                            SheetName = worksheet.Name,
                            DeveloperOrPicName = primaryPerson
                        });
                    }
                }

                if (package.Tasks.Count == 0 && package.NewUsersToCreate.Count == 0)
                {
                    throw new FormatException(
                        "Tidak ada data tugas yang dapat dibaca. Pastikan file Excel memiliki sheet tugas dengan baris data di bawah 25 kolom header resmi: " +
                        string.Join(", ", ExpectedExcelHeaders) +
                        ". Silakan unduh Template Excel resmi untuk panduan format."
                    );
                }
            }

            return package;
        }

        public byte[] GenerateTemplateExcel()
        {
            using var workbook = new XLWorkbook();

            string[] headers = ExpectedExcelHeaders;

            void PopulateSheet(IXLWorksheet worksheet, string headerColor, string[][] sampleData)
            {
                for (int i = 0; i < headers.Length; i++)
                {
                    var cell = worksheet.Cell(1, i + 1);
                    cell.Value = headers[i];
                    cell.Style.Font.Bold = true;
                    cell.Style.Font.FontSize = 10;
                    cell.Style.Font.FontColor = XLColor.White;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml(headerColor);
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                }
                worksheet.Row(1).Height = 28;

                for (int r = 0; r < sampleData.Length; r++)
                {
                    var rowData = sampleData[r];
                    var rowNum = r + 2;
                    for (int c = 0; c < rowData.Length; c++)
                    {
                        var cell = worksheet.Cell(rowNum, c + 1);
                        cell.Value = rowData[c];
                        cell.Style.Font.FontSize = 9.5;
                        cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

                        // Align numbers / codes / status to center
                        if (c == 0 || c == 2 || c == 4 || c == 5 || c == 9 || c == 10 || c == 11 || c == 12 || c == 24)
                        {
                            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                        }
                    }
                    worksheet.Row(rowNum).Height = 22;
                }

                worksheet.Columns().AdjustToContents();
                worksheet.Column(2).Width = 24; // project_name
                worksheet.Column(4).Width = 36; // title
                worksheet.Column(14).Width = 28; // developer_emails
                worksheet.Column(22).Width = 32; // kendala
                worksheet.Column(23).Width = 32; // solusi
                worksheet.Column(24).Width = 28; // evidence
            }

            // Sheet 1: Dashboard & Petunjuk (Will be safely skipped by the parser)
            var sheetDashboard = workbook.Worksheets.Add("Dashboard Info");
            sheetDashboard.Cell(1, 1).Value = "DASHBOARD INFORMASI & PETUNJUK IMPORT TUGAS";
            sheetDashboard.Cell(1, 1).Style.Font.Bold = true;
            sheetDashboard.Cell(1, 1).Style.Font.FontSize = 14;
            sheetDashboard.Cell(1, 1).Style.Font.FontColor = XLColor.FromHtml("#1E1B4B");

            sheetDashboard.Cell(2, 1).Value = "Sheet ini berfungsi sebagai halaman panduan dan ringkasan eksekutif. Sistem secara otomatis akan melewati (skip) sheet ini tanpa menimbulkan galat.";
            sheetDashboard.Cell(2, 1).Style.Font.Italic = true;
            sheetDashboard.Cell(2, 1).Style.Font.FontSize = 9.5;
            sheetDashboard.Cell(2, 1).Style.Font.FontColor = XLColor.FromHtml("#64748B");

            sheetDashboard.Cell(4, 1).Value = "PANDUAN STRUKTUR WORKBOOK:";
            sheetDashboard.Cell(4, 1).Style.Font.Bold = true;
            sheetDashboard.Cell(5, 1).Value = "1. Sheet Pertama (Dashboard/Informasi): Secara otomatis dilewati oleh sistem import.";
            sheetDashboard.Cell(6, 1).Value = "2. Sheet Pengguna/Tim (misal: 'Daftar Tim'): Sistem otomatis mendaftarkan personil yang belum ada ke database pengguna.";
            sheetDashboard.Cell(7, 1).Value = "3. Sheet Tugas Proyek: Menggunakan 25 header standar resmi untuk mengimpor seluruh uraian tugas.";
            sheetDashboard.Cell(8, 1).Value = "4. Multi-Sheet: Seluruh sheet tugas diproses secara berkelanjutan dan otomatis ditautkan ke proyek.";
            sheetDashboard.Columns().AdjustToContents();

            // Sheet 2: Daftar Tim / Pengguna (Auto-creates users in system)
            var sheetTim = workbook.Worksheets.Add("Daftar Tim");
            string[] timHeaders = { "No.", "Nama", "Email", "Role", "Divisi", "Phone" };
            for (int h = 0; h < timHeaders.Length; h++)
            {
                var cell = sheetTim.Cell(1, h + 1);
                cell.Value = timHeaders[h];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#059669");
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }
            sheetTim.Row(1).Height = 26;

            var timData = new[]
            {
                new[] { "1", "Reza Pratama", "reza.pratama@projectmgmt.local", "InternalEmployee", "Mobile Engineering", "081234567891" },
                new[] { "2", "Dewi Lestari", "dewi.lestari@projectmgmt.local", "ProjectManager", "Product & Delivery", "081234567892" },
                new[] { "3", "Hendra Wijaya", "hendra.wijaya@projectmgmt.local", "InternalEmployee", "Quality Assurance", "081234567893" }
            };
            for (int r = 0; r < timData.Length; r++)
            {
                for (int c = 0; c < timData[r].Length; c++)
                {
                    sheetTim.Cell(r + 2, c + 1).Value = timData[r][c];
                }
                sheetTim.Row(r + 2).Height = 20;
            }
            sheetTim.Columns().AdjustToContents();
            sheetTim.Column(2).Width = 22;
            sheetTim.Column(3).Width = 32;

            // Sheet 3: NextGen Mobile Banking (Task Sheet)
            var sheet1 = workbook.Worksheets.Add("Mobile Banking");
            var sampleDataSheet1 = new[]
            {
                new[] {
                    "1",                                // No.
                    "NextGen Mobile Banking",           // project_name
                    "REQ-MB-001",                       // requirement_code
                    "Implementasi Biometric Auth & FaceID", // title
                    "InProgress",                       // status
                    "High",                             // priority
                    "Enhancement",                      // jenis_task
                    "Authentication",                   // module_name
                    "-",                                // bug_type
                    "45%",                              // progress
                    "2026-10-01",                       // start_date
                    "2026-10-15",                       // due_date
                    "-",                                // completed_date
                    "reza.pratama@projectmgmt.local",   // developer_emails (matched to new team user!)
                    "dewi.lestari@projectmgmt.local",   // ba_emails
                    "infra.lead@projectmgmt.local",     // infra_emails
                    "masterdata@projectmgmt.local",     // master_data_emails
                    "hendra.wijaya@projectmgmt.local",  // tester_emails
                    "techwriter@projectmgmt.local",     // technical_writer_emails
                    "qa.lead@projectmgmt.local",         // quality_assurance_emails
                    "ahmad.fauzi@projectmgmt.local",    // system_analyst_emails
                    "Penyesuaian SDK Biometric pada Android versi lama", // kendala
                    "Gunakan AndroidX Biometric fallback library",       // solusi
                    "https://jira.internal/browse/REQ-MB-001",           // evidence
                    "TSK-MB-01"                         // kode_task
                },
                new[] {
                    "2",
                    "NextGen Mobile Banking",
                    "REQ-MB-002",
                    "Fix Crash saat Input Nominal Transfer Desimal",
                    "Todo",
                    "Urgent",
                    "Bug Fixing",
                    "Transfer Antar Bank",
                    "Functional",
                    "0%",
                    "2026-10-05",
                    "2026-10-08",
                    "-",
                    "budi.santoso@projectmgmt.local",
                    "dewi.lestari@projectmgmt.local",
                    "-",
                    "-",
                    "hendra.wijaya@projectmgmt.local",
                    "-",
                    "qa.lead@projectmgmt.local",
                    "ahmad.fauzi@projectmgmt.local",
                    "NumberFormatException pada parsing locale koma",
                    "Standardisasi NumberFormat menggunakan InvariantCulture",
                    "logcat_crash_report_20260922.txt",
                    "BUG-MB-02"
                }
            };
            PopulateSheet(sheet1, "#4F46E5", sampleDataSheet1);

            // Sheet 4: Internal CRM System (Task Sheet)
            var sheet2 = workbook.Worksheets.Add("CRM System");
            var sampleDataSheet2 = new[]
            {
                new[] {
                    "1",
                    "Internal Enterprise CRM",
                    "REQ-CRM-105",
                    "Optimasi Query Pipeline Laporan Sales Bulanan",
                    "InReview",
                    "High",
                    "Performance",
                    "Sales Analytics",
                    "Performance",
                    "90%",
                    "2026-09-10",
                    "2026-09-25",
                    "-",
                    "ahmad.fauzi@projectmgmt.local",
                    "dewi.lestari@projectmgmt.local",
                    "infra.lead@projectmgmt.local",
                    "-",
                    "hendra.wijaya@projectmgmt.local",
                    "techwriter@projectmgmt.local",
                    "qa.lead@projectmgmt.local",
                    "ahmad.fauzi@projectmgmt.local",
                    "Table scan berlebih pada tabel Transaksi saat join",
                    "Tambahkan composite covering index pada (SalesDate, Status, RegionId)",
                    "https://gitlab.internal/mr/crm-query-opt",
                    "CRM-PERF-01"
                },
                new[] {
                    "2",
                    "Internal Enterprise CRM",
                    "REQ-CRM-106",
                    "Notifikasi Real-time Aktivitas Lead via WebSocket SignalR",
                    "Done",
                    "Medium",
                    "New Feature",
                    "Lead Management",
                    "-",
                    "100%",
                    "2026-09-01",
                    "2026-09-20",
                    "2026-09-18",
                    "budi.santoso@projectmgmt.local",
                    "dewi.lestari@projectmgmt.local",
                    "infra.lead@projectmgmt.local",
                    "-",
                    "hendra.wijaya@projectmgmt.local",
                    "techwriter@projectmgmt.local",
                    "qa.lead@projectmgmt.local",
                    "ahmad.fauzi@projectmgmt.local",
                    "-",
                    "Setup SignalR Hub dengan connection grouping per organization",
                    "uat_signoff_crm_leads.pdf",
                    "CRM-FEAT-02"
                }
            };
            PopulateSheet(sheet2, "#0D9488", sampleDataSheet2);

            // Sheet 5: Farhan Maulana (Sheet nama orang - sistem otomatis membuat user Farhan Maulana dan meng-assign tugasnya)
            var sheet3 = workbook.Worksheets.Add("Farhan Maulana");
            var sampleDataSheet3 = new[]
            {
                new[] {
                    "1",
                    "E-Commerce Mobile",
                    "REQ-ECM-201",
                    "Redesign Alur Checkout One-Click Payment",
                    "InProgress",
                    "High",
                    "UI/UX Enhancement",
                    "Checkout & Payment",
                    "-",
                    "70%",
                    "2026-10-01",
                    "2026-10-18",
                    "-",
                    "farhan.maulana@projectmgmt.local",
                    "dewi.lestari@projectmgmt.local",
                    "infra.lead@projectmgmt.local",
                    "-",
                    "hendra.wijaya@projectmgmt.local",
                    "techwriter@projectmgmt.local",
                    "qa.lead@projectmgmt.local",
                    "ahmad.fauzi@projectmgmt.local",
                    "-",
                    "Implementasi tokenized credit card & Apple Pay / Google Pay SDK",
                    "checkout_wireframe_v2.png",
                    "ECM-CHK-01"
                }
            };
            PopulateSheet(sheet3, "#D97706", sampleDataSheet3);

            using var memoryStream = new MemoryStream();
            workbook.SaveAs(memoryStream);
            return memoryStream.ToArray();
        }

        public byte[] GenerateTasksExportExcel(List<TaskResponseDto> tasks, string? filterSummary = null)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Laporan Tugas");

            // Title and Metadata
            worksheet.Cell(1, 1).Value = "LAPORAN DATA TUGAS PROYEK";
            worksheet.Cell(1, 1).Style.Font.Bold = true;
            worksheet.Cell(1, 1).Style.Font.FontSize = 15;
            worksheet.Cell(1, 1).Style.Font.FontColor = XLColor.FromHtml("#1E1B4B");

            var metaText = $"Waktu Ekspor: {DateTime.Now:dd/MM/yyyy HH:mm:ss} | Total: {tasks.Count} Tugas";
            if (!string.IsNullOrWhiteSpace(filterSummary))
            {
                metaText += $" | Filter: {filterSummary}";
            }
            worksheet.Cell(2, 1).Value = metaText;
            worksheet.Cell(2, 1).Style.Font.Italic = true;
            worksheet.Cell(2, 1).Style.Font.FontSize = 9;
            worksheet.Cell(2, 1).Style.Font.FontColor = XLColor.FromHtml("#64748B");

            // Table Headers
            string[] headers = {
                "No",
                "Kode Proyek",
                "Nama Proyek",
                "Judul Tugas",
                "Kategori",
                "Milestone SDLC",
                "PIC / Assignee",
                "Prioritas",
                "Status",
                "Estimasi (Jam)",
                "Deadline",
                "Dibuat Pada",
                "Deskripsi"
            };

            int headerRow = 4;
            for (int c = 0; c < headers.Length; c++)
            {
                var cell = worksheet.Cell(headerRow, c + 1);
                cell.Value = headers[c];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#4F46E5");
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            }
            worksheet.Row(headerRow).Height = 26;

            int currentRow = headerRow + 1;
            for (int i = 0; i < tasks.Count; i++)
            {
                var t = tasks[i];
                var row = worksheet.Row(currentRow);
                row.Height = 22;

                worksheet.Cell(currentRow, 1).Value = i + 1;
                worksheet.Cell(currentRow, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                worksheet.Cell(currentRow, 2).Value = !string.IsNullOrWhiteSpace(t.ProjectCode) ? t.ProjectCode : "-";
                worksheet.Cell(currentRow, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                worksheet.Cell(currentRow, 3).Value = !string.IsNullOrWhiteSpace(t.ProjectName) ? t.ProjectName : "-";
                worksheet.Cell(currentRow, 4).Value = !string.IsNullOrWhiteSpace(t.Title) ? t.Title : "-";
                worksheet.Cell(currentRow, 5).Value = !string.IsNullOrWhiteSpace(t.Category) ? t.Category : "-";
                worksheet.Cell(currentRow, 6).Value = !string.IsNullOrWhiteSpace(t.Milestone) ? t.Milestone : "-";
                worksheet.Cell(currentRow, 7).Value = !string.IsNullOrWhiteSpace(t.AssigneeName) ? t.AssigneeName : "Belum Ditugaskan";

                var priorityCell = worksheet.Cell(currentRow, 8);
                priorityCell.Value = !string.IsNullOrWhiteSpace(t.Priority) ? t.Priority : "-";
                priorityCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                var statusCell = worksheet.Cell(currentRow, 9);
                statusCell.Value = !string.IsNullOrWhiteSpace(t.Status) ? t.Status : "-";
                statusCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                var estCell = worksheet.Cell(currentRow, 10);
                estCell.Value = t.EstimatedHours;
                estCell.Style.NumberFormat.Format = "#,##0.00";
                estCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                var deadlineCell = worksheet.Cell(currentRow, 11);
                if (t.DueDate.HasValue)
                {
                    deadlineCell.Value = t.DueDate.Value.ToString("dd/MM/yyyy");
                }
                else
                {
                    deadlineCell.Value = "-";
                }
                deadlineCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                var createdCell = worksheet.Cell(currentRow, 12);
                createdCell.Value = t.CreatedAt.ToString("dd/MM/yyyy HH:mm");
                createdCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                worksheet.Cell(currentRow, 13).Value = !string.IsNullOrWhiteSpace(t.Description) ? t.Description : "-";

                // Zebra striping for even rows
                if (i % 2 == 1)
                {
                    worksheet.Range(currentRow, 1, currentRow, headers.Length).Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
                }

                currentRow++;
            }

            // Border table range & summary
            if (tasks.Count > 0)
            {
                var tableRange = worksheet.Range(headerRow, 1, currentRow - 1, headers.Length);
                tableRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                tableRange.Style.Border.OutsideBorderColor = XLColor.FromHtml("#CBD5E1");
                tableRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
                tableRange.Style.Border.InsideBorderColor = XLColor.FromHtml("#E2E8F0");

                // Total row
                var totalRow = worksheet.Row(currentRow);
                totalRow.Height = 24;
                worksheet.Cell(currentRow, 1).Value = "TOTAL JAM ESTIMASI";
                worksheet.Range(currentRow, 1, currentRow, 9).Merge();
                worksheet.Cell(currentRow, 1).Style.Font.Bold = true;
                worksheet.Cell(currentRow, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                worksheet.Cell(currentRow, 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#EEF2FF");

                var sumHours = tasks.Sum(t => t.EstimatedHours);
                var sumCell = worksheet.Cell(currentRow, 10);
                sumCell.Value = sumHours;
                sumCell.Style.Font.Bold = true;
                sumCell.Style.NumberFormat.Format = "#,##0.00";
                sumCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                sumCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#EEF2FF");

                worksheet.Range(currentRow, 11, currentRow, headers.Length).Style.Fill.BackgroundColor = XLColor.FromHtml("#EEF2FF");
                worksheet.Range(currentRow, 1, currentRow, headers.Length).Style.Border.TopBorder = XLBorderStyleValues.Double;
                worksheet.Range(currentRow, 1, currentRow, headers.Length).Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            }

            worksheet.Columns().AdjustToContents();
            if (worksheet.Column(4).Width > 45) worksheet.Column(4).Width = 45;
            if (worksheet.Column(13).Width > 55) worksheet.Column(13).Width = 55;
            worksheet.Column(1).Width = 6;

            using var memoryStream = new MemoryStream();
            workbook.SaveAs(memoryStream);
            return memoryStream.ToArray();
        }

        public byte[] GenerateTasksExportCsv(List<TaskResponseDto> tasks)
        {
            var sb = new StringBuilder();

            string EscapeCsv(string? val)
            {
                if (string.IsNullOrEmpty(val)) return "\"\"";
                var clean = val.Replace("\"", "\"\"");
                return $"\"{clean}\"";
            }

            // CSV Headers
            string[] headers = {
                "No",
                "Kode Proyek",
                "Nama Proyek",
                "Judul Tugas",
                "Kategori",
                "Milestone SDLC",
                "PIC / Assignee",
                "Prioritas",
                "Status",
                "Estimasi Jam",
                "Deadline",
                "Dibuat Pada",
                "Deskripsi"
            };
            sb.AppendLine(string.Join(",", headers.Select(EscapeCsv)));

            for (int i = 0; i < tasks.Count; i++)
            {
                var t = tasks[i];
                var row = new[]
                {
                    (i + 1).ToString(),
                    t.ProjectCode ?? "",
                    t.ProjectName ?? "",
                    t.Title ?? "",
                    t.Category ?? "",
                    t.Milestone ?? "",
                    t.AssigneeName ?? "Belum Ditugaskan",
                    t.Priority ?? "",
                    t.Status ?? "",
                    t.EstimatedHours.ToString("0.00", CultureInfo.InvariantCulture),
                    t.DueDate.HasValue ? t.DueDate.Value.ToString("yyyy-MM-dd") : "",
                    t.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                    t.Description ?? ""
                };
                sb.AppendLine(string.Join(",", row.Select(EscapeCsv)));
            }

            var preamble = Encoding.UTF8.GetPreamble();
            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            var result = new byte[preamble.Length + bytes.Length];
            Buffer.BlockCopy(preamble, 0, result, 0, preamble.Length);
            Buffer.BlockCopy(bytes, 0, result, preamble.Length, bytes.Length);
            return result;
        }
    }
}
