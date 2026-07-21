const jwt = require('jsonwebtoken');

const STAFF_ROLES = ['admin', 'penguji', 'pengasuh'];

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    console.warn('[Auth] JWT_SECRET not set — using insecure development fallback');
    return 'default_secret_key';
  }
  return secret;
};

const signToken = (payload, options = {}) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    ...options,
  });
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden - insufficient permissions' });
    }

    next();
  };
};

const isStaff = (user) => Boolean(user && STAFF_ROLES.includes(user.role));

const requireSelfOrStaff = (getEmail) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isStaff(req.user)) {
      return next();
    }

    const targetEmail = typeof getEmail === 'function' ? getEmail(req) : getEmail;
    if (!targetEmail || req.user.email?.toLowerCase() !== String(targetEmail).toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden - access denied' });
    }

    next();
  };
};

module.exports = {
  STAFF_ROLES,
  getJwtSecret,
  signToken,
  verifyToken,
  verifyRole,
  isStaff,
  requireSelfOrStaff,
};
