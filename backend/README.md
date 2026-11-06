# Modbus Register Monitoring System — Backend API

Production-ready **Node.js + Express.js + MySQL** REST API for the Modbus Register Monitoring System.

---

## 🗂️ Project Structure

```text
backend/
├── schema.sql                       # MySQL database schema source of truth
├── server.js                        # Root server bootstrap entry point
├── .env                             # Environment configuration (git-ignored)
├── .env.example                     # Environment template
├── package.json
│
└── src/
    ├── app.js                       # Express app setup (security, CORS, routing, error handling)
    ├── server.js                    # Server bootstrap & graceful shutdown logic
    ├── config/
    │   └── database.js              # MySQL connection pool & parameterized query helpers
    ├── controllers/
    │   ├── authController.js        # Login, Signup, profile, password change
    │   ├── comportController.js     # Communication ports management
    │   ├── deviceController.js      # Modbus devices management
    │   ├── registerDefinitionController.js # Modbus register definitions & metadata
    │   ├── registerReadingController.js    # Modbus readings, time-series, analytics
    │   ├── thresholdController.js   # Modbus register threshold alerts
    │   └── userController.js        # User administration
    ├── middleware/
    │   ├── errorHandler.js          # Centralized error handling & 404 handler
    │   ├── rateLimiter.js           # API rate limiting
    │   ├── requestLogger.js         # HTTP and custom request logger
    │   └── validate.js              # Request validation result processor
    ├── models/
    │   ├── comportModel.js          # Comport data-access logic
    │   ├── deviceModel.js           # Device data-access logic
    │   ├── registerDefinitionModel.js # Register definitions data-access logic
    │   ├── registerReadingModel.js  # Register readings time-series data-access logic
    │   ├── thresholdModel.js        # Threshold data-access logic
    │   └── userModel.js             # User data-access logic
    ├── routes/
    │   ├── index.js                 # Central router mounting all feature routes
    │   ├── authRoutes.js            # /api/v1/auth
    │   ├── comportRoutes.js         # /api/v1/comports
    │   ├── deviceRoutes.js          # /api/v1/devices
    │   ├── registerDefinitionRoutes.js # /api/v1/registers
    │   ├── registerReadingRoutes.js    # /api/v1/readings
    │   ├── thresholdRoutes.js       # /api/v1/thresholds
    │   └── userRoutes.js            # /api/v1/users
    ├── services/
    │   ├── authService.js           # Authentication & password hashing logic
    │   ├── comportService.js        # Comport business logic & validation
    │   ├── deviceService.js         # Device business logic & slave address checks
    │   ├── registerDefinitionService.js # Register definitions business logic
    │   ├── registerReadingService.js    # Reading aggregation & time-series logic
    │   ├── thresholdService.js      # Threshold rules business logic
    │   └── userService.js           # User management business logic
    ├── utils/
    │   ├── apiResponse.js           # Standardized API response formatters
    │   ├── constants.js             # Enums, roles, status codes, pagination defaults
    │   ├── errors.js                # Custom operational error classes
    │   └── logger.js                # Winston logger with log rotation
    └── validators/
        ├── authValidator.js         # Signup & Login validation
        ├── comportValidator.js      # Comport input validation
        ├── deviceValidator.js       # Device input validation
        ├── registerDefinitionValidator.js # Register definition input validation
        ├── registerReadingValidator.js    # Reading input & query validation
        └── userValidator.js         # User input validation
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** ≥ 18.0
- **MySQL** ≥ 8.0 running locally or remotely

### 2. Database Setup
Import the provided `schema.sql` into MySQL:
```bash
mysql -u root -p < schema.sql
```

### 3. Install Dependencies
```bash
cd backend
npm install
```

### 4. Configure Environment
Create `.env` from `.env.example`:
```bash
copy .env.example .env
```
Edit `.env` and set your MySQL and SMTP credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=elliance_mks
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
EMAIL_FROM=Modbus Monitor <alerts@example.com>
PORT=5000
```

For SMTP port `465`, set `SMTP_SECURE=true`; for port `587`, set
`SMTP_SECURE=false`. If the setting is omitted, port 465 automatically uses TLS.
Keep SMTP credentials only in the backend environment, never in source files.

### Threshold email alerts
The backend evaluates active thresholds when each reading is stored
(`POST /api/v1/readings` and `POST /api/v1/readings/bulk`) and, when the threshold's
SMS Alert setting is enabled, emails every active user selected for that threshold on
the **Alert Recipients** page (table `ThresholdEmailNotifyUsers`). If nobody is
selected for a threshold, it falls back to the profile in the `X-User-Id` header.
SMS (WhatsApp) recipients are stored in `ThresholdNotifyUsers` and sent by the C# BE
service. Create both tables with `migrations/2026-11-06-alert-recipients.sql`. Repeated readings during the same
violation do not resend; the alert becomes eligible again after the reading returns
within range. Configure SMTP as above. The database schema includes
`ThresholdAlertStates`; apply the schema update before deploying this change.

