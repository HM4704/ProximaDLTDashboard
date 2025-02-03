import { useState, useEffect } from "react";
import { Graph } from "react-d3-graph";

const graphConfig = {
    directed: true,
    nodeHighlightBehavior: true,
    linkHighlightBehavior: true,
    height: 800,
    width: 1200,
    automaticRearrangeAfterDropNode: true,
    staticGraphWithDragAndDrop: false, // Disable zoom & pan
    d3: {
      disableLinkForce: false,
      alphaTarget: 0.05,
      panAndZoom: false, // Enable zooming
      zoom: 1.5, // Set a default zoom level
    },
    node: {
      color: "blue", // Node color
      size: 200, // Node size (optional)
      highlightColor: "red", // Highlighted node color
      fontColor: "white", // Font color (if labels are enabled)
      labelProperty: () => "", // This hides the label
    },
    link: {
      color: "grey", // Link color
      highlightColor: "orange", // Highlighted link color
      strokeWidth: 2, // Link thickness
    },    
  };

const DAGVisualizer = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws");

    ws.onmessage = (event) => {
      const newData = JSON.parse(event.data);

      // Create a set of all node IDs
      const nodeSet = new Set(graphData.nodes.map((n) => n.id));

      // Add the new node if it doesn’t exist
      if (!nodeSet.has(newData.id)) {
        nodeSet.add(newData.id);
      }

      // Add new incoming nodes
      newData.in.forEach((source) => {
        if (!nodeSet.has(source)) {
          nodeSet.add(source);
        }
      });

      // Convert the set back into an array
      const updatedNodes = Array.from(nodeSet).map((id) => ({ id }));

      // Filter valid links
      const updatedLinks = newData.in
        .filter((source) => nodeSet.has(source)) // Ensure source exists
        .map((source) => ({ source, target: newData.id }));

      setGraphData({
        nodes: updatedNodes,
        links: [...graphData.links, ...updatedLinks],
      });
    };

    return () => ws.close();
  }, [graphData]);

  if (graphData.nodes.length === 0) return <p>Loading Graph...</p>;

  // //If you want each node or edge to have different colors, modify your graphData:

  // const updatedNodes = Array.from(nodeSet).map((id) => ({
  //   id,
  //   color: id === "specialNode" ? "gold" : "blue", // Example: Set a special color for a node
  // }));
  
  // const updatedLinks = newData.in.map((source) => ({
  //   source,
  //   target: newData.id,
  //   color: "purple", // Custom edge color
  // }));

  return (
    <Graph
      id="dag-graph"
      data={graphData}
      config={graphConfig}
/*       config={{
        directed: true,
        nodeHighlightBehavior: true,
        linkHighlightBehavior: true,
        height: 800,
        width: 1200,
      }}
 */    />
  );
};

export default DAGVisualizer;