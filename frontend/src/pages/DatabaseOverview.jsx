import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  RefreshCw,
  Users,
  FileSpreadsheet,
  Dna,
  Activity,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  X,
} from "lucide-react";
import { getDatabaseOverview, getPatientDetail } from "../services/api";

function DatabaseOverview() {
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeReportModal, setActiveReportModal] = useState(null);

  const fetchOverview = async () => {
    try {
      const data = await getDatabaseOverview();
      setOverview(data);
    } catch (err) {
      console.error("Failed to load database overview", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOverview();
  };

  const handleOpenReport = async (record) => {
    try {
      setActiveReportModal(record);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || !overview) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
        <p className="text-sm">Connecting to database engine & compiling statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Database Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time status of persistent medical records, patient data, and clinical observations.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Database Engine Status Banner (Screenshot 5) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 shrink-0 border border-purple-100">
              <Database className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-slate-900">
                  Database Engine: {overview.engine}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {overview.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                {overview.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8 text-xs shrink-0">
            <div>
              <span className="text-slate-400 block font-medium">Primary Target</span>
              <strong className="text-slate-800 font-bold block mt-0.5">
                {overview.primary_target}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">ORM Layer</span>
              <strong className="text-slate-800 font-bold block mt-0.5">
                {overview.orm_layer}
              </strong>
            </div>
          </div>

        </div>
      </div>

      {/* 5 Aggregate Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Registered Patients */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Registered Patients</span>
          <span className="text-3xl font-black text-slate-900 mt-2 block">
            {overview.stats.registered_patients}
          </span>
        </div>

        {/* Stored Lab Reports */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Stored Lab Reports</span>
          <span className="text-3xl font-black text-blue-600 mt-2 block">
            {overview.stats.stored_lab_reports}
          </span>
        </div>

        {/* Extracted Biomarkers */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Extracted Biomarkers</span>
          <span className="text-3xl font-black text-indigo-600 mt-2 block">
            {overview.stats.extracted_biomarkers}
          </span>
        </div>

        {/* Stored Predictions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Stored Predictions</span>
          <span className="text-3xl font-black text-emerald-600 mt-2 block">
            {overview.stats.stored_predictions}
          </span>
        </div>

        {/* Awaiting Questionnaire */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-slate-500 block">Awaiting Questionnaire</span>
          <span className="text-3xl font-black text-amber-500 mt-2 block">
            {overview.stats.awaiting_questionnaire}
          </span>
        </div>
      </div>

      {/* Recent Database Records Table (Screenshot 5) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Database Records</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Most recent medical reports stored in the database.
            </p>
          </div>

          <Link
            to="/patients"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
          >
            <span>View all patients</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 px-6">Patient</th>
                <th className="py-3 px-6">Report File</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Biomarkers Extracted</th>
                <th className="py-3 px-6">Uploaded Date</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {overview.recent_records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-slate-900">
                    {rec.patient_name}
                  </td>
                  <td className="py-3.5 px-6 text-slate-700 max-w-[240px] truncate">
                    {rec.report_file}
                  </td>
                  <td className="py-3.5 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        rec.status === "Completed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          : "bg-blue-50 text-blue-700 border border-blue-200/60"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-xs text-slate-600">
                    {rec.biomarkers_extracted}
                  </td>
                  <td className="py-3.5 px-6 text-xs text-slate-500">
                    {rec.uploaded_date}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <button
                      onClick={() => handleOpenReport(rec)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Open Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Open Report Details */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeReportModal.report_file}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Patient: {activeReportModal.patient_name}
                </p>
              </div>
              <button
                onClick={() => setActiveReportModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-500">Record ID:</span>
                <p className="font-mono text-slate-800 font-semibold">{activeReportModal.id}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-500">Biomarkers Extracted:</span>
                <p className="text-slate-800 font-semibold">{activeReportModal.biomarkers_extracted}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-500">Uploaded Date:</span>
                <p className="text-slate-800 font-semibold">{activeReportModal.uploaded_date}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setActiveReportModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
              <Link
                to="/patients"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Go to Patient Registry
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DatabaseOverview;
