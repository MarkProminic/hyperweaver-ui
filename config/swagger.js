import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zoneweaver API',
      version: '0.9.0', // x-release-please-version
      description:
        'API for Zoneweaver - Web management interface for Bhyve virtual machines via Zoneweaver API',
      license: {
        name: 'GPL-3.0',
        url: 'https://www.gnu.org/licenses/gpl-3.0.html',
      },
      contact: {
        name: 'Zoneweaver Project',
        url: 'https://github.com/Makr91/zoneweaver',
      },
    },
    servers: [
      {
        url: '{protocol}://{host}',
        description: 'Current server',
        variables: {
          protocol: {
            enum: ['http', 'https'],
            default: 'https',
            description: 'The protocol used to access the server',
          },
          host: {
            default: 'localhost:3000',
            description: 'The hostname and port of the server',
          },
        },
      },
    ],
    components: {
      securitySchemes: {
        JwtAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT token authentication. First login at [/api/auth/login](./api/auth/login) to get your JWT token, then use format: Bearer <jwt_token>',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique user identifier',
              example: 1,
            },
            username: {
              type: 'string',
              description: 'Username',
              example: 'john_admin',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'super-admin'],
              description: 'User role/permission level',
              example: 'admin',
            },
            organizationId: {
              type: 'integer',
              description: 'Organization ID (null for super-admin)',
              example: 1,
              nullable: true,
            },
            organizationName: {
              type: 'string',
              description: 'Organization name',
              example: 'Acme Corp',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2025-01-04T17:18:00.324Z',
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp',
              example: '2025-01-04T17:19:19.921Z',
              nullable: true,
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: {
              type: 'string',
              description: 'Username or email address',
              example: 'john_admin',
            },
            password: {
              type: 'string',
              description: 'User password',
              example: 'securePassword123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Operation success status',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Success message',
              example: 'Login successful',
            },
            token: {
              type: 'string',
              description: 'JWT authentication token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password', 'confirmPassword'],
          properties: {
            username: {
              type: 'string',
              description: 'Desired username',
              example: 'new_user',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'new_user@example.com',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'Password (minimum 8 characters)',
              example: 'securePassword123',
            },
            confirmPassword: {
              type: 'string',
              description: 'Password confirmation (must match password)',
              example: 'securePassword123',
            },
            organizationName: {
              type: 'string',
              description: 'Organization name (for new organization) or invitation code',
              example: 'My Company',
            },
            inviteCode: {
              type: 'string',
              description: 'Invitation code (if joining existing organization)',
              example: 'inv_abc123def456',
            },
          },
        },
        Server: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique server identifier',
              example: 1,
            },
            hostname: {
              type: 'string',
              description: 'Server hostname or IP address',
              example: 'zoneweaver-api-host.example.com',
            },
            port: {
              type: 'integer',
              description: 'Server port',
              example: 5001,
            },
            protocol: {
              type: 'string',
              enum: ['http', 'https'],
              description: 'Connection protocol',
              example: 'https',
            },
            entityName: {
              type: 'string',
              description: 'Display name for the server',
              example: 'Production Zoneweaver API Server',
            },
            description: {
              type: 'string',
              description: 'Server description',
              example: 'Main production server for zone management',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Server addition timestamp',
              example: '2025-01-04T17:18:00.324Z',
            },
            lastUsed: {
              type: 'string',
              format: 'date-time',
              description: 'Last usage timestamp',
              example: '2025-01-04T17:19:19.921Z',
              nullable: true,
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the server is active',
              example: true,
            },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique organization identifier',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Organization name',
              example: 'Acme Corporation',
            },
            description: {
              type: 'string',
              description: 'Organization description',
              example: 'Technology company specializing in virtual infrastructure',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Organization creation timestamp',
              example: '2025-01-04T17:18:00.324Z',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the organization is active',
              example: true,
            },
          },
        },
        Invitation: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique invitation identifier',
              example: 1,
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Invited user email',
              example: 'invited@example.com',
            },
            code: {
              type: 'string',
              description: 'Invitation code',
              example: 'inv_abc123def456',
            },
            organizationId: {
              type: 'integer',
              description: 'Target organization ID',
              example: 1,
            },
            organizationName: {
              type: 'string',
              description: 'Target organization name',
              example: 'Acme Corporation',
            },
            invitedBy: {
              type: 'string',
              description: 'Username of the inviting admin',
              example: 'admin_user',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Invitation expiration timestamp',
              example: '2025-01-11T17:18:00.324Z',
            },
            status: {
              type: 'string',
              enum: ['pending', 'used', 'expired', 'revoked'],
              description: 'Invitation status',
              example: 'pending',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Invitation creation timestamp',
              example: '2025-01-04T17:18:00.324Z',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Operation success status',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Success message',
              example: 'Operation completed successfully',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Operation success status (always false for errors)',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Authentication required',
            },
            details: {
              type: 'string',
              description: 'Additional error details (only in development)',
              example: 'JWT token expired at 2025-01-04T17:18:00.324Z',
            },
          },
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Operation success status (always false for errors)',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Validation error message',
              example: 'Username, email, password, and confirm password are required',
            },
          },
        },
      },
    },
    security: [
      {
        JwtAuth: [],
      },
    ],
  },
  apis: ['./controllers/*.js', './routes/*.js', './models/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
