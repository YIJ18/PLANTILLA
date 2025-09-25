import React from 'react';
import { motion } from 'framer-motion';
import { Satellite, Rocket } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-black/50 backdrop-blur-md border-b border-blue-500/30">
      <div className="container mx-auto px-4 py-6">
        <motion.div 
          className="flex items-center justify-center space-x-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Satellite className="w-8 h-8 text-blue-400" />
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl font-bold astra-title">
            ASTRA ROCKETRY
          </h1>
          
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Rocket className="w-8 h-8 text-red-400" />
          </motion.div>
        </motion.div>
        
        <motion.p 
          className="text-center text-gray-300 mt-2 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          CanSat Mission Control Astra
        </motion.p>
      </div>
    </header>
  );
};

export default Header;