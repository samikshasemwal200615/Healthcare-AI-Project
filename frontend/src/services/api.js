const BASE_URL = "http://127.0.0.1:8000";

// --- Prediction Flow ---
export async function uploadReport(file, patientId = null, patientName = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (patientId) formData.append("patient_id", patientId);
  if (patientName) formData.append("patient_name", patientName);

  const response = await fetch(`${BASE_URL}/predict/`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Upload failed.");
  }
  return data;
}

export async function continuePrediction(
  reportData,
  userAnswers,
  patientId = null,
  patientName = null,
  filename = null,
  queueWaitMs = 0,
  submittedTimestamp = null
) {
  const response = await fetch(`${BASE_URL}/predict/continue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      report_data: reportData,
      user_answers: userAnswers,
      patient_id: patientId,
      patient_name: patientName,
      filename: filename,
      queue_wait_ms: queueWaitMs,
      submitted_timestamp: submittedTimestamp,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Submission failed.");
  }
  return data;
}


// --- Patient Registry ---
export async function getPatients(search = "") {
  const url = search ? `${BASE_URL}/patients/?search=${encodeURIComponent(search)}` : `${BASE_URL}/patients/`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch patients");
  return response.json();
}

export async function getPatientDetail(patientId) {
  const response = await fetch(`${BASE_URL}/patients/${patientId}`);
  if (!response.ok) throw new Error("Failed to fetch patient details");
  return response.json();
}

export async function registerPatient(payload) {
  const response = await fetch(`${BASE_URL}/patients/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to register patient");
  }
  return response.json();
}

export async function uploadPatientReport(patientId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/patients/${patientId}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to upload patient report");
  }
  return response.json();
}

export async function deletePatient(patientId) {
  const response = await fetch(`${BASE_URL}/patients/${patientId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete patient");
  return response.json();
}

// --- Workload Manager ---
export async function getWorkloadStats() {
  const response = await fetch(`${BASE_URL}/jobs/stats`);
  if (!response.ok) throw new Error("Failed to fetch workload stats");
  return response.json();
}

export async function getJobs(category = "all") {
  const response = await fetch(`${BASE_URL}/jobs/?category=${category}`);
  if (!response.ok) throw new Error("Failed to fetch workload jobs");
  return response.json();
}

export async function getJobDetail(jobId) {
  const response = await fetch(`${BASE_URL}/jobs/${jobId}`);
  if (!response.ok) throw new Error("Failed to fetch job detail");
  return response.json();
}

export async function enqueueTestBatch() {
  const response = await fetch(`${BASE_URL}/jobs/enqueue-test-batch`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to enqueue test batch");
  return response.json();
}

export async function enqueueUploadJob(file, patientName = "", patientId = "") {
  const formData = new FormData();
  formData.append("file", file);
  if (patientName) formData.append("patient_name", patientName);
  if (patientId) formData.append("patient_id", patientId);

  const response = await fetch(`${BASE_URL}/jobs/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("Failed to enqueue report upload");
  return response.json();
}

// --- Compare Reports ---
export async function getAvailableReports() {
  const response = await fetch(`${BASE_URL}/compare/reports`);
  if (!response.ok) throw new Error("Failed to fetch available reports");
  return response.json();
}

export async function compareReports(reportAId, reportBId) {
  const response = await fetch(`${BASE_URL}/compare/?report_a=${reportAId}&report_b=${reportBId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to compare reports");
  }
  return response.json();
}

// --- Database Overview ---
export async function getDatabaseOverview() {
  const response = await fetch(`${BASE_URL}/database/overview`);
  if (!response.ok) throw new Error("Failed to fetch database overview");
  return response.json();
}

// --- System Health & Audit ---
export async function getSystemHealth() {
  const response = await fetch(`${BASE_URL}/system/health`);
  if (!response.ok) throw new Error("Failed to fetch system health");
  return response.json();
}

export async function getAuditLogs(limit = 50) {
  const response = await fetch(`${BASE_URL}/history/audit?limit=${limit}`);
  if (!response.ok) throw new Error("Failed to fetch audit logs");
  return response.json();
}