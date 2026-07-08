import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { Search, Network } from 'lucide-react';
import { networkApi } from '../services/api';

const NODE_COLORS: Record<string, string> = {
  Accused: '#ef4444',
  Phone: '#eab308',
  BankAccount: '#3b82f6',
  Vehicle: '#a855f7',
  Victim: '#22c55e'
};

/**
 * Criminal Network & Relationship Analysis (problem statement section 2,
 * module 10). Renders the CriminalNetworkEdge subgraph returned by
 * network.service.js as an interactive force-style layout using React
 * Flow. Node positions are computed with a simple circular layout since
 * the backend returns nodes/edges, not coordinates — swap in a proper
 * force-directed layout library (e.g. d3-force) for larger graphs.
 */
export default function NetworkAnalysis() {
  const [accusedId, setAccusedId] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const { data: graphData, isFetching } = useQuery({
    queryKey: ['network-graph', submittedId],
    queryFn: () => networkApi.getAccusedGraph(submittedId as string, 2) as any,
    enabled: !!submittedId
  });

  const { data: orgGroups } = useQuery({
    queryKey: ['organized-crime-groups'],
    queryFn: () => networkApi.getOrganizedCrimeGroups() as any
  });

  const { nodes, edges } = useMemo(() => {
    const rawNodes = graphData?.data?.nodes || [];
    const rawLinks = graphData?.data?.links || [];
    const radius = 220;
    const center = { x: 300, y: 250 };

    const flowNodes: Node[] = rawNodes.map((n: any, i: number) => {
      const angle = (2 * Math.PI * i) / Math.max(rawNodes.length, 1);
      return {
        id: n.id,
        data: { label: `${n.type} #${n.refId}` },
        position: { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) },
        style: {
          background: NODE_COLORS[n.type] || '#64748b',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 11,
          padding: 8
        }
      };
    });

    const flowEdges: Edge[] = rawLinks.map((l: any, i: number) => ({
      id: `edge-${i}`,
      source: l.source,
      target: l.target,
      label: l.relationType,
      style: { stroke: '#2b3a4d' },
      labelStyle: { fill: '#94a3b8', fontSize: 10 }
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [graphData]);

  const onSearch = useCallback(() => setSubmittedId(accusedId), [accusedId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Criminal Network Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Visualize links between accused, phones, bank accounts, and vehicles to uncover organized crime patterns
        </p>
      </div>

      <div className="card flex gap-3">
        <input
          type="text"
          placeholder="Enter Accused ID (AccusedMasterID)"
          value={accusedId}
          onChange={(e) => setAccusedId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className="input-field flex-1"
        />
        <button onClick={onSearch} className="btn-primary flex items-center gap-2">
          <Search size={16} /> Build Network
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 card h-[500px]">
          {!submittedId && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <Network size={32} />
              <p className="text-sm mt-2">Enter an Accused ID to visualize their network</p>
            </div>
          )}
          {submittedId && isFetching && <p className="text-xs text-slate-500">Building graph...</p>}
          {submittedId && !isFetching && nodes.length > 0 && (
            <ReactFlow nodes={nodes} edges={edges} fitView>
              <Background color="#1f2b3a" gap={16} />
              <Controls />
              <MiniMap nodeColor={(n) => (n.style?.background as string) || '#64748b'} maskColor="rgba(15,22,32,0.8)" />
            </ReactFlow>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Suspected Organized Crime Groups</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {orgGroups?.data?.map((g: any, i: number) => (
              <div key={i} className="bg-base-900 border border-base-700 rounded-lg px-3 py-2">
                <div className="text-sm text-slate-200">{g.accusedCount} linked accused</div>
                <div className="text-xs text-slate-500">via shared {g.sharedResourceType} #{g.sharedResourceId}</div>
              </div>
            ))}
            {!orgGroups?.data?.length && <p className="text-xs text-slate-500">No clusters detected above threshold.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
