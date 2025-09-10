# EcoLafaek Admin Panel

A comprehensive administrative interface for the EcoLafaek environmental waste monitoring system. Built with Next.js 15, TypeScript, and modern UI components.

## 🚀 Features

- **🔐 Secure Authentication** - JWT-based admin login system
- **📊 Dashboard Analytics** - Real-time statistics and metrics
- **👥 User Management** - View, edit, and manage user accounts
- **📋 Report Management** - Handle waste reports and their statuses
- **🗺️ Hotspot Management** - Manage environmental hotspots
- **📈 Advanced Analytics** - Detailed reporting and insights
- **🔍 System Monitoring** - Activity logs and system health
- **📤 Data Export** - CSV and PDF report generation
- **⚙️ Settings Management** - Configure system parameters

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
   cp .env.example .env.local
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
   # This will create the admin_users table and other required tables
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

### Default Admin Account

The setup script creates a default admin account:
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `super_admin`

⚠️ **Security Note**: Change the default password immediately after first login.

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
│   │   │   └── users/          # User management
│   │   ├── login/              # Login page
│   │   ├── users/              # User management page
│   │   └── page.tsx            # Dashboard homepage
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
npm run lint     # Run ESLint
```

### API Endpoints

#### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/me` - Get current admin user

#### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

#### User Management
- `GET /api/users` - List users with pagination/filtering
- `PATCH /api/users` - Update user status

## 🎨 UI Components

The admin panel uses a consistent design system:

- **Colors**: Green primary theme matching EcoLafaek branding
- **Typography**: Clean, readable fonts with proper hierarchy
- **Layout**: Responsive sidebar + header layout
- **Components**: shadcn/ui components with custom styling
- **Icons**: Lucide React icon library

## 🔍 Features Deep Dive

### Dashboard
- Real-time user and report statistics
- Top waste types visualization
- Recent activity feed
- Quick action buttons

### User Management
- Searchable user directory
- Status filtering (active/inactive/suspended)
- Bulk operations support
- User profile details

### Authentication Flow
1. Admin enters credentials
2. Server validates against `admin_users` table
3. JWT token generated and stored in HTTP-only cookie
4. Middleware protects all admin routes
5. Token verified on each request

## 📊 Database Queries

The admin panel includes optimized queries for:

- Dashboard statistics aggregation
- User management with pagination
- Report status updates
- Activity logging
- Performance indexing

## 🛡️ Security Considerations

- All passwords hashed with bcrypt (12 rounds)
- JWT tokens expire after 24 hours
- HTTP-only cookies prevent XSS
- SSL/TLS required for TiDB connections
- Input validation and sanitization
- Rate limiting on authentication endpoints

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

Ensure all production environment variables are set:

```env
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
DB_HOST=your-production-tidb-host
JWT_SECRET=your-production-jwt-secret
```

## 📞 Support

For technical support or questions:
- Create an issue in the repository
- Email: ecolafaek@gmail.com
- Documentation: [EcoLafaek Main Docs](../README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the EcoLafaek ecosystem. See the main repository for license information.

---

<div align="center">
  <p><strong>Built with ❤️ for Timor-Leste</strong></p>
  <p>🐊 <em>Like the sacred crocodile, EcoLafaek guards our environment</em> 🐊</p>
</div>
