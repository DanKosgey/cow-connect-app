# Admin User Guide

This guide provides comprehensive instructions for administrators to manage the Farmer Registration and Approval System.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Pending Farmers](#managing-pending-farmers)
4. [Reviewing KYC Documents](#reviewing-kyc-documents)
5. [Approving and Rejecting Applications](#approving-and-rejecting-applications)
6. [Monitoring System Performance](#monitoring-system-performance)
7. [Email Notification Management](#email-notification-management)
8. [Audit Trail and Reporting](#audit-trail-and-reporting)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection
- Admin credentials with proper permissions

### Accessing the Admin Portal
1. Open your web browser
2. Navigate to [https://your-portal-url.com/admin](https://your-portal-url.com/admin)
3. Log in with your admin credentials

### Admin Permissions
Ensure you have the following permissions:
- `manage_kyc` - Approve/reject farmer applications
- `view_analytics` - Access system analytics
- `manage_users` - Manage user accounts (if applicable)

## Dashboard Overview

### Main Dashboard
The admin dashboard provides an overview of system activity:
- **Total Farmers**: Current count of registered farmers
- **Pending Applications**: Farmers awaiting approval
- **Recent Activity**: Latest system events
- **System Status**: Overall system health

### Navigation Menu
- **Dashboard**: Main overview page
- **KYC Approvals**: Pending farmer applications
- **Farmers**: Approved farmer management
- **Staff**: Staff member management
- **Analytics**: System analytics and reports
- **Settings**: System configuration
- **Notifications**: Admin notifications

## Managing Pending Farmers

### Viewing Pending Applications
1. Navigate to "KYC Approvals" in the main menu
2. You'll see a table of pending farmers with:
   - Farmer name and contact information
   - Application status
   - Submission date
   - Rejection count (if applicable)

### Filtering and Searching
- **Search**: Use the search box to find specific farmers by name, email, or ID
- **Status Filter**: Filter by "All Status", "Pending Verification", or "Email Verified"
- **Sorting**: Click column headers to sort by any field

### Bulk Actions
1. Select multiple farmers using checkboxes
2. Use the bulk action buttons to:
   - Approve selected applications
   - Reject selected applications
   - Export data to CSV

## Reviewing KYC Documents

### Accessing Farmer Details
1. In the pending farmers list, click "View" for any farmer
2. The farmer details page shows:
   - Personal information
   - Farm details
   - Uploaded KYC documents
   - Application history

### Document Review Process
1. **National ID (Front and Back)**:
   - Verify ID is current and not expired
   - Check that all information is clearly visible
   - Confirm photo matches applicant

2. **Selfie**:
   - Verify the person in the selfie matches the ID photo
   - Ensure the National ID is clearly visible in the selfie
   - Check image quality and lighting

### Document Quality Checks
- **Clarity**: All text and images must be readable
- **Completeness**: All required parts of documents visible
- **Authenticity**: No signs of tampering or alteration
- **Recency**: Documents should be current (not expired)

## Approving and Rejecting Applications

### Approval Process
1. Review all documents carefully
2. Ensure all required documents are present
3. Verify information matches across documents
4. Click "Approve Registration"
5. Confirm the approval in the dialog box

### Rejection Process
1. If documents are insufficient or questionable:
   - Click "Reject Registration"
   - Enter a clear, specific rejection reason
   - Click "Confirm Rejection"
2. **Rejection Reason Guidelines**:
   - Be specific and actionable
   - Explain what needs to be corrected
   - Be professional and respectful
   - Example: "National ID photo is blurry. Please upload a clearer image."

### Rejection Limits
- Farmers can resubmit up to 3 times
- After 3 rejections, manual review is required
- Track rejection patterns for system improvements

## Monitoring System Performance

### Analytics Dashboard
Access the analytics dashboard to monitor:
- **Registration Trends**: Daily/weekly registration patterns
- **Approval Rates**: Percentage of approved vs. rejected applications
- **Processing Times**: Average time for application review
- **Resubmission Rates**: How often farmers need to resubmit

### Key Metrics to Monitor
- **Pending Queue Length**: Number of applications awaiting review
- **Average Review Time**: Time from submission to decision
- **Approval Rate**: Percentage of approved applications
- **Resubmission Rate**: Percentage of applications requiring resubmission

### Performance Alerts
Set up notifications for:
- Unusually high rejection rates
- Long processing times
- System errors or downtime
- Unusual activity patterns

## Email Notification Management

### Notification Types
The system sends automated emails for:
- **Registration Confirmation**: Sent to farmers after initial registration
- **KYC Submission**: Sent when documents are submitted
- **Approval**: Sent when application is approved
- **Rejection**: Sent when application is rejected
- **Resubmission**: Sent when farmer can resubmit documents

### Email Templates
Admins can manage email templates:
1. Navigate to Settings → Email Templates
2. Edit subject lines and body content
3. Use placeholders like `{{farmer_name}}` for personalization
4. Test templates before deployment

### Rate Limiting
The system implements rate limiting to prevent spam:
- Maximum 5 emails per farmer per day
- Maximum 1000 emails per hour system-wide
- Automatic throttling during high-volume periods

## Audit Trail and Reporting

### Farmer Approval History
Every action is logged in the audit trail:
- **Approvals**: Who approved, when, and any notes
- **Rejections**: Who rejected, reason, and when
- **Resubmissions**: When farmers resubmit documents
- **System Events**: Technical events and errors

### Accessing Audit Records
1. Navigate to a specific farmer's details page
2. Scroll to the "Approval History" section
3. View all actions taken on that farmer's application

### Exporting Reports
1. Use the bulk export feature to download CSV data
2. Filter by date range, status, or other criteria
3. Include audit trail information in exports
4. Schedule regular report generation

### Compliance Reporting
Generate reports for:
- **Regulatory Compliance**: Document all approval decisions
- **Internal Audits**: Track approval consistency
- **Performance Reviews**: Analyze team performance
- **System Improvements**: Identify bottlenecks and issues

## Troubleshooting

### Common Issues and Solutions

#### Approval/Rejection Issues
**Problem**: Approval button is disabled
**Solution**: 
1. Verify farmer status is "Email Verified"
2. Check that all 3 documents are uploaded
3. Refresh the page and try again

**Problem**: Error when approving/rejecting
**Solution**:
1. Check internet connection
2. Verify you have proper permissions
3. Try again in a few minutes
4. Contact system administrator if issue persists

#### Document Viewing Issues
**Problem**: Cannot view uploaded documents
**Solution**:
1. Check file permissions
2. Verify document exists in storage
3. Try different browser
4. Clear browser cache

#### Performance Issues
**Problem**: System is slow or unresponsive
**Solution**:
1. Check system status dashboard
2. Verify internet connection
3. Try during off-peak hours
4. Contact technical support

#### Email Issues
**Problem**: Not receiving system emails
**Solution**:
1. Check spam/junk folders
2. Verify email addresses in system
3. Check email queue status
4. Review rate limiting settings

### Contact Support
If you continue to experience issues:
- **Email**: admin-support@cowconnect.app
- **Phone**: +254-XXX-XXXXXX
- **Hours**: Monday-Friday, 8:00 AM - 6:00 PM EAT
- **Emergency**: 24/7 for critical system issues

### What to Include in Support Requests
When contacting support, please include:
- Detailed description of the issue
- Steps to reproduce the problem
- Screenshots if applicable
- Error messages received
- Time and date of occurrence

## Security Best Practices

### Account Security
- Use strong, unique passwords
- Enable two-factor authentication if available
- Log out when finished with admin tasks
- Never share admin credentials
- Report suspicious activity immediately

### Data Protection
- Only access data necessary for your role
- Do not share farmer information externally
- Follow data retention policies
- Report data breaches immediately

### Approval Consistency
- Follow established review guidelines
- Document reasons for all decisions
- Maintain consistent standards
- Seek guidance for unusual cases

## Training and Onboarding

### New Admin Onboarding
1. **System Overview**: 1-hour introduction to the system
2. **Role-Specific Training**: Training on your specific responsibilities
3. **Shadow Review**: Observe experienced admins
4. **Independent Review**: Conduct reviews with supervision
5. **Full Access**: Independent operation with periodic check-ins

### Ongoing Training
- Monthly refresher sessions
- Updates on policy changes
- New feature training
- Performance feedback sessions

### Performance Metrics
Track admin performance by:
- **Processing Time**: Average time per application
- **Accuracy**: Consistency with guidelines
- **Communication**: Quality of rejection reasons
- **Compliance**: Adherence to policies and procedures

## FAQ

### How many applications should I review per day?
This depends on your team size and volume. Aim for consistent daily processing rather than sporadic batches.

### What if I'm unsure about a document?
When in doubt, reject with a clear reason asking for a clearer document rather than risking approval of invalid applications.

### Can I approve applications on mobile?
While possible, it's recommended to use a desktop computer for document review to ensure proper detail visibility.

### How do I handle suspicious applications?
Flag suspicious applications for senior review and document your concerns in the notes section.

### What if the system is down?
Follow your organization's incident response procedures and contact technical support immediately.

## Version Information
- **Guide Version**: 1.0
- **Last Updated**: October 10, 2025
- **Next Review**: April 10, 2026

For the most current information, always refer to the online version of this guide.