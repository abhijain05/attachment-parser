import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

async function sendVerificationEmail(email: string, token: string, baseUrl: string) {
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
  
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Verify your email - Knowledge AI",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Welcome to Knowledge AI!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Email</a>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
      </div>
    `,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      done(null, user || null);
    } catch (error) {
      done(error, null);
    }
  });

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
          
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.password) {
            return done(null, false, { message: "Please sign in with Google" });
          }

          if (!user.emailVerified) {
            return done(null, false, { message: "Please verify your email first" });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email from Google"));
            }

            let [user] = await db.select().from(users).where(eq(users.googleId, profile.id));

            if (!user) {
              [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
              
              if (user) {
                [user] = await db
                  .update(users)
                  .set({
                    googleId: profile.id,
                    authProvider: "google",
                    emailVerified: true,
                    profileImageUrl: profile.photos?.[0]?.value,
                    updatedAt: new Date(),
                  })
                  .where(eq(users.id, user.id))
                  .returning();
              } else {
                [user] = await db
                  .insert(users)
                  .values({
                    email: email.toLowerCase(),
                    firstName: profile.name?.givenName,
                    lastName: profile.name?.familyName,
                    profileImageUrl: profile.photos?.[0]?.value,
                    googleId: profile.id,
                    authProvider: "google",
                    emailVerified: true,
                  })
                  .returning();
              }
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [user] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          authProvider: "email",
          emailVerified: false,
          verificationToken,
          verificationExpires,
        })
        .returning();

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      await sendVerificationEmail(email, verificationToken, baseUrl);

      res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.redirect("/?error=invalid_token");
      }

      const [user] = await db.select().from(users).where(eq(users.verificationToken, token));

      if (!user) {
        return res.redirect("/?error=invalid_token");
      }

      if (user.verificationExpires && new Date() > user.verificationExpires) {
        return res.redirect("/?error=token_expired");
      }

      await db
        .update(users)
        .set({
          emailVerified: true,
          verificationToken: null,
          verificationExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      res.redirect("/?verified=true");
    } catch (error) {
      console.error("Verification error:", error);
      res.redirect("/?error=verification_failed");
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        const { password, verificationToken, resetToken, ...safeUser } = user;
        return res.json(safeUser);
      });
    })(req, res, next);
  });

  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/?error=google_auth_failed" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as any;
    const { password, verificationToken, resetToken, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

      if (!user) {
        return res.json({ message: "If that email exists, a verification link has been sent." });
      }

      if (user.emailVerified) {
        return res.json({ message: "Email is already verified." });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db
        .update(users)
        .set({ verificationToken, verificationExpires, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      await sendVerificationEmail(email, verificationToken, baseUrl);

      res.json({ message: "Verification email sent." });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
