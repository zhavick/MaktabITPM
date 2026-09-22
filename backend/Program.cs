using System;
using System.IO;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ProjectManagement.Api.Data;
using ProjectManagement.Api.Hubs;
using ProjectManagement.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Controllers, SignalR & HTTP Context
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddHttpContextAccessor();
builder.Services.AddEndpointsApiExplorer();

// 2. Swagger with JWT Bearer Support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Enterprise Project Management API",
        Version = "v1",
        Description = "REST API for Enterprise Project Management App with JWT, Roles, Caretaker Ticket Pool, SignalR Sync, and Audit Trail."
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// 3. Database Context Setup (MySQL with SQLite Resilient Fallback)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost;Port=3306;Database=project_management_db;User=root;Password=rootpassword;";

var useSqlite = builder.Configuration.GetValue<bool>("UseSqliteFallback", false);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (useSqlite)
    {
        options.UseSqlite("Data Source=project_management.db");
    }
    else
    {
        try
        {
            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString), mySqlOptions =>
            {
                mySqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(3), errorNumbersToAdd: null);
            });
        }
        catch
        {
            options.UseSqlite("Data Source=project_management.db");
        }
    }
});

// 4. Register Services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITimesheetParserService, TimesheetParserService>();
builder.Services.AddScoped<ITaskExcelImportService, TaskExcelImportService>();
builder.Services.AddScoped<IAuditService, AuditService>();

// 5. JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "EnterpriseProjectManagementSecretKey2026SuperSecureStringMustBe32Chars!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "ProjectManagementApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "ProjectManagementClient";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// 6. CORS (Configured to support SignalR credentials)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 7. Auto-Migration and Data Seeding
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();

        // Ensure newly added tables and columns exist even if DB already existed
        try
        {
            db.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS ""SystemConfigs"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_SystemConfigs"" PRIMARY KEY AUTOINCREMENT,
                    ""Key"" TEXT NOT NULL,
                    ""Value"" TEXT NOT NULL,
                    ""Description"" TEXT NULL,
                    ""UpdatedAt"" TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS ""AuditLogs"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_AuditLogs"" PRIMARY KEY AUTOINCREMENT,
                    ""Action"" TEXT NOT NULL,
                    ""Module"" TEXT NOT NULL,
                    ""Details"" TEXT NOT NULL,
                    ""Severity"" TEXT NOT NULL,
                    ""UserId"" INTEGER NULL,
                    ""UserName"" TEXT NULL,
                    ""UserRole"" TEXT NULL,
                    ""IpAddress"" TEXT NULL,
                    ""Timestamp"" TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS ""MasterDataItems"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_MasterDataItems"" PRIMARY KEY AUTOINCREMENT,
                    ""Type"" TEXT NOT NULL,
                    ""Code"" TEXT NOT NULL,
                    ""Name"" TEXT NOT NULL,
                    ""Description"" TEXT NULL,
                    ""BadgeColor"" TEXT NULL,
                    ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
                    ""IsActive"" INTEGER NOT NULL DEFAULT 1,
                    ""CreatedAt"" TEXT NOT NULL
                );
            ");
        }
        catch { }

        try { db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Users"" ADD COLUMN ""CoverUrl"" TEXT NULL;"); } catch { }
        try { db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Users"" ADD COLUMN ""PhoneNumber"" TEXT NULL;"); } catch { }
        try { db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Users"" ADD COLUMN ""Bio"" TEXT NULL;"); } catch { }
        try { db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Users"" ADD COLUMN ""Location"" TEXT NULL;"); } catch { }
        try { db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Projects"" ADD COLUMN ""ProjectType"" TEXT NULL DEFAULT 'New Application';"); } catch { }
        try { db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Projects"" ADD COLUMN ""Color"" TEXT NULL DEFAULT '#4f46e5';"); } catch { }
        try { db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Tasks"" ADD COLUMN ""Category"" TEXT NULL;"); } catch { }
        try { db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Tasks"" ADD COLUMN ""Milestone"" TEXT NULL;"); } catch { }
        try { db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Tickets"" ADD COLUMN ""Category"" TEXT NULL;"); } catch { }

        AppDbContext.SeedData(db);
        AppDbContext.SeedMasterData(db);

        // Seed initial SystemConfig if empty
        if (!db.SystemConfigs.Any())
        {
            db.SystemConfigs.AddRange(
                new ProjectManagement.Api.Models.SystemConfig { Key = "BaseUrl", Value = "http://localhost:5173", Description = "Client Base URL" },
                new ProjectManagement.Api.Models.SystemConfig { Key = "AppTitle", Value = "Enterprise Project Management", Description = "Brand Title" }
            );
            db.SaveChanges();
        }

        // Seed initial Audit Log if empty
        if (!db.AuditLogs.Any())
        {
            db.AuditLogs.AddRange(
                new ProjectManagement.Api.Models.AuditLog { Action = "SYSTEM_INITIALIZED", Module = "System", Details = "Sistem Enterprise Project Management berhasil diinisialisasi.", Severity = "Info", UserName = "System", UserRole = "System" },
                new ProjectManagement.Api.Models.AuditLog { Action = "ADMIN_CREATED", Module = "Auth", Details = "Super Admin bawaan dibuat (admin@projectmgmt.local).", Severity = "Security", UserName = "System", UserRole = "System" },
                new ProjectManagement.Api.Models.AuditLog { Action = "SYNC_HUB_READY", Module = "SignalR", Details = "SignalR real-time automatic sync hub aktif di /hubs/sync.", Severity = "Info", UserName = "System", UserRole = "System" }
            );
            db.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Database Init Error]: {ex.Message}. Falling back to SQLite.");
        try
        {
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseSqlite("Data Source=project_management.db");
            using var fallbackDb = new AppDbContext(optionsBuilder.Options);
            fallbackDb.Database.EnsureCreated();
            AppDbContext.SeedData(fallbackDb);
        }
        catch (Exception fallbackEx)
        {
            Console.WriteLine($"[Fallback Init Error]: {fallbackEx.Message}");
        }
    }
}

// 8. Configure Pipeline
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Project Management API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowAll");

// Serve Uploads folder statically
var uploadsDir = Path.Combine(app.Environment.ContentRootPath, "Uploads");
if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsDir),
    RequestPath = "/Uploads"
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<SyncHub>("/hubs/sync");

app.Run();
