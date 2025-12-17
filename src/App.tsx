import E8Visualization3D from './components/E8Visualization3D';

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950 opacity-50" />
      
      {/* Main visualization */}
      <E8Visualization3D className="w-full h-full" />
      
      {/* Title overlay */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none opacity-0 hover:opacity-100 transition-opacity duration-500">
        <h1 className="text-6xl font-black text-center bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow-2xl">
          E8
        </h1>
        <p className="text-center text-gray-400 mt-2 text-sm tracking-widest uppercase">
          The Exceptional Lie Group
        </p>
      </div>
      
      {/* Corner branding */}
      <div className="absolute bottom-4 right-4 text-white/30 text-xs">
        <span className="font-mono">E8 Structure Explorer</span>
      </div>
    </div>
  );
}

export default App;
