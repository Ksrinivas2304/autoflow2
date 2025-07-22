import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../store/auth';
import axios from 'axios';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState
} from 'reactflow';
import type { Node, Edge, ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import { nodeSchemas } from '../../../shared/nodeSchemas';
import styles from './WorkflowEditor.module.css';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Dynamically build categories and nodes from nodeSchemas
const nodeCategories: { category: string; nodes: { type: string; label: string; config: any }[] }[] = [
  {
    category: 'Triggers',
    nodes: [
      { type: 'webhook', label: 'Webhook Trigger', config: {} },
      { type: 'schedule', label: 'Scheduled Trigger', config: {} },
      { type: 's3file', label: 'S3 File Trigger', config: {} },
      { type: 'fileupload', label: 'File Upload Trigger', config: {} },
    ].filter(n => nodeSchemas[n.type]),
  },
  {
    category: 'Actions',
    nodes: [
      { type: 'send_email', label: 'Send Email', config: {} },
      { type: 'slack', label: 'Send Slack Message', config: {} },
      { type: 'api_request', label: 'API Request', config: {} },
      { type: 'airtable', label: 'Push to Airtable', config: {} },
    ].filter(n => nodeSchemas[n.type]),
  },
  {
    category: 'Data Processing',
    nodes: [
      { type: 'parse_csv', label: 'Parse CSV', config: {} },
      { type: 'enrich', label: 'Enrich Data (API)', config: {} },
    ].filter(n => nodeSchemas[n.type]),
  },
  {
    category: 'AI',
    nodes: [
      { type: 'pdf_extract', label: 'Extract PDF Text', config: {} },
      { type: 'ai_summarizer', label: 'Summarize Text', config: {} },
    ].filter(n => nodeSchemas[n.type]),
  },
  {
    category: 'Logic',
    nodes: [
      { type: 'if_else', label: 'If/Else', config: {} },
      { type: 'loop', label: 'Loop', config: {} },
    ].filter(n => nodeSchemas[n.type]),
  },
  {
    category: 'Storage/Database',
    nodes: [
      { type: 'postgres', label: 'PostgreSQL Query', config: {} },
      { type: 'firebase', label: 'Firebase Realtime', config: {} },
      { type: 'redis', label: 'Redis Set/Get', config: {} },
    ].filter(n => nodeSchemas[n.type]),
  },
];

const getId = () => `${+new Date()}-${Math.floor(Math.random() * 10000)}`;

const WorkflowEditor = () => {
  const { id } = useParams();
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const navigate = useNavigate();
  const [googleForms, setGoogleForms] = useState<any[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string | null>(null);

  // Check connection status and auto-update node config after OAuth
  useEffect(() => {
    if (selectedNode && selectedNode.data.type === 'google_forms_trigger' && user) {
      fetch(`/api/oauth/status/google?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setGoogleConnected(data.connected);
          setGoogleAccountEmail(data.email || null);
          if (data.connected && !selectedNode.data.config.account) {
            handleConfigChange('account', user.email || user.id);
          }
        });
    }
    // Auto-update after OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'google' && selectedNode && selectedNode.data.type === 'google_forms_trigger') {
      handleConfigChange('account', user?.email || user?.id);
      params.delete('connected');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line
  }, [selectedNode, user]);

  useEffect(() => {
    const fetchWorkflow = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/api/workflows/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setName(res.data.name);
        setNodes(res.data.data.nodes || []);
        setEdges(res.data.data.edges || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load workflow');
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflow();
    // eslint-disable-next-line
  }, [id, token]);

  const onConnect = useCallback((connection: any) => setEdges(eds => addEdge(connection, eds)), [setEdges]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.put(`/api/workflows/${id}`, {
        name,
        data: { nodes, edges },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleRunWorkflow = async () => {
    try {
      await axios.post(`/api/workflows/${id}/run`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Optionally show a toast or notification here
    } catch (err: any) {
      // Optionally show a toast or notification here
    }
  };

  const toggleCategory = (cat: string) => {
    setOpenCategory(prev => (prev === cat ? null : cat));
  };

  const onDragStart = (event: React.DragEvent, nodeType: string, config: any, label: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType, config, label }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowWrapper.current || !reactFlowInstance) return;
      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;
      const { nodeType, config, label } = JSON.parse(data);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode: Node = {
        id: getId(),
        type: 'default',
        position,
        data: { label, type: nodeType, config },
      };
      setNodes(nds => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  // Node selection handler
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Node config change handler
  const handleConfigChange = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n =>
      n.id === selectedNode.id
        ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } }
        : n
    ));
    setSelectedNode(prev => prev && {
      ...prev,
      data: {
        ...prev.data,
        config: {
          ...prev.data.config,
          [key]: value,
        },
      },
    });
  };

  // Deselect node when clicking on canvas
  const onPaneClick = () => setSelectedNode(null);

  const getNodeSchema = (type: string) => nodeSchemas[type as keyof typeof nodeSchemas] || null;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-lg">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-600 text-lg">{error}</div>;

  return (
    <>
      <div className={styles.pageBg}>
        {/* Header */}
        <div className={styles.header}>
          <div className="flex items-center gap-4">
            <button
              className="text-blue-600 hover:text-blue-800 font-bold text-lg px-2 py-1 rounded transition"
              onClick={() => navigate('/dashboard')}
            >
              ← Dashboard
            </button>
            <input
              className={styles.headerInput}
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ minWidth: 180 }}
            />
          </div>
          <div className="flex gap-2">
            <button
              className={`${styles.headerButton} ${styles.saveButton}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              className={`${styles.headerButton} ${styles.runButton}`}
              onClick={handleRunWorkflow}
            >
              Run
            </button>
            {id && (
              <button
                className={`${styles.headerButton} ${styles.historyButton}`}
                onClick={() => navigate(`/workflow/${id}/runs`)}
              >
                View Run History
              </button>
            )}
          </div>
        </div>
        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar with categories */}
          <aside className={styles.sidebar}>
            {nodeCategories.map(cat => (
              <div key={cat.category}>
                <div
                  className="font-bold mb-2 cursor-pointer flex items-center justify-between text-gray-700 select-none"
                  onClick={() => toggleCategory(cat.category)}
                >
                  <span>{cat.category}</span>
                  <span>{openCategory === cat.category ? '▼' : '▶'}</span>
                </div>
                {openCategory === cat.category && (
                  <div className="flex flex-col gap-2 mb-2">
                    {cat.nodes.map((nt) => (
                      <div
                        key={nt.type}
                        className="p-2 bg-gray-100 rounded cursor-pointer text-center hover:bg-blue-100 text-gray-700 border border-transparent hover:border-blue-300 transition"
                        onDragStart={e => onDragStart(e, nt.type, nt.config, nt.label)}
                        draggable
                      >
                        <div className={styles.nodeType}>
                          <span className={styles.nodeTypeIcon}>⠿</span>
                          <span>{nt.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </aside>
          {/* Canvas and Node Config Sidebar */}
          <main className={styles.mainContent} ref={reactFlowWrapper}>
            <div className={styles.canvasWrap}>
              <div className={styles.reactFlowWrap}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodeClick={onNodeClick}
                  onPaneClick={onPaneClick}
                  fitView
                >
                  <Background color="#f3f4f6" gap={16} />
                  <MiniMap />
                  <Controls />
                </ReactFlow>
              </div>
              {/* Node Config Sidebar */}
              {selectedNode && (
                <div className={styles.nodeConfigSidebar}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="font-bold text-lg text-gray-800">{selectedNode.data.label}</div>
                    <button className="text-gray-400 hover:text-gray-700" onClick={() => setSelectedNode(null)}>✕</button>
                  </div>
                  {selectedNode.data.type === 'google_forms_trigger' && user ? (
                    <div className="space-y-4">
                      {(() => {
                        if (!googleConnected || !googleAccountEmail) {
                          return (
                            <div className="mb-4">
                              <button
                                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 font-bold w-full mb-4"
                                onClick={() => {
                                  window.location.href = `/api/oauth/google?state=${user.id}`;
                                }}
                              >
                                Connect Google
                              </button>
                              <div className="text-xs text-gray-400 mb-2">You must connect your Google account to select a form.</div>
                            </div>
                          );
                        }
                        // Only show trigger type and form selection if connected
                        return (
                          <div className="mb-4">
                            <div className="text-sm mb-2">
                              Connected as <b>{googleAccountEmail}</b>
                              <button
                                className="ml-2 text-blue-400 underline"
                                onClick={() => {
                                  window.location.href = `/api/oauth/google?state=${user.id}`;
                                }}
                              >
                                Change
                              </button>
                            </div>
                            <div>
                              <label className={styles.nodeConfigLabel}>Trigger Type</label>
                              <select
                                className={styles.nodeConfigSelect}
                                value={selectedNode.data.config.triggerType || ''}
                                onChange={e => handleConfigChange('triggerType', e.target.value)}
                              >
                                <option value="">Select...</option>
                                <option value="new_response">New Form Response</option>
                                <option value="new_or_updated_response">New or Updated Form Response</option>
                              </select>
                            </div>
                            <div className="mt-2">
                              <label className={styles.nodeConfigLabel}>Form</label>
                              <select
                                className={styles.nodeConfigSelect}
                                value={selectedNode.data.config.formId || ''}
                                onChange={e => handleConfigChange('formId', e.target.value)}
                              >
                                <option value="">Select a form...</option>
                                {googleForms.map((form: any) => (
                                  <option key={form.id} value={form.id}>{form.title}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const schema = getNodeSchema(selectedNode.data.type);
                        if (!schema) return <div>No schema found for this node type.</div>;
                        // Show connect button for OAuth nodes
                        const oauthProviders: Record<string, string> = {
                          slack: 'Slack',
                          google: 'Google',
                          airtable: 'Airtable',
                        };
                        if (oauthProviders[selectedNode.data.type]) {
                          return (
                            <div className="mb-4">
                              <button
                                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 font-bold w-full mb-4"
                                onClick={() => {
                                  window.location.href = `/api/oauth/${selectedNode.data.type}?state=${user?.id}`;
                                }}
                              >
                                Connect {oauthProviders[selectedNode.data.type]}
                              </button>
                              <div className="text-xs text-gray-400 mb-2">You must connect your {oauthProviders[selectedNode.data.type]} account to use this node.</div>
                            </div>
                          );
                        }
                        if (selectedNode.data.type === 'google_forms_trigger' && user) {
                          if (googleConnected && googleAccountEmail) {
                            return (
                              <div className="mb-4">
                                <div className="text-sm mb-2">
                                  Connected as <b>{googleAccountEmail}</b>
                                  <button
                                    className="ml-2 text-blue-400 underline"
                                    onClick={() => {
                                      window.location.href = `/api/oauth/google?state=${user.id}`;
                                    }}
                                  >
                                    Change
                                  </button>
                                </div>
                                <div>
                                  <label className={styles.nodeConfigLabel}>Form</label>
                                  <select
                                    className={styles.nodeConfigSelect}
                                    value={selectedNode.data.config.formId || ''}
                                    onChange={e => handleConfigChange('formId', e.target.value)}
                                  >
                                    <option value="">Select a form...</option>
                                    {googleForms.map((form: any) => (
                                      <option key={form.id} value={form.id}>{form.title}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="mb-4">
                              <button
                                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 font-bold w-full mb-4"
                                onClick={() => {
                                  window.location.href = `/api/oauth/google?state=${user.id}`;
                                }}
                              >
                                Connect Google
                              </button>
                              <div className="text-xs text-gray-400 mb-2">You must connect your Google account to use this node.</div>
                            </div>
                          );
                        }
                        // For webhook node, show the webhook URL for easy copy-paste
                        if (selectedNode.data.type === 'webhook') {
                          const baseUrl = window.location.origin.replace(':5173', ':4000');
                          const webhookUrl = `${baseUrl}/api/webhook/${id}`;
                          return (
                            <div className="space-y-4">
                              <div>
                                <label className={styles.nodeConfigLabel}>Webhook URL</label>
                                <div className="flex gap-2 items-center">
                                  <input
                                    className={styles.nodeConfigInput}
                                    value={webhookUrl}
                                    readOnly
                                    onFocus={e => e.target.select()}
                                  />
                                  <button
                                    type="button"
                                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                                    onClick={() => {
                                      navigator.clipboard.writeText(webhookUrl);
                                    }}
                                  >
                                    Copy
                                  </button>
                                </div>
                              </div>
                              {(Object.entries(schema.parameters) as [string, any][]).map(([key, param]) => (
                                <div key={key} className="relative group">
                                  <label className={`${styles.nodeConfigLabel} flex items-center gap-1`}>
                                    <span>{param.label || key}</span>
                                    {param.description && (
                                      <span className={styles.nodeConfigDescription}>
                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">?</text></svg>
                                        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-56 bg-gray-800 text-gray-100 text-xs rounded p-2 shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-20 pointer-events-none">
                                          {param.description}
                                        </span>
                                      </span>
                                    )}
                                  </label>
                                  {param.type === 'string' && (!param.options ? (
                                    <input
                                      className={styles.nodeConfigInput}
                                      value={selectedNode.data.config[key] || ''}
                                      onChange={e => handleConfigChange(key, e.target.value)}
                                    />
                                  ) : (
                                    <select
                                      className={styles.nodeConfigSelect}
                                      value={selectedNode.data.config[key] || ''}
                                      onChange={e => handleConfigChange(key, e.target.value)}
                                    >
                                      <option value="">Select...</option>
                                      {param.options.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ))}
                                  {param.type === 'number' && (
                                    <input
                                      type="number"
                                      className={styles.nodeConfigInput}
                                      value={selectedNode.data.config[key] || ''}
                                      onChange={e => handleConfigChange(key, Number(e.target.value))}
                                    />
                                  )}
                                  {param.type === 'array' && (
                                    <input
                                      className={styles.nodeConfigInput}
                                      value={(selectedNode.data.config[key] || []).join(', ')}
                                      onChange={e => handleConfigChange(key, e.target.value.split(',').map((v: string) => v.trim()))}
                                      placeholder="Comma separated values"
                                    />
                                  )}
                                  {param.type === 'object' && (
                                    <textarea
                                      className={styles.nodeConfigTextarea}
                                      value={JSON.stringify(selectedNode.data.config[key] || {}, null, 2)}
                                      onChange={e => {
                                        try {
                                          handleConfigChange(key, JSON.parse(e.target.value));
                                        } catch {
                                          // ignore parse error
                                        }
                                      }}
                                      placeholder="JSON object"
                                      rows={3}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        }
                        // For all other nodes, render config fields from their schema
                        return (
                          <div className="space-y-4">
                            {(Object.entries(schema.parameters) as [string, any][]).map(([key, param]) => {
                              // Special UI for api_request.queryParams
                              if (
                                selectedNode.data.type === 'api_request' && key === 'queryParams'
                              ) {
                                const qp = selectedNode.data.config.queryParams || {};
                                const entries = Object.entries(qp);
                                return (
                                  <div key={key} className="mb-4">
                                    <label className={styles.nodeConfigLabel}>Query Parameters</label>
                                    <div className="space-y-2">
                                      {entries.length === 0 && (
                                        <div className="text-xs text-gray-400 mb-2">No query parameters. Add one below.</div>
                                      )}
                                      {entries.map(([k, v], idx) => (
                                        <div key={k + idx} className="flex gap-2 items-center">
                                          <input
                                            className={styles.nodeConfigInput}
                                            placeholder="Name"
                                            value={k}
                                            onChange={e => {
                                              const newKey = e.target.value;
                                              const newObj = { ...qp };
                                              delete newObj[k];
                                              newObj[newKey] = v;
                                              handleConfigChange('queryParams', newObj);
                                            }}
                                          />
                                          <input
                                            className={styles.nodeConfigInput}
                                            placeholder="Value"
                                            value={v as string}
                                            onChange={e => {
                                              const newObj = { ...qp, [k]: e.target.value };
                                              handleConfigChange('queryParams', newObj);
                                            }}
                                          />
                                          <button
                                            type="button"
                                            className="text-red-400 hover:text-red-600 px-2"
                                            onClick={() => {
                                              const newObj = { ...qp };
                                              delete newObj[k];
                                              handleConfigChange('queryParams', newObj);
                                            }}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        className="mt-2 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                                        onClick={() => {
                                          const newObj = { ...qp, '': '' };
                                          handleConfigChange('queryParams', newObj);
                                        }}
                                      >
                                        + Add Query Parameter
                                      </button>
                                    </div>
                                  </div>
                                );
                              }
                              // Default rendering for other fields
                              return (
                                <div key={key} className="relative group">
                                  <label className={`${styles.nodeConfigLabel} flex items-center gap-1`}>
                                    <span>{param.label || key}</span>
                                    {param.description && (
                                      <span className={styles.nodeConfigDescription}>
                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">?</text></svg>
                                        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-56 bg-gray-800 text-gray-100 text-xs rounded p-2 shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-20 pointer-events-none">
                                          {param.description}
                                        </span>
                                      </span>
                                    )}
                                  </label>
                                  {param.type === 'string' && (!param.options ? (
                                    <input
                                      className={styles.nodeConfigInput}
                                      value={selectedNode.data.config[key] || ''}
                                      onChange={e => handleConfigChange(key, e.target.value)}
                                    />
                                  ) : (
                                    <select
                                      className={styles.nodeConfigSelect}
                                      value={selectedNode.data.config[key] || ''}
                                      onChange={e => handleConfigChange(key, e.target.value)}
                                    >
                                      <option value="">Select...</option>
                                      {param.options.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ))}
                                  {param.type === 'number' && (
                                    <input
                                      type="number"
                                      className={styles.nodeConfigInput}
                                      value={selectedNode.data.config[key] || ''}
                                      onChange={e => handleConfigChange(key, Number(e.target.value))}
                                    />
                                  )}
                                  {param.type === 'array' && (
                                    <input
                                      className={styles.nodeConfigInput}
                                      value={(selectedNode.data.config[key] || []).join(', ')}
                                      onChange={e => handleConfigChange(key, e.target.value.split(',').map((v: string) => v.trim()))}
                                      placeholder="Comma separated values"
                                    />
                                  )}
                                  {param.type === 'object' && selectedNode.data.type !== 'api_request' && key !== 'queryParams' && (
                                    <textarea
                                      className={styles.nodeConfigTextarea}
                                      value={JSON.stringify(selectedNode.data.config[key] || {}, null, 2)}
                                      onChange={e => {
                                        try {
                                          handleConfigChange(key, JSON.parse(e.target.value));
                                        } catch {
                                          // ignore parse error
                                        }
                                      }}
                                      placeholder="JSON object"
                                      rows={3}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default WorkflowEditor; 