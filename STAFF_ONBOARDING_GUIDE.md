# Staff Onboarding System - Implementation Guide

## Overview
Complete end-to-end staff invitation and approval system for Dairy Farmers of Trans Nzoia.

## Workflow

```
1. Admin sends invitation
   ↓
2. Email sent with unique link
   ↓
3. User clicks link → Staff Registration Page
   ↓
4. User fills form (personal info + role preference)
   ↓
5. Application submitted → pending_staff table
   ↓
6. Admin reviews application
   ↓
7. Admin approves/rejects
   ↓
8. If approved: Role assigned + user gets access
   If rejected: User notified with reason
```

## Database Schema

### Tables Created:
1. **staff_invitations** - Stores invitation links and tokens
2. **pending_staff** - Stores staff applications awaiting approval
3. **staff_approval_history** - Audit trail of approvals/rejections
4. **staff_notifications** - Email notifications queue

### RPC Functions:
1. **create_staff_invitation(email, admin_id, suggested_role)** - Admin creates invitation
2. **approve_pending_staff(pending_staff_id, admin_id, assigned_role, notes)** - Admin approves
3. **reject_pending_staff(pending_staff_id, admin_id, reason, notes)** - Admin rejects

## Frontend Components Needed

### 1. Admin: Send Invitation Page
**Path**: `/admin/staff/invite`
- Form to enter email and select suggested role
- Calls `create_staff_invitation` RPC
- Shows invitation link to copy/send

### 2. Public: Staff Registration Page
**Path**: `/staff/register/:token`
- Validates invitation token
- Multi-step form:
  - Personal Information
  - Contact Details
  - Role Preference
- Submits to `pending_staff` table

### 3. Admin: Pending Staff Dashboard
**Path**: `/admin/staff/pending`
- Lists all pending staff applications
- View details, approve, or reject
- Calls `approve_pending_staff` or `reject_pending_staff` RPC

### 4. User: Application Status Page
**Path**: `/staff/application-status`
- Shows current application status
- Displays approval/rejection message

## Installation Steps

### 1. Run Database Migration
```sql
-- Run the file: supabase/migrations/20260104160000_staff_onboarding_system.sql
-- in your Supabase SQL Editor
```

### 2. Create Frontend Components
- StaffInvitePage.tsx (Admin)
- StaffRegistrationPage.tsx (Public)
- PendingStaffDashboard.tsx (Admin)
- StaffApplicationStatus.tsx (User)

### 3. Add Routes
```tsx
// In admin.routes.tsx
<Route path="staff/invite" element={<StaffInvitePage />} />
<Route path="staff/pending" element={<PendingStaffDashboard />} />

// In public.routes.tsx
<Route path="/staff/register/:token" element={<StaffRegistrationPage />} />
<Route path="/staff/application-status" element={<StaffApplicationStatus />} />
```

## Features

✅ Secure invitation system with expiring tokens (7 days)
✅ Email notifications at each step
✅ Admin approval workflow
✅ Role assignment (staff/collector/creditor/admin)
✅ Complete audit trail
✅ RLS policies for data security
✅ Duplicate invitation prevention

## Next Steps

1. Run the SQL migration
2. Create the 4 frontend components
3. Add email sending integration (optional)
4. Test the complete flow

## Testing Checklist

- [ ] Admin can send invitation
- [ ] Invitation link works
- [ ] User can register via link
- [ ] Application appears in pending dashboard
- [ ] Admin can approve with role assignment
- [ ] User gets correct role access
- [ ] Admin can reject with reason
- [ ] Expired invitations are handled
- [ ] Duplicate invitations are prevented
