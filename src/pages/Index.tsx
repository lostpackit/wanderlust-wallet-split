import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { LandingPage } from "@/components/LandingPage";
import AuthPage from "@/components/AuthPage";
import UserDashboard from "@/components/UserDashboard";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTrips } from "@/hooks/useTrips";
import CreateTripModal from "@/components/CreateTripModal";
import QuickAddExpenseModal from "@/components/QuickAddExpenseModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, LogOut } from "lucide-react";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard'>(user ? 'dashboard' : 'landing');
  const { dashboardData, dashboardLoading: dashboardDataLoading, dashboardError } = useDashboardData();
  const { createTrip } = useTrips();

  // Handle redirect after authentication
  useEffect(() => {
    if (user && location.state?.redirectTo) {
      navigate(location.state.redirectTo, { replace: true });
    }
  }, [user, location.state, navigate]);

  console.log('Index: Current state:', { 
    userExists: !!user, 
    loading, 
    view,
    userEmail: user?.email 
  });

  if (loading) {
    console.log('Index: Still loading auth state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users, but redirect to auth if there's a message
  if (!user && view === 'landing') {
    if (location.state?.message) {
      setView('auth');
      return <div>Redirecting to authentication...</div>;
    }
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
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center sm:flex-wrap gap-4 mb-8">
          <div className="text-center sm:text-left space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">Wanderlust Wallet</h1>
            <p className="text-slate-600 text-base sm:text-lg">Welcome back, {user.email}!</p>
          </div>
          <div className="flex items-center gap-2 justify-center sm:justify-end flex-wrap max-w-full">
            <CreateTripModal onCreateTrip={createTrip} />
            {dashboardData && (
              <QuickAddExpenseModal activeTrips={dashboardData.activeTrips} />
            )}
            <Button variant="outline" onClick={() => navigate('/profile')} className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Profile</span>
            </Button>
            <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {dashboardError ? (
          <Card className="bg-background/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Dashboard failed to load</h2>
                <p className="text-sm text-muted-foreground">
                  This is usually caused by a permission (RLS) error or a stale login session.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => window.location.reload()}>Reload</Button>
                <Button variant="outline" onClick={signOut}>Sign out & retry</Button>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {String(dashboardError)}
              </pre>
            </CardContent>
          </Card>
        ) : dashboardDataLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : dashboardData ? (
          <UserDashboard 
            dashboardData={dashboardData}
            onSelectTrip={(trip, expenseId) => {
              const url = expenseId 
                ? `/trip/${trip.id}?expenseId=${expenseId}` 
                : `/trip/${trip.id}`;
              navigate(url);
            }}
          />
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground">No dashboard data yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;