import { DashboardLayout } from "@/components/DashboardLayout";

const FarmerDashboard = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Farmer Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Add your farmer dashboard content here */}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FarmerDashboard;