
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, ChevronRight, TrendingUp, TrendingDown, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDetailedBalances } from "@/hooks/useDetailedBalances";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Trip } from "@/types/trip";

const BalanceBreakdown = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dashboardData, dashboardLoading } = useDashboardData();
  const { detailedBalances, balancesLoading } = useDetailedBalances();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleTripClick = (trip: Trip) => {
    navigate('/', { state: { selectedTripId: trip.id } });
  };

  if (dashboardLoading || balancesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading balance details...</span>
        </div>
      </div>
    );
  }

  const owedByMe = detailedBalances?.owedByMe || [];
  const owedToMe = detailedBalances?.owedToMe || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Balance Breakdown</h1>
            <p className="text-slate-600">Detailed view of all your balances across trips</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* What I Owe Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <TrendingDown className="w-5 h-5 text-red-600" />
                What I Owe
                <Badge variant="outline" className="ml-2 bg-red-50 text-red-700">
                  ${dashboardData?.totalOwing.toFixed(2) || '0.00'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {owedByMe.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingDown className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">You don't owe anyone money!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {owedByMe.map((person) => (
                    <Collapsible 
                      key={person.participantId}
                      open={expandedSections.has(`owe-${person.participantId}`)}
                      onOpenChange={() => toggleSection(`owe-${person.participantId}`)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            {expandedSections.has(`owe-${person.participantId}`) ? 
                              <ChevronDown className="w-4 h-4" /> : 
                              <ChevronRight className="w-4 h-4" />
                            }
                            <div>
                              <p className="font-medium text-slate-800">{person.participantName}</p>
                              <p className="text-sm text-slate-500">{person.participantEmail}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-red-700">${person.totalAmount.toFixed(2)}</p>
                            <p className="text-xs text-slate-500">{person.trips.length} trip{person.trips.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-7 mt-2 space-y-2">
                          {person.trips.map((tripBalance, index) => (
                            <div 
                              key={index}
                              onClick={() => handleTripClick(tripBalance.trip)}
                              className="flex items-center justify-between p-3 bg-white rounded border hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <div>
                                  <p className="font-medium text-slate-800">{tripBalance.trip.name}</p>
                                  <p className="text-xs text-slate-500">
                                    {format(new Date(tripBalance.trip.startDate), "MMM d")} - {format(new Date(tripBalance.trip.endDate), "MMM d, yyyy")}
                                  </p>
                                </div>
                              </div>
                              <p className="font-medium text-red-600">${tripBalance.amount.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* What I'm Owed Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <TrendingUp className="w-5 h-5 text-green-600" />
                What I'm Owed
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                  ${dashboardData?.totalOwed.toFixed(2) || '0.00'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {owedToMe.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No one owes you money!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {owedToMe.map((person) => (
                    <Collapsible 
                      key={person.participantId}
                      open={expandedSections.has(`owed-${person.participantId}`)}
                      onOpenChange={() => toggleSection(`owed-${person.participantId}`)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            {expandedSections.has(`owed-${person.participantId}`) ? 
                              <ChevronDown className="w-4 h-4" /> : 
                              <ChevronRight className="w-4 h-4" />
                            }
                            <div>
                              <p className="font-medium text-slate-800">{person.participantName}</p>
                              <p className="text-sm text-slate-500">{person.participantEmail}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-700">${person.totalAmount.toFixed(2)}</p>
                            <p className="text-xs text-slate-500">{person.trips.length} trip{person.trips.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-7 mt-2 space-y-2">
                          {person.trips.map((tripBalance, index) => (
                            <div 
                              key={index}
                              onClick={() => handleTripClick(tripBalance.trip)}
                              className="flex items-center justify-between p-3 bg-white rounded border hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <div>
                                  <p className="font-medium text-slate-800">{tripBalance.trip.name}</p>
                                  <p className="text-xs text-slate-500">
                                    {format(new Date(tripBalance.trip.startDate), "MMM d")} - {format(new Date(tripBalance.trip.endDate), "MMM d, yyyy")}
                                  </p>
                                </div>
                              </div>
                              <p className="font-medium text-green-600">${tripBalance.amount.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BalanceBreakdown;
