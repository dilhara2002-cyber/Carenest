# CareNest - Web-Based Midwifery and Maternal Care Management System

A comprehensive web application for digitalizing midwifery operations, supporting maternal and child healthcare management, and enabling seamless communication between mothers and midwives.

## 🚀 Features

### User Management
- Multi-role authentication (Mother, Midwife, Admin)
- Role-based access control
- Profile management with avatar support
- Language preferences (English, Sinhala, Tamil)

### Mother & Pregnancy Management
- Mother registration with personal and medical information
- Pregnancy tracking with week-by-week progress
- Expected delivery date calculation from LMP
- Blood pressure and weight monitoring

### Child Management
- Child registration linked to mother
- Growth monitoring (weight, height, BMI, head circumference)
- Automatic vaccination schedule generation

### Visit Management
- Schedule antenatal and postnatal visits
- Visit status tracking (scheduled, completed, cancelled, missed)
- Midwife assignment

### Vaccination Management
- Sri Lankan standard vaccination schedule
- Automatic reminders
- Vaccination status tracking

### AI-Assisted Care
- Healthy food suggestions based on pregnancy stage
- Safe exercise recommendations
- Basic first aid guidance
- Medical disclaimers included

### Communication
- Real-time chat between mothers and midwives
- System notifications for visits and vaccinations
- Unread message indicators

### Dashboards & Reports
- Role-specific dashboards with statistics
- Report generation capabilities

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **AI Integration**: OpenAI GPT API (optional)

## 📋 Prerequisites

Before running this project, make sure you have:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** database server
3. **OpenAI API Key** (optional, for AI features)

## 🔧 Installation & Setup

### Step 1: Install Dependencies

```bash
cd carenest
npm install
```

### Step 2: Configure Environment Variables

Edit the `.env` file with your settings:

```env
# Database - PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/carenest"

# NextAuth Configuration
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI API (Optional - for AI-assisted care features)
OPENAI_API_KEY="your-openai-api-key"

# SMTP Email (Required for automatic account and assignment emails)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password-or-app-password"
SMTP_FROM="CareNest <no-reply@carenest.com>"

# Google Maps API (Required for interactive map location picker)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

### Step 3: Set Up PostgreSQL Database

1. Install PostgreSQL if not already installed
2. Create the database:

```sql
CREATE DATABASE carenest;
```

### Step 4: Run Database Migration

```bash
npx prisma migrate dev --name init
```

Or use the push command for development:

```bash
npm run db:push
```

### Step 5: Generate Prisma Client

```bash
npx prisma generate
```

### Step 6: Seed the Database (Optional)

This creates test accounts and sample data:

```bash
npm run db:seed
```

### Step 7: Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 8: Configure Email Sending (Manual Setup)

CareNest now sends automatic emails for:
1. Admin-created mother accounts (includes login email + the password entered by admin)
2. Midwife assignment notifications (to both mother and midwife)

To enable this:
1. Fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `.env`
2. If using Gmail, generate an **App Password** and use it as `SMTP_PASS`
3. Restart the app after updating `.env`

If SMTP is not configured, the app skips sending emails and continues normal system flow.

### Step 9: Mother Location (Google Map Picker)

Mothers can now add/update their location anytime from **Settings → Profile → My Location (Optional)**.
Assigned midwives can view that location in **Midwives Portal → Mothers → View Mother Details** with Google Maps.

Manual notes:
1. Browser location permission must be allowed for the **Use Current Location** button.
2. To use **Open Map Picker**, configure Google Maps API key in `.env`:
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"`
3. In Google Cloud Console, enable these APIs for your project:
   - **Maps JavaScript API**
   - **Places API**
4. Restrict your key for safety:
   - Application restriction: **HTTP referrers (web sites)**
   - Add allowed referrers such as:
     - `http://localhost:3000/*`
     - `http://localhost:3001/*` (if dev port changes)
   - API restriction: allow only Maps JavaScript API and Places API.
5. Restart the app after updating `.env`.
6. If key is missing, users can still save with **Use Current Location** and coordinate-based save.

## 📱 Test Accounts

After seeding the database, you can use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@carenest.com | password123 |
| Midwife | midwife1@carenest.com | password123 |
| Midwife | midwife2@carenest.com | password123 |
| Mother | mother1@example.com | password123 |
| Mother | mother2@example.com | password123 |

## 📁 Project Structure

```
carenest/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seed script
├── src/
│   ├── app/
│   │   ├── (auth)/        # Login/Register pages
│   │   ├── (dashboard)/   # Dashboard pages
│   │   ├── api/           # API routes
│   │   └── page.tsx       # Landing page
│   ├── components/
│   │   ├── layout/        # Layout components
│   │   └── ui/            # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts        # NextAuth configuration
│   │   ├── prisma.ts      # Prisma client
│   │   └── utils.ts       # Utility functions
│   └── types/             # TypeScript types
├── .env                   # Environment variables
└── package.json
```

## 🔒 API Routes

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth.js authentication |
| `/api/users` | GET, POST | User registration and listing |
| `/api/mothers` | GET, POST, PATCH | Mother management |
| `/api/pregnancies` | GET, POST, PATCH | Pregnancy tracking |
| `/api/children` | GET, POST, PATCH | Child management |
| `/api/visits` | GET, POST, PATCH | Visit scheduling |
| `/api/vaccinations` | GET, POST, PATCH | Vaccination tracking |
| `/api/notifications` | GET, POST, PATCH | Notifications |
| `/api/chat` | GET, POST | Chat messages |
| `/api/ai-care` | GET, POST | AI-assisted care suggestions |
| `/api/dashboard` | GET | Dashboard statistics |

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables for Production

Make sure to set secure values for:
- `NEXTAUTH_SECRET` - Use `openssl rand -base64 32` to generate
- `DATABASE_URL` - Your production PostgreSQL URL
- `NEXTAUTH_URL` - Your production domain

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with test data |
| `npm run db:studio` | Open Prisma Studio |

## 🔑 Generating NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# On Linux/Mac
openssl rand -base64 32
```

## 📞 Support

For any issues or questions, please refer to the project documentation or create an issue in the repository.

## 📄 License

This project is developed as a capstone project for educational purposes.
