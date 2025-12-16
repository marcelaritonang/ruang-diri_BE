# User Data Deletion Script

This script safely deletes a user and all their related data from the Ruang Diri database. It handles cascade deletion across all dependent tables to ensure data integrity.

## Features

- ✅ Deletes user and all associated data
- ✅ Handles all profile types (employee, student, psychologist, client)
- ✅ Removes mental health records (screenings, counselings)
- ✅ Cleans up chat sessions and messages
- ✅ Deletes schedules and attachments
- ✅ Removes notifications
- ✅ Handles psychologist availability data
- ✅ Provides detailed deletion statistics
- ✅ Uses database transactions for atomicity

## Usage

### Method 1: Using npm script (Recommended)

```bash
# Delete user by ID
npm run wipe-user -- --userId=123e4567-e89b-12d3-a456-426614174000

# Delete user by email
npm run wipe-user -- --email=user@example.com
```

### Method 2: Direct execution

```bash
# Delete user by ID
npx tsx scripts/wipe-user-data.ts --userId=123e4567-e89b-12d3-a456-426614174000

# Delete user by email
npx tsx scripts/wipe-user-data.ts --email=user@example.com
```

## What Gets Deleted

The script performs deletion in the following order to respect foreign key constraints:

1. **Chat Messages** - All messages in sessions where the user is a participant, and messages sent by the user
2. **Chat Sessions** - Sessions where the user is either the client or psychologist
3. **Notifications** - All notifications sent to the user
4. **Schedule Attachments** - Attachments for schedules created by the user
5. **User Schedule Relationships** - Links between the user and schedules they're part of
6. **Schedules** - Schedules created by the user
7. **Psychologist Availability** - Availability records (only for psychologist users)
8. **Counseling Records** - Counseling sessions where the user is either client or psychologist
9. **Screening Records** - Mental health screening data for the user
10. **Profile Records** - Role-specific profile data (employee, student, psychologist, or client)
11. **User Record** - The main user account

## Database Tables Affected

### Core Tables

- `users` - Main user record
- `employee_profiles` - Employee profile data
- `student_profiles` - Student profile data
- `psychologist_profiles` - Psychologist profile data
- `client_profiles` - Client profile data

### Mental Health Tables

- `screenings` - DASS-21 and other screening results
- `counselings` - Counseling session records

### Communication Tables

- `chat_sessions` - Chat session metadata
- `chat_messages` - Individual chat messages
- `notifications` - System notifications

### Scheduling Tables

- `schedules` - Schedule/appointment records
- `users_schedules` - User-schedule relationships
- `schedule_attachments` - File attachments for schedules

### Psychologist Tables

- `psychologist_availability` - Psychologist availability slots

## Safety Features

- **Transaction-based**: All deletions happen within a database transaction
- **Validation**: Verifies user exists before deletion
- **Detailed logging**: Shows progress and counts for each deletion step
- **Statistics**: Provides comprehensive summary of deleted records
- **Error handling**: Rolls back all changes if any deletion fails

## Output Example

```
🚀 User Deletion Script Started
================================

🔍 Found user to delete:
   Email: john.doe@company.com
   Name: John Doe
   Role: employee
   Organization ID: a7c10b75-671a-4a25-abef-753777ef2fe0

⚠️  WARNING: This action will permanently delete the user and ALL related data!

🗑️  Starting deletion process...

🔄 Deleting chat messages...
🔄 Deleting chat sessions...
🔄 Deleting notifications...
🔄 Deleting schedule attachments...
🔄 Deleting user-schedule relationships...
🔄 Deleting schedules...
🔄 Deleting counseling records...
🔄 Deleting screening records...
🔄 Deleting profile records...
🔄 Deleting user record...

✅ Deletion completed successfully!

📊 Deletion Summary
===================
User: John Doe (john.doe@company.com)
Role: employee

Deleted Records:
   User record: 1
   Profile records: 1
   Screening records: 3
   Counseling records: 2
   Chat sessions: 1
   Chat messages: 15
   Schedules: 0
   User-schedule relationships: 2
   Schedule attachments: 0
   Notifications: 8
   Psychologist availability: 0

🎯 Total records deleted: 33

🔌 Database connection closed
```

## Important Notes

⚠️ **WARNING**: This operation is **IRREVERSIBLE**. Once executed, all user data will be permanently deleted.

- Always backup your database before running this script
- Test in a development environment first
- Verify the user ID/email before execution
- This script does not handle organization records (use `wipe-organization-data.ts` for that)
- The script respects foreign key constraints and deletion order

## Error Handling

If any error occurs during deletion:

- The entire transaction is rolled back
- No partial deletions will occur
- An error message with details will be displayed
- The database connection is properly closed

## Development

To modify or extend the script:

1. Update the `deleteUserAndRelatedData` function in `scripts/wipe-user-data.ts`
2. Add new table deletions following the existing pattern
3. Update the `DeletionStats` interface to track new record types
4. Test thoroughly in development environment

## Related Scripts

- `wipe-organization-data.ts` - Deletes organization and all related data
- `wipe-organization-screenings.ts` - Deletes screening data for an organization
