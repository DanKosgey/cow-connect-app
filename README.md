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
git clone https://github.com/yourusername/dairychain-pro.git
cd dairychain-pro
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
- **Frontend**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5173/admin/dashboard
- **Staff Portal**: http://localhost:5173/staff/dashboard
- **Farmer Portal**: http://localhost:5173/farmer/dashboard

---

## 🗃️ **PROJECT STRUCTURE**

```
src/
├── components/          # Reusable UI components
├── pages/               # Page components organized by role
│   ├── admin/           # Admin-specific pages
│   ├── auth/            # Authentication pages
│   ├── farmer/          # Farmer-specific pages
│   └── staff/           # Staff-specific pages
├── routes/              # Route configurations by user role
├── contexts/            # React context providers
├── hooks/               # Custom React hooks
├── services/            # Business logic and API services
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
├── integrations/        # Third-party service integrations
└── lib/                 # Library and helper functions
```

---

## 🔐 **AUTHENTICATION TROUBLESHOOTING**

Having issues with logging in or out of the portals? Check our [Authentication Troubleshooting Guide](./AUTH_TROUBLESHOOTING.md) for:

- Common login/logout issues and solutions
- Diagnostic tools for identifying authentication problems
- Database verification steps
- Step-by-step fixes for session and role issues
- Prevention tips to avoid future authentication problems

You can also access the Auth Test Page at `/admin/auth-test` for interactive diagnostics.

---

## 📚 **DOCUMENTATION**

- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Complete production setup
- **[Authentication Troubleshooting](./AUTH_TROUBLESHOOTING.md)** - Login/logout issue resolution
- **[API Documentation](https://supabase.com/docs)** - Supabase REST API documentation
- **[Database Schema](./supabase/migrations/)** - Database migration files
- **[User Guide](./USER_GUIDE.md)** - End-user manual
- **[Admin Guide](./ADMIN_GUIDE.md)** - System administration

---

## 🔒 **SECURITY FEATURES**

- **Authentication**: JWT-based with configurable expiration
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Row-level security and encryption at rest
- **Input Validation**: Comprehensive sanitization and validation
- **Rate Limiting**: API protection against abuse
- **Audit Logging**: Complete activity tracking
- **HTTPS**: TLS encryption for all communications

---

## 📈 **MONITORING & ANALYTICS**

- **Real-time Metrics**: Collection trends, quality trends, revenue tracking
- **Performance Monitoring**: API latency, error rates, throughput
- **Business Intelligence**: Farmer performance, seasonal patterns
- **Automated Reports**: Daily, weekly, monthly analytics
- **Alert System**: Proactive notifications for anomalies

---

## 🧪 **TESTING**

- **Unit Tests**: Component and utility function testing with Vitest
- **Integration Tests**: End-to-end workflow testing
- **UI Tests**: Component rendering and interaction testing
- **Performance Tests**: Load and stress testing

Run tests with:
```bash
npm run test          # Run all tests
npm run test:ui       # Run UI tests with interface
npm run coverage      # Generate test coverage report
```

---

## 🤝 **CONTRIBUTING**

We welcome contributions from the community! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Code style and standards
- Pull request process
- Issue reporting
- Development setup

---

## 📞 **SUPPORT**

- **📧 Email**: support@dairychain.com
- **💬 Discord**: [DairyChain Pro Community](https://discord.gg/dairychain)
- **📖 Documentation**: [docs.dairychain.com](https://docs.dairychain.com)
- **🐛 Issues**: [GitHub Issues](https://github.com/yourusername/dairychain-pro/issues)

---

## 📄 **LICENSE**

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🎉 **ACKNOWLEDGMENTS**

Built with ❤️ for the dairy farming community. Special thanks to:

- **Supabase** for providing excellent backend services
- **Tailwind CSS** for beautiful, responsive design
- **React** for modern frontend framework
- **Vite** for lightning-fast development
- **The Open Source Community** for amazing tools and libraries

---

## 🔮 **ROADMAP**

### **Version 2.0** (Coming Soon)
- [ ] Mobile app (React Native)
- [ ] IoT sensor integration
- [ ] Machine learning predictions
- [ ] Advanced route optimization
- [ ] Multi-language support

### **Version 3.0** (Future)
- [ ] Blockchain traceability
- [ ] Carbon footprint tracking
- [ ] Market price integration
- [ ] Advanced analytics with AI
- [ ] Export to international markets

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

**🥛 Transforming dairy operations worldwide with technology**

[🌐 Website](https://dairychain.com) • [📖 Documentation](https://docs.dairychain.com) • [🐛 Report Bug](https://github.com/yourusername/dairychain-pro/issues) • [💡 Request Feature](https://github.com/yourusername/dairychain-pro/issues)

</div>