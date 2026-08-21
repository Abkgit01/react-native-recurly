import { icons } from "./icons";

export const tabs: AppTab[] = [
  { name: "index", title: "Home", icon: icons.home },
  { name: "capture", title: "Capture", icon: icons.add },
  { name: "results", title: "Results", icon: icons.activity },
  { name: "sync", title: "Sync", icon: icons.wallet },
  { name: "profile", title: "Profile", icon: icons.setting },
];

export const currentAgent: AgentProfile = {
  id: "agent-test",
  name: "Agent Test",
  role: "Field Agent",
  phone: "08133811722",
  email: "agent.test@electionwatch.ng",
  initials: "AT",
  kycStatus: "verified",
  deviceStatus: "registered",
};

export const parties: PoliticalParty[] = [
  { id: "apc", abbreviation: "APC", name: "All Progressives Congress", color: "#1f77b4" },
  { id: "lp", abbreviation: "LP", name: "Labour Party", color: "#f59e0b" },
  { id: "pdp", abbreviation: "PDP", name: "Peoples Democratic Party", color: "#16a34a" },
  { id: "nnpp", abbreviation: "NNPP", name: "New Nigeria Peoples Party", color: "#111827" },
  { id: "adp", abbreviation: "ADP", name: "Action Democratic Party", color: "#2563eb" },
];

export const currentElection: Election = {
  id: "lagos-lg-2026",
  name: "Lagos LG Polls 2026",
  code: "LG-LAG-2026",
  date: "2026-08-14T07:00:00.000Z",
  status: "active",
};

export const assignedPollingUnit: PollingUnit = {
  id: "pu-023",
  code: "PU 023",
  name: "PU 023, Ward 07",
  state: "Lagos",
  lga: "Ikeja",
  ward: "Ward 07",
  reportedStatus: "reported",
};

export const electionPackage: ElectionPackage = {
  id: "pkg-lagos-lg-2026-pu-023",
  election: currentElection,
  pollingUnit: assignedPollingUnit,
  parties,
  version: "2.4 MB",
  status: "downloaded",
  captureWindow: "7:00 AM - 6:00 PM",
  lastDownloadedAt: "2026-08-14T08:45:00.000Z",
  offlineReady: true,
};

export const publicResults: PublicResultsSummary = {
  activeElection: currentElection,
  nationalProgress: 23,
  pollingUnitsReported: 7234,
  pollingUnitsTotal: 31000,
  statesReported: "32/36",
  lgasReported: "412/774",
  leadingParties: [
    { party: parties[0], votes: 12940, percentage: 41.2 },
    { party: parties[1], votes: 8380, percentage: 26.7 },
    { party: parties[2], votes: 5760, percentage: 18.3 },
  ],
  recentUploads: [
    { id: "recent-1", pollingUnit: "PU 023, Ward 07", location: "Ikeja LGA, Lagos", time: "11:23 AM" },
    { id: "recent-2", pollingUnit: "PU 022, Ward 07", location: "Ikeja LGA, Lagos", time: "11:01 AM" },
  ],
};

export const mockPollingUnits: PollingUnit[] = [
  assignedPollingUnit,
  { id: "pu-024", code: "PU 024", name: "PU 024, Ward 07", state: "Lagos", lga: "Ikeja", ward: "Ward 07", reportedStatus: "under-review" },
  { id: "pu-025", code: "PU 025", name: "PU 025, Ward 07", state: "Lagos", lga: "Ikeja", ward: "Ward 07", reportedStatus: "not-reported" },
];

export const adminMetrics: AdminMetric[] = [
  { label: "Pending KYC", value: 24 },
  { label: "Result Reviews", value: 18 },
  { label: "Failed Syncs", value: 5 },
  { label: "Open Elections", value: 3 },
];

export const kycQueue: KYCSubmission[] = [
  {
    id: "kyc-1",
    agentName: "Agent Test",
    pollingUnit: assignedPollingUnit.name,
    status: "issues",
    confidence: 66,
    submittedAt: "2026-08-14T10:45:00.000Z",
  },
  {
    id: "kyc-2",
    agentName: "Mariam Okafor",
    pollingUnit: "PU 014, Ward 02",
    status: "clean",
    confidence: 94,
    submittedAt: "2026-08-14T09:28:00.000Z",
  },
];

export const resultReviewQueue: ResultReview[] = [
  {
    id: "review-1",
    election: currentElection.name,
    pollingUnit: assignedPollingUnit.name,
    agentName: "Agent Test",
    reason: "Vote total mismatch",
    submittedAt: "2026-08-14T11:12:00.000Z",
    status: "pending",
  },
  {
    id: "review-2",
    election: currentElection.name,
    pollingUnit: "PU 024, Ward 07",
    agentName: "Mariam Okafor",
    reason: "Low image confidence",
    submittedAt: "2026-08-14T10:54:00.000Z",
    status: "pending",
  },
];

export const incidents: Incident[] = [
  { id: "inc-1", type: "Late opening", location: "Ikeja, Ward 07", time: "8:21 AM", status: "open" },
  { id: "inc-2", type: "Network outage", location: "Surulere, Ward 03", time: "9:44 AM", status: "monitoring" },
];
