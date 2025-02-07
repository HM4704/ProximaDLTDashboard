import { useState, useEffect, useRef } from "react";
import dagreD3 from "dagre-d3";
import { select } from "d3-selection";

const DAGVisualizer = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const svgRef = useRef(null);
  const gRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://192.168.178.35:8080/ws");

    ws.onmessage = (event) => {
      const newData = JSON.parse(event.data);

      setGraphData((prevGraph) => {
        const nodeSet = new Set(prevGraph.nodes.map((n) => n.id));

        // Add new node if it doesn’t exist
        if (!nodeSet.has(newData.id)) {
          nodeSet.add(newData.id);
        }

        // Add new incoming nodes
        newData.in.forEach((source) => {
          if (!nodeSet.has(source)) {
            nodeSet.add(source);
          }
        });

        const updatedNodes = Array.from(nodeSet).map((id) => ({ id }));
        const updatedLinks = newData.in
          .filter((source) => nodeSet.has(source))
          .map((source) => ({ source, target: newData.id }));

        return {
          nodes: updatedNodes,
          links: [...prevGraph.links, ...updatedLinks],
        };
      });
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (!graphData.nodes.length) return;

    const g = new dagreD3.graphlib.Graph().setGraph({});
    graphData.nodes.forEach((node) => {
      g.setNode(node.id, { label: "", style: "fill: lightblue; stroke: #333;" });
    });

    graphData.links.forEach((link) => {
      g.setEdge(link.source, link.target, { label: "", 
        //arrowhead: "vee", 
        lineInterpolate: "basis", style: "stroke-width: 3px; stroke: black;" });
    });

        
    const svg = select(svgRef.current);
    const inner = select(gRef.current);

    const render = new dagreD3.render();
    render(inner, g);
    
    svg.attr("width", 1200).attr("height", 800);
    inner.attr("transform", "translate(40,40)");

  }, [graphData]);

  return (
    <svg ref={svgRef}>
      <g ref={gRef} />
    </svg>
  );
};

export default DAGVisualizer;
