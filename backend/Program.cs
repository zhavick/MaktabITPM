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
using ProjectManagement.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Controllers & Endpoints
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 2. Swagger with JWT Bearer Support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Enterprise Project Management API",
        Version = "v1",
        Description = "REST API for Enterprise Project Management App with JWT, Roles, Caretaker Ticket Pool, and Dual-Mode Timesheets."
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
            // Fallback to SQLite if MySQL is not currently running locally
            options.UseSqlite("Data Source=project_management.db");
        }
    }
});

// 4. Register Services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITimesheetParserService, TimesheetParserService>();

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

// 6. CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
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
        AppDbContext.SeedData(db);
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

app.Run();
