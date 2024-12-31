import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
console.log('Backend URL:', backendUrl);

const socket = backendUrl ? io(backendUrl) : null;

function App() {
  const { roomId } = useParams();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!backendUrl) {
      setError('Backend URL is not set. Please set NEXT_PUBLIC_BACKEND_URL in your environment variables.');
      return;
    }

    const pc = new RTCPeerConnection();
    setPeerConnection(pc);

    // ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', { roomId, candidate: event.candidate });
      }
    };

    // Track handler for remote stream
    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    // Join the room
    socket.emit('join-room', roomId);

    // Handle offer received from another peer
    socket.on('offer', async (offer) => {
      try {
        if (!offer || !offer.type) {
          throw new Error('Invalid offer received');
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    // Handle answer received from another peer
    socket.on('answer', async (answer) => {
      try {
        if (!answer || !answer.type) {
          throw new Error('Invalid answer received');
        }
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    // Handle ICE candidate received from another peer
    socket.on('candidate', async (candidate) => {
      try {
        if (!candidate) {
          throw new Error('Invalid candidate received');
        }
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error handling candidate:', error);
      }
    });

    // Handle user connection
    socket.on('user-connected', (userId) => {
      console.log(`User connected: ${userId}`);
    });

    // Handle user disconnection
    socket.on('user-disconnected', (userId) => {
      console.log(`User disconnected: ${userId}`);
    });

    // Get local media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideoRef.current.srcObject = stream;

        // Check if peerConnection is still open before adding tracks
        if (pc.signalingState !== 'closed') {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        } else {
          console.error('PeerConnection is closed before adding tracks.');
        }
      })
      .catch((error) => {
        console.error('Error accessing media devices.', error);
      });

    // Cleanup on component unmount
    return () => {
      if (pc.signalingState !== 'closed') {
        pc.close();
      }
      socket.off('offer');
      socket.off('answer');
      socket.off('candidate');
      socket.off('user-connected');
      socket.off('user-disconnected');
    };
  }, [roomId]);

  // Create an offer to initiate the call
  const createOffer = async () => {
    setIsCalling(true); // Set calling state to true
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { roomId, offer });
  };

  const toggleMic = () => {
    if (localVideoRef.current?.srcObject) {
      const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setMicActive(!micActive);
    }
  };

  const toggleCamera = () => {
    if (localVideoRef.current?.srcObject) {
      const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setCameraActive(!cameraActive);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-2xl">
          <div className="text-red-600 flex items-center space-x-2">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Error: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="w-full bg-black/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Video Chat</h1>
            <div className="bg-white/10 px-4 py-2 rounded-full">
              <span className="text-white/90">Room: {roomId}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Local Video */}
          <div className="relative aspect-video bg-black/40 rounded-2xl overflow-hidden shadow-xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform mirror"
            />
            <div className="absolute bottom-4 left-4 flex items-center space-x-2">
              <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                You
              </span>
              {!cameraActive && (
                <span className="bg-red-500/80 text-white px-3 py-1 rounded-full text-sm">
                  Camera Off
                </span>
              )}
            </div>
          </div>

          {/* Remote Video */}
          <div className="relative aspect-video bg-black/40 rounded-2xl overflow-hidden shadow-xl">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4">
              <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                Remote User
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-4 bg-black/50 backdrop-blur-md rounded-full px-6 py-4">
            {/* Mic Control */}
            <button
              onClick={toggleMic}
              className={`p-4 rounded-full transition-all duration-200 ${
                micActive ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {micActive ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                )}
              </svg>
            </button>

            {/* Call Button */}
            <button
              onClick={createOffer}
              disabled={isCalling}
              className={`px-8 py-4 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                isCalling
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-900 hover:bg-green-500 hover:text-white'
              }`}
            >
              {isCalling ? 'On Call' : 'Start Call'}
            </button>

            {/* Camera Control */}
            <button
              onClick={toggleCamera}
              className={`p-4 rounded-full transition-all duration-200 ${
                cameraActive ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {cameraActive ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Calling Status */}
        {isCalling && (
          <div className="fixed top-4 right-4">
            <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
              Call in progress...
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;