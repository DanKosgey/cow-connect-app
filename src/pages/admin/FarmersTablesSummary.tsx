import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const FarmersTablesSummary = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Farmers Tables Summary</h1>
          <p className="text-muted-foreground">
            Detailed overview of the farmers and pending farmers database tables
          </p>
        </div>

        {/* Farmers Table */}
        <Card className="mb-8 shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="default">1</Badge>
              Farmers Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Stores information about approved farmers in the system.
            </p>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>id</TableCell>
                    <TableCell>uuid</TableCell>
                    <TableCell>Primary key, unique identifier for the farmer</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>user_id</TableCell>
                    <TableCell>uuid</TableCell>
                    <TableCell>Foreign key referencing the user profile</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>registration_number</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Unique registration number for the farmer</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>national_id</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>National ID number of the farmer</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>phone_number</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Contact phone number</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>full_name</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Full name of the farmer</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>address</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Physical address of the farmer</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>farm_location</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Location of the farm</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>kyc_status</TableCell>
                    <TableCell>kyc_status_enum</TableCell>
                    <TableCell>KYC verification status (pending, approved, rejected)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>registration_completed</TableCell>
                    <TableCell>boolean</TableCell>
                    <TableCell>Whether registration process is complete</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>email</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Email address of the farmer</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>gender</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Gender of the farmer</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>number_of_cows</TableCell>
                    <TableCell>integer</TableCell>
                    <TableCell>Number of cows the farmer owns</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>feeding_type</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Type of feeding used for the cows</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>created_at</TableCell>
                    <TableCell>timestamptz</TableCell>
                    <TableCell>Timestamp when the record was created</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>updated_at</TableCell>
                    <TableCell>timestamptz</TableCell>
                    <TableCell>Timestamp when the record was last updated</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>deleted_at</TableCell>
                    <TableCell>timestamptz</TableCell>
                    <TableCell>Timestamp when the record was deleted (soft delete)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>created_by</TableCell>
                    <TableCell>uuid</TableCell>
                    <TableCell>ID of the user who created the record</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>updated_by</TableCell>
                    <TableCell>uuid</TableCell>
                    <TableCell>ID of the user who last updated the record</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pending Farmers Table */}
        <Card className="mb-8 shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="default">2</Badge>
              Pending Farmers Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Stores information about farmers who are in the process of registration but have not yet been approved.
            </p>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>id</TableCell>
                    <TableCell>uuid</TableCell>
                    <TableCell>Primary key, unique identifier for the pending farmer</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>user_id</TableCell>
                    <TableCell>uuid</TableCell>
                    <TableCell>Foreign key referencing the user profile</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>registration_number</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Unique registration number</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>national_id</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>National ID number</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>phone_number</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Contact phone number</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>full_name</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Full name of the farmer</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>email</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Email address</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>address</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Physical address</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>farm_location</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Location of the farm</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>gender</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Gender (male, female, other)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>number_of_cows</TableCell>
                    <TableCell>integer</TableCell>
                    <TableCell>Number of cows owned</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>feeding_type</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Type of feeding used</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>age</TableCell>
                    <TableCell>integer</TableCell>
                    <TableCell>Age of the farmer (18-100)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>id_number</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>ID number</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>breeding_method</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Breeding method (male_bull, artificial_insemination, both)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>cow_breeds</TableCell>
                    <TableCell>jsonb</TableCell>
                    <TableCell>JSON array of cow breeds</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>kyc_complete</TableCell>
                    <TableCell>boolean</TableCell>
                    <TableCell>Whether KYC documents have been uploaded</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>email_verified</TableCell>
                    <TableCell>boolean</TableCell>
                    <TableCell>Whether email has been verified</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>status</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Registration status (pending_verification, email_verified, approved, rejected)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>rejection_reason</TableCell>
                    <TableCell>text</TableCell>
                    <TableCell>Reason for rejection if applicable</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>rejection_count</TableCell>
                    <TableCell>integer</TableCell>
                    <TableCell>Number of times application has been rejected</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>submitted_at</TableCell>
                    <TableCell>timestamptz</TableCell>
                    <TableCell>Timestamp when application was submitted</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>reviewed_at</TableCell>
                    <TableCell>timestamptz</TableCell>
                    <TableCell>Timestamp when application was reviewed</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>reviewed_by</TableCell>
                    <TableCell>uuid</TableCell>
                    <TableCell>ID of the admin who reviewed the application</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>created_at</TableCell>
                    <TableCell>timestamptz</TableCell>
                    <TableCell>Timestamp when the record was created</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>updated_at</TableCell>
                    <TableCell>timestamptz</TableCell>
                    <TableCell>Timestamp when the record was last updated</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Key Features */}
        <Card className="mb-8 shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="default">3</Badge>
              Key Features & Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold mb-2">Farmers Table Features</h3>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li>Stores information about approved farmers only</li>
              <li>Linked to user profiles via user_id</li>
              <li>Contains KYC status information</li>
              <li>Tracks registration completion status</li>
              <li>Supports soft deletion with deleted_at field</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Pending Farmers Table Features</h3>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li>Tracks farmers through the registration process</li>
              <li>Stores KYC document completion status</li>
              <li>Manages email verification status</li>
              <li>Handles application approval/rejection workflow</li>
              <li>Tracks rejection history and reasons</li>
              <li>Stores detailed information about farming practices</li>
              <li>Supports multiple registration statuses</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Registration Workflow</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>User registers and creates a pending farmer record with status pending_verification</li>
              <li>User verifies their email and status changes to email_verified</li>
              <li>User uploads KYC documents and marks kyc_complete as true</li>
              <li>User submits application for review (status becomes submitted)</li>
              <li>Admin reviews the application:
                <ul className="list-circle pl-5">
                  <li>If approved: Status becomes approved and a record is created in the farmers table</li>
                  <li>If rejected: Status becomes rejected with a rejection reason</li>
                </ul>
              </li>
              <li>If rejected, farmer can resubmit up to 3 times</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmersTablesSummary;