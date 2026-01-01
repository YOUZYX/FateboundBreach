# Fatebound Breach: The On-Chain Cyberpunk Tactical Strategy

**Fatebound Breach** is a verifiable tactical strategy game built on **Monad Testnet**, utilizing **Pyth Entropy** for deterministic, provably fair gameplay. Players act as elite hackers breaching a secure neural network, routing data packets to destroy defense nodes while managing system resources.

## 🚀 Mission

Experience a high-stakes cyber-warfare simulation where every move is recorded on-chain. Our "Hash-to-Level" technology ensures that every game seed produces a unique, mathematically consistent battlefield that can be audited by anyone.

## ✨ Features

*   **Provably Fair Core:** Every turn, enemy spawn, and card draw is a derived hash of a Master VRF Seed. Verify the math yourself using the in-game console.
*   **Tactical Routing:** A deep puzzle-strategy system. Match specialized Packet colors (Attack, Defend, Crit) to Node sockets to optimize damage output.
*   **Granular Scoring:** Skill-based scoring system tracks efficiency, damage dealt, and survival streaks. All high scores are saved on-chain and aggregated in the database.
*   **System Anomalies:** Interactive environment that reacts to entropy variances (Ion Storms, System Overclocks, Data Corruptions).
*   **Elite Leaderboard:** Compete for the top spot on the global leaderboard, powered by Supabase for instant updates and preserved on Monad for posterity.

## 🛠️ Tech Stack

*   **Blockchain:** Monad Testnet (High throughput, low latency).
*   **Randomness:** Pyth Entropy V2 (Low-latency verifiable random numbers).
*   **Frontend:** React 19, Vite, TailwindCSS, Framer Motion (for fluid animations).
*   **State & Logic:** Zustand (Client state), Viem (Blockchain interactions).
*   **Backend:** Supabase (Leaderboard indexing & aggregation).

## ⚡ Setup & Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/StartInB/MissionX.git
    cd MissionX/game
    ```

2.  **Install Dependencies:**
    ```bash
    # Note: Use legacy-peer-deps to resolve Solana/Privy conflicts
    npm install --legacy-peer-deps
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the `game` directory:
    ```env
    VITE_PRIVY_APP_ID=your_privy_app_id
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the Game:**
    ```bash
    npm run dev
    ```
    Access the game at `http://localhost:5173`.

## 🎮 How to Play

1.  **Connect Wallet:** Sign in to authenticate.
2.  **Initiate Breach:** Pay the small gas fee to request a VRF Seed.
3.  **Route Packets:** Drag packets from your buffer to the active Grid Nodes.
4.  **Survive:** Destroy the central Firewall or eliminate all Sentinel Drones before your HP hits zero.
5.  **Claim Victory:** Win the round to mint your score to the blockchain and climb the ranks.

---
*Built for the Monad Hackathon by the Fatebound Breach Team.*
