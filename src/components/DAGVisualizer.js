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

function getSlotForTxId(txid) {
  if (typeof txid !== "string" || txid.length < 10) {
      throw new Error("Invalid transaction ID");
  }

  // Convert the hex string to a byte array
  const bytes = new Uint8Array(txid.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

  // Extract the first 4 bytes (slot) and remove the most significant bit of the first byte
  bytes[0] &= 0x7F; // Clear the highest bit, sequencer bit

  // Convert the first 4 bytes to a big-endian uint32 value
  const slot = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];

  return slot >>> 0; // Ensure unsigned 32-bit integer
}


const DAGVisualizer = () => {
  const containerRef = useRef(null);
  const graph = useRef(Viva.Graph.graph());
  const renderer = useRef(null);
  const layout = useRef(null);
  const ws = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showEndorsements, setShowEndorsements] = useState(false);
  const [wsError, setWsError] = useState(false); // Store WebSocket errors
  const isPaused = useRef(false); // DAG display pause state
  const [hoveredNodeData, setHoveredNodeData] = useState(null);
  const [selectedNodeData, setSelectedNodeData] = useState(null); // sticky info box
  const hoveredNodeId = useRef(null);
  const selectedNodeId = useRef(null);  
  const showEndorsementsRef = useRef(showEndorsements);
  const nodeTimestamps = useRef(new Map());
  const [txCount, setTxCount] = useState(0);
  const [tps, setTps] = useState(0);
  const transactions = useRef([]);
  const [isConnected, setIsConnected] = useState(false);
  let latestSlot = useRef(0);

  function highlightNode(nodeId, isSelected = false) {
    const graphics = renderer.current.getGraphics();
    const nodeUI = graphics.getNodeUI(nodeId);
    if (nodeUI) {
      nodeUI.size = isSelected ? 18 : 15; // bigger if selected
      nodeUI.color = Viva.Graph.View._webglUtil.parseColor("#FFD700"); // gold/yellow highlight
      renderer.current.rerender();
    }
  }

  function unhighlightNode(nodeId) {
    const graphics = renderer.current.getGraphics();
    const nodeUI = graphics.getNodeUI(nodeId);
    const node = graph.current.getNode(nodeId);
    if (nodeUI && node?.data) {
      // restore original color/size based on type
      nodeUI.size =
        node.data?.type === "branch" ? 12 :
        node.data?.type === "sequencer" ? 11 :
        10;
      nodeUI.color = Viva.Graph.View._webglUtil.parseColor(
        node.data?.type === "branch" ? BranchTxCol :
        node.data?.type === "sequencer" ? SeqTxCol :
        NormalTxCol
      );
      renderer.current.rerender();
    }
  }

  const zoomOutMultipleTimes = (times, delay) => {
    let count = 0;
    
    const interval = setInterval(() => {
      if (renderer.current && typeof renderer.current.zoomOut === "function") {
        renderer.current.zoomOut(true);
      }
      
      count++;
      if (count >= times) {
        clearInterval(interval); // Stop after 10 times
      }
    }, delay);
  };

  useEffect(() => {
    showEndorsementsRef.current = showEndorsements;
  }, [showEndorsements]);

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

    zoomOutMultipleTimes(13, 40);

    // Mouse events for showing node info
    const events = Viva.Graph.webglInputEvents(graphics, graph.current);
    events.mouseEnter((node) => {
      if (!selectedNodeId.current) {
        setHoveredNodeData(node.data); // only show hover if no sticky
        hoveredNodeId.current = node.id;
        highlightNode(node.id);
      }
    });

    events.mouseLeave(() => {
      if (!selectedNodeId.current) {
        setHoveredNodeData(null);
        unhighlightNode(hoveredNodeId.current);
        hoveredNodeId.current = null;
      }
    });

    events.click((node) => {
      setSelectedNodeData(node.data);
      setHoveredNodeData(null); // disable hover when sticky is active
      if (selectedNodeId.current) {
        unhighlightNode(selectedNodeId.current); // remove highlight from previous selection
      }
      selectedNodeId.current = node.id;
      highlightNode(node.id, true); // highlight as "selected"
      console.log("node selected");
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
  
    const connectWebSocket = () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
  
      console.log("Connecting WebSocket...");
      ws.current = new WebSocket(`wss://${config.baseUrl}/api/proxy/wsapi/v1/dag_vertex_stream`);
  
      ws.current.onopen = () => {
        console.log("WebSocket connected");
        setWsError(false);
        setIsConnected(true);
      };
  
      ws.current.onerror = (event) => {
        console.error("WebSocket error:", event);
        setWsError(true);
      };
  
      ws.current.onclose = (event) => {
        console.warn(`WebSocket closed: Code=${event.code}, Reason=${event.reason}, WasClean=${event.wasClean}`);
        setIsConnected(false);
        setWsError(true);
        if (ws.current) {
          ws.current.close();
          ws.current = null;
        }
        
        if (event.code !== 1000) { // 1000 = normal closure
          setTimeout(connectWebSocket, 5000); // Attempt reconnect after 5 seconds
        }
      };
  
      ws.current.onmessage = (event) => {

        if (isPaused.current) return; // Ignore new updates when paused
  
        const newData = JSON.parse(event.data);
        //console.log("Received Message: " + event.data.toString());

        if (!newData.hasOwnProperty("a")) {
          if (graph.current.getNode(newData.id)) {
            console.log("Delete vertex: " + newData.id);
            graph.current.removeNode(newData.id);
          }
          return;
        }
  
        if (!graph.current.getNode(newData.id)) {
          graph.current.addNode(newData.id, {
            initial: true,
            id: newData.id,
            a: newData.a,
            i: newData.i,
            seqid: newData.seqid,
            seqidx: newData.seqidx,
            stemidx: newData.stemidx,
            in: newData.in,
            endorse: newData.endorse,          
            type: newData.stemidx !== undefined ? "branch" : newData.seqid !== undefined ? "sequencer" : "regular",
          });
  
          // Store the timestamp when the node is added
          latestSlot.current = getSlotForTxId(newData.id);
          nodeTimestamps.current.set(newData.id, latestSlot.current);
          transactions.current.push(Date.now());
          setTxCount((prev) => prev + 1);
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
                      const color = showEndorsementsRef.current ? EndorseLinkVisCol : EndorseLinkHidCol;
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
    };
  
    connectWebSocket(); // Initial connection attempt
  
    // Cleanup WebSocket on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
        console.log("WebSocket closed on unmount");
      }
    };
    //    return () => ws.current; // && ws.current.close();
  }, [isInitialized]);
   

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const maxSlots = 50;
      let cleanUp = false;
  
      // First cleanup pass: Remove old nodes
      nodeTimestamps.current.forEach((timestamp, nodeId) => {
        if (latestSlot.current - timestamp > maxSlots) {
          if (graph.current.getNode(nodeId)) {
            // Remove the node
            graph.current.removeNode(nodeId);
            nodeTimestamps.current.delete(nodeId);
            cleanUp = true;
          }
        }
      });
  
      // Second cleanup pass: Remove nodes without links from the previous slot
      if (cleanUp) {
        nodeTimestamps.current.forEach((timestamp, nodeId) => {
          if (latestSlot.current - timestamp > maxSlots - 1) {
            const node = graph.current.getNode(nodeId);
            if (node && (!graph.current.getLinks(nodeId) || graph.current.getLinks(nodeId).length === 0)) {
              // Remove nodes without links
              graph.current.removeNode(nodeId);
              nodeTimestamps.current.delete(nodeId);
            }
          }
        });
      }
    }, 10 * 1000); // Run every 10 seconds
  
    return () => clearInterval(cleanupInterval);
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      transactions.current = transactions.current.filter((t) => now - t < 10000);
      setTps(transactions.current.length / 10);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const toggleEndorsements = () => {
    setShowEndorsements((prev) => !prev);
  };

  // cleanup unlinked nodes after ws connect
  useEffect(() => {
    if (isConnected) {
      const timeout = setTimeout(() => {

        nodeTimestamps.current.forEach((timestamp, nodeId) => {
          const node = graph.current.getNode(nodeId);
          if (node && (!graph.current.getLinks(nodeId) || graph.current.getLinks(nodeId).length === 0)) {
            // Remove nodes without links
            graph.current.removeNode(nodeId);
            nodeTimestamps.current.delete(nodeId);
          }
        });

        console.log("Removed isolated nodes after 5 seconds");
      }, 5000);
  
      return () => clearTimeout(timeout); // Cleanup if component unmounts
    }
  }, [isConnected]);

  const togglePause = () => {
    isPaused.current = !isPaused.current;
      if (isPaused.current) {
        // Pausing: Stop the renderer but keep the graph data
        renderer.current.pause();
        // ws.current.close();
        // ws.current = null;
      } else {
        // Resuming: Restart the renderer
        renderer.current.resume();
        graph.current.clear();
        nodeTimestamps.current.clear();
      }
      return !isPaused.current;
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
          {"WebSocket disconnected. Trying to reconnect..."}
        </div>
      )}
     
      {/* Node Info Box */}
      {(hoveredNodeData || selectedNodeData) && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "500px",
            backgroundColor: "white",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
            fontSize: "13px",
          }}
        >
          {/* Close button (only if sticky) */}
          {selectedNodeData && (
            <button
              onClick={() => {
                setSelectedNodeData(null)
                if (selectedNodeId.current) {
                  unhighlightNode(selectedNodeId.current);
                  selectedNodeId.current = null;
                  console.log("node unselected");
                }
              }}
              style={{
                position: "absolute",
                top: "5px",
                right: "5px",
                border: "none",
                background: "transparent",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ✖
            </button>
          )}

          <strong>ID:</strong> {(selectedNodeData || hoveredNodeData).id}
          <br />
          <strong>a:</strong> {(selectedNodeData || hoveredNodeData).a}
          <br />
          <strong>i:</strong> {(selectedNodeData || hoveredNodeData).i}
          <br />
          <strong>seqid:</strong> {(selectedNodeData || hoveredNodeData).seqid}
          <br />
          <strong>seqidx:</strong> {(selectedNodeData || hoveredNodeData).seqidx}
          <br />
          <strong>stemidx:</strong> {(selectedNodeData || hoveredNodeData).stemidx}
          <br />
          <strong>in:</strong> {(selectedNodeData || hoveredNodeData).in?.join(", ")}
          <br />
          <strong>endorse:</strong> {(selectedNodeData || hoveredNodeData).endorse?.join(", ")}

          {/* Open website button (only in sticky mode) */}
          {/*selectedNodeData && (
            <div style={{ marginTop: "10px" }}>
              <button
                onClick={() =>
                  window.open(`https://www.proximate.live/explorer/${selectedNodeData.id}`, "_blank")
                }
              >
                Open in Explorer
              </button>
            </div>
          )*/}
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
        <button onClick={togglePause}>{isPaused.current ? "Restart DAG" : "Pause DAG"}</button>
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
  
      {/* tx count, tps */}
        <div style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          backgroundColor: "white",
          padding: "10px",
          lineHeight: "1.5",
          borderRadius: "5px",
          boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
          fontSize: "14px",
        }}>
          <strong>Transactions:</strong> {txCount}
          <br />
          <strong>TPS:</strong> {tps.toFixed(2)}
        </div>
      </div>

  );

};

export default DAGVisualizer;
