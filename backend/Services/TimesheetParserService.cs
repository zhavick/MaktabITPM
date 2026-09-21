using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;
using ProjectManagement.Api.Models;

namespace ProjectManagement.Api.Services
{
    public interface ITimesheetParserService
    {
        byte[] GenerateTemplateCsv();
        byte[] GenerateTemplateExcel();
        (List<TimesheetEntry> entries, decimal totalHours) ParseFile(Stream fileStream, string fileName, int timesheetId);
    }

    public class TimesheetParserService : ITimesheetParserService
    {
        public byte[] GenerateTemplateCsv()
        {
            var sb = new StringBuilder();
            sb.AppendLine("Date,Hours,ActivityDescription");
            sb.AppendLine("2026-09-01,8.0,Setup infrastructure & cloud architecture");
            sb.AppendLine("2026-09-02,7.5,Review security audit & data pipeline");
            sb.AppendLine("2026-09-03,8.0,Implement microservices API gateway");
            sb.AppendLine("2026-09-04,6.0,Performance tuning and load test");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public byte[] GenerateTemplateExcel()
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Timesheet Bulanan");

            // Headers
            worksheet.Cell(1, 1).Value = "Date (YYYY-MM-DD)";
            worksheet.Cell(1, 2).Value = "Hours";
            worksheet.Cell(1, 3).Value = "ActivityDescription";

            var headerRow = worksheet.Row(1);
            headerRow.Style.Font.Bold = true;
            headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#4F46E5");
            headerRow.Style.Font.FontColor = XLColor.White;

            // Sample rows
            worksheet.Cell(2, 1).Value = "2026-09-01";
            worksheet.Cell(2, 2).Value = 8.0;
            worksheet.Cell(2, 3).Value = "Setup infrastructure & cloud architecture";

            worksheet.Cell(3, 1).Value = "2026-09-02";
            worksheet.Cell(3, 2).Value = 7.5;
            worksheet.Cell(3, 3).Value = "Review security audit & data pipeline";

            worksheet.Cell(4, 1).Value = "2026-09-03";
            worksheet.Cell(4, 2).Value = 8.0;
            worksheet.Cell(4, 3).Value = "Implement microservices API gateway";

            worksheet.Columns().AdjustToContents();

            using var memoryStream = new MemoryStream();
            workbook.SaveAs(memoryStream);
            return memoryStream.ToArray();
        }

        public (List<TimesheetEntry> entries, decimal totalHours) ParseFile(Stream fileStream, string fileName, int timesheetId)
        {
            var entries = new List<TimesheetEntry>();
            decimal total = 0m;
            var ext = Path.GetExtension(fileName).ToLower();

            if (ext == ".xlsx" || ext == ".xls")
            {
                using var workbook = new XLWorkbook(fileStream);
                var worksheet = workbook.Worksheet(1);
                var rows = worksheet.RangeUsed().RowsUsed();

                bool isFirst = true;
                foreach (var row in rows)
                {
                    if (isFirst) { isFirst = false; continue; } // Skip header

                    var dateStr = row.Cell(1).GetString();
                    var hoursStr = row.Cell(2).GetString();
                    var desc = row.Cell(3).GetString();

                    if (string.IsNullOrWhiteSpace(dateStr)) continue;

                    if (!DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                    {
                        DateTime.TryParse(dateStr, out date);
                    }

                    if (!decimal.TryParse(hoursStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var hours))
                    {
                        decimal.TryParse(hoursStr, out hours);
                    }

                    if (hours <= 0) hours = 1.0m;

                    entries.Add(new TimesheetEntry
                    {
                        TimesheetId = timesheetId,
                        Date = date == default ? DateTime.UtcNow.Date : date,
                        Hours = hours,
                        ActivityDescription = string.IsNullOrWhiteSpace(desc) ? "Aktivitas Konsultan" : desc.Trim(),
                        CreatedAt = DateTime.UtcNow
                    });

                    total += hours;
                }
            }
            else
            {
                // Parse CSV
                using var reader = new StreamReader(fileStream);
                using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HeaderValidated = null,
                    MissingFieldFound = null
                });

                csv.Read();
                csv.ReadHeader();

                while (csv.Read())
                {
                    var dateStr = csv.GetField("Date") ?? csv.GetField(0);
                    var hoursStr = csv.GetField("Hours") ?? csv.GetField(1);
                    var desc = csv.GetField("ActivityDescription") ?? (csv.ColumnCount > 2 ? csv.GetField(2) : "Aktivitas Konsultan");

                    if (string.IsNullOrWhiteSpace(dateStr)) continue;

                    if (!DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                    {
                        DateTime.TryParse(dateStr, out date);
                    }

                    if (!decimal.TryParse(hoursStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var hours))
                    {
                        decimal.TryParse(hoursStr, out hours);
                    }

                    if (hours <= 0) hours = 1.0m;

                    entries.Add(new TimesheetEntry
                    {
                        TimesheetId = timesheetId,
                        Date = date == default ? DateTime.UtcNow.Date : date,
                        Hours = hours,
                        ActivityDescription = string.IsNullOrWhiteSpace(desc) ? "Aktivitas Konsultan" : desc.Trim(),
                        CreatedAt = DateTime.UtcNow
                    });

                    total += hours;
                }
            }

            return (entries, total);
        }
    }
}
