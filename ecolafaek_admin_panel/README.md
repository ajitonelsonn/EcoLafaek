# EcoLafaek Admin Panel

A comprehensive administrative interface for the EcoLafaek environmental waste monitoring system. Built with Next.js 15, TypeScript, and modern UI components.And remember that right now we just run this admin pannel in local only.

## 🚀 Features

- **🔐 Secure Authentication** - JWT-based admin login system with role management
- **📊 Modern Dashboard** - Real-time statistics with circular progress indicators
- **👥 User Management** - Complete CRUD operations for regular users
- **🛡️ Admin User Management** - Create and manage admin accounts with role-based permissions
- **📋 Report Management** - Handle waste reports and their statuses
- **🗺️ Hotspot Management** - Manage environmental hotspots with interactive maps
- **📈 Advanced Analytics** - Detailed reporting and insights with visual charts
- **🔔 Notification System** - Real-time notifications with read/unread status
- **👤 Profile Management** - Change passwords and update profile information
- **🔍 System Monitoring** - Activity logs and system health tracking
- **📤 Data Export** - CSV export functionality for users and reports
- **⚙️ Settings Management** - Comprehensive system configuration

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: TiDB Cloud with SSL connection
- **Authentication**: JWT with HTTP-only cookies
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **State Management**: React hooks and context

## 📋 Prerequisites

- Node.js 16+ and npm
- TiDB Cloud database access
- Git for version control

## ⚡ Quick Start

1. **Clone the repository**:

   ```bash
   git clone https://github.com/ajitonelsonn/EcoLafaek.git
   cd EcoLafaek/ecolafaek_admin_panel
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Setup environment variables**:

   ```bash
   cp example.env.example .env.local
   ```

   Update `.env.local` with your credentials:

   ```env
   # Database Configuration (TiDB Cloud)
   DB_HOST=gateway01.ap-northeast-1.prod.aws.tidbcloud.com
   DB_NAME=db_ecolafaek
   DB_USER=your_tidb_user
   DB_PASSWORD=your_tidb_password
   DB_PORT=4000

   # JWT Secret for admin authentication
   JWT_SECRET=your-secure-jwt-secret-key

   # Application Settings
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-nextauth-secret
   NODE_ENV=development
   ```

4. **Setup database schema**:

   ```bash
   # Execute the setup.sql file in your TiDB database
   ```

5. **Start development server**:

   ```bash
   npm run dev
   ```

6. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

### Required Tables

The admin panel requires these database tables:

- `admin_users` - Admin authentication and roles
- `users` - Application users (from main EcoLafaek system)
- `reports` - Waste reports
- `analysis_results` - AI analysis data
- `hotspots` - Environmental hotspots
- `waste_types` - Waste classification types
- `system_logs` - Activity logging

### Default Admin Accounts

The setup script creates default admin accounts:

#### Super Admin

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `super_admin`
- **Email**: `admin@ecolafaek.com`

⚠️ **Security Note**: Change the default passwords immediately after first login.

## 🔑 Authentication

### Admin Roles

- **super_admin** - Full system access
- **admin** - Standard administrative privileges
- **moderator** - Limited management access

### Security Features

- JWT tokens with 24-hour expiration
- HTTP-only secure cookies
- Protected routes with middleware
- Password hashing with bcrypt
- Activity logging for audit trails

## 📁 Project Structure

```
ecolafaek_admin_panel/
├── src/
│   ├── app/
│   │   ├── api/                 # API routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── dashboard/      # Dashboard data
│   │   │   ├── users/          # User management API
│   │   │   ├── admin-users/    # Admin user management API
│   │   │   ├── notifications/  # Notification system API
│   │   │   └── settings/       # System settings API
│   │   ├── login/              # Login page
│   │   ├── users/              # User management page
│   │   ├── admin-users/        # Admin user management page
│   │   ├── reports/            # Report management page
│   │   ├── hotspots/           # Hotspot management page
│   │   ├── analytics/          # Analytics dashboard
│   │   ├── logs/               # System logs page
│   │   ├── settings/           # Settings configuration
│   │   └── page.tsx            # Modern dashboard homepage
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── layout/             # Layout components
│   │   └── dashboard/          # Dashboard-specific components
│   ├── lib/
│   │   ├── auth.ts             # Authentication utilities
│   │   ├── db.ts               # Database connection
│   │   └── utils.ts            # General utilities
│   ├── types/
│   │   └── index.ts            # TypeScript definitions
│   └── middleware.ts           # Route protection
├── public/                     # Static assets
├── setup.sql                   # Database initialization
└── README.md                   # Documentation
```

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

### API Endpoints

#### Authentication

- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/me` - Get current admin user
- `PUT /api/auth/profile` - Update admin profile
- `PUT /api/auth/change-password` - Change admin password

#### Dashboard

- `GET /api/dashboard/stats` - Get dashboard statistics

#### User Management

- `GET /api/users` - List users with pagination/filtering
- `POST /api/users` - Create new user account
- `PATCH /api/users` - Update user status

#### Admin User Management

- `GET /api/admin-users` - List admin users (super_admin only)
- `POST /api/admin-users` - Create new admin user (super_admin only)
- `PUT /api/admin-users/[id]` - Update admin user (super_admin only)
- `DELETE /api/admin-users/[id]` - Delete admin user (super_admin only)

#### Notifications

- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Create new notification
- `PUT /api/notifications/[id]/read` - Mark notification as read

### User Management

- Create new user accounts with validation
- Searchable user directory with real-time filtering
- Status filtering (active/inactive/suspended)
- CSV export functionality
- User profile details with contact information

### Admin User Management

- Role-based admin account creation (admin/moderator)
- Super admin exclusive access controls
- Edit admin profiles and permissions
- Delete protection for super admin accounts
- Visual role indicators and avatars

### Notification System

- Real-time notification bell with unread count
- Type-specific notification icons (info, warning, success, error)
- Mark as read functionality
- Notification history tracking

### Profile Management

- Change password with current password verification
- Update profile information (username, email)
- Session management and logout functionality

### Authentication Flow

1. Admin enters credentials
2. Server validates against `admin_users` table
3. JWT token generated and stored in HTTP-only cookie
4. Middleware protects all admin routes
5. Token verified on each request

---

<div align="center">
  <p><strong>Built with ❤️ for Timor-Leste</strong></p>
  <p>🐊 <em>Like the sacred crocodile, EcoLafaek guards our environment</em> 🐊</p>
</div>
