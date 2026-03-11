// web-interface-design/app/lib/hooks/useModification.ts
'use client';

import { useState, useCallback } from 'react';
import {
  modificationApi,
  FeedbackItem,
  CanvasAnnotation,
  ReflectionNote,
  Label,
  Revision,
  Decision,
  FeedbackDraft,
} from '../api/modificationApi';

export interface ModificationState {
  // 回饋相關
  feedbackItems: FeedbackItem[];
  selectedFeedback: FeedbackItem | null;
  feedbackLoading: boolean;
  feedbackError: string | null;

  // Canvas 註釋相關
  canvasAnnotations: CanvasAnnotation[];
  annotationsLoading: boolean;
  annotationsError: string | null;

  // 反思筆記
  reflectionNote: ReflectionNote | null;
  reflectionLoading: boolean;
  reflectionError: string | null;

  // 標籤
  labels: Label[];
  labelsLoading: boolean;
  labelsError: string | null;

  // 修訂版本
  revisions: Revision[];
  revisionsLoading: boolean;
  revisionsError: string | null;

  // 決策日誌
  decisions: Decision[];
  decisionsLoading: boolean;

  // 反饋綜合
  feedbackDraft: FeedbackDraft | null;
  draftLoading: boolean;
  draftError: string | null;

  // 提交狀態
  submitting: boolean;
  submitError: string | null;
}

