import React from 'react';
import ReactDOM from 'react-dom/client'; // Ensure this import statement is correct
import './index.css';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Home component for the main page
function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Welcome to Video Chat
            </h1>
            <p className="text-gray-600 mb-8 text-center">
              Create a room and start video chatting with your friends instantly
            </p>
            <div className="flex justify-center">
              <Link
                to="/create-room"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
              >
                Create Room
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// CreateRoom component to create a room and display the link
function CreateRoom() {
  const [roomId, setRoomId] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const createRoom = async () => {
      try {
        const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/room`;
        console.log('Fetching:', endpoint); // Log the backend URL
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text(); // Read the response as text
          console.error('Response received:', text); // Log the response text
          throw new Error(`Expected JSON response but received HTML or other format. Response: ${text}`);
        }
        const data = await response.json();
        setRoomId(data.roomId);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    createRoom();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-2xl">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="text-gray-700">Creating room...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Room Created
            </h1>
            <p className="text-gray-600 mb-4 text-center">
              Share this link with your friend to join the video call:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <a
                href={`/room/${roomId}`}
                className="text-indigo-600 hover:text-indigo-800 break-all"
              >
                {`${window.location.origin}/room/${roomId}`}
              </a>
            </div>
            <div className="flex justify-center">
              <Link
                to={`/room/${roomId}`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
              >
                Join Room
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Root component to handle routing
function Root() {
  return (
    <Router>
      <Routes>
        <Route path="/room/:roomId" element={<App />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

reportWebVitals(console.log);