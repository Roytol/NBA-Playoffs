import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle } from 'lucide-react';
import { AUTH_TAB_TRIGGER_CLASSES } from '@/constants/theme';
import { signInWithPassword, signUpWithPassword } from '@/services';

const NBA_GRADIENT = "bg-gradient-to-r from-blue-600 via-red-500 to-blue-600";

export default function Login() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register State
    const [registerName, setRegisterName] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error } = await signInWithPassword(loginEmail, loginPassword);

        if (error) {
            setError(error.message);
            toast({
                title: "Sign In Failed",
                description: error.message,
                variant: "destructive",
            });
            setIsLoading(false);
        } else {
            navigate('/');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);

        if (!registerName || !registerEmail || !registerPassword || !registerConfirmPassword) {
            setError("Please fill in all fields.");
            toast({
                title: "Missing Fields",
                description: "Please fill in all the required fields.",
                variant: "destructive",
            });
            return;
        }

        if (registerPassword !== registerConfirmPassword) {
            setError("Passwords do not match.");
            toast({
                title: "Validation Error",
                description: "Your passwords do not match. Please try again.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        setError(null);

        // Sign Up with user_metadata so that User.me() inserts the full_name correctly
        const { error: signUpError } = await signUpWithPassword({
            email: registerEmail,
            password: registerPassword,
            full_name: registerName,
        });

        if (signUpError) {
            setError(signUpError.message);
            toast({
                title: "Registration Failed",
                description: signUpError.message,
                variant: "destructive",
            });
            setIsLoading(false);
        } else {
            // Automatically log them in by redirecting to home where AuthContext picks up the session
            toast({
                title: "Account Created!",
                description: `Welcome to the playoffs, ${registerName}!`,
                duration: 4000,
            });
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gray-50">
            {/* Header Brand */}
            <div className="flex flex-col items-center mb-8">
                <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/972189_nba-playoffs-seeklogo.png"
                    alt="NBA Playoffs Logo"
                    className="h-24 mb-4 drop-shadow-md"
                />
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">NBA Playoffs</h1>
                <p className="text-gray-500 mt-2">Sign in to make your predictions and view the leaderboard.</p>
            </div>

            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-red-500">
                <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-t-lg rounded-b-none p-0 h-auto">
                        <TabsTrigger value="signin" className={AUTH_TAB_TRIGGER_CLASSES.signIn}>Sign In</TabsTrigger>
                        <TabsTrigger value="register" className={AUTH_TAB_TRIGGER_CLASSES.register}>Register</TabsTrigger>
                    </TabsList>
                    
                    <CardHeader className="pt-6 pb-2">
                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardHeader>
                    
                    <CardContent>
                        {/* SIGN IN TAB */}
                        <TabsContent value="signin" className="mt-0">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input 
                                        id="email" 
                                        type="email" 
                                        placeholder="fan@nba.com" 
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        required 
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                    </div>
                                    <Input 
                                        id="password" 
                                        type="password" 
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        required 
                                        className="h-11"
                                    />
                                </div>
                                <Button type="submit" className="bg-status-info-strong hover:opacity-90 w-full h-11 mt-6" disabled={isLoading}>
                                    {isLoading ? "Signing in..." : "Sign In"}
                                </Button>
                            </form>
                        </TabsContent>

                        {/* REGISTER TAB */}
                        <TabsContent value="register" className="mt-0">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input 
                                        id="name" 
                                        type="text" 
                                        placeholder="LeBron James" 
                                        value={registerName}
                                        onChange={(e) => setRegisterName(e.target.value)}
                                        required 
                                        className="border-status-danger h-11 focus-visible:ring-status-danger"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-email">Email</Label>
                                    <Input 
                                        id="reg-email" 
                                        type="email" 
                                        placeholder="king@lakers.com" 
                                        value={registerEmail}
                                        onChange={(e) => setRegisterEmail(e.target.value)}
                                        required 
                                        className="border-status-danger h-11 focus-visible:ring-status-danger"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-password">Password</Label>
                                    <Input 
                                        id="reg-password" 
                                        type="password" 
                                        value={registerPassword}
                                        onChange={(e) => setRegisterPassword(e.target.value)}
                                        required 
                                        minLength={6}
                                        className="border-status-danger h-11 focus-visible:ring-status-danger"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                                    <Input 
                                        id="reg-confirm-password" 
                                        type="password" 
                                        value={registerConfirmPassword}
                                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                                        required 
                                        minLength={6}
                                        className="border-status-danger h-11 focus-visible:ring-status-danger"
                                    />
                                </div>
                                <Button type="submit" className="bg-status-danger-strong hover:opacity-90 w-full h-11 mt-6" disabled={isLoading}>
                                    {isLoading ? "Creating account..." : "Create Account"}
                                </Button>
                            </form>
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
}
