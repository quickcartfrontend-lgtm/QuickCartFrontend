import { Link } from 'react-router-dom';

// Splitting on a CAPTURING group puts the matches at the odd indexes.
const LINK_RE = /(\/(?:orders|products)\/\d+)/g;

// Everything is a React text node (escaped by React). The only element we create is a <Link>
// whose target matched the strict pattern above, so a reply can never inject markup or a URL.
export default function ChatText({ text, onNavigate }) {
  return text.split(LINK_RE).map((part, i) =>
    i % 2 === 1 ? (
      <Link key={i} to={part} onClick={onNavigate}>{part}</Link>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}