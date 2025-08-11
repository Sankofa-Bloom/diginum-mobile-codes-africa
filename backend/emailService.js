import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

// Create transporter
const transporter = nodemailer.createTransporter(emailConfig);

// Email templates
const emailTemplates = {
  verification: (user, token, baseUrl) => ({
    subject: 'Verify Your Email - DigiNum',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">DigiNum</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Verify Your Email Address</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${user.first_name || user.email}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for signing up with DigiNum! To complete your registration and start using our virtual number services, 
            please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/verify-email?token=${token}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          
          <p style="background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; color: #495057;">
            ${baseUrl}/verify-email?token=${token}
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            This verification link will expire in 24 hours. If you didn't create an account with DigiNum, 
            you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            Best regards,<br>
            The DigiNum Team
          </p>
        </div>
      </div>
    `,
    text: `
      Verify Your Email - DigiNum
      
      Hello ${user.first_name || user.email}!
      
      Thank you for signing up with DigiNum! To complete your registration and start using our virtual number services, 
      please verify your email address by visiting this link:
      
      ${baseUrl}/verify-email?token=${token}
      
      This verification link will expire in 24 hours. If you didn't create an account with DigiNum, 
      you can safely ignore this email.
      
      Best regards,
      The DigiNum Team
    `
  }),

  welcome: (user, baseUrl) => ({
    subject: 'Welcome to DigiNum! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to DigiNum!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your account has been successfully verified</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${user.first_name || user.email}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            🎉 Congratulations! Your email has been successfully verified and your DigiNum account is now active. 
            You're all set to start using our virtual number services!
          </p>
          
          <div style="background: #e8f5e8; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 0 5px 5px 0;">
            <h3 style="color: #28a745; margin: 0 0 10px 0;">What you can do now:</h3>
            <ul style="color: #666; margin: 0; padding-left: 20px;">
              <li>📱 Buy virtual numbers for SMS verification</li>
              <li>🌍 Choose from 200+ countries worldwide</li>
              <li>💳 Add funds to your account balance</li>
              <li>📊 Track your orders and transactions</li>
              <li>🛡️ Secure and reliable service</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/dashboard" 
               style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">💡 Getting Started Tip:</h4>
            <p style="color: #856404; margin: 0; line-height: 1.5;">
              Start by adding some funds to your account balance, then browse our available countries and services 
              to find the perfect virtual number for your needs!
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            If you have any questions, feel free to contact our support team.<br>
            Welcome to the DigiNum family! 🚀
          </p>
        </div>
      </div>
    `,
    text: `
      Welcome to DigiNum! 🎉
      
      Hello ${user.first_name || user.email}!
      
      🎉 Congratulations! Your email has been successfully verified and your DigiNum account is now active. 
      You're all set to start using our virtual number services!
      
      What you can do now:
      - 📱 Buy virtual numbers for SMS verification
      - 🌍 Choose from 200+ countries worldwide
      - 💳 Add funds to your account balance
      - 📊 Track your orders and transactions
      - 🛡️ Secure and reliable service
      
      Get started: ${baseUrl}/dashboard
      
      💡 Getting Started Tip: Start by adding some funds to your account balance, then browse our available 
      countries and services to find the perfect virtual number for your needs!
      
      If you have any questions, feel free to contact our support team.
      Welcome to the DigiNum family! 🚀
    `
  }),

  passwordReset: (user, token, baseUrl) => ({
    subject: 'Reset Your Password - DigiNum',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">DigiNum</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Reset Your Password</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${user.first_name || user.email}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password for your DigiNum account. 
            Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/reset-password?token=${token}" 
               style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          
          <p style="background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; color: #495057;">
            ${baseUrl}/reset-password?token=${token}
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            This password reset link will expire in 1 hour. If you didn't request a password reset, 
            you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            Best regards,<br>
            The DigiNum Team
          </p>
        </div>
      </div>
    `,
    text: `
      Reset Your Password - DigiNum
      
      Hello ${user.first_name || user.email}!
      
      We received a request to reset your password for your DigiNum account. 
      Click the link below to create a new password:
      
      ${baseUrl}/reset-password?token=${token}
      
      This password reset link will expire in 1 hour. If you didn't request a password reset, 
      you can safely ignore this email.
      
      Best regards,
      The DigiNum Team
    `
  })
};

// Generate verification token
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate password reset token
export const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
export const sendVerificationEmail = async (user, token, baseUrl) => {
  try {
    const template = emailTemplates.verification(user, token, baseUrl);
    
    const mailOptions = {
      from: `"DigiNum" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
          if (process.env.NODE_ENV === 'development') {
        console.log('Verification email sent:', result.messageId);
      }
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email
export const sendWelcomeEmail = async (user, baseUrl) => {
  try {
    const template = emailTemplates.welcome(user, baseUrl);
    
    const mailOptions = {
      from: `"DigiNum" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
          if (process.env.NODE_ENV === 'development') {
        console.log('Welcome email sent:', result.messageId);
      }
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (user, token, baseUrl) => {
  try {
    const template = emailTemplates.passwordReset(user, token, baseUrl);
    
    const mailOptions = {
      from: `"DigiNum" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
          if (process.env.NODE_ENV === 'development') {
        console.log('Password reset email sent:', result.messageId);
      }
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Verify email token
export const verifyEmailToken = async (fastify, token) => {
  try {
    const { data: user, error } = await fastify.supabase
      .from('users')
      .select('*')
      .eq('email_verification_token', token)
      .eq('email_verified', false)
      .single();

    if (error || !user) {
      return { success: false, error: 'Invalid or expired verification token' };
    }

    // Check if token is expired (24 hours)
    const tokenExpiry = new Date(user.email_verification_expires);
    if (tokenExpiry < new Date()) {
      return { success: false, error: 'Verification token has expired' };
    }

    // Update user to verified
    const { error: updateError } = await fastify.supabase
      .from('users')
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user verification status:', updateError);
      return { success: false, error: 'Failed to verify email' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Error verifying email token:', error);
    return { success: false, error: 'Failed to verify email' };
  }
};

// Verify password reset token
export const verifyPasswordResetToken = async (fastify, token) => {
  try {
    const { data: user, error } = await fastify.supabase
      .from('users')
      .select('*')
      .eq('reset_password_token', token)
      .single();

    if (error || !user) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    // Check if token is expired (1 hour)
    const tokenExpiry = new Date(user.reset_password_expires);
    if (tokenExpiry < new Date()) {
      return { success: false, error: 'Password reset token has expired' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Error verifying password reset token:', error);
    return { success: false, error: 'Failed to verify reset token' };
  }
}; 