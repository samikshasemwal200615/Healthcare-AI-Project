import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Layout from "./components/layout/Layout";

import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Questionnaire from "./pages/Questionnaire";
import Dashboard from "./pages/Dashboard";
import PatientsHistory from "./pages/PatientsHistory";
import CompareReports from "./pages/CompareReports";
import WorkloadManager from "./pages/WorkloadManager";
import DatabaseOverview from "./pages/DatabaseOverview";
import SystemMonitor from "./pages/SystemMonitor";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patients" element={<PatientsHistory />} />
          <Route path="/compare" element={<CompareReports />} />
          <Route path="/workload" element={<WorkloadManager />} />
          <Route path="/database" element={<DatabaseOverview />} />
          <Route path="/system" element={<SystemMonitor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;