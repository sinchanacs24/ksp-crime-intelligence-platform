'use strict';

const BaseRepository = require('./base.repository');
const { TABLES } = require('../config/constants');
const { runZcql, table } = require('../config/db');

class NetworkRepository extends BaseRepository {
  constructor(catalystApp) {
    super(catalystApp, TABLES.CRIMINAL_NETWORK_EDGE);
  }

  async getSubgraph(nodeType, nodeRefId, depth = 2) {
    const visited = new Set([`${nodeType}:${nodeRefId}`]);
    let frontier = [{ type: nodeType, refId: nodeRefId }];
    const edges = [];

    for (let hop = 0; hop < depth; hop++) {
      if (!frontier.length) break;
      const nextFrontier = [];

      for (const node of frontier) {
        const query = `SELECT * FROM ${TABLES.CRIMINAL_NETWORK_EDGE}
          WHERE (NodeAType = '${node.type}' AND NodeARefID = ${Number(node.refId)})
             OR (NodeBType = '${node.type}' AND NodeBRefID = ${Number(node.refId)})
          LIMIT 0, 300`;

        const rows = await runZcql(this.catalystApp, query, {
          flatten: true, tableName: TABLES.CRIMINAL_NETWORK_EDGE
        });

        for (const edge of rows) {
          edges.push(edge);
          const other = edge.NodeAType === node.type && edge.NodeARefID === node.refId
            ? { type: edge.NodeBType, refId: edge.NodeBRefID }
            : { type: edge.NodeAType, refId: edge.NodeARefID };

          const key = `${other.type}:${other.refId}`;
          if (!visited.has(key)) {
            visited.add(key);
            nextFrontier.push(other);
          }
        }
      }
      frontier = nextFrontier;
    }

    return { nodes: Array.from(visited), edges: this._dedupeEdges(edges) };
  }

  _dedupeEdges(edges) {
    const seen = new Set();
    return edges.filter((e) => {
      const key = `${e.EdgeID}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async findSharedResourceClusters(minSharedLinks = 3) {
    const query = `SELECT NodeBType, NodeBRefID, COUNT(DISTINCT NodeARefID) as linkedAccusedCount
      FROM ${TABLES.CRIMINAL_NETWORK_EDGE}
      WHERE NodeAType = 'Accused' AND NodeBType != 'Accused'
      GROUP BY NodeBType, NodeBRefID
      HAVING COUNT(DISTINCT NodeARefID) >= ${Number(minSharedLinks)}
      ORDER BY COUNT(DISTINCT NodeARefID) DESC
      LIMIT 0, 100`;
    return runZcql(this.catalystApp, query, { flatten: false });
  }

  async addEdge(edge) {
    return table(this.catalystApp, TABLES.CRIMINAL_NETWORK_EDGE).insertRow(edge);
  }
}

module.exports = NetworkRepository;
