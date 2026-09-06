import React from "react";

import { NavigationProvider, Shell, useNav } from "./src/navigation";
import { DashboardScreen } from "./src/screens/Dashboard";
import { BuilderScreen } from "./src/screens/Builder";
import { PreviewScreen } from "./src/screens/Preview";
import { MatcherScreen } from "./src/screens/Matcher";
import { CoverLetterScreen } from "./src/screens/CoverLetter";
import { InterviewPrepScreen } from "./src/screens/InterviewPrep";
import { TrackerScreen } from "./src/screens/Tracker";
import { ImportResumeScreen } from "./src/screens/ImportResume";
import { RecruiterAuditScreen } from "./src/screens/RecruiterAudit";
import { OutreachScreen } from "./src/screens/Outreach";

function ActiveScreen() {
  const { screen } = useNav();
  switch (screen.name) {
    case "dashboard":
      return <DashboardScreen />;
    case "builder":
      return (
        <BuilderScreen
          resumeId={screen.resumeId}
          title={screen.title}
          targetRole={screen.targetRole}
          data={screen.data}
        />
      );
    case "preview":
      return (
        <PreviewScreen
          resumeId={screen.resumeId}
          title={screen.title}
          data={screen.data}
          unsaved={screen.unsaved}
        />
      );
    case "matcher":
      return <MatcherScreen resumeId={screen.resumeId} resume={screen.resume} />;
    case "cover-letter":
      return <CoverLetterScreen resumeId={screen.resumeId} resume={screen.resume} />;
    case "interview-prep":
      return <InterviewPrepScreen resumeId={screen.resumeId} resume={screen.resume} />;
    case "tracker":
      return <TrackerScreen />;
    case "import-resume":
      return <ImportResumeScreen />;
    case "recruiter-audit":
      return <RecruiterAuditScreen resumeId={screen.resumeId} resume={screen.resume} />;
    case "outreach":
      return <OutreachScreen resumeId={screen.resumeId} resume={screen.resume} />;
    default:
      return <DashboardScreen />;
  }
}

export default function App() {
  return (
    <NavigationProvider>
      <Shell>
        <ActiveScreen />
      </Shell>
    </NavigationProvider>
  );
}