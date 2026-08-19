import express from 'express';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { db } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'liv-secret-key-12345';

// Map to temporarily store generated OTPs for validation
const activeOtps = new Map();

/**
 * POST /api/auth/send-otp
 * Body: { phone }
 */
router.post('/send-otp', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    // Generate standard OTP '123456' for convenience as dummy OTP
    const otp = '123456';
    activeOtps.set(phone, otp);

    console.log(`[OTP Services] Sent OTP ${otp} to phone ${phone}`);

    res.json({
      success: true,
      data: { message: 'OTP sent successfully (Use 123456)' }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/verify-otp
 * Body: { phone, token }
 */
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, token } = req.body;
    if (!phone || !token) {
      return res.status(400).json({ success: false, error: 'Phone and token (OTP) are required' });
    }

    const expectedOtp = activeOtps.get(phone) || '123456'; // Fallback to 123456 for testing

    if (token !== expectedOtp && token !== '123456') {
      return res.status(400).json({ success: false, error: 'Invalid OTP token' });
    }

    // Remove OTP after verification
    activeOtps.delete(phone);

    // Look up or create user
    let user = await db.findUserByPhone(phone);
    let isNewUser = false;

    if (!user) {
      // Create user
      user = await db.createUser({
        phone,
        name: `Farmer_${phone.slice(-4)}`,
        email: '',
        role: 'farmer'
      });
      isNewUser = true;
    }

    // Ensure primary hardware gateway LIVGW001 is associated if unclaimed or orphan
    try {
      const gw = await db.getGatewayById('LIVGW001');
      if (gw) {
        let existingOwner = null;
        if (gw.farmer_id) {
          existingOwner = await db.findUserById(gw.farmer_id);
        }
        if (!gw.farmer_id || !existingOwner) {
          await db.claimGateway('LIVGW001', user.id);
        }
      }
    } catch (_) {}

    // Generate JWT token
    const expiresIn = 30 * 24 * 60 * 60; // 30 days
    const access_token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn });
    const expires_at = Math.floor(Date.now() / 1000) + expiresIn;

    res.json({
      success: true,
      data: {
        session: {
          access_token,
          refresh_token: 'dummy-refresh-token',
          expires_at
        },
        user: {
          id: user.id,
          phone: user.phone
        },
        profile: user,
        isNewUser
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/admin/login
 * Body: { email, password }
 */
router.post('/admin/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Role verification: must be admin
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Verify hashed password
    if (!user.password_hash || !bcryptjs.compareSync(password, user.password_hash)) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate JWT token
    const expiresIn = 30 * 24 * 60 * 60; // 30 days
    const access_token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn });
    const expires_at = Math.floor(Date.now() / 1000) + expiresIn;

    res.json({
      success: true,
      data: {
        session: {
          access_token,
          refresh_token: 'dummy-refresh-token',
          expires_at
        },
        user: {
          id: user.id,
          email: user.email
        },
        profile: user
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/profile
 * Body: { name, email }
 */
router.post('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const updatedUser = await db.updateUser(req.user.id, { name, email });
    
    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (err) {
    next(err);
  }
});

export default router;
