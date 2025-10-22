const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

module.exports = (db) => {
  // --- Endpoint para registrar un nuevo usuario ---
  router.post('/register', async (req, res) => {
    const { username, email, password, name, role } = req.body;

    // Validación básica de entrada
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'El nombre de usuario, email y contraseña son requeridos.' });
    }

    try {
      // Verificar si el usuario o el email ya existen para evitar duplicados
      const existingUser = await db('users').where({ username }).orWhere({ email }).first();
      if (existingUser) {
        return res.status(409).json({ message: 'El nombre de usuario o el email ya existen.' });
      }

      // Hashear (encriptar) la contraseña antes de guardarla
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Insertar el nuevo usuario en la base de datos
      const [newUser] = await db('users').insert({
        username,
        email,
        password_hash,
        name,
        role: role || 'user' // Si no se especifica un rol, será 'user' por defecto
      }).returning('*'); // Devuelve el objeto del usuario creado

      // No devolver el hash de la contraseña en la respuesta
      delete newUser.password_hash;

      res.status(201).json({ message: 'Usuario creado exitosamente.', user: newUser });

    } catch (error) {
      console.error('Error al registrar usuario:', error);
      res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
  });

  // --- Endpoint para iniciar sesión ---
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'El email y la contraseña son requeridos.' });
    }

    try {
      // Buscar al usuario por su email
      const user = await db('users').where({ email }).first();
      if (!user) {
        return res.status(401).json({ message: 'Credenciales inválidas.' }); // Mensaje genérico por seguridad
      }

      // Comparar la contraseña enviada con el hash almacenado
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      // Si las credenciales son correctas, crear el token JWT
      const jwt = require('jsonwebtoken');
      const payload = {
        id: user.id,
        username: user.username,
        role: user.role
      };
      
      // Es crucial usar una clave secreta desde una variable de entorno en producción
      const secret = process.env.JWT_SECRET || 'tu-super-secreto-temporal'; 
      
      const token = jwt.sign(payload, secret, { expiresIn: '1h' }); // El token expira en 1 hora

      // No devolver el hash de la contraseña
      delete user.password_hash;

      res.status(200).json({
        message: 'Inicio de sesión exitoso.',
        token,
        user
      });

    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
  });

  return router;
};
