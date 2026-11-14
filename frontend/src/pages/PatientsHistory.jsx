import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Upload,
  FileText,
  User,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
  GitCompare,
} from "lucide-react";
import {
  getPatients,
  getPatientDetail,
  registerPatient,
  uploadPatientReport,
} from "../services/api";
import { useAppContext } from "../context/AppContext";

function PatientsHistory() {
  const navigate = useNavigate();
  const {
    setReportData,
    setQuestions,
    setPatientInfo,
    setReportFileName,
    setTimings,
    setReportId,
    setPredictions,
  } = useAppContext();


  const [patients, setPatients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Multi-selection for comparison (max 2)
  const [selectedReports, setSelectedReports] = useState([]);

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(null);

  // Form states
  const [registerForm, setRegisterForm] = useState({
    name: "",
    gender: "OTHER",
    dob: "",
    clinical_notes: "",
  });
  const [registerError, setRegisterError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Load patients
  const loadPatients = async (query = "") => {
    try {
      setIsLoadingList(true);
      const data = await getPatients(query);
      setPatients(data.patients || []);
      setTotalCount(data.total || 0);

      if (data.patients && data.patients.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data.patients[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadPatients(searchQuery);
  }, [searchQuery]);

  // Load patient profile when selectedPatientId changes
  useEffect(() => {
    if (!selectedPatientId) return;

    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        setSelectedReports([]);
        const data = await getPatientDetail(selectedPatientId);
        setPatientProfile(data.patient);
        setReports(data.reports || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [selectedPatientId]);

  // Handle register submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registerForm.name.trim() || !registerForm.dob) {
      setRegisterError("Please fill in patient name and date of birth.");
      return;
    }

    try {
      setIsRegistering(true);
      setRegisterError("");
      const newPatient = await registerPatient(registerForm);
      setShowRegisterModal(false);
      setRegisterForm({ name: "", gender: "OTHER", dob: "", clinical_notes: "" });
      await loadPatients("");
      setSelectedPatientId(newPatient.id);
    } catch (err) {
      setRegisterError(err.message || "Failed to register patient");
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle upload submission for current patient
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedPatientId) {
      setUploadError("Please select a file to upload.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");
      const result = await uploadPatientReport(selectedPatientId, uploadFile);

      if (result.status === "need_more_information") {
        setReportData(result.report_data);
        setQuestions(result.questions);
        setPatientInfo({
          id: result.patient_id || selectedPatientId,
          name: result.patient_name || patientProfile?.name || "Patient",
        });
        setReportFileName(result.filename || uploadFile.name);
        setTimings({
          queue_wait_ms: result.queue_wait_ms || 7.5,
          submitted_timestamp: result.submitted_timestamp || Date.now() / 1000,
        });
        setShowUploadModal(false);
        setUploadFile(null);
        navigate("/questionnaire");
        return;
      }

      if (result.status === "success") {
        if (result.predictions) setPredictions(result.predictions);
        if (result.timings) setTimings(result.timings);
        if (result.id) setReportId(result.id);
        setPatientInfo({
          id: selectedPatientId,
          name: patientProfile?.name || result.patient_name || "Patient",
        });
        setReportFileName(uploadFile.name);

        setShowUploadModal(false);
        setUploadFile(null);
        navigate("/dashboard");
        return;
      }

      setShowUploadModal(false);
      setUploadFile(null);
      // Reload profile
      const data = await getPatientDetail(selectedPatientId);
      setPatientProfile(data.patient);
      setReports(data.reports || []);
      // Also update patient report count in list
      await loadPatients(searchQuery);
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle report selection for comparison
  const handleToggleReport = (reportId) => {
    setSelectedReports((prev) => {
      if (prev.includes(reportId)) {
        return prev.filter((id) => id !== reportId);
      }
      if (prev.length >= 2) {
        // Replace second report
        return [prev[0], reportId];
      }
      return [...prev, reportId];
    });
  };

  const handleExecuteComparison = () => {
    if (selectedReports.length === 2) {
      navigate(`/compare?report_a=${selectedReports[0]}&report_b=${selectedReports[1]}`);
    }
  };

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Patient Registry & Medical History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage patient demographic records, view longitudinal lab reports, and perform multi-report comparisons.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all duration-150 cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Patient Search & List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
              <span>Total registered: <strong className="text-slate-800">{totalCount}</strong></span>
              <span>Showing: <strong className="text-slate-800">{patients.length}</strong></span>
            </div>

            {/* Patient Cards List */}
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {isLoadingList ? (
                <div className="py-12 text-center text-sm text-slate-400">Loading patients...</div>
              ) : patients.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No patients found.</div>
              ) : (
                patients.map((p) => {
                  const isSelected = p.id === selectedPatientId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`relative p-4 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "bg-blue-50/40 border-blue-600 shadow-xs ring-1 ring-blue-600"
                          : "bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isSelected && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 rounded-r-full" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {p.gender} • DOB: {p.dob}
                          </p>
                          {p.clinical_notes && (
                            <p className="mt-1.5 text-xs italic text-slate-600 line-clamp-1">
                              "{p.clinical_notes}"
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600">
                          {p.total_reports || 0} {p.total_reports === 1 ? "report" : "reports"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Selected Patient Details & Medical History */}
        <div className="lg:col-span-7 space-y-6">
          {isLoadingProfile ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
              Loading patient profile...
            </div>
          ) : !patientProfile ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
              Select a patient from the registry to view medical history.
            </div>
          ) : (
            <>
              {/* Patient Details Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{patientProfile.name}</h2>
                    <p className="text-xs font-mono text-slate-400 mt-1">
                      ID: {patientProfile.id}
                    </p>
                  </div>

                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload Report For {patientProfile.name.split(" ")[0]}</span>
                  </button>
                </div>

                {/* Demographic Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50/70 rounded-xl">
                    <span className="text-xs text-slate-500 font-medium block">Gender</span>
                    <span className="text-sm font-semibold text-slate-800 capitalize mt-0.5 block">
                      {patientProfile.gender}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/70 rounded-xl">
                    <span className="text-xs text-slate-500 font-medium block">Date of Birth</span>
                    <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
                      {patientProfile.dob}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/70 rounded-xl">
                    <span className="text-xs text-slate-500 font-medium block">Total Reports</span>
                    <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
                      {reports.length}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/70 rounded-xl">
                    <span className="text-xs text-slate-500 font-medium block">Registered On</span>
                    <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
                      {patientProfile.created_at ? patientProfile.created_at.split(" ")[0] : "—"}
                    </span>
                  </div>
                </div>

                {/* Clinical Notes banner */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700">
                  <strong className="font-semibold text-slate-900">Clinical Notes: </strong>
                  <span>{patientProfile.clinical_notes || "No notes on record."}</span>
                </div>
              </div>

              {/* Historical Medical Reports Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Historical Medical Reports</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select two reports to run an automated side-by-side comparison.
                    </p>
                  </div>

                  {selectedReports.length === 2 && (
                    <button
                      onClick={handleExecuteComparison}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer animate-pulse"
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                      <span>Compare Selected (2)</span>
                    </button>
                  )}
                </div>

                {reports.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    No reports on record for this patient yet. Use the upload button above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((r) => {
                      const isChecked = selectedReports.includes(r.id);
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            isChecked
                              ? "border-blue-500 bg-blue-50/30"
                              : "border-slate-200/80 bg-white hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleReport(r.id)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {r.filename}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Uploaded: {r.uploaded_at} • Status:{" "}
                                <span className={`font-medium ${r.status === "Completed" ? "text-emerald-600" : "text-blue-600"}`}>
                                  {r.status}
                                </span>
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setShowDetailsModal(r)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors shrink-0 ml-4 cursor-pointer"
                          >
                            <span>View Details</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Modal: Register Patient */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Register New Patient</h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {registerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={registerForm.gender}
                    onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={registerForm.dob}
                    onChange={(e) => setRegisterForm({ ...registerForm, dob: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Initial intake, monitoring glucose & lipid profile"
                  value={registerForm.clinical_notes}
                  onChange={(e) => setRegisterForm({ ...registerForm, clinical_notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isRegistering ? "Saving..." : "Save Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Report for Patient */}
      {showUploadModal && patientProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Upload Report for {patientProfile.name}
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="patient-file-upload"
                  accept=".pdf,image/*"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="hidden"
                />
                <label
                  htmlFor="patient-file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-700">
                    {uploadFile ? uploadFile.name : "Click to select lab report (PDF/Image)"}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    PyMuPDF will automatically extract biomarkers
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isUploading ? "Extracting & Analyzing..." : "Upload & Analyze"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Report Details */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {showDetailsModal.filename}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {showDetailsModal.id}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 flex-1">
              {/* Predictions summary */}
              {showDetailsModal.predictions && Object.keys(showDetailsModal.predictions).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Predicted Disease Risks
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(showDetailsModal.predictions).map(([key, val]) => (
                      <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-semibold text-slate-700 capitalize block">
                          {val.disease || key}
                        </span>
                        <span className={`text-sm font-bold mt-1 block ${val.prediction === 1 ? "text-red-600" : "text-emerald-600"}`}>
                          {val.probability !== undefined ? `${Math.round(val.probability * 100)}%` : "—"}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {val.risk_level || (val.prediction === 1 ? "High Risk" : "Low Risk")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Lab Parameters */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Extracted Lab Parameters ({Object.keys(showDetailsModal.parameters || {}).length})
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs max-h-60 overflow-y-auto pr-1">
                  {Object.entries(showDetailsModal.parameters || {}).map(([param, val]) => (
                    <div key={param} className="flex justify-between p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-500 capitalize">{param.replace(/_/g, " ")}:</span>
                      <strong className="text-slate-800">{val !== null ? String(val) : "—"}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default PatientsHistory;
