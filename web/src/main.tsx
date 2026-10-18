import { createRoot } from 'react-dom/client';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/sora/latin-400.css';
import '@fontsource/sora/latin-500.css';
import '@fontsource/sora/latin-600.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
