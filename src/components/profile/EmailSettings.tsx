import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const EmailSettings: React.FC = () => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'verified'>('none');
  const [loading, setLoading] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserEmailSettings();
    }
  }, [user]);

  const fetchUserEmailSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, email_verified, email_verification_status')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setEmail(data.email || '');
        setIsVerified(data.email_verified || false);
        // Ensure the status is one of the expected values
        const status = data.email_verification_status;
        if (status === 'pending' || status === 'verified') {
          setVerificationStatus(status);
        } else {
          setVerificationStatus('none');
        }
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }
  };

  const sendVerificationEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Generate a 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the code and email in the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: email,
          email_verification_code: code,
          email_verification_status: 'pending',
          email_verified: false
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Send verification email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-email-verification', {
        body: { email, code, userName: user?.email }
      });

      if (emailError) throw emailError;

      setVerificationStatus('pending');
      setShowVerificationInput(true);
      
      toast({
        title: "Verification Email Sent",
        description: `A verification code has been sent to ${email}`,
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast({
        title: "Error",
        description: "Failed to send verification email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async () => {
    if (!verificationCode) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if the code matches
      const { data, error } = await supabase
        .from('profiles')
        .select('email_verification_code')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data?.email_verification_code === verificationCode) {
        // Update profile to mark email as verified
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email_verified: true,
            email_verification_status: 'verified',
            email_verification_code: null
          })
          .eq('id', user?.id);

        if (updateError) throw updateError;

        setIsVerified(true);
        setVerificationStatus('verified');
        setShowVerificationInput(false);
        setVerificationCode('');

        toast({
          title: "Email Verified",
          description: "Your email address has been successfully verified",
        });
      } else {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      toast({
        title: "Error",
        description: "Failed to verify email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Not Verified
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Settings
        </CardTitle>
        <p className="text-sm text-gray-600">
          Verify your email address to send bid invitations from your own email
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={isVerified}
            />
            {getStatusBadge()}
          </div>
        </div>

        {!isVerified && (
          <Button 
            onClick={sendVerificationEmail} 
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Send Verification Email'}
          </Button>
        )}

        {showVerificationInput && (
          <div className="space-y-2">
            <Label htmlFor="verificationCode">Verification Code</Label>
            <div className="flex gap-2">
              <Input
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
              <Button onClick={verifyEmail} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Check your email for the verification code
            </p>
          </div>
        )}

        {isVerified && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              ✓ Your email is verified and can be used to send bid invitations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
