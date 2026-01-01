/**
 * Privy Wallet Provider
 * 
 * Wraps the application with Privy authentication.
 * Supports email, wallet, and social logins.
 */

import { PrivyProvider } from '@privy-io/react-auth';
import type { ReactNode } from 'react';

// ============================================================================
// Privy Configuration
// ============================================================================

// Use the actual Privy App ID from env or fallback
const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APPID || 'cmjky2xvh00pol80ba4687lsu';

// ============================================================================
// Custom Chain for Privy (requires specific format)
// ============================================================================

const monadChainConfig = {
    id: 10143,
    name: 'Monad Testnet',
    network: 'monad-testnet',
    nativeCurrency: {
        name: 'Monad',
        symbol: 'MON',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ['https://testnet-rpc.monad.xyz'] },
        public: { http: ['https://testnet-rpc.monad.xyz'] },
    },
    blockExplorers: {
        default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
    },
    testnet: true,
};

// ============================================================================
// Provider Component
// ============================================================================

interface PrivyWrapperProps {
    children: ReactNode;
}

export function PrivyWrapper({ children }: PrivyWrapperProps) {
    return (
        <PrivyProvider
            appId={PRIVY_APP_ID}
            config={{
                // Appearance
                appearance: {
                    theme: 'dark',
                    accentColor: '#06b6d4', // Cyan to match game theme
                },

                // Login methods
                loginMethods: ['email', 'wallet', 'discord'],

                // Supported chains
                supportedChains: [monadChainConfig],
                defaultChain: monadChainConfig,

                // Embedded wallet config (updated API)
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: 'users-without-wallets',
                    },
                },
            }}
        >
            {children}
        </PrivyProvider>
    );
}

export default PrivyWrapper;
