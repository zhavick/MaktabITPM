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
    }

    public interface ITaskExcelImportService
    {
        List<TaskItem> ParseTasksFromExcel(Stream fileStream, int targetProjectId, List<User> users);
        List<ParsedTaskItem> ParseTasksWithProjectFromExcel(Stream fileStream, List<User> users, string? defaultProjectName = null);
        byte[] GenerateTemplateExcel();
        byte[] GenerateTasksExportExcel(List<TaskResponseDto> tasks, string? filterSummary = null);
        byte[] GenerateTasksExportCsv(List<TaskResponseDto> tasks);
    }

    public class TaskExcelImportService : ITaskExcelImportService
    {
        public List<TaskItem> ParseTasksFromExcel(Stream fileStream, int targetProjectId, List<User> users)
        {
            var parsed = ParseTasksWithProjectFromExcel(fileStream, users);
            foreach (var item in parsed)
            {
                item.Task.ProjectId = targetProjectId;
            }
            return parsed.Select(p => p.Task).ToList();
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

        public List<ParsedTaskItem> ParseTasksWithProjectFromExcel(Stream fileStream, List<User> users, string? defaultProjectName = null)
        {
            var results = new List<ParsedTaskItem>();
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
                bool anyValidSheetFound = false;

                // User requirement: Iterate and parse EVERY worksheet in the Excel workbook
                foreach (var worksheet in workbook.Worksheets)
                {
                    var rows = worksheet.RangeUsed()?.RowsUsed()?.ToList();
                    if (rows == null || rows.Count <= 1) continue; // Skip empty sheets or single-header-only sheets

                    // Map header names to column indexes (1-based) for this specific worksheet
                    var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    var firstRow = rows.FirstOrDefault();
                    if (firstRow == null) continue;

                    foreach (var cell in firstRow.CellsUsed())
                    {
                        var rawVal = cell.GetString().Trim();
                        var normVal = NormalizeHeader(rawVal);
                        if (!string.IsNullOrEmpty(normVal) && !headerMap.ContainsKey(normVal))
                        {
                            headerMap[normVal] = cell.Address.ColumnNumber;
                        }
                    }

                    int GetCol(params string[] aliases)
                    {
                        foreach (var alias in aliases)
                        {
                            var normAlias = NormalizeHeader(alias);
                            if (headerMap.TryGetValue(normAlias, out var col))
                                return col;
                            
                            // Check partial contains match
                            var key = headerMap.Keys.FirstOrDefault(k => k.Contains(normAlias) || normAlias.Contains(k));
                            if (key != null) return headerMap[key];
                        }
                        return -1;
                    }

                    // Map all 25 specific headers requested by user
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

                    // Validate header structure: at least 'title' must be present, or column 4/2
                    if (colTitle <= 0 && colProject <= 0 && colKodeTask <= 0)
                    {
                        // This worksheet does not contain valid project task headers, skip sheet
                        continue;
                    }

                    anyValidSheetFound = true;

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

                    // Helper to match user by email or name from delimited string
                    User? ResolveUserFromEmails(string? emailList)
                    {
                        if (string.IsNullOrWhiteSpace(emailList) || emailList.Equals("-") || users == null)
                            return null;

                        var tokens = emailList.Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries)
                                              .Select(t => t.Trim())
                                              .Where(t => !string.IsNullOrEmpty(t));

                        foreach (var token in tokens)
                        {
                            // Match by email first
                            var byEmail = users.FirstOrDefault(u => u.Email.Equals(token, StringComparison.OrdinalIgnoreCase));
                            if (byEmail != null) return byEmail;

                            // Match by full name
                            var byName = users.FirstOrDefault(u => 
                                u.FullName.Equals(token, StringComparison.OrdinalIgnoreCase) ||
                                u.FullName.IndexOf(token, StringComparison.OrdinalIgnoreCase) >= 0 ||
                                token.IndexOf(u.FullName, StringComparison.OrdinalIgnoreCase) >= 0);
                            if (byName != null) return byName;
                        }
                        return null;
                    }

                    bool isHeader = true;
                    string lastSeenProject = string.Empty;

                    foreach (var row in rows)
                    {
                        if (isHeader)
                        {
                            isHeader = false;
                            continue;
                        }

                        // Title resolution: check colTitle header first, or fallback to col 4 or col 3
                        var title = GetCellString(row, colTitle);
                        if (string.IsNullOrWhiteSpace(title))
                        {
                            title = GetCellString(row, 4);
                            if (string.IsNullOrWhiteSpace(title)) title = GetCellString(row, 3);
                            if (string.IsNullOrWhiteSpace(title)) title = GetCellString(row, 1);
                        }
                        if (string.IsNullOrWhiteSpace(title)) continue;

                        // Project Name resolution:
                        // Priority 1: Column mapped as colProject or Column 2
                        var projInFile = colProject > 0 ? GetCellString(row, colProject) : GetCellString(row, 2);
                        if (string.IsNullOrWhiteSpace(projInFile))
                        {
                            projInFile = GetCellString(row, 2);
                        }

                        if (!string.IsNullOrWhiteSpace(projInFile))
                        {
                            lastSeenProject = projInFile;
                        }
                        else if (!string.IsNullOrWhiteSpace(lastSeenProject))
                        {
                            projInFile = lastSeenProject;
                        }
                        else if (!string.IsNullOrWhiteSpace(defaultProjectName))
                        {
                            projInFile = defaultProjectName;
                        }
                        else if (!string.IsNullOrWhiteSpace(worksheet.Name) && !worksheet.Name.StartsWith("Sheet", StringComparison.OrdinalIgnoreCase))
                        {
                            projInFile = worksheet.Name;
                        }
                        else
                        {
                            projInFile = "Proyek Utama";
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

                        // Email roles
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

                        // Assignee matching from emails
                        int? assigneeId = null;
                        var matchedUser = ResolveUserFromEmails(devEmails)
                                       ?? ResolveUserFromEmails(saEmails)
                                       ?? ResolveUserFromEmails(baEmails)
                                       ?? ResolveUserFromEmails(qaEmails)
                                       ?? ResolveUserFromEmails(testerEmails);

                        if (matchedUser != null)
                        {
                            assigneeId = matchedUser.Id;
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

                        // Title assembly with Code if present
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

                        // Build rich formatted description encompassing all 25 header columns
                        var descBuilder = new StringBuilder();

                        // Header Metadata Tags
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

                        // Schedule dates
                        var dateParts = new List<string>();
                        if (!string.IsNullOrWhiteSpace(startDateStr)) dateParts.Add($"Mulai: {startDateStr}");
                        if (!string.IsNullOrWhiteSpace(dueDateStr)) dateParts.Add($"Deadline: {dueDateStr}");
                        if (!string.IsNullOrWhiteSpace(completedDateStr) && !completedDateStr.Equals("-")) dateParts.Add($"Selesai: {completedDateStr}");

                        if (dateParts.Count > 0)
                        {
                            descBuilder.AppendLine($"⏱️ **Jadwal & Target**: {string.Join(" • ", dateParts)}");
                            descBuilder.AppendLine();
                        }

                        // Stakeholders & Team Emails
                        var teamList = new List<string>();
                        void AddTeam(string roleLabel, string emails)
                        {
                            if (!string.IsNullOrWhiteSpace(emails) && !emails.Equals("-"))
                                teamList.Add($"• **{roleLabel}**: {emails}");
                        }

                        AddTeam("Developer", devEmails);
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

                        // Kendala / Blocker
                        if (!string.IsNullOrWhiteSpace(kendala) && !kendala.Equals("-"))
                        {
                            descBuilder.AppendLine("⚠️ **Kendala / Blocker**:");
                            descBuilder.AppendLine(kendala);
                            descBuilder.AppendLine();
                        }

                        // Solusi / Action Plan
                        if (!string.IsNullOrWhiteSpace(solusi) && !solusi.Equals("-"))
                        {
                            descBuilder.AppendLine("💡 **Solusi / Tindak Lanjut**:");
                            descBuilder.AppendLine(solusi);
                            descBuilder.AppendLine();
                        }

                        // Evidence / Link
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
                            ProjectId = 0, // Assigned dynamically by controller based on ProjectName
                            Title = finalTitle,
                            Description = finalDesc,
                            Category = !string.IsNullOrWhiteSpace(jenisTask) ? jenisTask : null,
                            Milestone = !string.IsNullOrWhiteSpace(moduleName) ? moduleName : null,
                            Status = status,
                            Priority = priority,
                            AssigneeId = assigneeId,
                            DueDate = dueDate,
                            EstimatedHours = 8.00m,
                            CreatedAt = DateTime.UtcNow
                        };

                        results.Add(new ParsedTaskItem
                        {
                            ProjectName = projInFile,
                            Task = task,
                            SheetName = worksheet.Name
                        });
                    }
                }

                if (!anyValidSheetFound)
                {
                    throw new FormatException(
                        "Header file Excel tidak sesuai. File Excel wajib mengikuti 25 kolom berikut: " +
                        string.Join(", ", ExpectedExcelHeaders) +
                        ". Silakan unduh Template Excel resmi untuk panduan format."
                    );
                }
            }

            return results;
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

            // Sheet 1: NextGen Mobile Banking
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
                    "budi.santoso@projectmgmt.local",   // developer_emails
                    "siti.rahma@projectmgmt.local",     // ba_emails
                    "infra.lead@projectmgmt.local",     // infra_emails
                    "masterdata@projectmgmt.local",     // master_data_emails
                    "tester.qa@projectmgmt.local",      // tester_emails
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
                    "siti.rahma@projectmgmt.local",
                    "-",
                    "-",
                    "tester.qa@projectmgmt.local",
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

            // Sheet 2: Internal CRM System
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
                    "siti.rahma@projectmgmt.local",
                    "infra.lead@projectmgmt.local",
                    "-",
                    "tester.qa@projectmgmt.local",
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
                    "siti.rahma@projectmgmt.local",
                    "infra.lead@projectmgmt.local",
                    "-",
                    "tester.qa@projectmgmt.local",
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
