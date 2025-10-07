# KYC Verification Process Checklist

## Pre-requisites
- [ ] Supabase project is set up and running
- [ ] Database migrations have been applied
- [ ] Storage bucket `kyc-documents` exists
- [ ] RLS policies are applied to all relevant tables
- [ ] Admin user account exists with proper permissions

## Database Verification

### Tables
- [ ] `farmers` table exists with correct schema
- [ ] `kyc_documents` table exists with correct schema
- [ ] `profiles` table exists with correct schema
- [ ] `user_roles` table exists with correct schema
- [ ] `notifications` table exists with correct schema
- [ ] `audit_logs` table exists with correct schema

### Columns
- [ ] `farmers.kyc_status` column exists
- [ ] `farmers.kyc_rejection_reason` column exists
- [ ] `kyc_documents.farmer_id` column exists
- [ ] `kyc_documents.document_type` column exists
- [ ] `kyc_documents.file_path` column exists
- [ ] `kyc_documents.status` column exists

### Enum Types
- [ ] `kyc_status_enum` exists with values: pending, approved, rejected
- [ ] `kyc_doc_status_enum` exists with values: pending, approved, rejected

### Functions
- [ ] `approve_kyc(farmer_id, admin_id)` function exists
- [ ] `reject_kyc(farmer_id, reason, admin_id)` function exists

## Storage Verification

### Bucket
- [ ] `kyc-documents` bucket exists
- [ ] Bucket has proper RLS policies

### Policies
- [ ] Public can SELECT documents
- [ ] Authenticated users can INSERT documents
- [ ] Users can UPDATE their own documents
- [ ] Users can DELETE their own documents

## Application Testing

### Farmer Registration
- [ ] Farmer can register successfully
- [ ] Farmer receives confirmation email
- [ ] Farmer can log in after confirmation
- [ ] Farmer record is created with `kyc_status = 'pending'`
- [ ] Documents are uploaded to storage
- [ ] Document metadata is stored in `kyc_documents` table

### Admin Dashboard Access
- [ ] Admin can log in to admin dashboard
- [ ] Admin can access KYC Management page
- [ ] Admin can access KYC Approval page
- [ ] Pending applications are displayed
- [ ] Statistics are displayed correctly

### KYC Review Process
- [ ] Admin can view farmer details
- [ ] Admin can view uploaded documents
- [ ] Admin can approve KYC application
- [ ] Admin can reject KYC application with reason
- [ ] Approval/rejection updates farmer status
- [ ] Approval/rejection updates document statuses
- [ ] Audit logs are created for actions
- [ ] Notifications are sent to farmer

### Farmer Experience
- [ ] Farmer receives approval notification
- [ ] Farmer receives rejection notification with reason
- [ ] Farmer can see updated KYC status
- [ ] Approved farmers can proceed with milk collection
- [ ] Rejected farmers are informed of rejection reason

## Error Handling

### Validation
- [ ] Duplicate national ID is rejected
- [ ] Invalid email format is rejected
- [ ] Missing required fields show appropriate errors
- [ ] File size limits are enforced
- [ ] File type restrictions are enforced

### Security
- [ ] Unauthorized users cannot access admin pages
- [ ] Farmers cannot access other farmers' documents
- [ ] Staff cannot approve/reject KYC applications
- [ ] Only admins can call KYC RPC functions

### Edge Cases
- [ ] Large number of pending applications loads correctly
- [ ] Special characters in names/addresses are handled
- [ ] Network errors during document upload are handled
- [ ] Database connection errors are handled gracefully
- [ ] Concurrent approvals/rejections are handled

## Performance

### Load Times
- [ ] KYC Management page loads within 2 seconds
- [ ] KYC Approval page loads within 2 seconds
- [ ] Document viewing is responsive
- [ ] Search and filter operations are fast

### Database Queries
- [ ] Farmer list query is optimized
- [ ] Document retrieval is efficient
- [ ] Approval/rejection operations are fast
- [ ] Audit logging doesn't impact performance

## Monitoring

### Logging
- [ ] All KYC actions are logged
- [ ] Errors are logged with sufficient detail
- [ ] Performance metrics are collected
- [ ] Security events are logged

### Alerts
- [ ] Failed KYC operations trigger alerts
- [ ] High error rates trigger alerts
- [ ] Performance degradation triggers alerts
- [ ] Security violations trigger alerts

## Post-Verification

### Documentation
- [ ] Process is documented
- [ ] Troubleshooting guide is available
- [ ] Admin training materials are prepared
- [ ] User guides are updated

### Training
- [ ] Admins are trained on KYC process
- [ ] Support team understands the workflow
- [ ] Common issues and solutions are documented
- [ ] Contact information for technical support is available

## Rollback Plan

### In Case of Issues
- [ ] Database backups are available
- [ ] Previous version can be deployed quickly
- [ ] Manual approval process is documented
- [ ] Communication plan for affected users exists

---

✅ **All checks passed**: The KYC verification process is working correctly
⚠️ **Some checks failed**: Review failed items and address issues
❌ **Critical issues found**: Do not proceed to production until resolved