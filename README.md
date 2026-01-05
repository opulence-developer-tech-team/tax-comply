# TaxComply NG - Tax Compliance & E-Invoicing SaaS

A production-ready Nigeria-first tax compliance and e-invoicing SaaS platform that helps SMEs stay compliant, avoid penalties, and be audit-ready automatically.

## 🎯 Positioning

**"Stay compliant, avoid penalties, and be audit-ready in Nigeria — automatically."**

## ✨ Features

### Core Features

1. **Company Onboarding**
   - CAC number registration
   - TIN management
   - Automatic tax classification (Small/Medium/Large company)
   - Turnover tracking

2. **E-Invoicing Engine**
   - FIRS-compliant digital invoices
   - Automatic 7.5% VAT calculation
   - Invoice numbering & audit trail
   - Customer database
   - PDF invoice generation

3. **VAT Engine**
   - Input vs Output VAT tracking
   - Monthly VAT summaries
   - VAT payable/refundable status
   - Alerts for missing VAT data

4. **Payroll & PAYE**
   - Employee management
   - Salary breakdown
   - PAYE calculation (Nigeria tax brackets)
   - Monthly PAYE schedules
   - Pension & NHF calculations

5. **Compliance Dashboard**
   - Clear "Compliant / At Risk" indicator
   - Tax deadlines calendar
   - Risk alerts:
     - Missing invoices
     - VAT mismatch
     - Payroll issues
     - Missing TIN/CAC

6. **Reports & Exports**
   - VAT returns
   - PAYE schedules
   - Audit-ready financial reports
   - PDF / CSV / Excel exports

## 💰 Pricing Plans

> **Note:** For the most up-to-date pricing and features, see the pricing page in the application or check `src/lib/server/subscription/get-pricing-plans.ts` (single source of truth).

### FREE PLAN (₦0/month)
**Start compliant. Test risk-free. No credit card required.**
- 5 FIRS-compliant invoices per month
- Automatic VAT calculation & tracking
- Real-time compliance status dashboard
- 30 expense records per month
- Instant tax calculations (PAYE, CIT, VAT)
- Monthly profit & loss tracking
- Company onboarding & TIN management
- Individual & Company account support
- 1 company account
- Email support

### STARTER PLAN
**₦3,500 / month OR ₦35,000 / year**
**Stay compliant, avoid penalties. Perfect for growing companies.**
- Everything in Free
- Unlimited FIRS-compliant invoices
- Complete VAT engine with monthly summaries
- WHT (Withholding Tax) tracking & remittance
- Download tax filing documents (VAT, PAYE, CIT returns)
- PDF & CSV exports (no watermarks)
- 500 expense records per month
- Real-time tax calculations & compliance alerts
- Monthly profit tracking & financial summaries
- Company onboarding & TIN/CAC management
- Individual & Company account support
- 1 company account
- Email support

### COMPANY PLAN
**₦8,500 / month OR ₦85,000 / year**
**Full compliance automation. Built for established companies.**
- Everything in Starter
- Payroll & PAYE automation
- Employee management & salary processing
- Automatic PAYE, Pension, NHF, NHIS calculations
- Unlimited expense records & categories
- Up to 3 company accounts
- Tax deadline alerts & compliance monitoring
- Audit-ready financial reports
- Individual & Company account support
- Email support

### ACCOUNTANT PLAN
**₦25,000 / month OR ₦250,000 / year**
**Manage unlimited clients. Built for accounting firms & agencies.**
- Everything in Company
- Unlimited company accounts
- Unlimited expense records & categories
- Client management dashboard
- Bulk operations & batch processing
- Advanced reporting & analytics
- Priority email support
- Individual & Company account support
- Priority support

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB database
- Gmail account (for email service)
- Paystack account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tax-comply
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   MONGODB_URI="your_mongodb_connection_string"

   # JWT
   JWT_SECRET="your_super_secret_jwt_key_min_32_chars"

   # Email (Gmail SMTP)
   GMAIL_USER="your_gmail@gmail.com"
   GMAIL_APP_PASSWORD="your_gmail_app_password"

   # Paystack
   PAYSTACK_SECRET_KEY="sk_test_..."
   PAYSTACK_PUBLIC_KEY="pk_test_..."

   # App URL
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Node Environment
   NODE_ENV="development"
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
tax-comply/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth/          # Authentication endpoints
│   │   │       ├── company/       # Company management
│   │   │       ├── invoices/     # Invoice management
│   │   │       ├── vat/          # VAT tracking
│   │   │       ├── payroll/      # Payroll & PAYE
│   │   │       ├── compliance/   # Compliance dashboard
│   │   │       ├── subscription/ # Subscription management
│   │   │       └── payment/      # Payment processing
│   │   └── (pages)/             # Frontend pages
│   └── lib/
│       └── server/
│           ├── auth/             # Authentication service
│           ├── company/           # Company logic
│           ├── invoice/          # Invoice engine
│           ├── vat/              # VAT engine
│           ├── payroll/          # Payroll engine
│           ├── tax/              # Tax calculations
│           ├── compliance/       # Compliance engine
│           ├── subscription/     # Subscription management
│           ├── employee/         # Employee management
│           ├── payment/          # Payment processing
│           ├── export/           # Export functionality
│           ├── middleware/       # Auth middleware
│           └── utils/            # Utilities
├── public/                       # Static assets
└── package.json
```

## 🔐 Authentication

The app uses JWT-based authentication with httpOnly cookies for security.

### API Endpoints

- `POST /api/v1/auth/sign-up` - User registration
- `POST /api/v1/auth/sign-in` - User login
- `POST /api/v1/auth/verify` - Email verification
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/resend-otp` - Resend verification code
- `POST /api/v1/auth/logout` - Logout

