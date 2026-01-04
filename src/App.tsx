import { PrivyWrapper } from './providers/PrivyWrapper';
import { GameLayout } from './components/game/GameLayout';
import { GameAudio } from './components/audio/GameAudio';
import './index.css';

function App() {
  return (
    <PrivyWrapper>
      <GameAudio />
      <GameLayout />
    </PrivyWrapper>
  );
}

export default App;
