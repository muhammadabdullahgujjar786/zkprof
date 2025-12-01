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
      console.log('🔍 ZKProofVerifier: Starting verification...');
      console.log('📦 Raw proof data:', proofData);
      console.log('📊 Raw public signals:', publicSignals);
      console.log('🔑 Commitment:', commitment);
      
      const proof = deserializeProof(proofData);
      console.log('✅ Deserialized proof:', proof);
      
      // Validate proof structure
      if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
        throw new Error('Invalid proof structure: missing pi_a, pi_b, or pi_c');
      }
      
      // Ensure publicSignals are strings (snarkjs expects strings)
      const signalsAsStrings = publicSignals.map(s => String(s));
      console.log('📝 Public signals as strings:', signalsAsStrings);
      console.log('📏 Signal count:', signalsAsStrings.length);
      
      const isValid = await verifyZKProof(proof, signalsAsStrings);
      
      setVerificationStatus(isValid ? 'valid' : 'invalid');
      
      if (isValid) {
        toast.success('ZK-SNARK proof verified! This zkPFP is cryptographically authentic.');
      } else {
        console.warn('⚠️ Verification failed - possible causes:');
        console.warn('1. Verification key mismatch (not generated from current .zkey)');
        console.warn('2. Proof generated with different circuit parameters');
        console.warn('3. Public signals don\'t match proof');
        toast.error('ZK-SNARK proof verification failed. This may be a legacy proof or key mismatch.');
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
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
