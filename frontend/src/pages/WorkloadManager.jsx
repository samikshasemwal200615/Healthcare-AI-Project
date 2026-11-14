import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Wrench,
  AlertTriangle,
  BarChart3,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  X,
  Cpu,
  Layers,
  Check,
} from "lucide-react";
import {
  getWorkloadStats,
  getJobs,
  getJobDetail,
  enqueueTestBatch,
  enqueueUploadJob,
  uploadReport,
} from "../services/api";
import { useAppContext } from "../context/AppContext";

function WorkloadManager() {
  const navigate = useNavigate();
  const {
    setReportData,
    setQuestions,
    setPredictions,
    setPatientInfo,
    setReportFileName,
    setTimings,
    setReportId,
  } = useAppContext();

  const [stats, setStats] = useState({
    active_jobs: 0,
    queued_jobs: 0,
    completed: 9,
    failed: 70,
    available_slots: "2/2",
    dead_letter: 0,
    worker_load: "0%",
    busy_workers: 0,
    total_workers: 2,
    workers: [
      { id: "Worker-1", status: "IDLE", current_file: null },
      { id: "Worker-2", status: "IDLE", current_file: null },
    ],
  });

  const [activeTab, setActiveTab] = useState("history"); // 'queue', 'active', 'history'
  const [jobs, setJobs] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(
    "Enqueued 3 jobs simultaneously to demonstrate FCFS scheduling and bounded worker pool (2 workers)."
  );

  // Job Details Drawer / Modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);

  // Quick upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch all workload data
  const fetchData = async () => {
    try {
      const [statsData, jobsData] = await Promise.all([
        getWorkloadStats(),
        getJobs(activeTab),
      ]);
      setStats(statsData);
      setJobs(jobsData.jobs || []);
    } catch (err) {
      console.error("Failed to fetch workload data", err);
    }
  };

  // Auto-refresh interval (2 seconds)
  useEffect(() => {
    fetchData();
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, activeTab]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const handleEnqueueTestBatch = async () => {
    try {
      const res = await enqueueTestBatch();
      setBannerMessage(res.message);
      await fetchData();
    } catch (err) {
      console.error("Test batch error", err);
    }
  };

  // Interactive upload connected to unified questionnaire & OS timings
  const handleUploadSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!uploadFile) return;

    try {
      setIsUploading(true);
      const targetName = patientName.trim() || "Patient";
      const result = await uploadReport(uploadFile, null, targetName);

      setReportFileName(uploadFile.name);
      setPatientInfo({
        id: result.patient_id,
        name: targetName,
      });

      if (result.status === "need_more_information") {
        setReportData(result.report_data);
        setQuestions(result.questions);
        setTimings({
          queue_wait_ms: result.queue_wait_ms || 8.0,
          submitted_timestamp: result.submitted_timestamp || Date.now() / 1000,
        });
        setShowUploadModal(false);
        setUploadFile(null);
        setPatientName("");
        navigate("/questionnaire");
        return;
      }

      if (result.status === "success") {
        setPredictions(result.predictions);
        setTimings(result.timings);
        setReportId(result.report_id);
        setShowUploadModal(false);
        setUploadFile(null);
        setPatientName("");
        navigate("/dashboard");
        return;
      }
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Background enqueue into FCFS queue demonstration
  const handleBackgroundEnqueue = async () => {
    if (!uploadFile) return;

    try {
      setIsUploading(true);
      await enqueueUploadJob(uploadFile, patientName);
      const fileName = uploadFile.name;
      setShowUploadModal(false);
      setUploadFile(null);
      setPatientName("");
      setBannerMessage(`Job for '${fileName}' enqueued in FCFS queue. Worker thread is processing OCR and storing results into the database.`);
      setActiveTab("active");
      await fetchData();

      setTimeout(async () => {
        setActiveTab("history");
        await fetchData();
      }, 2200);
    } catch (err) {
      console.error("Enqueue error", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenJobDetails = async (jobId) => {
    try {
      setIsLoadingJob(true);
      const data = await getJobDetail(jobId);
      setSelectedJob(data.job);
    } catch (err) {
      console.error("Failed to load job details", err);
    } finally {
      setIsLoadingJob(false);
    }
  };


  return (
    <div className="space-y-6">

      {/* Page Title & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Report Processing Workload Manager
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time monitoring of FCFS-scheduled report processing, worker allocation, OCR and disease prediction pipeline.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Upload New Report</span>
          </button>

          <button
            onClick={handleEnqueueTestBatch}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Enqueue Test Batch</span>
          </button>

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
            onClick={handleManualRefresh}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Banner */}
      {bannerMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{bannerMessage}</span>
          <button
            onClick={() => setBannerMessage("")}
            className="text-emerald-500 hover:text-emerald-700 ml-3"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 7 Color-Coded Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Active Jobs */}
        <div className="bg-blue-600 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-100">
            <span>Active Jobs</span>
            <Zap className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-3xl font-black mt-3">{stats.active_jobs}</span>
        </div>

        {/* Queued Jobs */}
        <div className="bg-amber-500 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-100">
            <span>Queued Jobs</span>
            <ClipboardList className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-3xl font-black mt-3">{stats.queued_jobs}</span>
        </div>

        {/* Completed */}
        <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-100">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-3xl font-black mt-3">{stats.completed}</span>
        </div>

        {/* Failed */}
        <div className="bg-rose-600 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-100">
            <span>Failed</span>
            <XCircle className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-3xl font-black mt-3">{stats.failed}</span>
        </div>

        {/* Available Slots */}
        <div className="bg-purple-600 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-100">
            <span>Available Slots</span>
            <Wrench className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-3xl font-black mt-3">{stats.available_slots}</span>
        </div>

        {/* Dead Letter */}
        <div className="bg-slate-700 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
            <span>Dead Letter</span>
            <AlertTriangle className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-3xl font-black mt-3">{stats.dead_letter}</span>
        </div>

        {/* Worker Load */}
        <div className="bg-slate-800 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
            <span>Worker Load</span>
            <BarChart3 className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-3xl font-black mt-3">{stats.worker_load}</span>
        </div>
      </div>

      {/* Worker Thread Pool Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Worker Thread Pool</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Concurrency limit: <strong>2 concurrent workers</strong>. Reports are processed in FCFS order — first submitted, first processed.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {stats.busy_workers} of {stats.total_workers} busy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.workers.map((w) => {
            const isBusy = w.status === "BUSY";
            return (
              <div
                key={w.id}
                className={`p-4 rounded-xl border transition-all ${
                  isBusy
                    ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500"
                    : "border-slate-200/80 bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isBusy ? "bg-blue-600 animate-ping" : "bg-slate-300"
                      }`}
                    />
                    <strong className="text-sm font-bold text-slate-900">{w.id}</strong>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                      isBusy
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {w.status}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  {isBusy
                    ? `Busy — processing ${w.current_file || "report job..."}`
                    : "Idle — awaiting incoming report job"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs & Job Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Tab navigation */}
        <div className="flex items-center border-b border-slate-200/80 px-6 pt-3 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("queue")}
            className={`pb-3 cursor-pointer transition-colors relative ${
              activeTab === "queue"
                ? "text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Processing Queue ({stats.queued_jobs})
            {activeTab === "queue" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("active")}
            className={`pb-3 cursor-pointer transition-colors relative ${
              activeTab === "active"
                ? "text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Active Jobs ({stats.active_jobs})
            {activeTab === "active" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 cursor-pointer transition-colors relative ${
              activeTab === "history"
                ? "text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Processing History ({stats.completed + stats.failed})
            {activeTab === "history" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>

        {/* Table content */}
        <div className="overflow-x-auto">
          {jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No jobs in this category currently.
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-6">Job ID</th>
                  <th className="py-3 px-6">Filename</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Worker</th>
                  <th className="py-3 px-6">DB Report</th>
                  <th className="py-3 px-6">Submitted At</th>
                  <th className="py-3 px-6">Total Turnaround</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-500 truncate max-w-[140px]">
                      {j.id}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900 truncate max-w-[200px]">
                      {j.filename}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          j.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : j.status === "ACTIVE"
                            ? "bg-blue-50 text-blue-700 border border-blue-200/60 animate-pulse"
                            : j.status === "QUEUED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                            : "bg-rose-50 text-rose-700 border border-rose-200/60"
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-700 font-semibold">
                      {j.worker}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs">
                      {j.report_id && j.report_id !== "Not assigned" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Stored ({j.report_id.slice(0, 8)})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-500">
                      {j.submitted_at}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-600">
                      {j.total_turnaround_s ? `${j.total_turnaround_s} s` : "—"}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleOpenJobDetails(j.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          )}
        </div>

      </div>

      {/* Modal / Drawer: Job Details (Screenshot 4) */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white h-full w-full max-w-lg shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Job Details</h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-[340px]">
                  {selectedJob.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3 my-5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 font-medium block">Worker</span>
                <span className="text-sm font-bold text-slate-800 block mt-0.5">
                  {selectedJob.worker}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 font-medium block">Report ID</span>
                <span className="text-sm font-bold text-slate-800 block mt-0.5 truncate">
                  {selectedJob.report_id || "Not assigned"}
                </span>
              </div>
            </div>

            {/* Execution Timings */}
            <div className="space-y-3 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Execution Timings
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Submitted</span>
                  <strong className="text-slate-800">{selectedJob.submitted_at}</strong>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Started (Dequeued)</span>
                  <strong className="text-slate-800">{selectedJob.started_at || "—"}</strong>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Completed</span>
                  <strong className="text-slate-800">{selectedJob.completed_at || "—"}</strong>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Queue Waiting Time</span>
                  <strong className="text-amber-600 font-bold">
                    {selectedJob.queue_wait_ms} ms
                  </strong>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Execution Time</span>
                  <strong className="text-blue-600 font-bold">
                    {selectedJob.execution_ms} ms
                  </strong>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Total Turnaround</span>
                  <strong className="text-purple-600 font-bold">
                    {selectedJob.total_turnaround_s} s
                  </strong>
                </div>
              </div>
            </div>

            {/* Processing Timeline */}
            <div className="space-y-3 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Processing Timeline
              </h4>

              <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200">
                {(selectedJob.timeline || []).map((step, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle Node */}
                    <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-xs" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                        {step.step}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {step.time}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Quick Upload New Report */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Upload & Process Report</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unified pipeline: triggers questionnaire for missing values & records OS metrics.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patel"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="workload-upload"
                  accept=".pdf,image/*"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="hidden"
                />
                <label
                  htmlFor="workload-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Plus className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-700">
                    {uploadFile ? uploadFile.name : "Select Report PDF or Image"}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    PDF or Image lab reports supported
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleBackgroundEnqueue}
                  disabled={!uploadFile || isUploading}
                  className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl disabled:opacity-60 cursor-pointer"
                >
                  Enqueue to Pool
                </button>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadFile || isUploading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
                  >
                    {isUploading ? "Processing..." : "Analyze & Predict"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default WorkloadManager;
