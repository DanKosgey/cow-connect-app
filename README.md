# 🥛 DAIRY FARMERS OF TRANS-NZOIA - Comprehensive Dairy Management System

![DAIRY FARMERS OF TRANS-NZOIA Logo](https://via.placeholder.com/300x100/1e40af/ffffff?text=DAIRY+FARMERS+OF+TRANS-NZOIA)

**🏆 World-Class Dairy Management Platform**

*Transforming dairy operations with technology, precision, and efficiency*

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## ⚠️ **IMPORTANT SECURITY NOTICE**

**If you have exposed Supabase keys in your repository, they must be rotated immediately.**
See [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md) for detailed instructions.

---

## 🛠️ **TROUBLESHOOTING**

### **PostgreSQL Role "admin" Does Not Exist Error**

If you encounter an error related to the PostgreSQL role "admin" not existing, please see the detailed fix guide:
[FIX_GET_USER_ROLE_ISSUE.md](FIX_GET_USER_ROLE_ISSUE.md)

This error occurs when the `get_user_role_secure` function tries to switch to a PostgreSQL role that hasn't been created. The fix involves:

1. Creating the missing `admin` PostgreSQL role
2. Updating the `get_user_role_secure` function to not use `SET ROLE`
3. Setting up proper Row Level Security policies
4. Granting necessary permissions

To apply the fix:
```bash
# Run the PowerShell script (Windows)
.\scripts\apply-role-fix.ps1

# Or apply the migration manually
supabase db push
```

### **User Roles Policy Conflicts**

If you experience issues with user role access or permissions, there may be conflicting RLS policies on the `user_roles` table. Apply the consolidation migration:
```
supabase/migrations/20251117000200_consolidate_user_roles_policies.sql
```

This migration ensures all necessary policies are in place without conflicts.

### **Staff Performance Dashboard**

The system now includes a Staff Performance Dashboard that tracks the performance of staff members who approve milk collections. See [STAFF_PERFORMANCE_DASHBOARD.md](STAFF_PERFORMANCE_DASHBOARD.md) for details.

### **Staff RLS Troubleshooting**

For troubleshooting Row Level Security issues with staff permissions, see [STAFF_RLS_TROUBLESHOOTING.md](STAFF_RLS_TROUBLESHOOTING.md).

---

## 🎯 **SYSTEM OVERVIEW**

Dairy Farmers of Trans-Nzoia is a comprehensive, enterprise-grade dairy management system that streamlines the entire dairy supply chain from farmer registration to payment processing. Built with modern technologies and designed for scalability, reliability, and user experience.

The system serves three primary user roles:
- **Farmers**: Register, track collections, monitor payments
- **Staff**: Record collections, manage routes, verify quality
- **Admins**: Oversee operations, process payments, manage users

---

## 🚀 **KEY FEATURES IMPLEMENTED**

### ✅ **Complete Farmer Registration System**
- **Auto-generated Farmer IDs**: FARM000001 format with sequential numbering
- **Multi-step Registration**: Personal info → Farm details → Document upload
- **KYC Document Management**: National ID, proof of address, land deeds, photos
- **Real-time Validation**: Email, phone, national ID uniqueness checks
- **Progress Tracking**: Visual step-by-step registration completion

### ✅ **Advanced KYC Management**
- **Admin Approval Workflow**: Comprehensive document review interface
- **Document Verification**: Image viewing, status management, rejection reasons
- **Automated Notifications**: Email/SMS alerts for status changes
- **Audit Trail**: Complete activity logging for transparency
- **Batch Processing**: Efficient handling of multiple applications

### ✅ **Enhanced Milk Collection System**
- **Auto-generated Collection IDs**: COL20241215001 format with date prefixes
- **Advanced Quality Scoring**: 1-10 scale based on multiple parameters
  - Fat content (optimal: 3.5-4.5%)
  - Protein content (optimal: 3.0-3.5%)
  - SNF content (optimal: 8.5-9.5%)
  - Temperature (optimal: 2-4°C)
  - Bacterial count (optimal: <1000 CFU/ml)
- **GPS Location Tracking**: Automatic coordinate capture and validation
- **Verification Codes**: Unique codes for collection validation
- **Bulk Collection**: Record multiple collections efficiently
- **Real-time Status**: Collected → Verified → Paid workflow

### ✅ **Comprehensive Payment Processing**
- **Batch Payment Creation**: Monthly/period-based processing
- **Automated Calculations**: Base payment + quality bonuses + deductions
- **Multiple Payment Methods**: Bank transfer, digital wallets
- **Invoice Generation**: Professional PDF invoices
- **Payment History**: Complete transaction tracking
- **Farmer Notifications**: Real-time payment alerts

### ✅ **Real-time Analytics & Reporting**
- **Dashboard Analytics**: Key metrics with trend analysis
- **Daily Analytics**: Collection trends, quality metrics, revenue tracking
- **Farmer Performance**: Rankings based on volume and quality
- **Staff Productivity**: Route optimization, collection efficiency
- **Business Intelligence**: Market insights, seasonal patterns
- **Automated Reports**: Daily, weekly, monthly summaries
- **Data Export**: CSV, Excel, PDF format options

### ✅ **Advanced Admin Portal**
- **Multi-tab Dashboard**: Overview, daily analytics, farmers, staff, payments, quality, warehouses
- **Warehouse Visualization**: Interactive map with collection points
- **Performance Monitoring**: Real-time system metrics
- **User Management**: Staff and farmer account management
- **System Alerts**: Notifications for critical events

### ✅ **Enhanced Staff Portal**
- **Route Management**: Optimized collection routes with GPS tracking
- **Collection Recording**: Enhanced forms with quality measurements
- **Bulk Operations**: Efficient multi-farmer collection processing
- **Productivity Tracking**: Performance metrics and analytics
- **Quality Control**: Real-time quality assessment tools

### ✅ **Farmer Portal**
- **Dashboard**: Personal analytics and insights
- **Collections**: History and tracking
- **Payments**: Status and history
- **Profile**: KYC status and farm details
- **Notifications**: Real-time alerts

---

## 🏗️ **TECHNOLOGY STACK**

### **Frontend**
- **React 18** with TypeScript for type safety
- **Vite** for fast development and build tooling
- **Tailwind CSS** for rapid, responsive UI development
- **shadcn-ui** for consistent, accessible component library
- **Recharts** for interactive data visualization
- **React Hook Form** for efficient form management
- **React Query** for server state management
- **Framer Motion** for smooth animations and transitions
- **React Router** for client-side routing

### **Backend & Database**
- **Supabase** for authentication, database, and real-time subscriptions
- **PostgreSQL** for robust data storage
- **Row Level Security** for data privacy and access control
- **Database Triggers** for auto-ID generation and analytics
- **RPC Functions** for complex operations
- **Storage** for document management

### **Infrastructure**
- **Vercel** for frontend deployment and hosting
- **Supabase Platform** for backend services
- **GitHub Actions** for CI/CD automation

---

## 🎯 **USER WORKFLOWS**

### **🌾 Farmer Journey**
1. **Registration**: Multi-step onboarding with document upload
2. **KYC Verification**: Admin review and approval process
3. **Active Management**: Milk collection tracking and payment monitoring
4. **Performance Analytics**: Quality scores, earnings, trends

### **👨‍💼 Staff Journey**
1. **Daily Routes**: Optimized collection routes with GPS tracking
2. **Collection Recording**: Enhanced forms with quality measurements
3. **Bulk Operations**: Efficient multi-farmer collection processing
4. **Productivity Tracking**: Performance metrics and analytics

### **👑 Admin Journey**
1. **KYC Approvals**: Comprehensive document review interface
2. **Payment Processing**: Batch payment creation and management
3. **System Analytics**: Business intelligence and reporting
4. **User Management**: Staff and farmer account management
5. **Warehouse Monitoring**: Interactive map visualization

---

## 📊 **SYSTEM CAPACITY**

- **👥 Users**: Support for 10,000+ farmers and 500+ staff members
- **📈 Collections**: Handle 50,000+ monthly milk collections
- **💰 Payments**: Process millions in transaction volume
- **⚡ Performance**: Sub-200ms API response times
- **🌍 Scalability**: Horizontal scaling with microservices architecture

---

## 🚀 **QUICK START**

### **Prerequisites**
- Node.js 18+ and npm
- Supabase account
- Git

### **1. Clone Repository**
```bash
git clone https://github.com/yourusername/dairy-farmers-of-trans-nzoia.git
cd dairy-farmers-of-trans-nzoia
```

### **2. Environment Setup**
```bash
# Copy environment files
cp .env.example .env.local
# Edit .env.local with your Supabase configuration
```

### **3. Install Dependencies**
```bash
npm install
```

### **4. Database Setup**
1. Create a Supabase project
2. Set up database tables using provided migrations
3. Configure authentication and storage
4. Update environment variables with your Supabase credentials

### **5. Start Development Server**
```bash
npm run dev
```

### **6. Access Application**
- **Development**: http://localhost:5173
- **Admin Portal**: http://localhost:5173/admin
- **Collector Portal**: http://localhost:5173/collector
- **Farmer Portal**: http://localhost:5173/farmer

---

## 🛠️ **DEVELOPMENT WORKFLOW**

### **Branching Strategy**
- **main**: Production-ready code
- **develop**: Development branch with latest features
- **feature/*: Individual feature branches
- **hotfix/*: Critical bug fixes

### **Code Quality**
- **ESLint**: Code linting and formatting
- **Prettier**: Consistent code style
- **TypeScript**: Type safety and error prevention
- **Unit Tests**: Component and service testing with Vitest
- **Integration Tests**: End-to-end testing with Playwright

### **CI/CD Pipeline**
- **GitHub Actions**: Automated testing and deployment
- **Linting**: Code quality checks on every push
- **Testing**: Unit and integration tests for all changes
- **Deployment**: Automatic deployment to staging and production

---

## 📚 **DOCUMENTATION**

### **Core Documentation**
- [System Architecture](docs/ARCHITECTURE.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [API Documentation](docs/API.md)
- [Security Guidelines](SECURITY_GUIDELINES.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)

### **User Guides**
- [Admin Manual](docs/ADMIN_MANUAL.md)
- [Staff Manual](docs/STAFF_MANUAL.md)
- [Farmer Manual](docs/FARMER_MANUAL.md)

### **Development Resources**
- [Component Library](docs/COMPONENTS.md)
- [Testing Strategy](docs/TESTING.md)
- [Performance Optimization](docs/PERFORMANCE.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

---

## 🤝 **COMMUNITY & SUPPORT**

- **💬 Discord**: [Dairy Farmers of Trans-Nzoia Community](https://discord.gg/dairyfarmers)
- **📧 Email**: support@dairyfarmers.org
- **🐛 Issues**: [GitHub Issues](https://github.com/yourusername/dairy-farmers-of-trans-nzoia/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/yourusername/dairy-farmers-of-trans-nzoia/discussions)

---

## 📈 **CONTRIBUTING**

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

### **How to Contribute**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### **Code of Conduct**
Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions.

---

## 📄 **LICENSE**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **ACKNOWLEDGMENTS**

- **Supabase Team** for the amazing backend-as-a-service platform
- **React Community** for the incredible frontend framework
- **Open Source Contributors** for the libraries and tools that make this project possible
- **Dairy Farmers of Trans-Nzoia** for their trust and collaboration

---

## 🔗 **RESOURCES**

[🌐 Website](https://dairyfarmers.org) • [📖 Documentation](https://docs.dairyfarmers.org) • [🐛 Report Bug](https://github.com/yourusername/dairy-farmers-of-trans-nzoia/issues) • [💡 Request Feature](https://github.com/yourusername/dairy-farmers-of-trans-nzoia/issues)