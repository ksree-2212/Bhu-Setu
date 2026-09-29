import { useState, useEffect } from 'react';
import { 
  Users, FileText, Plus, MessageSquare, History, Loader2, Database, 
  Map, Beaker, Search, Trash2, UserPlus, X, Send, 
  ShieldCheck, Layers, ChevronRight, CheckCircle2, Lock, Globe
} from 'lucide-react';
import { fetchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function Workspaces() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'public'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createIsPublic, setCreateIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [inviteRole, setInviteRole] = useState('Contributor');
  const [inviting, setInviting] = useState(false);

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [itemType, setItemType] = useState('document');
  const [itemTitle, setItemTitle] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  // Discussion comment
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const loadWorkspaces = () => {
    setLoading(true);
    fetchApi<any>('/workspaces')
      .then(res => {
        if (res.status === 'SUCCESS') {
          setWorkspaces(res.workspaces || []);
        }
      })
      .catch(err => {
        console.error("Failed to load workspaces:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const selectWorkspace = async (wsId: number) => {
    try {
      const res = await fetchApi<any>(`/workspaces/${wsId}`);
      if (res.status === 'SUCCESS' && res.workspace) {
        setSelectedWorkspace(res.workspace);
      }
    } catch (err) {
      console.error("Error loading workspace details:", err);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setCreating(true);
    try {
      const res = await fetchApi<any>('/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          description: createDesc.trim(),
          is_public: createIsPublic
        })
      });

      if (res.status === 'SUCCESS') {
        setShowCreateModal(false);
        setCreateName('');
        setCreateDesc('');
        loadWorkspaces();
        if (res.workspace?.id) {
          selectWorkspace(res.workspace.id);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create workspace.");
    } finally {
      setCreating(false);
    }
  };

  const openInviteModal = async () => {
    if (!selectedWorkspace) return;
    setShowInviteModal(true);
    setLoadingCandidates(true);
    try {
      const res = await fetchApi<any>(`/workspaces/${selectedWorkspace.id}/candidates`);
      if (res.status === 'SUCCESS') {
        setCandidates(res.candidates || []);
        if (res.candidates?.length > 0) {
          setSelectedCandidate(String(res.candidates[0].id));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !selectedWorkspace) return;

    setInviting(true);
    try {
      const res = await fetchApi<any>(`/workspaces/${selectedWorkspace.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          identifier: selectedCandidate,
          role: inviteRole
        })
      });

      if (res.status === 'SUCCESS') {
        setShowInviteModal(false);
        selectWorkspace(selectedWorkspace.id);
        loadWorkspaces();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to invite member.");
    } finally {
      setInviting(false);
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !selectedWorkspace) return;

    setAddingItem(true);
    try {
      const res = await fetchApi<any>(`/workspaces/${selectedWorkspace.id}/items`, {
        method: 'POST',
        body: JSON.stringify({
          item_type: itemType,
          item_id: Math.floor(Math.random() * 1000) + 1,
          notes: itemNotes.trim() || itemTitle.trim(),
          item_data: { title: itemTitle.trim() }
        })
      });

      if (res.status === 'SUCCESS') {
        setShowAddItemModal(false);
        setItemTitle('');
        setItemNotes('');
        selectWorkspace(selectedWorkspace.id);
        loadWorkspaces();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add resource to workspace.");
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!selectedWorkspace) return;
    if (!confirm("Are you sure you want to remove this resource from the workspace?")) return;

    try {
      await fetchApi<any>(`/workspaces/${selectedWorkspace.id}/items/${itemId}`, {
        method: 'DELETE'
      });
      selectWorkspace(selectedWorkspace.id);
      loadWorkspaces();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedWorkspace) return;

    setPostingComment(true);
    try {
      const res = await fetchApi<any>(`/workspaces/${selectedWorkspace.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment_text: newComment.trim() })
      });

      if (res.status === 'SUCCESS') {
        setNewComment('');
        // Append locally or reload
        setSelectedWorkspace((prev: any) => ({
          ...prev,
          comments: [...(prev.comments || []), res.comment]
        }));
        loadWorkspaces();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspace) return;
    if (!confirm(`Are you sure you want to delete workspace "${selectedWorkspace.name}"?`)) return;

    try {
      await fetchApi<any>(`/workspaces/${selectedWorkspace.id}`, {
        method: 'DELETE'
      });
      setSelectedWorkspace(null);
      loadWorkspaces();
    } catch (err) {
      console.error(err);
      alert("Only the workspace owner or administrator can delete this workspace.");
    }
  };

  // Filtered workspaces
  const filteredWorkspaces = workspaces.filter(ws => {
    const matchesSearch = ws.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (ws.description && ws.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (activeTab === 'my') {
      return ws.owner_id === user?.id || ws.member_role;
    }
    if (activeTab === 'public') {
      return ws.is_public === 1;
    }
    return true;
  });

  // ----------------------------------------------------
  // WORKSPACE DETAIL VIEW
  // ----------------------------------------------------
  if (selectedWorkspace) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedWorkspace(null)} 
              className="text-sm font-semibold text-gov-blue hover:text-gov-navy transition-colors flex items-center gap-1"
            >
              &larr; All Workspaces
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-600 truncate max-w-md">{selectedWorkspace.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={openInviteModal} 
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5 text-gov-blue" /> Invite Member
            </button>
            <button 
              onClick={() => setShowAddItemModal(true)} 
              className="bg-gov-blue hover:bg-gov-navy text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Attach Resource
            </button>
            {(user?.role === 'Administrator' || selectedWorkspace.owner_id === user?.id) && (
              <button 
                onClick={handleDeleteWorkspace}
                title="Delete Workspace"
                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Workspace Title & Metadata */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                  selectedWorkspace.is_public ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                }`}>
                  {selectedWorkspace.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {selectedWorkspace.is_public ? 'Public National Research Cell' : 'Private Team Space'}
                </span>
                <span className="text-xs text-slate-400">ID #{selectedWorkspace.id}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedWorkspace.name}</h1>
              <p className="text-slate-600 text-sm mt-1.5 max-w-3xl leading-relaxed">{selectedWorkspace.description}</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 px-4 py-3 rounded-lg text-xs shrink-0">
              <div>
                <div className="text-slate-400 font-medium">Lead Investigator</div>
                <div className="font-bold text-slate-700">{selectedWorkspace.owner_name || 'Dr. Rajesh Sharma'}</div>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div>
                <div className="text-slate-400 font-medium">Created</div>
                <div className="font-bold text-slate-700">{new Date(selectedWorkspace.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2 Cols): Shared Resources & Real-time Discussion */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Shared Resources & Documents */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gov-saffron" /> 
                  Shared Research & Datasets
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {selectedWorkspace.items?.length || 0}
                  </span>
                </h2>
                <button 
                  onClick={() => setShowAddItemModal(true)}
                  className="text-xs font-semibold text-gov-blue hover:text-gov-navy flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {(!selectedWorkspace.items || selectedWorkspace.items.length === 0) ? (
                <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-lg">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No resources linked yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Attach research papers, Sentinel LULC datasets, or simulation runs.</p>
                  <button 
                    onClick={() => setShowAddItemModal(true)}
                    className="mt-3 bg-gov-blue text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    Attach First Resource
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedWorkspace.items.map((item: any) => {
                    let Icon = FileText;
                    let typeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                    let typeLabel = 'Document';

                    if (item.item_type === 'dataset') {
                      Icon = Database;
                      typeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      typeLabel = 'Dataset';
                    } else if (item.item_type === 'scenario') {
                      Icon = Beaker;
                      typeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                      typeLabel = 'Policy Simulation';
                    } else if (item.item_type === 'query') {
                      Icon = Map;
                      typeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      typeLabel = 'GIS Query';
                    } else if (item.item_type === 'note') {
                      Icon = Layers;
                      typeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                      typeLabel = 'Note';
                    }

                    const title = item.item_data?.title || item.notes || `Resource #${item.item_id}`;

                    return (
                      <div key={item.id} className="flex items-start justify-between p-3.5 border border-slate-100 rounded-lg hover:border-slate-300 hover:bg-slate-50/50 transition-all group">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-gov-blue shrink-0 mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800">{title}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded border uppercase tracking-wider ${typeColor}`}>
                                {typeLabel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {item.notes || 'Integrated multi-disciplinary evidence artifact.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(item.added_at).toLocaleDateString()}
                          </span>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity p-1"
                            title="Remove from workspace"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Real-time Team Discussion */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gov-blue" /> 
                  Multi-Disciplinary Discussion Feed
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {selectedWorkspace.comments?.length || 0}
                  </span>
                </h2>
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Synchronized
                </span>
              </div>

              {/* Chat Thread */}
              <div className="space-y-4 mb-4 max-h-[420px] overflow-y-auto pr-1">
                {(!selectedWorkspace.comments || selectedWorkspace.comments.length === 0) ? (
                  <div className="text-center p-6 bg-slate-50 rounded-lg text-slate-500 text-xs">
                    No discussion messages yet. Start the conversation with your team below.
                  </div>
                ) : (
                  selectedWorkspace.comments.map((comment: any) => {
                    const initials = (comment.author_name || 'U')
                      .split(' ')
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <div key={comment.id} className="flex gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-gov-blue/10 text-gov-blue border border-gov-blue/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {initials}
                        </div>
                        <div className="flex-1 bg-slate-50/80 hover:bg-slate-50 rounded-lg p-3 border border-slate-100 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-xs">{comment.author_name}</span>
                              <span className="text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                {comment.author_role || 'Contributor'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {comment.created_at ? new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed">{comment.comment_text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Share a policy finding, ask a question, or post a note..."
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-gov-blue focus:bg-white focus:ring-1 focus:ring-gov-blue transition-all"
                />
                <button 
                  type="submit" 
                  disabled={postingComment || !newComment.trim()}
                  className="bg-gov-blue text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gov-navy transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {postingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Post
                </button>
              </form>
            </div>

          </div>

          {/* Right Column (1 Col): Members & Activity */}
          <div className="space-y-6">
            
            {/* Members Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-gov-blue" /> 
                  Team Members
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {selectedWorkspace.members?.length || 0}
                  </span>
                </h2>
                <button 
                  onClick={openInviteModal}
                  className="text-xs text-gov-blue font-semibold hover:text-gov-navy"
                >
                  + Invite
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {(selectedWorkspace.members || []).map((m: any) => {
                  const initials = (m.full_name || 'U')
                    .split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div key={m.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center border border-slate-200">
                          {initials}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">{m.full_name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{m.email}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {m.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Version & Activity Log */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 text-base flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-slate-500" /> Activity Log
              </h2>
              <div className="relative border-l-2 border-slate-200 ml-2 space-y-4 text-xs">
                <div className="pl-4 relative">
                  <div className="absolute w-2.5 h-2.5 bg-gov-blue rounded-full -left-[6px] top-1 border-2 border-white"></div>
                  <p className="font-semibold text-slate-700">Workspace initialized</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(selectedWorkspace.created_at).toLocaleDateString()}</p>
                </div>
                <div className="pl-4 relative">
                  <div className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-full -left-[6px] top-1 border-2 border-white"></div>
                  <p className="font-semibold text-slate-700">Team members onboarded</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedWorkspace.members?.length || 1} active researchers</p>
                </div>
                <div className="pl-4 relative">
                  <div className="absolute w-2.5 h-2.5 bg-purple-500 rounded-full -left-[6px] top-1 border-2 border-white"></div>
                  <p className="font-semibold text-slate-700">Resources linked & synced</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedWorkspace.items?.length || 0} datasets & briefs</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ----------------- MODALS ----------------- */}

        {/* Invite Member Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-gov-blue" />
                  Invite Collaborator
                </h3>
                <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Registered Platform User</label>
                  {loadingCandidates ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading researchers...
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border">
                      All registered users are already members of this workspace.
                    </div>
                  ) : (
                    <select 
                      value={selectedCandidate} 
                      onChange={e => setSelectedCandidate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-gov-blue"
                    >
                      {candidates.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.full_name} ({c.role} - {c.organization || c.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Workspace Assignment Role</label>
                  <select 
                    value={inviteRole} 
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-gov-blue"
                  >
                    <option value="Principal Investigator">Principal Investigator</option>
                    <option value="Policy Analyst">Policy Analyst</option>
                    <option value="GIS Analyst">GIS Analyst</option>
                    <option value="Government Advisor">Government Advisor</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Contributor">Contributor</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowInviteModal(false)} 
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={inviting || candidates.length === 0} 
                    className="bg-gov-blue text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gov-navy transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Confirm Invite
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Resource Modal */}
        {showAddItemModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gov-saffron" />
                  Attach Resource to Workspace
                </h3>
                <button onClick={() => setShowAddItemModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddItemSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Type</label>
                  <select 
                    value={itemType} 
                    onChange={e => setItemType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-gov-blue"
                  >
                    <option value="document">Research Paper / Statutory Document</option>
                    <option value="dataset">GIS Spatial / Sentinel Dataset</option>
                    <option value="scenario">Policy Simulation Model Run</option>
                    <option value="note">Research Note / SOP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Title / Identifier</label>
                  <input 
                    type="text" 
                    value={itemTitle} 
                    onChange={e => setItemTitle(e.target.value)}
                    placeholder="e.g., LULC Multi-Temporal Transition GeoJSON (2018-2026)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-gov-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description for Team</label>
                  <textarea 
                    value={itemNotes} 
                    onChange={e => setItemNotes(e.target.value)}
                    rows={3}
                    placeholder="Context for researchers on why this is relevant to the workspace..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-gov-blue"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddItemModal(false)} 
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={addingItem || !itemTitle.trim()} 
                    className="bg-gov-blue text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gov-navy transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {addingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Attach Resource
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ----------------------------------------------------
  // WORKSPACES GRID LIST VIEW
  // ----------------------------------------------------
  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-gov-blue/10 text-gov-blue text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              National Research Collaboration
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Users className="text-gov-blue w-6 h-6" />
            Collaborative Research Workspaces
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Secure multi-stakeholder workspaces enabling researchers, policy analysts, and government officials to co-author evidence briefs, share GIS layers, and run simulations.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)} 
          className="bg-gov-blue text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gov-navy transition-all shadow-sm flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> 
          New Workspace
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Tabs */}
        <div className="flex gap-1 w-full sm:w-auto bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
          <button 
            onClick={() => setActiveTab('all')} 
            className={`px-3 py-1.5 rounded-md transition-all ${activeTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'hover:text-slate-800'}`}
          >
            All Workspaces ({workspaces.length})
          </button>
          <button 
            onClick={() => setActiveTab('my')} 
            className={`px-3 py-1.5 rounded-md transition-all ${activeTab === 'my' ? 'bg-white text-slate-800 shadow-sm' : 'hover:text-slate-800'}`}
          >
            My Workspaces
          </button>
          <button 
            onClick={() => setActiveTab('public')} 
            className={`px-3 py-1.5 rounded-md transition-all ${activeTab === 'public' ? 'bg-white text-slate-800 shadow-sm' : 'hover:text-slate-800'}`}
          >
            Public Cells
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or topic..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-gov-blue focus:bg-white"
          />
        </div>
      </div>

      {/* Workspaces List / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white p-6 rounded-xl border border-slate-200 h-52">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
              <div className="h-5 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-100 rounded w-full mb-4"></div>
              <div className="h-8 bg-slate-100 rounded w-full mt-6"></div>
            </div>
          ))}
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Workspaces Found</h3>
          <p className="text-slate-500 text-xs mt-1 mb-4 max-w-sm mx-auto">
            {searchQuery ? 'No workspaces matched your search keywords.' : 'Create your first collaborative workspace to start co-authoring evidence.'}
          </p>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="bg-gov-blue text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gov-navy transition-colors"
          >
            Create New Workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkspaces.map(ws => (
            <div 
              key={ws.id} 
              onClick={() => selectWorkspace(ws.id)}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-gov-blue/50 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    ws.is_public ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ws.is_public ? 'Public Cell' : 'Private'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID #{ws.id}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-base mb-1.5 group-hover:text-gov-blue transition-colors">
                  {ws.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                  {ws.description || 'Inter-disciplinary policy research workspace.'}
                </p>
              </div>

              <div>
                {/* Stats Pills */}
                <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-100 text-center mb-3">
                  <div className="bg-slate-50 p-1.5 rounded">
                    <div className="text-xs font-bold text-slate-700">{ws.member_count || 1}</div>
                    <div className="text-[9px] text-slate-400 font-medium">Members</div>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded">
                    <div className="text-xs font-bold text-slate-700">{ws.item_count || 0}</div>
                    <div className="text-[9px] text-slate-400 font-medium">Resources</div>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded">
                    <div className="text-xs font-bold text-slate-700">{ws.comment_count || 0}</div>
                    <div className="text-[9px] text-slate-400 font-medium">Messages</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-50">
                  <span className="truncate max-w-[150px]">
                    Lead: <strong className="text-slate-600 font-semibold">{ws.owner_name || 'Dr. Sharma'}</strong>
                  </span>
                  <span className="flex items-center gap-1 text-gov-blue font-semibold text-[11px] group-hover:translate-x-0.5 transition-transform">
                    Enter <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-gov-blue" />
                Create Research Workspace
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Workspace Name *</label>
                <input 
                  type="text" 
                  value={createName} 
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g., Regional Ring Road Peri-Urban Growth & Land Suitability Taskforce"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-gov-blue focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scope & Objectives</label>
                <textarea 
                  value={createDesc} 
                  onChange={e => setCreateDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe research goals, spatial boundaries, and policy questions..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-gov-blue focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Access & Visibility</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateIsPublic(true)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      createIsPublic 
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900' 
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" /> Public Research Cell
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Open to all accredited researchers and government departments.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateIsPublic(false)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      !createIsPublic 
                        ? 'border-gov-blue bg-blue-50/50 text-gov-blue' 
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Lock className="w-3.5 h-3.5 text-gov-blue" /> Private Team Space
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Restricted strictly to invited collaborators and administrators.</p>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating || !createName.trim()} 
                  className="bg-gov-blue text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-gov-navy transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
