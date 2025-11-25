import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { verifyZKProof, deserializeProof } from '@/lib/zkproof';
import { toast } from 'sonner';

interface ZKProofVerifierProps {
  proofData?: string;
  publicSignals?: string[];
  commitment: string;
}

export function ZKProofVerifier({ proofData, publicSignals, commitment }: ZKProofVerifierProps) {
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verifying' | 'valid' | 'invalid'>('pending');

  const handleVerify = async () => {
    if (!proofData || !publicSignals) {
      toast.error('No ZK proof data available');
      return;
    }

    setVerificationStatus('verifying');
    
    try {
      const proof = deserializeProof(proofData);
      const isValid = await verifyZKProof(proof, publicSignals);
      
      setVerificationStatus(isValid ? 'valid' : 'invalid');
      
      if (isValid) {
        toast.success('ZK-SNARK proof verified! This zkPFP is cryptographically authentic.');
      } else {
        toast.error('ZK-SNARK proof verification failed. This zkPFP may be invalid.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('invalid');
      toast.error('Failed to verify proof: ' + (error as Error).message);
    }
  };

  // If no proof data, show that it's commitment-only
  if (!proofData || !publicSignals) {
    return (
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Legacy commitment (no ZK proof)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {verificationStatus === 'pending' && (
        <>
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            ZK-Verified
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleVerify}
            className="h-7 text-xs"
          >
            Verify Proof
          </Button>
        </>
      )}
      
      {verificationStatus === 'verifying' && (
        <Badge variant="outline" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Verifying...
        </Badge>
      )}
      
      {verificationStatus === 'valid' && (
        <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <ShieldCheck className="h-3 w-3" />
          Verified
        </Badge>
      )}
      
      {verificationStatus === 'invalid' && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" />
          Invalid
        </Badge>
      )}
    </div>
  );
}
