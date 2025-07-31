import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">E8 Structure Explorer</h1>
        <nav>
          <ul className="flex space-x-6">
            <li><a href="#home" className="hover:text-blue-300 transition-colors">Home</a></li>
            <li><a href="#visualization" className="hover:text-blue-300 transition-colors">Visualization</a></li>
            <li><a href="#properties" className="hover:text-blue-300 transition-colors">Properties</a></li>
            <li><a href="#resources" className="hover:text-blue-300 transition-colors">Resources</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;