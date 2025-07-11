import { ArrowRight, Plane, Users, Calculator, CheckCircle, MapPin, Luggage, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-20"></div>
        
        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="p-3 bg-primary rounded-full">
                <Compass className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                Wanderlust Wallet
              </h1>
            </div>

            {/* Hero Content */}
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Turn Group Adventures into
                <span className="text-primary block">Stress-Free Memories</span>
              </h2>
              
              <p className="text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Split expenses, track balances, and settle up seamlessly with your travel companions. 
                Focus on the journey, not the math.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Button 
                onClick={onGetStarted}
                size="lg" 
                className="text-lg px-8 py-4 bg-primary hover:bg-primary/90"
              >
                Start Your Adventure
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={onGetStarted}
                className="text-lg px-8 py-4"
              >
                Sign In
              </Button>
            </div>

            {/* Hero Icons */}
            <div className="flex justify-center gap-8 pt-12 opacity-60">
              <Plane className="w-8 h-8 text-primary animate-pulse" />
              <MapPin className="w-8 h-8 text-secondary animate-pulse delay-300" />
              <Luggage className="w-8 h-8 text-accent animate-pulse delay-700" />
            </div>
          </div>
        </div>
      </section>

      {/* What is Wanderlust Wallet Section */}
      <section className="py-16 lg:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              What is Wanderlust Wallet?
            </h2>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
              Wanderlust Wallet is the ultimate expense-splitting companion for group travelers. 
              Whether you're backpacking through Europe, road-tripping with friends, or planning 
              a luxury getaway, we make managing shared expenses effortless.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-12">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Group Travel Made Easy</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Add your travel companions and split bills instantly. 
                    No more awkward conversations about money.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                    <Calculator className="w-6 h-6 text-secondary" />
                  </div>
                  <CardTitle>Smart Balance Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    See who owes what in real-time. Our smart calculator 
                    handles complex splits and keeps everyone in the loop.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-accent" />
                  </div>
                  <CardTitle>Seamless Settlement</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Track payments and settle up easily. Know exactly 
                    when everyone is squared up.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                Perfect for Every Adventure
              </h2>
              <p className="text-lg text-muted-foreground">
                From weekend getaways to month-long expeditions
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Multiple Trip Management</h3>
                    <p className="text-muted-foreground">
                      Track expenses across all your adventures. Each trip stays organized separately.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Mobile-Friendly</h3>
                    <p className="text-muted-foreground">
                      Add expenses on the go. Works perfectly on all devices, anywhere you travel.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Secure & Private</h3>
                    <p className="text-muted-foreground">
                      Your financial data stays safe with enterprise-grade security and privacy protection.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:text-center">
                <div className="inline-flex p-8 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl">
                  <div className="space-y-4">
                    <div className="flex justify-center gap-4">
                      <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                        <Plane className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center">
                        <Users className="w-8 h-8 text-secondary-foreground" />
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center">
                        <Calculator className="w-8 h-8 text-accent-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Ready to Start Your Next Adventure?
            </h2>
            <p className="text-xl text-white/90">
              Join thousands of travelers who've simplified their group expenses with Wanderlust Wallet.
            </p>
            <Button 
              onClick={onGetStarted}
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-4"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};