# EcoLafaek Admin Panel

<div align="center">
  <img src="https://img.shields.io/badge/AWS_AI_Agent_Global_Hackathon-ADMIN_PANEL-FF9900?style=for-the-badge&logoColor=white" alt="AWS AI Agent Hackathon" />

  <p>📍 <em>Local development environment only (localhost:3000)</em></p>
</div>

## 📋 Overview

Local-only administrative interface for managing the EcoLafaek waste monitoring system powered by Amazon Bedrock AgentCore. This admin panel provides secure access to user management, report moderation, system analytics, and configuration.

**Security Note**: This admin panel is intentionally **NOT deployed** to the internet. It runs only on `localhost:3000` for security reasons with direct database access.

## 🔐 Key Features

- **User Management**: Approve, suspend, or delete user accounts
- **Report Moderation**: Review and moderate submitted waste reports
- **Hotspot Management**: Monitor and manage waste hotspot clusters
- **System Analytics**: View system health metrics, AI analysis performance, and usage statistics
- **Background Task Monitoring**: Track AgentCore tool executions, S3 cleanup tasks, and async processing
- **Vector Analytics**: Monitor Amazon Titan Embed embedding generation and similarity search performance
- **Configuration**: Update application settings and system parameters
- **Direct Database Access**: CRUD operations on all tables

## 🏗️ Technical Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS 3.0+
- **Database**: Direct SQL connection (local only)
- **Authentication**: Local admin authentication
- **Deployment**: Local machine only (`localhost:3000`)

![dashboard](/public/ssc/dashboard.png)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Access to database credentials

### Installation

1. Navigate to admin panel directory:

```bash
cd ecolafaek_admin_panel
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` file:

```env
# Database Connection
DB_HOST=your-database-host
DB_PORT=4000
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
```

4. Run development server:

```bash
npm run dev
```

5. Access at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
ecolafaek_admin_panel/
├── src/
│   └── app/
│       ├── page.tsx                    # Dashboard homepage
│       ├── users/                      # User management
│       ├── reports/                    # Report moderation
│       ├── analytics/                  # System analytics
│       └── api/
│           ├── reports/                # Report CRUD
│           ├── users/                  # User CRUD
│           ├── analytics/              # Statistics
│           ├── hotspots/               # Hotspot management
│           ├── settings/               # System config
│           └── auth/                   # Admin authentication
├── components/                         # Reusable UI components
└── lib/
    └── db.ts                          # Database connection
```

## 📊 API Routes

All API routes are in `src/app/api/`:

| Route            | Purpose              | Description                         |
| ---------------- | -------------------- | ----------------------------------- |
| `/api/reports`   | Report Management    | CRUD operations on waste reports    |
| `/api/users`     | User Management      | User approval, suspension, deletion |
| `/api/analytics` | System Statistics    | Usage metrics, AI performance       |
| `/api/hotspots`  | Hotspot Management   | Geographic clustering data          |
| `/api/settings`  | System Configuration | Application settings                |
| `/api/auth/*`    | Authentication       | Local admin login/logout            |

## 📈 Analytics Features

- **AI Agent Performance**: Monitor AgentCore tool execution success rates
- **Vector Search Metrics**: Track Amazon Titan Embed embedding generation
- **User Growth**: Track user registrations and activity
- **Report Statistics**: Analyze waste report submissions by type, severity, location
- **System Health**: Database performance, API response times

## 🔒 Security

- **Local Only**: Not exposed to internet - runs only on developer machine
- **Direct DB Access**: No API proxy needed, direct SQL connections
- **Admin Auth**: Username/password protection with JWT tokens
- **No Public Access**: Only accessible from `localhost:3000`
- **Environment Variables**: Sensitive credentials in `.env.local`

---

For complete system architecture, see [Diagram/README.md](../Diagram/README.md).

## 📞 Additional Documentation

- **📱 Mobile App**: [../ecolafaek/README.md](../ecolafaek/README.md)
- **⚡ Backend API**: [../mobile_backend/README.md](../mobile_backend/README.md)
- **🌐 Public Dashboard**: [../ecolafaek_public_dahboard/README.md](../ecolafaek_public_dahboard/README.md)
- **🗄️ Database Schema**: [../database/README.md](../database/README.md)
- **📊 System architecture**: [../Diagram/README.md](../Diagram/README.md)
- **📄 Main Project**: [../README.md](../README.md)

---

<div align="center">
  <p>🏆 AWS AI Agent Global Hackathon</p>
</div>
