import { Switch, Route } from "wouter";
import {
  Login, Dashboard, NewAnalysis, GuidedCamera, ReviewPhoto, AnalyzingProcess,
  AnalysisResult, OccurrencesList, OccurrenceDetail, AnalysisSuccess, History,
  Profile, NotFound,
} from "./pages/AllPages";

export default function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analyses/new" component={NewAnalysis} />
      <Route path="/analyses/camera" component={GuidedCamera} />
      <Route path="/analyses/review" component={ReviewPhoto} />
      <Route path="/analyses/processing" component={AnalyzingProcess} />
      <Route path="/analyses/occurrences/:occurrenceId" component={OccurrenceDetail} />
      <Route path="/analyses/:id/occurrences/:occurrenceKey" component={OccurrenceDetail} />
      <Route path="/analyses/:id/occurrences" component={OccurrencesList} />
      <Route path="/analyses/:id/result" component={AnalysisResult} />
      <Route path="/analyses/:id/success" component={AnalysisSuccess} />
      <Route path="/history" component={History} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}
