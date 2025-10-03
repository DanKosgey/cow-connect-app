import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot,
  Home,
  Zap,
  Brain,
  Activity,
  Target,
  Award,
  Clock,
  TrendingUp,
  ChartBar,
  Cpu
} from "lucide-react";
import { Link } from "react-router-dom";
import { AdminAI } from "@/components/AdminAI";

const AdminAIPage = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950" />
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent animate-pulse-slow" />
        
        <AdminSidebar />
        
        <SidebarInset className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <header className="px-6 py-4 border-b border-emerald-500/20 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                    Executive AI Intelligence Center
                  </h1>
                </div>
                <p className="text-emerald-400/80 flex items-center space-x-2 pl-[52px]">
                  <Cpu className="h-4 w-4" />
                  <span>Advanced analytics & strategic decision support</span>
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                  AI Online
                </Badge>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1.5">
                  <Activity className="h-4 w-4 mr-2" />
                  Real-time
                </Badge>
                <Link to="/admin">
                  <Button variant="outline" 
                    className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-6 relative">
            <AdminAI />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminAIPage;
