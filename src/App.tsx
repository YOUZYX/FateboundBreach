import { PrivyWrapper } from './providers/PrivyWrapper';
import { GameLayout } from './components/game/GameLayout';
import './index.css';

function App() {
  return (
    <PrivyWrapper>
      <GameLayout />
    </PrivyWrapper>
  );
}

export default App;
