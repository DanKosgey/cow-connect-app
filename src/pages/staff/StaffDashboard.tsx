import { DashboardLayout } from "@/components/DashboardLayout";

const StaffDashboard = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Staff Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Add your staff dashboard content here */}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;