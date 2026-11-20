import Router from "./Router";
import { AuditProvider } from "./context/AuditContext";

function App() {
  return (
    <AuditProvider>
      <Router />
    </AuditProvider>
  );
}

export default App;
