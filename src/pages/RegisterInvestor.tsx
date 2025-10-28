import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeartHandshake } from "lucide-react";
import { Link } from "react-router-dom";

const RegisterInvestor = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-large border-2">
              <CardHeader className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-coral flex items-center justify-center shadow-soft mx-auto">
                  <HeartHandshake className="w-8 h-8 text-secondary-foreground" />
                </div>
                <CardTitle className="text-3xl text-center">Investor Registration</CardTitle>
                <CardDescription className="text-center text-base">
                  Join our community of compassionate investors making a real difference in students' lives.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="investor-type">Investor Type *</Label>
                  <Select>
                    <SelectTrigger id="investor-type">
                      <SelectValue placeholder="Select investor type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="foundation">Foundation</SelectItem>
                      <SelectItem value="ngo">NGO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name / Company Name *</Label>
                  <Input id="name" placeholder="Your name or organization" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input id="phone" type="tel" placeholder="+1..." />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" placeholder="Create a secure password" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password *</Label>
                  <Input id="confirm-password" type="password" placeholder="Re-enter password" />
                </div>
                
                <div className="flex items-start space-x-2 pt-4">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    I agree to the terms of service and understand that my account will be pending 
                    verification until I upload required documentation and receive admin approval.
                  </Label>
                </div>
                
                <Button variant="coral" size="lg" className="w-full">
                  Create Investor Account
                </Button>
                
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Login here
                  </Link>
                </p>
              </CardContent>
            </Card>
            
            <div className="mt-8 p-6 bg-accent/50 rounded-lg border border-border">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-secondary" />
                Next Steps After Registration
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You'll receive an email verification link</li>
                <li>• Log in to upload your verification documents</li>
                <li>• Our admin team will review and approve your account</li>
                <li>• Start browsing institutions and making donations!</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RegisterInvestor;
