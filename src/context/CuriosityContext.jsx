import React, { createContext, useContext, useState, useEffect } from "react";
import {
  getGoals,
  addGoal,
  updateGoal,
  clearGoals,
  getEdges,
  addEdge,
  updateEdge,
  clearEdges
} from "../storage/indexeddb";

const CuriosityContext = createContext();

export const CuriosityProvider = ({ children }) => {
  const [curiosities, setCuriosities] = useState([]);
  const [edges, setEdges] = useState([]);

  // Load from IndexedDB on mount
  useEffect(() => {
    const load = async () => {
      setCuriosities(await getGoals());
      setEdges(await getEdges());
    };
    load();
  }, []);

  // Curiosity functions
  const addCuriosity = async (curiosity) => {
    await addGoal(curiosity);
    setCuriosities(await getGoals());
  };
  const updateCuriosity = async (id, updates) => {
    await updateGoal(id, updates);
    setCuriosities(await getGoals());
  };
  const clearCuriosities = async () => {
    await clearGoals();
    setCuriosities([]);
    await clearEdges();
    setEdges([]);
  };

  // Edge functions
  const addCuriosityEdge = async (edge) => {
    await addEdge(edge);
    setEdges(await getEdges());
  };
  const updateCuriosityEdge = async (id, updates) => {
    await updateEdge(id, updates);
    setEdges(await getEdges());
  };
  const clearCuriosityEdges = async () => {
    await clearEdges();
    setEdges([]);
  };

  return (
    <CuriosityContext.Provider
      value={{
        curiosities,
        edges,
        addCuriosity,
        updateCuriosity,
        clearCuriosities,
        addCuriosityEdge,
        updateCuriosityEdge,
        clearCuriosityEdges,
      }}
    >
      {children}
    </CuriosityContext.Provider>
  );
};

export const useCuriosityContext = () => useContext(CuriosityContext); 