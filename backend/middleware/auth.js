import jwt from 'jsonwebtoken';
import { db } from '../services/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'liv-secret-key-12345';

/**
 * requireAuth middleware - authenticates request by checking Bearer token.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: No token provided'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid token'
    });
  }
}

/**
 * requireAdmin middleware - ensures request user role is 'admin'.
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Admin access only'
    });
  }

  next();
}