To verify SMTP delivery, send `POST /api/v1/auth/test-email` with `{"userId": 4}`.
The test message is sent to that profile's current email; no recipient address is
accepted from the request. Test sends are limited to three per IP every 15 minutes.

This deployment does not use bearer tokens. User IDs supplied by clients are not
authenticated, so expose the API only to trusted clients and networks. Profile emails
are still resolved by the backend from the database.

### 5. Run Tests
```bash
npm test
```

### 6. Start the Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

- **Base URL:** `http://localhost:5000/api/v1`
- **Health Check:** `http://localhost:5000/health`

---

## 🔐 Credential Login (No Bearer Tokens)

Login verifies credentials with **bcrypt** password hashing and returns the user profile.
The API does not issue bearer tokens; profile IDs supplied by clients are not proof of
identity, so use this setup only on trusted networks.

### 1. Signup / Registration
Register a new user directly:
```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "username": "operator1",
  "password": "SecurePassword123",
  "email": "operator1@example.com",
  "phoneNumber": "+60123456789",
  "role": "Operator"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "UserId": 4,
    "Username": "operator1",
    "Email": "operator1@example.com",
    "PhoneNumber": "+60123456789",
    "Role": "Operator",
    "IsActive": 1,
    "CreatedAt": "2026-09-09T10:00:00.000Z"
  },
  "timestamp": "2026-09-09T10:00:00.000Z"
}
```

### 2. Login
Authenticate directly with credentials:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "operator1",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "UserId": 4,
      "Username": "operator1",
      "Email": "operator1@example.com",
      "PhoneNumber": "+60123456789",
      "Role": "Operator",
      "IsActive": 1,
      "LastLogin": "2026-09-09T10:01:00.000Z",
      "CreatedAt": "2026-09-09T10:00:00.000Z"
    }
  },
  "timestamp": "2026-09-09T10:01:00.000Z"
}
```

### 3. Change Password
```http
PUT /api/v1/auth/change-password
Content-Type: application/json

{
  "userId": 4,
  "currentPassword": "SecurePassword123",
  "newPassword": "NewPassword456",
  "confirmPassword": "NewPassword456"
}
```

---

## 📡 Complete REST API Reference

All responses follow a consistent envelope format:

```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "timestamp": "2026-09-09T10:00:00.000Z"
}
```

Paginated endpoints include a `pagination` object:
```json
{
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "hasNext": true,
  "hasPrev": false
}
```

---

### 1. Devices API (`/api/v1/devices`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/devices` | Get paginated devices list (`?page=1&limit=20&isActive=true&search=...&comportId=...`) |
| `GET` | `/api/v1/devices/active` | Get all active devices (lightweight, for dropdowns) |
| `GET` | `/api/v1/devices/:id` | Get device details with register count and comport information |
| `POST` | `/api/v1/devices` | Create a new device |
| `PUT` | `/api/v1/devices/:id` | Update device details |
| `PATCH`| `/api/v1/devices/:id/status` | Activate/deactivate device (`{"isActive": true}`) |
| `DELETE`| `/api/v1/devices/:id` | Delete device and cascade register definitions |

**Create Device Body:**
```json
{
  "deviceName": "AMF Control Module #1",
  "deviceModel": "DSE7320 MKII",
  "comportId": 1,
  "slaveAddress": 1,
  "location": "Genset Room",
  "isActive": 1
}
```

---

### 2. Communication Ports API (`/api/v1/comports`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/comports` | Get paginated list of configured comports |
| `GET` | `/api/v1/comports/list` | Get flat list of comports (for dropdown selection) |
| `GET` | `/api/v1/comports/:id` | Get comport details with linked devices |
| `POST` | `/api/v1/comports` | Create a new comport configuration |
| `PUT` | `/api/v1/comports/:id` | Update comport parameters |
| `DELETE`| `/api/v1/comports/:id` | Delete comport (prevented if devices are attached) |

**Create Comport Body:**
```json
{
  "protocol": "Modbus RTU",
  "portName": "COM15",
  "baudRate": 115200,
  "dataBits": 8,
  "stopBits": 1,
  "parity": "None",
  "pollIntervalMs": 1000
}
```

---

### 3. Register Definitions API (`/api/v1/registers`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/registers/data-types` | Get distinct data types available in the system |
| `GET` | `/api/v1/registers/device/:deviceId` | Get all register definitions configured for a specific device |
| `GET` | `/api/v1/registers` | Get paginated registers with filters (`?deviceId=1&action=RO&dataType=UInt16`) |
| `GET` | `/api/v1/registers/:id` | Get single register definition details |
| `POST` | `/api/v1/registers` | Create a single register definition |
| `POST` | `/api/v1/registers/bulk/:deviceId` | Bulk import register definitions for a device |
| `PUT` | `/api/v1/registers/:id` | Update register definition |
| `DELETE`| `/api/v1/registers/:id` | Delete register definition |

