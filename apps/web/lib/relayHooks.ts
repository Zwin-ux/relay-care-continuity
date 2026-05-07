import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, MutationResult, Snapshot } from "@/lib/api";
import { parseActionError, RelayActionType } from "@/lib/relayActions";
import { sanitizeOperationMessage } from "@/lib/relayViewModel";

export type OperationReceipt = {
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  state?: string;
  status?: string;
  auditEventId?: string;
  timestamp: string;
  ok: boolean;
  nextStep?: string;
};

export function snapshotKey(selectedId: string | null) {
  return ["snapshot", selectedId] as const;
}

export function useRelaySnapshot(selectedId: string | null) {
  return useQuery({
    queryKey: snapshotKey(selectedId),
    queryFn: () => api.snapshot(selectedId),
    refetchInterval: 2500,
  });
}

function receiptFromResult(result: MutationResult): OperationReceipt {
  return {
    title: result.ok ? "Operation recorded" : "Operation failed",
    message: sanitizeOperationMessage(result.message),
    entityType: result.entity_type,
    entityId: result.incident_id ?? result.entity_id,
    state: result.state,
    status: result.status,
    auditEventId: result.audit_event_id,
    timestamp: new Date().toISOString(),
    ok: result.ok,
  };
}

export function useRelayMutation({
  selectedId,
  setSelectedId,
  setReceipt,
  setBlockedAction,
}: {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  setReceipt: (receipt: OperationReceipt) => void;
  setBlockedAction: (blocked: { title: string; reason: string; nextStep?: string } | null) => void;
}) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id }: { type: RelayActionType | "load" | "triage" | "eval"; id?: string }) => {
      if (type === "load") return api.loadScenario();
      if (type === "triage") return api.runTriage();
      if (type === "verify" && id) return api.verify(id);
      if (type === "dispatch" && id) return api.dispatch(id);
      if (type === "escalate" && id) return api.escalate(id);
      if (type === "reject" && id) return api.reject(id);
      if (type === "follow" && id) return api.follow(id);
      if (type === "cancel_follow" && id) return api.cancelFollow(id);
      if (type === "accept_follow" && id) return api.acceptFollow(id);
      if (id) return api.resolve(id);
      throw new Error("Missing target for RELAY action.");
    },
    onSuccess: async (result) => {
      setBlockedAction(null);
      setReceipt(receiptFromResult(result));

      const nextSelectedId = result.incident_id ?? (result.entity_type === "incident" ? result.entity_id : selectedId);
      if (result.entity_type === "scenario") {
        setSelectedId(null);
      } else if (nextSelectedId) {
        setSelectedId(nextSelectedId);
      }

      if (result.snapshot) {
        const cacheId = result.entity_type === "scenario" ? null : nextSelectedId ?? selectedId;
        qc.setQueryData<Snapshot>(snapshotKey(cacheId), result.snapshot);
        if (cacheId !== selectedId) {
          qc.setQueryData<Snapshot>(snapshotKey(selectedId), result.snapshot);
        }
      } else {
        await qc.invalidateQueries({ queryKey: ["snapshot"] });
      }
    },
    onError: (error) => {
      const parsed = parseActionError(error instanceof Error ? error.message : "Action blocked.");
      setBlockedAction(parsed);
      setReceipt({
        title: parsed.title,
        message: parsed.reason,
        ok: false,
        nextStep: parsed.nextStep,
        timestamp: new Date().toISOString(),
      });
    },
  });
}
