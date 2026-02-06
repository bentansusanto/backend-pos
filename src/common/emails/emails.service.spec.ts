import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EmailType } from '../../types/email.types';
import { EmailService } from './emails.service';

describe('EmailService', () => {
  let service: EmailService;
  let mockLogger: any;
  let mockTransporter: any;

  beforeEach(async () => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    };

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);

    // Replace the transporter with our mock
    (service as any).transporter = mockTransporter;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMail', () => {
    const mockEmail = 'test@example.com';
    const mockLink = 'https://example.com/verify?token=abc123';
    const mockSubject = 'Test Subject';

    describe('VERIFY_ACCOUNT email type', () => {
      it('should send verification email successfully', async () => {
        mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });

        await service.sendMail(EmailType.VERIFY_ACCOUNT, {
          email: mockEmail,
          links: mockLink,
          subjectMessage: mockSubject,
        });

        expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
        expect(mockTransporter.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: mockEmail,
            subject: mockSubject,
            html: expect.stringContaining('Verify Account'),
          }),
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          `Email sent to ${mockEmail} - Type: ${EmailType.VERIFY_ACCOUNT}`,
        );
      });

      it('should include verification link in email content', async () => {
        mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });

        await service.sendMail(EmailType.VERIFY_ACCOUNT, {
          email: mockEmail,
          links: mockLink,
          subjectMessage: mockSubject,
        });

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.html).toContain(mockLink);
        expect(callArgs.html).toContain('Verify Account');
        expect(callArgs.html).toContain(mockSubject);
      });
    });

    describe('RESET_PASSWORD email type', () => {
      it('should send reset password email successfully', async () => {
        mockTransporter.sendMail.mockResolvedValue({ messageId: '456' });

        await service.sendMail(EmailType.RESET_PASSWORD, {
          email: mockEmail,
          links: mockLink,
          subjectMessage: 'Reset Your Password',
        });

        expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
        expect(mockTransporter.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: mockEmail,
            subject: 'Reset Your Password',
            html: expect.stringContaining('Reset Password'),
          }),
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          `Email sent to ${mockEmail} - Type: ${EmailType.RESET_PASSWORD}`,
        );
      });

      it('should include reset password link in email content', async () => {
        mockTransporter.sendMail.mockResolvedValue({ messageId: '456' });

        await service.sendMail(EmailType.RESET_PASSWORD, {
          email: mockEmail,
          links: mockLink,
          subjectMessage: 'Reset Your Password',
        });

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.html).toContain(mockLink);
        expect(callArgs.html).toContain('Reset Password');
      });
    });

    describe('Invalid email type', () => {
      it('should throw error for invalid email type', async () => {
        await expect(
          service.sendMail('INVALID_TYPE' as EmailType, {
            email: mockEmail,
            links: mockLink,
            subjectMessage: mockSubject,
          }),
        ).rejects.toThrow('Invalid email type');

        expect(mockLogger.error).toHaveBeenCalledWith('Invalid email type');
        expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      it('should log error when email sending fails', async () => {
        const mockError = new Error('SMTP connection failed');
        mockTransporter.sendMail.mockRejectedValue(mockError);

        // Should not throw error (graceful degradation)
        await expect(
          service.sendMail(EmailType.VERIFY_ACCOUNT, {
            email: mockEmail,
            links: mockLink,
            subjectMessage: mockSubject,
          }),
        ).resolves.not.toThrow();

        expect(mockLogger.error).toHaveBeenCalledWith(
          `Failed to send email to ${mockEmail}: ${mockError.message}`,
        );
      });

      it('should handle network timeout errors gracefully', async () => {
        const timeoutError = new Error('Connection timeout');
        mockTransporter.sendMail.mockRejectedValue(timeoutError);

        await service.sendMail(EmailType.RESET_PASSWORD, {
          email: mockEmail,
          links: mockLink,
          subjectMessage: 'Reset Password',
        });

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to send email'),
        );
      });

      it('should handle authentication errors gracefully', async () => {
        const authError = new Error('Invalid credentials');
        mockTransporter.sendMail.mockRejectedValue(authError);

        await service.sendMail(EmailType.VERIFY_ACCOUNT, {
          email: mockEmail,
          links: mockLink,
          subjectMessage: mockSubject,
        });

        expect(mockLogger.error).toHaveBeenCalledWith(
          `Failed to send email to ${mockEmail}: Invalid credentials`,
        );
      });
    });

    describe('Email content validation', () => {
      it('should include sender email in from field', async () => {
        process.env.EMAIL_USERNAME = 'sender@example.com';
        mockTransporter.sendMail.mockResolvedValue({ messageId: '789' });

        await service.sendMail(EmailType.VERIFY_ACCOUNT, {
          email: mockEmail,
          links: mockLink,
          subjectMessage: mockSubject,
        });

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.from).toBe(process.env.EMAIL_USERNAME);
      });

      it('should set correct recipient email', async () => {
        mockTransporter.sendMail.mockResolvedValue({ messageId: '101' });

        await service.sendMail(EmailType.VERIFY_ACCOUNT, {
          email: 'recipient@test.com',
          links: mockLink,
          subjectMessage: mockSubject,
        });

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.to).toBe('recipient@test.com');
      });

      it('should generate HTML content for all email types', async () => {
        mockTransporter.sendMail.mockResolvedValue({ messageId: '202' });

        await service.sendMail(EmailType.VERIFY_ACCOUNT, {
          email: mockEmail,
          links: mockLink,
          subjectMessage: mockSubject,
        });

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.html).toBeTruthy();
        expect(callArgs.html).toContain('<div');
        expect(callArgs.html).toContain('<a href');
      });
    });

    describe('Multiple email sends', () => {
      it('should handle sending multiple emails sequentially', async () => {
        mockTransporter.sendMail.mockResolvedValue({ messageId: '303' });

        await service.sendMail(EmailType.VERIFY_ACCOUNT, {
          email: 'user1@test.com',
          links: mockLink,
          subjectMessage: 'Verify Account',
        });

        await service.sendMail(EmailType.RESET_PASSWORD, {
          email: 'user2@test.com',
          links: mockLink,
          subjectMessage: 'Reset Password',
        });

        expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
        expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      });
    });
  });
});
