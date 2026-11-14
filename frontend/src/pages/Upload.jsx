import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Plus } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { uploadReport, getPatients } from "../services/api";
import FileUploader from "../components/common/FileUploader";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorAlert from "../components/common/ErrorAlert";

function Upload() {
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

  const [selectedFile, setSelectedFile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [customPatientName, setCustomPatientName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await getPatients();
        setPatients(data.patients || []);
      } catch (err) {
        console.error("Could not load patients list", err);
      }
    };
    loadPatients();
  }, []);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setErrors([]);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setErrors([]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setErrors([]);

    // Determine target patient
    let targetPatientId = selectedPatientId || null;
    let targetPatientName = customPatientName.trim();

    if (selectedPatientId) {
      const match = patients.find((p) => p.id === selectedPatientId);
      if (match) targetPatientName = match.name;
    }

    try {
      const result = await uploadReport(selectedFile, targetPatientId, targetPatientName);

      // Save shared context
      setReportFileName(selectedFile.name);
      setPatientInfo({
        id: targetPatientId || result.patient_id,
        name: targetPatientName || result.patient_name || "Patient",
      });

      switch (result.status) {
        case "need_more_information":
          setReportData(result.report_data);
          setQuestions(result.questions);
          setTimings({
            queue_wait_ms: result.queue_wait_ms || 8.5,
            submitted_timestamp: result.submitted_timestamp || Date.now() / 1000,
          });
          navigate("/questionnaire");
          break;

        case "success":
          setPredictions(result.predictions);
          setTimings(result.timings);
          setReportId(result.report_id);
          navigate("/dashboard");
          break;

        case "validation_error":
          setErrors(result.errors);
          break;

        default:
          setErrors(["Unknown response from server."]);
      }
    } catch (error) {
      console.error(error);
      setErrors([error.message]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">
          Upload Lab Report
        </h1>
        <p className="mt-2 text-slate-500 text-sm">
          Upload a PDF or image of your lab report. Our OCR engine extracts biochemical values, verifies missing indicators, and evaluates multi-disease clinical risks.
        </p>
      </div>

      {/* Patient Association Selection */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Assign Report to Patient Record
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-slate-400 mb-1 block">Choose Registered Patient</span>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                if (e.target.value) setCustomPatientName("");
              }}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Select Existing Patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.gender} • DOB: {p.dob})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-xs text-slate-400 mb-1 block">Or Register New Patient Name</span>
            <input
              type="text"
              placeholder="e.g. Vikram Sharma"
              value={customPatientName}
              disabled={!!selectedPatientId}
              onChange={(e) => setCustomPatientName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Upload card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <FileUploader
          onFileSelect={handleFileSelect}
          file={selectedFile}
          onClear={handleRemove}
        />

        {/* Inline errors */}
        {errors.length > 0 && (
          <div className="mt-4">
            <ErrorAlert errors={errors} onDismiss={() => setErrors([])} />
          </div>
        )}

        {/* Analyse button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isLoading}
            className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer shadow-xs"
          >
            {isLoading
              ? <LoadingSpinner label="Analysing report & checking indicators…" />
              : "Analyse Report"
            }
          </button>
        </div>
      </div>

      {/* Info panel */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex gap-3">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-800">What happens next?</p>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              Our OCR engine extracts parameters from your report. If any required fields are missing, you will answer dynamic questions in the questionnaire. Predictions are atomically saved in the database under the patient's record, complete with Turnaround Time (TAT) and Queue Waiting (WT) performance telemetry.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Upload;