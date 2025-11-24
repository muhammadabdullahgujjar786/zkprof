import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export const SolanaWalletProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => {
    // Use custom RPC endpoint from secrets if available, otherwise fall back to devnet
    const customEndpoint = import.meta.env.VITE_SOLANA_RPC_ENDPOINT;
    const finalEndpoint = customEndpoint || clusterApiUrl('devnet');
    
    console.log('🔗 Solana RPC Configuration:');
    console.log('  Custom endpoint defined:', !!customEndpoint);
    console.log('  Using endpoint:', finalEndpoint);
    console.log('  Network:', finalEndpoint.includes('devnet') ? 'DEVNET' : 'MAINNET');
    
    return finalEndpoint;
  }, []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