**Create Register Definition Body:**
```json
{
  "deviceId": 1,
  "registerName": "Oil Pressure",
  "action": "RO",
  "functionCode": 3,
  "dataType": "UInt16",
  "startAddress": 1025,
  "registerCount": 2,
  "scaleFactor": "0.01",
  "unit": "bar"
}
```

---

### 4. Register Readings API (`/api/v1/readings`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/readings/dashboard` | Current system snapshot: latest readings grouped by device |
| `GET` | `/api/v1/readings/device/:deviceId` | Device metadata and latest readings for all configured registers |
| `GET` | `/api/v1/readings/register/:registerId/latest` | Latest reading for a single register |
| `GET` | `/api/v1/readings/register/:registerId/timeseries`| Historical data for charts (`?timeRange=1h\|6h\|24h\|7d\|30d`) |
| `GET` | `/api/v1/readings/register/:registerId/stats` | Min, Max, Avg, StdDev stats (`?timeRange=24h`) |
| `GET` | `/api/v1/readings` | Paginated raw readings (`?page=1&limit=50&registerId=...&startDate=...`) |
| `GET` | `/api/v1/readings/:id` | Get single reading by ID |
| `POST` | `/api/v1/readings` | Insert single reading (`X-User-Id` header required) |
| `POST` | `/api/v1/readings/bulk` | Bulk insert readings (`X-User-Id` header required) |
| `DELETE`| `/api/v1/readings/purge` | Purge readings older than N days (`?days=90`) |
| `DELETE`| `/api/v1/readings/:id` | Delete specific reading |

**Single Reading Request:**
```http
POST /api/v1/readings
Content-Type: application/json
X-User-Id: 4

{"registerId": 1, "rawValue": 1500, "scaledValue": 1500}
```

**Bulk Insert Readings Request:**
```http
POST /api/v1/readings/bulk
Content-Type: application/json
X-User-Id: 4

[
  { "registerId": 1, "rawValue": 1500, "scaledValue": 1500 },
  { "registerId": 2, "rawValue": 450,  "scaledValue": 4.5 },
  { "registerId": 3, "rawValue": 85,   "scaledValue": 85 }
]
```

---

### 5. Thresholds API (`/api/v1/thresholds`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/thresholds` | Get paginated list of thresholds (`?registerId=2&deviceId=1&severity=Critical&isActive=true`) |
| `GET` | `/api/v1/thresholds/register/:registerId` | Get all thresholds configured for a specific register |
| `GET` | `/api/v1/thresholds/:id` | Get threshold details by ID |
| `POST` | `/api/v1/thresholds` | Create a new threshold configuration |
| `PUT` | `/api/v1/thresholds/:id` | Update threshold parameters |
| `PATCH`| `/api/v1/thresholds/:id/status` | Toggle threshold active status (`{"isActive": true}`) |
| `DELETE`| `/api/v1/thresholds/:id` | Delete threshold |

**Create Threshold Body:**
```json
{
  "registerId": 2,
  "conditionType": "High Voltage Alarm",
  "minValue": 198.00,
  "maxValue": 242.00,
  "severity": "Warning",
  "smsEnabled": 1,
  "isActive": 1
}
```

---

### 6. Users API (`/api/v1/users`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/users` | List users with pagination and filters (`?role=...&isActive=...`) |
| `GET` | `/api/v1/users/:id` | Get user details by ID |
| `POST` | `/api/v1/users` | Create user with specified role |
| `PUT` | `/api/v1/users/:id` | Update user profile, role or active status |
| `DELETE`| `/api/v1/users/:id` | Delete user |

---

### 7. Alert Recipients API (`/api/v1/alert-recipients`)

Who receives Email and SMS alerts for each threshold.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/alert-recipients` | Every threshold with its `EmailUserIds` and `SmsUserIds` |
| `PUT` | `/api/v1/alert-recipients` | Replace the recipients of one or more thresholds (one transaction) |

**Save Body** (an empty list removes everyone for that channel):
```json
{
  "items": [
    { "thresholdId": 1, "emailUserIds": [1, 2], "smsUserIds": [1] },
    { "thresholdId": 3, "emailUserIds": [], "smsUserIds": [2] }
  ]
}
```
Users on `emailUserIds` must have an email and users on `smsUserIds` a phone number (422 otherwise).
Inactive users can stay selected but receive nothing until they are active again.

---

## 🛡️ Error Handling & Status Codes

All errors return a structured JSON response:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ],
  "timestamp": "2026-09-09T10:00:00.000Z"
}
```

| HTTP Code | Meaning | Example |
|---|---|---|
| `400 Bad Request` | Invalid input or reference error | Foreign key target missing |
| `401 Unauthorized` | Invalid credentials | Wrong username or password on login |
| `404 Not Found` | Resource doesn't exist | Device ID 9999 not found |
| `409 Conflict` | Duplicate unique constraint | Slave address already in use on comport |
| `422 Unprocessable` | Input validation failed | StartAddress must be positive integer |
| `429 Too Many Req` | Rate limit exceeded | Exceeded 100 requests per 15 minutes |
| `500 Internal Error`| Server/database failure | Detailed message logged server-side |
