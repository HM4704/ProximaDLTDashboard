import { useEffect, useState, useRef } from "react";
import Viva from "vivagraphjs";

const NormalTxCol = "#9D98E6"; // Purple
const SeqTxCol = "#FF5733"; // Orange
const EndorseLinkCol = "#FF5733"; // Orange
const NormalLinkCol = "#aaa"; // Gray

const DAGVisualizer = () => {
  const containerRef = useRef(null);
  const graph = useRef(Viva.Graph.graph());
  const renderer = useRef(null);
  const layout = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current || renderer.current) return; // ✅ Prevent multiple initializations

    const graphics = Viva.Graph.View.webglGraphics();

    // Custom node appearance with animation
    graphics.node((node) => {
      // const size = node.data?.initial ? 15 : 15; // Start small, then grow

      if (node.data && node.data.type === "sequencer") {
        return Viva.Graph.View.webglSquare(12, SeqTxCol); // Orange Circle for Sequencer
      }
      return Viva.Graph.View.webglSquare(10, NormalTxCol); // Initial small size, gold color ADD8E6
    });

    // Custom link appearance: Normal vs. Endorsement (dashed)
    graphics.link((link) => {
      if (link.data && link.data.type === "endorse") {
        return Viva.Graph.View.webglLine(EndorseLinkCol, 2, true); // Dashed orange for endorsements
      }
      return Viva.Graph.View.webglLine(NormalLinkCol, 2); // Normal links
    });

    layout.current = Viva.Graph.Layout.forceDirected(graph.current, {
      //springLength: 10,  // Nodes are pulled closer
      // springCoeff: 0.0008, // Adjusts how strong the springs pull
      dragCoeff: 0.02, // Higher values reduce "jittering"
      //gravity: -10,  // Low gravity prevents excessive spreading
      theta: 0.8, // Lower theta makes the force calculations more precise

      springLength: 30,  
      gravity: -.5,  
      springCoeff: 0.001
     });

    renderer.current = Viva.Graph.View.renderer(graph.current, {
      container: containerRef.current,
      graphics,
      layout: layout.current,
    });

    renderer.current.run();
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    const ws = new WebSocket("ws://localhost:8080/ws");

    ws.onmessage = (event) => {
      const newData = JSON.parse(event.data);

      console.log(
        'Received Message: ' + event.data.toString()
      )

      if (!graph.current.getNode(newData.id)) {
        graph.current.addNode(newData.id, { initial: true, 
          type: newData.seqid ? "sequencer" : "regular", // Define type
           });  // gold
        
        setTimeout(() => {
          graph.current.getNode(newData.id).data.initial = false;
        }, 500);
      }

      newData.in.forEach((source) => {
        if (!graph.current.getNode(source)) {
          graph.current.addNode(source, { initial: true, color: "#ADD8E6" });  // lightblue

          setTimeout(() => {
            graph.current.getNode(source).data.initial = false;
          }, 500);
        }

        if (!graph.current.getLink(source, newData.id)) {
          graph.current.addLink(source, newData.id);
        }
      });

      if (newData.endorse) {
        newData.endorse.forEach((source) => {
          if (!graph.current.getNode(source)) {
            graph.current.addNode(source, { initial: true });  // lightblue

            setTimeout(() => {
              graph.current.getNode(source).data.initial = false;
            }, 500);
          }

          if (!graph.current.getLink(source, newData.id)) {
            graph.current.addLink(source, newData.id, { type: "endorse" });
          }
        });
      }
    };

    return () => ws.close();
  }, [isInitialized]);

  // return <div ref={containerRef} style={{ width: "100%", height: "800px" }} />;
  return (
    <div style={{ position: "relative", width: "100%", height: "800px" }}>
      {/* Graph Container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Legend Box */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        padding: "10px",
        borderRadius: "5px",
        boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
      }}>

        {/* Node Types */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "10px", height: "10px", backgroundColor: NormalTxCol, borderRadius: "10%" }}></div>
          <span style={{ fontSize: "12px" }}>Normal transaction</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: SeqTxCol, borderRadius: "10%" }}></div>
          <span style={{ fontSize: "12px" }}>Sequencer transaction</span>
        </div>

        {/* Link Types */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px" }}>
          <div style={{
            width: "20px", height: "2px", backgroundColor: NormalLinkCol
          }}></div>
          <span style={{ fontSize: "12px" }}>Input dependency</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{
            width: "20px", height: "2px", backgroundColor: EndorseLinkCol
          }}></div>
          <span style={{ fontSize: "12px" }}>Endorsement dependency</span>
        </div>
      </div>
    </div>
  );

};

export default DAGVisualizer;
