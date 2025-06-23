import React, { useState, useEffect } from "react";
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { useCuriosityContext } from "../context/CuriosityContext";

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setGraph({ rankdir: "TB" }); // Top to Bottom layout

dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges) => {
  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 150, height: 50 }));
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id);
    return { ...node, position: { x, y } };
  });
};

const GoalVisualizer = () => {
  const { curiosities, edges, addCuriosityEdge, updateCuriosity } = useCuriosityContext();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edgeList, setEdgeList, onEdgesChange] = useEdgesState([]);

  // Sync nodes and edges from context
  useEffect(() => {
    setNodes(curiosities.map((curiosity) => ({
      id: curiosity.id.toString(),
      data: { label: curiosity.title },
      position: curiosity.position || { x: 0, y: 0 },
    })));
    setEdgeList(edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'default',
    })));
  }, [curiosities, edges]);

  const handleNodeDrag = (event, node) => {
    setNodes((prevNodes) =>
      prevNodes.map((n) => (n.id === node.id ? { ...n, position: node.position } : n))
    );
    updateCuriosity(node.id, { position: node.position });
  };

  // Handle new edge creation
  const handleConnect = async (params) => {
    const newEdge = {
      id: `e${params.source}-${params.target}-${Date.now()}`,
      source: params.source,
      target: params.target,
      type: 'default',
    };
    await addCuriosityEdge(newEdge);
    // setEdgeList will update via context effect
  };

  return (
    <div style={{ width: "100vw", height: "80vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edgeList}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDrag}
        onConnect={handleConnect}
        fitView
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default GoalVisualizer;
