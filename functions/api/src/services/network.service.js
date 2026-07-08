'use strict';

const NetworkRepository = require('../repositories/network.repository');
const { NODE_TYPES } = require('../config/constants');

class NetworkService {
  constructor(catalystApp) {
    this.repo = new NetworkRepository(catalystApp);
  }

  async getAccusedNetworkGraph(accusedMasterId, depth = 2) {
    const { nodes, edges } = await this.repo.getSubgraph(NODE_TYPES.ACCUSED, accusedMasterId, depth);
    return {
      nodes: nodes.map((key) => {
        const [type, refId] = key.split(':');
        return { id: key, type, refId: Number(refId) };
      }),
      links: edges.map((e) => ({
        source: `${e.NodeAType}:${e.NodeARefID}`,
        target: `${e.NodeBType}:${e.NodeBRefID}`,
        relationType: e.RelationType,
        weight: e.Weight,
        caseMasterId: e.CaseMasterID
      }))
    };
  }

  async detectOrganizedCrimeGroups({ minSharedLinks = 3, minGroupSize = 3 } = {}) {
    const seeds = await this.repo.findSharedResourceClusters(minSharedLinks);
    const groups = [];
    for (const row of seeds) {
      const seed = row.CriminalNetworkEdge;
      const { nodes } = await this.repo.getSubgraph(seed.NodeBType, seed.NodeBRefID, 2);
      const accusedNodes = nodes.filter((n) => n.startsWith('Accused:'));
      if (accusedNodes.length >= minGroupSize) {
        groups.push({
          sharedResourceType: seed.NodeBType,
          sharedResourceId: seed.NodeBRefID,
          accusedCount: accusedNodes.length,
          accusedNodes
        });
      }
    }
    return groups;
  }

  async linkNodes({ caseMasterId, nodeAType, nodeARefId, nodeBType, nodeBRefId, relationType, weight = 1 }) {
    return this.repo.addEdge({
      CaseMasterID: caseMasterId, NodeAType: nodeAType, NodeARefID: nodeARefId,
      NodeBType: nodeBType, NodeBRefID: nodeBRefId, RelationType: relationType, Weight: weight
    });
  }
}

module.exports = NetworkService;
