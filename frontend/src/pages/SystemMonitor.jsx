import { useState, useEffect } from "react";
import {
  Cpu,
  HardDrive,
  Activity,
  Layers,
  Clock,
  ShieldCheck,
  RefreshCw,
  Server,
} from "lucide-react";
import { getSystemHealth, getAuditLogs } from "../services/api";

function SystemMonitor() {
  const [health, setHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const [hData, aData] = await Promise.all([
        getSystemHealth(),
        getAuditLogs(30),
      ]);
      setHealth(hData);
      setAuditLogs(aData.logs || []);
    } catch (err) {
      console.error("Failed to load system metrics", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMetrics();
  };

  if (isLoading || !health) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
        <p className="text-sm">Collecting OS resource telemetry & psutil metrics...</p>
      </div>
    );
  }

  const { process: proc, system: sys } = health;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            System Resource Monitor
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time process, memory, thread pool and operating system resource telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer shadow-xs">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Auto-refresh (2s)</span>
          </label>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top OS Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CPU Usage */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>CPU Usage</span>
            <Cpu className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            {sys?.cpu_percent ?? proc?.cpu_percent ?? 0}%
          </span>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, sys?.cpu_percent ?? proc?.cpu_percent ?? 0)}%` }}
            />
          </div>
        </div>

        {/* Memory RSS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Process RSS</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            {proc?.memory_rss_mb ?? 0} MB
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {proc?.memory_percent ?? 0}% of RAM
          </span>
        </div>

        {/* Disk Usage */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Disk Usage</span>
            <HardDrive className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            {sys?.disk_percent ?? 0}%
          </span>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, sys?.disk_percent ?? 0)}%` }}
            />
          </div>
        </div>

        {/* Process ID */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>PID</span>
            <Server className="h-4 w-4 text-purple-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            {proc?.pid ?? "—"}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            FastAPI Process
          </span>
        </div>

        {/* Active Threads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Threads</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            {proc?.num_threads ?? 0}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Worker + I/O pool
          </span>
        </div>

        {/* Uptime */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Uptime</span>
            <Clock className="h-4 w-4 text-teal-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            {proc?.uptime_seconds ? `${Math.floor(proc.uptime_seconds)}s` : "—"}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Since server start
          </span>
        </div>
      </div>

      {/* Audit Middleware Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Audit Logs & Concurrency Trace
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks OS thread allocation, process IDs, execution timing and HTTP status per request.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            {auditLogs.length} recent requests
          </span>
        </div>

        <div className="overflow-x-auto">
          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No audit records logged yet.
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Method</th>
                  <th className="py-3 px-6">Endpoint</th>
                  <th className="py-3 px-6">Worker Thread</th>
                  <th className="py-3 px-6">PID</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Processing Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-6 text-xs text-slate-500 font-mono">
                      {log.created_at}
                    </td>
                    <td className="py-3 px-6">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                          log.method === "GET"
                            ? "bg-blue-50 text-blue-700"
                            : log.method === "POST"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {log.method}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-xs text-slate-800 font-mono">
                      {log.endpoint}
                    </td>
                    <td className="py-3 px-6 text-xs text-purple-700 font-semibold font-mono">
                      {log.worker_thread || "MainThread"}
                    </td>
                    <td className="py-3 px-6 text-xs text-slate-500 font-mono">
                      {log.process_id}
                    </td>
                    <td className="py-3 px-6">
                      <span
                        className={`text-xs font-bold ${
                          log.status_code >= 200 && log.status_code < 300
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {log.status_code}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-xs font-semibold text-slate-700 text-right">
                      {log.processing_time_ms ? `${log.processing_time_ms.toFixed(1)} ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}

export default SystemMonitor;
