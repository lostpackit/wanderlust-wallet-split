import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LandingPage } from "@/components/LandingPage";
import AuthPage from "@/components/AuthPage";
import UserDashboard from "@/components/UserDashboard";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard'>(user ? 'dashboard' : 'landing');
  const dashboardData = useDashboardData();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Show landing page for non-authenticated users
  if (!user && view === 'landing') {
    return <LandingPage onGetStarted={() => setView('auth')} />;
  }

  // Show auth page
  if (!user && view === 'auth') {
    return <AuthPage />;
  }

  // Redirect authenticated users away from landing/auth
  if (user && (view === 'landing' || view === 'auth')) {
    setView('dashboard');
    return <div>Loading...</div>;
  }

  // Dashboard view for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-slate-800">Wanderlust Wallet</h1>
              <p className="text-slate-600 text-lg">Welcome back, {user.email}!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/profile'} className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </Button>
          </div>
        </div>
        
        <UserDashboard 
          {...dashboardData}
          onSelectTrip={() => {}}
        />
      </div>
    </div>
  );
};

export default Index;