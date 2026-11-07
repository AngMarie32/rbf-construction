
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HardHat, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    
    if (error) {
      toast.error(error.message || 'Failed to send reset email');
    } else {
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
      setResetEmail('');
    }
    setLoading(false);
  };

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
    } else {
      toast.success('Successfully signed in!');
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    const { error } = await signUp(email, password, name);

    if (error) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
    } else {
      toast.success('Account created successfully! Please check your email to confirm your account.');
    }

    setLoading(false);
  };

  // Called as a function (not <PasswordField/>) so toggling visibility doesn't remount the input and clear it.
  const passwordField = (id: string, minLength?: number) => (
    <div className="relative">
      <Input
        id={id}
        name="password"
        type={showPassword ? 'text' : 'password'}
        autoComplete={minLength ? 'new-password' : 'current-password'}
        placeholder="••••••••"
        required
        disabled={loading}
        minLength={minLength}
        className="h-11 pr-10"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  const highlights = [
    'Bids, estimates and proposals in one place',
    'Real-time job costs, billing and profit',
    'Change orders and pay apps with e-signature',
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[hsl(222_47%_11%)] p-12 text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div aria-hidden className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-orange-600 shadow-lg shadow-orange-500/30">
            <HardHat className="h-6 w-6" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-lg font-extrabold tracking-tight">RBF Construction</div>
            <div className="text-xs text-white/60">Operations Hub</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight">
            Run every job from bid to closeout.
          </h2>
          <ul className="mt-8 space-y-4">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-3 text-white/80">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} RBF Construction</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-orange-600 text-white">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">RBF Construction</span>
          </div>

          {showForgotPassword ? (
            <div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to sign in
              </button>
              <h1 className="font-display text-2xl font-bold tracking-tight">Reset your password</h1>
              <p className="mt-1 text-sm text-muted-foreground">We'll email you a link to choose a new password.</p>
              <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={loading}
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold tracking-tight">Welcome back</h1>
              <p className="mt-1 text-sm text-muted-foreground">Sign in to your construction management portal.</p>

              <Tabs defaultValue="signin" className="mt-6 w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required disabled={loading} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setShowForgotPassword(true)}>
                          Forgot password?
                        </button>
                      </div>
                      {passwordField('signin-password')}
                    </div>
                    <Button type="submit" className="h-11 w-full" disabled={loading}>
                      {loading ? 'Signing in…' : 'Sign in'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input id="signup-name" name="name" type="text" autoComplete="name" placeholder="Jane Smith" required disabled={loading} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Work email</Label>
                      <Input id="signup-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required disabled={loading} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      {passwordField('signup-password', 6)}
                      <p className="text-xs text-muted-foreground">At least 6 characters.</p>
                    </div>
                    <Button type="submit" className="h-11 w-full" disabled={loading}>
                      {loading ? 'Creating account…' : 'Create account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
