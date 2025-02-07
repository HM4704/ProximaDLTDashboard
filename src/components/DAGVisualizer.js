import { useEffect, useState, useRef } from "react";
import Viva from "vivagraphjs";

const NormalTxCol = "#9D98E6"; // Purple
const SeqTxCol = "#FF5733"; // Orange
const BranchTxCol = "#FFD700"; // Gold
const EndorseLinkCol =  "#aaa";//"#FF5733"; // Orange
const NormalLinkCol =  "#FF5733"; // "#aaa"; // Gray
const SeqPredLinkCol = "#008000"; // Green
const StemPredLinkCol = "#FF00FF"; // Magenta

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

      if (node.data && node.data.type === "branch") {
        return Viva.Graph.View.webglSquare(12, BranchTxCol); // Gold square for Branch
      } else
        if (node.data && node.data.type === "sequencer") {
        return Viva.Graph.View.webglSquare(11, SeqTxCol); // Orange square for Sequencer
      }
      return Viva.Graph.View.webglSquare(10, NormalTxCol); // Initial small size, gold color ADD8E6
    });

    // Custom link appearance: Normal vs. Endorsement (dashed)
    graphics.link((link) => {
      if (link.data) {
        if  (link.data.type === "endorse") {
          return Viva.Graph.View.webglLine(EndorseLinkCol, 1, true); // orange for endorsements
        } else if (link.data.type === "seqpred") {
          return Viva.Graph.View.webglLine(SeqPredLinkCol, 1); // Green for sequencer predecessors
        } else if (link.data.type === "stempred") {
          return Viva.Graph.View.webglLine(StemPredLinkCol, 1); // Magenta for stem predecessors
        }
        return Viva.Graph.View.webglLine(NormalLinkCol, 1); // Normal links
      }
    });

    // springLength
    //   50 for endorsement links → Makes them longer
    //   30 for regular input links → Keeps them shorter
    // springCoeff (spring stiffness)
    //   0.0002 for endorsement links → Makes them looser/stretchier
    //   0.0008 for input links → Keeps them tighter

     layout.current = Viva.Graph.Layout.forceDirected(graph.current, {
      dragCoeff: 0.02,
      gravity: -0.5,
      theta: 0.8,     
      
      springTransform: function (link, spring) {
        spring.length = (link.data?.type === "endorse" ? 55 : 35)
        spring.coeff = (link.data?.type === "endorse" ?  0.0002 :  0.0008)
      }      
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
    
    //const ws = new WebSocket("ws://localhost:8080/ws");
    const ws = new WebSocket("ws://192.168.178.35:8080/ws");
    

    ws.onmessage = (event) => {
      const newData = JSON.parse(event.data);

      console.log(
        'Received Message: ' + event.data.toString()
      )

      if (!graph.current.getNode(newData.id)) {
        graph.current.addNode(newData.id, { initial: true, 
          type: newData.stemidx ? "branch" : newData.seqid ? "sequencer" : "regular", // Define type
           });  // gold
        
        setTimeout(() => {
          graph.current.getNode(newData.id).data.initial = false;
        }, 500);
      }

    var idx = 0;
    newData.in.forEach((source) => {
      if (!graph.current.getNode(source)) {
        graph.current.addNode(source, { initial: true });
      }
    
      if (!graph.current.getLink(source, newData.id)) {
        if (newData.seqid === idx) {
          graph.current.addLink(source, newData.id, { type: "seqpred" }); // Mark as sequencer predecessor
        } else 
        if (newData.stemidx === idx) {
          graph.current.addLink(source, newData.id, { type: "stempred" }); // Mark as stem predecessor
        } else {
          graph.current.addLink(source, newData.id, { type: "input" }); // Mark as input link
        }
      }
      idx++;
    });
    
    if (newData.endorse) {
      newData.endorse.forEach((source) => {
        if (!graph.current.getNode(source)) {
          graph.current.addNode(source, { initial: true });
        }
    
        if (!graph.current.getLink(source, newData.id)) {
          graph.current.addLink(source, newData.id, { type: "endorse" }); // Mark as endorsement
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
          <span style={{ fontSize: "13px" }}>Normal transaction</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "11px", height: "11px", backgroundColor: SeqTxCol, borderRadius: "10%" }}></div>
          <span style={{ fontSize: "13px" }}>Sequencer transaction</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: BranchTxCol, borderRadius: "10%" }}></div>
          <span style={{ fontSize: "13px" }}>Branch transaction</span>
        </div>

        {/* Link Types */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px" }}>
          <div style={{
            width: "20px", height: "2px", backgroundColor: NormalLinkCol
          }}></div>
          <span style={{ fontSize: "13px" }}>Input dependency</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{
            width: "20px", height: "2px", backgroundColor: EndorseLinkCol
          }}></div>
          <span style={{ fontSize: "13px" }}>Endorsement dependency</span>
        </div>


        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{
            width: "20px", height: "2px", backgroundColor: SeqPredLinkCol
          }}></div>
          <span style={{ fontSize: "13px" }}>Sequ predecessor dependency</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{
            width: "20px", height: "2px", backgroundColor: StemPredLinkCol
          }}></div>
          <span style={{ fontSize: "13px" }}>Stem predecessor dependency</span>
        </div>

      </div>
    </div>
  );

};

export default DAGVisualizer;
