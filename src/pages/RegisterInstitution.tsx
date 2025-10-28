import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const RegisterInstitution = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-large border-2">
              <CardHeader className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-soft mx-auto">
                  <GraduationCap className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-3xl text-center">Institution Registration</CardTitle>
                <CardDescription className="text-center text-base">
                  Register your institution to connect with investors and request sanitary pads for your students.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="institution-name">Institution Name *</Label>
                  <Input id="institution-name" placeholder="University of..." />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input id="country" placeholder="Kenya" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" placeholder="Nairobi" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Physical Address *</Label>
                  <Input id="address" placeholder="Street address" />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-person">Contact Person Name *</Label>
                    <Input id="contact-person" placeholder="Full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Input id="position" placeholder="Dean, Registrar..." />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Official Email *</Label>
                  <Input id="email" type="email" placeholder="contact@university.edu" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" type="tel" placeholder="+254..." />
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
                
                <Button variant="hero" size="lg" className="w-full">
                  Create Institution Account
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
                <GraduationCap className="w-5 h-5 text-primary" />
                Next Steps After Registration
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You'll receive an email verification link</li>
                <li>• Log in to your dashboard to upload verification documents</li>
                <li>• Our admin team will review your documentation</li>
                <li>• Once approved, you can start creating pad requests</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RegisterInstitution;
