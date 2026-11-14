import { NavLink } from "react-router-dom";
import { FileText } from "lucide-react";

function Navbar() {
  const navItems = [
    { label: "Home", to: "/" },
    { label: "Upload Report", to: "/upload" },
    { label: "Patients & History", to: "/patients", dotColor: "bg-emerald-500" },
    { label: "Compare Reports", to: "/compare", dotColor: "bg-indigo-500" },
    { label: "Workload Manager", to: "/workload", dotColor: "bg-amber-500" },
    { label: "Database Overview", to: "/database", dotColor: "bg-teal-500" },
    { label: "System Monitor", to: "/system", dotColor: "bg-purple-500" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Brand Logo & Tagline */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <FileText className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                Healthcare AI
              </span>
              <span className="text-xs font-medium text-slate-500">
                Clinical Intelligence
              </span>
            </div>
          </NavLink>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-2 shrink-0 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.dotColor && (
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          isActive ? "bg-white" : item.dotColor
                        }`}
                      />
                    )}
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

        </div>
      </div>
    </header>
  );
}

export default Navbar;