## 🏢 Company Management

- `POST /api/v1/company/create` - Create company
- `GET /api/v1/company/:id` - Get company details
- `PUT /api/v1/company/:id` - Update company

## 📄 Invoice Management

- `POST /api/v1/invoices/create` - Create invoice
- `GET /api/v1/invoices` - List invoices
- `GET /api/v1/invoices/:id` - Get invoice details
- `PUT /api/v1/invoices/:id/status` - Update invoice status

## 💼 VAT Management

- `GET /api/v1/vat/summary` - Get VAT summary
- `GET /api/v1/vat/records` - Get VAT records
- `POST /api/v1/vat/input` - Record input VAT
- `POST /api/v1/vat/output` - Record output VAT

## 💰 Payroll Management

- `POST /api/v1/payroll/generate` - Generate payroll
- `GET /api/v1/payroll/schedule` - Get payroll schedule
- `GET /api/v1/payroll/:id` - Get payroll details

## 📊 Compliance

- `GET /api/v1/compliance/dashboard` - Get compliance dashboard
- `GET /api/v1/compliance/status` - Get compliance status

## 💳 Subscription

- `GET /api/v1/subscription` - Get current subscription
- `POST /api/v1/subscription/initialize` - Initialize payment
- `POST /api/v1/subscription/cancel` - Cancel subscription

## 🔧 Tax Calculations

The app implements Nigeria tax laws:

- **PAYE Tax Brackets:**
  - 7% for first ₦300,000
  - 11% for next ₦300,000
  - 15% for next ₦500,000
  - 19% for next ₦500,000
  - 21% for next ₦1,600,000
  - 24% for above ₦3,200,000

- **VAT Rate:** 7.5% (Nigeria standard)

- **Pension Contribution:** 8% of gross salary (employee portion)

- **NHF Contribution:** 2.5% of gross salary (capped at ₦2,500,000 annual income)

- **Tax Classification:**
  - Small Company: Turnover < ₦25M (CIT exempt)
  - Medium: Turnover ₦25M - ₦100M
  - Large: Turnover > ₦100M

## 🛡️ Security Features

- Secure password hashing (PBKDF2 with 100,000 iterations)
- JWT tokens in httpOnly cookies
- Rate limiting on API endpoints
- Input validation with Joi
- SQL injection protection (MongoDB)
- XSS protection
- CSRF protection

## 📦 Database Models

- **User** - User accounts
- **Company** - Company entities
- **CompanyMember** - Role-based access
- **Invoice** - E-invoices
- **VATRecord** - Individual VAT transactions
- **VATSummary** - Monthly VAT summaries
- **Employee** - Employee records
- **Payroll** - Payroll calculations
- **PayrollSchedule** - Monthly payroll schedules
- **Subscription** - Subscription plans
- **Payment** - Payment records
- **UsageLimit** - Usage tracking

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 🚢 Deployment

### Environment Variables for Production

Ensure all environment variables are set in your production environment:

- `MONGODB_URI` - Production MongoDB connection
- `JWT_SECRET` - Strong secret key
- `GMAIL_USER` - Production email
- `GMAIL_APP_PASSWORD` - Production email password
- `PAYSTACK_SECRET_KEY` - Production Paystack secret key
- `PAYSTACK_PUBLIC_KEY` - Production Paystack public key
- `NEXT_PUBLIC_APP_URL` - Production app URL
- `NODE_ENV` - Set to "production"

### Build for Production

```bash
npm run build
npm start
```

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For support, email support@taxcomply.com.ng or create an issue in the repository.

## 🎯 Roadmap

- [ ] Multi-currency support
- [ ] Advanced reporting
- [ ] Mobile app
- [ ] API for third-party integrations
- [ ] Automated tax filing
- [ ] Bank reconciliation
- [ ] Inventory management

## 🙏 Acknowledgments

Built with:
- Next.js 16
- MongoDB
- TypeScript
- Tailwind CSS
- Paystack
- jsPDF
- XLSX

---

**Stay Compliant. Avoid Penalties. Be Audit-Ready.** 🇳🇬
