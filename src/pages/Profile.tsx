import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, CreditCard, Save } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { profile, isLoading, updateProfile, isUpdatingProfile } = useProfile();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: '',
    venmo_username: '',
    paypal_email: '',
    zelle_number: '',
    cashapp_tag: '',
    other_payment_info: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        venmo_username: profile.venmo_username || '',
        paypal_email: profile.paypal_email || '',
        zelle_number: profile.zelle_number || '',
        cashapp_tag: profile.cashapp_tag || '',
        other_payment_info: profile.other_payment_info || '',
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
            Sign Out
          </Button>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <User className="w-5 h-5 text-blue-600" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and display name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <CreditCard className="w-5 h-5 text-green-600" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Add your payment information so others can pay you easily
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venmo_username">Venmo Username</Label>
                    <Input
                      id="venmo_username"
                      value={formData.venmo_username}
                      onChange={(e) => handleInputChange('venmo_username', e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paypal_email">PayPal Email</Label>
                    <Input
                      id="paypal_email"
                      type="email"
                      value={formData.paypal_email}
                      onChange={(e) => handleInputChange('paypal_email', e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zelle_number">Zelle Phone/Email</Label>
                    <Input
                      id="zelle_number"
                      value={formData.zelle_number}
                      onChange={(e) => handleInputChange('zelle_number', e.target.value)}
                      placeholder="Phone number or email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashapp_tag">Cash App Tag</Label>
                    <Input
                      id="cashapp_tag"
                      value={formData.cashapp_tag}
                      onChange={(e) => handleInputChange('cashapp_tag', e.target.value)}
                      placeholder="$cashtag"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other_payment_info">Other Payment Information</Label>
                  <Textarea
                    id="other_payment_info"
                    value={formData.other_payment_info}
                    onChange={(e) => handleInputChange('other_payment_info', e.target.value)}
                    placeholder="Bank details, international payment methods, etc."
                    rows={3}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isUpdatingProfile}
                  className="flex items-center gap-2"
                >
                  {isUpdatingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;