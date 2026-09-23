using System.Text;
using System.Text.Json.Serialization;
using HELPDESK.Api.Data;
using HELPDESK.Api.Models;
using HELPDESK.Api.Repositories;
using HELPDESK.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// CreateBuilder only wires up user-secrets automatically for the Development
// environment, but the Testing environment (used for E2E runs) needs the same
// Jwt:Key secret without duplicating it into a checked-in or gitignored file.
if (builder.Environment.IsEnvironment("Testing"))
{
    builder.Configuration.AddUserSecrets<Program>();
}

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<TicketCacheInvalidator>();

builder.Services.AddDbContext<HelpdeskDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ITicketRepository, TicketRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 6;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<HelpdeskDbContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddSingleton<ITokenService, TokenService>();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration section is missing.");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key))
        };
    });

builder.Services.AddAuthorization();

const string WebClientCorsPolicy = "WebClient";
var webClientOrigin = builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy(WebClientCorsPolicy, policy =>
        policy.WithOrigins(webClientOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.MapGet("/", () => Results.Redirect("/scalar/v1")).ExcludeFromDescription();
}

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<HelpdeskDbContext>().Database.MigrateAsync();
    await SeedData.InitializeAsync(scope.ServiceProvider);
}

app.UseHttpsRedirection();

app.UseCors(WebClientCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
