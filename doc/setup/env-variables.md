# Environment Variables Setup

## Required Environment Variables

### Database
```env
DATABASE_URL=postgresql://username:password@localhost:5432/school_systems
```

### Server Configuration
```env
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
FRONTEND_HOST=http://localhost:3000
SECRET_KEY=your-secret-key-here
```

### Admin Account
```env
FIRST_SUPERUSER=admin@example.com
FIRST_SUPERUSER_PASSWORD=admin123456
```

### Manager Account
```env
MANAGER_EMAIL=manager@example.com
MANAGER_PASSWORD=manager123456
```

### Email Configuration (Optional)
```env
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_PORT=587
SMTP_TLS=true
SMTP_SSL=false
EMAILS_FROM_EMAIL=noreply@example.com
EMAILS_FROM_NAME=School Systems
```

### CDN (Optional)
```env
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

## Account Creation

When you run migrations, the system will automatically create:

1. **Admin Account**: Using `FIRST_SUPERUSER` and `FIRST_SUPERUSER_PASSWORD`
2. **Manager Account**: Using `MANAGER_EMAIL` and `MANAGER_PASSWORD`

Both accounts will be created only if they don't already exist.

## Login

Both accounts can login using the existing login endpoint:

```bash
# Admin login
curl -X POST https://your-host/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123456"}'

# Manager login
curl -X POST https://your-host/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@example.com","password":"manager123456"}'
```

## Response

Both will return the same response format with their respective roles:

```json
{
  "user": {
    "id": 1,
    "name": "Admin/Manager",
    "email": "admin@example.com",
    "phone": null,
    "role": "admin"  // or "manger"
  },
  "token": "JWT_TOKEN"
}
```


