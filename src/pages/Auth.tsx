
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, ArrowLeft, Fish, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/** Rotating jokes for the login screen. Internal site, adult crew: keep them funny, not filthy. */
const JOKES: { setup: string; punchline: string }[] = [
  { setup: 'A contractor dies and St. Peter says, "Why should I let you in?" He says, "I finished a job on time and under budget."', punchline: 'St. Peter says, "Liar. Straight to hell." He says, "Fine. I built the place, and they still owe me the final draw."' },
  { setup: 'Give a man a fish and he eats for a day.', punchline: 'Teach a man to fish and he calls in "sick" every Friday for the rest of his life.' },
  { setup: "Fishing isn't drinking at 9 a.m.", punchline: "It's drinking at 9 a.m. with an alibi." },
  { setup: 'My wife said, "You love fishing more than you love me."', punchline: 'I said, "That\'s not fair. I love the boat more than both of you."' },
  { setup: "What's the difference between a fisherman and a contractor?", punchline: 'The fisherman admits he\'s lying about the size.' },
  { setup: 'Our safety meeting covered hydration today.', punchline: 'The crew voted unanimously that beer is 95% water and called it compliant.' },
  { setup: 'My doctor told me to cut back on beer and stress.', punchline: "So I stopped answering the architect's calls. Halfway there." },
  { setup: 'The two happiest days of a boat owner\'s life are the day he buys it and the day he sells it.', punchline: 'Same goes for any job where the owner says, "I watched a YouTube video."' },
  { setup: 'I told my wife the bathroom remodel would take two weekends.', punchline: 'That was 2019. The fish and I are still on schedule.' },
  { setup: 'Why do fishermen make great project managers?', punchline: 'They can sit for eight hours doing nothing and still call it a productive day.' },
  { setup: 'An owner asked if we could do it fast, cheap and good.', punchline: 'I said pick two. He picked "cheap" twice.' },
  { setup: 'Sent the new guy to the truck for a bucket of steam and a board stretcher.', punchline: 'He came back with my cooler and a six-pack. Made him foreman.' },
  { setup: 'Marriage is a lot like a change order.', punchline: "You don't fully understand what you signed until it's way too late to back out." },
  { setup: "I never lie about how big the fish was.", punchline: "I save that for the IRS, where the boat is a \"site inspection vessel.\"" },
];

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [jokeIndex, setJokeIndex] = useState(() => Math.floor(Math.random() * JOKES.length));

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

  const joke = JOKES[jokeIndex];
  const nextJoke = () => setJokeIndex((i) => (i + 1 + Math.floor(Math.random() * (JOKES.length - 1))) % JOKES.length);

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

        <div />

        <figure className="relative max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            <Fish className="h-4 w-4" /> Joke of the day
          </div>
          <blockquote key={jokeIndex} className="animate-fade-in-up">
            <p className="font-display text-3xl font-bold leading-snug tracking-tight text-white/90">{joke.setup}</p>
            <p className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-accent">{joke.punchline}</p>
          </blockquote>
          <button
            type="button"
            onClick={nextJoke}
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" /> Tell me another
          </button>
        </figure>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} RBF Construction</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="leading-tight">
              <div className="font-display text-lg font-extrabold tracking-tight">RBF Construction</div>
              <div className="text-xs text-muted-foreground">Rather Be Fishing</div>
            </div>
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
              <p className="mt-1 text-sm text-muted-foreground">Sign in to get back to work. The fish can wait.</p>

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
          <button
            type="button"
            onClick={nextJoke}
            className="mt-10 block w-full rounded-xl border border-dashed p-4 text-left lg:hidden"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Joke of the day · tap for another</span>
            <span className="mt-2 block text-sm text-muted-foreground">{joke.setup}</span>
            <span className="mt-1 block text-sm font-semibold">{joke.punchline}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
