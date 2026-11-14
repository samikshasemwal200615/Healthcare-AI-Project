import { Link } from "react-router-dom";
import {
  FileText,
  Users,
  GitCompare,
  Cpu,
  Database,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

function Home() {
  const features = [
    {
      title: "Upload Lab Report",
      desc: "Extract biometric parameters via PyMuPDF OCR and run multi-disease risk prediction models.",
      to: "/upload",
      icon: FileText,
      color: "bg-blue-600 text-white",
      badge: "Core Pipeline",
    },
    {
      title: "Patients & History",
      desc: "Demographic registry, longitudinal lab reports, and automated multi-report selection.",
      to: "/patients",
      icon: Users,
      color: "bg-emerald-600 text-white",
      badge: "Relational DBMS",
    },
    {
      title: "Compare Reports",
      desc: "Side-by-side biometric parameter delta analysis and disease risk trajectory scoring.",
      to: "/compare",
      icon: GitCompare,
      color: "bg-indigo-600 text-white",
      badge: "Clinical Trajectory",
    },
    {
      title: "Workload Manager",
      desc: "Real-time FCFS scheduling queue, bounded 2-worker pool, execution timings and processing timeline.",
      to: "/workload",
      icon: Cpu,
      color: "bg-amber-500 text-white",
      badge: "OS Concurrency",
    },
    {
      title: "Database Overview",
      desc: "SQLite connection status, WAL mode verification, aggregate statistics, and recent lab records.",
      to: "/database",
      icon: Database,
      color: "bg-teal-600 text-white",
      badge: "DBMS Metadata",
    },
    {
      title: "System Monitor",
      desc: "Live CPU percent, memory RSS, thread allocation telemetry, and request audit logging.",
      to: "/system",
      icon: Activity,
      color: "bg-purple-600 text-white",
      badge: "OS Telemetry",
    },
  ];

  return (
    <div className="space-y-12 py-4">

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/60 shadow-2xs">
          <ShieldCheck className="h-4 w-4" />
          <span>Integrated Operating System & Relational DBMS Architecture</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Clinical Intelligence & <br />
          <span className="text-blue-600">Health AI Systems</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600">
          Upload medical lab reports, extract biomarker features, execute concurrent AI predictions, and monitor real-time FCFS job queues with ACID database persistence.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <span>Upload New Report</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            to="/workload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Open Workload Manager</span>
          </Link>
        </div>
      </div>

      {/* Feature Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.to}
              to={f.to}
              className="group bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-blue-400 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-xs ${f.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                    {f.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                <span>Access Module</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
}

export default Home;