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

        public List<ParsedTaskItem> ParseTasksWithProjectFromExcel(Stream fileStream, List<User> users, string? defaultProjectName = null)
        {
            var results = new List<ParsedTaskItem>();
            using var workbook = new XLWorkbook(fileStream);

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
                    var val = cell.GetString().Trim();
                    if (!string.IsNullOrEmpty(val))
                    {
                        headerMap[val] = cell.Address.ColumnNumber;
                    }
                }

                int GetCol(params string[] aliases)
                {
                    foreach (var alias in aliases)
                    {
                        if (headerMap.TryGetValue(alias, out var col))
                            return col;
                        // Check partial match
                        var key = headerMap.Keys.FirstOrDefault(k => k.IndexOf(alias, StringComparison.OrdinalIgnoreCase) >= 0);
                        if (key != null) return headerMap[key];
                    }
                    return -1;
                }

                int colCode = GetCol("Kode Task", "Kode");
                int colProject = GetCol("Nama Project", "Project", "Proyek", "Nama Proyek");
                int colTitle = GetCol("Nama Task", "Task", "Title", "Nama", "Uraian", "Deskripsi", "Judul", "Aktivitas");
                int colCategory = GetCol("Kategori", "Category");
                int colPic = GetCol("PIC", "Assignee", "Penanggung Jawab", "Petugas");
                int colPriority = GetCol("Prioritas", "Priority");
                int colStatus = GetCol("Status");
                int colProgress = GetCol("Progress (%)", "Progress");
                int colMilestone = GetCol("Milestone SDLC", "Milestone", "Tahapan");
                int colStartDate = GetCol("Tanggal Mulai", "Start Date", "Mulai");
                int colDueDate = GetCol("Tanggal Berakhir (Deadline)", "Deadline", "Due Date", "Tanggal Berakhir", "Target Selesai");
                int colKendala = GetCol("Kendala", "Blocker", "Issue");
                int colSolusi = GetCol("Solusi", "Solution", "Catatan");

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

                bool isHeader = true;
                string lastSeenProject = string.Empty;

                foreach (var row in rows)
                {
                    if (isHeader)
                    {
                        isHeader = false;
                        continue;
                    }

                    // Title resolution: check colTitle header first, or fallback to col 3, col 4, or col 1
                    var title = GetCellString(row, colTitle);
                    if (string.IsNullOrWhiteSpace(title))
                    {
                        title = GetCellString(row, 3);
                        if (string.IsNullOrWhiteSpace(title)) title = GetCellString(row, 4);
                        if (string.IsNullOrWhiteSpace(title)) title = GetCellString(row, 1);
                    }
                    if (string.IsNullOrWhiteSpace(title)) continue;

                    // Project Name resolution:
                    // Priority 1: Column 2 (Column B) as explicitly specified
                    var projInFile = GetCellString(row, 2);
                    if (string.IsNullOrWhiteSpace(projInFile) && colProject > 0)
                    {
                        projInFile = GetCellString(row, colProject);
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
                        // Smart fallback: use worksheet name if not generic
                        projInFile = worksheet.Name;
                    }
                    else
                    {
                        projInFile = "Proyek Utama";
                    }

                    var code = colCode > 0 ? GetCellString(row, colCode) : string.Empty;
                    var category = GetCellString(row, colCategory);
                    var pic = GetCellString(row, colPic);
                    var priorityStr = GetCellString(row, colPriority);
                    var statusStr = GetCellString(row, colStatus);
                    var progress = GetCellString(row, colProgress);
                    var milestone = GetCellString(row, colMilestone);
                    var startDateStr = GetCellString(row, colStartDate);
                    var deadlineStr = GetCellString(row, colDueDate);
                    var kendala = GetCellString(row, colKendala);
                    var solusi = GetCellString(row, colSolusi);

                    // Priority mapping
                    var priority = "Medium";
                    if (!string.IsNullOrWhiteSpace(priorityStr))
                    {
                        if (priorityStr.Equals("Critical", StringComparison.OrdinalIgnoreCase) || priorityStr.Equals("Urgent", StringComparison.OrdinalIgnoreCase) || priorityStr.Equals("Mendesak", StringComparison.OrdinalIgnoreCase))
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
                        if (statusStr.Equals("Done", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("Selesai", StringComparison.OrdinalIgnoreCase))
                            status = "Done";
                        else if (statusStr.Equals("InProgress", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("In Progress", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("Sedang Dikerjakan", StringComparison.OrdinalIgnoreCase))
                            status = "InProgress";
                        else if (statusStr.Equals("InReview", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("In Review", StringComparison.OrdinalIgnoreCase) || statusStr.Equals("Review", StringComparison.OrdinalIgnoreCase))
                            status = "InReview";
                        else
                            status = "Todo";
                    }

                    // Assignee matching
                    int? assigneeId = null;
                    if (!string.IsNullOrWhiteSpace(pic) && users != null)
                    {
                        var matched = users.FirstOrDefault(u =>
                            u.FullName.Equals(pic, StringComparison.OrdinalIgnoreCase) ||
                            u.FullName.IndexOf(pic, StringComparison.OrdinalIgnoreCase) >= 0 ||
                            pic.IndexOf(u.FullName, StringComparison.OrdinalIgnoreCase) >= 0);

                        if (matched != null)
                        {
                            assigneeId = matched.Id;
                        }
                    }

                    // Due date parsing
                    DateTime? dueDate = null;
                    if (!string.IsNullOrWhiteSpace(deadlineStr))
                    {
                        if (DateTime.TryParse(deadlineStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ||
                            DateTime.TryParse(deadlineStr, out d))
                        {
                            dueDate = DateTime.SpecifyKind(d, DateTimeKind.Utc);
                        }
                    }

                    // Title assembly with Code if present
                    var finalTitle = !string.IsNullOrWhiteSpace(code) && !code.Equals("-")
                        ? $"[{code}] {title}"
                        : title;
                    if (finalTitle.Length > 500)
                        finalTitle = finalTitle.Substring(0, 500);

                    // Build rich formatted description
                    var descBuilder = new StringBuilder();
                    var metaTags = new List<string>();
                    if (!string.IsNullOrWhiteSpace(projInFile)) metaTags.Add($"Proyek: {projInFile}");
                    if (!string.IsNullOrWhiteSpace(worksheet.Name)) metaTags.Add($"Sheet: {worksheet.Name}");
                    if (!string.IsNullOrWhiteSpace(category)) metaTags.Add($"Kategori: {category}");
                    if (!string.IsNullOrWhiteSpace(milestone)) metaTags.Add($"Milestone: {milestone}");
                    if (!string.IsNullOrWhiteSpace(progress) && !progress.Equals("0")) metaTags.Add($"Progress: {progress}%");
                    if (!string.IsNullOrWhiteSpace(pic)) metaTags.Add($"PIC: {pic}");
                    if (!string.IsNullOrWhiteSpace(startDateStr)) metaTags.Add($"Tgl Mulai: {startDateStr}");

                    if (metaTags.Count > 0)
                    {
                        descBuilder.AppendLine($"📌 [{string.Join(" | ", metaTags)}]");
                        descBuilder.AppendLine();
                    }

                    if (!string.IsNullOrWhiteSpace(kendala) && !kendala.Equals("-"))
                    {
                        descBuilder.AppendLine("⚠️ Kendala:");
                        descBuilder.AppendLine(kendala);
                        descBuilder.AppendLine();
                    }

                    if (!string.IsNullOrWhiteSpace(solusi) && !solusi.Equals("-"))
                    {
                        descBuilder.AppendLine("💡 Solusi / Catatan:");
                        descBuilder.AppendLine(solusi);
                    }

                    var finalDesc = descBuilder.ToString().Trim();
                    if (string.IsNullOrWhiteSpace(finalDesc))
                    {
                        finalDesc = !string.IsNullOrWhiteSpace(category) ? $"Tugas kategori {category} diimpor dari Excel ({worksheet.Name})." : $"Tugas diimpor dari Excel ({worksheet.Name}).";
                    }

                    var task = new TaskItem
                    {
                        ProjectId = 0, // Assigned dynamically by controller based on ProjectName
                        Title = finalTitle,
                        Description = finalDesc,
                        Category = !string.IsNullOrWhiteSpace(category) ? category : null,
                        Milestone = !string.IsNullOrWhiteSpace(milestone) ? milestone : null,
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

            return results;
        }

        public byte[] GenerateTemplateExcel()
        {
            using var workbook = new XLWorkbook();

            string[] headers = {
                "Kode Task",
                "Nama Project",
                "Nama Task",
                "Kategori",
                "PIC",
                "Prioritas",
                "Status",
                "Milestone SDLC",
                "Tanggal Berakhir (Deadline)",
                "Kendala",
                "Solusi"
            };

            void PopulateSheet(IXLWorksheet worksheet, string headerColor, string[][] sampleData)
            {
                for (int i = 0; i < headers.Length; i++)
                {
                    var cell = worksheet.Cell(1, i + 1);
                    cell.Value = headers[i];
                    cell.Style.Font.Bold = true;
                    cell.Style.Font.FontColor = XLColor.White;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml(headerColor);
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                }
                worksheet.Row(1).Height = 26;

                for (int r = 0; r < sampleData.Length; r++)
                {
                    var rowData = sampleData[r];
                    var rowNum = r + 2;
                    for (int c = 0; c < rowData.Length; c++)
                    {
                        worksheet.Cell(rowNum, c + 1).Value = rowData[c];
                    }
                    worksheet.Row(rowNum).Height = 20;
                }

                worksheet.Columns().AdjustToContents();
                worksheet.Column(2).Width = 26;
                worksheet.Column(3).Width = 35;
            }

            // Sheet 1: NextGen Mobile Banking
            var sheet1 = workbook.Worksheets.Add("Mobile Banking");
            var sampleDataSheet1 = new[]
            {
                new[] { "TSK-001", "NextGen Mobile Banking", "Integrasi Biometric Auth & FaceID", "Backend", "Budi Santoso", "High", "Todo", "Pengembangan & Integrasi API", "2026-10-15", "-", "Gunakan standar FIDO2" },
                new[] { "TSK-002", "NextGen Mobile Banking", "Desain UI Halaman Transfer Antar Bank", "Frontend", "Siti Rahma", "Medium", "InProgress", "Perancangan FSD & TSD", "2026-10-20", "-", "-" }
            };
            PopulateSheet(sheet1, "#4F46E5", sampleDataSheet1);

            // Sheet 2: Internal CRM System (demonstrating multi-sheet reading)
            var sheet2 = workbook.Worksheets.Add("CRM System");
            var sampleDataSheet2 = new[]
            {
                new[] { "CRM-005", "Internal CRM System", "Optimasi Query Laporan Penjualan Bulanan", "Database", "Ahmad Fauzi", "High", "Todo", "Pengujian QA & Security", "2026-10-25", "Query report lambat", "Tambahkan composite index" },
                new[] { "CRM-006", "Internal CRM System", "Implementasi Notifikasi Realtime ke Sales", "Backend", "Budi Santoso", "Medium", "Todo", "Pengembangan & Integrasi API", "2026-10-30", "-", "-" }
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
