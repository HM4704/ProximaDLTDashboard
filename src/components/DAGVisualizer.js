import { useEffect, useState, useRef } from "react";
import Viva from "vivagraphjs";
import config from './../config';  // Import the configuration

const NormalTxCol = "#3737F0"; //rgb(55, 55, 236); // "#9D98E6"; // Purple
const SeqTxCol =  "#008080";  // "#000000";  // "#FFD700";   // "#FF5733"; // Orange
const BranchTxCol =  "#FF5733"; // "#FFD700"; // Gold
const EndorseLinkVisCol = "#FF573398"; // Orange
const EndorseLinkHidCol = "#FF573300"; // Orange
const NormalLinkCol =  "#aaa"; // Gray
const SeqPredLinkCol = "#9F9FFA";  //rgb(159, 159, 250); //"#F38D86"
const StemPredLinkCol = "#FF00FF"; // Magenta

const DAGVisualizer = () => {
  const containerRef = useRef(null);
  const graph = useRef(Viva.Graph.graph());
  const renderer = useRef(null);
  const layout = useRef(null);
  const ws = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showEndorsements, setShowEndorsements] = useState(false);
  const [wsError, setWsError] = useState(""); // Store WebSocket errors
  const [isPaused, setIsPaused] = useState(false); // DAG display pause state
  const [hoveredNodeData, setHoveredNodeData] = useState(null);

  useEffect(() => {
    if (!containerRef.current || renderer.current) return;

    const graphics = Viva.Graph.View.webglGraphics();

    graphics.node((node) => {
      if (node.data?.type === "branch") return Viva.Graph.View.webglSquare(12, BranchTxCol);
      if (node.data?.type === "sequencer") return Viva.Graph.View.webglSquare(11, SeqTxCol);
      return Viva.Graph.View.webglSquare(10, NormalTxCol);
    });

    // Custom link appearance: Normal vs. Endorsement (dashed)
    graphics.link((link) => {
      if (link.data?.type === "endorse") {
        const col = showEndorsements ? EndorseLinkVisCol : EndorseLinkHidCol;
        return Viva.Graph.View.webglLine(col);
      } else if (link.data?.type === "seqpred") {
        return Viva.Graph.View.webglLine(SeqPredLinkCol);
      } else if (link.data?.type === "stempred") {
        return Viva.Graph.View.webglLine(StemPredLinkCol);
      }
      return Viva.Graph.View.webglLine(NormalLinkCol);
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

    // Mouse events for showing node info
    const events = Viva.Graph.webglInputEvents(graphics, graph.current);
    events.mouseEnter((node) => {
      setHoveredNodeData(node.data);
    });

    events.mouseLeave(() => {
      setHoveredNodeData(null);
    });

  }, [showEndorsements]);

  useEffect(() => {
    if (!isInitialized || !renderer.current) return;

    const graphics = renderer.current.getGraphics();
    const graphInstance = graph.current;

    graphInstance.forEachLink((link) => {
      if (link.data?.type === "endorse") {
        const color = showEndorsements ? EndorseLinkVisCol : EndorseLinkHidCol;
        const linkUI = graphics.getLinkUI(link.id);
        if (linkUI) {
          linkUI.color = Viva.Graph.View._webglUtil.parseColor(color);
        }
      }
    });

    renderer.current.rerender();
  }, [showEndorsements, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    ws.current = new WebSocket(`ws://${config.baseUrl}/wsapi/v1/dag_vertex_stream`);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setWsError(""); // Clear error if connected
      renderer.current.rerender();
    };

    ws.current.onerror = () => {
      setWsError("WebSocket connection failed. Please check the server.");
    };

    ws.current.onclose = () => {
      setWsError("WebSocket disconnected. Trying to reconnect...");
      setTimeout(() => {
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
          ws.current = new WebSocket(`ws://${config.baseUrl}/wsapi/v1/dag_vertex_stream`);
        }
      }, 3000); // Attempt reconnect after 3 seconds
    };

    ws.current.onmessage = (event) => {

      if (isPaused) return; // Ignore new updates when paused

      const newData = JSON.parse(event.data);
      //console.log("Received Message: " + event.data.toString());

      if (!graph.current.getNode(newData.id)) {
        graph.current.addNode(newData.id, {
          initial: true,
          id: newData.id,
          a: newData.a,
          i: newData.i,
          seqid: newData.seqid,
          seqidx: newData.seqidx,
          in: newData.in,
          endorse: newData.endorse,          
          type: newData.stemidx !== undefined ? "branch" : newData.seqid !== undefined ? "sequencer" : "regular",
        });

        setTimeout(() => {
          graph.current.getNode(newData.id).data.initial = false;
        }, 500);
      }

      let idx = 0;
      newData.in.forEach((source) => {
        // if (!graph.current.getNode(source)) {
        //   graph.current.addNode(source, { initial: true });
        // }

      // if it is branch, you find stem edge and color it.
      // If not and it is seq, you color seq predecessor
      // Otherwise grey edge

        if (graph.current.getNode(source)) {
          // only add link if node exists
          if (!graph.current.getLink(source, newData.id)) {
            const linkType =
              newData.stemidx !== undefined && newData.stemidx === idx
                ? "stempred"
                : newData.seqid !== undefined && newData.seqidx === idx
                ? "seqpred"
                : "input";

            graph.current.addLink(source, newData.id, { type: linkType });
          }
        }
        idx++;
      });

      if (newData.endorse) {
        newData.endorse.forEach((source) => {
          // if (!graph.current.getNode(source)) {
          //   graph.current.addNode(source, { initial: true });
          // }
          if (graph.current.getNode(source)) {
            // only add link if node exists
  
            if (!graph.current.getLink(source, newData.id)) {
              const color = showEndorsements ? EndorseLinkVisCol : EndorseLinkHidCol;
              graph.current.addLink(source, newData.id, { type: "endorse", color });

              // Update the new link color
              setTimeout(() => {
                const graphics = renderer.current.getGraphics();
                const link = graph.current.getLink(source, newData.id);
                if (link) {
                  const linkUI = graphics.getLinkUI(link.id);
                  if (linkUI) {
                    linkUI.color = Viva.Graph.View._webglUtil.parseColor(color);
                    renderer.current.rerender();
                  }
                }
              }, 0);
            }
          }
        });
      }
    };

    return () => ws.current && ws.current.close();
  }, [isInitialized, showEndorsements, isPaused]);

  const toggleEndorsements = () => {
    setShowEndorsements((prev) => !prev);
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "800px" }}>
      {/* Graph Container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* WebSocket Error Message */}
      {wsError && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#ff4d4d",
            color: "white",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
          }}
        >
          {wsError}
        </div>
      )}

      {/* Node Info Box */}
      {hoveredNodeData && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "450px",
            backgroundColor: "white",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
            fontSize: "13px",
          }}
        >
          <strong>ID:</strong> {hoveredNodeData.id}
          <br />
          <strong>a:</strong> {hoveredNodeData.a}
          <br />
          <strong>i:</strong> {hoveredNodeData.i}
          <br />
          <strong>seqid:</strong> {hoveredNodeData.seqid}
          <br />
          <strong>seqidx:</strong> {hoveredNodeData.seqidx}
          <br />
          <strong>in:</strong> {hoveredNodeData.in?.join(", ")}
          <br />
          <strong>endorse:</strong> {hoveredNodeData.endorse?.join(", ")}
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ 

          //position: "absolute", bottom: "80px", right: "20px", display: "flex", flexDirection: "column", gap: "10px" 
          position: "absolute",
          bottom: "200px",
          right: "20px",
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
        
        }}>
        <button onClick={togglePause}>{isPaused ? "Resume DAG" : "Pause DAG"}</button>
      </div>

      {/* Endorsements Toggle Checkbox */}
      <div
        style={{
          position: "absolute",
          bottom: "155px",
          right: "20px",
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
        }}
      >
        <label>
          <input type="checkbox" checked={showEndorsements} onChange={toggleEndorsements} />
          Show Endorsements
        </label>
      </div>

      {/* Legend Box */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "10px", height: "10px", backgroundColor: NormalTxCol, borderRadius: "10%" }}></div>
          <span style={{ fontSize: "13px" }}>Non-sequencer transaction</span>
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
            width: "20px", height: "2px", backgroundColor: EndorseLinkVisCol
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
