import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { generateE8RootSystem, projectTo2D } from '../lib/e8';

interface E8Visualization2DProps {
  width?: number;
  height?: number;
}

const E8Visualization2D: React.FC<E8Visualization2DProps> = ({ 
  width = 600, 
  height = 600 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotationAngles, setRotationAngles] = useState<number[]>(Array(28).fill(0)); // 28 possible 2D planes in 8D
  const [showLines, setShowLines] = useState(true);
  const [displayedRoots, setDisplayedRoots] = useState(120);
  
  // Create rotation matrix for 8D space with multiple plane rotations
  const createRotationMatrix = (angles: number[]): number[][] => {
    // Start with identity matrix
    let matrix = Array(8).fill(0).map(() => Array(8).fill(0));
    for (let i = 0; i < 8; i++) {
      matrix[i][i] = 1;
    }
    
    // Apply rotations in each of the 28 possible 2D planes
    let currentMatrix = [...matrix.map(row => [...row])];
    
    let angleIndex = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        if (angleIndex < angles.length && angles[angleIndex] !== 0) {
          const angle = angles[angleIndex];
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          
          // Create rotation matrix for this plane
          const planeMatrix = Array(8).fill(0).map(() => Array(8).fill(0));
          for (let k = 0; k < 8; k++) {
            planeMatrix[k][k] = 1;
          }
          planeMatrix[i][i] = cos;
          planeMatrix[i][j] = -sin;
          planeMatrix[j][i] = sin;
          planeMatrix[j][j] = cos;
          
          // Multiply with current matrix
          currentMatrix = multiplyMatrices(planeMatrix, currentMatrix);
        }
        angleIndex++;
      }
    }
    
    return currentMatrix;
  };
  
  // Multiply two matrices
  const multiplyMatrices = (a: number[][], b: number[][]): number[][] => {
    const result = Array(a.length).fill(0).map(() => Array(b[0].length).fill(0));
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b[0].length; j++) {
        for (let k = 0; k < a[0].length; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  };
  
  // Apply rotation matrix to a point
  const applyRotation = (point: number[], rotationMatrix: number[][]): number[] => {
    return point.map((_, i) => 
      point.reduce((sum, coord, j) => sum + coord * rotationMatrix[i][j], 0)
    );
  };
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Generate E8 root system
    const e8System = generateE8RootSystem();
    
    // Use the first N roots for display
    const rootsToDisplay = e8System.roots.slice(0, displayedRoots);
    
    // Create rotation matrix
    const rotationMatrix = createRotationMatrix(rotationAngles);
    
    // Apply rotation to all roots
    const rotatedPoints = rootsToDisplay.map(root => ({
      coordinates: applyRotation(root.coordinates, rotationMatrix),
      index: root.index
    }));
    
    // Project to 2D
    const projectedPoints = projectTo2D(rotatedPoints);
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Set up SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    
    // Create scales for positioning
    const xExtent = d3.extent(projectedPoints, d => d[0]) as [number, number];
    const yExtent = d3.extent(projectedPoints, d => d[1]) as [number, number];
    
    // Add some padding to the scales
    const xRange = xExtent[1] - xExtent[0];
    const yRange = yExtent[1] - yExtent[0];
    const padding = 0.1;
    
    const xScale = d3.scaleLinear()
      .domain([xExtent[0] - xRange * padding, xExtent[1] + xRange * padding])
      .range([50, width - 50]);
    
    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - yRange * padding, yExtent[1] + yRange * padding])
      .range([height - 50, 50]);
    
    // Draw lines connecting points if enabled
    if (showLines) {
      // Create connections between nearest neighbors
      for (let i = 0; i < Math.min(projectedPoints.length, 50); i++) {
        for (let j = i + 1; j < Math.min(projectedPoints.length, 50); j++) {
          // Calculate distance between points
          const dx = projectedPoints[i][0] - projectedPoints[j][0];
          const dy = projectedPoints[i][1] - projectedPoints[j][1];
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Only draw lines between close points
          if (distance < 0.8) {
            svg.append("line")
              .attr("x1", xScale(projectedPoints[i][0]))
              .attr("y1", yScale(projectedPoints[i][1]))
              .attr("x2", xScale(projectedPoints[j][0]))
              .attr("y2", yScale(projectedPoints[j][1]))
              .attr("stroke", "lightgray")
              .attr("stroke-width", 0.5)
              .attr("opacity", 0.6);
          }
        }
      }
    }
    
    // Draw points
    svg.selectAll("circle")
      .data(projectedPoints)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d[0]))
      .attr("cy", d => yScale(d[1]))
      .attr("r", 2.5)
      .attr("fill", "steelblue")
      .attr("opacity", 0.8);
    
    // Add axes
    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(5);
    
    svg.append("g")
      .attr("transform", `translate(0, ${height - 50})`)
      .call(xAxis);
    
    svg.append("g")
      .attr("transform", "translate(50, 0)")
      .call(yAxis);
    
    // Add labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .text("Projected Dimension 1");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .text("Projected Dimension 2");
      
  }, [width, height, rotationAngles, showLines, displayedRoots]);
  
  const handleRotationChange = (index: number, value: number) => {
    const newAngles = [...rotationAngles];
    newAngles[index] = value;
    setRotationAngles(newAngles);
  };
  
  const resetAllRotations = () => {
    setRotationAngles(Array(28).fill(0));
  };
  
  // Names for the 28 possible 2D planes in 8D space
  const planeNames: string[] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      planeNames.push(`Plane ${i}-${j}`);
    }
  }
  
  return (
    <div className="flex">
      <div className="flex-grow">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-semibold mb-4">E8 Root System Projection (2D)</h2>
          <div className="mb-4 flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={showLines}
                onChange={(e) => setShowLines(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">Show connecting lines</span>
            </label>
            <div>
              <label className="text-sm text-gray-700 mr-2">Display roots:</label>
              <select 
                value={displayedRoots}
                onChange={(e) => setDisplayedRoots(parseInt(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="60">60 roots</option>
                <option value="120">120 roots</option>
                <option value="180">180 roots</option>
                <option value="248">All 248 roots</option>
              </select>
            </div>
          </div>
          
          <svg ref={svgRef} className="border rounded"></svg>
          <p className="mt-4 text-sm text-gray-600">
            This visualization shows a 2D projection of the E8 root system with {displayedRoots} roots. 
            Use the sliders on the right to rotate the structure in different 2D planes of 8-dimensional space. 
            Toggle lines to show connections between nearby roots.
            The E8 Lie group has 248 roots in 8-dimensional space.
          </p>
        </div>
      </div>
      
      <div className="w-80 ml-4 bg-white rounded-lg shadow-lg p-4 h-fit">
        <h3 className="text-lg font-semibold mb-4">8D Rotation Controls</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-2">
            Control rotation in each of the 28 possible 2D planes in 8D space.
          </p>
          {rotationAngles.map((angle, index) => (
            <div key={index} className="mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {planeNames[index]}: {angle.toFixed(2)} rad
              </label>
              <input
                type="range"
                min="0"
                max={2 * Math.PI}
                step="0.01"
                value={angle}
                onChange={(e) => handleRotationChange(index, parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          ))}
        </div>
        <button 
          onClick={resetAllRotations}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Reset All Rotations
        </button>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-md font-semibold mb-2">About E8 Root System</h4>
          <div className="space-y-2 text-xs text-gray-700">
            <p>
              The E8 root system consists of 248 roots in 8-dimensional space.
            </p>
            <p>
              In 8D space, there are 28 possible 2D planes of rotation (C(8,2) = 28).
            </p>
            <p>
              Each slider controls rotation in one of these planes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default E8Visualization2D;