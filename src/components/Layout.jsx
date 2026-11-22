// import { Outlet } from 'react-router-dom';
// import Navbar from './Navbar';

// export default function Layout() {
//   return (
//     <>
//       <Navbar />
//       <main className="container">
//         <Outlet />
//       </main>
//     </>
//   );
// }
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import ChatWidget from './chat/ChatWidget';

export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Outlet />
      </main>
      <ChatWidget />
    </>
  );
}