export function useModification() {
  const [state, setState] = useState<ModificationState>({
    feedbackItems: [],
    selectedFeedback: null,
    feedbackLoading: false,
    feedbackError: null,
    canvasAnnotations: [],
    annotationsLoading: false,
    annotationsError: null,
    reflectionNote: null,
    reflectionLoading: false,
    reflectionError: null,
    labels: [],
    labelsLoading: false,
    labelsError: null,
    revisions: [],
    revisionsLoading: false,
    revisionsError: null,
    decisions: [],
    decisionsLoading: false,
    feedbackDraft: null,
    draftLoading: false,
    draftError: null,
    submitting: false,
    submitError: null,
  });

  // ============================================================
  // 回饋相關
  // ============================================================

  const loadFeedback = useCallback(async (artwork_id: string) => {
    setState((prev) => ({
      ...prev,
      feedbackLoading: true,
      feedbackError: null,
    }));

    try {
      const items = await modificationApi.getFeedback(artwork_id);
      setState((prev) => ({
        ...prev,
        feedbackItems: items,
        feedbackLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        feedbackError: error instanceof Error ? error.message : 'Failed to load feedback',
        feedbackLoading: false,
      }));
    }
  }, []);

  const createFeedback = useCallback(
    async (params: any): Promise<FeedbackItem | null> => {
      setState((prev) => ({
        ...prev,
        feedbackError: null,
      }));

      try {
        const item = await modificationApi.createFeedback(params);
        setState((prev) => ({
          ...prev,
          feedbackItems: [...prev.feedbackItems, item],
        }));
        return item;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          feedbackError: error instanceof Error ? error.message : 'Failed to create feedback',
        }));
        return null;
      }
    },
    []
  );

  const updateFeedback = useCallback(
    async (feedback_id: string, updates: Partial<FeedbackItem>): Promise<FeedbackItem | null> => {
      try {
        const updated = await modificationApi.updateFeedback(feedback_id, updates);
        setState((prev) => ({
          ...prev,
          feedbackItems: prev.feedbackItems.map((item) =>
            item.id === feedback_id ? updated : item
          ),
          selectedFeedback:
            prev.selectedFeedback?.id === feedback_id ? updated : prev.selectedFeedback,
        }));
        return updated;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          feedbackError: error instanceof Error ? error.message : 'Failed to update feedback',
        }));
        return null;
      }
    },
    []
  );

  const deleteFeedback = useCallback(async (feedback_id: string): Promise<boolean> => {
    try {
      await modificationApi.deleteFeedback(feedback_id);
      setState((prev) => ({
        ...prev,
        feedbackItems: prev.feedbackItems.filter((item) => item.id !== feedback_id),
        selectedFeedback:
          prev.selectedFeedback?.id === feedback_id ? null : prev.selectedFeedback,
      }));
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        feedbackError: error instanceof Error ? error.message : 'Failed to delete feedback',
      }));
      return false;
    }
  }, []);

  const selectFeedback = useCallback((feedback: FeedbackItem | null) => {
    setState((prev) => ({
      ...prev,
      selectedFeedback: feedback,
    }));
  }, []);

  // ============================================================
  // Canvas 註釋相關
  // ============================================================

  const loadCanvasAnnotations = useCallback(async (artwork_id: string) => {
    setState((prev) => ({
      ...prev,
      annotationsLoading: true,
      annotationsError: null,
    }));

    try {
      const annotations = await modificationApi.getCanvasAnnotations(artwork_id);
      setState((prev) => ({
        ...prev,
        canvasAnnotations: annotations,
        annotationsLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        annotationsError: error instanceof Error ? error.message : 'Failed to load annotations',
        annotationsLoading: false,
      }));
    }
  }, []);

  const saveCanvasAnnotations = useCallback(
    async (artwork_id: string, annotations: CanvasAnnotation[]): Promise<boolean> => {
      try {
        await modificationApi.saveCanvasAnnotations(artwork_id, annotations);
        setState((prev) => ({
          ...prev,
          canvasAnnotations: annotations,
        }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          annotationsError: error instanceof Error ? error.message : 'Failed to save annotations',
        }));
        return false;
      }
    },
    []
  );

  const deleteCanvasAnnotation = useCallback(
    async (artwork_id: string, annotation_id: string): Promise<boolean> => {
      try {
        await modificationApi.deleteCanvasAnnotation(artwork_id, annotation_id);
        setState((prev) => ({
          ...prev,
          canvasAnnotations: prev.canvasAnnotations.filter((a) => a.id !== annotation_id),
        }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          annotationsError: error instanceof Error ? error.message : 'Failed to delete annotation',
        }));
        return false;
      }
    },
    []
  );

  // ============================================================
  // 反思筆記
  // ============================================================

  const loadReflectionNote = useCallback(async (artwork_id: string) => {
    setState((prev) => ({
      ...prev,
      reflectionLoading: true,
      reflectionError: null,
    }));

    try {
      const note = await modificationApi.getReflectionNote(artwork_id);
      setState((prev) => ({
        ...prev,
        reflectionNote: note,
        reflectionLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        reflectionError: error instanceof Error ? error.message : 'Failed to load reflection note',
        reflectionLoading: false,
      }));
    }
  }, []);

  const updateReflectionNote = useCallback(
    async (artwork_id: string, content: string): Promise<boolean> => {
      try {
        const updated = await modificationApi.updateReflectionNote(artwork_id, content);
        setState((prev) => ({
          ...prev,
          reflectionNote: updated,
        }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          reflectionError: error instanceof Error ? error.message : 'Failed to update reflection',
        }));
        return false;
      }
    },
    []
  );

  // ============================================================
  // 標籤
  // ============================================================

  const loadLabels = useCallback(async (artwork_id: string) => {
    setState((prev) => ({
      ...prev,
      labelsLoading: true,
      labelsError: null,
    }));

    try {
      const labels = await modificationApi.getLabels(artwork_id);
      setState((prev) => ({
        ...prev,
        labels,
        labelsLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        labelsError: error instanceof Error ? error.message : 'Failed to load labels',
        labelsLoading: false,
      }));
    }
  }, []);

  const createLabel = useCallback(
    async (artwork_id: string, name: string, color?: string): Promise<Label | null> => {
      try {
        const label = await modificationApi.createLabel(artwork_id, name, color);
        setState((prev) => ({
          ...prev,
          labels: [...prev.labels, label],
        }));
        return label;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          labelsError: error instanceof Error ? error.message : 'Failed to create label',
        }));
        return null;
      }
    },
    []
  );

  const deleteLabel = useCallback(async (label_id: string): Promise<boolean> => {
    try {
      await modificationApi.deleteLabel(label_id);
      setState((prev) => ({
        ...prev,
        labels: prev.labels.filter((l) => l.id !== label_id),
      }));
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        labelsError: error instanceof Error ? error.message : 'Failed to delete label',
      }));
      return false;
    }
  }, []);

  // ============================================================
  // 修訂版本
  // ============================================================

  const loadRevisions = useCallback(async (artwork_id: string) => {
    setState((prev) => ({
      ...prev,
      revisionsLoading: true,
      revisionsError: null,
    }));

    try {
      const revisions = await modificationApi.getRevisions(artwork_id);
      setState((prev) => ({
        ...prev,
        revisions,
        revisionsLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        revisionsError: error instanceof Error ? error.message : 'Failed to load revisions',
        revisionsLoading: false,
      }));
    }
  }, []);

  const uploadRevision = useCallback(
    async (
      artwork_id: string,
      file: File,
      notes: string,
      feedback_addressed: string[]
    ): Promise<Revision | null> => {
      try {
        const revision = await modificationApi.uploadRevision(
          artwork_id,
          file,
          notes,
          feedback_addressed
        );
        setState((prev) => ({
          ...prev,
          revisions: [...prev.revisions, revision],
        }));
        return revision;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          revisionsError: error instanceof Error ? error.message : 'Failed to upload revision',
        }));
        return null;
      }
    },
    []
  );

  // ============================================================
  // 決策日誌
  // ============================================================

  const loadDecisions = useCallback(async (project_id: string) => {
    setState((prev) => ({
      ...prev,
      decisionsLoading: true,
    }));

    try {
      const decisions = await modificationApi.getDecisions(project_id);
      setState((prev) => ({
        ...prev,
        decisions,
        decisionsLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load decisions:', error);
      setState((prev) => ({
        ...prev,
        decisionsLoading: false,
      }));
    }
  }, []);

  const createDecision = useCallback(
    async (params: any): Promise<Decision | null> => {
      try {
        const decision = await modificationApi.createDecision(params);
        setState((prev) => ({
          ...prev,
          decisions: [...prev.decisions, decision],
        }));
        return decision;
      } catch (error) {
        console.error('Failed to create decision:', error);
        return null;
      }
    },
    []
  );

  // ============================================================
  // 反饋綜合
  // ============================================================

  const loadFeedbackDraft = useCallback(async (artwork_id: string) => {
    setState((prev) => ({
      ...prev,
      draftLoading: true,
      draftError: null,
    }));

    try {
      const draft = await modificationApi.getFeedbackDraft(artwork_id);
      setState((prev) => ({
        ...prev,
        feedbackDraft: draft,
        draftLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        draftError: error instanceof Error ? error.message : 'Failed to load feedback draft',
        draftLoading: false,
      }));
    }
  }, []);

  const updateFeedbackDraft = useCallback(
    async (artwork_id: string, updates: Partial<FeedbackDraft>): Promise<boolean> => {
      setState((prev) => ({
        ...prev,
        draftError: null,
      }));

      try {
        const updated = await modificationApi.updateFeedbackDraft(artwork_id, updates);
        setState((prev) => ({
          ...prev,
          feedbackDraft: updated,
        }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          draftError: error instanceof Error ? error.message : 'Failed to update draft',
        }));
        return false;
      }
    },
    []
  );

  // ============================================================
  // 提交
  // ============================================================

  const submitArtwork = useCallback(
    async (params: {
      artwork_id: string;
      revision_id?: string;
      notes?: string;
      status: string;
    }): Promise<boolean> => {
      setState((prev) => ({
        ...prev,
        submitting: true,
        submitError: null,
      }));

      try {
        await modificationApi.submitArtwork(params);
        setState((prev) => ({
          ...prev,
          submitting: false,
        }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          submitting: false,
          submitError: error instanceof Error ? error.message : 'Submission failed',
        }));
        return false;
      }
    },
    []
  );

  const approveArtwork = useCallback(
    async (artwork_id: string, approver_notes?: string): Promise<boolean> => {
      setState((prev) => ({
        ...prev,
        submitting: true,
        submitError: null,
      }));

      try {
        await modificationApi.approveArtwork({ artwork_id, approver_notes });
        setState((prev) => ({
          ...prev,
          submitting: false,
        }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          submitting: false,
          submitError: error instanceof Error ? error.message : 'Approval failed',
        }));
        return false;
      }
    },
    []
  );

  const rejectArtwork = useCallback(
    async (artwork_id: string, reason: string, feedback_items: string[]): Promise<boolean> => {
      setState((prev) => ({
        ...prev,
        submitting: true,
        submitError: null,
      }));

      try {
        await modificationApi.rejectArtwork({ artwork_id, reason, feedback_items });
        setState((prev) => ({
          ...prev,
          submitting: false,
        }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          submitting: false,
          submitError: error instanceof Error ? error.message : 'Rejection failed',
        }));
        return false;
      }
    },
    []
  );

  const clearError = useCallback((field: keyof Omit<ModificationState, 'submitting'>) => {
    setState((prev) => ({
      ...prev,
      [field]: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      feedbackItems: [],
      selectedFeedback: null,
      feedbackLoading: false,
      feedbackError: null,
      canvasAnnotations: [],
      annotationsLoading: false,
      annotationsError: null,
      reflectionNote: null,
      reflectionLoading: false,
      reflectionError: null,
      labels: [],
      labelsLoading: false,
      labelsError: null,
      revisions: [],
      revisionsLoading: false,
      revisionsError: null,
      decisions: [],
      decisionsLoading: false,
      feedbackDraft: null,
      draftLoading: false,
      draftError: null,
      submitting: false,
      submitError: null,
    });
  }, []);

  return {
    ...state,
    loadFeedback,
    createFeedback,
    updateFeedback,
    deleteFeedback,
    selectFeedback,
    loadCanvasAnnotations,
    saveCanvasAnnotations,
    deleteCanvasAnnotation,
    loadReflectionNote,
    updateReflectionNote,
    loadLabels,
    createLabel,
    deleteLabel,
    loadRevisions,
    uploadRevision,
    loadDecisions,
    createDecision,
    loadFeedbackDraft,
    updateFeedbackDraft,
    submitArtwork,
    approveArtwork,
    rejectArtwork,
    clearError,
    reset,
  };
}