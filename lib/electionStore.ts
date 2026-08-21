import {
  assignedPollingUnit,
  currentElection,
  electionPackage,
  parties,
} from "@/assets/constants/data";
import { useSyncExternalStore } from "react";

type Listener = () => void;

const createInitialSubmission = (): ResultSubmission => ({
  id: "local-000312",
  localReference: "EW-LOCAL-000312",
  election: currentElection,
  pollingUnit: assignedPollingUnit,
  partyScores: [
    { partyId: "apc", score: 132 },
    { partyId: "lp", score: 87 },
    { partyId: "pdp", score: 45 },
    { partyId: "nnpp", score: 22 },
    { partyId: "adp", score: 10 },
  ],
  registeredVoters: 500,
  accreditedVoters: 312,
  validVotes: 296,
  rejectedVotes: 16,
  totalVotesCast: 312,
  notes: "Saved locally from field capture.",
  capturedAt: new Date().toISOString(),
  syncStatus: "pending-upload",
});

let submissions: ResultSubmission[] = [createInitialSubmission()];
const listeners = new Set<Listener>();

const emitChange = () => listeners.forEach((listener) => listener());
const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useElectionSubmissions = () =>
  useSyncExternalStore(subscribe, () => submissions, () => submissions);

export const getElectionPackage = () => electionPackage;
export const getParties = () => parties;

export const queueSubmission = (
  values: Omit<ResultSubmission, "id" | "localReference" | "capturedAt" | "syncStatus">,
) => {
  const nextNumber = submissions.length + 313;
  const submission: ResultSubmission = {
    ...values,
    id: `local-${nextNumber}`,
    localReference: `EW-LOCAL-${String(nextNumber).padStart(6, "0")}`,
    capturedAt: new Date().toISOString(),
    syncStatus: "pending-upload",
  };

  submissions = [submission, ...submissions];
  emitChange();
  return submission;
};

export const retrySubmission = (id: string) => {
  submissions = submissions.map((submission) =>
    submission.id === id
      ? { ...submission, syncStatus: "syncing", syncProgress: 48 }
      : submission,
  );
  emitChange();
};
