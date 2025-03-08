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
import { getGoals } from "../storage/indexeddb"; // Import IndexedDB retrieval function

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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const loadGoals = async () => {
      const goals = await getGoals();
      updateGraph(goals);
    };

    loadGoals();

    const interval = setInterval(loadGoals, 3000); // Auto-update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const updateGraph = (goals) => {
    const formattedNodes = goals.map((goal) => ({
      id: goal.id.toString(),
      data: { label: goal.title },
      position: { x: 0, y: 0 },
    }));
    const formattedEdges = goals
      .filter((goal) => goal.parentId)
      .map((goal) => ({
        id: `e${goal.parentId}-${goal.id}`,
        source: goal.parentId.toString(),
        target: goal.id.toString(),
      }));

    const layoutedNodes = getLayoutedElements(formattedNodes, formattedEdges);
    setNodes((prevNodes) => {
      const nodeMap = new Map(prevNodes.map((node) => [node.id, node]));
      layoutedNodes.forEach((node) => nodeMap.set(node.id, node));
      return Array.from(nodeMap.values());
    });

    setEdges((prevEdges) => {
      const edgeMap = new Map(prevEdges.map((edge) => [edge.id, edge]));
      formattedEdges.forEach((edge) => edgeMap.set(edge.id, edge));
      return Array.from(edgeMap.values());
    });
  };

  return (
    <div style={{ width: "100vw", height: "80vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default GoalVisualizer;
