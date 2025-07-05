const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('authMiddleware: Authorization header:', authHeader); // Debug logging
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('authMiddleware: No token provided or invalid format');
    return res.status(401).json({ message: 'No token provided or invalid format' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    console.log('authMiddleware: Token decoded successfully:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.log('authMiddleware: Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};