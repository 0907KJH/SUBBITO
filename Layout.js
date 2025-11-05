// Layout.js: plain JS wrapper that re-exports the JSX implementation.
// Keeping this lightweight prevents esbuild from attempting to parse JSX
// in a file with a `.js` extension (which causes the loader error).
export { default } from './Layout.jsx';


