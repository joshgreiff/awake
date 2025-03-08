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
import { getGoals, updateGoal } from "../storage/indexeddb"; // Import update function

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
  }, []);

  const updateGraph = (goals) => {
    const formattedNodes = goals.map((goal) => ({
      id: goal.id.toString(),
      data: { label: goal.title },
      position: goal.position || { x: 0, y: 0 }, // Load saved position
    }));
    const formattedEdges = goals
      .filter((goal) => goal.parentId)
      .map((goal) => ({
        id: `e${goal.parentId}-${goal.id}`,
        source: goal.parentId.toString(),
        target: goal.id.toString(),
      }));

    setNodes(formattedNodes);
    setEdges(formattedEdges);
  };

  const handleNodeDrag = (event, node) => {
    setNodes((prevNodes) =>
      prevNodes.map((n) => (n.id === node.id ? { ...n, position: node.position } : n))
    );
    updateGoal(node.id, { position: node.position }); // Save new position in IndexedDB
  };

  return (
    <div style={{ width: "100vw", height: "80vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDrag} // Save position when drag stops
        fitView
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default GoalVisualizer;
