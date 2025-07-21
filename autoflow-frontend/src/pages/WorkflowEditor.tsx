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
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const navigate = useNavigate();
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [runErrors, setRunErrors] = useState<any[] | null>(null);
  const [googleForms, setGoogleForms] = useState<any[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [runHistory, setRunHistory] = useState<any[]>([]);
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

  useEffect(() => {
    if (id && token) {
      axios.get(`/api/workflows/${id}/runs`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => setRunHistory(res.data.runs || []));
    }
  }, [id, token, runStatus]);

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
    setRunStatus(null);
    setRunErrors(null);
    try {
      await axios.post(`/api/workflows/${id}/run`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRunStatus('Workflow started!');
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setRunErrors(err.response.data.errors);
        setRunStatus('Validation failed');
      } else {
        setRunStatus(err.response?.data?.message || 'Failed to start workflow');
      }
    }
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="flex">
      {/* Sidebar with categories */}
      <div className="w-56 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-4 overflow-y-auto">
        {nodeCategories.map(cat => (
          <div key={cat.category}>
            <div
              className="font-bold mb-2 cursor-pointer flex items-center justify-between"
              onClick={() => toggleCategory(cat.category)}
            >
              <span>{cat.category}</span>
              <span>{openCategories.includes(cat.category) ? '▼' : '▶'}</span>
            </div>
            {openCategories.includes(cat.category) && (
              <div className="flex flex-col gap-2 mb-2">
                {cat.nodes.map((nt) => (
                  <div
                    key={nt.type}
                    className="p-2 bg-gray-800 rounded cursor-pointer text-center hover:bg-gray-700"
                    onDragStart={e => onDragStart(e, nt.type, nt.config, nt.label)}
                    draggable
                  >
                    {nt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Canvas and Node Config Sidebar */}
      <div className="flex-1 relative" ref={reactFlowWrapper} style={{ height: '80vh' }}>
        <div className="flex items-center gap-4 mb-4">
          <input
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-lg font-bold"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <button
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 font-bold"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 font-bold"
            onClick={handleRunWorkflow}
          >
            Run Workflow
          </button>
          {runStatus && <span className="ml-2 text-sm text-gray-300">{runStatus}</span>}
        </div>
        {runErrors && (
          <div className="mt-2 p-2 bg-red-900 text-red-200 rounded text-sm">
            <div className="font-bold mb-1">Validation Errors:</div>
            {runErrors.map((err, i) => (
              <div key={i} className="mb-2">
                <div className="font-semibold">{err.label || err.nodeId}</div>
                <ul className="list-disc ml-5">
                  {err.errors.map((e: string, j: number) => <li key={j}>{e}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        {runHistory.length > 0 && (
          <div className="mt-4 p-2 bg-gray-800 text-gray-100 rounded text-sm">
            <div className="font-bold mb-1">Run History:</div>
            {runHistory.map((run, i) => (
              <div key={run.id} className="mb-2 border-b border-gray-700 pb-2">
                <div>Status: <span className={run.status === 'completed' ? 'text-green-400' : 'text-red-400'}>{run.status}</span></div>
                <div>Started: {new Date(run.startedAt).toLocaleString()}</div>
                {run.finishedAt && <div>Finished: {new Date(run.finishedAt).toLocaleString()}</div>}
                <div>Result: <pre className="bg-gray-900 p-2 rounded overflow-x-auto">{JSON.stringify(run.result, null, 2)}</pre></div>
              </div>
            ))}
          </div>
        )}
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
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
        {/* Node Config Sidebar */}
        {selectedNode && (
          <div className="absolute top-0 right-0 w-80 h-full bg-gray-900 border-l border-gray-800 p-6 shadow-lg z-10 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-lg">{selectedNode.data.label}</div>
              <button className="text-gray-400 hover:text-gray-200" onClick={() => setSelectedNode(null)}>✕</button>
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
                        <label className="block text-sm font-semibold mb-1">Trigger Type</label>
                        <select
                          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                          value={selectedNode.data.config.triggerType || ''}
                          onChange={e => handleConfigChange('triggerType', e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="new_response">New Form Response</option>
                          <option value="new_or_updated_response">New or Updated Form Response</option>
                        </select>
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-semibold mb-1">Form</label>
                        <select
                          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
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
                            <label className="block text-sm font-semibold mb-1">Form</label>
                            <select
                              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
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
                  if (selectedNode.data.type === 'webhook') {
                    const schema = getNodeSchema('webhook');
                    if (!schema) return <div>No schema found for this node type.</div>;
                    return (
                      <div className="space-y-4">
                        {(Object.entries(schema.parameters) as [string, any][]).map(([key, param]) => (
                          <div key={key} className="relative group">
                            <label className="block text-sm font-semibold mb-1 capitalize flex items-center gap-1">
                              {param.label || key}
                              {param.description && (
                                <span className="ml-1 text-gray-400 cursor-pointer" tabIndex={0}>
                                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">?</text></svg>
                                  <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-56 bg-gray-800 text-gray-100 text-xs rounded p-2 shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-20 pointer-events-none">
                                    {param.description}
                                  </span>
                                </span>
                              )}
                            </label>
                            {param.type === 'string' && (!param.options ? (
                              <input
                                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                                value={selectedNode.data.config[key] || ''}
                                onChange={e => handleConfigChange(key, e.target.value)}
                              />
                            ) : (
                              <select
                                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                                value={selectedNode.data.config[key] || ''}
                                onChange={e => handleConfigChange(key, e.target.value)}
                              >
                                <option value="">Select...</option>
                                {param.options.map((opt: string) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (Object.entries(getNodeSchema('google_forms_trigger')?.parameters || {}) as [string, any][]).map(([key, param]) => (
                    <div key={key} className="relative group">
                      <label className="block text-sm font-semibold mb-1 capitalize flex items-center gap-1">
                        {param.label || key}
                        {param.description && (
                          <span className="ml-1 text-gray-400 cursor-pointer" tabIndex={0}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">?</text></svg>
                            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-56 bg-gray-800 text-gray-100 text-xs rounded p-2 shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-20 pointer-events-none">
                              {param.description}
                            </span>
                          </span>
                        )}
                      </label>
                      {param.type === 'string' && (!param.options ? (
                        <input
                          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                          value={selectedNode.data.config[key] || ''}
                          onChange={e => handleConfigChange(key, e.target.value)}
                        />
                      ) : (
                        <select
                          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
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
                          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                          value={selectedNode.data.config[key] || ''}
                          onChange={e => handleConfigChange(key, Number(e.target.value))}
                        />
                      )}
                      {param.type === 'array' && (
                        <input
                          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                          value={(selectedNode.data.config[key] || []).join(', ')}
                          onChange={e => handleConfigChange(key, e.target.value.split(',').map((v: string) => v.trim()))}
                          placeholder="Comma separated values"
                        />
                      )}
                      {param.type === 'object' && (
                        <textarea
                          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
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
                  ));
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowEditor; 