import React, { useRef, useEffect } from "react";
import io from "socket.io-client";

const WebRTCVideoChat = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO
    socket.current = io("https://test-apis-2m3t.onrender.com");

    // Join a room (use a unique room ID for signaling between two users)
    socket.current.emit("join-room", { roomId: "room123" });

    // Initialize PeerConnection
    peerConnection.current = new RTCPeerConnection();

    // Access user's camera and microphone
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // Display the local video stream
        localVideoRef.current.srcObject = stream;

        // Add stream tracks to PeerConnection
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });
      })
      .catch((error) => console.error("Error accessing media devices:", error));

    // Handle incoming media tracks
    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    // Handle ICE candidate exchange
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice-candidate", {
          candidate: event.candidate,
          roomId: "room123",
        });
      }
    };

    socket.current.on("ice-candidate", (data) => {
      peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    // Handle SDP offer
    socket.current.on("offer", async (offer) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.current.emit("answer", { answer, roomId: "room123" });
    });

    // Handle SDP answer
    socket.current.on("answer", (answer) => {
      peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    return () => {
      // Cleanup when the component is unmounted
      if (socket.current) socket.current.disconnect();
      if (peerConnection.current) peerConnection.current.close();
    };
  }, []);

  const handleStartConnection = async () => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.current.emit("offer", { offer, roomId: "room123" });
  };

  return (
    <div>
      <h1>WebRTC Video Chat</h1>
      <div>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          style={{ width: "45%", marginRight: "10px" }}
          muted // Mute local video to prevent feedback
        />
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "45%" }} />
      </div>
      <button onClick={handleStartConnection}>Start Connection</button>
    </div>
  );
};

export default WebRTCVideoChat;
