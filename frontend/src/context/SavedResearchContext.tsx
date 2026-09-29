import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { fetchApi } from '../services/api';
import { useAuth } from './AuthContext';

export interface SavedDocument {
  id: number;
  title: string;
  description?: string;
  content?: string;
  category: string;
  author?: string;
  organization?: string;
  publication_date?: string;
  state?: string;
  district?: string;
  keywords?: string;
  document_type?: string;
  verification_status?: string;
  saved_at?: string;
}

interface SavedResearchContextType {
  savedIds: number[];
  savedDocs: SavedDocument[];
  isSaved: (id: number) => boolean;
  toggleSave: (doc: SavedDocument) => Promise<boolean>;
  removeSaved: (id: number) => Promise<void>;
  loading: boolean;
  totalSaved: number;
  refreshSaved: () => Promise<void>;
}

const SavedResearchContext = createContext<SavedResearchContextType | undefined>(undefined);

const STORAGE_IDS_KEY = 'bhu_saved_research_ids';
const STORAGE_DOCS_KEY = 'bhu_saved_research_docs';

function getStoredIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getStoredDocs(): SavedDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function SavedResearchProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [savedIds, setSavedIds] = useState<number[]>(getStoredIds);
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>(getStoredDocs);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshSaved = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{
        status: string;
        documents: SavedDocument[];
        saved_ids: number[];
      }>('/documents/saved');

      if (res && res.status === 'SUCCESS') {
        const ids = res.saved_ids || res.documents.map(d => d.id);
        const docs = res.documents || [];
        setSavedIds(ids);
        setSavedDocs(docs);
        localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(ids));
        localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(docs));
      }
    } catch (err) {
      console.warn("Could not sync saved research with server, using local cache:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved, isAuthenticated]);

  const isSaved = useCallback(
    (id: number) => savedIds.includes(Number(id)),
    [savedIds]
  );

  const toggleSave = useCallback(
    async (doc: SavedDocument): Promise<boolean> => {
      const docId = Number(doc.id);
      const currentlySaved = savedIds.includes(docId);
      const newSavedState = !currentlySaved;

      // Optimistic state update
      let nextIds: number[];
      let nextDocs: SavedDocument[];

      if (currentlySaved) {
        nextIds = savedIds.filter(id => id !== docId);
        nextDocs = savedDocs.filter(d => Number(d.id) !== docId);
      } else {
        nextIds = [docId, ...savedIds];
        const newDoc: SavedDocument = {
          ...doc,
          saved_at: new Date().toISOString()
        };
        nextDocs = [newDoc, ...savedDocs.filter(d => Number(d.id) !== docId)];
      }

      setSavedIds(nextIds);
      setSavedDocs(nextDocs);
      localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(nextIds));
      localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(nextDocs));

      // Sync with backend API
      try {
        const res = await fetchApi<{
          status: string;
          saved: boolean;
          saved_ids: number[];
        }>(`/documents/${docId}/save`, {
          method: 'POST'
        });
        if (res && res.saved_ids) {
          setSavedIds(res.saved_ids);
          localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(res.saved_ids));
        }
      } catch (err) {
        console.warn("Backend save failed, saved locally:", err);
      }

      return newSavedState;
    },
    [savedIds, savedDocs]
  );

  const removeSaved = useCallback(
    async (docId: number) => {
      const idNum = Number(docId);
      const nextIds = savedIds.filter(id => id !== idNum);
      const nextDocs = savedDocs.filter(d => Number(d.id) !== idNum);

      setSavedIds(nextIds);
      setSavedDocs(nextDocs);
      localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(nextIds));
      localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(nextDocs));

      try {
        await fetchApi(`/documents/${idNum}/save`, { method: 'DELETE' });
      } catch (err) {
        console.warn("Backend unsave failed, unsaved locally:", err);
      }
    },
    [savedIds, savedDocs]
  );

  return (
    <SavedResearchContext.Provider
      value={{
        savedIds,
        savedDocs,
        isSaved,
        toggleSave,
        removeSaved,
        loading,
        totalSaved: savedIds.length,
        refreshSaved
      }}
    >
      {children}
    </SavedResearchContext.Provider>
  );
}

export function useSavedResearch() {
  const context = useContext(SavedResearchContext);
  if (context === undefined) {
    throw new Error('useSavedResearch must be used within a SavedResearchProvider');
  }
  return context;
}
