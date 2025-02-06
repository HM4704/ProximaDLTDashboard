import { useState, useEffect } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
//import dagre from "cytoscape-dagre";
import fcose from "cytoscape-fcose";

cytoscape.use(fcose);


const nodeStyle = {
    selector: "node",
    style: {
      "label": "", // Remove node labels
      "background-color": "#3498db",
      "width": 10,
      "height": 10,
    },
  };
  
  const edgeStyle = {
    selector: "edge",
    style: {
      "width": 2,
      "line-color": "#ccc",
      "target-arrow-shape": "triangle",
    },
  };
  
  const layout = {
    name: "fcose",
    fit: true, // Automatically fit the graph within the container
    padding: 30,
    nodeRepulsion: 4500,
    idealEdgeLength: 100,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    animate: true,
    animationDuration: 1000,
  };


const graphStyle = {
  width: "1200px",
  height: "800px",
  border: "1px solid #ddd",
};

const DAGVisualizer = () => {
  const [graphData, setGraphData] = useState([]);

  useEffect(() => {
    const ws = new WebSocket("ws://192.168.178.35:8080/ws");

    ws.onmessage = (event) => {
      const newData = JSON.parse(event.data);

      setGraphData((prevElements) => {
        const existingNodeIds = new Set(prevElements.map((el) => el.data.id));
        let updatedElements = [...prevElements];

        // Add the new node if it doesn’t exist
        if (!existingNodeIds.has(newData.id)) {
          updatedElements.push({
            data: { id: newData.id, label: newData.id },
            position: { x: Math.random() * 800, y: Math.random() * 600 },
            //style: { opacity: 0, width: 5, height: 5 }, // Start faded
          });
        }

        // Add new incoming nodes and edges
        newData.in.forEach((source) => {
          if (!existingNodeIds.has(source)) {
            updatedElements.push({
              data: { id: source, label: source },
              position: { x: Math.random() * 800, y: Math.random() * 600 },
              //style: { opacity: 0, width: 5, height: 5 }, // Start faded
            });
          }
          updatedElements.push({
            data: { id: `${source}-${newData.id}`, source, target: newData.id },
            //style: { opacity: 0, width: 1 }, // Start faded
          });
        });

        return updatedElements;
      });
    };

    return () => ws.close();
  }, []);

  return (
<CytoscapeComponent
  elements={graphData}
  style={graphStyle}
  layout={layout} // Use fcose for a compact layout
  stylesheet={[
    { selector: "node", style: { label: "", "background-color": "#3498db", width: 30, height: 30 } },
    { selector: "edge", style: { width: 3, "line-color": "#ccc", "target-arrow-shape": "triangle" } },
  ]}
  cy={(cy) => {
    cy.on("add", "node", () => {
      cy.layout(layout).run(); // Re-run layout on new node addition
    });

    // cy.nodes().forEach((node) => {
    //   node.animate(
    //     { style: { opacity: 1, width: 30, height: 30 } },
    //     { duration: 500 }
    //   );
    // });

    // cy.edges().forEach((edge) => {
    //   edge.animate(
    //     { style: { opacity: 1, width: 3 } },
    //     { duration: 500 }
    //   );
    // });
  }}
/>
  );
};



export default DAGVisualizer;
