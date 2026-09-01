import {
  submitResultCapture,
  type KycImageAsset,
  type ResultCaptureElectionOption,
  type ResultCapturePartyScore,
  type SubmitResultCaptureRequest,
} from "@/lib/authApi";
import { useSyncExternalStore } from "react";

type Listener = () => void;

export type QueuedResultSubmission = {
  id: string;
  localReference: string;
  election: ResultCaptureElectionOption;
  pollingUnit: {
    id?: number;
    code?: string | null;
    name: string;
    state: string;
    lga: string;
    ward: string;
  };
  partyScores: ResultCapturePartyScore[];
  registeredVoters: number | null;
  accreditedVoters: number | null;
  ballotPapersIssued: number | null;
  unusedBallotPapers: number | null;
  spoiledBallotPapers: number | null;
  validVotes: number | null;
  rejectedVotes: number | null;
  totalVotesCast: number | null;
  notes?: string;
  image: KycImageAsset;
  capturedAt: string;
  syncStatus: SyncStatus;
  syncProgress?: number;
  serverReference?: string;
  resultSubmissionId?: number;
  errorMessage?: string;
  submitPayload: Omit<SubmitResultCaptureRequest, "token">;
};

let submissions: QueuedResultSubmission[] = [];
let lastSuccessfulSyncAt: string | null = null;
const listeners = new Set<Listener>();

const emitChange = () => listeners.forEach((listener) => listener());
const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const createLocalReference = () =>
  `EW-LOCAL-${Date.now().toString().slice(-8)}`;

export const useElectionSubmissions = () =>
  useSyncExternalStore(subscribe, () => submissions, () => submissions);

export const getLastSuccessfulSyncAt = () => lastSuccessfulSyncAt;

export const queueSubmission = (
  values: Omit<
    QueuedResultSubmission,
    "id" | "localReference" | "capturedAt" | "syncStatus"
  >,
) => {
  const localReference = createLocalReference();
  const submission: QueuedResultSubmission = {
    ...values,
    id: localReference,
    localReference,
    capturedAt: new Date().toISOString(),
    syncStatus: "pending-upload",
  };

  submissions = [submission, ...submissions];
  emitChange();
  return submission;
};

export const markSubmissionSynced = (
  id: string,
  serverReference: string,
  resultSubmissionId: number,
) => {
  lastSuccessfulSyncAt = new Date().toISOString();
  submissions = submissions.map((submission) =>
    submission.id === id
      ? {
          ...submission,
          syncStatus: "synced",
          syncProgress: 100,
          serverReference,
          submitPayload: submission.submitPayload,
          resultSubmissionId,
        }
      : submission,
  );
  emitChange();
};

export const markSubmissionFailed = (id: string, errorMessage: string) => {
  submissions = submissions.map((submission) =>
    submission.id === id
      ? {
          ...submission,
          syncStatus: "failed",
          syncProgress: undefined,
          errorMessage,
        }
      : submission,
  );
  emitChange();
};

export const syncQueuedSubmission = async (token: string, id: string) => {
  const submission = submissions.find((item) => item.id === id);
  if (!submission || submission.syncStatus === "syncing") return;

  submissions = submissions.map((item) =>
    item.id === id ? { ...item, syncStatus: "syncing", syncProgress: 35 } : item,
  );
  emitChange();

  try {
    const result = await submitResultCapture({
      token,
      ...submission.submitPayload,
    });
    markSubmissionSynced(
      id,
      result.receiptCode,
      result.resultSubmissionId,
    );
  } catch (error) {
    markSubmissionFailed(
      id,
      error instanceof Error
        ? error.message
        : "Submission could not be synchronized.",
    );
  }
};
