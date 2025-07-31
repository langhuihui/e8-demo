import Header from './components/Header';
import Footer from './components/Footer';
import E8Visualization2D from './components/E8Visualization2D';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4">
        <section id="home" className="py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">E8 Structure Explorer</h1>
            <p className="text-xl mb-8">An interactive visualization of the exceptional Lie group E8</p>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl font-semibold mb-4">Welcome to the E8 Explorer</h2>
              <p className="mb-4">
                The E8 Lie group is one of the most remarkable structures in mathematics. 
                With 248 roots in 8-dimensional space, it represents the largest exceptional simple Lie group 
                and has profound connections to various areas of mathematics and theoretical physics.
              </p>
              <p>
                This interactive explorer allows you to visualize projections of the E8 root system 
                and manipulate it in 8-dimensional space using the rotation controls.
              </p>
            </div>
          </div>
        </section>
        
        <section id="visualization" className="py-8">
          <h2 className="text-3xl font-bold mb-6 text-center">E8 Visualization</h2>
          <E8Visualization2D width={700} height={700} />
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default App;