'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { user, loading, login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push(redirect);
    }
  }, [user, loading, router, redirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userCredential = await login(email, password);
      toast.success('Welcome back!');
      
      // Check user's role and redirect accordingly
      const token = await userCredential.user.getIdTokenResult();
      const claims = token.claims;
      
      // Redirect founder/leadership to leadership dashboard
      if (claims.founder || claims.leadership) {
        router.push('/leadership');
      } else {
        router.push(redirect);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      if (errorMessage.includes('user-not-found') || errorMessage.includes('wrong-password')) {
        setError('Invalid email or password');
      } else if (errorMessage.includes('too-many-requests')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#419372' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative overflow-hidden" style={{ backgroundColor: '#419372' }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          {/* Avni Logo with white background */}
          <div className="bg-white rounded-xl p-3 shadow-lg inline-block">
            <div className="relative h-12 w-48">
              <Image
                src="/avni-logo.png"
                alt="Avni by Samanvay Foundation"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Support Intelligence<br />Dashboard
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            Real-time analytics and insights for the Avni support team. 
            Track tickets, monitor performance, and deliver exceptional support.
          </p>
          
          <div className="flex gap-4 pt-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center min-w-[100px]">
              <div className="text-3xl font-bold text-white">24/7</div>
              <div className="text-white/70 text-xs">Support</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center min-w-[100px]">
              <div className="text-3xl font-bold text-white">100+</div>
              <div className="text-white/70 text-xs">Organizations</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center min-w-[100px]">
              <div className="text-3xl font-bold text-white">2.5h</div>
              <div className="text-white/70 text-xs">Avg Resolution</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-white/60 text-sm">
          © {new Date().getFullYear()} Samanvay Foundation. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-white">
        <Card className="w-full max-w-md border-0 shadow-2xl shadow-emerald-500/10">
          <CardContent className="p-8">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center mb-8">
              <div className="relative h-12 w-48">
                <Image
                  src="/avni-logo.png"
                  alt="Avni by Samanvay Foundation"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 mt-2">Sign in to access the dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@samanvayfoundation.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="pl-10 h-12 border-gray-200 focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-12 border-gray-200 focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-white font-medium shadow-lg" 
                style={{ backgroundColor: '#419372' }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                This is an internal tool for the Avni support team.
                <br />
                Contact your administrator if you need access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#419372' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
