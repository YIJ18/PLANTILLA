import React from 'react';
import { motion } from 'framer-motion';

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
          {/* Logo */}
          <img
            src="/logo.png"
            alt="Astra Logo"
            className="w-12 h-12 object-contain"
          />

          {/* Título */}
          <h1 className="text-4xl md:text-6xl font-bold astra-title">
            ASTRA ROCKETRY
          </h1>

          {/* Logo */}
          <img
            src="/logo.png"
            alt="Astra Logo"
            className="w-12 h-12 object-contain"
          />

        </motion.div>


        <motion.p
          className="text-center text-gray-300 mt-2 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          CanSat Mission Caelus
        </motion.p>
      </div>
    </header>
  );
};

export default Header;
