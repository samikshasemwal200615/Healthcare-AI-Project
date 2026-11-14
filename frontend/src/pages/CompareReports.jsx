import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  FileText,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { compareReports, getAvailableReports } from "../services/api";

function CompareReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialReportA = searchParams.get("report_a") || "";
  const initialReportB = searchParams.get("report_b") || "";

  const [availableReports, setAvailableReports] = useState([]);
  const [selectedA, setSelectedA] = useState(initialReportA);
  const [selectedB, setSelectedB] = useState(initialReportB);

  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Load available reports for selector
  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await getAvailableReports();
        const list = data.reports || [];
        setAvailableReports(list);

        // If no query params provided, default to first 2 reports
        if (!initialReportA && list.length >= 2) {
          setSelectedA(list[0].id);
          setSelectedB(list[1].id);
        } else if (initialReportA && !initialReportB && list.length >= 2) {
          const second = list.find((r) => r.id !== initialReportA);
          if (second) setSelectedB(second.id);
        }
      } catch (err) {
        console.error("Failed to load reports", err);
      }
    };

    loadReports();
  }, []);

  // Run comparison when report IDs are selected
  const runComparison = async (idA, idB) => {
    if (!idA || !idB) return;
    if (idA === idB) {
      setError("Please select two different reports to compare.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const result = await compareReports(idA, idB);
      setComparisonData(result);
      setSearchParams({ report_a: idA, report_b: idB });
    } catch (err) {
      setError(err.message || "Failed to compare reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedA && selectedB && selectedA !== selectedB) {
      runComparison(selectedA, selectedB);
    }
  }, [selectedA, selectedB]);

  return (
    <div className="space-y-6">

      {/* Selector / Configuration Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Baseline (Report A)
              </label>
              <select
                value={selectedA}
                onChange={(e) => setSelectedA(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Select Baseline Report...</option>
                {availableReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.filename} ({r.patient_name || "Patient"} — {r.uploaded_at})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Follow-up (Report B)
              </label>
              <select
                value={selectedB}
                onChange={(e) => setSelectedB(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Select Follow-up Report...</option>
                {availableReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.filename} ({r.patient_name || "Patient"} — {r.uploaded_at})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => runComparison(selectedA, selectedB)}
            disabled={!selectedA || !selectedB || isLoading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 self-end md:self-auto shrink-0 h-10 mt-auto"
          >
            <GitCompare className="h-4 w-4" />
            <span>Execute Comparison</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
          <p className="text-sm">Calculating parameter deltas and AI risk trajectory...</p>
        </div>
      ) : !comparisonData ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400">
          Select two lab reports above to view comparative analysis.
        </div>
      ) : (
        <>
          {/* Side-by-Side Report Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Report A Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                  Report A (Baseline)
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {comparisonData.report_a.uploaded_at}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 truncate">
                {comparisonData.report_a.filename}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                ID: {comparisonData.report_a.id}
              </p>
            </div>

            {/* Report B Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">
                  Report B (Follow-up)
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {comparisonData.report_b.uploaded_at}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 truncate">
                {comparisonData.report_b.filename}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                ID: {comparisonData.report_b.id}
              </p>
            </div>
          </div>

          {/* Section: Disease Risk Probability Trajectory */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Disease Risk Probability Trajectory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                AI model risk scores calculated at each report timestamp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparisonData.disease_trajectories.map((traj) => {
                const probA = Math.round(traj.report_a_prob * 100);
                const probB = Math.round(traj.report_b_prob * 100);
                const deltaPct = probB - probA;

                const isIncreased = deltaPct > 0;
                const isDecreased = deltaPct < 0;

                return (
                  <div
                    key={traj.disease_key}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        {traj.disease_name}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isIncreased
                            ? "bg-amber-100 text-amber-700"
                            : isDecreased
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {traj.trajectory}
                      </span>
                    </div>

                    {/* Probability trajectory bar comparison */}
                    <div className="space-y-2 pt-1">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Report A: <strong>{probA}%</strong></span>
                          <span>Report B: <strong>{probB}%</strong></span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                          <div
                            className="bg-blue-500 h-full transition-all"
                            style={{ width: `${Math.min(probA, probB)}%` }}
                          />
                          {probB > probA && (
                            <div
                              className="bg-red-500 h-full transition-all"
                              style={{ width: `${probB - probA}%` }}
                            />
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-600">
                          Trajectory Delta:{" "}
                          <strong
                            className={
                              isIncreased
                                ? "text-red-600"
                                : isDecreased
                                ? "text-emerald-600"
                                : "text-slate-600"
                            }
                          >
                            {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Biometric Lab Parameters Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Biometric Lab Parameters Comparison
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed parameter delta analysis calculated across extracted OCR features.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-3 px-4">Parameter</th>
                    <th className="py-3 px-4">Report A</th>
                    <th className="py-3 px-4">Report B</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Numerical Delta</th>
                    <th className="py-3 px-4">Clinical Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {comparisonData.parameters_comparison.map((item, idx) => {
                    const isPositive = item.numerical_delta.startsWith("+");
                    const isNegative = item.numerical_delta.startsWith("-");

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-900 font-semibold">
                          {item.parameter}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {String(item.report_a)}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {String(item.report_b)}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {item.unit}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              isPositive
                                ? "text-amber-600"
                                : isNegative
                                ? "text-blue-600"
                                : "text-slate-500"
                            }`}
                          >
                            {item.numerical_delta}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                              item.clinical_trend.includes("Decreased")
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : item.clinical_trend.includes("Increased")
                                ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                : "bg-slate-100 text-slate-600 border border-slate-200/60"
                            }`}
                          >
                            {item.clinical_trend}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default CompareReports;
