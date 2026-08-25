import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ValidationError } from '../errors/applicationErrors';

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export class AuthController {
  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid username or password format');
      }

      const { username, password } = parsed.data;

      // Basic hardcoded check for assignment
      if (username === 'admin' && password === 'admin123') {
        const options: jwt.SignOptions = { expiresIn: '24h' };
        const token = jwt.sign(
          { username },
          process.env.JWT_SECRET || 'supersecretjwtkey',
          options
        );

        res.json({
          success: true,
          data: { token },
        });
      } else {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid credentials',
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }
}
