import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [reportData, setReportData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null); // { id, name }
  const [reportFileName, setReportFileName] = useState("");
  const [timings, setTimings] = useState(null); // { queue_wait_ms, execution_time_ms, total_turnaround_s }
  const [reportId, setReportId] = useState(null);

  const value = {
    reportData,
    setReportData,
    questions,
    setQuestions,
    predictions,
    setPredictions,
    patientInfo,
    setPatientInfo,
    reportFileName,
    setReportFileName,
    timings,
    setTimings,
    reportId,
    setReportId,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}