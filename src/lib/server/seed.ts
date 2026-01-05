// Load environment variables from .env.local
import dotenv from "dotenv";
import { resolve } from "path";

// Load .env.local file (fallback to .env if .env.local doesn't exist)
const envPath = resolve(process.cwd(), ".env.local");
const result = dotenv.config({ path: envPath });
// Also try .env as fallback
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: resolve(process.cwd(), ".env") });
}

// Debug: Log if env file was loaded
if (result.error) {
  console.warn("⚠️  Could not load .env.local, trying .env...");
} else {
  console.log("✅ Environment variables loaded from .env.local");
}

import { connectDB } from "./utils/db";
import User from "./user/entity";
import Admin from "./admin/entity";
import Company from "./company/entity";
import Business from "./business/entity";
import { hashPassCode } from "./utils/auth";
import { TaxClassification, ComplianceStatus, SubscriptionStatus } from "./utils/enum";
import { UserRole } from "./utils/enum";
import { Subscription, UsageLimit } from "./subscription/entity";
import { SubscriptionPlan } from "./utils/enum";
import { SUBSCRIPTION_PRICING } from "../constants/subscription";
// Note: Banks are now hardcoded in src/lib/server/bank/constants.ts
// No need to import bankService for seeding

async function seed() {
  try {
    await connectDB();
    console.log("Connected to database");

    // ============================================
    // CLEAR ALL EXISTING DATA
    // ============================================
    const deletedUsers = await User.deleteMany({});
    console.log(`\n🗑️  Deleted ${deletedUsers.deletedCount} existing users`);

    const deletedAdmins = await Admin.deleteMany({});
    console.log(`🗑️  Deleted ${deletedAdmins.deletedCount} existing admins`);

    // Also clear related data
    await Company.deleteMany({});
    await Business.deleteMany({});
    await Subscription.deleteMany({});
    await UsageLimit.deleteMany({});
    console.log("✅ Cleared all related data (companies, businesses, subscriptions, usage limits)");

    // ============================================
    // BANKS ARE NOW HARDCODED IN CONSTANTS
    // ============================================
    console.log("\nℹ️  Banks are now hardcoded in src/lib/server/bank/constants.ts");
    console.log("   No database storage needed. Banks are accessible throughout the application.");

    const now = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // ============================================
    // ADMIN USER (Separate Entity)
    // ============================================
    const adminPassword = (await hashPassCode("Admin1234")) as string;
    
    const admin = new Admin({
      email: "admin@taxcomply.com.ng",
      password: adminPassword,
      firstName: "Admin",
      lastName: "User",
      phoneNumber: "+2348000000000",
      isActive: true,
      permissions: [], // Can add specific permissions later
    });
    await admin.save();
    console.log("✅ Admin created (separate entity)");

    // ============================================
    // USER 2: INDIVIDUAL ACCOUNT TYPE
    // ============================================
    const individualPassword = (await hashPassCode("Individual1234")) as string;
    
    const individual = new User({
      email: "individual@taxcomply.com.ng",
      password: individualPassword,
      firstName: "Individual",
      lastName: "User",
      phoneNumber: "+2348023456789",
      accountType: "individual",
      role: "user",
      isEmailVerified: true,
    });
    await individual.save();
    console.log("✅ Individual user created");

    // ============================================
    // USER 3: COMPANY ACCOUNT TYPE
    // ============================================
    const companyPassword = (await hashPassCode("Company1234")) as string;
    
    const companyUser = new User({
      email: "company@taxcomply.com.ng",
      password: companyPassword,
      firstName: "Company",
      lastName: "User",
      phoneNumber: "+2348034567890",
      accountType: "company",
      role: "user",
      isEmailVerified: true,
    });
    await companyUser.save();
    console.log("✅ Company user created");

    // Create minimal company for company user
    // Note: taxClassification, complianceStatus, lastComplianceCheck are set automatically by the system
    const company = new Company({
      ownerId: companyUser._id,
      name: "Pending Onboarding",
      cacNumber: "",
      tin: "",
      address: "",
      city: "",
      state: "",
      phoneNumber: companyUser.phoneNumber || "",
      email: companyUser.email,
      companyType: "",
      annualTurnover: 0,
    });
    await company.save();
    console.log("✅ Company created for company user");

    // Create Accountant subscription for company user (subscriptions are user-based)
    // Note: Changed from Free to Accountant plan for testing purposes
    await Subscription.create({
      userId: companyUser._id,
      plan: SubscriptionPlan.Premium,
      billingCycle: "monthly",
      amount: SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].monthly,
      status: SubscriptionStatus.Active,
      startDate: now,
      endDate,
    });
    console.log("✅ Accountant subscription created for company user");

    // Create usage limit
    // Usage limits are user-based, not company-based
    // Note: Accountant plan has unlimited invoices (-1), but schema requires min: 0
    // Use a very large number (999999) to represent unlimited
    const accountantInvoicesLimitForCompany = SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].features.invoicesPerMonth === -1
      ? 999999
      : SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].features.invoicesPerMonth;
    
    await UsageLimit.create({
      userId: companyUser._id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      invoicesCreated: 0,
      invoicesLimit: accountantInvoicesLimitForCompany,
    });
    console.log("✅ Usage limit created for company user");

    // ============================================
    // USER 4: INDIVIDUAL ACCOUNT TYPE (ACCOUNTANT PLAN)
    // ============================================
    const individualAccountantPassword = (await hashPassCode("IndividualAccountant1234")) as string;
    
    const individualAccountant = new User({
      email: "individual.accountant@taxcomply.com.ng",
      password: individualAccountantPassword,
      firstName: "Individual",
      lastName: "Accountant",
      phoneNumber: "+2348045678901",
      accountType: "individual",
      role: "user",
      isEmailVerified: true,
    });
    await individualAccountant.save();
    console.log("✅ Individual accountant user created");

    // Create Accountant subscription for individual accountant user
    await Subscription.create({
      userId: individualAccountant._id,
      plan: SubscriptionPlan.Premium,
      billingCycle: "monthly",
      amount: SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].monthly,
      status: SubscriptionStatus.Active,
      startDate: now,
      endDate,
    });
    console.log("✅ Accountant subscription created for individual accountant user");

    // Note: Accountant plan has unlimited invoices (-1), but schema requires min: 0
    // Use a very large number (999999) to represent unlimited
    const accountantInvoicesLimit = SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].features.invoicesPerMonth === -1
      ? 999999
      : SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].features.invoicesPerMonth;

    // Create usage limit for individual accountant
    await UsageLimit.create({
      userId: individualAccountant._id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      invoicesCreated: 0,
      invoicesLimit: accountantInvoicesLimit,
    });
    console.log("✅ Usage limit created for individual accountant user");

    // ============================================
    // USER 5: COMPANY ACCOUNT TYPE (ACCOUNTANT PLAN)
    // ============================================
    const companyAccountantPassword = (await hashPassCode("CompanyAccountant1234")) as string;
    
    const companyAccountantUser = new User({
      email: "company.accountant@taxcomply.com.ng",
      password: companyAccountantPassword,
      firstName: "Company",
      lastName: "Accountant",
      phoneNumber: "+2348056789012",
      accountType: "company",
      role: "user",
      isEmailVerified: true,
    });
    await companyAccountantUser.save();
    console.log("✅ Company accountant user created");

    // Create company for company accountant user
    const companyAccountant = new Company({
      ownerId: companyAccountantUser._id,
      name: "Accountant Company Ltd",
      cacNumber: "RC123456",
      tin: "12345678-0001",
      address: "123 Accountant Street",
      city: "Lagos",
      state: "Lagos",
      phoneNumber: companyAccountantUser.phoneNumber || "",
      email: companyAccountantUser.email,
      companyType: "Professional Services",
    });
    await companyAccountant.save();
    console.log("✅ Company created for company accountant user");

    // Create Accountant subscription for company accountant user
    await Subscription.create({
      userId: companyAccountantUser._id,
      plan: SubscriptionPlan.Premium,
      billingCycle: "monthly",
      amount: SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].monthly,
      status: SubscriptionStatus.Active,
      startDate: now,
      endDate,
    });
    console.log("✅ Accountant subscription created for company accountant user");

    // Create usage limit for company accountant
    // Note: Accountant plan has unlimited invoices (-1), but schema requires min: 0
    // Use a very large number (999999) to represent unlimited
    await UsageLimit.create({
      userId: companyAccountantUser._id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      invoicesCreated: 0,
      invoicesLimit: accountantInvoicesLimit, // Reuse the same calculated limit
    });
    console.log("✅ Usage limit created for company accountant user");

    // ============================================
    // USER 6: BUSINESS ACCOUNT TYPE (ACCOUNTANT PLAN)
    // ============================================
    const businessAccountantPassword = (await hashPassCode("BusinessAccountant1234")) as string;
    
    const businessAccountantUser = new User({
      email: "business.accountant@taxcomply.com.ng",
      password: businessAccountantPassword,
      firstName: "Business",
      lastName: "Accountant",
      phoneNumber: "+2348067890123",
      accountType: "business",
      role: "user",
      isEmailVerified: true,
    });
    await businessAccountantUser.save();
    console.log("✅ Business accountant user created");

    // Create business for business accountant user
    const businessAccountant = new Business({
      ownerId: businessAccountantUser._id,
      name: "Accountant Business",
      businessRegistrationNumber: "BN789012",
      tin: "87654321-0001",
      isRegistered: true,
      address: "456 Business Avenue",
      city: "Lagos",
      state: "Lagos",
      phoneNumber: businessAccountantUser.phoneNumber || "",
      email: businessAccountantUser.email,
      businessType: "Professional Services",
      fixedAssets: 10_000_000,
    });
    await businessAccountant.save();
    console.log("✅ Business created for business accountant user");

    // Create Accountant subscription for business accountant user
    await Subscription.create({
      userId: businessAccountantUser._id,
      plan: SubscriptionPlan.Premium,
      billingCycle: "monthly",
      amount: SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].monthly,
      status: SubscriptionStatus.Active,
      startDate: now,
      endDate,
    });
    console.log("✅ Accountant subscription created for business accountant user");

    // Create usage limit for business accountant
    // Note: Accountant plan has unlimited invoices (-1), but schema requires min: 0
    // Use a very large number (999999) to represent unlimited
    await UsageLimit.create({
      userId: businessAccountantUser._id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      invoicesCreated: 0,
      invoicesLimit: accountantInvoicesLimit, // Reuse the same calculated limit
    });
    console.log("✅ Usage limit created for business accountant user");

    console.log("\n🎉 Seed data created successfully!");
    console.log("\n📋 Test Credentials:");
    console.log("\n1. Admin Account (Admin Entity):");
    console.log("   Email: admin@taxcomply.com.ng");
    console.log("   Password: Admin1234");
    console.log("   Entity: Admin (separate from User entity)");
    console.log("   Status: Active");
    console.log("\n2. Individual User (Free Plan):");
    console.log("   Email: individual@taxcomply.com.ng");
    console.log("   Password: Individual1234");
    console.log("   Role: user");
    console.log("   Account Type: individual");
    console.log("   Subscription: Free plan");
    console.log("\n3. Company User (Accountant Plan):");
    console.log("   Email: company@taxcomply.com.ng");
    console.log("   Password: Company1234");
    console.log("   Role: user");
    console.log("   Account Type: company");
    console.log("   Subscription: Accountant plan");
    console.log("   ⚠️  Company user has minimal company (empty fields) - complete onboarding to test sign-up flow");
    console.log("\n4. Individual Accountant User (Accountant Plan):");
    console.log("   Email: individual.accountant@taxcomply.com.ng");
    console.log("   Password: IndividualAccountant1234");
    console.log("   Role: user");
    console.log("   Account Type: individual");
    console.log("   Subscription: Accountant plan");
    console.log("\n5. Company Accountant User (Accountant Plan):");
    console.log("   Email: company.accountant@taxcomply.com.ng");
    console.log("   Password: CompanyAccountant1234");
    console.log("   Role: user");
    console.log("   Account Type: company");
    console.log("   Subscription: Accountant plan");
    console.log("   Company: Accountant Company Ltd (fully configured)");
    console.log("\n6. Business Accountant User (Accountant Plan):");
    console.log("   Email: business.accountant@taxcomply.com.ng");
    console.log("   Password: BusinessAccountant1234");
    console.log("   Role: user");
    console.log("   Account Type: business");
    console.log("   Subscription: Accountant plan");
    console.log("   Business: Accountant Business (fully configured)");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();

