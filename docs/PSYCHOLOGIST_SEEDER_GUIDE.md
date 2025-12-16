# 👩‍⚕️ Psychologist Seeder Guide

This seeder creates comprehensive psychologist data including users, profiles, and availability schedules for the Ruang Diri platform.

## 🚀 Quick Commands

### Main Seeders

```bash
# Create complete new psychologists with profiles and availability
npm run seed:psychologists

# Advanced seeder with validation and better error handling
npm run seed:psychologists-advanced
```

### Utility Scripts

```bash
# Add availability to existing psychologists (no availability yet)
npm run seed:add-availability

# Check current psychologist availability schedules
npm run check:psychologist-availability
```

## 📝 Script Details

### `seed:psychologists`

- Creates 5 basic psychologists with realistic profiles
- Includes user accounts, profiles, and availability
- Simple implementation for quick setup

### `seed:psychologists-advanced`

- Creates 7+ psychologists with comprehensive profiles
- Enhanced validation and duplicate checking
- Better error handling and logging
- More realistic specializations and schedules

### `seed:add-availability`

- Adds availability schedules to existing psychologists who don't have any
- Uses smart templates based on specialization:
  - **Default**: Mon-Fri 9-10 AM, 2-3 PM
  - **Full Time**: Mon-Fri multiple slots (8 AM - 4 PM)
  - **Part Time**: Mon/Wed/Fri only (10-11 AM, 3-4 PM)
  - **Weekend**: Friday evening + Weekend focus
- Skips psychologists who already have availability

### `check:psychologist-availability`

- Displays all psychologists and their current availability
- Shows detailed schedule information
- Provides summary statistics
- Useful for debugging and verification

## 📊 What Gets Created

### 5 Psychologist Profiles

1. **Dr. Sarah Wijaya, M.Psi** - CBT Specialist

   - 📧 Email: `dr.sarah.cbt@ruangdiri.com`
   - 🎯 Specialization: Cognitive Behavioral Therapy
   - 📍 Location: Jakarta Pusat
   - 🏢 Type: Internal
   - 💼 Methods: Online, Offline, Chat
   - ⏰ Available: Monday-Friday (9AM-5PM)

2. **Dr. Ahmad Fauzi, M.Psi** - Child Psychology

   - 📧 Email: `dr.ahmad.child@ruangdiri.com`
   - 🎯 Specialization: Child and Adolescent Psychology
   - 📍 Location: Jakarta Selatan
   - 🏢 Type: Internal
   - 💼 Methods: Online, Offline, Organization
   - ⏰ Available: Monday, Wednesday, Friday, Saturday

3. **Dr. Rita Sari, M.Psi** - Clinical Psychology

   - 📧 Email: `dr.rita.clinical@ruangdiri.com`
   - 🎯 Specialization: Clinical Psychology
   - 📍 Location: Bandung
   - 🏢 Type: External
   - 💼 Methods: Online, Chat
   - ⏰ Available: Tuesday, Thursday, Saturday, Sunday

4. **Dr. Budi Santoso, M.Psi** - Workplace Psychology

   - 📧 Email: `dr.budi.workplace@ruangdiri.com`
   - 🎯 Specialization: Workplace Psychology
   - 📍 Location: Jakarta Barat
   - 🏢 Type: Internal
   - 💼 Methods: Online, Offline, Organization, Chat
   - ⏰ Available: Monday-Friday (extended hours including evenings)

5. **Dr. Maya Kusuma, M.Psi** - Family Therapy
   - 📧 Email: `dr.maya.family@ruangdiri.com`
   - 🎯 Specialization: Family and Couples Therapy
   - 📍 Location: Surabaya
   - 🏢 Type: External
   - 💼 Methods: Online, Offline
   - ⏰ Available: Weekends and select weekdays

## 🗓️ Availability Schedules

### Schedule Format

- **Day of Week**: 0 (Sunday) to 6 (Saturday)
- **Time Slots**: Multiple slots per day with start/end times
- **Timezone**: UTC+7 (Indonesian time)

### Total Availability Slots Created

- **Dr. Sarah**: 10 slots (Mon-Fri, morning & afternoon)
- **Dr. Ahmad**: 8 slots (Mon, Wed, Fri, Sat)
- **Dr. Rita**: 8 slots (Tue, Thu, Sat, Sun)
- **Dr. Budi**: 13 slots (Mon-Fri with evening slots)
- **Dr. Maya**: 10 slots (Weekends + select weekdays)

**Total: 49 availability slots across all psychologists**

## 🔑 Authentication

All psychologist accounts use the password: **`ruangdiri`**

## 🏗️ Database Schema

### Tables Populated

1. **`users`** - Basic user information

   - ID, email, password, fullName, role
   - All set to active and onboarded

2. **`psychologist_profiles`** - Professional details

   - License numbers, specializations, experience
   - Bio descriptions, location, counseling methods
   - Internal/external classification

3. **`psychologist_availability`** - Schedule data
   - Day of week, start time, end time
   - Linked to psychologist profiles
   - Timezone-aware timestamps

## 📈 Seeder Output

The seeder provides detailed output including:

```
📊 Psychologist Seeding Summary:
✅ Created 5 psychologist users
✅ Created 5 psychologist profiles
✅ Created 49 availability slots

👥 Psychologists Created:
  📋 Dr. Sarah Wijaya, M.Psi
     📧 Email: dr.sarah.cbt@ruangdiri.com
     🎯 Specialization: Cognitive Behavioral Therapy
     📍 Location: Jakarta Pusat
     ⏰ Availability slots: 10
     🏢 Type: Internal
     💼 Methods: online, offline, chat
     🔑 Password: ruangdiri
```

## 🔄 Rerunning the Seeder

The seeder can be run multiple times, but be aware that:

- It will create duplicate entries if run again
- Consider clearing existing data first if needed
- Use database migration tools for clean resets

## 🧪 Testing Integration

After seeding, you can test:

1. **Login** with any psychologist email and password `ruangdiri`
2. **API Endpoints**:
   - `GET /api/v1/psychologists` - List all psychologists
   - `GET /api/v1/psychologists/locations` - Get unique locations
3. **Booking System** - Test counseling bookings with seeded psychologists
4. **Availability Checks** - Verify schedule conflicts and availability

## 🔗 Related Seeders

- `npm run seed:organizations` - Organization data
- `npm run seed:employees` - Employee profiles
- `npm run seed:employee-screenings` - Mental health screenings

## 📝 Customization

To modify the seeder:

1. **Add More Psychologists**: Add entries to the `psychProfiles` array
2. **Change Schedules**: Modify the schedule arrays for each psychologist
3. **Update Specializations**: Edit specialization fields
4. **Modify Locations**: Change location and address data
5. **Adjust Methods**: Update counseling method arrays

## ⚠️ Important Notes

- **Production Use**: Review and modify data before using in production
- **Data Consistency**: Ensure user IDs are unique across runs
- **Timezone Handling**: All times are set to UTC+7 (Indonesia)
- **License Numbers**: Use realistic format for production data
- **Method Validation**: Ensure counseling methods match application constants

---

**🏥 Healthcare Compliance**: This seeder creates sample data for development. Ensure all psychologist credentials and license numbers are validated for production use.
