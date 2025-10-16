# Farmers Tables Summary

## 1. Farmers Table

The `farmers` table stores information about approved farmers in the system.

### Structure

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, unique identifier for the farmer |
| user_id | uuid | Foreign key referencing the user profile |
| registration_number | text | Unique registration number for the farmer |
| national_id | text | National ID number of the farmer |
| phone_number | text | Contact phone number |
| full_name | text | Full name of the farmer |
| address | text | Physical address of the farmer |
| farm_location | text | Location of the farm |
| kyc_status | kyc_status_enum | KYC verification status (pending, approved, rejected) |
| registration_completed | boolean | Whether registration process is complete |
| email | text | Email address of the farmer |
| gender | text | Gender of the farmer |
| number_of_cows | integer | Number of cows the farmer owns |
| feeding_type | text | Type of feeding used for the cows |
| created_at | timestamptz | Timestamp when the record was created |
| updated_at | timestamptz | Timestamp when the record was last updated |
| deleted_at | timestamptz | Timestamp when the record was deleted (soft delete) |
| created_by | uuid | ID of the user who created the record |
| updated_by | uuid | ID of the user who last updated the record |

### Key Features
- Stores information about approved farmers only
- Linked to user profiles via `user_id`
- Contains KYC status information
- Tracks registration completion status
- Supports soft deletion with `deleted_at` field

## 2. Pending Farmers Table

The `pending_farmers` table stores information about farmers who are in the process of registration but have not yet been approved.

### Structure

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, unique identifier for the pending farmer |
| user_id | uuid | Foreign key referencing the user profile |
| registration_number | text | Unique registration number |
| national_id | text | National ID number |
| phone_number | text | Contact phone number |
| full_name | text | Full name of the farmer |
| email | text | Email address |
| address | text | Physical address |
| farm_location | text | Location of the farm |
| gender | text | Gender (male, female, other) |
| number_of_cows | integer | Number of cows owned |
| feeding_type | text | Type of feeding used |
| age | integer | Age of the farmer (18-100) |
| id_number | text | ID number |
| breeding_method | text | Breeding method (male_bull, artificial_insemination, both) |
| cow_breeds | jsonb | JSON array of cow breeds |
| kyc_complete | boolean | Whether KYC documents have been uploaded |
| email_verified | boolean | Whether email has been verified |
| status | text | Registration status (pending_verification, email_verified, approved, rejected) |
| rejection_reason | text | Reason for rejection if applicable |
| rejection_count | integer | Number of times application has been rejected |
| submitted_at | timestamptz | Timestamp when application was submitted |
| reviewed_at | timestamptz | Timestamp when application was reviewed |
| reviewed_by | uuid | ID of the admin who reviewed the application |
| created_at | timestamptz | Timestamp when the record was created |
| updated_at | timestamptz | Timestamp when the record was last updated |

### Key Features
- Tracks farmers through the registration process
- Stores KYC document completion status
- Manages email verification status
- Handles application approval/rejection workflow
- Tracks rejection history and reasons
- Stores detailed information about farming practices
- Supports multiple registration statuses

## 3. Related Tables

### KYC Documents Table
The `kyc_documents` table stores information about KYC documents uploaded by farmers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| farmer_id | uuid | Foreign key to farmers table (for approved farmers) |
| pending_farmer_id | uuid | Foreign key to pending_farmers table (for pending farmers) |
| document_type | text | Type of document (id_front, id_back, selfie) |
| file_name | text | Name of the uploaded file |
| file_path | text | Path to the file in storage |
| file_size | bigint | Size of the file in bytes |
| mime_type | text | MIME type of the file |
| status | kyc_doc_status_enum | Document status (pending, approved, rejected) |
| created_at | timestamptz | Timestamp when the record was created |
| updated_at | timestamptz | Timestamp when the record was last updated |

### Farmer Approval History Table
The `farmer_approval_history` table tracks the approval process for farmers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| pending_farmer_id | uuid | Foreign key to pending_farmers table |
| farmer_id | uuid | Foreign key to farmers table |
| admin_id | uuid | ID of the admin who performed the action |
| action | text | Type of action (submitted, approved, rejected, resubmitted) |
| previous_status | text | Status before the action |
| new_status | text | Status after the action |
| rejection_reason | text | Reason for rejection if applicable |
| admin_notes | text | Additional notes from the admin |
| timestamp | timestamptz | Timestamp when the action occurred |

## 4. Key Functions

### submit_kyc_for_review
Submits KYC documents for review by an admin.

### approve_pending_farmer
Approves a pending farmer application and creates a record in the farmers table.

### reject_pending_farmer
Rejects a pending farmer application with a reason.

### resubmit_kyc_documents
Allows a rejected farmer to resubmit their KYC documents.

### get_pending_farmers_for_review
Retrieves pending farmers for admin review.

## 5. Workflow

1. User registers and creates a pending farmer record with status `pending_verification`
2. User verifies their email and status changes to `email_verified`
3. User uploads KYC documents and marks `kyc_complete` as true
4. User submits application for review (status becomes `submitted`)
5. Admin reviews the application:
   - If approved: Status becomes `approved` and a record is created in the farmers table
   - If rejected: Status becomes `rejected` with a rejection reason
6. If rejected, farmer can resubmit up to 3 times

## 6. Status Transitions

### Pending Farmers Statuses
- `pending_verification`: Initial state, email not yet verified
- `email_verified`: Email has been verified, ready for KYC documents
- `approved`: Application has been approved
- `rejected`: Application has been rejected

## 7. Constraints

### Farmers Table
- `user_id` is unique and references profiles table
- `registration_number` is unique
- `national_id` is unique

### Pending Farmers Table
- `user_id` references auth.users table
- `gender` must be one of: male, female, other
- `status` must be one of: pending_verification, email_verified, approved, rejected
- `age` must be between 18 and 100
- `breeding_method` must be one of: male_bull, artificial_insemination, both
- `cow_breeds` is stored as JSONB array