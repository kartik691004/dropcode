import { NavLink, Outlet } from "react-router-dom";
import AiChatWidget from "../ui/AiChatWidget";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/upload", label: "Upload" },
  { to: "/search", label: "Search" },
  { to: "/profile", label: "Profile" },
  { to: "/auth", label: "Login/Register" },
];

export default function AppLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-row">
            <div className="cuboid-logo" aria-hidden="true">
              <span className="cuboid-face cuboid-top" />
              <span className="cuboid-face cuboid-front" />
              <span className="cuboid-face cuboid-side" />
            </div>
            <div>
              <h1>University Resource Share</h1>
              <p className="topbar-sub">For university students: notes, PYQs, lab files, and revision content</p>
            </div>
          </div>
        </div>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className="nav-link">
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-wrap">
        <Outlet />
      </main>
      <AiChatWidget />
    </div>
  );
}
