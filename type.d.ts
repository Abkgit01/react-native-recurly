import type { ImageSourcePropType } from "react-native";

declare global {
  interface AppTab {
    name: string;
    title: string;
    icon: ImageSourcePropType;
  }

  interface TabIconProps {
    focused: boolean;
    icon: ImageSourcePropType;
  }

  type UserRole = "Field Agent" | "Admin / Reviewer" | "Public Results";
  type SyncStatus =
    | "draft"
    | "saved-locally"
    | "pending-upload"
    | "syncing"
    | "synced"
    | "failed"
    | "server-rejected";

  interface AgentProfile {
    id: string;
    name: string;
    role: UserRole;
    phone: string;
    email: string;
    initials: string;
    kycStatus: "verified" | "pending" | "rejected";
    deviceStatus: "registered" | "unregistered";
  }

  interface Election {
    id: string;
    name: string;
    code: string;
    date: string;
    status: "active" | "upcoming" | "closed";
  }

  interface PoliticalParty {
    id: string;
    abbreviation: string;
    name: string;
    color: string;
  }

  interface PollingUnit {
    id: string;
    code: string;
    name: string;
    state: string;
    lga: string;
    ward: string;
    reportedStatus: "reported" | "not-reported" | "under-review";
  }

  interface ElectionPackage {
    id: string;
    election: Election;
    pollingUnit: PollingUnit;
    parties: PoliticalParty[];
    version: string;
    status: "not-downloaded" | "downloaded" | "update-available";
    captureWindow: string;
    lastDownloadedAt?: string;
    offlineReady: boolean;
  }

  interface PartyScore {
    partyId: string;
    score: number;
  }

  interface ResultSubmission {
    id: string;
    localReference: string;
    election: Election;
    pollingUnit: PollingUnit;
    partyScores: PartyScore[];
    registeredVoters: number;
    accreditedVoters: number;
    validVotes: number;
    rejectedVotes: number;
    totalVotesCast: number;
    notes?: string;
    imageUri?: string;
    capturedAt: string;
    syncStatus: SyncStatus;
    syncProgress?: number;
    serverReference?: string;
  }

  interface PublicResultsSummary {
    activeElection: Election;
    nationalProgress: number;
    pollingUnitsReported: number;
    pollingUnitsTotal: number;
    statesReported: string;
    lgasReported: string;
    leadingParties: { party: PoliticalParty; votes: number; percentage: number }[];
    recentUploads: { id: string; pollingUnit: string; location: string; time: string }[];
  }

  interface AdminMetric {
    label: string;
    value: number;
  }

  interface KYCSubmission {
    id: string;
    agentName: string;
    pollingUnit: string;
    status: "clean" | "issues" | "duplicate-vin" | "low-confidence";
    confidence: number;
    submittedAt: string;
  }

  interface ResultReview {
    id: string;
    election: string;
    pollingUnit: string;
    agentName: string;
    reason: string;
    submittedAt: string;
    status: "pending" | "approved" | "rejected" | "escalated";
  }

  interface Incident {
    id: string;
    type: string;
    location: string;
    time: string;
    status: "open" | "monitoring" | "resolved";
  }

  interface ListHeadingProps {
    title: string;
    onPress?: () => void;
  }
}

export {};
