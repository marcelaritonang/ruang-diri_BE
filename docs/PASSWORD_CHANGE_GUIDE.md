# 🔑 User Password Change Scripts

This collection of scripts allows you to change passwords for users in the database. Three different scripts are available for different use cases.

## 📝 Available Scripts

### 1. Single User Password Change

Change password for one user at a time.

```bash
npm run change-password <email> <new-password>
```

### 2. Batch Password Change

Change passwords for multiple users at once.

```bash
npm run batch-change-password [options] [email1:password1] [email2:password2] ...
```

### 3. Target Users Password Change

Quick script to change passwords for specific target users (momo accounts).

```bash
npm run change-target-passwords
```

## 🎯 Quick Usage for Target Users

To quickly change the passwords for the specific users mentioned in your request:

```bash
npm run change-target-passwords
```

This will automatically change:

- `momo.client@ruangdiri.com` → password: `ruangdiri`
- `momo.org@ruangdiri.com` → password: `ruangdiri`

## 📖 Detailed Usage

### Single User Password Change

```bash
npm run change-password <email> <new-password>
```

### Batch Password Change

#### Command Line Arguments

```bash
# Change multiple passwords via command line
npm run batch-change-password momo.client@ruangdiri.com:ruangdiri momo.org@ruangdiri.com:ruangdiri

# Dry run (preview without making changes)
npm run batch-change-password --dry-run momo.client@ruangdiri.com:ruangdiri

# Using a file
npm run batch-change-password --file users.txt
```

#### File Format (users.txt)

```
momo.client@ruangdiri.com:ruangdiri
momo.org@ruangdiri.com:ruangdiri
user@example.com:newpassword123
```

#### Batch Options

- `--dry-run`: Preview changes without actually updating passwords
- `--file <path>`: Read email:password pairs from a file
- `--help`: Show help message

## Examples

### Change password for specific users

```bash
# Single user
npm run change-password momo.client@ruangdiri.com ruangdiri

# Multiple users (batch)
npm run batch-change-password momo.client@ruangdiri.com:ruangdiri momo.org@ruangdiri.com:ruangdiri

# Target users (automated)
npm run change-target-passwords
```

### Preview changes before applying

```bash
# Dry run for batch changes
npm run batch-change-password --dry-run momo.client@ruangdiri.com:ruangdiri momo.org@ruangdiri.com:ruangdiri
```

## Validation

The script includes several validation checks:

- ✅ **Email format validation**: Ensures the email is in a valid format
- ✅ **Password length**: Minimum 6 characters required
- ✅ **User existence**: Checks if the user exists in the database
- ✅ **Secure hashing**: Uses bcrypt with salt rounds of 10

## Output

The script provides detailed output:

```
🔄 Changing password for user: momo.client@ruangdiri.com
📋 Found user: Momo Client (employee)
✅ Password successfully changed for momo.client@ruangdiri.com
👤 User: Momo Client (employee)
🔑 New password: ruangdiri
🔌 Database connection closed
```

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt with 10 salt rounds
- **Last Password Storage**: The script also updates the `lastPassword` field for password history
- **Timestamp Update**: Updates the `updatedAt` field to track when the password was changed
- **Input Validation**: Validates email format and password strength

## Error Handling

The script handles various error scenarios:

- **User not found**: If the email doesn't exist in the database
- **Invalid email format**: If the provided email is not properly formatted
- **Weak password**: If the password is less than 6 characters
- **Database errors**: Connection issues or query failures
- **Missing arguments**: If email or password are not provided

## Database Fields Updated

When changing a password, the script updates the following fields in the `users` table:

- `password`: The new hashed password
- `lastPassword`: Stores the previous password hash (for password history)
- `updatedAt`: Timestamp of when the change occurred

## Prerequisites

- ✅ Database connection configured in environment variables
- ✅ TypeScript and required dependencies installed
- ✅ Proper environment variables set in `.env` file

## Scripts and Files

### Created Scripts

1. **`/scripts/change-user-password.ts`**

   - Single user password change
   - NPM command: `change-password`

2. **`/scripts/batch-change-password.ts`**

   - Batch password changes with dry-run support
   - NPM command: `batch-change-password`

3. **`/scripts/change-target-passwords.ts`**
   - Quick change for specific target users
   - NPM command: `change-target-passwords`

### NPM Scripts Added

```json
{
  "scripts": {
    "change-password": "tsx scripts/change-user-password.ts",
    "batch-change-password": "tsx scripts/batch-change-password.ts",
    "change-target-passwords": "tsx scripts/change-target-passwords.ts"
  }
}
```

## Related Scripts

- `npm run wipe-user`: Delete a user and all related data
- `npm run db:reset`: Reset and regenerate the entire database
- Database seeders for initial user creation

---

**⚠️ Security Warning**: These scripts have administrative privileges and can change any user's password. Use responsibly and ensure proper access controls are in place.
